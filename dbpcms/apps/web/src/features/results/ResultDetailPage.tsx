/**
 * Result Detail Page
 * Shows a single result with full workflow timeline and action buttons
 * appropriate to the current user's role and the result's current status.
 */

import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Clock, AlertCircle,
  FileSpreadsheet, Award, TrendingUp, Send, Shield, ShieldCheck,
  Stamp, User, BookOpen, Hash, Calendar, MessageSquare, Edit2,
} from 'lucide-react';
import { useResult, useWorkflowAction, useDeleteResult } from '@/hooks/useResults';
import { useAuthStore } from '@/stores/authStore';
import { ROLES, PERMISSIONS } from '@dbpcms/shared';
import toast from 'react-hot-toast';

const STATUS_META: Record<string, { label: string; class: string; icon: any }> = {
  DRAFT: { label: 'Draft', class: 'badge-gray', icon: AlertCircle },
  PENDING_VERIFICATION: { label: 'Pending Verification', class: 'badge-warning', icon: Clock },
  PENDING_APPROVAL: { label: 'Pending Approval', class: 'badge-warning', icon: Clock },
  PENDING_AUTHORIZATION: { label: 'Pending Authorization', class: 'badge-warning', icon: Clock },
  PUBLISHED: { label: 'Published', class: 'badge-success', icon: CheckCircle2 },
};

