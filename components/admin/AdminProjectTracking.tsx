"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FolderKanban, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { getAuthToken } from "@/lib/dudos/assessment-sync";
import { AdminBuilderPanel, builderBadge, type BuilderState } from "./AdminBuilderPanel";
import { AdminProjectFiles } from "./AdminProjectFiles";
import { showToast } from "@/lib/toast";

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

type AdminProject = {
    id: string;
    name: string;
    status: string;
    updatedAt: string;
    createdAt: string;
    scopeSummary?: string | null;
    workspace?: string | null;
    clientName?: string | null;
    clientEmail?: string | null;
    organizationName?: string | null;
    payment?: {
        amount?: number;
        currency?: string;
        credits?: number | null;
        paidAt?: string | null;
        invoiceNumber?: string;
    } | null;
    paidAt?: string | null;
    builderSubmittedAt?: string | null;
    previewUrl?: string | null;
    liveUrl?: string | null;
    domainName?: string | null;
    deliveryNote?: string | null;
    builder?: BuilderState | null;
};

// Admin view of the client lifecycle. Delivery statuses unlock only after the
// client pays and submits to the builder (enforced by the backend too).
type Stage = "payment" | "ready" | "building" | "deploying" | "live";

function stageOf(status: string): Stage {
    if (status === "live" || status === "completed") return "live";
    if (status === "deploying") return "deploying";
    if (status === "in_development") return "building";
    if (status === "approved") return "ready";
    return "payment";
}

const STAGES: Record<Stage, { label: string; className: string }> = {
    payment: {
        label: "Awaiting payment",
        className: "border-amber-300 bg-amber-50 text-amber-800",
    },
    ready: {
        label: "Paid · awaiting client submit",
        className: "border-emerald-300 bg-emerald-50 text-emerald-800",
    },
    building: {
        label: "With builder",
        className: "border-teal-300 bg-teal-50 text-teal-800",
    },
    deploying: {
        label: "Deploying",
        className: "border-sky-300 bg-sky-50 text-sky-800",
    },
    live: {
        label: "Live",
        className: "border-emerald-400 bg-emerald-100 text-emerald-900",
    },
};

const FILTERS: { id: "all" | Stage; label: string }[] = [
    { id: "all", label: "All" },
    { id: "payment", label: "Awaiting payment" },
    { id: "ready", label: "Paid" },
    { id: "building", label: "With builder" },
    { id: "deploying", label: "Deploying" },
    { id: "live", label: "Live" },
];

const DELIVERY_STATUSES = [
    { id: "in_development", label: "Building" },
    { id: "deploying", label: "Deploying" },
    { id: "live", label: "Live" },
];

// Older projects were named "<org> — Transformation Project".
const displayName = (name: string) =>
    name.replace(/\s+—\s+Transformation Project$/, "");

const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : "—";

function paymentText(project: AdminProject): string {
    const payment = project.payment;
    if (!payment) return "—";
    const amount =
        payment.currency === "CREDITS"
            ? `${Number(payment.credits ?? payment.amount ?? 0).toLocaleString()} credits`
            : `${payment.currency || ""} ${Number(payment.amount || 0).toLocaleString()}`;
    return `${amount} · ${formatDate(payment.paidAt)}`;
}

type LoadResult = { projects: AdminProject[]; error: string };

async function fetchAdminProjects(): Promise<LoadResult> {
    const token = getAuthToken();
    try {
        const res = await fetch(`${API_BASE}/admin/projects`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            cache: "no-store",
        });
        if (res.status === 401 || res.status === 403) {
            return {
                projects: [],
                error: "Sign in with an administrator account to view projects.",
            };
        }
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        return { projects: Array.isArray(data) ? data : [], error: "" };
    } catch {
        return {
            projects: [],
            error: "Could not reach the DUDOS backend. Check that the API server is running.",
        };
    }
}

