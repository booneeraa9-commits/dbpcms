import type { JSX } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ComponentsEditor } from "./ComponentsEditor";
import { ScaleEditor } from "./ScaleEditor";

/**
 * The Grading Configuration page: where authorized users edit grade components
 * (with weights) and the grading scale (bands, pass mark, rounding) — all
 * without any code changes, exactly as required.
 */
type Tab = "components" | "scale";

export function GradingConfigPage(): JSX.Element {
  const [tab, setTab] = useState<Tab>("components");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Grading configuration</h1>
        <p className="text-sm text-slate-500">
          Define grade components and the grading scale used to compute results.
        </p>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex gap-1">
          {([["components", "Components & Weights"], ["scale", "Grading Scale"]] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === "components" && <ComponentsEditor />}
      {tab === "scale" && <ScaleEditor />}
    </div>
  );
}
