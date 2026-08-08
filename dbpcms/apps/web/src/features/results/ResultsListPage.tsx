/**
 * Results list page.
 * Shows all results with filters and workflow status.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, FileSpreadsheet, Loader2, Eye, Plus, CheckCircle2,
  Clock, XCircle, AlertCircle, Award, TrendingUp, Users, FileText,
} from 'lucide-react';
import { useResults, type Result } from '@/hooks/useResults';
import { useAcademicYears } from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@dbpcms/shared';
import toast from 'react-hot-toast';
import { exportCsv } from '@/lib/export';
import { Download } from 'lucide-react';

const STATUS_META: Record<string, { label: string; class: string; icon: any }> = {
  DRAFT: { label: 'Draft', class: 'badge-gray', icon: AlertCircle },
  PENDING_VERIFICATION: { label: 'Pending Verify', class: 'badge-warning', icon: Clock },
  PENDING_APPROVAL: { label: 'Pending Approval', class: 'badge-warning', icon: Clock },
  PENDING_AUTHORIZATION: { label: 'Pending Auth', class: 'badge-warning', icon: Clock },
  PUBLISHED: { label: 'Published', class: 'badge-success', icon: CheckCircle2 },
};

export default function ResultsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const { data, isLoading } = useResults({
    page, pageSize: 30,
    status: (statusFilter || undefined) as any,
    semesterId: semesterFilter || undefined,
  });
  const { data: years } = useAcademicYears();

  const canEnter = hasPermission(PERMISSIONS.RESULT_ENTRY);

  // Calculate summary stats
  const stats = data?.items.reduce(
    (acc, r) => {
      acc.total++;
      if (r.status === 'PUBLISHED') acc.published++;
      else if (r.status === 'DRAFT') acc.draft++;
      else acc.pending++;
      if (r.isPass) acc.passed++;
      else acc.failed++;
      acc.totalPct += r.percentage;
      return acc;
    },
    { total: 0, published: 0, draft: 0, pending: 0, passed: 0, failed: 0, totalPct: 0 },
  ) || { total: 0, published: 0, draft: 0, pending: 0, passed: 0, failed: 0, totalPct: 0 };
  const avgPct = stats.total > 0 ? Math.round((stats.totalPct / stats.total) * 100) / 100 : 0;

  const filteredItems = data?.items.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.studentName?.toLowerCase().includes(q)
      || r.studentIdNumber?.toLowerCase().includes(q)
      || r.courseName?.toLowerCase().includes(q)
      || r.courseCode?.toLowerCase().includes(q);
  }) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Results</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {stats.total} result{stats.total === 1 ? '' : 's'} · {avgPct}% average
          </p>
        </div>
        {canEnter && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/app/results/transcript" className="btn-secondary">
              <FileText className="h-4 w-4" />
              Transcripts
            </Link>
            <Link to="/app/results/bulk" className="btn-secondary">
              <Users className="h-4 w-4" />
              Bulk Entry
            </Link>
            <button
              onClick={() => {
                if (!data?.items?.length) {
                  toast.error('No results to export');
                  return;
                }
                exportCsv(
                  `results-${new Date().toISOString().slice(0, 10)}.csv`,
                  data.items.map((r) => ({
                    StudentID: r.studentIdNumber,
                    StudentName: r.studentName,
                    CourseCode: r.courseCode,
                    CourseName: r.courseName,
                    AssessmentType: r.assessmentType,
                    MarksObtained: r.marksObtained,
                    MarksTotal: r.marksTotal,
                    Percentage: r.percentage,
                    Grade: r.grade,
                    Result: r.isPass ? 'Pass' : 'Fail',
                    Status: r.status,
                    Semester: r.semesterName,
                    EnteredBy: r.enteredByName,
                    VerifiedBy: r.verifiedByName,
                    ApprovedBy: r.approvedByName,
                    Remarks: r.remarks,
                  })),
                );
                toast.success(`Exported ${data.items.length} results to CSV`);
              }}
              className="btn-secondary"
              disabled={!data?.items?.length}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <Link to="/app/results/new" className="btn-primary">
              <Plus className="h-4 w-4" />
              Enter Result
            </Link>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat icon={FileSpreadsheet} label="Total" value={stats.total} color="primary" />
        <Stat icon={CheckCircle2} label="Published" value={stats.published} color="success" />
        <Stat icon={Clock} label="Pending" value={stats.pending} color="warning" />
        <Stat icon={AlertCircle} label="Draft" value={stats.draft} color="gray" />
        <Stat icon={Award} label="Pass Rate" value={`${stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}%`} color="primary" />
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search by student, ID, course…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input pl-9"
          />
        </div>
        <select value={semesterFilter} onChange={(e) => { setSemesterFilter(e.target.value); setPage(1); }} className="form-input sm:w-56">
          <option value="">All semesters</option>
          {years?.flatMap((y) => y.semesters.map((s) => (
            <option key={s.id} value={s.id}>{y.name} — {s.name}</option>
          )))}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="form-input sm:w-44">
          <option value="">All status</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading results…
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-900 dark:text-gray-100">No results yet</p>
            <p className="text-sm mt-1">Start by entering marks for students in a course.</p>
            {canEnter && (
              <Link to="/app/results/new" className="btn-primary mt-4">
                <Plus className="h-4 w-4" /> Enter your first result
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrapper border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Type</th>
                  <th>Marks</th>
                  <th>%</th>
                  <th>Grade</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((r) => {
                  const status = STATUS_META[r.status];
                  const StatusIcon = status?.icon ?? AlertCircle;
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{r.studentName}</div>
                        <div className="text-xs text-gray-500 font-mono">{r.studentIdNumber}</div>
                      </td>
                      <td>
                        <div className="text-sm">{r.courseCode}</div>
                        <div className="text-xs text-gray-500">{r.courseName}</div>
                      </td>
                      <td>
                        <span className="badge-gray text-xs">{r.assessmentType}</span>
                      </td>
                      <td className="text-sm">
                        {r.marksObtained} / {r.marksTotal}
                      </td>
                      <td>
                        <span className={r.isPass ? 'text-success-700 dark:text-success-400 font-semibold' : 'text-danger-700 dark:text-danger-400 font-semibold'}>
                          {r.percentage}%
                        </span>
                      </td>
                      <td>
                        <span className={`text-sm font-bold ${
                          r.grade === 'A' ? 'text-success-600' :
                          r.grade === 'F' ? 'text-danger-600' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {r.grade}
                        </span>
                      </td>
                      <td>
                        <span className={status?.class}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status?.label ?? r.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/app/results/${r.id}`}
                          className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 inline-block"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400',
    success: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400',
    warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400',
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
