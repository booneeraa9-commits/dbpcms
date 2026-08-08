/**
 * Question Detail page.
 * Shows full question + workflow actions (submit, review, approve, retire).
 */

import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, Send, Check, X, Archive, Loader2, Clock, CheckCircle2, XCircle,
  BookOpen, Tag, Award, BarChart3, FileText, History, User as UserIcon,
  Calendar, Circle,
} from 'lucide-react';
import { useQuestion, useSubmitForReview, useReviewQuestion, useApproveQuestion, useDeleteQuestion, type Question } from '@/hooks/useQuestions';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@dbpcms/shared';
import toast from 'react-hot-toast';

const STATUS_META: Record<string, { label: string; class: string; icon: any }> = {
  DRAFT: { label: 'Draft', class: 'badge-gray', icon: FileText },
  PENDING_REVIEW: { label: 'Pending Review', class: 'badge-warning', icon: Clock },
  PENDING_APPROVAL: { label: 'Pending Approval', class: 'badge-warning', icon: Clock },
  ACTIVE: { label: 'Active', class: 'badge-success', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', class: 'badge-danger', icon: XCircle },
  RETIRED: { label: 'Retired', class: 'badge-gray', icon: Archive },
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
  EASY: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400',
  MEDIUM: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
  HARD: 'bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-400',
  EXPERT: 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900',
};

export default function QuestionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { data: question, isLoading } = useQuestion(id);
  const submit = useSubmitForReview();
  const review = useReviewQuestion();
  const approve = useApproveQuestion();
  const remove = useDeleteQuestion();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (isLoading) {
    return <div className="p-12 text-center text-gray-500"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading…</div>;
  }
  if (!question) return <div className="p-12 text-center text-gray-500">Question not found.</div>;

  const status = STATUS_META[question.status];
  const StatusIcon = status?.icon ?? FileText;

  const isAuthor = user?.id === question.createdById;
  const isDeptHead = user?.roles.includes('department_head' as any);
  const isExamCommittee = user?.roles.includes('exam_committee' as any);
  const isSuperAdmin = user?.roles.includes('super_admin' as any);

  const canEdit = isAuthor && ['DRAFT', 'REJECTED'].includes(question.status);
  const canDelete = isAuthor && hasPermission(PERMISSIONS.QUESTION_DELETE);
  const canSubmit = isAuthor && ['DRAFT', 'REJECTED'].includes(question.status);
  const canReview = (isDeptHead || isSuperAdmin) && question.status === 'PENDING_REVIEW';
  const canApprove = (isExamCommittee || isSuperAdmin) && question.status === 'PENDING_APPROVAL';
  const canRetire = hasPermission(PERMISSIONS.QUESTION_UPDATE) && question.status === 'ACTIVE';

  const handleSubmit = () => {
    submit.mutate(question.id, {
      onSuccess: () => toast.success('Submitted for review'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleApprove = () => {
    review.mutate(
      { id: question.id, action: 'approve' },
      { onSuccess: () => toast.success('Approved — moved to exam committee'), onError: (e: any) => toast.error(e.message) },
    );
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    review.mutate(
      { id: question.id, action: 'reject', reason: rejectReason },
      {
        onSuccess: () => { toast.success('Rejected'); setShowRejectModal(false); setRejectReason(''); },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const handleApproveFinal = () => {
    approve.mutate(question.id, {
      onSuccess: () => toast.success('🎉 Question is now ACTIVE and usable in exams!'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleDelete = () => {
    if (confirm('Delete this question? This cannot be undone.')) {
      remove.mutate(question.id, {
        onSuccess: () => { toast.success('Question deleted'); navigate('/app/questions'); },
        onError: (e: any) => toast.error(e.message),
      });
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Question</h1>
            <span className={status?.class ?? 'badge-gray'}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status?.label ?? question.status}
            </span>
            <span className="badge-gray">{TYPE_LABELS[question.type]}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${DIFFICULTY_COLORS[question.difficulty]}`}>
              {question.difficulty}
            </span>
            <span className="text-sm text-gray-500">· {question.marks} pts · v{question.version}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canEdit && (
            <Link to={`/app/questions/${question.id}/edit`} className="btn-secondary">
              <Edit className="h-4 w-4" /> Edit
            </Link>
          )}
          {canDelete && (
            <button onClick={handleDelete} className="btn-secondary text-danger-600">
              <X className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Workflow banner */}
      {(canSubmit || canReview || canApprove || canRetire) && (
        <div className="card p-4 border-primary-200 dark:border-primary-500/30 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-500/10 dark:to-primary-500/5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-primary-900 dark:text-primary-200">
              {canSubmit && <>📝 Ready to submit for review</>}
              {canReview && <>👀 Awaiting your review as Department Head</>}
              {canApprove && <>✅ Awaiting your approval as Exam Committee</>}
              {canRetire && <>This question is live and can be retired</>}
            </div>
            <div className="flex gap-2">
              {canSubmit && (
                <button onClick={handleSubmit} disabled={submit.isPending} className="btn-primary">
                  {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit for review
                </button>
              )}
              {canReview && (
                <>
                  <button onClick={handleApprove} disabled={review.isPending} className="btn-primary">
                    {review.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve
                  </button>
                  <button onClick={() => setShowRejectModal(true)} className="btn-danger">
                    <X className="h-4 w-4" /> Reject
                  </button>
                </>
              )}
              {canApprove && (
                <button onClick={handleApproveFinal} disabled={approve.isPending} className="btn-primary">
                  {approve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve & Activate
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection reason */}
      {question.rejectionReason && (
        <div className="rounded-md bg-danger-50 dark:bg-danger-500/10 p-4 border border-danger-200 dark:border-danger-500/30">
          <div className="font-semibold text-danger-900 dark:text-danger-300 mb-1">⚠ Rejection reason</div>
          <p className="text-sm text-danger-800 dark:text-danger-200">{question.rejectionReason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="card-body">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Question</h2>
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{question.content?.text || '(No text)'}</p>
            </div>
          </div>

          {/* Type-specific answer display */}
          <QuestionContentDisplay question={question} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Details</h2>
            </div>
            <div className="card-body space-y-3 text-sm">
              <Field icon={BookOpen} label="Course" value={`${question.courseCode} — ${question.courseName}`} />
              <Field icon={Award} label="Bloom's Level" value={question.bloomsLevel} />
              <Field icon={BarChart3} label="Times Used" value={`${question.timesUsed}×`} />
              {question.lastUsedAt && (
                <Field icon={Calendar} label="Last Used" value={new Date(question.lastUsedAt).toLocaleDateString()} />
              )}
              {question.keywords.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                    <Tag className="h-3 w-3" /> Keywords
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {question.keywords.map((k) => (
                      <span key={k} className="badge-gray text-xs">{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Workflow history */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <History className="h-4 w-4" /> Workflow
              </h2>
            </div>
            <div className="card-body space-y-2 text-xs">
              <Step icon={UserIcon} label="Created by" value={question.createdByName} date={question.createdAt} />
              {question.reviewedByName && (
                <Step icon={Check} label="Reviewed by" value={question.reviewedByName} />
              )}
              {question.approvedByName && (
                <Step icon={CheckCircle2} label="Approved by" value={question.approvedByName} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Reject this question</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="form-input"
              placeholder="Explain why this is being rejected so the author can fix it…"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowRejectModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleReject} disabled={review.isPending} className="btn-danger">
                {review.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-gray-900 dark:text-gray-100 mt-0.5">{value}</div>
    </div>
  );
}

function Step({ icon: Icon, label, value, date }: { icon: any; label: string; value?: string; date?: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
      <div>
        <div className="text-gray-500 dark:text-gray-400">{label}: <span className="text-gray-900 dark:text-gray-100 font-medium">{value}</span></div>
        {date && <div className="text-gray-400 text-[10px]">{new Date(date).toLocaleDateString()}</div>}
      </div>
    </div>
  );
}

function QuestionContentDisplay({ question }: { question: Question }) {
  const c = question.content;
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
      return (
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Options</h3>
            <div className="space-y-2">
              {(c?.options ?? []).map((opt: string, i: number) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 p-2 rounded ${
                    c?.correctAnswer === i
                      ? 'bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/30'
                      : 'bg-gray-50 dark:bg-gray-700/30'
                  }`}
                >
                  {c?.correctAnswer === i ? (
                    <Check className="h-4 w-4 text-success-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300" />
                  )}
                  <span className="text-sm">{opt}</span>
                </div>
              ))}
            </div>
            {c?.explanation && (
              <div className="mt-3 p-3 rounded bg-blue-50 dark:bg-blue-500/10 text-sm text-blue-900 dark:text-blue-200">
                <strong>💡 Explanation:</strong> {c.explanation}
              </div>
            )}
          </div>
        </div>
      );
    case 'TRUE_FALSE':
      return (
        <div className="card">
          <div className="card-body">
            <div className="space-y-2">
              {[true, false].map((val) => (
                <div
                  key={String(val)}
                  className={`flex items-center gap-2 p-2 rounded ${
                    c?.correctAnswer === val
                      ? 'bg-success-50 dark:bg-success-500/10 border border-success-200'
                      : 'bg-gray-50 dark:bg-gray-700/30'
                  }`}
                >
                  {c?.correctAnswer === val ? (
                    <Check className="h-4 w-4 text-success-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-300" />
                  )}
                  <span className="text-sm font-medium">{val ? 'True' : 'False'}</span>
                </div>
              ))}
            </div>
            {c?.explanation && (
              <div className="mt-3 p-3 rounded bg-blue-50 dark:bg-blue-500/10 text-sm">
                <strong>Explanation:</strong> {c.explanation}
              </div>
            )}
          </div>
        </div>
      );
    case 'MATCHING':
      return (
        <div className="card">
          <div className="card-body">
            <div className="space-y-2">
              {(c?.pairs ?? []).map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded">
                  <span className="text-sm flex-1">{p.left}</span>
                  <span className="text-gray-400">↔</span>
                  <span className="text-sm flex-1">{p.right}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case 'SHORT_ANSWER':
      return (
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sample answer</h3>
            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{c?.sampleAnswer || '(No sample answer)'}</p>
          </div>
        </div>
      );
    case 'ESSAY':
      return (
        <div className="card">
          <div className="card-body space-y-3">
            {c?.rubric && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Grading rubric</h3>
                <p className="text-sm whitespace-pre-wrap">{c.rubric}</p>
              </div>
            )}
            {c?.minWords && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Minimum:</strong> {c.minWords} words
              </div>
            )}
          </div>
        </div>
      );
    case 'PRACTICAL':
      return (
        <div className="card">
          <div className="card-body">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Assessment criteria</h3>
            <div className="space-y-1">
              {(c?.criteria ?? []).map((cr: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/30 rounded text-sm">
                  <span>{cr.name || '(unnamed criterion)'}</span>
                  <span className="text-gray-500">{cr.points} pts</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
              Total: {(c?.criteria ?? []).reduce((s: number, cr: any) => s + (cr.points || 0), 0)} pts
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}
