"use client";
import { useRouter } from "next/navigation";
import {
    preferredWorkspace,
    rememberWorkspace,
} from "@/lib/dudos/workspace-preference";
import React, { useEffect, useState } from "react";
import { SendRequest } from "./dudos-requests";
import { AssessmentFiles } from "./projects/AssessmentFiles";
import { DevscopeProject, DEVSCOPE_KIND } from "./dudos-devscope";
import { RecordComments } from "./dudos-comments";
import { nextStates, operationalKinds } from "@/lib/dudos/workflow";
import { useWebMCP } from "@/lib/dudos/webmcp";
import Link from "./dudos-link";
import {
    ArrowRight,
    ArrowLeft,
    Check,
    Save,
    Plus,
    Upload,
    FileText,
    RefreshCw,
    Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import modules, { Field, moduleById } from "@/lib/dudos/modules";
import {
    Choose,
    Multi,
    Notice,
    Empty,
    Download,
    t,
    human,
    download,
} from "./dudos-ui";
import { api } from "@/lib/dudos/client";
import { fetchAuthenticatedWorkspaces } from "@/lib/dudos/workspaces";
import { useAuth } from "@/context/auth-context";
import {
    assessmentTitle,
    findAssessmentRecord,
    mergeAssessmentData,
    syncAssessmentToWorkspaceDraft,
} from "@/lib/dudos/assessment-sync";
export { api } from "@/lib/dudos/client";

export function WorkspaceGate({
    lang,
    children,
}: {
    lang: string;
    children: (w: string) => React.ReactNode;
}) {
    const { user, isAuthenticated } = useAuth();
    const [workspaces, setWorkspaces] = useState<any[]>([]),
        [workspace, setWorkspace] = useState(""),
        [name, setName] = useState(""),
        [error, setError] = useState(""),
        [busy, setBusy] = useState(true),
        [isCreating, setIsCreating] = useState(false);

    const getCleanName = (wName: string) => {
        if (
            !wName ||
            wName === "Customer / Client" ||
            wName.toLowerCase().includes("customer / client") ||
            wName.toLowerCase() === "client"
        ) {
            if (
                user?.organizationName &&
                user.organizationName !== "Customer / Client" &&
                !user.organizationName
                    .toLowerCase()
                    .includes("customer / client")
            ) {
                return user.organizationName;
            }
            if (user?.displayName && user.displayName !== "Customer / Client") {
                return `${user.displayName}'s Workspace`;
            }
            if (user?.username && user.username !== "Customer / Client") {
                return `${user.username}'s Workspace`;
            }
            return lang === "bn"
                ? "ব্যক্তিগত ওয়ার্কস্পেস"
                : "Personal Workspace";
        }
        return wName;
    };

    async function load() {
        try {
            const backendWorkspaces = await fetchAuthenticatedWorkspaces();
            const list =
                backendWorkspaces ??
                (await api("/api/workspaces")).workspaces ??
                [];
            const sanitized = list.map((w: any) => ({
                ...w,
                name: getCleanName(w.name),
            }));
            setWorkspaces(sanitized);
            const selectedWorkspace =
                sanitized.find((w: any) => w.id === preferredWorkspace())?.id ||
                sanitized[0]?.id ||
                "";
            setWorkspace(selectedWorkspace);
            if (selectedWorkspace) rememberWorkspace(selectedWorkspace);
            setError("");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }

    useEffect(() => {
        if (isAuthenticated) {
            void load();
        } else {
            setBusy(false);
        }
    }, [isAuthenticated]);

    async function create() {
        setBusy(true);
        try {
            const cleanName = getCleanName(name);
            const d = await api("/api/workspaces", "POST", { name: cleanName });
            const cleanNew = { ...d, name: getCleanName(d.name) };
            setWorkspaces([...workspaces, cleanNew]);
            setWorkspace(cleanNew.id);
            rememberWorkspace(cleanNew.id);
            setName("");
            setError("");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }

    if (!isAuthenticated || !user) {
        return (
            <div className="workspace-gate-auth max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-dudos-border shadow-xs text-center space-y-5">
                <div className="inline-flex p-3 rounded-full bg-teal-50 text-dudos-primary mx-auto">
                    <Lock className="h-6 w-6 text-teal-600" />
                </div>
                <div className="space-y-1.5">
                    <h3 className="text-xl font-bold tracking-tight text-dudos-text">
                        {lang === "bn"
                            ? "সাইন ইন বা নিবন্ধন আবশ্যক"
                            : "Account Required for Assessment"}
                    </h3>
                    <p className="text-xs text-dudos-text-secondary leading-relaxed">
                        {lang === "bn"
                            ? "আপনার রূপান্তর মূল্যায়ন ও খসড়া রেকর্ডগুলি একটি সুরক্ষিত ওয়ার্কস্পেসের অধীনে সংরক্ষিত হয়। এগিয়ে যেতে অনুগ্রহ করে সাইন ইন করুন বা নতুন অ্যাকাউন্ট তৈরি করুন।"
                            : "Transformation assessments, system goals and generated specifications are stored under your workspace account. Sign in or register to begin."}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
                    <Button
                        asChild
                        variant="primary"
                        size="default"
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                    >
                        <Link
                            href={`/login?return_to=${encodeURIComponent("/" + lang + "/transform")}`}
                        >
                            {lang === "bn" ? "সাইন ইন করুন" : "Sign In"}
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="default">
                        <Link
                            href={`/register?return_to=${encodeURIComponent("/" + lang + "/transform")}`}
                        >
                            {lang === "bn"
                                ? "অ্যাকাউন্ট তৈরি করুন"
                                : "Create Account"}
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            {error && <Notice tone="error">{error}</Notice>}
            {workspaces.length > 0 ? (
                <div className="workspace-choice flex flex-wrap items-center gap-3">
                    <div>
                        <Label>
                            {lang === "bn" ? "ওয়ার্কস্পেস" : "Workspace"}
                        </Label>
                        <Choose
                            label="Workspace"
                            value={workspace}
                            onChange={(v) => {
                                setWorkspace(v);
                                rememberWorkspace(v);
                            }}
                            options={workspaces.map((w) => ({
                                id: w.id,
                                label: getCleanName(w.name),
                            }))}
                        />
                    </div>
                    <Dialog open={isCreating} onOpenChange={setIsCreating}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4 text-xs text-teal-700 hover:text-teal-800 hover:bg-teal-50 border-teal-200"
                            >
                                <Plus size={14} className="mr-1" />
                                {lang === "bn"
                                    ? "নতুন ওয়ার্কস্পেস"
                                    : "New Workspace"}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>
                                    {lang === "bn"
                                        ? "নতুন ব্যক্তিগত ওয়ার্কস্পেস তৈরি করুন"
                                        : "Create Workspace"}
                                </DialogTitle>
                                <DialogDescription>
                                    {lang === "bn"
                                        ? "আপনার প্রতিষ্ঠান বা প্রকল্পের জন্য পৃথক ওয়ার্কস্পেস তৈরি করুন।"
                                        : "Create an isolated workspace for your organization or transformation project."}
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    void (async () => {
                                        await create();
                                        setIsCreating(false);
                                    })();
                                }}
                                className="space-y-4 pt-2"
                            >
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={
                                        lang === "bn"
                                            ? "ওয়ার্কস্পেসের নাম"
                                            : "Workspace name (e.g. Daffodil Labs)"
                                    }
                                    maxLength={100}
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsCreating(false)}
                                    >
                                        {lang === "bn" ? "বাতিল" : "Cancel"}
                                    </Button>
                                    <Button
                                        disabled={
                                            busy || name.trim().length < 2
                                        }
                                        type="submit"
                                    >
                                        {busy
                                            ? "…"
                                            : lang === "bn"
                                              ? "তৈরি করুন"
                                              : "Create"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            ) : (
                <div className="workspace-create">
                    <h3>
                        {lang === "bn"
                            ? "প্রথম ব্যক্তিগত ওয়ার্কস্পেস তৈরি করুন"
                            : "Create your first private workspace"}
                    </h3>
                    <p>
                        {lang === "bn"
                            ? "খসড়া ও রেকর্ড আপনার অ্যাকাউন্টের অধীনে সংরক্ষিত হবে।"
                            : "Drafts and records are stored under your signed-in account."}
                    </p>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            void create();
                        }}
                    >
                        <Input
                            aria-label="Workspace name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={
                                lang === "bn"
                                    ? "ওয়ার্কস্পেসের নাম"
                                    : "Workspace name"
                            }
                            maxLength={100}
                        />
                        <Button
                            disabled={busy || name.trim().length < 2}
                            type="submit"
                        >
                            <Plus size={17} />
                            {busy
                                ? "…"
                                : lang === "bn"
                                  ? "তৈরি করুন"
                                  : "Create"}
                        </Button>
                    </form>
                </div>
            )}
            {workspace && children(workspace)}
        </>
    );
}
export function FieldControl({
    f,
    value,
    onChange,
    lang,
}: {
    f: Field;
    value: string;
    onChange: (v: string) => void;
    lang: string;
}) {
    const id = "input-" + f.key;
    return (
        <div className={"form-field " + (f.type === "textarea" ? "wide" : "")}>
            <Label htmlFor={id}>
                {lang === "bn" ? f.bn : f.label}
                {f.required && <span className="required"> *</span>}
            </Label>
            {f.options ? (
                <Choose
                    value={value}
                    onChange={onChange}
                    options={f.options}
                    label={lang === "bn" ? f.bn : f.label}
                    id={id}
                />
            ) : f.type === "textarea" ? (
                <Textarea
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    maxLength={10000}
                    rows={4}
                />
            ) : (
                <Input
                    id={id}
                    type={f.type || "text"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    min={f.type === "number" ? 0 : undefined}
                    maxLength={10000}
                />
            )}
        </div>
    );
}
export function RecordForm({
    kind,
    workspace,
    lang,
    record,
    initial,
    onSaved,
}: {
    kind: string;
    workspace: string;
    lang: string;
    record?: any;
    initial?: any;
    onSaved?: (r: any) => void;
}) {
    const { user } = useAuth();
    const mod = moduleById(kind)!;
    const [title, setTitle] = useState(record?.title || initial?.title || ""),
        [data, setData] = useState<Record<string, string>>(
            record?.data || initial?.data || {},
        ),
        [error, setError] = useState(""),
        [busy, setBusy] = useState(false),
        [saved, setSaved] = useState<any>(null),
        [key] = useState(() => crypto.randomUUID());
    useEffect(() => {
        if (!record && !initial && kind === "application") {
            const p = new URLSearchParams(window.location.search).get(
                "programme",
            );
            if (p) setData((d) => ({ ...d, programme: p.slice(0, 200) }));
        }
    }, []);
    async function save(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            const d = await api(
                "/api/records",
                record ? "PATCH" : "POST",
                record
                    ? {
                          workspace,
                          id: record.id,
                          version: record.version,
                          title,
                          data,
                          status: "draft",
                      }
                    : { workspace, kind, title, data, idempotency_key: key },
            );
            const savedRec = {
                ...d,
                kind,
                title,
                data: JSON.parse(JSON.stringify(data)),
            };
            setSaved(savedRec);
            if (kind === "assessment") {
                syncAssessmentToWorkspaceDraft(
                    savedRec,
                    data,
                    workspace,
                    user,
                    false,
                );
            }
            onSaved?.(d);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    if (!mod) return null;
    return (
        <form onSubmit={save} className="record-form">
            {mod.external && <Notice>{mod.external}</Notice>}
            <div className="form-field">
                <Label htmlFor="record-title">
                    {lang === "bn" ? "শিরোনাম" : "Record title"} *
                </Label>
                <Input
                    id="record-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={180}
                />
            </div>
            <div className="form-grid">
                {mod.fields.map((f) => (
                    <FieldControl
                        key={f.key}
                        f={f}
                        lang={lang}
                        value={data[f.key] || ""}
                        onChange={(v) => setData({ ...data, [f.key]: v })}
                    />
                ))}
            </div>
            <p className="field-help">
                {lang === "bn"
                    ? "পাসওয়ার্ড, API কী বা সংবেদনশীল ব্যক্তিগত তথ্য লিখবেন না। খসড়া জমা দেওয়ার আগে প্রয়োজনীয় তথ্য পূরণ করুন।"
                    : "Do not enter passwords, API keys or unnecessary sensitive personal data. Required fields are checked before submission."}
            </p>
            {error && <Notice tone="error">{error}</Notice>}
            {saved && (
                <Notice tone="success">
                    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                        <span>
                            {lang === "bn"
                                ? "খসড়া সংরক্ষিত হয়েছে।"
                                : "Draft saved."}{" "}
                            <code>{saved.id}</code>
                        </span>
                        {kind === "assessment" && (
                            <Button
                                asChild
                                size="sm"
                                className="bg-[#087f79] hover:bg-[#066560] text-white text-xs"
                            >
                                <Link href={`/${lang}/app`}>
                                    {lang === "bn"
                                        ? "ওয়ার্কস্পেস পোর্টালে যান"
                                        : "Go to Workspace Portal"}
                                    <ArrowRight size={13} className="ml-1" />
                                </Link>
                            </Button>
                        )}
                    </div>
                </Notice>
            )}
            <div className="flex items-center gap-2 flex-wrap">
                <Button type="submit" disabled={busy || !!saved}>
                    <Save size={17} />
                    {busy
                        ? "…"
                        : lang === "bn"
                          ? "খসড়া সংরক্ষণ"
                          : "Save draft"}
                </Button>
                {saved && (
                    <SendRequest
                        record={saved}
                        workspace={workspace}
                        lang={lang}
                    />
                )}
            </div>
        </form>
    );
}
export function QuickIntake({ kind, lang }: { kind: string; lang: string }) {
    return (
        <WorkspaceGate lang={lang}>
            {(w) => (
                <RecordForm key={w} kind={kind} workspace={w} lang={lang} />
            )}
        </WorkspaceGate>
    );
}
const steps = [
    ["Project goals", "প্রজেক্টের লক্ষ্য", ["project_name", "outcomes"]],
    [
        "Business & website",
        "ব্যবসা ও ওয়েবসাইট",
        ["organization", "sector", "country", "languages", "site_url"],
    ],
    [
        "Systems & capabilities",
        "সিস্টেম ও প্রয়োজনীয় সুবিধা",
        ["systems", "modules", "reporting"],
    ],
    [
        "Brand, rights & budget",
        "ব্র্যান্ড, অধিকার ও বাজেট",
        ["brand", "rights", "budget", "unknowns"],
    ],
    ["Review & confirm", "পর্যালোচনা ও নিশ্চিতকরণ", []],
] as const;
const REVIEW_STEP = steps.length - 1;

// First step with a missing required answer, or the review step when complete.
function firstIncompleteStep(data: Record<string, string>): number {
    const required = (moduleById("assessment")?.fields || []).filter(
        (f) => f.required,
    );
    const index = steps.findIndex((s) =>
        required.some(
            (f) =>
                (s[2] as readonly string[]).includes(f.key) &&
                !data[f.key]?.trim(),
        ),
    );
    return index < 0 ? REVIEW_STEP : index;
}

export function AssessmentWizard({ lang }: { lang: string }) {
    return (
        <WorkspaceGate lang={lang}>
            {(w) => <Wizard key={w} workspace={w} lang={lang} mode="edit" />}
        </WorkspaceGate>
    );
}

export function AssessmentWizardInline({
    workspace,
    lang,
    mode,
    organizationName,
    assessment,
    onSubmitted,
}: {
    workspace: string;
    lang: string;
    mode: "new" | "edit";
    organizationName?: string;
    assessment?: {
        assessmentRecordId?: string;
        assessmentVersion?: number;
        assessmentData?: Record<string, string>;
        status?: string;
        sourceProjectId?: string;
    };
    onSubmitted: () => void;
}) {
    return (
        <Wizard
            key={`${workspace}-${mode}`}
            workspace={workspace}
            lang={lang}
            mode={mode}
            organizationName={organizationName}
            assessment={assessment}
            onSubmitted={onSubmitted}
        />
    );
}

function Wizard({
    workspace,
    lang,
    mode = "edit",
    organizationName,
    assessment,
    onSubmitted,
}: {
    workspace: string;
    lang: string;
    mode?: "new" | "edit";
    organizationName?: string;
    assessment?: {
        assessmentRecordId?: string;
        assessmentVersion?: number;
        assessmentData?: Record<string, string>;
        status?: string;
        sourceProjectId?: string;
    };
    onSubmitted?: () => void;
}) {
    const router = useRouter();
    const { user } = useAuth();
    const initialAssessment =
        mode === "edit" && assessment?.assessmentData
            ? {
                  id: assessment.assessmentRecordId || "",
                  version: assessment.assessmentVersion || 1,
                  status: assessment.status || "draft",
                  data: assessment.assessmentData,
              }
            : null;
    const resumeAtPreview = mode === "edit" && Boolean(onSubmitted);
    const [step, setStep] = useState(() =>
            resumeAtPreview && initialAssessment?.data
                ? firstIncompleteStep(initialAssessment.data)
                : 0,
        ),
        [data, setData] = useState<Record<string, string>>(
            initialAssessment?.data || {},
        ),
        [saved, setSaved] = useState<any>(
            initialAssessment?.id ? initialAssessment : null,
        ),
        [drafts, setDrafts] = useState<any[]>([]),
        [key, setKey] = useState(() => crypto.randomUUID()),
        [error, setError] = useState(""),
        [busy, setBusy] = useState(false);
    const mod = moduleById("assessment")!;
    useWebMCP({
        name: "stage_dudos_assessment",
        title: "Stage assessment fields",
        description:
            "Set the visible assessment draft fields. Does not save, submit, generate, publish or contact a provider.",
        inputSchema: {
            type: "object",
            properties: Object.fromEntries(
                mod.fields.map((f) => [
                    f.key,
                    { type: "string", maxLength: 10000 },
                ]),
            ),
            additionalProperties: false,
        },
        execute(input) {
            if (!input || typeof input !== "object" || Array.isArray(input))
                throw new Error("Supply assessment fields.");
            const fields = input as Record<string, unknown>;
            for (const [k, v] of Object.entries(fields)) {
                if (
                    !mod.fields.some((f) => f.key === k) ||
                    typeof v !== "string" ||
                    v.length > 10000
                )
                    throw new Error("Invalid assessment field.");
            }
            setData((current) =>
                mergeAssessmentData(current, fields as Record<string, string>),
            );
            return {
                staged_fields: Object.keys(fields),
                saved: false,
                external_actions: false,
            };
        },
    });
    useEffect(() => {
        void api("/api/records?workspace=" + workspace + "&kind=assessment")
            .then((d) => {
                const records = Array.isArray(d.records) ? d.records : [];
                const localRecords: any[] = [];
                const localKeys = [
                    user?.id ? `dudos_static_records_${user.id}` : "",
                    "dudos_static_records",
                ].filter(Boolean);
                for (const key of localKeys) {
                    try {
                        const stored = localStorage.getItem(key);
                        const parsed = stored ? JSON.parse(stored) : [];
                        if (Array.isArray(parsed)) localRecords.push(...parsed);
                    } catch {}
                }
                const allRecords = [
                    ...records,
                    ...localRecords.filter(
                        (localRecord) =>
                            !records.some(
                                (record: any) => record.id === localRecord.id,
                            ),
                    ),
                ];
                setDrafts(allRecords);
                const existing =
                    mode === "edit"
                        ? findAssessmentRecord(allRecords, {
                              recordId: assessment?.assessmentRecordId,
                              organizationName,
                          }) ||
                          (!assessment?.assessmentRecordId &&
                          !assessment?.sourceProjectId &&
                          !organizationName &&
                          allRecords.length === 1
                              ? allRecords[0]
                              : null)
                        : null;
                if (existing) {
                    setSaved(existing);
                    if (existing.data) {
                        setData((prev) => ({ ...prev, ...existing.data }));
                        if (resumeAtPreview)
                            setStep(
                                firstIncompleteStep({
                                    ...initialAssessment?.data,
                                    ...existing.data,
                                }),
                            );
                    }
                } else if (initialAssessment?.data) {
                    setData((prev) => ({
                        ...prev,
                        ...initialAssessment.data,
                    }));
                }
            })
            .catch((e) => setError(e.message));

        const params = new URLSearchParams(window.location.search);
        setData((prev) => ({
            ...prev,
            outcomes: params.get("goal") || prev.outcomes || "",
            sector: params.get("sector") || prev.sector || "",
            modules: params.get("package") || prev.modules || "",
            languages: prev.languages || (lang === "bn" ? "bn, en" : "en, bn"),
        }));
    }, [
        workspace,
        lang,
        mode,
        organizationName,
        assessment?.assessmentRecordId,
        assessment?.assessmentData,
        user?.id,
    ]);

    const replacedProjectIds = assessment?.sourceProjectId
        ? [assessment.sourceProjectId]
        : [];

    async function save(isSubmit = false) {
        setBusy(true);
        try {
            const nextStatus = isSubmit
                ? "submitted"
                : saved?.status || "draft";
            const b = saved
                ? {
                      workspace,
                      id: saved.id,
                      version: saved.version,
                      title: assessmentTitle(data),
                      data,
                      status: nextStatus,
                  }
                : {
                      workspace,
                      kind: "assessment",
                      title: assessmentTitle(data),
                      data,
                      idempotency_key: key,
                      status: nextStatus,
                  };
            const r = await api("/api/records", saved ? "PATCH" : "POST", b);
            const updatedSaved = {
                ...r,
                version: r.version || 1,
                data: JSON.parse(JSON.stringify(data)),
                status: nextStatus,
            };
            setSaved(updatedSaved);
            await syncAssessmentToWorkspaceDraft(
                updatedSaved,
                data,
                workspace,
                user,
                nextStatus === "submitted",
                replacedProjectIds,
            );
            setError("");
            return updatedSaved;
        } catch (e) {
            setError((e as Error).message);
            return null;
        } finally {
            setBusy(false);
        }
    }

    async function submitAndGoToPortal() {
        const missingStep = firstIncompleteStep(data);
        if (missingStep !== REVIEW_STEP) {
            setStep(missingStep);
            setError(
                lang === "bn"
                    ? "জমা দেওয়ার আগে প্রয়োজনীয় তথ্য পূরণ করুন।"
                    : "Please fill in the required fields before submitting.",
            );
            return;
        }
        setBusy(true);
        setError("");
        try {
            const b = saved
                ? {
                      workspace,
                      id: saved.id,
                      version: saved.version,
                      title: assessmentTitle(data),
                      data,
                      status: "submitted",
                  }
                : {
                      workspace,
                      kind: "assessment",
                      title: assessmentTitle(data),
                      data,
                      idempotency_key: key,
                      status: "submitted",
                  };
            const r = await api("/api/records", saved ? "PATCH" : "POST", b);
            const updatedSaved = {
                ...r,
                version: r.version || 1,
                data: JSON.parse(JSON.stringify(data)),
                status: "submitted",
            };
            setSaved(updatedSaved);

            // Auto-dispatch customer request to requests inbox
            try {
                await api("/api/requests", "POST", {
                    workspace,
                    record_id: updatedSaved.id,
                    version: updatedSaved.version,
                    share_confirmed: true,
                });
            } catch {}

            // Sync across localStorage (active draft, custom projects, project records) and FastAPI PostgreSQL
            await syncAssessmentToWorkspaceDraft(
                updatedSaved,
                data,
                workspace,
                user,
                true,
                replacedProjectIds,
            );

            // Navigate straight to client workspace portal
            rememberWorkspace(workspace);
            if (onSubmitted) {
                onSubmitted();
            } else {
                router.push(`/${lang}/app/overview`);
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="wizard-layout">
            <aside className="wizard-nav">
                <p className="micro-label">
                    {lang === "bn" ? "আপনার রূপান্তর" : "YOUR TRANSFORMATION"}
                </p>
                {steps.map(([en, bn], i) => (
                    <button
                        key={en}
                        type="button"
                        onClick={() => setStep(i)}
                        className={step === i ? "active" : ""}
                    >
                        <span>{i < step ? <Check size={14} /> : i + 1}</span>
                        {lang === "bn" ? bn : en}
                    </button>
                ))}
                <Progress value={((step + 1) / steps.length) * 100} />
                <small>
                    {step + 1} / {steps.length}
                </small>
            </aside>
            <div className="wizard-main">
                {/* In the portal the project is chosen from the overview list, so the
                    resume picker only belongs to the standalone wizard page. */}
                {!onSubmitted && drafts.length > 0 && (
                    <div className="resume-row">
                        <Choose
                            label="Resume saved assessment"
                            value={saved?.id || ""}
                            onChange={(id) => {
                                const r = drafts.find((x) => x.id === id);
                                setSaved(r);
                                setData(r.data);
                            }}
                            options={drafts.map((r) => ({
                                id: r.id,
                                label: r.title,
                            }))}
                            placeholder={
                                lang === "bn"
                                    ? "সংরক্ষিত খসড়া খুলুন"
                                    : "Resume a saved assessment"
                            }
                        />
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSaved(null);
                                setData({});
                                setKey(crypto.randomUUID());
                                setStep(0);
                            }}
                        >
                            {lang === "bn" ? "নতুন" : "New"}
                        </Button>
                    </div>
                )}
                <div className="step-title">
                    <span className="eyebrow">STEP 0{step + 1}</span>
                    <h2>{steps[step][lang === "bn" ? 1 : 0]}</h2>
                </div>
                {step < steps.length - 1 ? (
                    <>
                        <div className="form-grid">
                            {mod.fields
                                .filter((f) =>
                                    (
                                        steps[step][2] as readonly string[]
                                    ).includes(f.key),
                                )
                                .map((f) => (
                                    <FieldControl
                                        key={f.key}
                                        lang={lang}
                                        f={f}
                                        value={data[f.key] || ""}
                                        onChange={(v) =>
                                            setData((current) =>
                                                mergeAssessmentData(current, {
                                                    [f.key]: v,
                                                }),
                                            )
                                        }
                                    />
                                ))}
                        </div>
                        {step === 1 && (
                            <Notice>
                                {lang === "bn"
                                    ? "ওয়েবসাইটের URL রেকর্ড হবে; স্বয়ংক্রিয় ক্রল বা বর্তমান সিস্টেমে লগইন করা হবে না।"
                                    : "Website addresses are recorded for review; this assessment does not crawl or sign into external systems."}
                            </Notice>
                        )}
                        {step === 2 && (
                            <Multi
                                label="Capabilities"
                                value={(data.modules || "")
                                    .split(", ")
                                    .filter(Boolean)}
                                onChange={(v) =>
                                    setData((current) =>
                                        mergeAssessmentData(current, {
                                            modules: v.join(", "),
                                        }),
                                    )
                                }
                                options={[
                                    "website",
                                    "commerce",
                                    "crm",
                                    "billing",
                                    "analytics",
                                    "AI assistant",
                                    "API / MCP",
                                    "staff operations",
                                    "talent projects",
                                    "research",
                                    "competitions",
                                    "support",
                                ]}
                            />
                        )}
                        {step === 3 && (
                            <AssessmentFiles
                                recordId={saved?.id}
                                ensureRecordId={async () =>
                                    saved?.id || (await save())?.id || null
                                }
                                lang={lang}
                            />
                        )}
                        {step === 3 && (
                            <Notice>
                                {lang === "bn"
                                    ? "অনুমতি একটি দাবিমাত্র; যাচাই ছাড়া প্রকাশের অনুমোদন নয়। কখনও পাসওয়ার্ড বা API কী দেবেন না।"
                                    : "Record permission references only. Rights claims need verification before publication. Never enter passwords or API keys."}
                            </Notice>
                        )}
                    </>
                ) : (
                    <>
                        <div className="review-summary">
                            {mod.fields.map((f) => (
                                <div key={f.key}>
                                    <span>
                                        {lang === "bn" ? f.bn : f.label}
                                    </span>
                                    <p>
                                        {data[f.key] ||
                                            (lang === "bn"
                                                ? "এখনও দেওয়া হয়নি"
                                                : "Not supplied")}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <Notice>
                            {lang === "bn"
                                ? "এই রেকর্ড মূল্যায়নের খসড়া। মূল্য, সংযোগ, সেবা বা রিলিজ অনুমোদিত হয়নি।"
                                : "This is an assessment draft. Price, integrations, service eligibility and release approval remain to be confirmed."}
                        </Notice>
                    </>
                )}
                {error && <Notice tone="error">{error}</Notice>}
                {saved && (
                    <Notice tone="success">
                        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                            <div>
                                <span>
                                    {lang === "bn"
                                        ? "সংরক্ষিত সংস্করণ"
                                        : "Saved version"}{" "}
                                    {saved.version} ·{" "}
                                </span>
                                <Link href={`/${lang}/app/records/assessment`}>
                                    {lang === "bn"
                                        ? "মূল্যায়ন দেখুন"
                                        : "View assessments"}
                                </Link>
                            </div>
                        </div>
                    </Notice>
                )}
                <div className="form-actions flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        disabled={step === 0}
                        onClick={() => setStep(step - 1)}
                    >
                        <ArrowLeft size={16} />
                        {lang === "bn" ? "পূর্ববর্তী" : "Back"}
                    </Button>
                    <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => void save(false)}
                    >
                        <Save size={16} />
                        {lang === "bn" ? "খসড়া সংরক্ষণ" : "Save draft"}
                    </Button>
                    {step < steps.length - 1 ? (
                        <Button onClick={() => setStep(step + 1)}>
                            {lang === "bn" ? "পরবর্তী" : "Continue"}
                            <ArrowRight size={16} />
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                disabled={busy}
                                onClick={() => void submitAndGoToPortal()}
                                className="bg-[#087f79] hover:bg-[#066560] text-white font-bold px-4 py-2 text-sm flex items-center gap-2 shadow-sm"
                            >
                                <Check size={16} />
                                <span>
                                    {lang === "bn"
                                        ? "নিশ্চিত করুন ও পেমেন্টে যান"
                                        : "Confirm & continue to payment"}
                                </span>
                                <ArrowRight size={14} />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
export function RecordsView({
    kind,
    workspace,
    lang,
}: {
    kind: string;
    workspace: string;
    lang: string;
}) {
    const [rows, setRows] = useState<any[]>([]),
        [page, setPage] = useState(0),
        [total, setTotal] = useState(0),
        [error, setError] = useState(""),
        [busy, setBusy] = useState(false),
        [open, setOpen] = useState(false),
        [editing, setEditing] = useState<any>(null),
        [filter, setFilter] = useState(""),
        [delivery, setDelivery] = useState<any>(null);
    const mod = moduleById(kind)!;
    async function load() {
        setBusy(true);
        try {
            const d = await api(
                `/api/records?workspace=${workspace}&kind=${kind}&page=${page}`,
            );
            setRows(d.records);
            setTotal(d.total);
            setError("");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    useEffect(() => {
        setRows([]);
        void load();
    }, [workspace, kind, page]);
    async function transition(r: any, status: string) {
        setBusy(true);
        try {
            await api("/api/records", "PATCH", {
                workspace,
                id: r.id,
                version: r.version,
                title: r.title,
                data: r.data,
                status,
            });
            await load();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    if (!mod) return <Empty title="Unknown module" />;
    return (
        <>
            <div className="section-heading">
                <div>
                    <p className="eyebrow">{mod.group.toUpperCase()}</p>
                    <h1>{lang === "bn" ? mod.bn : mod.title}</h1>
                    <p>{mod.description}</p>
                </div>
                <Dialog
                    open={open}
                    onOpenChange={(v) => {
                        setOpen(v);
                        if (!v) setEditing(null);
                    }}
                >
                    <DialogTrigger asChild>
                        <Button>
                            <Plus size={17} />
                            {lang === "bn" ? "নতুন খসড়া" : "New draft"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="record-dialog">
                        <DialogHeader>
                            <DialogTitle>
                                {lang === "bn" ? mod.bn : mod.title}
                            </DialogTitle>
                            <DialogDescription>
                                {lang === "bn"
                                    ? "ব্যক্তিগত রেকর্ড—পরবর্তী পর্যালোচনার জন্য"
                                    : "Private record for the next review step."}
                            </DialogDescription>
                        </DialogHeader>
                        <RecordForm
                            key={editing?.id || "new"}
                            kind={kind}
                            workspace={workspace}
                            lang={lang}
                            record={editing}
                            onSaved={() => {
                                setOpen(false);
                                setEditing(null);
                                void load();
                            }}
                        />
                    </DialogContent>
                </Dialog>
            </div>
            {mod.external && <Notice>{mod.external}</Notice>}
            <div className="catalog-tools">
                <Input
                    aria-label="Filter current page"
                    placeholder={
                        lang === "bn"
                            ? "এই পৃষ্ঠায় খুঁজুন"
                            : "Filter this page"
                    }
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
                <Button
                    variant="outline"
                    onClick={() => void load()}
                    disabled={busy}
                >
                    <RefreshCw size={16} />
                    {lang === "bn" ? "রিফ্রেশ" : "Refresh"}
                </Button>
                <Download
                    data={rows}
                    name={`DUDOS-${kind}-page-${page + 1}.json`}
                    label={
                        lang === "bn"
                            ? "এই পৃষ্ঠা এক্সপোর্ট"
                            : "Export this page"
                    }
                />
            </div>
            {error && <Notice tone="error">{error}</Notice>}
            {busy && (
                <p role="status">
                    {lang === "bn" ? "লোড হচ্ছে…" : "Loading records…"}
                </p>
            )}
            {!rows.length && !busy ? (
                <Empty
                    title={
                        lang === "bn"
                            ? "এখনও কোনো রেকর্ড নেই"
                            : "No records yet"
                    }
                >
                    {lang === "bn"
                        ? "আপনার কাজ শুরু করতে একটি খসড়া তৈরি করুন।"
                        : "Create a draft to begin. Records are scoped to this workspace."}
                </Empty>
            ) : (
                <div className="data-table">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    {lang === "bn" ? "রেকর্ড" : "Record"}
                                </TableHead>
                                <TableHead>
                                    {lang === "bn" ? "অবস্থা" : "Status"}
                                </TableHead>
                                <TableHead>
                                    {lang === "bn" ? "সংস্করণ" : "Version"}
                                </TableHead>
                                <TableHead>
                                    {lang === "bn" ? "সংশোধিত" : "Updated"}
                                </TableHead>
                                <TableHead>
                                    {lang === "bn"
                                        ? "পরবর্তী পদক্ষেপ"
                                        : "Next action"}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows
                                .filter((r) =>
                                    JSON.stringify(r)
                                        .toLowerCase()
                                        .includes(filter.toLowerCase()),
                                )
                                .map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>
                                            <button
                                                className="record-title-button"
                                                onClick={() => {
                                                    setEditing(r);
                                                    setDelivery(r);
                                                    setOpen(true);
                                                }}
                                            >
                                                {r.title}
                                            </button>
                                            <small>{r.id.slice(0, 12)}</small>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {human(r.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{r.version}</TableCell>
                                        <TableCell>
                                            {new Date(
                                                r.updated_at,
                                            ).toLocaleDateString(
                                                lang === "bn"
                                                    ? "bn-BD"
                                                    : "en-GB",
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="row-actions">
                                                <SendRequest
                                                    record={r}
                                                    workspace={workspace}
                                                    lang={lang}
                                                />
                                                <RecordComments
                                                    workspace={workspace}
                                                    record={r}
                                                />
                                                {nextStates(kind, r.status)
                                                    .filter(
                                                        (s) =>
                                                            s !== r.status &&
                                                            s !== "archived",
                                                    )
                                                    .map((s) => (
                                                        <Button
                                                            key={s}
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={busy}
                                                            onClick={() =>
                                                                void transition(
                                                                    r,
                                                                    s,
                                                                )
                                                            }
                                                        >
                                                            {human(s)}
                                                        </Button>
                                                    ))}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            {kind === DEVSCOPE_KIND && delivery && (
                <DevscopeProject
                    record={delivery}
                    workspace={workspace}
                    lang={lang}
                />
            )}
            <div className="pagination">
                <span>
                    {total} {lang === "bn" ? "রেকর্ড" : "records"} ·{" "}
                    {lang === "bn" ? "পৃষ্ঠা" : "Page"} {page + 1}
                </span>
                <Button
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    disabled={(page + 1) * 50 >= total}
                    onClick={() => setPage(page + 1)}
                >
                    Next
                </Button>
            </div>
            <p className="field-help">
                {lang === "bn"
                    ? "Submitted এবং Reviewed এই ব্যক্তিগত খসড়ার কাজের অবস্থা। এগুলো বাহ্যিক জমা, আনুষ্ঠানিক অনুমোদন বা সেবার নিশ্চয়তা নয়।"
                    : "Work states record progress inside this workspace. Use Send to DUDOS for a customer request. Financial approvals and external service activation remain separate."}
            </p>
        </>
    );
}
export function AssetsView({
    workspace,
    lang,
}: {
    workspace: string;
    lang: string;
}) {
    const [rows, setRows] = useState<any[]>([]),
        [page, setPage] = useState(0),
        [total, setTotal] = useState(0),
        [error, setError] = useState(""),
        [message, setMessage] = useState(""),
        [file, setFile] = useState<File | null>(null),
        [rights, setRights] = useState("pending"),
        [busy, setBusy] = useState(false),
        [text, setText] = useState("");
    async function load() {
        try {
            const d = await api(
                "/api/assets?workspace=" + workspace + "&page=" + page,
            );
            setRows(d.assets);
            setTotal(d.total);
        } catch (e) {
            setError((e as Error).message);
        }
    }
    useEffect(() => {
        setRows([]);
        setText("");
        void load();
    }, [workspace, page]);
    async function upload(e: React.FormEvent) {
        e.preventDefault();
        if (!file) return;
        setBusy(true);
        setError("");
        try {
            const f = new FormData();
            f.append("workspace", workspace);
            f.append("file", file);
            f.append("rights", rights);
            const d = await api("/api/assets", "POST", f);
            setMessage(d.note);
            setFile(null);
            await load();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    return (
        <>
            <div className="section-heading">
                <div>
                    <p className="eyebrow">SOURCE WORKSPACE</p>
                    <h1>{lang === "bn" ? "উৎস ও ফাইল" : "Sources & files"}</h1>
                    <p>
                        {lang === "bn"
                            ? "মূল ফাইল, অধিকার ও পর্যালোচনার অবস্থা একসঙ্গে রাখুন।"
                            : "Keep originals, claimed rights and review state together."}
                    </p>
                </div>
            </div>
            <form className="upload-box" onSubmit={upload}>
                <Upload size={28} />
                <div>
                    <h3>
                        {lang === "bn"
                            ? "ব্যক্তিগত উৎস যুক্ত করুন"
                            : "Add a private source"}
                    </h3>
                    <p>
                        TXT, MD, CSV, JSON ≤ 1 MB · PDF, DOCX, PNG, JPG ≤ 5 MB
                    </p>
                    <Input
                        type="file"
                        aria-label="Source file"
                        accept=".txt,.md,.csv,.json,.pdf,.docx,.png,.jpg,.jpeg"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                </div>
                <div>
                    <Label>
                        {lang === "bn" ? "অধিকারের দাবি" : "Rights claim"}
                    </Label>
                    <Choose
                        value={rights}
                        onChange={setRights}
                        options={["pending", "owned", "permission_claimed"]}
                        label="Rights state"
                    />
                    <Button disabled={!file || busy} type="submit">
                        {busy ? "…" : lang === "bn" ? "আপলোড" : "Upload"}
                        <Upload size={16} />
                    </Button>
                </div>
            </form>
            <Notice>
                {lang === "bn"
                    ? "বাইনারি ফাইল কোয়ারেন্টাইনে থাকবে। ম্যালওয়্যার স্ক্যান, OCR ও DOCX এক্সট্রাকশন সংযুক্ত নয়। UTF-8 টেক্সট নিরাপদ টেক্সট হিসেবে দেখা যাবে; তথ্য ও অধিকার পর্যালোচনা বাকি থাকবে।"
                    : "Binary files stay in quarantine. Malware scanning, OCR and DOCX extraction are not connected. UTF-8 text is displayed as text for your review; facts and rights remain unverified."}
            </Notice>
            {error && <Notice tone="error">{error}</Notice>}
            {message && <Notice tone="success">{message}</Notice>}
            <div className="asset-grid">
                {rows.map((r) => (
                    <article key={r.id}>
                        <FileText />
                        <h3>{r.filename}</h3>
                        <p>
                            {Math.round(r.size / 1024)} KB ·{" "}
                            <Badge variant="secondary">{human(r.status)}</Badge>
                        </p>
                        <small>SHA-256 {r.sha256.slice(0, 16)}…</small>
                        <div className="row-actions">
                            <Button variant="outline" asChild>
                                <a
                                    href={`/api/assets?workspace=${workspace}&id=${r.id}`}
                                >
                                    Download
                                </a>
                            </Button>
                            {r.status === "text_ready" && (
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        void api(
                                            `/api/assets?workspace=${workspace}&id=${r.id}&text=1`,
                                        )
                                            .then((d) => setText(d.text))
                                            .catch((e) => setError(e.message))
                                    }
                                >
                                    Review text
                                </Button>
                            )}
                        </div>
                    </article>
                ))}
            </div>
            {!rows.length && (
                <Empty
                    title={
                        lang === "bn"
                            ? "উৎস ফাইল যোগ করুন"
                            : "Add your first source file"
                    }
                />
            )}{" "}
            {text && (
                <div className="source-preview">
                    <h2>Source text · unverified</h2>
                    <Textarea
                        readOnly
                        value={text}
                        rows={18}
                        aria-label="Source text"
                    />
                </div>
            )}
            <div className="pagination">
                <span>
                    {total} files · Page {page + 1}
                </span>
                <Button
                    variant="outline"
                    disabled={!page}
                    onClick={() => setPage(page - 1)}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    disabled={(page + 1) * 100 >= total}
                    onClick={() => setPage(page + 1)}
                >
                    Next
                </Button>
            </div>
        </>
    );
}
