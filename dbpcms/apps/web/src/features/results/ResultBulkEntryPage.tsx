/**
 * Bulk Result Entry
 * Teacher picks (course + semester + assessment type), and the system loads
 * all students registered for that course, then they can enter marks for
 * each student in a grid. Submit saves all as DRAFT results in one go.
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2, XCircle,
  Users, BookOpen, Search, FileSpreadsheet, Award, ChevronRight,
} from 'lucide-react';
import { useStudents } from '@/hooks/useStudents';
import { useCourses } from '@/hooks/useAcademics';
import { useAcademicYears } from '@/hooks/useAcademics';
import { useBulkCreateResults, useCreateResult } from '@/hooks/useResults';
import toast from 'react-hot-toast';

interface RowEntry {
  studentId: string;
  studentIdNumber: string;
  studentName: string;
  marksObtained: string;
  remarks: string;
}

export default function ResultBulkEntryPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: select course + semester + type
  const [courseId, setCourseId] = useState(params.get('courseId') || '');
  const [semesterId, setSemesterId] = useState(params.get('semesterId') || '');
  const [assessmentType, setAssessmentType] = useState<'EXAM' | 'ASSIGNMENT' | 'PRACTICAL' | 'PROJECT'>(
    (params.get('type') as any) || 'EXAM',
  );
  const [marksTotal, setMarksTotal] = useState<string>('100');
  const [search, setSearch] = useState('');

  // Step 2: per-student marks
  const [rows, setRows] = useState<Record<string, RowEntry>>({});

  const { data: coursesData } = useCourses({ pageSize: 100 });
  const { data: years } = useAcademicYears();
  const { data: studentsData, isLoading: loadingStudents } = useStudents({ pageSize: 200 });

  const bulkCreate = useBulkCreateResults();
  const createOne = useCreateResult();

  const course = useMemo(
    () => coursesData?.items.find((c) => c.id === courseId),
    [coursesData, courseId],
  );

  // When course changes, try to find its department to filter students
  // (We'll just show all students in step 2 and let the teacher pick — there's
  // no registration-based filter in the mock yet, but the structure is ready.)
  const allStudents = studentsData?.items ?? [];

  const filteredStudents = useMemo(() => {
    if (!search) return allStudents;
    const q = search.toLowerCase();
    return allStudents.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.studentIdNumber.toLowerCase().includes(q),
    );
  }, [allStudents, search]);

  // Initialize rows when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    setRows((prev) => {
      const next: Record<string, RowEntry> = {};
      for (const s of allStudents) {
        next[s.id] = prev[s.id] || {
          studentId: s.id,
          studentIdNumber: s.studentIdNumber,
          studentName: `${s.firstName} ${s.lastName}`,
          marksObtained: '',
          remarks: '',
        };
      }
      return next;
    });
  }, [step, allStudents]);

  const updateRow = (studentId: string, patch: Partial<RowEntry>) => {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));
  };

  const computed = useMemo(() => {
    const list = Object.values(rows);
    const filled = list.filter((r) => r.marksObtained !== '' && !isNaN(Number(r.marksObtained)));
    const total = parseFloat(marksTotal) || 0;
    const pcts = filled.map((r) => (Number(r.marksObtained) / total) * 100);
    const passed = pcts.filter((p) => p >= 50).length;
    const failed = pcts.length - passed;
    const avg = pcts.length > 0 ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
    return { total: list.length, filled: filled.length, passed, failed, avg };
  }, [rows, marksTotal]);

  const handleSubmit = async () => {
    const list = Object.values(rows).filter((r) => r.marksObtained !== '' && !isNaN(Number(r.marksObtained)));
    if (list.length === 0) {
      toast.error('Enter at least one mark before saving');
      return;
    }
    if (!courseId || !semesterId) {
      toast.error('Course and semester required');
      return;
    }

    try {
      const payload = list.map((r) => ({
        studentId: r.studentId,
        courseId,
        semesterId,
        assessmentType,
        marksObtained: Number(r.marksObtained),
        marksTotal: Number(marksTotal) || 100,
        remarks: r.remarks || undefined,
      }));
      const res = await bulkCreate.mutateAsync(payload);
      toast.success(`🎉 Saved ${res.created} result${res.created === 1 ? '' : 's'} as DRAFT!`);
      navigate('/app/results');
    } catch (err) {
      toast.error((err as Error).message || 'Bulk save failed');
    }
  };

  // === STEP 1: pick course/semester/type ===
  if (step === 1) {
    return (
      <div className="max-w-2xl space-y-6">
        <Header onBack={() => navigate('/app/results')} step={1} title="Bulk Result Entry" subtitle="Enter marks for many students at once" />
        <div className="card p-6 space-y-4">
          <Field label="Course *" icon={BookOpen}>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="form-input">
              <option value="">Select course…</option>
              {coursesData?.items.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Semester *" icon={BookOpen}>
            <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} className="form-input">
              <option value="">Select semester…</option>
              {years?.flatMap((y) => y.semesters.map((s) => (
                <option key={s.id} value={s.id}>{y.name} — {s.name}</option>
              )))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Assessment type *">
              <select value={assessmentType} onChange={(e) => setAssessmentType(e.target.value as any)} className="form-input">
                <option value="EXAM">Exam</option>
                <option value="ASSIGNMENT">Assignment</option>
                <option value="PRACTICAL">Practical</option>
                <option value="PROJECT">Project</option>
              </select>
            </Field>
            <Field label="Out of (total) *">
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={marksTotal}
                onChange={(e) => setMarksTotal(e.target.value)}
                className="form-input"
              />
            </Field>
          </div>
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!courseId || !semesterId || !marksTotal}
              className="btn-primary"
            >
              Next: Enter Marks <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === STEP 2: enter marks grid ===
  return (
    <div className="space-y-6">
      <Header
        onBack={() => navigate('/app/results')}
        step={2}
        title="Bulk Result Entry"
        subtitle={`${course?.code} — ${assessmentType} (out of ${marksTotal})`}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat icon={Users} label="Total students" value={computed.total} color="primary" />
        <Stat icon={FileSpreadsheet} label="Entered" value={computed.filled} color="primary" />
        <Stat icon={CheckCircle2} label="Pass so far" value={computed.passed} color="success" />
        <Stat icon={XCircle} label="Fail so far" value={computed.failed} color="danger" />
        <Stat icon={Award} label="Avg %" value={`${computed.avg.toFixed(1)}%`} color="primary" />
      </div>

      {/* Search + actions */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9"
          />
        </div>
        <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
        <button
          onClick={handleSubmit}
          disabled={bulkCreate.isPending || computed.filled === 0}
          className="btn-primary"
        >
          {bulkCreate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save {computed.filled} result{computed.filled === 1 ? '' : 's'}
        </button>
      </div>

      {/* Grid */}
      <div className="card overflow-hidden">
        {loadingStudents ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading students…
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No students found</p>
          </div>
        ) : (
          <div className="table-wrapper border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && filteredStudents.every((s) => rows[s.id]?.marksObtained !== '')}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        for (const s of filteredStudents) {
                          updateRow(s.id, { marksObtained: checked ? '0' : '' });
                        }
                      }}
                    />
                  </th>
                  <th>Student</th>
                  <th className="w-32">Marks (/{marksTotal})</th>
                  <th className="w-24">%</th>
                  <th className="w-20">Grade</th>
                  <th className="w-24">Result</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => {
                  const r = rows[s.id];
                  if (!r) return null;
                  const obtained = parseFloat(r.marksObtained);
                  const total = parseFloat(marksTotal) || 0;
                  const valid = !isNaN(obtained) && r.marksObtained !== '' && obtained >= 0 && obtained <= total;
                  const pct = valid ? (obtained / total) * 100 : 0;
                  const grade = !valid ? '—' : pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : pct >= 50 ? 'E' : 'F';
                  const pass = valid ? pct >= 50 : null;
                  return (
                    <tr key={s.id} className={r.marksObtained ? '' : 'opacity-60'}>
                      <td>
                        <input
                          type="checkbox"
                          checked={r.marksObtained !== ''}
                          onChange={(e) => updateRow(s.id, { marksObtained: e.target.checked ? '0' : '' })}
                        />
                      </td>
                      <td>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {s.firstName} {s.lastName}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{s.studentIdNumber}</div>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={marksTotal}
                          value={r.marksObtained}
                          onChange={(e) => updateRow(s.id, { marksObtained: e.target.value })}
                          className="form-input w-28"
                          placeholder="—"
                        />
                      </td>
                      <td className={valid ? (pass ? 'text-success-700 dark:text-success-400 font-semibold' : 'text-danger-700 dark:text-danger-400 font-semibold') : 'text-gray-400'}>
                        {valid ? `${pct.toFixed(1)}%` : '—'}
                      </td>
                      <td className={`font-bold ${
                        grade === 'A' ? 'text-success-600' :
                        grade === 'F' ? 'text-danger-600' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {grade}
                      </td>
                      <td>
                        {pass === null ? (
                          <span className="text-gray-400 text-sm">—</span>
                        ) : pass ? (
                          <span className="text-success-600 flex items-center gap-1 text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Pass
                          </span>
                        ) : (
                          <span className="text-danger-600 flex items-center gap-1 text-sm">
                            <XCircle className="h-3.5 w-3.5" /> Fail
                          </span>
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          value={r.remarks}
                          onChange={(e) => updateRow(s.id, { remarks: e.target.value })}
                          className="form-input"
                          placeholder="Optional"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sticky save bar at bottom */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <strong>{computed.filled}</strong> of {computed.total} entered · {computed.passed} pass · {computed.failed} fail
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
          <button
            onClick={handleSubmit}
            disabled={bulkCreate.isPending || computed.filled === 0}
            className="btn-primary"
          >
            {bulkCreate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save {computed.filled} as DRAFT
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ onBack, step, title, subtitle }: { onBack: () => void; step: 1 | 2 | 3; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
      </div>
      <div className="text-xs text-gray-500 hidden sm:block">Step {step} of 2</div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label flex items-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </label>
      {children}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400',
    success: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400',
    danger: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}
