"use client";

import React, { useState } from "react";
import Link from "@/components/dudos-link";
import {
    Users,
    FolderKanban,
    Server,
    Globe,
    Coins,
    LogOut,
    ArrowUpRight,
    LifeBuoy,
    UserRound,
    FileText,
    CreditCard,
    Megaphone,
    Package,
    Activity,
    type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { AdminControlPanel } from "./AdminControlPanel";
import { AdminUserManagement } from "./AdminUserManagement";
import { AdminProjectTracking } from "./AdminProjectTracking";
import { AdminSupportTickets } from "./AdminSupportTickets";
import { AdminPackages } from "./AdminPackages";
import { getAuthToken } from "@/lib/dudos/assessment-sync";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

type AdminNavigationItem = {
    id: string;
    title: string;
    bn: string;
    icon: LucideIcon;
    badge?: string;
    comingSoon?: boolean;
    externalUrl?: string;
};

function AdminComingSoon({
    lang,
    item,
}: {
    lang: string;
    item: AdminNavigationItem;
}) {
    const Icon = item.icon;

    return (
        <section className="rounded-2xl border border-dudos-border bg-white p-8 sm:p-10">
            <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf7f4] text-dudos-primary">
                    <Icon size={22} />
                </div>
                <p className="eyebrow mt-5 justify-center">
                    <span />
                    {lang === "bn" ? "রোডম্যাপ মডিউল" : "PLATFORM ROADMAP"}
                </p>
                <h1 className="mt-2 text-2xl font-bold text-dudos-text">
                    {lang === "bn" ? item.bn : item.title}
                </h1>
                <p className="mt-2 text-sm text-dudos-text-secondary">
                    {lang === "bn"
                        ? "এই মডিউলটি ডুডোস প্ল্যাটফর্মের পরিকল্পনায় রয়েছে। ধাপে ধাপে এখানে ফিচার যোগ করা হবে।"
                        : "This module is part of the DUDOS platform plan. Its workflows will be added incrementally."}
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

export default function AdminWorkbench({
    lang = "en",
    section = [],
}: {
    lang: string;
    section: string[];
}) {
    const {
        user,
        registrations,
        logout,
        refreshUsers,
        updateRegistrationStatus,
        allocateCreditsToUser,
    } = useAuth();
    const [navSearch, setNavSearch] = useState("");
    const [supportCount, setSupportCount] = useState<number>(0);
    const [deploymentCount, setDeploymentCount] = useState<number>(0);

    // Map route section to active view
    // Project Tracking is the admin home; the retired intake queue ("clients")
    // redirects there too.
    const requestedView =
        section[0] === "tenant-admin" || section[0] === "platform-admin"
            ? section[1] || "projects"
            : section[0] || "projects";
    const view = requestedView === "clients" ? "projects" : requestedView;

    React.useEffect(() => {
        const token = getAuthToken();
        fetch(`${API_BASE}/admin/support/tickets`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    const openCount = data.filter(
                        (t) =>
                            t.status === "open" || t.status === "in_progress",
                    ).length;
                    setSupportCount(openCount);
                }
            })
            .catch(() => {});

        fetch(`${API_BASE}/admin/deployments`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.tickets && Array.isArray(data.tickets)) {
                    const pending = data.tickets.filter(
                        (t: any) => t.status !== "live",
                    ).length;
                    setDeploymentCount(pending);
                }
            })
            .catch(() => {});
    }, []);

    const handleSignOut = () => {
        logout();
        try {
            localStorage.removeItem("dudos_auth_session");
            localStorage.removeItem("dudos_jwt_token");
            sessionStorage.clear();
            const epoch = "Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
            // Host-only cookie on current subdomain (e.g. admin.localhost)
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

    // Functional admin operations; roadmap modules are commented out until enabled.
    const adminNavSections: {
        group: string;
        items: AdminNavigationItem[];
    }[] = [
        {
            group: "PROJECTS & WEB DEVELOPMENT",
            items: [
                {
                    id: "projects",
                    title: "Project Tracking",
                    bn: "প্রজেক্ট ট্র্যাকিং",
                    icon: FolderKanban,
                },
                /* Temporarily commented out roadmap modules — enable later when functional
                {
                    id: "builder",
                    title: "AI Website Builder",
                    bn: "এআই ওয়েবসাইট বিল্ডার",
                    icon: Globe,
                    comingSoon: true,
                },
                {
                    id: "requirements",
                    title: "Requirements & AI SRS",
                    bn: "রিকোয়ারমেন্ট ও এআই এসআরএস",
                    icon: FileText,
                    comingSoon: true,
                },
                {
                    id: "templates",
                    title: "Templates & References",
                    bn: "টেমপ্লেট ও রেফারেন্স",
                    icon: FileText,
                    comingSoon: true,
                },
                {
                    id: "requests",
                    title: "Custom Project Requests",
                    bn: "কাস্টম প্রজেক্ট রিকোয়েস্ট",
                    icon: Users,
                    comingSoon: true,
                },
                {
                    id: "scoping",
                    title: "Project Scoping & Quotations",
                    bn: "প্রজেক্ট স্কোপিং ও কোটেশন",
                    icon: FolderKanban,
                    comingSoon: true,
                },
                {
                    id: "assets",
                    title: "Preview & Source Delivery",
                    bn: "প্রিভিউ ও সোর্স ডেলিভারি",
                    icon: FileText,
                    comingSoon: true,
                },
                */
            ],
        },
        {
            group: "DELIVERY & SUPPORT",
            items: [
                {
                    id: "deployments",
                    title: "VPS Fleet & Deployments",
                    bn: "সার্ভার ও ডিপ্লয়মেন্ট",
                    icon: Server,
                    badge:
                        deploymentCount > 0
                            ? String(deploymentCount)
                            : undefined,
                },
                {
                    id: "support",
                    title: "Customer Support Tickets",
                    bn: "সাপোর্ট টিকিট কিউ",
                    icon: LifeBuoy,
                    badge: supportCount > 0 ? String(supportCount) : undefined,
                },
                {
                    id: "monitoring",
                    title: "Infrastructure Monitor",
                    bn: "ইনফ্রাস্ট্রাকচার মনিটর",
                    icon: Activity,
                    externalUrl: "https://monitor.daffodil.group/login",
                },
            ],
        },
        {
            group: "BILLING & ERP",
            items: [
                {
                    id: "packages",
                    title: "Packages & Pricing",
                    bn: "প্যাকেজ ও মূল্য",
                    icon: Package,
                },
                {
                    id: "ledger",
                    title: "Credits & Billing Ledger",
                    bn: "বিলিং ও ক্রেডিট লেজার",
                    icon: Coins,
                },
                /* Temporarily commented out roadmap modules — enable later when functional
                {
                    id: "invoices",
                    title: "Invoices & Payments",
                    bn: "ইনভয়েস ও পেমেন্ট",
                    icon: FileText,
                    comingSoon: true,
                },
                {
                    id: "finance",
                    title: "Finance & Accounting",
                    bn: "ফাইন্যান্স ও অ্যাকাউন্টিং",
                    icon: CreditCard,
                    comingSoon: true,
                },
                */
            ],
        },
        /* Temporarily commented out roadmap section — enable later when functional
        {
            group: "MARKETING AUTOMATION",
            items: [
                {
                    id: "content-studio",
                    title: "Digital Content Studio",
                    bn: "ডিজিটাল কনটেন্ট স্টুডিও",
                    icon: FileText,
                    comingSoon: true,
                },
                {
                    id: "marketing",
                    title: "Social Ad Campaigns",
                    bn: "সোশ্যাল বিজ্ঞাপন ক্যাম্পেইন",
                    icon: Megaphone,
                    comingSoon: true,
                },
            ],
        },
        */
        {
            group: "ACCOUNT MANAGEMENT",
            items: [
                {
                    id: "users",
                    title: "User Management",
                    bn: "ব্যবহারকারী ব্যবস্থাপনা",
                    icon: UserRound,
                    badge:
                        registrations.length > 0
                            ? String(registrations.length)
                            : undefined,
                },
            ],
        },
    ];

    const activeNavItem = adminNavSections
        .flatMap((section) => section.items)
        .find((item) => item.id === view);

    return (
        <SidebarProvider>
            <Sidebar className="dudos-sidebar">
                <SidebarHeader>
                    <Link className="brand app-brand" href={`/${lang}`}>
                        <span className="brand-symbol">D</span>DUDOS
                        <span className="brand-dot">.</span>
                    </Link>
                    <span className="sidebar-caption">ADMIN WORKBENCH</span>
                    <Input
                        className="sidebar-search"
                        aria-label="Find admin workflow"
                        placeholder={
                            lang === "bn"
                                ? "অ্যাডমিন মেনু খুঁজুন…"
                                : "Find admin workflow…"
                        }
                        value={navSearch}
                        onChange={(e) => setNavSearch(e.target.value)}
                    />
                </SidebarHeader>

                <SidebarContent>
                    {adminNavSections.map((sec) => {
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
                                        return (
                                            <SidebarMenuItem key={item.id}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={isActive}
                                                >
                                                    {item.externalUrl ? (
                                                        <a
                                                            href={item.externalUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 w-full"
                                                        >
                                                            <Icon size={16} />
                                                            <span>
                                                                {lang === "bn"
                                                                    ? item.bn
                                                                    : item.title}
                                                            </span>
                                                            <ArrowUpRight
                                                                size={13}
                                                                style={{
                                                                    marginLeft: "auto",
                                                                    opacity: 0.7,
                                                                }}
                                                            />
                                                        </a>
                                                    ) : (
                                                        <Link
                                                            href={`/${lang}/app/${item.id}`}
                                                        >
                                                            <Icon size={16} />
                                                            <span>
                                                                {lang === "bn"
                                                                    ? item.bn
                                                                    : item.title}
                                                            </span>
                                                            {item.badge && (
                                                                <span
                                                                    style={{
                                                                        marginLeft:
                                                                            "auto",
                                                                        fontSize:
                                                                            "10px",
                                                                        background:
                                                                            "#eaf5f1",
                                                                        color: "#087f79",
                                                                        padding:
                                                                            "2px 6px",
                                                                        borderRadius:
                                                                            "4px",
                                                                        fontWeight:
                                                                            "bold",
                                                                    }}
                                                                >
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
                                                        </Link>
                                                    )}
                                                </SidebarMenuButton>
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
                        {user?.displayName || user?.username || "Administrator"}
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
                    <div>
                        <SidebarTrigger />
                        <span className="header-divider" />
                        <span>
                            {lang === "bn"
                                ? "প্ল্যাটফর্ম গভর্ন্যান্স কনসোল"
                                : "Platform Governance Console"}
                        </span>
                        <Badge
                            variant="outline"
                            className="bg-teal-50 text-teal-800 border-teal-200"
                        >
                            Tech Admin Mode
                        </Badge>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                        }}
                    >
                        <Badge variant="outline" className="font-mono text-xs">
                            VPS: 103.145.118.42
                        </Badge>
                        <a
                            href={`${new URL(API_BASE).origin}/db`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-link"
                        >
                            <span>PostgreSQL Viewer</span>
                            <ArrowUpRight size={14} />
                        </a>
                    </div>
                </header>

                <main id="main" className="workbench-main">
                    {view === "projects" ? (
                        <AdminProjectTracking />
                    ) : view === "packages" ? (
                        <AdminPackages />
                    ) : view === "support" ? (
                        <AdminSupportTickets
                            clients={registrations.filter(
                                (r) => r.role !== "admin",
                            )}
                        />
                    ) : view === "users" ? (
                        <AdminUserManagement
                            lang={lang}
                            users={registrations}
                            onRefresh={refreshUsers}
                            onStatusChange={updateRegistrationStatus}
                            onAllocateCredits={allocateCreditsToUser}
                        />
                    ) : activeNavItem?.comingSoon ? (
                        <AdminComingSoon lang={lang} item={activeNavItem} />
                    ) : (
                        <AdminControlPanel
                            lang={lang}
                            initialTab={
                                view === "scoping"
                                    ? "quotes"
                                    : view === "deployments" ||
                                        view === "servers"
                                      ? "deployments"
                                      : view === "ledger"
                                        ? "ledger"
                                        : view === "support"
                                          ? "support"
                                          : "queue"
                            }
                        />
                    )}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
