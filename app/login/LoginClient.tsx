"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/dudos-ui";
import { useAuth } from "@/context/auth-context";
import { buildSubdomainUrl, SubdomainType } from "@/lib/subdomains";

import { showToast } from "@/lib/toast";

const HIGHLIGHTS = [
  "Save drafts and send requests to DUDOS",
  "Track replies in one place",
  "Invite your team to a shared workspace",
];

export function LoginClient({
  initialMode = "signin",
  returnTo = "/",
}: {
  initialMode?: "signin" | "signup";
  returnTo?: string;
}) {
  const pathname = usePathname();
  const isRegisterPath = pathname.includes("/register") || initialMode === "signup";
  const [mode, setMode] = useState<"signin" | "signup">(isRegisterPath ? "signup" : "signin");

  useEffect(() => {
    if (pathname.includes("/register")) {
      setMode("signup");
    } else if (pathname.includes("/login")) {
      setMode("signin");
    } else {
      setMode(initialMode);
    }
  }, [pathname, initialMode]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login, register, logout } = useAuth();

  // Dismiss any lingering toasts and ensure clean unauthenticated state on login/register page
  useEffect(() => {
    showToast.dismiss();
    logout();
  }, [logout]);


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (mode === "signin") {
        const result = await login(email, password);
        if (!result) throw new Error("Sign-in failed. Please check your credentials.");

        const targetSubdomain: SubdomainType = result.user.role === "admin" ? "admin" : "app";
        const defaultPath = result.user.role === "admin" ? "/en/app/tenant-admin" : "/en/app";

        let cleanReturnTo = returnTo;
        if (cleanReturnTo && (cleanReturnTo.includes("/login") || cleanReturnTo.includes("/register") || cleanReturnTo === "/")) {
          cleanReturnTo = "";
        }
        const dest = cleanReturnTo || defaultPath;

        let targetUrl: URL;
        if (dest.startsWith("http")) {
          const parsed = new URL(dest);
          const cleanPathAndQuery = parsed.pathname + parsed.search;
          targetUrl = new URL(buildSubdomainUrl(targetSubdomain, cleanPathAndQuery));
        } else {
          targetUrl = new URL(buildSubdomainUrl(targetSubdomain, dest));
        }

        // Clean out any existing duplicate dudos_ tokens
        targetUrl.searchParams.delete("dudos_at");
        targetUrl.searchParams.delete("dudos_session");

        targetUrl.searchParams.set("dudos_at", result.token);
        targetUrl.searchParams.set("dudos_session", JSON.stringify(result.user));

        window.location.replace(targetUrl.toString());
        return;
      } else {
        const regResult = await register({
          email,
          displayName,
          password,
          role: "client",
        });
        if (!regResult) throw new Error("Registration failed. Please try again.");

        const targetUrl = new URL(buildSubdomainUrl("app", "/en/app"));
        targetUrl.searchParams.delete("dudos_at");
        targetUrl.searchParams.delete("dudos_session");
        targetUrl.searchParams.set("dudos_at", regResult.token);
        targetUrl.searchParams.set("dudos_session", JSON.stringify(regResult.user));
        window.location.replace(targetUrl.toString());
        return;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Left — brand panel, hidden on small screens */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#087f79] px-14 py-12 text-white md:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-black/15 blur-3xl"
        />

        <a href="/" className="relative z-10 flex items-center gap-2 text-lg font-semibold text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-xl font-bold text-white shadow-sm">
            D
          </span>
          <span className="text-white">
            DUDOS<span className="text-white/70">.</span>
          </span>
        </a>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
            Your digital work,<br />organized in one workspace.
          </h1>
          <p
            className="mt-4 text-white/90 text-sm sm:text-base leading-relaxed font-normal"
            style={{ color: "rgba(255, 255, 255, 0.92)" }}
          >
            Sign in to manage drafts, track requests and collaborate with your team — all under your own account.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-white/95 text-sm">
                <CheckCircle2 className="h-5 w-5 flex-none text-white/85" />
                <span style={{ color: "rgba(255, 255, 255, 0.95)" }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p
          className="relative z-10 text-sm text-white/75"
          style={{ color: "rgba(255, 255, 255, 0.75)" }}
        >
          © {new Date().getFullYear()} DUDOS
        </p>
      </div>

      {/* Right — the actual sign-in / sign-up form */}
      <div className="flex w-full flex-1 flex-col justify-center bg-white px-6 py-12 sm:px-12 md:w-1/2">
        <div className="mx-auto w-full max-w-sm">
          <a href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold md:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#087f79] text-xl font-bold text-white">
              D
            </span>
            <span className="text-[#162c38]">
              DUDOS<span className="text-[#087f79]">.</span>
            </span>
          </a>

          <h2 className="text-2xl font-semibold tracking-tight text-[#162c38]">
            {mode === "signin" ? "Sign in to your workspace" : "Create your DUDOS account"}
          </h2>
          <p className="mt-2 text-sm text-[#5b6f7b]">
            {mode === "signin"
              ? "Use the email and password for your DUDOS account."
              : "Set up an account to save drafts and send requests."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="display-name" className="text-[#162c38]">Full name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  maxLength={120}
                  className="bg-white border-[#dce5e9] text-[#162c38] focus-visible:border-[#087f79] focus-visible:ring-[#087f79]/20"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#162c38]">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={254}
                autoComplete="email"
                className="bg-white border-[#dce5e9] text-[#162c38] focus-visible:border-[#087f79] focus-visible:ring-[#087f79]/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#162c38]">Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={200}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="bg-white border-[#dce5e9] text-[#162c38] focus-visible:border-[#087f79] focus-visible:ring-[#087f79]/20"
              />
              {mode === "signup" && (
                <p className="text-xs text-[#5b6f7b]">At least 8 characters.</p>
              )}
            </div>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-[#162c38]">Confirm password</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={200}
                  autoComplete="new-password"
                  aria-invalid={confirmPassword.length > 0 && confirmPassword !== password}
                  className="bg-white border-[#dce5e9] text-[#162c38] focus-visible:border-[#087f79] focus-visible:ring-[#087f79]/20"
                />
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <p className="text-xs text-red-600">The passwords do not match.</p>
                )}
              </div>
            )}
            {error && <Notice tone="error">{error}</Notice>}
            <Button
              disabled={busy}
              type="submit"
              className="w-full bg-[#087f79] hover:bg-[#076e68] text-white font-medium shadow-sm transition-colors cursor-pointer"
            >
              {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-[#5b6f7b]">
            {mode === "signin" ? (
              <>
                No account yet?{" "}
                <Link
                  href={returnTo && returnTo !== "/app" ? `/register?return_to=${encodeURIComponent(returnTo)}` : "/register"}
                  className="font-medium text-[#087f79] hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Create one
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  href={returnTo && returnTo !== "/app" ? `/login?return_to=${encodeURIComponent(returnTo)}` : "/login"}
                  className="font-medium text-[#087f79] hover:underline"
                  onClick={() => setMode("signin")}
                >
                  Sign in
                </Link>
              </>
            )}
          </p>

          <a href="/" className="mt-10 inline-flex items-center gap-1 text-sm text-[#5b6f7b] hover:text-[#162c38] transition-colors">
            Back to DUDOS <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default LoginClient;
