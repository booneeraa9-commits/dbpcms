import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, ShieldCheck, Loader2 } from "lucide-react";

/**
 * PUBLIC document-verification page (no login). Someone with a printed document
 * scans its QR (which links here with ?code=...) or types the code to confirm
 * the document is genuine. Shows only a safe summary.
 */
interface VerifyResult {
  valid: boolean;
  documentKind?: string;
  subject?: string;
  issuedAt?: string;
}

const KIND_LABELS: Record<string, string> = {
  employee_profile: "Employee Profile",
  transcript: "Student Transcript",
};

export function VerifyPage(): JSX.Element {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  async function check(value: string): Promise<void> {
    if (!value.trim()) return;
    setLoading(true);
    setChecked(false);
    try {
      const res = await fetch(`/api/v1/verify/${encodeURIComponent(value.trim())}`);
      const json = (await res.json()) as { data: VerifyResult };
      setResult(json.data);
    } catch {
      setResult({ valid: false });
    } finally {
      setLoading(false);
      setChecked(true);
    }
  }

  // Auto-check if a code arrived in the URL (from a QR scan).
  useEffect(() => {
    const initial = params.get("code");
    if (initial) void check(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900">Document Verification</h1>
          <p className="text-sm text-slate-500">Enter the code printed on the document.</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); void check(code); }}
          className="space-y-3"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center font-mono tracking-widest outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Checking…" : "Verify"}
          </button>
        </form>

        {checked && result && (
          <div className="mt-6">
            {result.valid ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <p className="mt-2 font-medium text-emerald-800">Document is genuine</p>
                <p className="mt-1 text-sm text-emerald-700">
                  {KIND_LABELS[result.documentKind ?? ""] ?? result.documentKind}
                </p>
                <p className="text-sm text-emerald-700">{result.subject}</p>
                {result.issuedAt && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Issued {new Date(result.issuedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                <XCircle className="mx-auto h-8 w-8 text-red-600" />
                <p className="mt-2 font-medium text-red-800">Not found</p>
                <p className="mt-1 text-sm text-red-700">
                  This code does not match any valid document.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
