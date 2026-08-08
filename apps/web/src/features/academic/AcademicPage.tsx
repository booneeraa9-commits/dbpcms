import type { JSX } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProgramsTab } from "./ProgramsTab";
import { AcademicYearsTab } from "./AcademicYearsTab";
import { SemestersTab } from "./SemestersTab";
import { CoursesTab } from "./CoursesTab";
import { SectionsTab } from "./SectionsTab";

/**
 * The Academic Structure page groups related managers under one screen with
 * tabs: Programs, Academic Years, Semesters, Courses, and Sections.
 */
type Tab = "programs" | "years" | "semesters" | "courses" | "sections";

const TABS: { id: Tab; label: string }[] = [
  { id: "programs", label: "Programs" },
  { id: "years", label: "Academic Years" },
  { id: "semesters", label: "Semesters" },
  { id: "courses", label: "Courses" },
  { id: "sections", label: "Sections" },
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
      {tab === "courses" && <CoursesTab />}
      {tab === "sections" && <SectionsTab />}
    </div>
  );
}
