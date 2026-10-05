"use client";

import { useState } from "react";
import { Check, Download, ExternalLink, Loader2, Wrench } from "lucide-react";
import { downloadProjectSource } from "@/lib/dudos/files";
import { AppLoginDetails } from "./AppLoginDetails";

/** The builder's progress as the backend summarises it for clients. */
export type ClientBuild = {
    phase: "queued" | "planning" | "building" | "testing" | "preview" | "attention";
    phaseIndex: number | null;
    phases: { key: string; label: string }[];
    label: string;
    progress: number;
    ready: boolean;
    updatedAt?: string | null;
};

const BN_LABELS: Record<string, string> = {
    queued: "সারিতে আছে",
    planning: "পরিকল্পনা",
    building: "তৈরি হচ্ছে",
    testing: "পরীক্ষা",
    preview: "প্রিভিউ প্রস্তুত",
};

/**
 * Where the AI builder is with the client's project: five phases from queue to
 * preview. A failed build reads as the team being on it; details stay with them.
 */
export function BuildProgress({
    build,
    previewUrl,
    projectId,
    lang,
}: {
    build?: ClientBuild | null;
    previewUrl?: string | null;
    /** When given and the build is ready, the client can download the source code. */
    projectId?: string | null;
    lang: string;
}) {
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState("");
    if (!build) return null;
    const bn = lang === "bn";

    async function downloadSource() {
        if (!projectId) return;
        setDownloading(true);
        setDownloadError("");
        try {
            await downloadProjectSource(projectId);
        } catch (e) {
            setDownloadError((e as Error).message);
        } finally {
            setDownloading(false);
        }
    }

    if (build.phase === "attention") {
        return (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <Wrench className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                    {bn
                        ? "বিল্ডে একটি সমস্যা হয়েছে। আমাদের টিম এটি ঠিক করছে; আপনাকে কিছু করতে হবে না।"
                        : "Our team is reviewing an issue with your build and will continue it. No action is needed from you."}
                </p>
            </div>
        );
    }

    const current = build.phaseIndex ?? 0;
    return (
        <div className="rounded-lg border border-dudos-border bg-[#f8fafb] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <p className="flex items-center gap-1.5 font-semibold text-dudos-text">
                    {build.ready ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-dudos-primary" />
                    )}
                    {bn ? "বিল্ডের অগ্রগতি" : "Build progress"}: {bn ? BN_LABELS[build.phase] || build.label : build.label}
                </p>
                {build.ready ? (
                    <span className="flex flex-wrap items-center gap-3">
                        {previewUrl && (
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-dudos-primary hover:underline"
                            >
                                {bn ? "প্রিভিউ দেখুন" : "Open preview"}
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                        {projectId && (
                            <button
                                type="button"
                                onClick={() => void downloadSource()}
                                disabled={downloading}
                                className="inline-flex items-center gap-1 font-semibold text-dudos-primary hover:underline disabled:opacity-60"
                            >
                                {downloading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Download className="h-3 w-3" />
                                )}
                                {bn ? "কোড ডাউনলোড (.zip)" : "Download code (.zip)"}
                            </button>
                        )}
                    </span>
                ) : (
                    <span className="text-dudos-text-secondary">{build.progress || 0}%</span>
                )}
            </div>
            {downloadError && <p className="mt-2 text-xs text-red-600">{downloadError}</p>}
            {build.ready && projectId && <AppLoginDetails projectId={projectId} lang={lang} />}
            <ol className="mt-2.5 grid grid-cols-5 gap-1">
                {build.phases.map((phase, index) => {
                    const done = index < current || (build.ready && index === current);
                    const active = index === current && !build.ready;
                    return (
                        <li key={phase.key} className="min-w-0" aria-current={active ? "step" : undefined}>
                            <div
                                className={`h-1 rounded-full ${
                                    done ? "bg-emerald-500" : active ? "bg-dudos-primary" : "bg-slate-200"
                                }`}
                            />
                            <p
                                className={`mt-1 truncate text-[10px] ${
                                    done
                                        ? "text-emerald-700"
                                        : active
                                          ? "font-semibold text-dudos-text"
                                          : "text-slate-400"
                                }`}
                            >
                                {bn ? BN_LABELS[phase.key] || phase.label : phase.label}
                            </p>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
