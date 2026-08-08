import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2, Lock } from "lucide-react";
import {
  calculateGrade,
  type ComponentScore,
  type ScaleBand,
} from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/toast/ToastProvider";
import { gradesApi, type SaveEntry } from "./api";
import { gradingConfigApi } from "@/features/grading-config/api";

/**
 * The spreadsheet-like grade-entry grid: students down the side, components
 * across the top. Typing a score recomputes that student's result LIVE using
 * the same shared engine the backend uses. Save persists a draft.
 */
export function GradesheetGrid({ sectionId, onBack }: { sectionId: string; onBack: () => void }): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["gradesheet", sectionId],
    queryFn: () => gradesApi.gradesheet(sectionId),
  });
  const { data: scale } = useQuery({ queryKey: ["active-scale-grid"], queryFn: () => gradingConfigApi.activeScale() });

  // Local editable score state: { enrollmentId: { componentId: scoreString } }
  const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
  const [maxScores, setMaxScores] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data) return;
    const init: Record<string, Record<string, string>> = {};
    const maxes: Record<string, string> = {};
    for (const row of data.rows) {
      init[row.enrollmentId] = {};
      for (const comp of data.components) {
        const s = row.scores[comp.id];
        init[row.enrollmentId]![comp.id] = s ? String(s.score) : "";
        if (s) maxes[comp.id] = String(s.maxScore);
      }
    }
    // Default each component's max to 100 unless previously set.
    for (const comp of data.components) if (!maxes[comp.id]) maxes[comp.id] = "100";
    setScores(init);
    setMaxScores(maxes);
    setDirty(false);
  }, [data]);

  const bands: ScaleBand[] = useMemo(
    () => (scale?.bands ?? []).map((b) => ({ minPercent: b.minPercent, maxPercent: b.maxPercent, letter: b.letter, gradePoint: b.gradePoint, isPass: b.isPass })),
    [scale],
  );

  const save = useMutation({
    mutationFn: () => {
      const entries: SaveEntry[] = [];
      for (const row of data!.rows) {
        for (const comp of data!.components) {
          const raw = scores[row.enrollmentId]?.[comp.id];
          if (raw === undefined || raw === "") continue;
          const score = Number(raw);
          const maxScore = Number(maxScores[comp.id] ?? "100");
          if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) continue;
          entries.push({ enrollmentId: row.enrollmentId, componentId: comp.id, score, maxScore });
        }
      }
      return gradesApi.save(sectionId, entries);
    },
    onSuccess: () => { toast.success("Grades saved."); setDirty(false); void qc.invalidateQueries({ queryKey: ["gradesheet", sectionId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function liveResult(enrollmentId: string) {
    if (!data || bands.length === 0) return null;
    const comps: ComponentScore[] = [];
    for (const comp of data.components) {
      const raw = scores[enrollmentId]?.[comp.id];
      if (raw === undefined || raw === "") continue;
      const score = Number(raw);
      const maxScore = Number(maxScores[comp.id] ?? "100");
      if (!Number.isFinite(score) || maxScore <= 0) continue;
      comps.push({ weightPercent: comp.weightPercent, score, maxScore });
    }
    if (comps.length === 0) return null;
    return calculateGrade(comps, bands, { rounding: (scale?.rounding as "half_up") ?? "half_up", passMark: scale?.passMark ?? 50 });
  }

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>;
  if (isError || !data) return (
    <div className="space-y-4">
      <Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Could not load the gradesheet.</p>
    </div>
  );

  const locked = data.locked;

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400"><ArrowLeft className="h-4 w-4" /> Back to sections</button>

      <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{data.section.course.code} — {data.section.course.title}</h1>
          <p className="text-sm text-slate-500">Section {data.section.sectionLabel} · {data.section.semester.name} · {data.section.course.creditHours} credits</p>
          <span className={"mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium " + (locked ? "bg-slate-200 text-slate-600" : "bg-blue-100 text-blue-700")}>Status: {data.status}</span>
        </div>
        {!locked && (
          <Button loading={save.isPending} onClick={() => save.mutate()} disabled={!dirty}><Save className="h-4 w-4" /> Save grades</Button>
        )}
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800"><Lock className="h-4 w-4" /> Published &amp; locked</span>
        )}
      </div>

      {data.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-500">No students enrolled in this section yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60">
              <tr>
                <th className="sticky left-0 bg-slate-50 px-3 py-2 font-medium dark:bg-slate-800/60">Student</th>
                {data.components.map((c) => (
                  <th key={c.id} className="px-2 py-2 text-center font-medium">
                    <div>{c.name}</div>
                    <div className="text-xs font-normal text-slate-400">
                      wt {c.weightPercent}% · /
                      <input
                        type="number"
                        value={maxScores[c.id] ?? "100"}
                        onChange={(e) => { setMaxScores((m) => ({ ...m, [c.id]: e.target.value })); setDirty(true); }}
                        disabled={locked}
                        className="ml-0.5 w-12 rounded border border-slate-300 px-1 py-0.5 text-center dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const res = liveResult(row.enrollmentId);
                return (
                  <tr key={row.enrollmentId} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <td className="sticky left-0 bg-white px-3 py-2 dark:bg-slate-900">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{row.student.firstName} {row.student.lastName}</p>
                      <p className="font-mono text-xs text-slate-400">{row.student.studentNumber}</p>
                    </td>
                    {data.components.map((c) => (
                      <td key={c.id} className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          value={scores[row.enrollmentId]?.[c.id] ?? ""}
                          onChange={(e) => { setScores((s) => ({ ...s, [row.enrollmentId]: { ...s[row.enrollmentId], [c.id]: e.target.value } })); setDirty(true); }}
                          disabled={locked}
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-center dark:border-slate-700 dark:bg-slate-800"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-center">
                      {res ? (
                        <div>
                          <span className={"font-semibold " + (res.isPass ? "text-emerald-600" : "text-red-600")}>{res.letter ?? "—"}</span>
                          <span className="ml-1 text-xs text-slate-400">{res.percentage}%</span>
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {dirty && !locked && <p className="text-xs text-amber-600">You have unsaved changes.</p>}
    </div>
  );
}
