import type { JSX } from "react";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/api-client";

/**
 * A small read-only round avatar for list rows. Shows the employee's photo if
 * one exists, otherwise their initials. Fetches via the authenticated endpoint.
 */
export function ListAvatar({
  employeeId,
  firstName,
  lastName,
}: {
  employeeId: string;
  firstName: string;
  lastName: string;
}): JSX.Element {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/employees/${employeeId}/photo`, {
          headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
          credentials: "include",
        });
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objectUrl);
      } catch {
        /* fall back to initials */
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [employeeId]);

  if (src) {
    return (
      <img
        src={src}
        alt={`${firstName} ${lastName}`}
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">
      {firstName[0]}
      {lastName[0]}
    </div>
  );
}
