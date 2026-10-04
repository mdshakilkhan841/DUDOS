"use client";

import React, { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientFile, PURPOSE_LABELS, downloadFile, formatBytes, listProjectFiles } from "@/lib/dudos/files";

/** The source files the client attached to this project's assessment. Render with key={projectId}. */
export function AdminProjectFiles({ projectId }: { projectId: string }) {
    const [files, setFiles] = useState<ClientFile[] | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        listProjectFiles(projectId)
            .then((res) => active && setFiles(res.files))
            .catch((e) => active && setError((e as Error).message));
        return () => {
            active = false;
        };
    }, [projectId]);

    const total = (files || []).reduce((sum, f) => sum + f.sizeBytes, 0);

    return (
        <div className="space-y-2 rounded-lg border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Client files{files && files.length > 0 ? ` · ${files.length} · ${formatBytes(total)}` : ""}
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {!error && files === null && <p className="text-sm text-muted-foreground">Loading…</p>}
            {files && files.length === 0 && (
                <p className="text-sm text-muted-foreground">The client attached no files to this assessment.</p>
            )}
            {files && files.length > 0 && (
                <ul className="divide-y text-sm">
                    {files.map((f) => (
                        <li key={f.id} className="flex items-center gap-2 py-1.5">
                            <FileText size={14} className="shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate" title={f.name}>
                                {f.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {formatBytes(f.sizeBytes)} · {PURPOSE_LABELS[f.purpose] || f.purpose}
                                {f.sentToBuilder ? " · sent to builder" : ""}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Download ${f.name}`}
                                onClick={() => void downloadFile(f, true).catch((e) => setError((e as Error).message))}
                            >
                                <Download size={14} />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
