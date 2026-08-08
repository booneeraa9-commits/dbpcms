import type { JSX } from "react";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Download, Trash2, FileText, Loader2 } from "lucide-react";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  MAX_UPLOAD_BYTES,
} from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { getAccessToken } from "@/lib/api-client";

interface DocItem {
  id: string;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsTab({ employeeId }: { employeeId: string }): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpload = hasPermission("document:upload");
  const canDelete = hasPermission("document:delete");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DocItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const queryKey = ["documents", employeeId];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/v1/employees/${employeeId}/documents`, {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load documents");
      const json = (await res.json()) as { data: DocItem[] };
      return json.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file.");
      if (!docType) throw new Error("Choose a document type.");
      if (file.size > MAX_UPLOAD_BYTES) throw new Error("File exceeds the 10 MB limit.");
      const form = new FormData();
      form.append("documentType", docType);
      form.append("file", file);
      const res = await fetch(`/api/v1/employees/${employeeId}/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
        credentials: "include",
        body: form,
      });
      const json = (await res.json().catch(() => null)) as
        | { success: boolean; error?: { message: string } }
        | null;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "Upload failed.");
      }
    },
    onSuccess: () => {
      toast.success("Document uploaded.");
      setUploadOpen(false);
      setFile(null);
      setDocType("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      void qc.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/employees/${employeeId}/documents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error("Delete failed.");
    },
    onSuccess: () => {
      toast.success("Document deleted.");
      setDeleting(null);
      void qc.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => { toast.error(err.message); setDeleting(null); },
  });

  async function download(doc: DocItem): Promise<void> {
    setDownloadingId(doc.id);
    try {
      const res = await fetch(
        `/api/v1/employees/${employeeId}/documents/${doc.id}/download`,
        {
          headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Download failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download the file.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900">Documents</h3>
        {canUpload && (
          <Button onClick={() => { setFormError(null); setUploadOpen(true); }}>
            <Upload className="h-4 w-4" /> Upload document
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      )}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load documents.{" "}
          <button className="font-medium underline" onClick={() => void refetch()}>Retry</button>
        </div>
      )}
      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-500">
          No documents uploaded yet.
        </div>
      )}

      {!isLoading && !isError && (data?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data!.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{doc.originalFilename}</p>
                <p className="text-xs text-slate-500">
                  {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType} · {formatSize(doc.sizeBytes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void download(doc)}
                disabled={downloadingId === doc.id}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                aria-label="Download"
              >
                {downloadingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setDeleting(doc)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={uploadOpen} title="Upload document" onClose={() => setUploadOpen(false)}>
        <div className="space-y-4">
          <div>
            <label htmlFor="docType" className="mb-1 block text-sm font-medium text-slate-700">Document type</label>
            <select
              id="docType"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Select…</option>
              {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="fileInput" className="mb-1 block text-sm font-medium text-slate-700">File</label>
            <input
              id="fileInput"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
            <p className="mt-1 text-xs text-slate-500">
              PDF, DOCX, XLSX, JPG, PNG · up to 10 MB · images are auto-compressed.
            </p>
          </div>
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button loading={uploadMutation.isPending} onClick={() => { setFormError(null); uploadMutation.mutate(); }}>Upload</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete document"
        message={`Delete "${deleting?.originalFilename}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}
