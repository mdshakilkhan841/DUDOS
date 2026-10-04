"use client";

import { useMemo, useState } from "react";
import {
    Coins,
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2,
    UserRound,
    Users,
    Clock3,
} from "lucide-react";
import { UserProfile, UserStatus } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { showToast } from "@/lib/toast";
import { authHeaders } from "@/lib/dudos/packages";

const STATUSES: UserStatus[] = [
    "pending_review",
    "in_scoping",
    "verified",
    "approved",
    "active",
    "on_hold",
];

const statusLabel = (status: UserStatus) =>
    status
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusClass = (status: UserStatus) => {
    if (status === "active" || status === "approved")
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "on_hold") return "bg-rose-50 text-rose-700 border-rose-200";
    if (status === "verified")
        return "bg-teal-50 text-teal-700 border-teal-200";
    if (status === "in_scoping")
        return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
};

export function AdminUserManagement({
    lang = "en",
    users,
    onRefresh,
    onStatusChange,
    onAllocateCredits,
}: {
    lang?: string;
    users: UserProfile[];
    onRefresh: () => Promise<void>;
    onStatusChange: (userId: string, status: UserStatus) => void;
    onAllocateCredits: (userId: string, amount: number, reason: string) => void;
}) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [creditUser, setCreditUser] = useState<UserProfile | null>(null);
    const [creditAmount, setCreditAmount] = useState(1000);
    const [creditReason, setCreditReason] = useState("Manual admin allocation");
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();
        return users.filter((user) => {
            const matchesSearch =
                !query ||
                [
                    user.displayName,
                    user.email,
                    user.username,
                    user.organizationName,
                ].some((value) => value?.toLowerCase().includes(query));
            const matchesStatus =
                statusFilter === "all" || user.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [users, search, statusFilter]);

    const activeCount = users.filter(
        (user) => user.status === "active" || user.status === "approved",
    ).length;
    const pendingCount = users.filter(
        (user) => user.status === "pending_review",
    ).length;

    const refresh = async () => {
        setIsRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setIsRefreshing(false);
        }
    };

    const [isPurging, setIsPurging] = useState(false);

    // Removes accounts created by the automated test suites.
    const purgeTestData = async () => {
        const confirmed = window.confirm(
            lang === "bn"
                ? "আপনি কি সব টেস্ট ডেটা মুছে ফেলতে চান?"
                : "Purge all automated test accounts and their records from the database?",
        );
        if (!confirmed) return;
        setIsPurging(true);
        try {
            const apiBase =
                process.env.NEXT_PUBLIC_API_BASE_URL ||
                "http://localhost:8000/api/v1";
            const response = await fetch(`${apiBase}/admin/test-data`, {
                headers: authHeaders(),
                method: "DELETE",
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error("Purge failed");
            showToast.success(
                lang === "bn"
                    ? `${data.deletedCount} টেস্ট একাউন্ট মুছে ফেলা হয়েছে`
                    : `Purged ${data.deletedCount} test accounts.`,
            );
            await onRefresh();
        } catch {
            showToast.error(
                lang === "bn"
                    ? "টেস্ট ডেটা মুছতে ব্যর্থ"
                    : "Failed to purge test data.",
            );
        } finally {
            setIsPurging(false);
        }
    };

    const deleteUser = async (user: UserProfile) => {
        const confirmed = window.confirm(
            lang === "bn"
                ? `আপনি কি ${user.displayName} অ্যাকাউন্টটি স্থায়ীভাবে মুছতে চান?`
                : `Permanently delete the account for ${user.displayName} (${user.email})?`,
        );
        if (!confirmed) return;

        setDeletingUserId(user.id);
        try {
            const apiBase =
                process.env.NEXT_PUBLIC_API_BASE_URL ||
                "http://localhost:8000/api/v1";
            const response = await fetch(`${apiBase}/admin/users/${user.id}`, {
                headers: authHeaders(),
                method: "DELETE",
            });
            if (!response.ok) throw new Error("Delete request failed");
            showToast.success(
                lang === "bn"
                    ? "ব্যবহারকারী মুছে ফেলা হয়েছে"
                    : "User deleted successfully.",
            );
            await onRefresh();
        } catch {
            showToast.error(
                lang === "bn"
                    ? "ব্যবহারকারী মুছতে ব্যর্থ"
                    : "Failed to delete user.",
            );
        } finally {
            setDeletingUserId(null);
        }
    };

    const applyCredits = () => {
        if (!creditUser || creditAmount === 0 || !creditReason.trim()) return;
        onAllocateCredits(creditUser.id, creditAmount, creditReason.trim());
        setCreditUser(null);
    };

    const userColumns: DataTableColumn<UserProfile>[] = [
        {
            id: "user",
            header: "User",
            exportValue: (account) => account.displayName,
            cell: (account) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf7f4] text-dudos-primary">
                        <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-48">
                        <strong className="block text-sm font-semibold text-dudos-text">
                            {account.displayName}
                        </strong>
                        <span className="block text-xs text-dudos-text-secondary">{account.email}</span>
                        {account.organizationName && (
                            <span className="block text-[11px] text-[#8fa0ac]">{account.organizationName}</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: "email",
            header: "Email",
            exportOnly: true,
            exportValue: (account) => account.email,
            cell: () => null,
        },
        {
            id: "role",
            header: "Role",
            exportValue: (account) => account.role,
            cell: (account) => (
                <Badge variant="outline" className="capitalize">
                    {account.role}
                </Badge>
            ),
        },
        {
            id: "status",
            header: "Status",
            exportValue: (account) => statusLabel(account.status),
            cell: (account) => (
                <select
                    aria-label={`Status for ${account.displayName}`}
                    value={account.status}
                    onChange={(event) => onStatusChange(account.id, event.target.value as UserStatus)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(account.status)}`}
                >
                    {STATUSES.map((status) => (
                        <option key={status} value={status}>
                            {statusLabel(status)}
                        </option>
                    ))}
                </select>
            ),
        },
        {
            id: "credits",
            header: "Credits",
            className: "font-medium text-dudos-text tabular-nums",
            exportValue: (account) => account.credits || 0,
            cell: (account) => (account.credits || 0).toLocaleString(),
        },
        {
            id: "joined",
            header: "Joined",
            className: "whitespace-nowrap text-xs text-dudos-text-secondary",
            exportValue: (account) => account.createdAt || "",
            cell: (account) =>
                account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "—",
        },
        {
            id: "actions",
            header: "Actions",
            headerClassName: "text-right",
            cell: (account) => (
                <div className="flex justify-end gap-1">
                    <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Adjust credits for ${account.displayName}`}
                        title="Adjust credits"
                        onClick={() => {
                            setCreditUser(account);
                            setCreditAmount(1000);
                        }}
                        className="h-8 w-8 p-0"
                    >
                        <Coins className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Delete ${account.displayName}`}
                        title="Delete user"
                        disabled={deletingUserId === account.id}
                        onClick={() => deleteUser(account)}
                        className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <section
            className="space-y-6"
            aria-labelledby="user-management-heading"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="eyebrow">
                        <span />
                        {lang === "bn"
                            ? "অ্যাকাউন্ট অ্যাডমিন"
                            : "ACCOUNT ADMINISTRATION"}
                    </p>
                    <h1
                        id="user-management-heading"
                        className="mt-2 text-2xl font-bold text-dudos-text"
                    >
                        {lang === "bn"
                            ? "ব্যবহারকারী ব্যবস্থাপনা"
                            : "User Management"}
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm text-dudos-text-secondary">
                        {lang === "bn"
                            ? "ব্যবহারকারীর অ্যাকাউন্ট, ভূমিকা, অবস্থা এবং ক্রেডিট এক জায়গায় পরিচালনা করুন।"
                            : "Manage user accounts, roles, status, and credits in one place. Client projects are in Project Tracking."}
                    </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={purgeTestData}
                        disabled={isPurging}
                        className="bg-white text-dudos-text-secondary hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {lang === "bn" ? "টেস্ট ডেটা মুছুন" : "Purge test data"}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={refresh}
                        disabled={isRefreshing}
                        className="bg-white"
                    >
                        <RefreshCw
                            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                        {lang === "bn" ? "রিফ্রেশ" : "Refresh users"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-dudos-border bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-dudos-text-secondary">
                        <Users className="h-4 w-4 text-dudos-primary" />
                        Total users
                    </div>
                    <strong className="mt-2 block text-2xl text-dudos-text">
                        {users.length}
                    </strong>
                </div>
                <div className="rounded-xl border border-dudos-border bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-dudos-text-secondary">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        Active accounts
                    </div>
                    <strong className="mt-2 block text-2xl text-dudos-text">
                        {activeCount}
                    </strong>
                </div>
                <div className="rounded-xl border border-dudos-border bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-dudos-text-secondary">
                        <Clock3 className="h-4 w-4 text-amber-600" />
                        Pending review
                    </div>
                    <strong className="mt-2 block text-2xl text-dudos-text">
                        {pendingCount}
                    </strong>
                </div>
            </div>

            <div>
                <div className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center">
                    <div className="relative min-w-0 flex-1 lg:max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa0ac]" />
                        <Input
                            aria-label="Search users"
                            placeholder="Search name, email, username, or organization…"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 lg:ml-auto">
                        <select
                            aria-label="Filter users by status"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                            className="h-10 rounded-md border border-dudos-border bg-white px-3 text-sm text-dudos-text"
                        >
                            <option value="all">
                                All statuses ({users.length})
                            </option>
                            <option value="pending_review">
                                Pending ({pendingCount})
                            </option>
                            {STATUSES.filter(
                                (status) => status !== "pending_review",
                            ).map((status) => (
                                <option key={status} value={status}>
                                    {statusLabel(status)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <DataTable
                    label="users"
                    rows={filteredUsers}
                    columns={userColumns}
                    getRowId={(account) => account.id}
                    resetKey={`${statusFilter}|${search.trim().toLowerCase()}`}
                    exportFileName="dudos-users"
                    empty={
                        users.length === 0
                            ? "No user accounts found."
                            : "No users match these filters."
                    }
                    bulkActions={(selectedUsers, clearSelection) => (
                        <select
                            aria-label="Set status for selected users"
                            value=""
                            onChange={(event) => {
                                const status = event.target.value as UserStatus;
                                if (!status) return;
                                selectedUsers
                                    .filter((account) => account.status !== status)
                                    .forEach((account) => onStatusChange(account.id, status));
                                showToast.success(
                                    `${selectedUsers.length} user${selectedUsers.length === 1 ? "" : "s"} set to ${statusLabel(status)}`,
                                );
                                clearSelection();
                            }}
                            className="h-7 rounded-md border border-dudos-border bg-white px-2 text-xs text-dudos-text"
                        >
                            <option value="">Set status…</option>
                            {STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {statusLabel(status)}
                                </option>
                            ))}
                        </select>
                    )}
                />
            </div>

            {creditUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="credit-dialog-title"
                >
                    <div className="w-full max-w-md space-y-4 rounded-2xl border border-dudos-border bg-white p-6 shadow-2xl">
                        <div>
                            <h2
                                id="credit-dialog-title"
                                className="font-bold text-dudos-text"
                            >
                                Adjust user credits
                            </h2>
                            <p className="mt-1 text-xs text-dudos-text-secondary">
                                {creditUser.displayName} · Current balance:{" "}
                                {(creditUser.credits || 0).toLocaleString()}
                            </p>
                        </div>
                        <label className="block space-y-1 text-xs font-medium text-dudos-text">
                            Amount (negative values deduct credits)
                            <Input
                                type="number"
                                value={creditAmount}
                                onChange={(event) =>
                                    setCreditAmount(Number(event.target.value))
                                }
                            />
                        </label>
                        <label className="block space-y-1 text-xs font-medium text-dudos-text">
                            Reason
                            <Input
                                value={creditReason}
                                onChange={(event) =>
                                    setCreditReason(event.target.value)
                                }
                            />
                        </label>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setCreditUser(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={applyCredits}
                                disabled={
                                    creditAmount === 0 || !creditReason.trim()
                                }
                            >
                                Apply credits
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
