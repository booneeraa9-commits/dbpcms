import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Lock, Check, Send, CheckCircle2, Undo2, Unlock } from "lucide-react";
import { calculateGrade, type ComponentScore, type ScaleBand } from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { gradesApi, type SaveEntry } from "./api";
import { gradingConfigApi } from "@/features/grading-config/api";

type SaveState = "idle" | "saving" | "saved";

/**
 * The grade-entry grid. Instructors type RAW marks (out of each component's own
 * max — e.g. /25), inputs are capped at that max, and changes AUTOSAVE after a
 * short pause. Workflow actions (submit/approve/publish/return/unlock) appear
 * based on the user's permissions and the current status.
 */
export function GradesheetGrid({ sectionId, onBack }: { sectionId: string; onBack: () => void }): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["gradesheet", sectionId],
    queryFn: () => gradesApi.gradesheet(sectionId),
  });
  const { data: scale } = useQuery({ queryKey: ["active-scale-grid"], queryFn: () => gradingConfigApi.activeScale() });

  const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!data) return;
    const init: Record<string, Record<string, string>> = {};
    for (const row of data.rows) {
      init[row.enrollmentId] = {};
      for (const comp of data.components) {
        const s = row.scores[comp.id];
        init[row.enrollmentId]![comp.id] = s ? String(s.score) : "";
      }
    }
    setScores(init);
  }, [data]);

  const bands: ScaleBand[] = useMemo(
    () => (scale?.bands ?? []).map((b) => ({ minPercent: b.minPercent, maxPercent: b.maxPercent, letter: b.letter, gradePoint: b.gradePoint, isPass: b.isPass })),
    [scale],
  );

  const locked = data?.locked ?? false;
  const status = data?.status ?? "draft";
  const editable = !locked && status !== "submitted" && status !== "dept_approved";

  const doSave = useCallback(async () => {
    if (!data) return;
    const entries: SaveEntry[] = [];
    for (const row of data.rows) {
      for (const comp of data.components) {
        const raw = scores[row.enrollmentId]?.[comp.id];
        if (raw === undefined || raw === "") continue;
        const score = Number(raw);
        if (!Number.isFinite(score)) continue;
        entries.push({ enrollmentId: row.enrollmentId, componentId: comp.id, score });
      }
    }
    setSaveState("saving");
    try {
      await gradesApi.save(sectionId, entries);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    } catch (e) {
      setSaveState("idle");
      toast.error(e instanceof Error ? e.message : "Autosave failed.");
    }
  }, [data, scores, sectionId, toast]);

  // Debounced autosave whenever scores change (only when editable).
  const scheduleSave = useCallback(() => {
    if (!editable) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void doSave(), 1200);
  }, [doSave, editable]);

  function setScore(enrollmentId: string, componentId: string, value: string, max: number): void {
    // Cap at the component's max; ignore negatives.
    let v = value;
    if (v !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) {
        if (n > max) v = String(max);
        if (n < 0) v = "0";
      }
    }
    setScores((s) => ({ ...s, [enrollmentId]: { ...s[enrollmentId], [componentId]: v } }));
    scheduleSave();
  }

  function liveResult(enrollmentId: string) {
    if (!data || bands.length === 0) return null;
    const comps: ComponentScore[] = [];
    for (const comp of data.components) {
      const raw = scores[enrollmentId]?.[comp.id];
      if (raw === undefined || raw === "") continue;
      const score = Number(raw);
      if (!Number.isFinite(score)) continue;
      comps.push({ weightPercent: comp.weightPercent, score, maxScore: comp.maxScore });
    }
    if (comps.length === 0) return null;
    return calculateGrade(comps, bands, { rounding: (scale?.rounding as "half_up") ?? "half_up", passMark: scale?.passMark ?? 50 });
  }

  const submitM = useMutation({ mutationFn: () => gradesApi.submit(sectionId), onSuccess: () => { toast.success("Submitted for approval."); void qc.invalidateQueries({ queryKey: ["gradesheet", sectionId] }); }, onError: (e: Error) => toast.error(e.message) });
  const approveM = useMutation({ mutationFn: () => gradesApi.approve(sectionId), onSuccess: () => { toast.success("Approved."); void qc.invalidateQueries({ queryKey: ["gradesheet", sectionId] }); }, onError: (e: Error) => toast.error(e.message) });
  const publishM = useMutation({ mutationFn: () => gradesApi.publish(sectionId), onSuccess: () => { toast.success("Published & locked."); void qc.invalidateQueries({ queryKey: ["gradesheet", sectionId] }); }, onError: (e: Error) => toast.error(e.message) });
  const unlockM = useMutation({ mutationFn: () => gradesApi.unlock(sectionId), onSuccess: () => { toast.success("Unlocked."); void qc.invalidateQueries({ queryKey: ["gradesheet", sectionId] }); }, onError: (e: Error) => toast.error(e.message) });
  const returnM = useMutation({ mutationFn: () => gradesApi.returnForCorrection(sectionId, returnReason), onSuccess: () => { toast.success("Returned for correction."); setReturnOpen(false); setReturnReason(""); void qc.invalidateQueries({ queryKey: ["gradesheet", sectionId] }); }, onError: (e: Error) => toast.error(e.message) });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>;
  if (isError || !data) return (
    <div className="space-y-4">
      <Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Could not load the gradesheet.</p>
    </div>
  );

  const canSubmit = hasPermission("grade:submit") && (status === "draft" || status === "returned");
  const canApprove = hasPermission("grade:approve") && status === "submitted";
  const canPublish = hasPermission("grade:publish") && status === "dept_approved";
  const canUnlock = hasPermission("grade:unlock") && status === "published";
  const canReturn = hasPermission("grade:approve") && (status === "submitted" || status === "dept_approved");

  const STATUS_LABEL: Record<string, string> = {
    draft: "Draft", submitted: "Submitted", dept_approved: "Approved", published: "Published", returned: "Returned",
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400"><ArrowLeft className="h-4 w-4" /> Back to sections</button>

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{data.section.course.code} — {data.section.course.title}</h1>
          <p className="text-sm text-slate-500">Section {data.section.sectionLabel} · {data.section.semester.name} · {data.section.course.creditHours} credits</p>
          <div className="mt-1 flex items-center gap-2">
            <span className={"inline-block rounded-full px-2 py-0.5 text-xs font-medium " + (locked ? "bg-slate-200 text-slate-600" : status === "returned" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>Status: {STATUS_LABEL[status] ?? status}</span>
            {editable && saveState === "saving" && <span className="text-xs text-slate-400">Saving…</span>}
            {editable && saveState === "saved" && <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3 w-3" /> Saved</span>}
          </div>
          {status === "returned" && <p className="mt-1 text-xs text-amber-600">This sheet was returned for correction. Edit and re-submit.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {canSubmit && <Button loading={submitM.isPending} onClick={() => submitM.mutate()}><Send className="h-4 w-4" /> Submit</Button>}
          {canApprove && <Button loading={approveM.isPending} onClick={() => approveM.mutate()}><CheckCircle2 className="h-4 w-4" /> Approve</Button>}
          {canPublish && <Button loading={publishM.isPending} onClick={() => publishM.mutate()}><CheckCircle2 className="h-4 w-4" /> Publish</Button>}
          {canReturn && <Button variant="secondary" onClick={() => setReturnOpen(true)}><Undo2 className="h-4 w-4" /> Return</Button>}
          {canUnlock && <Button variant="secondary" loading={unlockM.isPending} onClick={() => unlockM.mutate()}><Unlock className="h-4 w-4" /> Unlock</Button>}
          {locked && <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800"><Lock className="h-4 w-4" /> Locked</span>}
        </div>
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
                    <div className="text-xs font-normal text-slate-400">out of {c.maxScore} · wt {c.weightPercent}%</div>
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
                          min={0}
                          max={c.maxScore}
                          value={scores[row.enrollmentId]?.[c.id] ?? ""}
                          onChange={(e) => setScore(row.enrollmentId, c.id, e.target.value, c.maxScore)}
                          onBlur={() => { if (editable) void doSave(); }}
                          disabled={!editable}
                          className="w-16 rounded border border-slate-300 px-2 py-1 text-center disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:disabled:bg-slate-800/50"
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

      <Modal open={returnOpen} title="Return for correction" onClose={() => setReturnOpen(false)}>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Explain what needs correcting. The sheet goes back to the instructor to edit and re-submit.</p>
        <textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="Reason…" />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setReturnOpen(false)}>Cancel</Button>
          <Button variant="danger" loading={returnM.isPending} disabled={returnReason.trim().length < 3} onClick={() => returnM.mutate()}>Return</Button>
        </div>
      </Modal>
    </div>
  );
}
