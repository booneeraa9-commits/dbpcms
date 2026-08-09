import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Users, GraduationCap, BookOpen, Building2 } from "lucide-react";
import { api } from "@/lib/api-client";

interface SearchResult {
  type: "employee" | "student" | "course" | "department";
  id: string;
  title: string;
  subtitle: string;
}

const TYPE_META: Record<SearchResult["type"], { icon: React.ComponentType<{ className?: string }>; label: string; to: (id: string) => string }> = {
  employee: { icon: Users, label: "Employees", to: (id) => `/employees/${id}` },
  student: { icon: GraduationCap, label: "Students", to: () => `/students` },
  course: { icon: BookOpen, label: "Courses", to: () => `/academic` },
  department: { icon: Building2, label: "Departments", to: () => `/departments` },
};

/**
 * Global search box for the top bar. Debounced; shows grouped, permission-
 * filtered results in a dropdown; click a result to navigate to it.
 */
export function GlobalSearch(): JSX.Element {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get<SearchResult[]>(`/search?q=${encodeURIComponent(q.trim())}`);
        setResults(data); setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, [q]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(r: SearchResult): void {
    navigate(TYPE_META[r.type].to(r.id));
    setOpen(false); setQ("");
  }

  // Group results by type for display.
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div ref={boxRef} className="relative hidden max-w-md flex-1 sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (results.length) setOpen(true); }}
        placeholder="Search employees, students, courses…"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}

      {open && (
        <div className="absolute z-50 mt-1 max-h-96 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">No matches for “{q}”.</p>
          ) : (
            Object.entries(grouped).map(([type, items]) => {
              const meta = TYPE_META[type as SearchResult["type"]];
              const Icon = meta.icon;
              return (
                <div key={type}>
                  <p className="bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-800/60">{meta.label}</p>
                  {items.map((r) => (
                    <button key={r.id} type="button" onClick={() => go(r)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{r.title}</p>
                        <p className="truncate text-xs text-slate-500">{r.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
