"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Users,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  Layers,
  Search,
  Filter,
  Plus,
  ExternalLink,
  Calculator,
  Sliders,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  UserCheck,
  Building,
  CreditCard,
  History,
  Server,
  Globe,
  Activity,
  Check,
  LifeBuoy,
  Trash2,
} from "lucide-react";
import { useAuth, CreditTransaction } from "@/context/auth-context";
import { UserProfile, UserStatus, ProjectIntakeData } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { AdminEstimationModal } from "@/components/projects/AdminEstimationModal";
import { AdminSupportTickets } from "./AdminSupportTickets";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { showToast } from "@/lib/toast";
import { getAuthToken } from "@/lib/dudos/assessment-sync";
import { authHeaders } from "@/lib/dudos/packages";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export function AdminControlPanel({
  lang = "en",
  initialTab = "queue",
}: {
  lang?: string;
  initialTab?: "queue" | "quotes" | "deployments" | "ledger" | "support";
}) {
  const {
    user,
    registrations,
    refreshUsers,
    updateRegistrationStatus,
    allocateCreditsToUser,
    creditTransactions,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<"queue" | "quotes" | "deployments" | "ledger" | "support">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Deployment Tickets State
  const [deploymentTickets, setDeploymentTickets] = useState<any[]>([]);
  const [editingIpTicketId, setEditingIpTicketId] = useState<string | null>(null);
  const [customIpInput, setCustomIpInput] = useState<string>("");
  const [deploymentSearch, setDeploymentSearch] = useState<string>("");

  // Support Tickets State
  const [supportTickets, setSupportTickets] = useState<any[]>([]);

  // Selected client for modal views
  const [inspectingUser, setInspectingUser] = useState<UserProfile | null>(null);
  const [estimatingUser, setEstimatingUser] = useState<UserProfile | null>(null);
  const [creditModalUser, setCreditModalUser] = useState<UserProfile | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(1000);
  const [creditReason, setCreditReason] = useState<string>("Manual tech admin allocation");

  const loadDeploymentTickets = () => {
    fetch(`${API_BASE}/admin/deployments`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.tickets && Array.isArray(data.tickets)) {
          setDeploymentTickets(data.tickets);
          localStorage.setItem("dudos_deployment_tickets", JSON.stringify(data.tickets));
        }
      })
      .catch(() => {
        try {
          const ticketsStr = localStorage.getItem("dudos_deployment_tickets");
          if (ticketsStr) {
            setDeploymentTickets(JSON.parse(ticketsStr));
          }
        } catch {}
      });
  };

  const loadSupportTickets = () => {
    const token =
      getAuthToken() ||
      (typeof window !== "undefined"
        ? localStorage.getItem("dudos_jwt_token") ||
          localStorage.getItem("dudos_auth_token")
        : null);
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

    fetch(`${apiBase}/admin/support/tickets`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setSupportTickets(data);
          try {
            localStorage.setItem("dudos_support_tickets_admin", JSON.stringify(data));
          } catch {}
        }
      })
      .catch(() => {
        try {
          const stored = localStorage.getItem("dudos_support_tickets_admin");
          if (stored) setSupportTickets(JSON.parse(stored));
        } catch {}
      });
  };

  useEffect(() => {
    refreshUsers();
    loadDeploymentTickets();
    loadSupportTickets();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      if (initialTab === "deployments") loadDeploymentTickets();
      if (initialTab === "support") loadSupportTickets();
    }
  }, [initialTab]);

  // Metrics
  const pendingCount = registrations.filter((r) => r.status === "pending_review").length;
  const inScopingCount = registrations.filter((r) => r.status === "in_scoping").length;
  const activeCount = registrations.filter((r) => r.status === "approved" || r.status === "active").length;
  const totalPipelineValue = registrations.reduce(
    (sum, r) => sum + (r.intake?.estimationQuote?.totalQuote || 0),
    0
  );

  // Filtered registrations
  const filteredRegistrations = registrations.filter((r) => {
    const matchesSearch =
      r.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.organizationName && r.organizationName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.intake?.businessDomain && r.intake.businessDomain.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && r.status === "pending_review") ||
      (statusFilter === "scoping" && r.status === "in_scoping") ||
      (statusFilter === "active" && (r.status === "approved" || r.status === "active"));

    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (userId: string, newStatus: UserStatus) => {
    updateRegistrationStatus(userId, newStatus);
  };

  const handleApplyCredits = () => {
    if (!creditModalUser) return;
    allocateCreditsToUser(creditModalUser.id, creditAmount, creditReason);
    setCreditModalUser(null);
  };

  useEffect(() => {
    loadDeploymentTickets();
    loadSupportTickets();
  }, []);

  const handleVerifyDns = (ticketId: string) => {
    try {
      const updated = deploymentTickets.map((t) =>
        t.id === ticketId ? { ...t, dnsStatus: "verified", dnsVerifiedAt: new Date().toISOString() } : t
      );
      setDeploymentTickets(updated);
      localStorage.setItem("dudos_deployment_tickets", JSON.stringify(updated));

      fetch(`${API_BASE}/admin/deployments/${ticketId}`, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ dnsStatus: "verified" }),
      }).catch(console.error);

      showToast.success("DNS Records Verified & Validated!", {
        description: "Target CNAME / A records confirmed pointing to Daffodil Cloud Linux VPS.",
      });
    } catch {}
  };

  const handleAssignIp = (ticketId: string, ip: string) => {
    if (!ip.trim()) return;
    try {
      const updated = deploymentTickets.map((t) =>
        t.id === ticketId ? { ...t, assignedIp: ip.trim() } : t
      );
      setDeploymentTickets(updated);
      localStorage.setItem("dudos_deployment_tickets", JSON.stringify(updated));
      setEditingIpTicketId(null);

      fetch(`${API_BASE}/admin/deployments/${ticketId}`, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ assignedIp: ip.trim() }),
      }).catch(console.error);

      showToast.success(`Target VPS IP updated to ${ip.trim()}`);
    } catch {}
  };

  const handleMarkLive = (ticket: any) => {
    try {
      const now = new Date().toISOString();
      const vpsIp = ticket.assignedIp || "103.145.118.42";
      const liveUrl = ticket.domainName.startsWith("http")
        ? ticket.domainName
        : `https://${ticket.domainName}`;

      const updated = deploymentTickets.map((t) =>
        t.id === ticket.id
          ? {
              ...t,
              status: "live",
              dnsStatus: "verified",
              assignedIp: vpsIp,
              liveUrl,
              deployedAt: now,
            }
          : t
      );
      setDeploymentTickets(updated);
      localStorage.setItem("dudos_deployment_tickets", JSON.stringify(updated));

      fetch(`${API_BASE}/admin/deployments/${ticket.id}`, {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({
          status: "live",
          dnsStatus: "verified",
          assignedIp: vpsIp,
          liveUrl,
        }),
      }).catch(console.error);

      // Synchronize with dudos_active_draft
      const activeDraftStr = localStorage.getItem("dudos_active_draft");
      if (activeDraftStr) {
        const activeDraft = JSON.parse(activeDraftStr);
        if (!ticket.projectId || activeDraft.id === ticket.projectId || activeDraft.email === ticket.clientEmail) {
          activeDraft.status = "completed";
          activeDraft.domainName = ticket.domainName;
          activeDraft.liveUrl = liveUrl;
          activeDraft.vpsIp = vpsIp;
          activeDraft.deployedAt = now;
          activeDraft.updatedAt = now;
          localStorage.setItem("dudos_active_draft", JSON.stringify(activeDraft));
        }
      }

      // Synchronize with dudos_custom_projects
      const customProjectsStr = localStorage.getItem("dudos_custom_projects");
      if (customProjectsStr) {
        const customProjects = JSON.parse(customProjectsStr);
        const nextProjects = customProjects.map((p: any) =>
          p.id === ticket.projectId || p.clientEmail === ticket.clientEmail
            ? {
                ...p,
                status: "completed",
                domainName: ticket.domainName,
                liveUrl,
                vpsIp,
                deployedAt: now,
                updatedAt: now,
              }
            : p
        );
        localStorage.setItem("dudos_custom_projects", JSON.stringify(nextProjects));
      }

      showToast.success("Project Successfully Deployed & Live! 🚀", {
        description: `${ticket.domainName} is now live with 256-bit SSL on Daffodil Cloud Linux VPS (${vpsIp}).`,
      });
    } catch {}
  };


  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active Workspace</Badge>;
      case "approved":
        return <Badge className="bg-teal-100 text-teal-800 border-teal-200">Scope Approved</Badge>;
      case "in_scoping":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Scoping</Badge>;
      case "pending_review":
      default:
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending Review</Badge>;
    }
  };

  const ledgerColumns: DataTableColumn<CreditTransaction>[] = [
    {
      id: "id",
      header: "Transaction ID",
      className: "font-mono text-[11px] text-[#5b6f7b]",
      exportValue: (tx) => tx.id,
      cell: (tx) => tx.id,
    },
    {
      id: "type",
      header: "Type",
      exportValue: (tx) => tx.type,
      cell: (tx) =>
        tx.type === "credit" ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            CREDIT
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            DEBIT
          </span>
        ),
    },
    {
      id: "amount",
      header: "Credits",
      className: "font-bold text-[#162c38] tabular-nums",
      exportValue: (tx) => (tx.type === "credit" ? tx.amount : -tx.amount),
      cell: (tx) => (tx.type === "credit" ? `+${tx.amount.toLocaleString()}` : `-${tx.amount.toLocaleString()}`),
    },
    {
      id: "reason",
      header: "Reason / Notes",
      className: "text-[#5b6f7b]",
      exportValue: (tx) => tx.reason,
      cell: (tx) => tx.reason,
    },
    {
      id: "timestamp",
      header: "Timestamp",
      headerClassName: "text-right",
      className: "text-right text-[#5b6f7b] text-[11px]",
      exportValue: (tx) => tx.timestamp,
      cell: (tx) => new Date(tx.timestamp).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page title for the section chosen in the sidebar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#dce5e9] gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          {activeTab === "queue" && (
            <>
              <div className="p-2 rounded-lg bg-[#edf7f4] text-[#087f79]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#162c38]">
                  {lang === "bn" ? "ক্লায়েন্ট ইনটেক ও নিবন্ধন কিউ" : "Client Intakes & Registrations Queue"}
                </h1>
                <p className="text-xs text-[#5b6f7b]">
                  {lang === "bn"
                    ? "নতুন ক্লায়েন্ট অনবোর্ডিং খসড়া পর্যালোচনা করুন এবং অনুমোদন দিন।"
                    : "Review client onboarding submissions, verify organizations, and advance to Gate 02 scoping."}
                </p>
              </div>
            </>
          )}

          {activeTab === "quotes" && (
            <>
              <div className="p-2 rounded-lg bg-[#edf7f4] text-[#087f79]">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#162c38]">
                  {lang === "bn" ? "প্রজেক্ট স্কোপিং ও টেকনিক্যাল কোটেশন" : "Project Scoping & Quotations Engine"}
                </h1>
                <p className="text-xs text-[#5b6f7b]">
                  {lang === "bn"
                    ? "ইঞ্জিনিয়ারিং ম্যান-আওয়ার হিসাব করুন এবং আনুষ্ঠানিক কোটেশন ইনভয়েস পাঠান।"
                    : "Formulate technical engineering breakdowns, calculate development hours, and dispatch formal quotation invoices."}
                </p>
              </div>
            </>
          )}

          {activeTab === "deployments" && (
            <>
              <div className="p-2 rounded-lg bg-[#edf7f4] text-[#087f79]">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#162c38]">
                  {lang === "bn" ? "ভিপিএস ফ্লিট ও প্রোডাকশন ডিপ্লয়মেন্ট" : "VPS Fleet & Managed Deployments Queue"}
                </h1>
                <p className="text-xs text-[#5b6f7b]">
                  {lang === "bn"
                    ? "ডোমেন যাচাইকরণ, ডিএনএস রুট ও ভিপিএস আইপি (103.145.118.42) প্রোডাকশন ম্যানেজমেন্ট।"
                    : "Domain verification, DNS CNAME routing, VPS IP (103.145.118.42) provisioning, and live TLS activation."}
                </p>
              </div>
            </>
          )}

          {activeTab === "ledger" && (
            <>
              <div className="p-2 rounded-lg bg-[#edf7f4] text-[#087f79]">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#162c38]">
                  {lang === "bn" ? "প্ল্যাটফর্ম ক্রেডিট ও বিলিং লেজার" : "Platform Credit & Billing Ledger"}
                </h1>
                <p className="text-xs text-[#5b6f7b]">
                  {lang === "bn"
                    ? "সিস্টেম ক্রেডিট বরাদ্দ, রিচার্জ ও খরচের অপরিবর্তনীয় অডিট ট্রেইল।"
                    : "Immutable transaction audit log of credit allocations, welcome credits, DevScope builds, and manual top-ups."}
                </p>
              </div>
            </>
          )}

          {activeTab === "support" && (
            <>
              <div className="p-2 rounded-lg bg-[#edf7f4] text-[#087f79]">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#162c38]">
                  {lang === "bn" ? "গ্রাহক সহায়তা ও সাপোর্ট টিকিট কিউ" : "Customer Support Tickets Queue"}
                </h1>
                <p className="text-xs text-[#5b6f7b]">
                  {lang === "bn"
                    ? "গ্রাহকদের টিকিট পর্যালোচনা করুন, সমাধানের স্ট্যাটাস দিন এবং টেকনিক্যাল বার্তা পাঠান।"
                    : "Review incoming customer inquiries, update status, and post technical solutions directly to client workspace."}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "queue" && (
            <Badge variant="outline" className="font-semibold text-xs border-[#dce5e9] bg-white">
              {filteredRegistrations.length} Clients
            </Badge>
          )}
          {activeTab === "quotes" && (
            <Badge variant="outline" className="font-semibold text-xs border-[#dce5e9] bg-white text-emerald-800">
              Pipeline: ৳{totalPipelineValue.toLocaleString()}
            </Badge>
          )}
          {activeTab === "deployments" && (
            <Badge variant="outline" className="font-semibold text-xs border-[#dce5e9] bg-white text-teal-800">
              {deploymentTickets.length} Deployments
            </Badge>
          )}
          {activeTab === "support" && (
            <Badge variant="outline" className="font-semibold text-xs border-[#dce5e9] bg-white text-amber-800">
              {supportTickets.length} Tickets
            </Badge>
          )}
        </div>
      </div>

      {/* Tab 1: Client Registrations & Intake Queue */}
      {activeTab === "queue" && (
        <div>
          {/* Catalog Tools / Filter Bar */}
          <div className="catalog-tools">
            <div className="search-input">
              <Search size={16} />
              <Input
                placeholder="Search by client, entity, domain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border-[#dce5e9] text-xs h-10"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-[#5b6f7b] flex items-center gap-1 font-medium">
                <Filter className="h-3.5 w-3.5" /> Filter:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-[#dce5e9] bg-white px-3 py-2 text-xs text-[#162c38] focus:outline-none focus:ring-1 focus:ring-[#087f79]"
              >
                <option value="all">All Statuses ({registrations.length})</option>
                <option value="pending">Pending Review ({pendingCount})</option>
                <option value="scoping">In Scoping ({inScopingCount})</option>
                <option value="active">Active & Approved ({activeCount})</option>
              </select>
            </div>
          </div>

          {/* Authentic DUDOS Data Table */}
          <div className="data-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client / Entity</TableHead>
                  <TableHead>Domain & Stack</TableHead>
                  <TableHead>Status & Gate</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Admin Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-[#5b6f7b]"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <Users className="h-8 w-8 text-[#8fa0ac] mb-2" />
                        <span className="font-semibold text-sm text-[#162c38]">
                          {registrations.length === 0
                            ? (lang === "bn" ? "কোন ক্লায়েন্ট নিবন্ধন এখনও নেই" : "No client registrations yet")
                            : (lang === "bn" ? "কোন ফলাফল পাওয়া যায়নি" : "No clients match your filter")}
                        </span>
                        <span className="text-xs text-[#5b6f7b] mt-1">
                          {registrations.length === 0
                            ? (lang === "bn" ? "নতুন ক্লায়েন্ট নিবন্ধিত হলে এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে।" : "New client onboarding submissions from the portal will appear here in real-time.")
                            : (lang === "bn" ? "অন্য ফিল্টার বা অনুসন্ধান শব্দ দিয়ে চেষ্টা করুন।" : "Try clearing your search query or changing the status filter.")}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRegistrations.map((client) => {
                    const isClientApproved =
                      client.status === "approved" || client.status === "active";
                    return (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div>
                            <strong className="text-sm font-semibold text-[#162c38] block">
                              {client.displayName}
                            </strong>
                            <small className="text-[#5b6f7b] block">
                              {client.organizationName || "Independent"} • @
                              {client.username}
                            </small>
                            <span className="text-[11px] text-[#087f79] block mt-0.5">
                              {client.email}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <span className="font-medium text-[#162c38] block">
                              {client.intake?.businessDomain || "Enterprise Systems"}
                            </span>
                            <span className="text-[10px] font-mono text-[#5b6f7b] bg-[#f0f4f6] px-1.5 py-0.5 rounded inline-block mt-0.5">
                              {client.intake?.targetStack || "Next.js + FastAPI"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>{getStatusBadge(client.status)}</TableCell>

                        <TableCell>
                          <span className="font-semibold text-[#087f79] bg-[#edf7f4] px-2 py-0.5 rounded border border-[#c2e2dc]">
                            {client.credits.toLocaleString()} Cr
                          </span>
                        </TableCell>

                        <TableCell className="text-[#5b6f7b] text-[11px]">
                          {new Date(client.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="row-actions justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setInspectingUser(client)}
                              className="text-[11px] h-7 px-2.5 text-[#162c38] border-[#dce5e9] hover:bg-[#edf7f4] hover:text-[#087f79]"
                            >
                              <FileText className="h-3 w-3 mr-1 text-[#087f79]" />
                              Inspect
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEstimatingUser(client)}
                              className="text-[11px] h-7 px-2.5 text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                            >
                              <Calculator className="h-3 w-3 mr-1" />
                              Estimate
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCreditModalUser(client)}
                              className="text-[11px] h-7 px-2 text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100"
                              title="Adjust Credits"
                            >
                              <Coins className="h-3 w-3" />
                            </Button>

                            {!isClientApproved ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleStatusChange(client.id, "active")
                                }
                                className="text-[11px] h-7 px-2.5 bg-[#087f79] hover:bg-[#076c67] text-white"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleStatusChange(client.id, "pending_review")
                                }
                                className="text-[11px] h-7 px-2 text-[#5b6f7b] border-[#dce5e9] hover:bg-gray-100"
                                title="Revert to Pending"
                              >
                                Hold
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (
                                  !confirm(
                                    lang === "bn"
                                      ? `আপনি কি নিশ্চিত যে ক্লায়েন্ট "${client.displayName}" মুছে ফেলতে চান?`
                                      : `Permanently delete client "${client.displayName}" (${client.email}) and all their projects/drafts?`
                                  )
                                ) {
                                  return;
                                }
                                try {
                                  const res = await fetch(`${API_BASE}/admin/users/${client.id}`, {
                                    method: "DELETE",
                                    headers: authHeaders(),
                                  });
                                  if (res.ok) {
                                    showToast.success(
                                      lang === "bn"
                                        ? `"${client.displayName}" মুছে ফেলা হয়েছে`
                                        : `Client "${client.displayName}" deleted successfully.`
                                    );
                                    await refreshUsers();
                                    loadDeploymentTickets();
                                    loadSupportTickets();
                                  } else {
                                    showToast.error("Failed to delete client.");
                                  }
                                } catch {
                                  showToast.error("Error deleting client.");
                                }
                              }}
                              className="text-[11px] h-7 px-2 text-rose-600 border-rose-200 bg-rose-50/40 hover:bg-rose-100 hover:text-rose-700"
                              title={lang === "bn" ? "ক্লায়েন্ট মুছুন" : "Delete Client"}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Tab 2: Technical Estimates & Quotes */}
      {activeTab === "quotes" && (
        <div className="bg-white rounded-xl border border-[#dce5e9] p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#dce5e9]">
            <div>
              <h3 className="text-base font-bold text-[#162c38]">
                Authorized Engineering Quotes & Technical Scoping
              </h3>
              <p className="text-xs text-[#5b6f7b] mt-0.5">
                Technical estimations calculated based on frontend, backend, QA and DevOps man-hours.
              </p>
            </div>
            <span className="text-sm font-bold text-[#087f79] bg-[#edf7f4] px-3 py-1 rounded-lg border border-[#c2e2dc]">
              Total Value: ${totalPipelineValue.toLocaleString()} USD
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {registrations
              .filter((r) => r.intake?.estimationQuote)
              .map((r) => {
                const quote = r.intake!.estimationQuote!;
                return (
                  <div
                    key={r.id}
                    className="p-5 rounded-lg border border-[#dce5e9] bg-[#f7f9fa] space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#162c38]">{r.organizationName || r.displayName}</h4>
                        <span className="text-xs text-[#087f79]">{r.intake?.businessDomain}</span>
                      </div>
                      <Badge className="bg-[#edf7f4] text-[#087f79] border-[#c2e2dc]">
                        ${quote.totalQuote.toLocaleString()} {quote.currency}
                      </Badge>
                    </div>

                    <p className="text-xs text-[#5b6f7b] line-clamp-2">
                      {r.intake?.projectScope}
                    </p>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#dce5e9] text-xs">
                      <div>
                        <span className="text-[#5b6f7b] block text-[10px]">EFFORT</span>
                        <strong className="text-[#162c38]">{quote.manHours} Hours</strong>
                      </div>
                      <div>
                        <span className="text-[#5b6f7b] block text-[10px]">HOURLY RATE</span>
                        <strong className="text-[#162c38]">${quote.hourlyRate}/hr</strong>
                      </div>
                      <div>
                        <span className="text-[#5b6f7b] block text-[10px]">INFRA / VPS</span>
                        <strong className="text-[#162c38]">${quote.infraCost}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-[11px] text-[#5b6f7b]">
                      <span>Stack: {r.intake?.targetStack}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEstimatingUser(r)}
                        className="text-[11px] h-6 px-2 bg-white border-[#dce5e9] text-[#162c38] hover:bg-[#edf7f4] hover:text-[#087f79]"
                      >
                        Edit Quote
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Tab 3: Billing & Credit Ledger */}
      {activeTab === "ledger" && (
        <div className="bg-white rounded-xl border border-[#dce5e9] p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#dce5e9]">
            <div>
              <h3 className="text-base font-bold text-[#162c38]">
                Platform Credit & Transaction Ledger
              </h3>
              <p className="text-xs text-[#5b6f7b] mt-0.5">
                Real-time journal of AI generation credits, package activations, and administrative adjustments.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono bg-white border-[#dce5e9] text-[#5b6f7b]">
              Ledger Transactions: {creditTransactions.length}
            </Badge>
          </div>

          <DataTable
            label="credit transactions"
            rows={creditTransactions}
            columns={ledgerColumns}
            getRowId={(tx) => tx.id}
            exportFileName="dudos-credit-ledger"
            empty={
              <span className="flex flex-col items-center gap-1">
                <CreditCard className="h-8 w-8 text-[#8fa0ac] mb-1" />
                <span className="font-semibold text-sm text-[#162c38]">
                  {lang === "bn" ? "কোন ক্রেডিট লেনদেন নেই" : "No credit transactions recorded"}
                </span>
                <span className="text-xs">
                  {lang === "bn"
                    ? "ক্লায়েন্টদের ক্রেডিট বরাদ্দ এবং সিস্টেম ব্যবহারের রেকর্ড এখানে প্রদর্শিত হবে।"
                    : "Client credit allocations, top-ups, and AI usage deductions will appear here in real-time."}
                </span>
              </span>
            }
          />
        </div>
      )}

      {/* Tab 4: Managed Deployments Queue */}
      {activeTab === "deployments" && (
        <div className="bg-white rounded-xl border border-[#dce5e9] p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#dce5e9] gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-dudos-primary" />
                <h3 className="text-base font-bold text-dudos-text">
                  Managed Deployment Tickets & Production Queue
                </h3>
              </div>
              <p className="text-xs text-dudos-text-secondary mt-0.5">
                Section 3.2 · Domain verification, DNS routing, VPS IP assignment & live production provisioning.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Live: {deploymentTickets.filter((t) => t.status === "live").length}
              </span>
              <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                Pending: {deploymentTickets.filter((t) => t.status !== "live").length}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={loadDeploymentTickets}
                className="text-xs h-7 px-2"
                title="Refresh deployment tickets"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search by domain, project, client..."
                value={deploymentSearch}
                onChange={(e) => setDeploymentSearch(e.target.value)}
                className="pl-8 text-xs bg-white h-8"
              />
            </div>

            <div className="text-xs text-dudos-text-secondary">
              Total Queue: <strong>{deploymentTickets.length}</strong> deployment requests
            </div>
          </div>

          {/* Tickets List */}
          {deploymentTickets.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-3">
              <Server className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-600 font-medium">
                No deployment tickets currently in queue.
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Tickets are automatically created when clients submit a domain mapping request from their Project Workspace.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {deploymentTickets
                .filter((t) => {
                  if (!deploymentSearch.trim()) return true;
                  const q = deploymentSearch.toLowerCase();
                  return (
                    (t.domainName && t.domainName.toLowerCase().includes(q)) ||
                    (t.projectTitle && t.projectTitle.toLowerCase().includes(q)) ||
                    (t.clientEmail && t.clientEmail.toLowerCase().includes(q))
                  );
                })
                .map((ticket) => {
                  const isLive = ticket.status === "live";
                  const isDnsVerified = ticket.dnsStatus === "verified" || isLive;
                  const currentIp = ticket.assignedIp || "103.145.118.42";

                  return (
                    <div
                      key={ticket.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isLive
                          ? "bg-emerald-50/30 border-emerald-300"
                          : "bg-white border-[#dce5e9] shadow-xs hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                        <div className="flex items-center gap-3">
                          <span
                            className={`p-2.5 rounded-xl ${
                              isLive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <Globe className="h-5 w-5" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-dudos-text font-mono">
                                {ticket.domainName}
                              </h4>
                              {isLive ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                                  Live in Production 🚀
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                                  Pending Tech Review
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-dudos-text-secondary mt-0.5">
                              Project: <strong>{ticket.projectTitle}</strong> · Client:{" "}
                              <span className="font-mono">{ticket.clientEmail}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-mono">
                            Ticket: {ticket.id}
                          </span>
                          <span className="text-[11px] text-slate-400">·</span>
                          <span className="text-[11px] text-slate-500">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Technical Mapping Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 py-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                            Target Infrastructure
                          </span>
                          <span className="font-bold text-slate-800">{ticket.serverTarget}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Daffodil Cloud Linux</p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                            DNS Registrar / Provider
                          </span>
                          <span className="font-bold text-slate-800">{ticket.dnsProvider}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span
                              className={`inline-block w-1.5 h-1.5 rounded-full ${
                                isDnsVerified ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                              }`}
                            />
                            <span className="text-[10px] text-slate-600">
                              {isDnsVerified ? "DNS Records Verified" : "Pending Verification"}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                            Assigned VPS IP
                          </span>
                          {editingIpTicketId === ticket.id ? (
                            <div className="flex items-center gap-1 mt-1">
                              <Input
                                value={customIpInput}
                                onChange={(e) => setCustomIpInput(e.target.value)}
                                className="h-7 text-xs font-mono"
                                placeholder="e.g. 103.145.118.42"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAssignIp(ticket.id, customIpInput)}
                                className="h-7 px-2 text-xs bg-dudos-primary text-white"
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="font-bold text-slate-800 font-mono">{currentIp}</span>
                              <button
                                onClick={() => {
                                  setEditingIpTicketId(ticket.id);
                                  setCustomIpInput(currentIp);
                                }}
                                className="text-[10px] text-teal-700 hover:underline cursor-pointer"
                              >
                                Edit IP
                              </button>
                            </div>
                          )}
                          <p className="text-[10px] text-slate-500 mt-0.5">Port 80/443 Nginx Proxy</p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                            SSL & Security Status
                          </span>
                          <span className="font-bold text-emerald-700 flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5" />
                            <span>{isLive ? "256-bit TLS Active" : "Auto-Provisioning"}</span>
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5">Let's Encrypt Wildcard</p>
                        </div>
                      </div>

                      {/* Client Special Notes */}
                      {ticket.specialInstructions && (
                        <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 text-xs text-amber-950 mb-3">
                          <span className="font-semibold block mb-0.5">Client Instructions:</span>
                          <p className="text-[11px] text-amber-900 leading-relaxed">
                            {ticket.specialInstructions}
                          </p>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/70">
                        <div className="flex items-center gap-2">
                          {!isDnsVerified && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVerifyDns(ticket.id)}
                              className="text-xs h-8 bg-white border-teal-300 text-teal-800 hover:bg-teal-50"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Verify DNS CNAME
                            </Button>
                          )}

                          {isLive && (
                            <a
                              href={ticket.liveUrl || `https://${ticket.domainName}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                            >
                              <span>Visit Production URL</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        <div>
                          {!isLive ? (
                            <Button
                              size="sm"
                              onClick={() => handleMarkLive(ticket)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Mark Live & Production Ready</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkLive(ticket)}
                              className="text-xs h-8 text-slate-700 hover:bg-slate-100"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Re-Sync Live Status
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Customer Support Tickets Queue */}
      {activeTab === "support" && (
        <AdminSupportTickets
          clients={registrations.filter((r) => r.role !== "admin")}
        />
      )}

      {/* Inspect Intake Modal */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 border border-[#dce5e9] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-[#dce5e9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-dudos-text">
                    {inspectingUser.organizationName || inspectingUser.displayName}
                  </h3>
                  <p className="text-xs text-dudos-text-secondary">
                    Registered by {inspectingUser.displayName} • {inspectingUser.email}
                  </p>
                </div>
              </div>
              {getStatusBadge(inspectingUser.status)}
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                <div>
                  <span className="text-gray-500 block">Business Domain</span>
                  <strong className="text-gray-900 text-sm">{inspectingUser.intake?.businessDomain || "Not specified"}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Target Architecture</span>
                  <strong className="text-gray-900 text-sm font-mono">{inspectingUser.intake?.targetStack || "Next.js + FastAPI"}</strong>
                </div>
              </div>

              <div>
                <span className="text-gray-500 font-semibold uppercase tracking-wider block mb-1">
                  Project Scope & Functional Specifications
                </span>
                <div className="p-3.5 rounded-xl bg-white border border-gray-200 text-gray-800 leading-relaxed max-h-48 overflow-y-auto">
                  {inspectingUser.intake?.projectScope || "Standard client onboarding profile and website generation intake."}
                </div>
              </div>

              {inspectingUser.intake?.referenceUrls && (
                <div>
                  <span className="text-gray-500 font-semibold uppercase tracking-wider block mb-1">
                    Benchmark References & URLs
                  </span>
                  <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 font-mono text-xs truncate">
                    {inspectingUser.intake.referenceUrls}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 text-gray-500">
                <span>Account Created: {new Date(inspectingUser.createdAt).toLocaleString()}</span>
                <span>Wallet Balance: <strong>{inspectingUser.credits.toLocaleString()} Credits</strong></span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#dce5e9]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectingUser(null)}
              >
                Close Inspector
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEstimatingUser(inspectingUser);
                    setInspectingUser(null);
                  }}
                  className="text-blue-700 border-blue-200 bg-blue-50"
                >
                  <Calculator className="h-3.5 w-3.5 mr-1" />
                  Technical Scoping
                </Button>

                {inspectingUser.status !== "active" && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      handleStatusChange(inspectingUser.id, "active");
                      setInspectingUser(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Approve & Activate
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit Allocation Modal */}
      {creditModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#dce5e9] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-[#dce5e9]">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-dudos-text">
                  Adjust Credits: {creditModalUser.displayName}
                </h3>
                <p className="text-xs text-dudos-text-secondary">
                  Current balance: {creditModalUser.credits.toLocaleString()} Credits
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-gray-700 mb-1">
                  Credit Amount (Positive to add, negative to deduct)
                </label>
                <Input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="font-semibold block text-gray-700 mb-1">
                  Reason / Administrative Note
                </label>
                <Input
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="e.g. VIP onboarding bonus, support compensation"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#dce5e9]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreditModalUser(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyCredits}
              >
                Confirm Allocation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Estimation Modal Integration */}
      {estimatingUser && (
        <AdminEstimationModal
          project={{
            id: estimatingUser.id,
            title: estimatingUser.organizationName || estimatingUser.displayName,
            clientEmail: estimatingUser.email,
            framework: estimatingUser.intake?.targetStack || "Next.js + FastAPI",
            description: estimatingUser.intake?.projectScope || "",
          }}
          open={!!estimatingUser}
          onOpenChange={(open) => !open && setEstimatingUser(null)}
          onDispatched={(invoice) => {
            updateRegistrationStatus(estimatingUser.id, "approved", {
              manHours: invoice.totalHours,
              hourlyRate: Math.round(invoice.hourlyRate / 120),
              infraCost: Math.round(invoice.infrastructureCost / 120),
              totalQuote: Math.round(invoice.totalQuotationBDT / 120),
              currency: "USD",
              approvedAt: new Date().toISOString(),
              adminNotes: `Estimated for ${invoice.framework}. Margin: ${invoice.profitMarginPercent}%`,
            });

            // Synchronize with dudos_quotation_invoices for Customer User Panel & ERP records
            try {
              const existing = JSON.parse(localStorage.getItem("dudos_quotation_invoices") || "[]");
              const updated = [invoice, ...existing.filter((i: any) => i.id !== invoice.id)];
              localStorage.setItem("dudos_quotation_invoices", JSON.stringify(updated));

              // Update project status to 'quoted' in dudos_custom_projects
              const projects = JSON.parse(localStorage.getItem("dudos_custom_projects") || "[]");
              const updatedProjects = projects.map((p: any) =>
                p.clientEmail === invoice.clientEmail || p.id === invoice.projectId || p.id === estimatingUser.id
                  ? { ...p, status: "quoted" }
                  : p
              );
              localStorage.setItem("dudos_custom_projects", JSON.stringify(updatedProjects));

              // Update dudos_active_draft if it matches
              const activeDraftStr = localStorage.getItem("dudos_active_draft");
              if (activeDraftStr) {
                const draft = JSON.parse(activeDraftStr);
                if (draft.email === invoice.clientEmail || draft.id === invoice.projectId || draft.id === estimatingUser.id) {
                  draft.status = "quoted";
                  localStorage.setItem("dudos_active_draft", JSON.stringify(draft));
                }
              }
            } catch {}

            setEstimatingUser(null);
            showToast.success("Formal technical quotation dispatched to client!");
          }}
          lang={lang}
        />
      )}
    </div>
  );
}