export function AdminProjectTracking() {
    const [projects, setProjects] = useState<AdminProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<"all" | Stage>("all");
    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState<AdminProject | null>(null);
    const [form, setForm] = useState({
        status: "",
        previewUrl: "",
        liveUrl: "",
        domainName: "",
        note: "",
    });
    const [saving, setSaving] = useState(false);

    const apply = useCallback((result: LoadResult) => {
        setProjects(result.projects);
        setError(result.error);
        setLoading(false);
    }, []);

    const reload = () => {
        setLoading(true);
        void fetchAdminProjects().then(apply);
    };

    useEffect(() => {
        let cancelled = false;
        void fetchAdminProjects().then((result) => {
            if (!cancelled) apply(result);
        });
        return () => {
            cancelled = true;
        };
    }, [apply]);

    const counts = useMemo(() => {
        const result: Record<string, number> = { all: projects.length };
        for (const project of projects) {
            const stage = stageOf(project.status);
            result[stage] = (result[stage] || 0) + 1;
        }
        return result;
    }, [projects]);

    const query = search.trim().toLowerCase();
    const visible = projects.filter(
        (project) =>
            (filter === "all" || stageOf(project.status) === filter) &&
            (!query ||
                [
                    project.name,
                    project.clientName,
                    project.clientEmail,
                    project.organizationName,
                ].some((value) => (value || "").toLowerCase().includes(query))),
    );

    const openManage = (project: AdminProject) => {
        setEditing(project);
        setForm({
            status: project.status,
            previewUrl: project.previewUrl || "",
            liveUrl: project.liveUrl || "",
            domainName: project.domainName || "",
            note: project.deliveryNote || "",
        });
    };

    const projectColumns: DataTableColumn<AdminProject>[] = [
        {
            id: "project",
            header: "Project",
            exportValue: (project) => displayName(project.name),
            cell: (project) => (
                <>
                    <p className="font-semibold text-dudos-text">{displayName(project.name)}</p>
                    {project.organizationName && (
                        <p className="text-xs text-dudos-text-secondary">{project.organizationName}</p>
                    )}
                </>
            ),
        },
        {
            id: "client",
            header: "Client",
            exportValue: (project) =>
                [project.clientName, project.clientEmail].filter(Boolean).join(" · "),
            cell: (project) => (
                <>
                    <p className="text-sm text-dudos-text">{project.clientName || "—"}</p>
                    <p className="text-xs text-dudos-text-secondary">{project.clientEmail}</p>
                </>
            ),
        },
        {
            id: "stage",
            header: "Stage",
            exportValue: (project) => STAGES[stageOf(project.status)].label,
            cell: (project) => {
                const stage = STAGES[stageOf(project.status)];
                return (
                    <Badge variant="outline" className={stage.className}>
                        {stage.label}
                    </Badge>
                );
            },
        },
        {
            id: "payment",
            header: "Payment",
            className: "text-xs",
            exportValue: paymentText,
            cell: paymentText,
        },
        {
            id: "builder",
            header: "Builder",
            exportValue: (project) => builderBadge(project.builder).label,
            cell: (project) => {
                if (!["building", "deploying", "live"].includes(stageOf(project.status))) {
                    return <span className="text-xs text-slate-400">—</span>;
                }
                const badge = builderBadge(project.builder);
                return (
                    <Badge variant="outline" className={`text-[10px] ${badge.className}`}>
                        {badge.label}
                    </Badge>
                );
            },
        },
        {
            id: "submitted",
            header: "Submitted to builder",
            className: "text-xs",
            exportValue: (project) => project.builderSubmittedAt || "",
            cell: (project) => formatDate(project.builderSubmittedAt),
        },
        {
            id: "updated",
            header: "Updated",
            className: "text-xs",
            exportValue: (project) => project.updatedAt,
            cell: (project) => formatDate(project.updatedAt),
        },
        {
            id: "action",
            header: "Action",
            headerClassName: "text-right",
            className: "text-right",
            cell: (project) => (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                        event.stopPropagation();
                        openManage(project);
                    }}
                >
                    Manage
                </Button>
            ),
        },
    ];


    const handedOff = editing
        ? ["building", "deploying", "live"].includes(stageOf(editing.status))
        : false;

    const save = async () => {
        if (!editing) return;
        setSaving(true);
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_BASE}/admin/projects/${editing.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    status:
                        handedOff && form.status !== editing.status
                            ? form.status
                            : undefined,
                    previewUrl: form.previewUrl,
                    liveUrl: form.liveUrl,
                    domainName: form.domainName,
                    note: form.note,
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast.error("Update failed", { description: body?.detail });
                return;
            }
            setProjects((prev) =>
                prev.map((project) => (project.id === body.id ? body : project)),
            );
            setEditing(null);
            showToast.success("Project updated", {
                description: "The client sees the new status and links right away.",
            });
        } catch {
            showToast.error("Could not reach the DUDOS backend");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="space-y-5" aria-labelledby="admin-projects-title">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">
                        <span />
                        PROJECTS & DELIVERY
                    </p>
                    <h1 id="admin-projects-title">Project Tracking</h1>
                    <p>
                        Every client project from confirmed assessment to live
                        site. Update build progress and delivery links once a
                        client submits to the builder.
                    </p>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={reload}
                    disabled={loading}
                >
                    <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by stage">
                    {FILTERS.map((item) => {
                        const isActive = filter === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => setFilter(item.id)}
                                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                    isActive
                                        ? "border-dudos-primary bg-dudos-primary text-white"
                                        : "border-dudos-border bg-white text-dudos-text-secondary hover:bg-slate-50"
                                }`}
                            >
                                {item.label}{" "}
                                <span className={isActive ? "text-white/80" : "text-slate-400"}>
                                    {counts[item.id] || 0}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                        aria-label="Search projects"
                        placeholder="Search project, client or email…"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="h-8 bg-white pl-8 text-xs"
                    />
                </div>
            </div>

            <DataTable
                label="client projects"
                rows={visible}
                columns={projectColumns}
                getRowId={(project) => project.id}
                resetKey={`${filter}|${query}`}
                onRowClick={openManage}
                exportFileName="dudos-projects"
                loading={loading}
                error={error}
                empty={
                    <span className="flex flex-col items-center gap-2">
                        <FolderKanban className="h-8 w-8 text-slate-400" />
                        {projects.length === 0
                            ? "No client projects yet. They appear here once a client confirms an assessment."
                            : "No projects match this filter."}
                    </span>
                }
            />

            <Dialog
                open={Boolean(editing)}
                onOpenChange={(open) => {
                    if (!open) setEditing(null);
                }}
            >
                <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto bg-white sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">
                            {editing ? displayName(editing.name) : ""}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {[editing?.clientName, editing?.clientEmail]
                                .filter(Boolean)
                                .join(" · ")}
                        </DialogDescription>
                    </DialogHeader>

                    {editing && (
                        <div className="space-y-4 text-sm">
                            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-dudos-border bg-[#f8fafb] p-3 text-xs">
                                <div>
                                    <dt className="text-dudos-text-secondary">Stage</dt>
                                    <dd className="font-medium">{STAGES[stageOf(editing.status)].label}</dd>
                                </div>
                                <div>
                                    <dt className="text-dudos-text-secondary">Payment</dt>
                                    <dd className="font-medium">{paymentText(editing)}</dd>
                                </div>
                                <div>
                                    <dt className="text-dudos-text-secondary">Submitted to builder</dt>
                                    <dd className="font-medium">{formatDate(editing.builderSubmittedAt)}</dd>
                                </div>
                                <div>
                                    <dt className="text-dudos-text-secondary">Project ID</dt>
                                    <dd className="font-mono">{editing.id}</dd>
                                </div>
                                {editing.scopeSummary && (
                                    <div className="col-span-2">
                                        <dt className="text-dudos-text-secondary">Scope</dt>
                                        <dd className="mt-0.5 line-clamp-4 whitespace-pre-line">
                                            {editing.scopeSummary}
                                        </dd>
                                    </div>
                                )}
                            </dl>

                            <AdminProjectFiles key={editing.id} projectId={editing.id} />

                            {handedOff && (
                                <AdminBuilderPanel<AdminProject>
                                    projectId={editing.id}
                                    onProjectChange={(updated) => {
                                        setProjects((prev) =>
                                            prev.map((project) => (project.id === updated.id ? updated : project)),
                                        );
                                        setEditing(updated);
                                        setForm((current) => ({
                                            ...current,
                                            status: updated.status,
                                            previewUrl: current.previewUrl || updated.previewUrl || "",
                                        }));
                                    }}
                                />
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="project-status" className="text-xs font-semibold">
                                    Delivery status
                                </Label>
                                {handedOff ? (
                                    <select
                                        id="project-status"
                                        value={form.status === "completed" ? "live" : form.status}
                                        onChange={(event) =>
                                            setForm({ ...form, status: event.target.value })
                                        }
                                        className="h-9 w-full rounded-md border border-dudos-border bg-white px-3 text-sm text-dudos-text"
                                    >
                                        {DELIVERY_STATUSES.map((option) => (
                                            <option key={option.id} value={option.id}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="rounded-md border border-dashed border-dudos-border p-2.5 text-xs text-dudos-text-secondary">
                                        Delivery status unlocks after the client pays and submits the project to the builder.
                                    </p>
                                )}
                            </div>

                            {(
                                [
                                    ["previewUrl", "Preview URL", "https://preview.example.com"],
                                    ["liveUrl", "Live URL", "https://www.example.com"],
                                    ["domainName", "Domain", "example.com"],
                                ] as const
                            ).map(([key, label, placeholder]) => (
                                <div key={key} className="space-y-1.5">
                                    <Label htmlFor={`project-${key}`} className="text-xs font-semibold">
                                        {label}
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id={`project-${key}`}
                                            value={form[key]}
                                            placeholder={placeholder}
                                            onChange={(event) =>
                                                setForm({ ...form, [key]: event.target.value })
                                            }
                                            className="h-9 text-sm"
                                        />
                                        {key !== "domainName" && /^https?:\/\//.test(form[key]) && (
                                            <a
                                                href={form[key]}
                                                target="_blank"
                                                rel="noreferrer"
                                                aria-label={`Open ${label}`}
                                                className="text-dudos-primary"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <div className="space-y-1.5">
                                <Label htmlFor="project-note" className="text-xs font-semibold">
                                    Delivery note
                                </Label>
                                <Textarea
                                    id="project-note"
                                    value={form.note}
                                    onChange={(event) => setForm({ ...form, note: event.target.value })}
                                    rows={2}
                                    className="text-sm"
                                />
                            </div>

                            <div className="flex justify-end gap-2 border-t border-dudos-border pt-3">
                                <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                                    Cancel
                                </Button>
                                <Button size="sm" disabled={saving} onClick={() => void save()}>
                                    {saving ? "Saving…" : "Save changes"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </section>
    );
}
