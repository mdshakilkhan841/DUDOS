"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { AppCredentials, getAppCredentials } from "@/lib/dudos/files";

/**
 * The generated app's admin login, revealed on request. Held in component state
 * only — never stored — and the password stays masked until the client shows it.
 */
export function AppLoginDetails({ projectId, lang }: { projectId: string; lang: string }) {
    const bn = lang === "bn";
    const [creds, setCreds] = useState<AppCredentials | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState("");

    async function load() {
        setBusy(true);
        setError("");
        try {
            setCreds(await getAppCredentials(projectId));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }

    function copy(label: string, value: string) {
        void navigator.clipboard.writeText(value).then(() => {
            setCopied(label);
            setTimeout(() => setCopied(""), 1500);
        });
    }

    if (!creds) {
        return (
            <div className="mt-2">
                <button
                    type="button"
                    onClick={() => void load()}
                    disabled={busy}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-dudos-primary hover:underline disabled:opacity-60"
                >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />}
                    {bn ? "অ্যাপের লগইন তথ্য দেখুন" : "Show app login details"}
                </button>
                {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </div>
        );
    }

    const row = (label: string, value: string, masked = false) => (
        <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-dudos-text-secondary">{label}</span>
            <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 font-mono text-dudos-text">
                {masked && !showPassword ? "•".repeat(Math.min(value.length, 14)) : value}
            </code>
            {masked && (
                <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? (bn ? "পাসওয়ার্ড লুকান" : "Hide password") : bn ? "পাসওয়ার্ড দেখুন" : "Show password"}
                    className="text-dudos-text-secondary hover:text-dudos-text"
                >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
            )}
            <button
                type="button"
                onClick={() => copy(label, value)}
                aria-label={(bn ? "কপি করুন: " : "Copy ") + label}
                className="text-dudos-text-secondary hover:text-dudos-text"
            >
                {copied === label ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
        </div>
    );

    return (
        <div className="mt-2.5 space-y-1.5 rounded-lg border border-dudos-border bg-[#f1f6f7] p-3 text-xs">
            <p className="flex items-center gap-1.5 font-semibold text-dudos-text">
                <KeyRound className="h-3.5 w-3.5" />
                {bn ? "অ্যাপের অ্যাডমিন লগইন" : "Your app's admin login"}
            </p>
            {creds.appUrl && row(bn ? "অ্যাপ" : "App", creds.appUrl)}
            {row(bn ? "ব্যবহারকারী" : "Username", creds.username)}
            {row(bn ? "পাসওয়ার্ড" : "Password", creds.password, true)}
            <p className="text-dudos-text-secondary">
                {bn
                    ? "প্রথম লগইনের পর পাসওয়ার্ড পরিবর্তন করুন এবং কারও সাথে শেয়ার করবেন না।"
                    : "Change this password after you first sign in, and keep it private."}
            </p>
        </div>
    );
}
