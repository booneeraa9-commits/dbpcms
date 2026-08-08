import type { JSX } from "react";
import { Construction } from "lucide-react";

/**
 * A friendly "this module is coming" page, reused for routes whose features are
 * built in later phases. Demonstrates our "never leave the user guessing" rule.
 */
export function PlaceholderPage({ title }: { title: string }): JSX.Element {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-16 text-center">
        <Construction className="h-10 w-10 text-slate-400" />
        <p className="mt-4 text-base font-medium text-slate-700">
          This module is coming soon
        </p>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          The {title} module will be built in a later phase of the roadmap. The
          navigation and layout are ready for it.
        </p>
      </div>
    </div>
  );
}
