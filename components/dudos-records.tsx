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
    Sparkles,
    Target,
    Globe,
    Layers,
    Palette,
    CheckCircle2,
    ChevronRight,
    Edit3,
    HelpCircle,
    ShieldCheck,
    ExternalLink,
    Clock,
    ShoppingBag,
    Users,
    CreditCard,
    BarChart3,
    Bot,
    Cpu,
    Shield,
    LifeBuoy,
    GraduationCap,
    FlaskConical,
    Trophy,
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

    const CAPABILITY_ITEMS = [
        {
            key: "website",
            labelEn: "Web App & Portal",
            labelBn: "ওয়েব অ্যাপ ও পোর্টাল",
            descEn: "Responsive web application, landing page & client portal",
            descBn: "রেসপনসিভ ওয়েব অ্যাপ ও ইউজার পোর্টাল",
            icon: Globe,
        },
        {
            key: "commerce",
            labelEn: "E-Commerce & Store",
            labelBn: "ই-কমার্স ও স্টোর",
            descEn: "Product catalog, shopping cart, checkout & inventory",
            descBn: "পণ্য ক্যাটালগ, কার্ট ও অনলাইন চেকআউট",
            icon: ShoppingBag,
        },
        {
            key: "crm",
            labelEn: "CRM & Pipelines",
            labelBn: "সিআরএম ও গ্রাহক তথ্য",
            descEn: "Lead qualification, customer profiles & deal tracking",
            descBn: "গ্রাহক তথ্য, লিড ও সেলস পাইপলাইন",
            icon: Users,
        },
        {
            key: "billing",
            labelEn: "Billing & Invoicing",
            labelBn: "বিলিং ও পেমেন্ট",
            descEn: "Subscription plans, credit wallet & PayStation",
            descBn: "সাবস্ক্রিপশন, ক্রেডিট ওয়ালেট ও স্বয়ংক্রিয় ইনভয়েস",
            icon: CreditCard,
        },
        {
            key: "analytics",
            labelEn: "Analytics & Dashboard",
            labelBn: "অ্যানালিটিক্স ও ড্যাশবোর্ড",
            descEn: "Real-time metrics, KPI charts & executive summaries",
            descBn: "রিয়েল-টাইম মেট্রিক্স ও কেপিআই ড্যাশবোর্ড",
            icon: BarChart3,
        },
        {
            key: "AI assistant",
            labelEn: "AI Assistant & Bots",
            labelBn: "এআই সহকারী ও বট",
            descEn: "Autonomous LLM chatbot, natural language Q&A",
            descBn: "এলএলএম চ্যাটবট ও প্রাকৃতিক ভাষার সহায়তা",
            icon: Bot,
        },
        {
            key: "API / MCP",
            labelEn: "API & MCP Tooling",
            labelBn: "এপিআই ও এমসিপি সংযোগ",
            descEn: "REST APIs & Model Context Protocol agent adapters",
            descBn: "রেস্ট এপিআই ও মডেল কনটেক্সট প্রোটোকল এডাপ্টার",
            icon: Cpu,
        },
        {
            key: "staff operations",
            labelEn: "Staff & Role RBAC",
            labelBn: "টিম ও রোল ম্যানেজমেন্ট",
            descEn: "Internal team access, user privileges & permissions",
            descBn: "অভ্যন্তরীণ অ্যাডমিন ও ভূমিকাভিত্তিক নিয়ন্ত্রণ",
            icon: Shield,
        },
        {
            key: "support",
            labelEn: "Support Helpdesk",
            labelBn: "সাপোর্ট হেল্পডেস্ক",
            descEn: "Customer issue tickets, live messaging & resolution queues",
            descBn: "টিকিট সমাধান ও গ্রাহক সহায়তা",
            icon: LifeBuoy,
        },
        {
            key: "talent projects",
            labelEn: "Talent & Portfolios",
            labelBn: "ট্যালেন্ট ও পোর্টফোলিও",
            descEn: "Applicant portfolios, skill verification & assessments",
            descBn: "প্রতিভা প্রোফাইল ও দক্ষতা যাচাই",
            icon: GraduationCap,
        },
        {
            key: "research",
            labelEn: "Research & Labs",
            labelBn: "গবেষণা ও লিভিং ল্যাব",
            descEn: "Experimental data collection & analytical workflows",
            descBn: "গবেষণা তথ্য ও পরীক্ষামূলক প্রকল্প",
            icon: FlaskConical,
        },
        {
            key: "competitions",
            labelEn: "Challenges & Contests",
            labelBn: "চ্যালেঞ্জ ও প্রতিযোগিতা",
            descEn: "Submissions, judging rubrics & leaderboard rewards",
            descBn: "প্রতিযোগিতা জমা ও মূল্যায়ন রুব্রিক",
            icon: Trophy,
        },
    ];

    const STEP_META = [
        {
            icon: Target,
            en: "Scope & Goals",
            bn: "লক্ষ্য ও পরিধি",
            subEn: "Define your project name and the transformative business outcomes you want to achieve.",
            subBn: "প্রজেক্টের নাম ও প্রত্যাশিত ফলাফল নির্ধারণ করুন।",
        },
        {
            icon: Globe,
            en: "Business & Web",
            bn: "প্রতিষ্ঠান ও ওয়েব",
            subEn: "Provide your organization details, audience, and current digital footprint.",
            subBn: "আপনার প্রতিষ্ঠান, দেশ, ভাষা ও বর্তমান ওয়েবসাইটের তথ্য দিন।",
        },
        {
            icon: Layers,
            en: "Capabilities",
            bn: "সুবিধা ও মডিউল",
            subEn: "Select the architectural modules and specialized capabilities your project requires.",
            subBn: "আপনার সিস্টেমের জন্য প্রয়োজনীয় সুবিধা ও মডিউল নির্বাচন করুন।",
        },
        {
            icon: Palette,
            en: "Brand & Assets",
            bn: "ব্র্যান্ড ও ফাইল",
            subEn: "Attach brand guidelines, budget expectations, and reference requirements documents.",
            subBn: "ব্র্যান্ড গাইডলাইন, লোগো, বাজেট ও প্রয়োজনীয় ডকুমেন্ট যুক্ত করুন।",
        },
        {
            icon: Sparkles,
            en: "Review Blueprint",
            bn: "ব্লুপ্রিন্ট পর্যালোচনা",
            subEn: "Review your compiled AI DLC specification blueprint before proceeding to build handoff.",
            subBn: "বিল্ডারে পাঠানোর আগে সম্পূর্ণ এআই ব্লুপ্রিন্ট পর্যালোচনা ও নিশ্চিত করুন।",
        },
    ];

    const currentModules = (data.modules || "")
        .split(", ")
        .map((s) => s.trim())
        .filter(Boolean);

    const toggleCapability = (key: string) => {
        const next = currentModules.includes(key)
            ? currentModules.filter((k) => k !== key)
            : [...currentModules, key];
        setData((curr) => mergeAssessmentData(curr, { modules: next.join(", ") }));
    };

    const completionPercent = Math.round(((step + 1) / steps.length) * 100);

    return (
        <div className="space-y-6">
            {/* 1. Header Banner & Step Rail */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-teal-50/30 p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#087f79]/10 text-[#087f79]">
                                <Sparkles size={14} />
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-[#087f79]">
                                {lang === "bn" ? "এআই স্পেসিফিকেশন স্টুডিও" : "AI SPECIFICATION STUDIO"}
                            </span>
                        </div>
                        <h2 className="mt-1 text-xl sm:text-2xl font-black text-[#162c38]">
                            {STEP_META[step]?.[lang === "bn" ? "bn" : "en"]}
                        </h2>
                        <p className="mt-1 text-xs sm:text-sm text-[#5b6f7b] max-w-2xl">
                            {STEP_META[step]?.[lang === "bn" ? "subBn" : "subEn"]}
                        </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-teal-200 bg-teal-50 text-[#087f79] font-mono text-xs">
                                {lang === "bn" ? `ধাপ ${step + 1} / ${steps.length}` : `Step ${step + 1} of ${steps.length}`}
                            </Badge>
                            <span className="text-xs font-bold text-[#162c38]">{completionPercent}%</span>
                        </div>
                        <Progress value={completionPercent} className="w-32 h-2" />
                    </div>
                </div>

                {/* Interactive Multi-Step Indicator Rail */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {steps.map(([en, bn], i) => {
                        const Icon = STEP_META[i]?.icon || Target;
                        const isDone = i < step;
                        const isCurrent = i === step;
                        return (
                            <button
                                key={en}
                                type="button"
                                onClick={() => setStep(i)}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                    isCurrent
                                        ? "border-[#087f79] bg-white ring-2 ring-[#087f79]/20 shadow-xs"
                                        : isDone
                                          ? "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-900"
                                          : "border-slate-200/80 bg-white/70 hover:bg-white text-slate-500"
                                }`}
                            >
                                <span
                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                        isCurrent
                                            ? "bg-[#087f79] text-white shadow-xs"
                                            : isDone
                                              ? "bg-emerald-600 text-white"
                                              : "bg-slate-100 text-slate-500"
                                    }`}
                                >
                                    {isDone ? <Check size={14} /> : <Icon size={14} />}
                                </span>
                                <div className="min-w-0 flex-1 truncate">
                                    <p className={`text-xs font-bold truncate ${isCurrent ? "text-[#087f79]" : isDone ? "text-emerald-900" : "text-slate-700"}`}>
                                        {lang === "bn" ? bn : en}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                        {isDone ? (lang === "bn" ? "সম্পন্ন ✓" : "Done ✓") : isCurrent ? (lang === "bn" ? "বর্তমান" : "Active") : `0${i + 1}`}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Resume Saved Draft Pill (if standalone page) */}
            {!onSubmitted && drafts.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <div className="flex items-center gap-2 text-xs text-[#5b6f7b]">
                        <Clock size={14} className="text-[#087f79]" />
                        <span className="font-semibold">{lang === "bn" ? "সংরক্ষিত খসড়া:" : "Saved Drafts:"}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 max-w-md">
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
                            size="sm"
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
                </div>
            )}

            {/* 2. Step Form Body */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
                {step < steps.length - 1 ? (
                    <div className="space-y-6">
                        {/* Standard fields for current step */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {mod.fields
                                .filter((f) =>
                                    (steps[step][2] as readonly string[]).includes(f.key) &&
                                    // Custom handling for modules in Step 2
                                    f.key !== "modules",
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

                        {/* Step 1 Context Notice */}
                        {step === 1 && (
                            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-teal-200 bg-teal-50/70 text-xs text-teal-900">
                                <Globe className="h-4 w-4 shrink-0 text-[#087f79] mt-0.5" />
                                <p>
                                    {lang === "bn"
                                        ? "ওয়েবসাইটের URL রেকর্ড হবে; স্বয়ংক্রিয় ক্রল বা বর্তমান সিস্টেমে লগইন করা হবে না।"
                                        : "Website addresses are recorded for design reference; our assessment does not modify or crawl external systems without approval."}
                                </p>
                            </div>
                        )}

                        {/* Step 2 Interactive Capabilities Grid */}
                        {step === 2 && (
                            <div className="space-y-4 pt-2 border-t border-slate-100">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-bold text-[#162c38]">
                                            {lang === "bn" ? "প্রয়োজনীয় মডিউল ও সুবিধা নির্বাচন করুন" : "Select Required Modules & Capabilities"}
                                        </Label>
                                        <span className="text-xs font-mono text-[#087f79] font-bold">
                                            {currentModules.length} {lang === "bn" ? "টি নির্বাচিত" : "selected"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[#5b6f7b] mt-0.5">
                                        {lang === "bn"
                                            ? "আপনার সফটওয়্যার প্ল্যাটফর্মের জন্য প্রয়োজনীয় সুবিধাগুলো বেছে নিন। এআই বিল্ডার এগুলো স্বয়ংক্রিয়ভাবে কোড করবে।"
                                            : "Choose the components your platform needs. DevScope AI Builder automatically structures components, APIs, and schemas for each."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {CAPABILITY_ITEMS.map((item) => {
                                        const isSelected = currentModules.includes(item.key);
                                        const ItemIcon = item.icon;
                                        return (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => toggleCapability(item.key)}
                                                className={`group flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                                    isSelected
                                                        ? "border-[#087f79] bg-[#edf7f4] ring-1 ring-[#087f79] shadow-xs"
                                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                                                }`}
                                            >
                                                <div
                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                                        isSelected
                                                            ? "bg-[#087f79] text-white"
                                                            : "bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-[#087f79]"
                                                    }`}
                                                >
                                                    <ItemIcon size={18} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <h4 className={`text-xs font-bold leading-tight ${isSelected ? "text-[#087f79]" : "text-[#162c38]"}`}>
                                                            {lang === "bn" ? item.labelBn : item.labelEn}
                                                        </h4>
                                                        {isSelected && (
                                                            <Check size={14} className="text-[#087f79] shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-[#5b6f7b] mt-1 line-clamp-2 leading-relaxed">
                                                        {lang === "bn" ? item.descBn : item.descEn}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Step 3 Brand, Rights, Budget & Files */}
                        {step === 3 && (
                            <div className="space-y-4 pt-2 border-t border-slate-100">
                                <div>
                                    <Label className="text-sm font-bold text-[#162c38]">
                                        {lang === "bn" ? "রেফারেন্স ফাইল ও ব্র্যান্ড অ্যাসেট আপলোড" : "Reference Files & Brand Assets"}
                                    </Label>
                                    <p className="text-xs text-[#5b6f7b] mt-0.5">
                                        {lang === "bn"
                                            ? "লোগো, ব্র্যান্ড গাইড, স্পেসিফিকেশন ডকুমেন্ট বা রেফারেন্স স্ক্রিনশট আপলোড করুন।"
                                            : "Upload your brand logo, design guidelines, SRS documentation, or schema references."}
                                    </p>
                                </div>
                                <AssessmentFiles
                                    recordId={saved?.id}
                                    ensureRecordId={async () =>
                                        saved?.id || (await save())?.id || null
                                    }
                                    lang={lang}
                                />
                                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900">
                                    <ShieldCheck className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                                    <p>
                                        {lang === "bn"
                                            ? "অনুমতি একটি দাবিমাত্র; যাচাই ছাড়া প্রকাশের অনুমোদন নয়। কখনও পাসওয়ার্ড বা সিক্রেট API কী দেবেন না।"
                                            : "Files and references are held securely for project scoping. Never enter production passwords or live secret API keys."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Step 5: Executive AI DLC Build Blueprint Review */
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-950">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                                    <CheckCircle2 size={22} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold">
                                        {lang === "bn" ? "এআই বিল্ড ব্লুপ্রিন্ট প্রস্তুত" : "AI DLC Build Blueprint Ready for Handoff"}
                                    </h3>
                                    <p className="text-xs text-emerald-800 mt-0.5">
                                        {lang === "bn"
                                            ? "নিচের উত্তরগুলো যাচাই করুন। জমা দিলে এটি আপনার ওয়ার্কস্পেসে সংরক্ষিত হবে।"
                                            : "Review the answers below. Submitting will save your project draft ready for build dispatch."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Blueprint Categorized Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Card 1: Identity & Scope */}
                            <div className="rounded-xl border border-slate-200 bg-[#f8fafb] p-4 space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <Target size={15} className="text-[#087f79]" />
                                        <h4 className="text-xs font-bold text-[#162c38] uppercase tracking-wider">
                                            {lang === "bn" ? "প্রজেক্ট পরিচিতি ও লক্ষ্য" : "Project Identity & Goals"}
                                        </h4>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-[#087f79]" onClick={() => setStep(0)}>
                                        <Edit3 size={12} className="mr-1" />
                                        {lang === "bn" ? "সম্পাদনা" : "Edit"}
                                    </Button>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div>
                                        <span className="text-slate-400 font-semibold">{lang === "bn" ? "প্রজেক্টের নাম:" : "Project Name:"}</span>
                                        <p className="font-bold text-[#162c38] mt-0.5">{data.project_name || "—"}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-semibold">{lang === "bn" ? "প্রত্যাশিত ফলাফল:" : "Desired Outcomes:"}</span>
                                        <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{data.outcomes || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Business & Digital Footprint */}
                            <div className="rounded-xl border border-slate-200 bg-[#f8fafb] p-4 space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <Globe size={15} className="text-[#087f79]" />
                                        <h4 className="text-xs font-bold text-[#162c38] uppercase tracking-wider">
                                            {lang === "bn" ? "প্রতিষ্ঠান ও অনলাইন তথ্য" : "Business & Online Presence"}
                                        </h4>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-[#087f79]" onClick={() => setStep(1)}>
                                        <Edit3 size={12} className="mr-1" />
                                        {lang === "bn" ? "সম্পাদনা" : "Edit"}
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-slate-400 font-semibold">{lang === "bn" ? "প্রতিষ্ঠান:" : "Organization:"}</span>
                                        <p className="font-bold text-[#162c38] mt-0.5">{data.organization || "—"}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-semibold">{lang === "bn" ? "খাত / সেক্টর:" : "Sector:"}</span>
                                        <p className="font-bold text-[#162c38] mt-0.5">{data.sector || "—"}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-slate-400 font-semibold">{lang === "bn" ? "ওয়েবসাইট লিঙ্ক:" : "Website:"}</span>
                                        <p className="font-mono text-[#087f79] mt-0.5 truncate">{data.site_url || "—"}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-semibold">{lang === "bn" ? "দেশ:" : "Country:"}</span>
                                        <p className="font-bold text-[#162c38] mt-0.5">{data.country || "—"}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-semibold">{lang === "bn" ? "ভাষা:" : "Languages:"}</span>
                                        <p className="font-bold text-[#162c38] mt-0.5">{data.languages || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Capabilities & Modules */}
                            <div className="rounded-xl border border-slate-200 bg-[#f8fafb] p-4 space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <Layers size={15} className="text-[#087f79]" />
                                        <h4 className="text-xs font-bold text-[#162c38] uppercase tracking-wider">
                                            {lang === "bn" ? "নির্বাচিত মডিউল ও সুবিধা" : "Selected Capabilities"}
                                        </h4>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-[#087f79]" onClick={() => setStep(2)}>
                                        <Edit3 size={12} className="mr-1" />
                                        {lang === "bn" ? "সম্পাদনা" : "Edit"}
                                    </Button>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div className="flex flex-wrap gap-1.5">
                                        {currentModules.length > 0 ? (
                                            currentModules.map((m) => (
                                                <Badge key={m} variant="outline" className="border-teal-300 bg-teal-50 text-[#087f79] text-xs font-medium capitalize">
                                                    {m}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-slate-400 italic">{lang === "bn" ? "কোনো মডিউল নির্বাচিত হয়নি" : "None selected"}</span>
                                        )}
                                    </div>
                                    {data.systems && (
                                        <div className="pt-2 border-t border-slate-200/60">
                                            <span className="text-slate-400 font-semibold">{lang === "bn" ? "বর্তমান সিস্টেম:" : "Existing Systems:"}</span>
                                            <p className="text-slate-700 mt-0.5">{data.systems}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card 4: Brand & Budget */}
                            <div className="rounded-xl border border-slate-200 bg-[#f8fafb] p-4 space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <Palette size={15} className="text-[#087f79]" />
                                        <h4 className="text-xs font-bold text-[#162c38] uppercase tracking-wider">
                                            {lang === "bn" ? "ব্র্যান্ডিং, বাজেট ও অধিকার" : "Brand, Budget & Rights"}
                                        </h4>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-[#087f79]" onClick={() => setStep(3)}>
                                        <Edit3 size={12} className="mr-1" />
                                        {lang === "bn" ? "সম্পাদনা" : "Edit"}
                                    </Button>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div>
                                        <span className="text-slate-400 font-semibold">{lang === "bn" ? "বাজেট প্রত্যাশা:" : "Budget Expectation:"}</span>
                                        <p className="font-bold text-[#162c38] mt-0.5">{data.budget || "—"}</p>
                                    </div>
                                    {data.brand && (
                                        <div>
                                            <span className="text-slate-400 font-semibold">{lang === "bn" ? "ব্র্যান্ড চাহিদা:" : "Brand Requirements:"}</span>
                                            <p className="text-slate-700 mt-0.5 line-clamp-2">{data.brand}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                            {lang === "bn"
                                ? "এই রেকর্ডটি মূল্যায়নের খসড়া। নিশ্চিত করার পর প্রজেক্টটি ওয়ার্কস্পেসে যুক্ত হবে এবং পেমেন্ট সম্পন্ন করে বিল্ডারে হস্তান্তর করা যাবে।"
                                : "This assessment blueprint will be stored in your workspace. After confirmation, you can complete payment and hand it over to the autonomous builder."}
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {error && <Notice tone="error">{error}</Notice>}

                {/* Saved Notice */}
                {saved && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-900">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={15} className="text-emerald-600" />
                            <span>
                                {lang === "bn" ? "সংরক্ষিত সংস্করণ" : "Draft version"} <strong>{saved.version}</strong> (ID: <code className="font-mono">{saved.id}</code>)
                            </span>
                        </div>
                        <Link href={`/${lang}/app/overview`} className="text-[#087f79] hover:underline font-bold">
                            {lang === "bn" ? "ওয়ার্কস্পেসে দেখুন" : "View in workspace"} →
                        </Link>
                    </div>
                )}

                {/* 3. Sticky Action Bar */}
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-slate-100">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={step === 0}
                        onClick={() => setStep(step - 1)}
                        className="cursor-pointer"
                    >
                        <ArrowLeft size={16} />
                        {lang === "bn" ? "পূর্ববর্তী ধাপ" : "Previous Step"}
                    </Button>

                    <div className="flex items-center gap-2 flex-wrap ml-auto">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void save(false)}
                            className="cursor-pointer"
                        >
                            <Save size={16} />
                            {lang === "bn" ? "খসড়া সংরক্ষণ" : "Save Draft"}
                        </Button>

                        {step < steps.length - 1 ? (
                            <Button
                                type="button"
                                onClick={() => setStep(step + 1)}
                                className="bg-[#087f79] hover:bg-[#076e68] text-white font-bold cursor-pointer"
                            >
                                <span>{lang === "bn" ? "পরবর্তী ধাপ" : "Continue"}</span>
                                <ArrowRight size={16} />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                disabled={busy}
                                onClick={() => void submitAndGoToPortal()}
                                className="bg-[#087f79] hover:bg-[#066560] text-white font-bold px-5 py-2 text-sm flex items-center gap-2 shadow-sm cursor-pointer"
                            >
                                <Check size={16} />
                                <span>
                                    {lang === "bn"
                                        ? "নিশ্চিত করুন ও পেমেন্টে যান"
                                        : "Confirm & Continue to Payment"}
                                </span>
                                <ArrowRight size={14} />
                            </Button>
                        )}
                    </div>
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
