"use client";

import React, { useState, useEffect } from "react";
import { API_BASE } from "@/lib/dudos/packages";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileText,
  User,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Coins,
  Shield,
  Layers,
  HelpCircle,
  Clock,
  Send,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { showToast } from "@/lib/toast";

const STORAGE_KEY = "dudos_onboarding_draft";
const ACTIVE_DRAFT_KEY = "dudos_active_draft";
const PROJECT_RECORDS_KEY = "dudos_project_records";

export interface OnboardingIntakeData {
  organizationName: string;
  contactName: string;
  email: string;
  businessDomain: string;
  projectScope: string;
  siteUrl: string;
  targetStack: string;
  budgetExpectation: string;
  expectedTimeline: string;
  savedAt: string;
}

export function CustomerOnboardingWizard({ lang = "en" }: { lang?: string }) {
  const router = useRouter();
  const { user, isAuthenticated, register, addCredits } = useAuth();

  // Step 1: Onboarding Data Collection
  const [step, setStep] = useState<"intake" | "register" | "draft_review" | "qa_final">("intake");
  const [organizationName, setOrganizationName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [businessDomain, setBusinessDomain] = useState("");
  const [projectScope, setProjectScope] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [targetStack, setTargetStack] = useState("");
  const [budgetExpectation, setBudgetExpectation] = useState("");
  const [expectedTimeline, setExpectedTimeline] = useState("");
  const [savedTime, setSavedTime] = useState<string>("");

  // Step 2: Registration Fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 4: AI Guided Q&A
  const [qaAnswers, setQaAnswers] = useState<Record<string, string>>({
    multiTenant: "",
    paymentMethods: "",
    userVolume: "",
  });
  const [aiClarification, setAiClarification] = useState("");

  // Restore onboarding draft from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: OnboardingIntakeData = JSON.parse(stored);
        if (parsed.organizationName) setOrganizationName(parsed.organizationName);
        if (parsed.contactName) setContactName(parsed.contactName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.businessDomain) setBusinessDomain(parsed.businessDomain);
        if (parsed.projectScope) setProjectScope(parsed.projectScope);
        if (parsed.siteUrl) setSiteUrl(parsed.siteUrl);
        if (parsed.targetStack) setTargetStack(parsed.targetStack);
        if (parsed.budgetExpectation) setBudgetExpectation(parsed.budgetExpectation);
        if (parsed.expectedTimeline) setExpectedTimeline(parsed.expectedTimeline);
        if (parsed.savedAt) setSavedTime(new Date(parsed.savedAt).toLocaleTimeString());
      }
    } catch {}
  }, []);

  // Real-time autosave to localStorage & sessionStorage
  useEffect(() => {
    if (organizationName || contactName || email || projectScope) {
      const draft: OnboardingIntakeData = {
        organizationName,
        contactName,
        email,
        businessDomain,
        projectScope,
        siteUrl,
        targetStack,
        budgetExpectation,
        expectedTimeline,
        savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setSavedTime(new Date().toLocaleTimeString());
      } catch {}
    }
  }, [
    organizationName,
    contactName,
    email,
    businessDomain,
    projectScope,
    siteUrl,
    targetStack,
    budgetExpectation,
    expectedTimeline,
  ]);

  // If already authenticated, skip registration step
  useEffect(() => {
    if (isAuthenticated && user && step === "register") {
      setStep("draft_review");
    }
  }, [isAuthenticated, user, step]);

  const handleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName.trim()) {
      showToast.error("Organization name is required");
      return;
    }
    if (!projectScope.trim()) {
      showToast.error("Please describe your project scope and goals");
      return;
    }

    // If customer is already authenticated, jump straight to draft review
    if (isAuthenticated && user) {
      feedDataToActualDraft();
      setStep("draft_review");
    } else {
      // Pre-fill username from contact name or email
      if (!username) {
        const generatedUser = (contactName || email.split("@")[0] || "client")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "_");
        setUsername(generatedUser);
      }
      setStep("register");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      showToast.error("All registration fields are required");
      return;
    }
    if (password !== confirmPassword) {
      showToast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await register({
        displayName: contactName || username,
        username,
        email,
        password,
        role: "client",
        organizationName,
        intake: {
          businessDomain,
          projectScope,
          targetStack,
          referenceUrls: siteUrl,
          budgetRange: budgetExpectation,
          expectedTimeline,
          submittedAt: new Date().toISOString(),
        },
      });

      if (success) {
        feedDataToActualDraft();
        setStep("draft_review");
        showToast.success("Registration complete! Feeding data into your active draft.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const feedDataToActualDraft = (confirmedStatus?: "draft" | "submitted") => {
    const statusVal = confirmedStatus || "draft";
    const draftRecord = {
      id: "draft_" + Date.now().toString(36),
      title: organizationName
        ? `${organizationName}${businessDomain ? ` — ${businessDomain}` : ""}`
        : "Custom Engineering Project",
      organizationName: organizationName || "",
      contactName: contactName || user?.displayName || "",
      email: email || user?.email || "",
      businessDomain,
      projectScope,
      siteUrl,
      targetStack,
      budgetExpectation,
      expectedTimeline,
      qaAnswers,
      status: statusVal,
      savedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(draftRecord));

      // Append to project records list
      const existing = localStorage.getItem(PROJECT_RECORDS_KEY);
      const list = existing ? JSON.parse(existing) : [];
      const updatedList = [draftRecord, ...list.filter((item: any) => item.id !== draftRecord.id)];
      localStorage.setItem(PROJECT_RECORDS_KEY, JSON.stringify(updatedList));

      // Also append to dudos_custom_projects for ERP and Admin visibility
      const customExisting = JSON.parse(localStorage.getItem("dudos_custom_projects") || "[]");
      const customProjectItem = {
        id: draftRecord.id,
        title: draftRecord.title,
        clientName: draftRecord.contactName,
        clientEmail: draftRecord.email,
        category: businessDomain,
        referenceUrl: siteUrl || "",
        businessScope: projectScope,
        selectedFeatures: [
          qaAnswers.multiTenant === "yes" ? "Multi-Tenancy Workspace Architecture" : "Single-Tenant Instance",
        ].filter(Boolean),
        framework: targetStack,
        targetTimeline: expectedTimeline,
        budgetRange: budgetExpectation,
        srsContent: `# SRS & Architecture: ${organizationName || "Project"}\n\n## 1. Scope\n${projectScope}\n\n## 2. Architecture\n- Stack: ${targetStack}\n- Multi-Tenancy: ${qaAnswers.multiTenant === "yes" ? "Enabled (Tenant Isolation)" : "Single-Tenant"}\n- Payment: ${qaAnswers.paymentGateway}\n- Concurrency Scale: ${qaAnswers.userScale}\n\n## 3. Commercial\n- Timeline: ${expectedTimeline}\n- Budget: ${budgetExpectation}`,
        status: statusVal,
        createdAt: draftRecord.savedAt,
        updatedAt: draftRecord.updatedAt,
      };
      const updatedCustom = [
        customProjectItem,
        ...customExisting.filter((item: any) => item.id !== draftRecord.id),
      ];
      localStorage.setItem("dudos_custom_projects", JSON.stringify(updatedCustom));
    } catch {}

    // Persist to FastAPI PostgreSQL backend
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("dudos_jwt_token") || localStorage.getItem("dudos_auth_token")
          : null;
      fetch(`${API_BASE}/onboarding/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: user?.id,
          email: email || user?.email,
          organizationName,
          businessDomain,
          contactPerson: contactName,
          phone: "",
          referenceSiteUrl: siteUrl,
          projectScope,
          techStack: targetStack,
          budgetExpectation,
          expectedTimeline,
          payload: draftRecord,
        }),
      }).catch((err) => console.error("FastAPI onboarding draft sync error:", err));

      if (token) {
        fetch(`${API_BASE}/onboarding/active-draft`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ draft: draftRecord, activeDraft: draftRecord }),
        }).catch((err) => console.error("FastAPI active draft sync error:", err));
      }
    } catch {}
  };

  const handleConfirmDraft = () => {
    feedDataToActualDraft("draft");
    setStep("qa_final");
  };

  const handleFinalSpecificationConfirm = async () => {
    feedDataToActualDraft("submitted");

    // Also persist project to FastAPI database if authenticated
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("dudos_jwt_token") || localStorage.getItem("dudos_auth_token")
          : null;
      if (token) {
        const projRes = await fetch(`${API_BASE}/projects/from-draft`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: `${organizationName || "Custom Project"} — ${businessDomain}`,
            domain: businessDomain,
            scopeSummary: projectScope,
            specs: {
              stack: targetStack,
              timeline: expectedTimeline,
              budget: budgetExpectation,
            },
            qaAnswers,
            srsDocument: `# SRS & Architecture: ${organizationName || "Project"}\n\n## 1. Scope\n${projectScope}\n\n## 2. Architecture\n- Stack: ${targetStack}\n- Multi-Tenancy: ${qaAnswers.multiTenant === "yes" ? "Enabled (Tenant Isolation)" : "Single-Tenant"}\n- Payment: ${qaAnswers.paymentMethods || qaAnswers.paymentGateway}\n- Concurrency Scale: ${qaAnswers.userVolume || qaAnswers.userScale}\n\n## 3. Commercial\n- Timeline: ${expectedTimeline}\n- Budget: ${budgetExpectation}`,
          }),
        });
        if (projRes.ok) {
          const savedProj = await projRes.json();
          if (savedProj?.id) {
            try {
              const activeStr = localStorage.getItem("dudos_active_draft");
              if (activeStr) {
                const active = JSON.parse(activeStr);
                active.id = savedProj.id;
                localStorage.setItem("dudos_active_draft", JSON.stringify(active));
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error("FastAPI project create error:", err);
    }

    showToast.success("Project specifications confirmed!", {
      description: "Dispatched to tech estimation & workspace provisioning.",
    });
    router.push(`/${lang}/app`);
  };

  return (
    <div className="min-h-screen bg-dudos-surface text-dudos-text py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Progress Pipeline Indicator */}
        <div className="bg-white rounded-2xl p-5 border border-dudos-border shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-dudos-border mb-4">
            <span className="text-xs font-bold text-dudos-text uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-dudos-primary" />
              <span>DUDOS Customer Onboarding Flow</span>
            </span>
            {savedTime && (
              <span className="text-[11px] text-teal-700 font-mono bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                ✓ Auto-saved at {savedTime}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div
              className={`p-2 rounded-xl border ${
                step === "intake"
                  ? "bg-teal-50 border-dudos-primary font-bold text-dudos-primary"
                  : "bg-gray-50 border-gray-200 text-gray-500"
              }`}
            >
              1. Onboarding Intake
            </div>
            <div
              className={`p-2 rounded-xl border ${
                step === "register"
                  ? "bg-teal-50 border-dudos-primary font-bold text-dudos-primary"
                  : isAuthenticated
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-gray-50 border-gray-200 text-gray-500"
              }`}
            >
              2. Account Link
            </div>
            <div
              className={`p-2 rounded-xl border ${
                step === "draft_review"
                  ? "bg-teal-50 border-dudos-primary font-bold text-dudos-primary"
                  : "bg-gray-50 border-gray-200 text-gray-500"
              }`}
            >
              3. Feed to Draft
            </div>
            <div
              className={`p-2 rounded-xl border ${
                step === "qa_final"
                  ? "bg-teal-50 border-dudos-primary font-bold text-dudos-primary"
                  : "bg-gray-50 border-gray-200 text-gray-500"
              }`}
            >
              4. AI Q&A & Confirm
            </div>
          </div>
        </div>

        {/* STEP 1: CUSTOMER ONBOARDING FORM (DATA COLLECTION) */}
        {step === "intake" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-dudos-border shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-dudos-text">
                Start Your Digital Transformation
              </h2>
              <p className="text-xs text-dudos-text-secondary mt-1">
                Tell us about your organization, goals, and target architecture. All responses auto-save to local storage in real time.
              </p>
            </div>

            <form onSubmit={handleIntakeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orgName" required>Organization / Company Name</Label>
                  <div className="relative mt-1">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="orgName"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="e.g. Daffodil Health Ltd"
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="domain" required>Business Sector / Domain</Label>
                  <select
                    id="domain"
                    value={businessDomain}
                    onChange={(e) => setBusinessDomain(e.target.value)}
                    className="mt-1 w-full rounded-md border border-dudos-border bg-white px-3 py-2 text-xs text-dudos-text shadow-xs focus:border-dudos-primary focus:outline-none"
                  >
                    <option value="">Select Sector / Domain...</option>
                    <option value="E-Commerce & Digital Business">E-Commerce & Retail</option>
                    <option value="Healthcare & Telemedicine">Healthcare & Clinics</option>
                    <option value="Education & Academy">Education & University</option>
                    <option value="Logistics & Supply Chain">Logistics & Fleet</option>
                    <option value="SaaS & Cloud Operations">SaaS & Platform</option>
                    <option value="Enterprise ERP & Finance">Enterprise Operations & ERP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactName">Your Name</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="contactName"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Dr. Kabir Chowdhury"
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" required>Contact Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. kabir@daffodil.family"
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="siteUrl">Existing Website or Benchmark / Inspiration URL</Label>
                <div className="relative mt-1">
                  <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="siteUrl"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="e.g. https://competitor.com or https://inspiration.design"
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="scope" required>Desired Outcomes & Project Requirements</Label>
                <textarea
                  id="scope"
                  rows={3}
                  value={projectScope}
                  onChange={(e) => setProjectScope(e.target.value)}
                  placeholder="Outline the core functionality: portals, payment integration, user roles, appointment bookings, automated emails..."
                  className="mt-1 w-full rounded-md border border-dudos-border bg-white p-3 text-xs text-dudos-text shadow-xs focus:border-dudos-primary focus:outline-none placeholder:text-gray-400 leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="stack">Preferred Tech Stack</Label>
                  <select
                    id="stack"
                    value={targetStack}
                    onChange={(e) => setTargetStack(e.target.value)}
                    className="mt-1 w-full rounded-md border border-dudos-border bg-white px-2.5 py-1.5 text-xs text-dudos-text shadow-xs"
                  >
                    <option value="">Select Preferred Tech Stack...</option>
                    <option value="Next.js 16 + FastAPI + PostgreSQL">Next.js 16 + FastAPI</option>
                    <option value="React 19 + Node.js + PostgreSQL">React 19 + Node.js</option>
                    <option value="WordPress Headless + Next.js">WordPress Headless</option>
                    <option value="Laravel 11 + Vue 3">Laravel 11 + Vue 3</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="budget">Budget Expectation</Label>
                  <select
                    id="budget"
                    value={budgetExpectation}
                    onChange={(e) => setBudgetExpectation(e.target.value)}
                    className="mt-1 w-full rounded-md border border-dudos-border bg-white px-2.5 py-1.5 text-xs text-dudos-text shadow-xs"
                  >
                    <option value="">Select Budget Expectation...</option>
                    <option value="$2,000 - $5,000">$2,000 – $5,000</option>
                    <option value="$5,000 - $10,000">$5,000 – $10,000</option>
                    <option value="$10,000 - $25,000">$10,000 – $25,000</option>
                    <option value="$25,000+">$25,000+ (Enterprise)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="timeline">Target Launch Window</Label>
                  <select
                    id="timeline"
                    value={expectedTimeline}
                    onChange={(e) => setExpectedTimeline(e.target.value)}
                    className="mt-1 w-full rounded-md border border-dudos-border bg-white px-2.5 py-1.5 text-xs text-dudos-text shadow-xs"
                  >
                    <option value="">Select Target Launch Window...</option>
                    <option value="2 to 4 Weeks">2 to 4 Weeks</option>
                    <option value="4 to 6 Weeks">4 to 6 Weeks</option>
                    <option value="2 to 3 Months">2 to 3 Months</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-dudos-border">
                <span className="text-xs text-dudos-text-secondary flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-teal-600" />
                  <span>Engineering intake & technical architecture assessment.</span>
                </span>

                <Button type="submit" variant="primary" size="default">
                  <span>Save Intake & Continue</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: AUTO / ASSISTED REGISTRATION */}
        {step === "register" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-dudos-border shadow-xs space-y-6 max-w-lg mx-auto">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-dudos-text">
                Create Your Account to Save Draft
              </h2>
              <p className="text-xs text-dudos-text-secondary mt-1">
                Your onboarding data from <strong>{organizationName}</strong> is ready to attach to your dedicated workspace.
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <Label htmlFor="regEmail" required>Email Address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="regEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="regUsername" required>Username</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="regUsername"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. kabir_hospital"
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="regPass" required>Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <PasswordInput
                      id="regPass"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="regConfirm" required>Confirm Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <PasswordInput
                      id="regConfirm"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-dudos-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("intake")}
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="default"
                  isLoading={isSubmitting}
                >
                  <span>Create Account & Feed Draft</span>
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: LOCALSTORAGE DATA FEED TO ACTUAL FORM (SAVED AS DRAFT) */}
        {step === "draft_review" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-dudos-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-dudos-border">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Data Feed Successful • Saved as Active Draft
                </span>
                <h2 className="text-xl font-bold tracking-tight text-dudos-text mt-1.5">
                  Review Fed Draft: {organizationName}
                </h2>
                <p className="text-xs text-dudos-text-secondary mt-0.5">
                  Your intake data has been populated into your official project draft and stored in your private workspace.
                </p>
              </div>

              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                Status: Active Workspace Draft
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <span className="text-gray-500 font-semibold uppercase text-[10px]">Client / Entity</span>
                <p className="font-bold text-sm text-gray-900">{organizationName}</p>
                <p className="text-gray-600">{contactName} ({email})</p>
                <p className="text-teal-800 font-medium">{businessDomain}</p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <span className="text-gray-500 font-semibold uppercase text-[10px]">Architecture & Commercial</span>
                <p className="font-mono text-gray-800">{targetStack}</p>
                <p className="text-gray-600">Budget Range: <strong>{budgetExpectation}</strong></p>
                <p className="text-gray-600">Timeline: <strong>{expectedTimeline}</strong></p>
              </div>
            </div>

            <div>
              <span className="text-gray-500 font-semibold uppercase text-[10px] block mb-1.5">
                Specification Brief Loaded from Local Storage:
              </span>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-xs leading-relaxed">
                {projectScope}
              </div>
            </div>

            {siteUrl && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900">
                <ExternalLink className="h-4 w-4 text-teal-700 shrink-0" />
                <span>Reference URL Attached: <strong>{siteUrl}</strong></span>
              </div>
            )}

            <div className="pt-4 flex items-center justify-between border-t border-dudos-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep("intake")}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Edit Intake Data
              </Button>

              <Button
                type="button"
                variant="primary"
                size="default"
                onClick={handleConfirmDraft}
              >
                <span>Proceed to AI-Guided Q&A Final</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: AI GUIDED QA FINAL -> CONFIRM */}
        {step === "qa_final" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-dudos-border shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-dudos-border">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  AI Requirement Assistant
                </span>
                <h2 className="text-xl font-bold tracking-tight text-dudos-text mt-1.5">
                  AI-Guided Q&A Final Specifications Review
                </h2>
                <p className="text-xs text-dudos-text-secondary mt-0.5">
                  Our system analyzed your draft scope. Please confirm these 3 targeted architecture questions before freezing requirements.
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 text-teal-900 font-semibold text-xs border border-teal-200">
                <Coins className="h-4 w-4 text-amber-500" />
                <span>{user?.credits ?? 0} Credits Active</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  <HelpCircle className="h-4 w-4 text-dudos-primary" />
                  <span>Q1: Multi-Tenancy & Data Isolation Model</span>
                </div>
                <Input
                  value={qaAnswers.multiTenant || ""}
                  onChange={(e) => setQaAnswers({ ...qaAnswers, multiTenant: e.target.value })}
                  placeholder="Specify tenancy requirement (e.g. Dedicated tenant isolation, single-tenant, or multi-tenant database)"
                  className="text-xs bg-white"
                />
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  <HelpCircle className="h-4 w-4 text-dudos-primary" />
                  <span>Q2: Payment Gateways & Banking Integrations</span>
                </div>
                <Input
                  value={qaAnswers.paymentMethods || ""}
                  onChange={(e) => setQaAnswers({ ...qaAnswers, paymentMethods: e.target.value })}
                  placeholder="Specify payment gateways (e.g. bKash, Nagad, cards / SSLCommerz, Stripe)"
                  className="text-xs bg-white"
                />
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  <HelpCircle className="h-4 w-4 text-dudos-primary" />
                  <span>Q3: Expected User Volume & Scalability</span>
                </div>
                <Input
                  value={qaAnswers.userVolume || ""}
                  onChange={(e) => setQaAnswers({ ...qaAnswers, userVolume: e.target.value })}
                  placeholder="Specify expected user volume & concurrency (e.g. 5,000 - 20,000 active monthly users)"
                  className="text-xs bg-white"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-dudos-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep("draft_review")}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back to Draft
              </Button>

              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleFinalSpecificationConfirm}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                <span>Confirm & Send to Technical Estimation</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
