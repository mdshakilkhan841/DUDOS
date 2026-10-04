// Not imported from ./packages: that module imports this one.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

function safeJsonParse<T = any>(
    val: string | null | undefined,
    fallback: T | null = null,
): T | null {
    if (!val) return fallback;
    try {
        return JSON.parse(val);
    } catch {
        return fallback;
    }
}

export function getAuthTokenCandidates(): string[] {
    if (typeof window === "undefined") return [];
    const candidates: string[] = [];
    const add = (value?: string | null) => {
        const token = value?.trim();
        if (
            token &&
            !token.startsWith("token_") &&
            !candidates.includes(token)
        ) {
            candidates.push(token);
        }
    };

    try {
        add(localStorage.getItem("dudos_jwt_token"));
        add(localStorage.getItem("dudos_auth_token"));
        add(sessionStorage.getItem("dudos_jwt_token"));

        const sessionStr = localStorage.getItem("dudos_auth_session");
        if (sessionStr) {
            const parsed = safeJsonParse(sessionStr);
            add(parsed?.token);
        }

        for (const cookie of document.cookie.split(";")) {
            const separator = cookie.indexOf("=");
            if (separator < 0) continue;
            const name = cookie.slice(0, separator).trim();
            if (name !== "dudos_session" && name !== "dudos_at") continue;

            const value = decodeURIComponent(cookie.slice(separator + 1));
            const parsed = safeJsonParse(value);
            add(parsed?.token);
            // The access-token cookie stores a raw JWT, while the session cookie is JSON.
            // Check every cookie so a tokenless dudos_session does not hide dudos_at.
            if (name === "dudos_at") add(value);
        }
    } catch {}
    return candidates;
}

export function getAuthToken(): string | null {
    return getAuthTokenCandidates()[0] || null;
}

export function mergeAssessmentData(
    current: Record<string, string>,
    updates: Record<string, string>,
): Record<string, string> {
    return { ...current, ...updates };
}

export function persistAuthToken(token: string): void {
    if (typeof window === "undefined" || !token) return;
    try {
        localStorage.setItem("dudos_jwt_token", token);
        const session = safeJsonParse<Record<string, any>>(
            localStorage.getItem("dudos_auth_session"),
        );
        if (session) {
            session.token = token;
            localStorage.setItem("dudos_auth_session", JSON.stringify(session));
        }
    } catch {}
}

export interface ActiveProjectDraft {
    id: string;
    workspace?: string;
    assessmentRecordId?: string;
    assessmentVersion?: number;
    assessmentData?: Record<string, string>;
    title: string;
    organizationName: string;
    contactName: string;
    email: string;
    businessDomain: string;
    projectScope: string;
    siteUrl: string;
    targetStack: string;
    budgetExpectation: string;
    expectedTimeline: string;
    qaAnswers: {
        multiTenant?: string;
        paymentGateway?: string;
        userScale?: string;
        databaseChoice?: string;
    };
    status:
        | "draft"
        | "submitted"
        | "in_estimation"
        | "quoted"
        | "approved"
        | "in_development"
        | "deploying"
        | "completed"
        | "live";
    domainName?: string;
    liveUrl?: string;
    vpsIp?: string;
    deployedAt?: string;
    buildId?: string;
    devscopeStatus?: string;
    previewUrl?: string;
    deploymentTicket?: any;
    quotationInvoice?: any;
    savedAt: string;
    updatedAt: string;
}

export function findAssessmentRecord(
    records: any[],
    {
        recordId,
        organizationName,
    }: { recordId?: string; organizationName?: string },
) {
    const assessments = Array.isArray(records)
        ? records.filter((record) => record?.kind === "assessment")
        : [];
    if (recordId) {
        const byId = assessments.find((record) => record.id === recordId);
        if (byId) return byId;
    }

    const organization = organizationName?.trim().toLowerCase();
    if (organization) {
        return (
            assessments.find(
                (record) =>
                    record.data?.organization?.trim().toLowerCase() ===
                    organization,
            ) || null
        );
    }

    return null;
}

// Placeholder titles older records were saved with; never shown as a name.
const PLACEHOLDER_TITLES = new Set([
    "transformation draft",
    "transformation project",
    "untitled record",
]);

/** Project title: the project name, else the organization, else "Untitled project". */
export function assessmentTitle(
    data?: Record<string, string> | null,
    fallbackTitle?: string,
): string {
    const fallback = fallbackTitle?.trim() || "";
    return (
        data?.project_name?.trim() ||
        cleanString(data?.organization) ||
        (fallback && !PLACEHOLDER_TITLES.has(fallback.toLowerCase())
            ? fallback
            : "") ||
        "Untitled project"
    );
}

