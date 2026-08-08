import type { JSX } from "react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2 } from "lucide-react";
import { changePasswordSchema } from "@dbpcms/shared";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "./AuthContext";
import { PasswordInput } from "@/components/ui/PasswordInput";

/**
 * Lets a user set a new password. Shown automatically when the account is
 * flagged mustChangePassword (e.g. the seeded admin's first login).
 * Uses the SHARED password policy schema so rules match the backend exactly.
 */
export function ChangePasswordPage(): JSX.Element {
  const navigate = useNavigate();
  const { refreshUser, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/auth/change-password", parsed.data);
      // Password change invalidates the session server-side; require re-login.
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.details) {
        const errs: Record<string, string> = {};
        for (const d of error.details) errs[d.field] = d.message;
        setFieldErrors(errs);
      }
      setFormError(
        error instanceof ApiError ? error.message : "Could not change password.",
      );
    } finally {
      setSubmitting(false);
    }
    // refreshUser kept for API symmetry; not strictly needed after logout.
    void refreshUser;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900">
            Set a new password
          </h1>
          <p className="text-sm text-slate-500">
            For your security, choose a new password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {[
            {
              id: "currentPassword",
              label: "Current password",
              value: currentPassword,
              set: setCurrentPassword,
              autoComplete: "current-password",
            },
            {
              id: "newPassword",
              label: "New password",
              value: newPassword,
              set: setNewPassword,
              autoComplete: "new-password",
            },
            {
              id: "confirmPassword",
              label: "Confirm new password",
              value: confirmPassword,
              set: setConfirmPassword,
              autoComplete: "new-password",
            },
          ].map((f) => (
            <PasswordInput
              key={f.id}
              id={f.id}
              label={f.label}
              autoComplete={f.autoComplete}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              error={fieldErrors[f.id]}
            />
          ))}

          <p className="text-xs text-slate-500">
            At least 12 characters, including uppercase, lowercase, and a number.
          </p>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