// Stages of the approval workflow, in order.
const WORKFLOW_STAGES = [
  { key: 'DRAFT', label: 'Entered', icon: Edit2 },
  { key: 'PENDING_VERIFICATION', label: 'Verified', icon: Shield },
  { key: 'PENDING_APPROVAL', label: 'Approved', icon: ShieldCheck },
  { key: 'PENDING_AUTHORIZATION', label: 'Authorized', icon: Stamp },
  { key: 'PUBLISHED', label: 'Published', icon: CheckCircle2 },
] as const;

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const { data: result, isLoading, isError } = useResult(id);
  const workflow = useWorkflowAction();
  const deleteMut = useDeleteResult();

  const [reasonModal, setReasonModal] = useState<null | { action: 'reject' | string }>(null);
  const [reason, setReason] = useState('');

  if (isLoading) {
    return (
      <div className="p-12 text-center text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading result…
      </div>
    );
  }
  if (isError || !result) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="card p-8 text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Result not found</h2>
          <p className="text-sm text-gray-500 mt-1">It may have been deleted or you don't have access.</p>
        </div>
      </div>
    );
  }

  const role = user?.roles?.[0];
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const isDeptHead = role === ROLES.DEPARTMENT_HEAD;
  const isDean = role === ROLES.ACADEMIC_DEAN;
  const isRegistrar = role === ROLES.REGISTRAR;
  const canEnter = hasPermission(PERMISSIONS.RESULT_ENTRY);

  // Which workflow actions can the current user perform on this result?
  const canVerify =
    (isDeptHead || isSuperAdmin) &&
    result.status === 'PENDING_VERIFICATION';
  const canApprove =
    (isDean || isSuperAdmin) &&
    result.status === 'PENDING_APPROVAL';
  const canAuthorize =
    (isRegistrar || isSuperAdmin) &&
    result.status === 'PENDING_AUTHORIZATION';
  const canPublish =
    (isRegistrar || isSuperAdmin) &&
    result.status === 'PENDING_AUTHORIZATION'; // publish is a separate stage from authorize in some flows
  // (per the route file, publish is registrar-only on PENDING_AUTHORIZATION state)
  const canReject =
    canVerify || canApprove || canAuthorize ||
    (canEnter && result.status === 'DRAFT');
  const canEdit = canEnter && (result.status === 'DRAFT' || isSuperAdmin);
  const canDelete = canEnter && (result.status === 'DRAFT' || isSuperAdmin);

  const handleAction = async (action: 'verify' | 'approve' | 'authorize' | 'publish' | 'reject', note?: string) => {
    try {
      await workflow.mutateAsync({ id: result.id, action, reason: note });
      const labels: Record<string, string> = {
        verify: '✅ Verified — sent for approval',
        approve: '✅ Approved — sent for authorization',
        authorize: '✅ Authorized — ready to publish',
        publish: '🎉 Published — visible to students',
        reject: '❌ Rejected and sent back',
      };
      toast.success(labels[action] || 'Done');
      setReasonModal(null);
      setReason('');
    } catch (err) {
      toast.error((err as Error).message || 'Action failed');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this result permanently?')) return;
    try {
      await deleteMut.mutateAsync(result.id);
      toast.success('Result deleted');
      navigate('/app/results');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // Build timeline of completed stages from the result
  type TimelineStep = { label: string; icon: any; by?: string; at?: string | null; active?: boolean; rejected?: boolean };
  const timeline: TimelineStep[] = [
    { label: 'Entered', icon: Edit2, by: result.enteredByName, at: result.enteredAt },
  ];
  if (result.verifiedAt) {
    timeline.push({ label: 'Verified', icon: Shield, by: result.verifiedByName, at: result.verifiedAt });
  }
  if (result.approvedAt) {
    timeline.push({ label: 'Approved', icon: ShieldCheck, by: result.approvedByName, at: result.approvedAt });
  }
  if (result.authorizedAt) {
    timeline.push({ label: 'Authorized', icon: Stamp, by: result.authorizedByName, at: result.authorizedAt });
  }
  if (result.publishedAt) {
    timeline.push({ label: 'Published', icon: CheckCircle2, by: result.authorizedByName, at: result.publishedAt });
  }

  // Find current stage (next not-yet-completed)
  const currentStage = WORKFLOW_STAGES.find((s) => s.key === result.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Result Details</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {result.courseCode} · {result.assessmentType}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(() => {
            const s = STATUS_META[result.status] || STATUS_META.DRAFT;
            const Icon = s.icon;
            return (
              <span className={s.class}>
                <Icon className="h-3 w-3 mr-1" />{s.label}
              </span>
            );
          })()}
          {canEdit && (
            <Link to={`/app/results/${result.id}/edit`} className="btn-secondary">
              <Edit2 className="h-4 w-4" /> Edit
            </Link>
          )}
          {canDelete && (
            <button onClick={handleDelete} className="btn-secondary text-danger-600 hover:bg-danger-50">
              <XCircle className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Action bar (workflow) */}
      {(canVerify || canApprove || canAuthorize || canPublish || canReject) && (
        <div className="card p-4 bg-primary-50/50 dark:bg-primary-500/5 border-primary-200 dark:border-primary-500/20">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Workflow actions available to you
          </div>
          <div className="flex flex-wrap gap-2">
            {canVerify && (
              <button onClick={() => handleAction('verify')} disabled={workflow.isPending} className="btn-primary">
                <Shield className="h-4 w-4" /> Verify Marks
              </button>
            )}
            {canApprove && (
              <button onClick={() => handleAction('approve')} disabled={workflow.isPending} className="btn-primary">
                <ShieldCheck className="h-4 w-4" /> Approve
              </button>
            )}
            {canAuthorize && (
              <button onClick={() => handleAction('authorize')} disabled={workflow.isPending} className="btn-primary">
                <Stamp className="h-4 w-4" /> Authorize
              </button>
            )}
            {canPublish && (
              <button onClick={() => handleAction('publish')} disabled={workflow.isPending} className="btn-primary">
                <Send className="h-4 w-4" /> Publish to Students
              </button>
            )}
            {canReject && result.status !== 'DRAFT' && (
              <button
                onClick={() => setReasonModal({ action: 'reject' })}
                disabled={workflow.isPending}
                className="btn-secondary text-danger-600"
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score card */}
          <div className="card p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">Marks</div>
                <div className="mt-1 text-4xl font-bold text-gray-900 dark:text-gray-100">
                  {result.marksObtained}
                  <span className="text-2xl text-gray-400"> / {result.marksTotal}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 uppercase tracking-wider">Percentage</div>
                <div className={`mt-1 text-4xl font-bold ${result.isPass ? 'text-success-600' : 'text-danger-600'}`}>
                  {result.percentage}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 uppercase tracking-wider">Grade</div>
                <div className={`mt-1 text-4xl font-bold ${
                  result.grade === 'A' ? 'text-success-600' :
                  result.grade === 'F' ? 'text-danger-600' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {result.grade}
                </div>
              </div>
              <div>
                <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1 ${
                  result.isPass
                    ? 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400'
                    : 'bg-danger-100 text-danger-700 dark:bg-danger-500/20 dark:text-danger-400'
                }`}>
                  {result.isPass ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {result.isPass ? 'PASS' : 'FAIL'}
                </div>
              </div>
            </div>
            {result.competencyLevel && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm">
                <span className="text-gray-500">Competency: </span>
                <span className={`font-semibold ${
                  result.competencyLevel === 'COMPETENT' ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {result.competencyLevel === 'COMPETENT' ? '✓ Competent' : '✗ Not Yet Competent'}
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Details</h2>
            <DetailRow icon={User} label="Student" value={
              <Link to={`/app/students/${result.studentId}`} className="text-primary-600 hover:underline">
                {result.studentName}
              </Link>
            } sub={result.studentIdNumber} />
            <DetailRow icon={BookOpen} label="Course" value={result.courseName} sub={result.courseCode} />
            <DetailRow icon={Hash} label="Assessment" value={result.assessmentType} />
            {result.semesterName && <DetailRow icon={Calendar} label="Semester" value={result.semesterName} />}
            {result.remarks && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MessageSquare className="h-4 w-4" /> Remarks
                </div>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{result.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: timeline */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Workflow Timeline</h2>
            <ol className="space-y-4">
              {timeline.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <li key={idx} className="flex gap-3">
                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                      step.rejected
                        ? 'bg-danger-100 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400'
                        : 'bg-success-100 text-success-600 dark:bg-success-500/20 dark:text-success-400'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{step.label}</div>
                      {step.by && <div className="text-xs text-gray-500">by {step.by}</div>}
                      {step.at && <div className="text-xs text-gray-400">{formatDate(step.at)}</div>}
                    </div>
                  </li>
                );
              })}
              {/* Pending next stage */}
              {currentStage && result.status !== 'PUBLISHED' && (
                <li className="flex gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-400 dark:bg-gray-700">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-500">Next: {currentStage.label}</div>
                    <div className="text-xs text-gray-400">awaiting action</div>
                  </div>
                </li>
              )}
            </ol>
          </div>

          <div className="card p-6 space-y-2 text-sm">
            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Quick stats</div>
            <div className="flex justify-between">
              <span className="text-gray-500 flex items-center gap-1"><Award className="h-3.5 w-3.5" /> Assessment</span>
              <span className="font-medium">{result.assessmentType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Created</span>
              <span className="font-medium">{formatDate(result.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Updated</span>
              <span className="font-medium">{formatDate(result.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reject modal */}
      {reasonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-md w-full p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Reject this result</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please provide a reason. This will be visible to whoever needs to fix and resubmit it.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Marks don't match the answer sheet, please recheck question 3"
              className="form-input mt-3"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { setReasonModal(null); setReason(''); }} className="btn-secondary">Cancel</button>
              <button
                onClick={() => handleAction('reject', reason)}
                disabled={!reason.trim() || workflow.isPending}
                className="btn-primary bg-danger-600 hover:bg-danger-700"
              >
                {workflow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, sub }: { icon: any; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-gray-400" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
        <div className="text-sm text-gray-900 dark:text-gray-100">{value}</div>
        {sub && <div className="text-xs text-gray-500 font-mono">{sub}</div>}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
