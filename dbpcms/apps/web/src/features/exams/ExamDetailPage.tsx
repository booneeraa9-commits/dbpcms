/**
 * Exam Detail page.
 * Shows exam info, all selected questions (reorderable), and publish/archive actions.
 */

import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, FileText, Clock, Award, BookOpen, CheckCircle2, Archive,
  Trash2, Send, X, AlertCircle, Hash, Edit, Sparkles, ArrowUp, ArrowDown,
  Plus, ListChecks,
} from 'lucide-react';
import {
  useExam, usePublishExam, useArchiveExam, useDeleteExam, useRemoveQuestion, useReorderQuestions,
} from '@/hooks/useExams';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@dbpcms/shared';
import { QuestionPicker } from './QuestionPicker';
import toast from 'react-hot-toast';

const STATUS_META: Record<string, { label: string; class: string; icon: any }> = {
  DRAFT: { label: 'Draft', class: 'badge-gray', icon: FileText },
  PUBLISHED: { label: 'Published', class: 'badge-success', icon: CheckCircle2 },
  ARCHIVED: { label: 'Archived', class: 'badge-gray', icon: Archive },
};

const TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  TRUE_FALSE: 'True/False',
  MATCHING: 'Matching',
  SHORT_ANSWER: 'Short Answer',
  ESSAY: 'Essay',
  PRACTICAL: 'Practical',
};

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { data: exam, isLoading } = useExam(id);
  const publish = usePublishExam();
  const archive = useArchiveExam();
  const remove = useDeleteExam();
  const removeQuestion = useRemoveQuestion();
  const reorder = useReorderQuestions();

  const [showPicker, setShowPicker] = useState(false);

  if (isLoading) return <div className="p-12 text-center text-gray-500"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading…</div>;
  if (!exam) return <div className="p-12 text-center text-gray-500">Exam not found.</div>;

  const status = STATUS_META[exam.status];
  const StatusIcon = status?.icon ?? FileText;
  const canPublish = exam.status === 'DRAFT' && (exam.questionCount ?? 0) > 0 && hasPermission(PERMISSIONS.EXAM_PUBLISH);
  const canArchive = exam.status === 'PUBLISHED' && hasPermission(PERMISSIONS.EXAM_PUBLISH);
  const canDelete = exam.status === 'DRAFT' && hasPermission(PERMISSIONS.EXAM_CREATE);
  const canEdit = exam.status === 'DRAFT' && hasPermission(PERMISSIONS.EXAM_CREATE);
  const questions = exam.examQuestions ?? [];
  const totalMarksFromQuestions = questions.reduce((s, q) => s + Number(q.marks), 0);
  const excludeIds = questions.map((q) => q.questionId);

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...questions];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    const order = reordered.map((q, i) => ({ questionId: q.questionId, order: i }));
    reorder.mutate({ examId: exam.id, order }, {
      onSuccess: () => toast.success('Order updated'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{exam.title}</h1>
            <span className={status?.class}><StatusIcon className="h-3 w-3 mr-1" />{status?.label}</span>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {exam.courseCode} — {exam.courseName}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canPublish && (
            <button onClick={() => publish.mutate(exam.id, { onSuccess: () => toast.success('🎉 Exam published!'), onError: (e: any) => toast.error(e.message) })} disabled={publish.isPending} className="btn-primary">
              {publish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publish
            </button>
          )}
          {canArchive && (
            <button onClick={() => archive.mutate(exam.id, { onSuccess: () => toast.success('Exam archived'), onError: (e: any) => toast.error(e.message) })} disabled={archive.isPending} className="btn-secondary">
              <Archive className="h-4 w-4" /> Archive
            </button>
          )}
          {canDelete && (
            <button onClick={() => { if (confirm('Delete this exam?')) remove.mutate(exam.id, { onSuccess: () => navigate('/app/exams') }); }} className="btn-secondary text-danger-600">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Stat icon={Clock} label="Duration" value={`${exam.durationMinutes} min`} />
        <Stat icon={Award} label="Total Marks" value={String(exam.totalMarks)} />
        <Stat icon={Hash} label="Questions" value={String(questions.length)} />
        <Stat icon={CheckCircle2} label="From Questions" value={`${totalMarksFromQuestions} marks`} />
      </div>

      {exam.status === 'DRAFT' && (exam.questionCount ?? 0) === 0 && (
        <div className="rounded-md bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-500/30 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-warning-900 dark:text-warning-200">
              <strong>This exam has no questions yet.</strong> You can auto-generate from the bank or pick manually.
            </p>
            <div className="mt-2 flex gap-2 flex-wrap">
              <Link to={`/app/exams/${exam.id}/edit`} className="btn-primary">
                <Sparkles className="h-4 w-4" /> Auto-Generate
              </Link>
              {canEdit && (
                <button onClick={() => setShowPicker(true)} className="btn-secondary">
                  <Plus className="h-4 w-4" /> Pick Manually
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {exam.instructions && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Instructions</h2>
          </div>
          <div className="card-body">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{exam.instructions}</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary-600" />
            Questions ({questions.length})
          </h2>
          {canEdit && (
            <div className="flex gap-2">
              <button onClick={() => setShowPicker(true)} className="btn-secondary text-sm">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
              <Link to={`/app/exams/${exam.id}/edit`} className="btn-secondary text-sm">
                <Sparkles className="h-3.5 w-3.5" /> Auto-Generate
              </Link>
            </div>
          )}
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {questions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No questions yet. Use auto-generate or pick manually.
            </div>
          ) : (
            questions.map((eq, i) => {
              const q = eq.question as any;
              const isFirst = i === 0;
              const isLast = i === questions.length - 1;
              return (
                <div key={eq.id} className="p-4 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="badge-gray text-xs">{TYPE_LABELS[q?.type] ?? q?.type}</span>
                      <span className="text-xs text-gray-500">{Number(eq.marks)} pts</span>
                      {q?.difficulty && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {q.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                      {q?.content?.text ?? '(Question text unavailable)'}
                    </p>
                    {q?.keywords && q.keywords.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500">{q.keywords.join(', ')}</div>
                    )}
                  </div>
                  {exam.status === 'DRAFT' && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveQuestion(i, 'up')}
                        disabled={isFirst || reorder.isPending}
                        className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveQuestion(i, 'down')}
                        disabled={isLast || reorder.isPending}
                        className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {exam.status === 'DRAFT' && (
                    <button
                      onClick={() => removeQuestion.mutate({ examId: exam.id, questionId: eq.questionId }, { onSuccess: () => toast.success('Question removed') })}
                      className="p-1.5 rounded text-gray-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10 self-start"
                      title="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showPicker && (
        <QuestionPicker
          examId={exam.id}
          courseId={exam.courseId}
          excludeIds={excludeIds}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}
