import type { JSX } from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { getAccessToken } from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";

/**
 * A small square photo control for a student (used on the edit form). Shows the
 * photo if set (or initials), lets an editor upload/remove. The transcript uses
 * this photo when printing.
 */
export function StudentPhoto({ studentId, firstName, lastName, canEdit }: {
  studentId: string; firstName: string; lastName: string; canEdit: boolean;
}): JSX.Element {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bust, setBust] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/students/${studentId}/photo?b=${bust}`, {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` }, credentials: "include",
      });
      if (!res.ok) { setFailed(true); return; }
      setSrc(URL.createObjectURL(await res.blob())); setFailed(false);
    } catch { setFailed(true); }
  }, [studentId, bust]);

  useEffect(() => { void load(); }, [load]);

  async function upload(file: File): Promise<void> {
    setBusy(true);
    try {
      const form = new FormData(); form.append("file", file);
      const res = await fetch(`/api/v1/students/${studentId}/photo`, {
        method: "POST", headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` }, credentials: "include", body: form,
      });
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.error?.message ?? "Upload failed."); }
      toast.success("Photo updated."); setBust((b) => b + 1); await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed."); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }
  async function remove(): Promise<void> {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/students/${studentId}/photo`, { method: "DELETE", headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` }, credentials: "include" });
      if (!res.ok && res.status !== 204) throw new Error();
      setSrc(null); setFailed(true); toast.success("Photo removed.");
    } catch { toast.error("Could not remove the photo."); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16">
        {src && !failed ? (
          <img src={src} alt="Student" className="h-16 w-16 rounded-lg object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-100 text-lg font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">{firstName[0]}{lastName[0]}</div>
        )}
        {busy && <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40"><Loader2 className="h-4 w-4 animate-spin text-white" /></div>}
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700"><Camera className="h-3.5 w-3.5" /> Upload</button>
          {src && !failed && <button type="button" onClick={remove} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-slate-700"><X className="h-3.5 w-3.5" /> Remove</button>}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
        </div>
      )}
    </div>
  );
}
