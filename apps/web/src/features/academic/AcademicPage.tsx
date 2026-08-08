import type { JSX } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProgramsTab } from "./ProgramsTab";
import { AcademicYearsTab } from "./AcademicYearsTab";
import { SemestersTab } from "./SemestersTab";

/**
 * The Academic Structure page groups three related managers under one screen
 * with tabs: Programs, Academic Years, and Semesters.
 */
type Tab = "programs" | "years" | "semesters";

const TABS: { id: Tab; label: string }[] = [
  { id: "programs", label: "Programs" },
  { id: "years", label: "Academic Years" },
  { id: "semesters", label: "Semesters" },
];

export function AcademicPage(): JSX.Element {
  const [tab, setTab] = useState<Tab>("programs");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Academic structure</h1>
        <p className="text-sm text-slate-500">
          Manage programs, academic years, and semesters.
        </p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {TABS.map((t) => (
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

      {tab === "programs" && <ProgramsTab />}
      {tab === "years" && <AcademicYearsTab />}
      {tab === "semesters" && <SemestersTab />}
    </div>
  );
}
