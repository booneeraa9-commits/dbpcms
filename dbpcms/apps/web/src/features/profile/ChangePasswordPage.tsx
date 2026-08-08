/**
 * Change password page (for logged-in users).
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Loader2, Check, AlertCircle } from 'lucide-react';
import { changePasswordSchema } from '@dbpcms/shared';
import { useChangePassword } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

type ChangePasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = (data: ChangePasswordForm) => {
    changePassword.mutate(data, {
      onSuccess: () => {
        toast.success('Password changed successfully');
        reset();
        navigate('/app/profile');
      },
      onError: (err: unknown) => {
        const message = (err as Error)?.message ?? 'Failed to change password';
        toast.error(message);
      },
    });
  };

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
        <p className="mt-1 text-sm text-gray-600">
          Choose a strong password you don't use anywhere else.
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="card-body space-y-4">
          <div>
            <label className="form-label">Current password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                autoComplete="current-password"
                {...register('currentPassword')}
                className="form-input pl-9"
              />
            </div>
            {errors.currentPassword && <p className="form-error">{errors.currentPassword.message}</p>}
          </div>

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
            <label className="form-label">Confirm new password</label>
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

          {changePassword.isError && (
            <div className="rounded-md bg-danger-50 p-3 flex gap-2">
              <AlertCircle className="h-5 w-5 text-danger-600 flex-shrink-0" />
              <p className="text-sm text-danger-700">
                {(changePassword.error as Error)?.message ?? 'Failed to change password'}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={changePassword.isPending} className="btn-primary">
              {changePassword.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