/** Recover form answers from older workspace drafts that only kept project scope. */
export function assessmentAnswersFromDraft(
    draft: Partial<ActiveProjectDraft> & {
        assessmentData?: Record<string, string>;
    },
): Record<string, string> {
    const source = draft.assessmentData || {};
    const scope = draft.projectScope || "";
    const sectionLabels = [
        "Desired Outcomes",
        "Modules & Scope",
        "Existing Systems",
        "Brand Requirements",
        "Ownership & Permissions",
        "Reporting and notification preferences",
        "Resolved Scope",
    ];
    const readSection = (label: string) => {
        const marker = `${label}:`;
        const start = scope.indexOf(marker);
        if (start < 0) return "";
        const valueStart = start + marker.length;
        const nextSection = sectionLabels
            .map((nextLabel) => scope.indexOf(`\n\n${nextLabel}:`, valueStart))
            .filter((index) => index >= 0)
            .sort((left, right) => left - right)[0];
        return scope.slice(valueStart, nextSection ?? scope.length).trim();
    };

    return {
        ...source,
        project_name:
            source.project_name ||
            (draft.title && draft.title !== "Untitled project"
                ? draft.title
                : ""),
        organization: source.organization || draft.organizationName || "",
        outcomes: source.outcomes || readSection("Desired Outcomes") || scope,
        sector: source.sector || draft.businessDomain || "",
        country: source.country || "",
        languages: source.languages || "",
        site_url: source.site_url || draft.siteUrl || "",
        systems:
            source.systems ||
            readSection("Existing Systems") ||
            draft.targetStack ||
            "",
        modules: source.modules || readSection("Modules & Scope"),
        brand: source.brand || readSection("Brand Requirements"),
        rights: source.rights || readSection("Ownership & Permissions"),
        budget: source.budget || draft.budgetExpectation || "",
        reporting:
            source.reporting ||
            readSection("Reporting and notification preferences"),
        unknowns: source.unknowns || readSection("Resolved Scope"),
    };
}

const ACTIVE_DRAFT_KEY = "dudos_active_draft";
const PROJECT_RECORDS_KEY = "dudos_project_records";
const CUSTOM_PROJECTS_KEY = "dudos_custom_projects";

function cleanString(val?: string | null): string {
    if (!val) return "";
    const trimmed = val.trim();
    const lower = trimmed.toLowerCase();
    if (
        lower === "customer / client" ||
        lower === "client" ||
        lower.includes("customer / client")
    ) {
        return "";
    }
    return trimmed;
}

export function convertAssessmentRecordToDraft(
    record: any,
    user?: any,
    workspaceId?: string,
): ActiveProjectDraft {
    const d = record?.data || {};
    const org =
        cleanString(d.organization) ||
        cleanString(user?.organizationName) ||
        (user?.displayName
            ? `${user.displayName}'s Organization`
            : "Customer Workspace");

    const title = assessmentTitle(d, record?.title);

    const scopeParts = [
        d.outcomes ? `Desired Outcomes:\n${d.outcomes}` : "",
        d.modules ? `Modules & Scope: ${d.modules}` : "",
        d.systems ? `Existing Systems: ${d.systems}` : "",
        d.brand ? `Brand Requirements: ${d.brand}` : "",
        d.rights ? `Ownership & Permissions: ${d.rights}` : "",
        d.reporting
            ? `Reporting and notification preferences: ${d.reporting}`
            : "",
        d.unknowns ? `Resolved Scope: ${d.unknowns}` : "",
    ].filter(Boolean);

    const scope =
        scopeParts.length > 0
            ? scopeParts.join("\n\n")
            : "Comprehensive Digital Transformation & System Delivery";

    const isSubmitted =
        record?.status === "submitted" ||
        record?.status === "in_review" ||
        record?.status === "accepted" ||
        record?.status === "in_progress";

    const multiTenantAnswer =
        d.systems?.toLowerCase().includes("multi") ||
        d.modules?.toLowerCase().includes("crm") ||
        d.modules?.toLowerCase().includes("staff")
            ? "yes"
            : "no";

    const paymentGatewayAnswer =
        d.modules?.toLowerCase().includes("commerce") ||
        d.modules?.toLowerCase().includes("billing")
            ? "bKash / Nagad / SSLCommerz / Stripe"
            : "Online Gateway";

    return {
        id: record?.id || "draft_" + Date.now().toString(36),
        workspace: workspaceId || record?.workspace || "default",
        assessmentRecordId: record?.id,
        assessmentVersion: record?.version,
        assessmentData: d,
        title,
        organizationName: org,
        contactName: user?.displayName || user?.username || "Client Lead",
        email: user?.email || "",
        businessDomain: d.sector || "Enterprise Digital Platform",
        projectScope: scope,
        siteUrl: d.site_url || "",
        targetStack: d.systems || "Next.js 16 + FastAPI + PostgreSQL 16",
        budgetExpectation: d.budget || "$2,500 – $5,000 USD",
        expectedTimeline: "4-8 Weeks",
        qaAnswers: {
            multiTenant: multiTenantAnswer,
            paymentGateway: paymentGatewayAnswer,
            userScale: "5,000+ Concurrent Users",
            databaseChoice: d.systems || "PostgreSQL 16 Enterprise",
        },
        status: isSubmitted ? "submitted" : "draft",
        savedAt: record?.created_at || new Date().toISOString(),
        updatedAt: record?.updated_at || new Date().toISOString(),
    };
}

