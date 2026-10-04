"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/dudos-ui";
import {
    ClientFile,
    FileConfig,
    PURPOSE_LABELS,
    deleteFile,
    downloadFile,
    formatBytes,
    getFileConfig,
    listFiles,
    uploadFile,
} from "@/lib/dudos/files";

type QueueItem = { key: string; name: string; state: "waiting" | "uploading" | "done" | "error"; error?: string };

/**
 * Multi-file upload for an assessment: pick or drop several files, see the limits,
 * the progress of each file and what is already attached. Files belong to the
 * assessment record; the record is saved first if it does not exist yet.
 */
export function AssessmentFiles({
    recordId,
    ensureRecordId,
    lang,
}: {
    recordId?: string;
    ensureRecordId: () => Promise<string | null>;
    lang: string;
}) {
    const bn = lang === "bn";
    const [config, setConfig] = useState<FileConfig | null>(null);
    const [files, setFiles] = useState<ClientFile[]>([]);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [error, setError] = useState("");
    const [dragging, setDragging] = useState(false);
    const [busy, setBusy] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        getFileConfig()
            .then(setConfig)
            .catch((e) => setError((e as Error).message));
    }, []);

    const refresh = useCallback(async (id: string) => {
        const res = await listFiles(id);
        setFiles(res.files);
    }, []);

    useEffect(() => {
        if (!recordId) return;
        let active = true;
        listFiles(recordId)
            .then((res) => active && setFiles(res.files))
            .catch((e) => active && setError((e as Error).message));
        return () => {
            active = false;
        };
    }, [recordId]);

    const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);

    async function addFiles(picked: File[]) {
        if (!config || !picked.length || busy) return;
        setError("");
        const allowed = new Set(config.allowedExtensions);
        const problems: string[] = [];
        const accepted: File[] = [];
        let count = files.length;
        let total = totalBytes;
        for (const file of picked) {
            const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
            if (!allowed.has(ext)) {
                problems.push(`${file.name}: ${bn ? "এই ধরনের ফাইল গ্রহণযোগ্য নয়" : "this file type is not accepted"}.`);
            } else if (file.size === 0) {
                problems.push(`${file.name}: ${bn ? "ফাইলটি খালি" : "the file is empty"}.`);
            } else if (file.size > config.maxFileMb * 1024 * 1024) {
                problems.push(`${file.name}: ${bn ? "সর্বোচ্চ" : "larger than"} ${config.maxFileMb} MB.`);
            } else if (count >= config.maxCount) {
                problems.push(`${file.name}: ${bn ? "সর্বোচ্চ" : "at most"} ${config.maxCount} ${bn ? "টি ফাইল" : "files per assessment"}.`);
            } else if (total + file.size > config.maxTotalMb * 1024 * 1024) {
                problems.push(`${file.name}: ${bn ? "মোট সীমা" : "would exceed the"} ${config.maxTotalMb} MB ${bn ? "ছাড়িয়ে যাবে" : "total"}.`);
            } else {
                accepted.push(file);
                count += 1;
                total += file.size;
            }
        }
        if (problems.length) setError(problems.join(" "));
        if (!accepted.length) return;

        setBusy(true);
        const items: QueueItem[] = accepted.map((f, i) => ({ key: `${Date.now()}-${i}`, name: f.name, state: "waiting" }));
        setQueue(items);
        try {
            const id = recordId || (await ensureRecordId());
            if (!id) {
                setError(bn ? "ফাইল যুক্ত করার আগে মূল্যায়নটি সংরক্ষণ করুন।" : "Save the assessment before attaching files.");
                setQueue([]);
                return;
            }
            const update = (key: string, patch: Partial<QueueItem>) =>
                setQueue((q) => q.map((item) => (item.key === key ? { ...item, ...patch } : item)));
            for (let i = 0; i < accepted.length; i++) {
                update(items[i].key, { state: "uploading" });
                try {
                    const res = await uploadFile(id, accepted[i]);
                    const refused = res.rejected[0]?.error;
                    update(items[i].key, refused ? { state: "error", error: refused } : { state: "done" });
                } catch (e) {
                    update(items[i].key, { state: "error", error: (e as Error).message });
                }
            }
            await refresh(id);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
            if (input.current) input.current.value = "";
        }
    }

    async function remove(file: ClientFile) {
        try {
            await deleteFile(file.id);
            setFiles((list) => list.filter((f) => f.id !== file.id));
        } catch (e) {
            setError((e as Error).message);
        }
    }

    const accept = config ? config.allowedExtensions.map((e) => "." + e).join(",") : undefined;
    const failed = queue.filter((q) => q.state === "error");

    return (
        <section className="space-y-3" aria-label={bn ? "উৎস ফাইল" : "Source files"}>
            <div>
                <p className="font-medium">{bn ? "উৎস ফাইল (ঐচ্ছিক)" : "Source files (optional)"}</p>
                <p className="text-sm text-muted-foreground">
                    {bn
                        ? "লোগো, ছবি, ব্র্যান্ড গাইড, কনটেন্ট বা ডেটা শিট যুক্ত করুন — প্রকল্প তৈরির সময় এগুলো ব্যবহার করা হবে।"
                        : "Attach logos, photos, brand guides, content or data sheets — the build uses them."}
                    {config && (
                        <>
                            {" "}
                            {bn ? "সর্বোচ্চ" : "Up to"} {config.maxCount} {bn ? "টি ফাইল" : "files"}, {config.maxFileMb} MB{" "}
                            {bn ? "প্রতিটি" : "each"}, {config.maxTotalMb} MB {bn ? "মোট" : "total"} ·{" "}
                            {config.allowedExtensions.map((e) => e.toUpperCase()).join(", ")}
                        </>
                    )}
                </p>
            </div>

            <div
                role="button"
                tabIndex={0}
                aria-disabled={!config || busy}
                onClick={() => !busy && input.current?.click()}
                onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !busy) {
                        e.preventDefault();
                        input.current?.click();
                    }
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    void addFiles(Array.from(e.dataTransfer.files));
                }}
                className={
                    "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors " +
                    (dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/60")
                }
            >
                {busy ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                <p className="text-sm">
                    {busy
                        ? bn
                            ? "আপলোড হচ্ছে…"
                            : "Uploading…"
                        : bn
                          ? "ফাইল এখানে টেনে আনুন, অথবা ক্লিক করে একাধিক ফাইল বেছে নিন"
                          : "Drag files here, or click to choose several at once"}
                </p>
                <input
                    ref={input}
                    type="file"
                    multiple
                    hidden
                    accept={accept}
                    aria-label={bn ? "উৎস ফাইল বেছে নিন" : "Choose source files"}
                    onChange={(e) => void addFiles(Array.from(e.target.files || []))}
                />
            </div>

            {error && <Notice tone="error">{error}</Notice>}
            {queue.length > 0 && (
                <ul className="space-y-1 text-sm" aria-live="polite">
                    {queue.map((q) => (
                        <li key={q.key} className="flex items-center gap-2">
                            {q.state === "uploading" || q.state === "waiting" ? (
                                <Loader2 size={14} className={q.state === "uploading" ? "animate-spin" : "opacity-40"} />
                            ) : q.state === "done" ? (
                                <CheckCircle2 size={14} className="text-emerald-600" />
                            ) : (
                                <span className="text-red-600">✕</span>
                            )}
                            <span className="truncate">{q.name}</span>
                            {q.error && <span className="text-red-600">— {q.error}</span>}
                        </li>
                    ))}
                </ul>
            )}
            {failed.length > 0 && !busy && (
                <p className="text-sm text-muted-foreground">
                    {bn ? "ব্যর্থ ফাইলগুলো ঠিক করে আবার যুক্ত করুন।" : "Fix the files marked ✕ and add them again."}
                </p>
            )}

            {files.length > 0 && (
                <ul className="divide-y rounded-lg border">
                    {files.map((f) => (
                        <li key={f.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                            <FileText size={16} className="shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate" title={f.name}>
                                {f.name}
                            </span>
                            <span className="shrink-0 text-muted-foreground">{formatBytes(f.sizeBytes)}</span>
                            <span className="hidden shrink-0 text-muted-foreground sm:inline">
                                {PURPOSE_LABELS[f.purpose] || f.purpose}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={(bn ? "ডাউনলোড " : "Download ") + f.name}
                                onClick={() => void downloadFile(f).catch((e) => setError((e as Error).message))}
                            >
                                <Download size={16} />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={f.sentToBuilder}
                                title={f.sentToBuilder ? (bn ? "বিল্ডারে পাঠানো হয়েছে" : "Already sent to the builder") : undefined}
                                aria-label={(bn ? "মুছুন " : "Remove ") + f.name}
                                onClick={() => void remove(f)}
                            >
                                <Trash2 size={16} />
                            </Button>
                        </li>
                    ))}
                    <li className="px-3 py-2 text-xs text-muted-foreground">
                        {files.length}
                        {config ? ` / ${config.maxCount}` : ""} {bn ? "টি ফাইল" : "files"} · {formatBytes(totalBytes)}
                        {config ? ` / ${config.maxTotalMb} MB` : ""}
                    </li>
                </ul>
            )}
        </section>
    );
}
