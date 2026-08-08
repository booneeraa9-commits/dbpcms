/**
 * Reset password page — uses token from URL.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Loader2, Check, AlertCircle, ArrowLeft } from 'lucide-react';
import { resetPasswordSchema } from '@dbpcms/shared';
import { useResetPassword } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const reset = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ token: string; newPassword: string; confirmPassword: string }>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: '', confirmPassword: '' },
  });

  const onSubmit = (data: { token: string; newPassword: string; confirmPassword: string }) => {
    reset.mutate(data, {
      onSuccess: () => {
        navigate('/login', { replace: true });
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-bold text-gray-900">Set new password</h2>
          <p className="mt-2 text-sm text-gray-600">Enter your new password below.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <input type="hidden" {...register('token')} />

            <div>
              <label className="form-label">New password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  autoComplete="new-password"
                  {...register('newPassword')}
                  className="form-input pl-9"
                />
              </div>
              {errors.newPassword && <p className="form-error">{errors.newPassword.message}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Min 8 chars, with uppercase, lowercase, and a number.
              </p>
            </div>

            <div>
              <label className="form-label">Confirm password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className="form-input pl-9"
                />
              </div>
              {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
            </div>

            {reset.isError && (
              <div className="rounded-md bg-danger-50 p-3 flex gap-2">
                <AlertCircle className="h-5 w-5 text-danger-600 flex-shrink-0" />
                <p className="text-sm text-danger-700">
                  {(reset.error as Error)?.message ?? 'Reset failed'}
                </p>
              </div>
            )}

            <button type="submit" disabled={reset.isPending} className="btn-primary w-full">
              {reset.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Reset Password
            </button>
          </form>

          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