export async function syncAssessmentToWorkspaceDraft(
    record: any,
    data: Record<string, string>,
    workspaceId: string,
    user?: any,
    isSubmitted = false,
    // Legacy project ids (e.g. onboarding drafts) this assessment now replaces.
    replaceIds: string[] = [],
): Promise<ActiveProjectDraft | null> {
    if (typeof window === "undefined") return null;

    try {
        const org =
            cleanString(data.organization) ||
            cleanString(user?.organizationName) ||
            (user?.displayName
                ? `${user.displayName}'s Organization`
                : "Customer Workspace");

        const title = assessmentTitle(data, record?.title);

        const scopeParts = [
            data.outcomes ? `Desired Outcomes:\n${data.outcomes}` : "",
            data.modules ? `Modules & Scope: ${data.modules}` : "",
            data.systems ? `Existing Systems: ${data.systems}` : "",
            data.brand ? `Brand Requirements: ${data.brand}` : "",
            data.rights ? `Ownership & Permissions: ${data.rights}` : "",
            data.reporting
                ? `Reporting and notification preferences: ${data.reporting}`
                : "",
            data.unknowns ? `Resolved Scope: ${data.unknowns}` : "",
        ].filter(Boolean);

        const scope =
            scopeParts.length > 0
                ? scopeParts.join("\n\n")
                : "Enterprise Software Architecture & Digital Transformation";

        const multiTenantAnswer =
            data.systems?.toLowerCase().includes("multi") ||
            data.modules?.toLowerCase().includes("crm") ||
            data.modules?.toLowerCase().includes("staff")
                ? "yes"
                : "no";

        const paymentGatewayAnswer =
            data.modules?.toLowerCase().includes("commerce") ||
            data.modules?.toLowerCase().includes("billing")
                ? "bKash / Nagad / SSLCommerz / Stripe"
                : "Online Gateway";

        const originalRecordId = record?.id || "";

        const draftRecord: ActiveProjectDraft = {
            id: originalRecordId || "draft_" + Date.now().toString(36),
            workspace: workspaceId,
            assessmentRecordId: originalRecordId || undefined,
            assessmentVersion: record?.version,
            assessmentData: { ...data },
            title,
            organizationName: org,
            contactName:
                user?.displayName || user?.username || "Client Stakeholder",
            email: user?.email || "",
            businessDomain: data.sector || "Enterprise Digital Transformation",
            projectScope: scope,
            siteUrl: data.site_url || "",
            targetStack: data.systems || "Next.js 16 + FastAPI + PostgreSQL 16",
            budgetExpectation: data.budget || "$2,500 – $5,000 USD",
            expectedTimeline: "4-8 Weeks",
            qaAnswers: {
                multiTenant: multiTenantAnswer,
                paymentGateway: paymentGatewayAnswer,
                userScale: "5,000+ Concurrent Users",
                databaseChoice: data.systems || "PostgreSQL 16 Enterprise",
            },
            status: isSubmitted
                ? "submitted"
                : record.status === "submitted"
                  ? "submitted"
                  : "draft",
            savedAt: record.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const customItem: any = {
            id: draftRecord.id,
            workspace: workspaceId,
            assessmentRecordId: originalRecordId || undefined,
            title: draftRecord.title,
            clientName: draftRecord.contactName,
            clientEmail: draftRecord.email,
            category: draftRecord.businessDomain,
            referenceUrl: draftRecord.siteUrl || "",
            businessScope: draftRecord.projectScope,
            selectedFeatures: [
                draftRecord.qaAnswers.multiTenant === "yes"
                    ? "Multi-Tenancy Workspace Architecture"
                    : "Single-Tenant Instance",
                draftRecord.qaAnswers.databaseChoice
                    ? `Database: ${draftRecord.qaAnswers.databaseChoice}`
                    : "",
            ].filter(Boolean),
            framework: draftRecord.targetStack,
            targetTimeline: draftRecord.expectedTimeline,
            budgetRange: draftRecord.budgetExpectation,
            srsContent: `# Software Requirements Specification (SRS)\n## Project: ${draftRecord.title}\n**Organization**: ${draftRecord.organizationName}\n**Scope**:\n${draftRecord.projectScope}\n\n**Architecture**:\n- Stack: ${draftRecord.targetStack}\n- Multi-Tenancy: ${draftRecord.qaAnswers.multiTenant}\n- Payment: ${draftRecord.qaAnswers.paymentGateway}\n- Concurrency Scale: ${draftRecord.qaAnswers.userScale}`,
            status: draftRecord.status,
            createdAt: draftRecord.savedAt,
            updatedAt: draftRecord.updatedAt,
        };

        // If submitted, persist authoritative project in PostgreSQL first to unify primary key ID
        const token = getAuthToken();
        if (token && (isSubmitted || draftRecord.status === "submitted")) {
            try {
                const projRes = await fetch(
                    `${API_BASE}/projects/from-draft`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            projectId: draftRecord.id.startsWith("cproj_")
                                ? draftRecord.id
                                : undefined,
                            recordId: originalRecordId,
                            workspace: workspaceId,
                            name: draftRecord.title,
                            domain: draftRecord.businessDomain,
                            scopeSummary: draftRecord.projectScope,
                            specs: {
                                stack: draftRecord.targetStack,
                                timeline: draftRecord.expectedTimeline,
                                budget: draftRecord.budgetExpectation,
                                workspace: workspaceId,
                                organization: draftRecord.organizationName,
                                recordId: originalRecordId,
                                assessment: { ...data },
                            },
                            qaAnswers: draftRecord.qaAnswers,
                            srsDocument: customItem.srsContent,
                        }),
                    },
                );

                if (projRes.ok) {
                    const savedProj = await projRes.json();
                    if (savedProj?.id) {
                        // Adopt backend authoritative ID so localStorage and PostgreSQL use the identical primary key
                        draftRecord.id = savedProj.id;
                        customItem.id = savedProj.id;
                    }
                }
            } catch (projErr) {
                console.warn(
                    "Failed to persist project to PostgreSQL:",
                    projErr,
                );
            }
        }

        // Match by id only: several assessments may share an organization/title
        // and each one must stay its own project.
        const replacedIds = new Set(
            [draftRecord.id, originalRecordId, ...replaceIds].filter(Boolean),
        );
        const isReplaced = (item: any) =>
            replacedIds.has(item?.id) ||
            (Boolean(originalRecordId) &&
                item?.assessmentRecordId === originalRecordId);

        // 1. Set active draft in localStorage with unified ID
        localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(draftRecord));

        // 2. Append or update in PROJECT_RECORDS_KEY
        const existingRecords =
            safeJsonParse(localStorage.getItem(PROJECT_RECORDS_KEY) || "[]") ||
            [];
        const nextRecords = [
            draftRecord,
            ...existingRecords.filter((item: any) => !isReplaced(item)),
        ];
        localStorage.setItem(PROJECT_RECORDS_KEY, JSON.stringify(nextRecords));

        // 3. Append or update in CUSTOM_PROJECTS_KEY
        const existingCustom =
            safeJsonParse(localStorage.getItem(CUSTOM_PROJECTS_KEY) || "[]") ||
            [];
        const nextCustom = [
            customItem,
            ...existingCustom.filter((item: any) => !isReplaced(item)),
        ];
        localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(nextCustom));

        // 4. Persist onboarding & active draft snapshots in PostgreSQL
        if (token) {
            // a. Save to customer_onboarding_drafts table
            fetch(`${API_BASE}/onboarding/draft`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    organizationName: draftRecord.organizationName,
                    contactPerson: draftRecord.contactName,
                    email: draftRecord.email,
                    businessDomain: draftRecord.businessDomain,
                    projectScope: draftRecord.projectScope,
                    referenceSiteUrl: draftRecord.siteUrl,
                    techStack: draftRecord.targetStack,
                    budgetExpectation: draftRecord.budgetExpectation,
                    expectedTimeline: draftRecord.expectedTimeline,
                    payload: {
                        qaAnswers: draftRecord.qaAnswers,
                        workspace: workspaceId,
                        recordId: originalRecordId,
                        projectId: draftRecord.id,
                        status: draftRecord.status,
                    },
                }),
            }).catch((err) =>
                console.warn("Failed to persist onboarding draft to DB:", err),
            );

            // b. Save to customer_active_drafts table
            fetch(`${API_BASE}/onboarding/active-draft`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    draft: draftRecord,
                    activeDraft: draftRecord,
                    stage: isSubmitted ? "submitted" : "draft",
                }),
            }).catch((err) =>
                console.warn("Failed to persist active draft to DB:", err),
            );
        }

        return draftRecord;
    } catch (err) {
        console.error("Error in syncAssessmentToWorkspaceDraft:", err);
        return null;
    }
}
