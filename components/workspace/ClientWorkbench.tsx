"use client";

import React, { useState, useEffect } from "react";
import { API_BASE } from "@/lib/dudos/packages";
import { useRouter } from "next/navigation";
import Link from "@/components/dudos-link";
import {
    LayoutDashboard,
    FolderKanban,
    Rocket,
    LifeBuoy,
    LogOut,
    Globe,
    ArrowUpRight,
    Building2,
    ChevronDown,
    Check,
    Plus,
    Sparkles,
    FileText,
    CreditCard,
    Coins,
    UserRound,
    Megaphone,
    LayoutTemplate,
    MessageSquare,
    Target,
    type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
    SidebarInset,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context";
import { CreditBadgeButton } from "@/components/billing/CreditWalletModal";
import { AssessmentWizardInline } from "@/components/dudos-records";
import { CustomerUserPanel } from "./CustomerUserPanel";
import { ClientInvoices } from "./ClientInvoices";
import { ClientWallet } from "./ClientWallet";
import {
    preferredWorkspace,
    rememberWorkspace,
} from "@/lib/dudos/workspace-preference";
import { fetchAuthenticatedWorkspaces } from "@/lib/dudos/workspaces";
import { api } from "@/lib/dudos/client";
import { showToast } from "@/lib/toast";

type ClientNavigationItem = {
    id: string;
    title: string;
    bn: string;
    icon: LucideIcon;
    badge?: string;
    href?: string;
    onClick?: () => void;
    comingSoon?: boolean;
};

function ClientComingSoon({
    lang,
    item,
}: {
    lang: string;
    item: ClientNavigationItem;
}) {
    const Icon = item.icon;

    return (
        <section className="rounded-2xl border border-[#dce5e9] bg-white p-8 sm:p-10">
            <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf7f4] text-[#087f79]">
                    <Icon size={22} />
                </div>
                <p className="eyebrow mt-5 justify-center">
                    <span />
                    {lang === "bn"
                        ? "প্ল্যাটফর্ম রোডম্যাপ"
                        : "WORKSPACE ROADMAP"}
                </p>
                <h1 className="mt-2 text-2xl font-bold text-dudos-text">
                    {lang === "bn" ? item.bn : item.title}
                </h1>
                <p className="mt-2 text-sm text-dudos-text-secondary">
                    {lang === "bn"
                        ? "এই সুবিধাটি ডুডোস প্ল্যাটফর্মে ধাপে ধাপে যোগ করা হবে।"
                        : "This workspace feature is planned and will be added incrementally."}
                </p>
                <Badge
                    variant="outline"
                    className="mt-5 border-slate-200 bg-slate-50 text-slate-600"
                >
                    {lang === "bn" ? "শীঘ্রই আসছে" : "Coming soon"}
                </Badge>
            </div>
        </section>
    );
}

function ClientProfileSettings({
    lang,
    user,
    activeWorkspaceDisplayName,
    activeWorkspaceId,
}: {
    lang: string;
    user: any;
    activeWorkspaceDisplayName?: string;
    activeWorkspaceId?: string;
}) {
    return (
        <section className="space-y-6" aria-labelledby="profile-settings-title">
            <div className="section-heading">
                <div>
                    <p className="eyebrow">
                        <span />
                        {lang === "bn" ? "অ্যাকাউন্ট সেটিংস" : "ACCOUNT & PROFILE"}
                    </p>
                    <h1 id="profile-settings-title">
                        {lang === "bn" ? "প্রোফাইল ও সেটিংস" : "Profile & Settings"}
                    </h1>
                    <p>
                        {lang === "bn"
                            ? "আপনার ব্যক্তিগত তথ্য, ওয়ার্কস্পেস সংযোগ এবং অ্যাকাউন্ট স্থিতি পর্যালোচনা করুন।"
                            : "Review your personal information, workspace linkage, and account details."}
                    </p>
                </div>
            </div>

            {/* Profile Overview Card */}
            <div className="rounded-xl border border-dudos-border bg-white p-6 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#087f79]/10 text-[#087f79] font-bold text-xl uppercase">
                            {user?.displayName?.[0] || user?.email?.[0] || "U"}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#162c38]">
                                {user?.displayName || "DUDOS Client"}
                            </h2>
                            <p className="text-xs text-[#5b6f7b] font-mono mt-0.5">
                                {user?.email || "user@daffodil.family"}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge className="bg-[#087f79] text-white text-[11px] font-medium border-0 capitalize">
                                    {user?.role || "client"}
                                </Badge>
                                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[11px] font-medium capitalize">
                                    {user?.status || "approved"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:items-end">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {lang === "bn" ? "ক্রেডিট ব্যালেন্স" : "Credit Balance"}
                        </span>
                        <span className="text-2xl font-black text-[#087f79] mt-0.5">
                            {user?.credits ?? 0} <span className="text-sm font-semibold text-slate-500">Cr</span>
                        </span>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                    <div>
                        <label className="text-xs font-bold text-[#5b6f7b] uppercase tracking-wider">
                            {lang === "bn" ? "ইউজারনেম" : "Username"}
                        </label>
                        <p className="text-sm font-semibold text-[#162c38] mt-1 font-mono">
                            @{user?.username || "client_user"}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#5b6f7b] uppercase tracking-wider">
                            {lang === "bn" ? "প্রতিষ্ঠান / সংস্থা" : "Organization"}
                        </label>
                        <p className="text-sm font-semibold text-[#162c38] mt-1">
                            {user?.organizationName || "Independent Client"}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#5b6f7b] uppercase tracking-wider">
                            {lang === "bn" ? "সক্রিয় ওয়ার্কস্পেস" : "Active Workspace"}
                        </label>
                        <p className="text-sm font-semibold text-[#162c38] mt-1 flex items-center gap-1.5">
                            <Building2 size={14} className="text-[#087f79]" />
                            {activeWorkspaceDisplayName || "Default Workspace"}
                        </p>
                        {activeWorkspaceId && (
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                ID: {activeWorkspaceId}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#5b6f7b] uppercase tracking-wider">
                            {lang === "bn" ? "যোগাযোগের ফোন" : "Phone Number"}
                        </label>
                        <p className="text-sm font-semibold text-[#162c38] mt-1">
                            {user?.phone || (lang === "bn" ? "যোগ করা হয়নি" : "Not specified")}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#5b6f7b] uppercase tracking-wider">
                            {lang === "bn" ? "আইডি / আইডেন্টিফায়ার" : "Identifier"}
                        </label>
                        <p className="text-sm font-semibold text-[#162c38] mt-1 font-mono">
                            {user?.identifier || user?.id || "N/A"}
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[#5b6f7b] uppercase tracking-wider">
                            {lang === "bn" ? "নিবন্ধন তারিখ" : "Member Since"}
                        </label>
                        <p className="text-sm font-semibold text-[#162c38] mt-1">
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "2026"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Workspace & Preferences Box */}
            <div className="rounded-xl border border-dudos-border bg-white p-6 shadow-2xs space-y-4">
                <h3 className="text-base font-bold text-[#162c38]">
                    {lang === "bn" ? "পছন্দসমূহ ও নিরাপত্তা" : "Preferences & Security"}
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#f8fafb] border border-slate-200">
                    <div>
                        <p className="text-sm font-bold text-[#162c38]">
                            {lang === "bn" ? "ভাষা পছন্দ" : "Language Preference"}
                        </p>
                        <p className="text-xs text-[#5b6f7b] mt-0.5">
                            {lang === "bn" ? "বর্তমান ভাষা: বাংলা" : "Current language: English"}
                        </p>
                    </div>
                    <Link
                        href={`/${lang === "bn" ? "en" : "bn"}/app/settings`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#162c38] hover:bg-slate-50 transition-colors"
                    >
                        <Globe size={14} />
                        {lang === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default function ClientWorkbench({
    lang = "en",
    section = [],
}: {
    lang: string;
    section: string[];
}) {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [navSearch, setNavSearch] = useState("");
    const [supportCount, setSupportCount] = useState<number>(0);

    // Multi-Workspace state
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("");
    const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState("");
    const [workspaceBusy, setWorkspaceBusy] = useState(false);
    const [assessmentMode, setAssessmentMode] = useState<"new" | "edit" | null>(
        null,
    );
    const [assessmentOrganizationName, setAssessmentOrganizationName] =
        useState<string | undefined>();
    const [assessmentSeed, setAssessmentSeed] = useState<{
        assessmentRecordId?: string;
        assessmentVersion?: number;
        assessmentData?: Record<string, string>;
        status?: string;
        sourceProjectId?: string;
    }>();
    const [assessmentRefreshKey, setAssessmentRefreshKey] = useState(0);

    const openAssessment = (
        mode: "new" | "edit",
        organizationName?: string,
        assessment?: typeof assessmentSeed,
    ) => {
        setAssessmentOrganizationName(organizationName);
        setAssessmentSeed(assessment);
        setAssessmentMode(mode);
    };

    const view = section[0] || "overview";

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

    const loadWorkspaces = async () => {
        try {
            const backendWorkspaces = await fetchAuthenticatedWorkspaces();
            if (backendWorkspaces !== null) {
                const sanitized = backendWorkspaces.map((workspace) => ({
                    ...workspace,
                    name: getCleanName(workspace.name),
                }));
                setWorkspaces(sanitized);
                const pref = preferredWorkspace();
                const current =
                    sanitized.find((workspace) => workspace.id === pref) ||
                    sanitized[0];
                if (current) {
                    setActiveWorkspaceId(current.id);
                    rememberWorkspace(current.id);
                }
                return;
            }

            // Use the same local fallback as the assessment workspace gate.
            const res = await api("/api/workspaces");
            const list = (res.workspaces || []).map((w: any) => ({
                ...w,
                name: getCleanName(w.name),
            }));
            setWorkspaces(list);
            const pref = preferredWorkspace();
            const current = list.find((w: any) => w.id === pref) || list[0];
            if (current) {
                setActiveWorkspaceId(current.id);
                rememberWorkspace(current.id);
            }
        } catch {}
    };

    useEffect(() => {
        void loadWorkspaces();
    }, [user]);

    const handleSelectWorkspace = (id: string) => {
        setActiveWorkspaceId(id);
        rememberWorkspace(id);
        const target = workspaces.find((w) => w.id === id);
        showToast.info(
            lang === "bn"
                ? `ওয়ার্কস্পেস পরিবর্তিত হয়েছে: ${target?.name || id}`
                : `Switched workspace: ${target?.name || id}`,
        );
    };

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWorkspaceName.trim() || newWorkspaceName.trim().length < 2)
            return;
        setWorkspaceBusy(true);
        try {
            const clean = getCleanName(newWorkspaceName.trim());
            const token =
                typeof window !== "undefined"
                    ? localStorage.getItem("dudos_jwt_token") ||
                      localStorage.getItem("dudos_auth_token")
                    : null;

            let created: any = null;
            if (token) {
                const dbRes = await fetch(
                    `${API_BASE}/workspaces`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ name: clean }),
                    },
                );
                if (dbRes.ok) {
                    created = await dbRes.json();
                }
            }

            if (!created) {
                created = await api("/api/workspaces", "POST", { name: clean });
            }

            const formatted = { ...created, name: getCleanName(created.name) };
            const updated = [
                ...workspaces.filter((w) => w.id !== formatted.id),
                formatted,
            ];
            setWorkspaces(updated);
            setActiveWorkspaceId(formatted.id);
            rememberWorkspace(formatted.id);
            setNewWorkspaceName("");
            setIsCreatingWorkspace(false);
            showToast.success(
                lang === "bn"
                    ? "ওয়ার্কস্পেস সফলভাবে ডেটাবেসে সংরক্ষিত হয়েছে"
                    : "Workspace saved to database successfully",
            );
        } catch (err: any) {
            showToast.error(err.message || "Failed to create workspace");
        } finally {
            setWorkspaceBusy(false);
        }
    };

    const activeWorkspace =
        workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];
    const activeWorkspaceDisplayName =
        activeWorkspace?.name ||
        (user?.organizationName && user.organizationName !== "Customer / Client"
            ? user.organizationName
            : user?.displayName
              ? `${user.displayName}'s Workspace`
              : lang === "bn"
                ? "আপনার কর্মপরিসর"
                : "Your workspace");

    useEffect(() => {
        const token =
            typeof window !== "undefined"
                ? localStorage.getItem("dudos_jwt_token") ||
                  localStorage.getItem("dudos_auth_token")
                : null;
        if (token) {
            fetch(`${API_BASE}/support/tickets/my`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((res) => res.json())
                .then((data) => {
                    if (Array.isArray(data)) {
                        const openTickets = data.filter(
                            (t: any) =>
                                t.status === "open" ||
                                t.status === "in_progress",
                        ).length;
                        setSupportCount(openTickets);
                    }
                })
                .catch(() => {});
        }
    }, [user]);

    const handleSignOut = () => {
        logout();
        try {
            localStorage.removeItem("dudos_auth_session");
            localStorage.removeItem("dudos_jwt_token");
            sessionStorage.clear();
            const epoch = "Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
            document.cookie = `dudos_session=; path=/; max-age=0; expires=${epoch}`;
            document.cookie = `dudos_at=; path=/; max-age=0; expires=${epoch}`;
            if (typeof window !== "undefined") {
                document.cookie = `dudos_session=; path=/; domain=${window.location.hostname}; max-age=0; expires=${epoch}`;
                document.cookie = `dudos_at=; path=/; domain=${window.location.hostname}; max-age=0; expires=${epoch}`;
            }
            document.cookie = `dudos_session=; path=/; domain=localhost; max-age=0; expires=${epoch}`;
            document.cookie = `dudos_at=; path=/; domain=localhost; max-age=0; expires=${epoch}`;
            document.cookie = `dudos_session=; path=/; domain=.localhost; max-age=0; expires=${epoch}`;
            document.cookie = `dudos_at=; path=/; domain=.localhost; max-age=0; expires=${epoch}`;
        } catch {}
        // /logout clears the session on every DUDOS host, then shows the login page.
        window.location.href = "/logout?return_to=/login";
    };

    // Sidebar follows the PRD; features not built yet are marked "Soon".
    const clientNavSections: {
        group: string;
        items: ClientNavigationItem[];
    }[] = [
        {
            group: "MY WORKSPACE",
            items: [
                {
                    id: "overview",
                    title: "Workspace Overview",
                    bn: "ওয়ার্কস্পেস সংক্ষিপ্ত চিত্র",
                    icon: LayoutDashboard,
                },
                {
                    id: "projects",
                    title: "My Projects",
                    bn: "আমার প্রজেক্ট",
                    icon: FolderKanban,
                },
                {
                    id: "new-project",
                    title: "New Project Assessment",
                    bn: "নতুন প্রজেক্ট অ্যাসেসমেন্ট",
                    icon: Plus,
                    onClick: () => openAssessment("new"),
                },
            ],
        },
        /* Temporarily commented out roadmap section — enable later when functional
        {
            group: "WEBSITE BUILDER",
            items: [
                {
                    id: "builder",
                    title: "AI Website Builder",
                    bn: "এআই ওয়েবসাইট বিল্ডার",
                    icon: Sparkles,
                    comingSoon: true,
                },
                {
                    id: "templates",
                    title: "Templates & References",
                    bn: "টেমপ্লেট ও রেফারেন্স",
                    icon: LayoutTemplate,
                    comingSoon: true,
                },
                {
                    id: "assets",
                    title: "Preview & Code Download",
                    bn: "প্রিভিউ ও কোড ডাউনলোড",
                    icon: FileText,
                    comingSoon: true,
                },
            ],
        },
        */
        {
            group: "CREDITS & BILLING",
            items: [
                {
                    id: "billing",
                    title: "Credit Wallet",
                    bn: "ক্রেডিট ওয়ালেট",
                    icon: Coins,
                },
                {
                    id: "invoices",
                    title: "Invoices & Payments",
                    bn: "ইনভয়েস ও পেমেন্ট",
                    icon: CreditCard,
                },
            ],
        },
        {
            group: "DELIVERY & SUPPORT",
            items: [
                /* Temporarily commented out roadmap items — enable later when functional
                {
                    id: "deployments",
                    title: "Deployments & Domains",
                    bn: "ডিপ্লয়মেন্ট ও ডোমেন",
                    icon: Rocket,
                    comingSoon: true,
                },
                {
                    id: "feedback",
                    title: "Feedback & Comments",
                    bn: "মতামত ও মন্তব্য",
                    icon: MessageSquare,
                    comingSoon: true,
                },
                */
                {
                    id: "support",
                    title: "Support & Helpdesk",
                    bn: "সাপোর্ট ও সহায়তা",
                    icon: LifeBuoy,
                    badge: supportCount > 0 ? String(supportCount) : undefined,
                },
            ],
        },
        /* Temporarily commented out roadmap section — enable later when functional
        {
            group: "MARKETING (PHASE 2)",
            items: [
                {
                    id: "content-studio",
                    title: "Content Engine",
                    bn: "কনটেন্ট ইঞ্জিন",
                    icon: Megaphone,
                    comingSoon: true,
                },
                {
                    id: "marketing",
                    title: "Facebook Ads",
                    bn: "ফেসবুক বিজ্ঞাপন",
                    icon: Target,
                    comingSoon: true,
                },
            ],
        },
        */
        {
            group: "ACCOUNT",
            items: [
                {
                    id: "settings",
                    title: "Profile & Settings",
                    bn: "প্রোফাইল ও সেটিংস",
                    icon: UserRound,
                },
            ],
        },
    ];

    const activeNavItem = clientNavSections
        .flatMap((navSection) => navSection.items)
        .find((item) => item.id === view);

    return (
        <SidebarProvider>
            <Sidebar className="dudos-sidebar">
                <SidebarHeader>
                    <Link className="brand app-brand" href={`/${lang}`}>
                        <span className="brand-symbol">D</span>DUDOS
                        <span className="brand-dot">.</span>
                    </Link>
                    <div className="flex items-center justify-between px-1 py-0.5">
                        <span className="sidebar-caption">
                            CLIENT WORKSPACE
                        </span>
                        {workspaces.length > 1 && (
                            <Badge
                                variant="outline"
                                className="text-[10px] h-4 font-mono text-teal-700 bg-teal-50 border-teal-200"
                            >
                                {workspaces.length} active
                            </Badge>
                        )}
                    </div>
                    <Input
                        className="sidebar-search"
                        aria-label="Find a workflow"
                        placeholder={
                            lang === "bn"
                                ? "কর্মপ্রবাহ খুঁজুন…"
                                : "Find a workflow…"
                        }
                        value={navSearch}
                        onChange={(e) => setNavSearch(e.target.value)}
                    />
                </SidebarHeader>

                <SidebarContent>
                    {clientNavSections.map((sec) => {
                        const list = sec.items.filter((item) =>
                            (item.title + " " + item.bn)
                                .toLowerCase()
                                .includes(navSearch.toLowerCase()),
                        );
                        if (!list.length) return null;

                        return (
                            <SidebarGroup key={sec.group}>
                                <SidebarGroupLabel>
                                    {sec.group}
                                </SidebarGroupLabel>
                                <SidebarMenu>
                                    {list.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = view === item.id;
                                        const menuItemContents = (
                                            <>
                                                <Icon size={16} />
                                                <span>
                                                    {lang === "bn"
                                                        ? item.bn
                                                        : item.title}
                                                </span>
                                                {item.badge && (
                                                    <span className="ml-auto rounded bg-[#eaf5f1] px-1.5 py-0.5 text-[10px] font-bold text-[#087f79]">
                                                        {item.badge}
                                                    </span>
                                                )}
                                                {item.comingSoon && (
                                                    <span className="ml-auto rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                                                        {lang === "bn"
                                                            ? "শীঘ্রই"
                                                            : "Soon"}
                                                    </span>
                                                )}
                                            </>
                                        );
                                        return (
                                            <SidebarMenuItem key={item.id}>
                                                {item.onClick ? (
                                                    <SidebarMenuButton
                                                        isActive={isActive}
                                                        onClick={item.onClick}
                                                    >
                                                        {menuItemContents}
                                                    </SidebarMenuButton>
                                                ) : (
                                                    <SidebarMenuButton
                                                        asChild
                                                        isActive={isActive}
                                                    >
                                                        <Link
                                                            href={
                                                                item.href ||
                                                                `/${lang}/app/${item.id}`
                                                            }
                                                        >
                                                            {menuItemContents}
                                                        </Link>
                                                    </SidebarMenuButton>
                                                )}
                                            </SidebarMenuItem>
                                        );
                                    })}
                                </SidebarMenu>
                            </SidebarGroup>
                        );
                    })}
                </SidebarContent>

                <SidebarFooter>
                    <p className="sidebar-person">
                        {user?.displayName ||
                            (user?.organizationName &&
                            user.organizationName !== "Customer / Client"
                                ? user.organizationName
                                : "Client")}
                    </p>
                    <div className="sidebar-foot-links">
                        <Link
                            href={`/${lang === "bn" ? "en" : "bn"}/app/${section.join("/")}`}
                        >
                            <Globe size={13} />
                            {lang === "bn" ? "English" : "বাংলা"}
                        </Link>
                        <button
                            type="button"
                            onClick={handleSignOut}
                            style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                color: "inherit",
                            }}
                        >
                            <LogOut size={13} />
                            {lang === "bn" ? "সাইন আউট" : "Sign out"}
                        </button>
                    </div>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset>
                <header className="workbench-header">
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                        }}
                    >
                        <SidebarTrigger />
                        <span className="header-divider" />

                        {/* Interactive Multi-Workspace Selector Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#dce5e9] bg-[#f0f4f6]/80 hover:bg-[#e4ebef] text-[#162c38] font-bold text-xs transition-colors cursor-pointer shadow-2xs group"
                                    title={
                                        lang === "bn"
                                            ? "ওয়ার্কস্পেস পরিবর্তন করুন"
                                            : "Switch Workspace"
                                    }
                                >
                                    <Building2
                                        size={14}
                                        className="text-[#087f79]"
                                    />
                                    <span className="text-[10px] text-[#5b6f7b] font-medium hidden sm:inline uppercase tracking-wider">
                                        {lang === "bn"
                                            ? "ওয়ার্কস্পেস:"
                                            : "Workspace:"}
                                    </span>
                                    <span className="max-w-[190px] truncate text-left">
                                        {activeWorkspaceDisplayName}
                                    </span>
                                    <ChevronDown
                                        size={13}
                                        className="text-[#5b6f7b] group-hover:text-[#162c38] transition-transform group-data-[state=open]:rotate-180"
                                    />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="start"
                                className="w-64 bg-white border border-[#dce5e9] shadow-lg p-1.5 z-50"
                            >
                                <DropdownMenuLabel className="text-[10px] font-semibold text-[#5b6f7b] uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                                    <span>
                                        {lang === "bn"
                                            ? "আপনার ওয়ার্কস্পেস"
                                            : "Workspaces"}
                                    </span>
                                    <span className="text-[10px] font-mono bg-teal-50 text-[#087f79] px-1.5 py-0.2 rounded border border-teal-200">
                                        {workspaces.length}
                                    </span>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="my-1 bg-[#dce5e9]" />
                                <div className="max-h-56 overflow-y-auto space-y-0.5">
                                    {workspaces.map((w) => (
                                        <DropdownMenuItem
                                            key={w.id}
                                            onClick={() =>
                                                handleSelectWorkspace(w.id)
                                            }
                                            className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs cursor-pointer ${
                                                activeWorkspaceId === w.id
                                                    ? "bg-[#edf7f4] text-[#087f79] font-bold"
                                                    : "text-[#162c38] hover:bg-[#f4f7f8]"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <Building2
                                                    size={13}
                                                    className={
                                                        activeWorkspaceId ===
                                                        w.id
                                                            ? "text-[#087f79]"
                                                            : "text-slate-400"
                                                    }
                                                />
                                                <span className="truncate">
                                                    {w.name}
                                                </span>
                                            </div>
                                            {activeWorkspaceId === w.id && (
                                                <Check
                                                    size={13}
                                                    className="text-[#087f79] shrink-0 ml-2"
                                                />
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </div>
                                <DropdownMenuSeparator className="my-1 bg-[#dce5e9]" />
                                <DropdownMenuItem
                                    onClick={() => setIsCreatingWorkspace(true)}
                                    className="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-[#087f79] hover:bg-[#edf7f4] font-semibold cursor-pointer"
                                >
                                    <Plus size={13} />
                                    <span>
                                        {lang === "bn"
                                            ? "নতুন ওয়ার্কস্পেস তৈরি করুন"
                                            : "+ New Workspace"}
                                    </span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                        }}
                    >
                        <CreditBadgeButton lang={lang} />
                        {user?.status === "pending_review" ? (
                            <Link href={`/${lang}/onboarding`}>
                                <Badge
                                    variant="outline"
                                    className="bg-amber-50 text-amber-800 border-amber-300"
                                >
                                    Intake In Review
                                </Badge>
                            </Link>
                        ) : (
                            <Badge variant="outline">Live workspace</Badge>
                        )}
                        <button
                            type="button"
                            onClick={() => openAssessment("new")}
                            className="text-link"
                        >
                            {lang === "bn"
                                ? "নতুন অ্যাসেসমেন্ট"
                                : "New Assessment"}
                            <ArrowUpRight size={15} />
                        </button>
                    </div>
                </header>

                <main id="main" className="workbench-main">
                    {activeNavItem?.comingSoon ? (
                        <ClientComingSoon lang={lang} item={activeNavItem} />
                    ) : view === "invoices" ? (
                        <ClientInvoices lang={lang} />
                    ) : view === "billing" ? (
                        <ClientWallet lang={lang} />
                    ) : view === "settings" ? (
                        <ClientProfileSettings
                            lang={lang}
                            user={user}
                            activeWorkspaceDisplayName={
                                activeWorkspaceDisplayName
                            }
                            activeWorkspaceId={
                                activeWorkspaceId ||
                                workspaces[0]?.id ||
                                "client_ws"
                            }
                        />
                    ) : view === "new-project" ? (
                        <section
                            className="space-y-5"
                            aria-labelledby="assessment-title"
                        >
                            <div className="section-heading">
                                <div>
                                    <p className="eyebrow">
                                        <span />
                                        {lang === "bn"
                                            ? "আমার ওয়ার্কস্পেস"
                                            : "MY WORKSPACE"}
                                    </p>
                                    <h1 id="assessment-title">
                                        {assessmentMode === "edit"
                                            ? lang === "bn"
                                                ? "অ্যাসেসমেন্ট চালিয়ে যান"
                                                : "Continue assessment"
                                            : lang === "bn"
                                              ? "নতুন প্রজেক্ট অ্যাসেসমেন্ট"
                                              : "New project assessment"}
                                    </h1>
                                    <p>
                                        {lang === "bn"
                                            ? "ধাপগুলো সরাসরি নির্বাচন করে উত্তর সম্পাদনা করুন।"
                                            : "Select any step to review or edit your answers."}
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-dudos-border bg-white p-4 sm:p-6">
                                <AssessmentWizardInline
                                    key={`${assessmentMode || "new"}:${assessmentSeed?.assessmentRecordId || ""}`}
                                    workspace={
                                        activeWorkspaceId ||
                                        workspaces[0]?.id ||
                                        "client_ws"
                                    }
                                    lang={lang}
                                    mode={assessmentMode || "new"}
                                    organizationName={
                                        assessmentOrganizationName
                                    }
                                    assessment={assessmentSeed}
                                    onSubmitted={() => {
                                        // Submitted projects are tracked on the overview.
                                        router.push(`/${lang}/app/overview`);
                                    }}
                                />
                            </div>
                        </section>
                    ) : (
                        <CustomerUserPanel
                            workspace={activeWorkspaceId || "client_ws"}
                            workspaceName={activeWorkspaceDisplayName}
                            workspaces={workspaces}
                            activeWorkspaceId={activeWorkspaceId}
                            onSelectWorkspace={handleSelectWorkspace}
                            onCreateWorkspace={() =>
                                setIsCreatingWorkspace(true)
                            }
                            onOpenAssessment={openAssessment}
                            refreshKey={assessmentRefreshKey}
                            lang={lang}
                            activeSection={
                                view === "billing"
                                    ? "billing"
                                    : view === "overview"
                                      ? "workflow"
                                      : view === "projects"
                                        ? "projects"
                                        : view === "deployments"
                                          ? "deployments"
                                          : view === "support"
                                            ? "support"
                                            : "overview"
                            }
                        />
                    )}
                </main>
            </SidebarInset>

            <Dialog
                open={assessmentMode !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setAssessmentMode(null);
                        setAssessmentSeed(undefined);
                        setAssessmentOrganizationName(undefined);
                    }
                }}
            >
                <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-[calc(100%-2rem)] overflow-y-auto bg-white sm:max-w-6xl">
                    <DialogHeader>
                        <DialogTitle className="text-dudos-text">
                            {assessmentMode === "edit"
                                ? lang === "bn"
                                    ? "অ্যাসেসমেন্ট সম্পাদনা করুন"
                                    : "Edit assessment"
                                : lang === "bn"
                                  ? "নতুন প্রজেক্ট অ্যাসেসমেন্ট"
                                  : "New project assessment"}
                        </DialogTitle>
                        <DialogDescription className="text-dudos-text-secondary">
                            {lang === "bn"
                                ? "যেকোনো ধাপ নির্বাচন করে উত্তর দেখুন বা সম্পাদনা করুন।"
                                : "Select any step to review or edit your answers."}
                        </DialogDescription>
                    </DialogHeader>
                    {assessmentMode && (
                        <AssessmentWizardInline
                            key={`${assessmentMode}:${assessmentSeed?.assessmentRecordId || assessmentSeed?.sourceProjectId || "new"}`}
                            workspace={
                                activeWorkspaceId ||
                                workspaces[0]?.id ||
                                "client_ws"
                            }
                            lang={lang}
                            mode={assessmentMode}
                            organizationName={assessmentOrganizationName}
                            assessment={assessmentSeed}
                            onSubmitted={() => {
                                setAssessmentMode(null);
                                setAssessmentSeed(undefined);
                                setAssessmentOrganizationName(undefined);
                                setAssessmentRefreshKey((key) => key + 1);
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Workspace Modal */}
            <Dialog
                open={isCreatingWorkspace}
                onOpenChange={setIsCreatingWorkspace}
            >
                <DialogContent className="sm:max-w-md bg-white border border-[#dce5e9]">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-dudos-text">
                            {lang === "bn"
                                ? "নতুন ওয়ার্কস্পেস তৈরি করুন"
                                : "Create New Workspace"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-dudos-text-secondary">
                            {lang === "bn"
                                ? "আপনার বিভিন্ন প্রতিষ্ঠান বা প্রজেক্টের জন্য পৃথক ওয়ার্কস্পেস পরিচালনা করুন।"
                                : "Create an isolated workspace to organize projects, AI Q&A specifications, and deployments."}
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={handleCreateWorkspace}
                        className="space-y-4 pt-2"
                    >
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-dudos-text">
                                {lang === "bn"
                                    ? "ওয়ার্কস্পেসের নাম"
                                    : "Workspace Name"}
                            </Label>
                            <Input
                                value={newWorkspaceName}
                                onChange={(e) =>
                                    setNewWorkspaceName(e.target.value)
                                }
                                placeholder={
                                    lang === "bn"
                                        ? "যেমন: Daffodil Labs"
                                        : "e.g. Daffodil Enterprise Platform"
                                }
                                maxLength={100}
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCreatingWorkspace(false)}
                            >
                                {lang === "bn" ? "বাতিল" : "Cancel"}
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                className="bg-dudos-primary hover:bg-dudos-primary-hover text-white"
                                disabled={
                                    workspaceBusy ||
                                    newWorkspaceName.trim().length < 2
                                }
                            >
                                {workspaceBusy
                                    ? "…"
                                    : lang === "bn"
                                      ? "তৈরি করুন"
                                      : "Create Workspace"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
}
