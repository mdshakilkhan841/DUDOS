/**
 * Source files a client attaches to an assessment (logos, documents, data sheets).
 *
 * Stored by the DUDOS API against the assessment record and handed to the builder
 * with the paid project. Limits and accepted types come from the API
 * (`/files/config`, the builder's own project-file rules) — never hard-code them here.
 */
import { API_BASE, authHeaders } from "@/lib/dudos/packages";

export type FileConfig = {
    maxCount: number;
    maxFileMb: number;
    maxTotalMb: number;
    allowedExtensions: string[];
    purposes: string[];
};

export type ClientFile = {
    id: string;
    name: string;
    extension: string;
    sizeBytes: number;
    purpose: string;
    createdAt: string;
    sentToBuilder: boolean;
    duplicate?: boolean;
};

export type UploadResult = { files: ClientFile[]; rejected: { name: string; error: string }[] };

async function read<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = (body as { detail?: unknown })?.detail;
        throw new Error(typeof detail === "string" ? detail : `Request failed (${res.status}).`);
    }
    return body as T;
}

export async function getFileConfig(): Promise<FileConfig> {
    return read(await fetch(`${API_BASE}/files/config`, { headers: authHeaders(), cache: "no-store" }));
}

export async function listFiles(recordId: string): Promise<{ files: ClientFile[]; totalBytes: number }> {
    return read(
        await fetch(`${API_BASE}/files?recordId=${encodeURIComponent(recordId)}`, {
            headers: authHeaders(),
            cache: "no-store",
        }),
    );
}

/** One file per request: keeps each request under the per-file limit and lets the UI show progress per file. */
export async function uploadFile(recordId: string, file: File): Promise<UploadResult> {
    const form = new FormData();
    form.append("recordId", recordId);
    form.append("files", file);
    return read(await fetch(`${API_BASE}/files`, { method: "POST", headers: authHeaders(), body: form }));
}

export async function deleteFile(id: string): Promise<void> {
    await read(await fetch(`${API_BASE}/files/${encodeURIComponent(id)}`, { method: "DELETE", headers: authHeaders() }));
}

/** Downloads need the bearer token, so fetch the bytes and save them rather than linking. */
export async function downloadFile(file: Pick<ClientFile, "id" | "name">, admin = false): Promise<void> {
    const path = admin ? `/admin/files/${encodeURIComponent(file.id)}/download` : `/files/${encodeURIComponent(file.id)}/download`;
    const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
    if (!res.ok) await read(res);
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
}

/** The generated app's source code (.zip), available to its owner once the build is ready. */
export async function downloadProjectSource(projectId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/source.zip`, {
        headers: authHeaders(),
    });
    if (!res.ok) await read(res);
    const disposition = res.headers.get("content-disposition") || "";
    const name = /filename="([^"]+)"/.exec(disposition)?.[1] || "source-code.zip";
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
}

export async function listProjectFiles(projectId: string): Promise<{ files: ClientFile[]; totalBytes: number }> {
    return read(
        await fetch(`${API_BASE}/admin/projects/${encodeURIComponent(projectId)}/files`, {
            headers: authHeaders(),
            cache: "no-store",
        }),
    );
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const PURPOSE_LABELS: Record<string, string> = {
    asset: "Used in the site",
    content: "Content to use",
    reference: "Reference only",
};
