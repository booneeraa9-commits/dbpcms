import type { JSX } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { UsersTab } from "./UsersTab";
import { AuditLogsTab } from "./AuditLogsTab";

/**
 * Administration hub: User & Role management and the read-only Audit-log viewer.
 * Tabs are shown based on the current user's permissions.
 */
type Tab = "users" | "audit";

export function AdministrationPage(): JSX.Element {
  const { hasPermission } = useAuth();
  const canUsers = hasPermission("user:read");
  const canAudit = hasPermission("audit-log:read");

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "users", label: "Users & Roles", show: canUsers },
    { id: "audit", label: "Audit Log", show: canAudit },
  ];
  const firstVisible = tabs.find((t) => t.show)?.id ?? "users";
  const [tab, setTab] = useState<Tab>(firstVisible);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Administration</h1>
        <p className="text-sm text-slate-500">
          Manage user accounts, roles, and review system activity.
        </p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                )}
              >
                {t.label}
              </button>
            ))}
        </nav>
      </div>

      {tab === "users" && canUsers && <UsersTab />}
      {tab === "audit" && canAudit && <AuditLogsTab />}
    </div>
  );
}
