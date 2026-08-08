import type { JSX, InputHTMLAttributes } from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A password field with a show/hide eye toggle. Drop-in replacement for a
 * password <input>. Supports an optional label and error message.
 */
interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

export function PasswordInput({ label, error, id, className, ...props }: PasswordInputProps): JSX.Element {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          {...props}
          className={cn(
            "w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none focus:ring-2 dark:bg-slate-800 dark:text-slate-100",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-brand-500 focus:ring-brand-100 dark:border-slate-700",
            className,
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
