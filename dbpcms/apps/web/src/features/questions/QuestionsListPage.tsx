/**
 * Question Bank list page.
 * Browse, search, filter, create questions.
 * Status pills: DRAFT / PENDING_REVIEW / PENDING_APPROVAL / ACTIVE / REJECTED / RETIRED
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Filter, FileQuestion, Loader2, Eye, Send, Trash2,
  CheckCircle2, XCircle, Clock, BookOpen, Tag,
} from 'lucide-react';
import { useQuestions, useDeleteQuestion, useSubmitForReview, type Question } from '@/hooks/useQuestions';
import { useAuthStore } from '@/stores/authStore';
import { useCourses } from '@/hooks/useAcademics';
import { PERMISSIONS } from '@dbpcms/shared';
import toast from 'react-hot-toast';

const STATUS_META: Record<string, { label: string; class: string; icon: any }> = {
  DRAFT: { label: 'Draft', class: 'badge-gray', icon: FileQuestion },
  PENDING_REVIEW: { label: 'Pending Review', class: 'badge-warning', icon: Clock },
  PENDING_APPROVAL: { label: 'Pending Approval', class: 'badge-warning', icon: Clock },
  ACTIVE: { label: 'Active', class: 'badge-success', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', class: 'badge-danger', icon: XCircle },
  RETIRED: { label: 'Retired', class: 'badge-gray', icon: XCircle },
};

const TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  TRUE_FALSE: 'True/False',
  MATCHING: 'Matching',
  SHORT_ANSWER: 'Short Answer',
  ESSAY: 'Essay',
  PRACTICAL: 'Practical',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'bg-success-50 text-success-700',
  MEDIUM: 'bg-warning-50 text-warning-700',
  HARD: 'bg-danger-50 text-danger-700',
  EXPERT: 'bg-gray-900 text-white',
};

export default function QuestionsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuestions({
    page, pageSize: 20, search: search || undefined,
    courseId: courseFilter || undefined, type: (typeFilter || undefined) as any,
    difficulty: (difficultyFilter || undefined) as any, status: (statusFilter || undefined) as any,
  });
  const { data: coursesData } = useCourses({ pageSize: 100 });
  const submitForReview = useSubmitForReview();
  const remove = useDeleteQuestion();

  const canCreate = hasPermission(PERMISSIONS.QUESTION_CREATE);
  const canDelete = hasPermission(PERMISSIONS.QUESTION_DELETE);

  const handleSubmit = (id: string) => {
    submitForReview.mutate(id, {
      onSuccess: () => toast.success('Submitted for review'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this question?')) {
      remove.mutate(id, {
        onSuccess: () => toast.success('Question deleted'),
        onError: (e: any) => toast.error(e.message),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Question Bank</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {data?.meta?.total ?? 0} question{data?.meta?.total === 1 ? '' : 's'} in the bank
          </p>
        </div>
        {canCreate && (
          <Link to="/app/questions/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            New Question
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search by keyword…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="form-input pl-9"
            />
          </div>
          <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }} className="form-input">
            <option value="">All courses</option>
            {coursesData?.items.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="form-input">
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="form-input">
            <option value="">All status</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading questions…
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileQuestion className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-900 dark:text-gray-100">No questions yet</p>
            <p className="text-sm mt-1">Build your question bank by creating your first question.</p>
            {canCreate && (
              <Link to="/app/questions/new" className="btn-primary mt-4">
                <Plus className="h-4 w-4" />
                Create your first question
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {data?.items.map((q) => {
              const status = STATUS_META[q.status];
              const StatusIcon = status?.icon ?? FileQuestion;
              const canSubmit = q.createdById === user?.id && (q.status === 'DRAFT' || q.status === 'REJECTED');
              const canDeleteThis = canDelete && q.createdById === user?.id;
              return (
                <div key={q.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                      <FileQuestion className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={status?.class ?? 'badge-gray'}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status?.label ?? q.status}
                        </span>
                        <span className="badge-gray">{TYPE_LABELS[q.type] ?? q.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${DIFFICULTY_COLORS[q.difficulty] ?? 'badge-gray'}`}>
                          {q.difficulty}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{q.marks} pts</span>
                        {q.version > 1 && <span className="text-xs text-gray-500 dark:text-gray-400">v{q.version}</span>}
                      </div>
                      <p className="mt-1.5 text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                        {q.content?.text ?? '(No text)'}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {q.courseCode} {q.courseName}
                        </span>
                        {q.keywords.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {q.keywords.slice(0, 3).join(', ')}
                            {q.keywords.length > 3 && ` +${q.keywords.length - 3}`}
                          </span>
                        )}
                        {q.timesUsed > 0 && (
                          <span className="flex items-center gap-1">
                            Used {q.timesUsed}×
                          </span>
                        )}
                        <span className="ml-auto">by {q.createdByName}</span>
                      </div>
                      {q.rejectionReason && (
                        <div className="mt-2 rounded-md bg-danger-50 dark:bg-danger-500/10 p-2 text-xs text-danger-700 dark:text-danger-300">
                          <strong>Rejection reason:</strong> {q.rejectionReason}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Link
                        to={`/app/questions/${q.id}`}
                        className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {canSubmit && (
                        <button
                          onClick={() => handleSubmit(q.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-success-600 hover:bg-success-50 dark:hover:bg-success-500/10"
                          title="Submit for review"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      {canDeleteThis && (
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="p-1.5 rounded text-gray-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} total
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">Previous</button>
              <button onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))} disabled={page === data.meta.totalPages} className="btn-secondary">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
