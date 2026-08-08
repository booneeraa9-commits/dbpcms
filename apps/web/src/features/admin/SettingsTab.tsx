import type { JSX } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/toast/ToastProvider";

interface Setting {
  key: string;
  value: string;
  description: string | null;
}

const LABELS: Record<string, string> = {
  retirement_age: "Retirement age",
  contract_expiry_window_days: "Contract expiry window (days)",
  institution_name: "Institution name",
};

export function SettingsTab(): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<Setting[]>("/settings"),
  });

  const [edits, setEdits] = useState<Record<string, string>>({});

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.patch(`/settings/${key}`, { value }),
    onSuccess: () => {
      toast.success("Setting saved.");
      void qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>;
  if (isError) return <p className="text-sm text-red-600">Could not load settings. <button className="underline" onClick={() => void refetch()}>Retry</button></p>;

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-slate-500">
        These values control business rules (like report thresholds) without code changes.
      </p>
      {data?.map((s) => {
        const current = edits[s.key] ?? s.value;
        const changed = current !== s.value;
        return (
          <div key={s.key} className="rounded-lg border border-slate-200 bg-white p-4">
            <label htmlFor={s.key} className="block text-sm font-medium text-slate-800">
              {LABELS[s.key] ?? s.key}
            </label>
            {s.description && <p className="mb-2 text-xs text-slate-500">{s.description}</p>}
            <div className="flex gap-2">
              <input
                id={s.key}
                value={current}
                onChange={(e) => setEdits((c) => ({ ...c, [s.key]: e.target.value }))}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <Button
                disabled={!changed}
                loading={saveMutation.isPending && saveMutation.variables?.key === s.key}
                onClick={() => saveMutation.mutate({ key: s.key, value: current })}
              >
                <Save className="h-4 w-4" /> Save
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
