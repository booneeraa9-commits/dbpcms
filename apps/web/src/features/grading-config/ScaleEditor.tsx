import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { gradingScaleSchema, ROUNDING_LABELS } from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/lib/api-client";
import { gradingConfigApi, type ScaleBand } from "./api";

const emptyBand: ScaleBand = { minPercent: 0, maxPercent: 0, letter: "", gradePoint: 0, isPass: true };

export function ScaleEditor(): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("grading:config");

  const { data, isLoading } = useQuery({ queryKey: ["active-scale"], queryFn: () => gradingConfigApi.activeScale() });

  const [name, setName] = useState("Standard 4.0");
  const [passMark, setPassMark] = useState(50);
  const [rounding, setRounding] = useState("half_up");
  const [bands, setBands] = useState<ScaleBand[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setName(data.name);
      setPassMark(data.passMark);
      setRounding(data.rounding);
      setBands(data.bands.map((b) => ({ ...b })));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name, passMark, rounding: rounding as "half_up", bands };
      const parsed = gradingScaleSchema.safeParse(payload);
      if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Invalid scale."); throw new Error("v"); }
      return gradingConfigApi.saveScale(payload);
    },
    onSuccess: () => { toast.success("Grading scale saved."); void qc.invalidateQueries({ queryKey: ["active-scale"] }); void qc.invalidateQueries({ queryKey: ["grading-scales"] }); },
    onError: (err: unknown) => { if (err instanceof ApiError) setError(err.message); },
  });

  const setBand = (i: number, patch: Partial<ScaleBand>) =>
    setBands((cur) => cur.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Grading scale</h3>
        <p className="text-sm text-slate-500">Define letter bands, grade points, the pass mark, and rounding. Saving creates a new active version.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Scale name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Pass mark (%)</label>
          <input type="number" value={passMark} onChange={(e) => setPassMark(Number(e.target.value))} disabled={!canManage} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Rounding</label>
          <select value={rounding} onChange={(e) => setRounding(e.target.value)} disabled={!canManage} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            {Object.entries(ROUNDING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50">
            <tr>
              <th className="px-3 py-2 font-medium">Min %</th>
              <th className="px-3 py-2 font-medium">Max %</th>
              <th className="px-3 py-2 font-medium">Letter</th>
              <th className="px-3 py-2 font-medium">Grade point</th>
              <th className="px-3 py-2 font-medium">Pass?</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody>
            {bands.map((b, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <td className="px-3 py-1.5"><input type="number" value={b.minPercent} onChange={(e) => setBand(i, { minPercent: Number(e.target.value) })} disabled={!canManage} className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="px-3 py-1.5"><input type="number" value={b.maxPercent} onChange={(e) => setBand(i, { maxPercent: Number(e.target.value) })} disabled={!canManage} className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="px-3 py-1.5"><input value={b.letter} onChange={(e) => setBand(i, { letter: e.target.value })} disabled={!canManage} className="w-16 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="px-3 py-1.5"><input type="number" step="0.01" value={b.gradePoint} onChange={(e) => setBand(i, { gradePoint: Number(e.target.value) })} disabled={!canManage} className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800" /></td>
                <td className="px-3 py-1.5"><input type="checkbox" checked={b.isPass} onChange={(e) => setBand(i, { isPass: e.target.checked })} disabled={!canManage} className="h-4 w-4" /></td>
                {canManage && <td className="px-3 py-1.5 text-right"><button type="button" onClick={() => setBands((c) => c.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {canManage && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={() => setBands((c) => [...c, { ...emptyBand }])}>
            <Plus className="h-4 w-4" /> Add band
          </Button>
          <Button loading={save.isPending} onClick={() => { setError(null); save.mutate(); }}>
            <Save className="h-4 w-4" /> Save scale
          </Button>
        </div>
      )}
    </div>
  );
}
