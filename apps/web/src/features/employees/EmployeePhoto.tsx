import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, X } from "lucide-react";
import { getAccessToken } from "@/lib/api-client";
import { useToast } from "@/components/toast/ToastProvider";

/**
 * Shows an employee's portrait (or initials if none). Editors can upload a new
 * photo or remove it. The image is fetched from the authenticated photo
 * endpoint into a blob URL. A cache-busting counter forces a refresh on change.
 */
export function EmployeePhoto({
  employeeId,
  firstName,
  lastName,
  canEdit,
  size = 64,
}: {
  employeeId: string;
  firstName: string;
  lastName: string;
  canEdit: boolean;
  size?: number;
}): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [bust, setBust] = useState(0);
  const [failed, setFailed] = useState(false);

  const [src, setSrc] = useState<string | null>(null);

  const loadPhoto = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/v1/employees/${employeeId}/photo?b=${bust}`, {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
        credentials: "include",
      });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      const blob = await res.blob();
      setSrc(URL.createObjectURL(blob));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [employeeId, bust]);

  // Load the photo as a blob URL (needs the auth header) on mount / id change.
  useEffect(() => {
    void loadPhoto();
  }, [loadPhoto]);

  async function upload(file: File): Promise<void> {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/v1/employees/${employeeId}/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
        throw new Error(j?.error?.message ?? "Upload failed.");
      }
      toast.success("Photo updated.");
      setBust((b) => b + 1);
      await loadPhoto();
      void qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(): Promise<void> {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/employees/${employeeId}/photo`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error("Remove failed.");
      setSrc(null);
      setFailed(true);
      toast.success("Photo removed.");
      void qc.invalidateQueries({ queryKey: ["employees"] });
    } catch {
      toast.error("Could not remove the photo.");
    } finally {
      setBusy(false);
    }
  }

  const dim = { width: size, height: size };

  return (
    <div className="group relative" style={dim}>
      {src && !failed ? (
        <img
          src={src}
          alt={`${firstName} ${lastName}`}
          className="rounded-full object-cover"
          style={dim}
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-100"
          style={{ ...dim, fontSize: size / 3 }}
        >
          {firstName[0]}
          {lastName[0]}
        </div>
      )}

      {busy && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
      )}

      {canEdit && !busy && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow hover:bg-brand-700 dark:border-slate-900"
            aria-label="Change photo"
            title="Change photo"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          {src && !failed && (
            <button
              type="button"
              onClick={remove}
              className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow hover:bg-red-600 dark:border-slate-900"
              aria-label="Remove photo"
              title="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
        </>
      )}
    </div>
  );
}
