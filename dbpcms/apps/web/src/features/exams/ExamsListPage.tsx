/**
 * Exams list page.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, FileText, Loader2, Clock, Award, CheckCircle2, Archive, Eye } from 'lucide-react';
import { useExams, useDeleteExam } from '@/hooks/useExams';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@dbpcms/shared';
import { useCourses } from '@/hooks/useAcademics';
import toast from 'react-hot-toast';

const STATUS_META: Record<string, { label: string; class: string; icon: any }> = {
  DRAFT: { label: 'Draft', class: 'badge-gray', icon: FileText },
  PUBLISHED: { label: 'Published', class: 'badge-success', icon: CheckCircle2 },
  ARCHIVED: { label: 'Archived', class: 'badge-gray', icon: Archive },
};

export default function ExamsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useExams({
    page, pageSize: 20, search: search || undefined,
    status: (statusFilter || undefined) as any, courseId: courseFilter || undefined,
  });
  const { data: coursesData } = useCourses({ pageSize: 100 });
  const remove = useDeleteExam();

  const canCreate = hasPermission(PERMISSIONS.EXAM_CREATE);

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Delete exam "${title}"? This cannot be undone.`)) {
      remove.mutate(id, {
        onSuccess: () => toast.success('Exam deleted'),
        onError: (e: any) => toast.error(e.message),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Exams</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {data?.meta.total ?? 0} exam{data?.meta.total === 1 ? '' : 's'} generated
          </p>
        </div>
        {canCreate && (
          <Link to="/app/exams/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            New Exam
          </Link>
        )}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input pl-9"
          />
        </div>
        <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }} className="form-input sm:w-56">
          <option value="">All courses</option>
          {coursesData?.items.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="form-input sm:w-40">
          <option value="">All status</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading exams…
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-900 dark:text-gray-100">No exams yet</p>
            <p className="text-sm mt-1">Create an exam and auto-generate questions from the bank.</p>
            {canCreate && (
              <Link to="/app/exams/new" className="btn-primary mt-4">
                <Plus className="h-4 w-4" />
                Create your first exam
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrapper border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Course</th>
                  <th>Questions</th>
                  <th>Time</th>
                  <th>Marks</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((e) => {
                  const status = STATUS_META[e.status];
                  const StatusIcon = status?.icon ?? FileText;
                  return (
                    <tr key={e.id}>
                      <td>
                        <Link to={`/app/exams/${e.id}`} className="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-700">
                          {e.title}
                        </Link>
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">
                        {e.courseCode} — {e.courseName}
                      </td>
                      <td>
                        <span className="badge-gray text-xs">{e.questionCount ?? 0} questions</span>
                      </td>
                      <td className="text-sm text-gray-600">
                        <Clock className="inline h-3.5 w-3.5 mr-1" />
                        {e.durationMinutes} min
                      </td>
                      <td className="text-sm text-gray-600">
                        <Award className="inline h-3.5 w-3.5 mr-1" />
                        {e.totalMarks}
                      </td>
                      <td>
                        <span className={status?.class}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status?.label ?? e.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/app/exams/${e.id}`}
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
