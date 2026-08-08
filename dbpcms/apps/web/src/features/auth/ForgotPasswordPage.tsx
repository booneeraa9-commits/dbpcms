/**
 * Forgot password page — request reset link.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft, Loader2, Check, AlertCircle, Copy } from 'lucide-react';
import { forgotPasswordSchema } from '@dbpcms/shared';
import { useForgotPassword } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [devToken, setDevToken] = useState<string | null>(null);
  const forgot = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: { email: string }) => {
    forgot.mutate(data.email, {
      onSuccess: (result) => {
        if (result.devResetToken) {
          setDevToken(result.devResetToken);
        } else {
          toast.success('Check your email for the reset link');
        }
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
          {devToken ? (
            // Dev mode: show the token directly
            <div>
              <div className="flex items-center gap-2 text-success-700 mb-4">
                <Check className="h-5 w-5" />
                <h2 className="font-semibold">Reset link generated</h2>
              </div>
              <div className="rounded-md bg-warning-50 border border-warning-200 p-3 mb-4 text-sm text-warning-900">
                <strong>Dev mode:</strong> In production, this would be emailed. For now, copy the token below.
              </div>
              <div className="rounded-md bg-gray-50 p-3 mb-4">
                <code className="text-xs break-all">{devToken}</code>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(devToken);
                  toast.success('Token copied');
                }}
                className="btn-secondary w-full mb-2"
              >
                <Copy className="h-4 w-4" />
                Copy token
              </button>
              <button
                onClick={() => navigate(`/reset-password?token=${devToken}`)}
                className="btn-primary w-full"
              >
                Continue to reset
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900">Reset your password</h2>
              <p className="mt-2 text-sm text-gray-600">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <div>
                  <label className="form-label">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      {...register('email')}
                      className="form-input pl-9"
                      placeholder="you@dbpc.edu.et"
                    />
                  </div>
                  {errors.email && <p className="form-error">{errors.email.message}</p>}
                </div>

                {forgot.isError && (
                  <div className="rounded-md bg-danger-50 p-3 flex gap-2">
                    <AlertCircle className="h-5 w-5 text-danger-600 flex-shrink-0" />
                    <p className="text-sm text-danger-700">
                      {(forgot.error as Error)?.message ?? 'Request failed'}
                    </p>
                  </div>
                )}

                <button type="submit" disabled={forgot.isPending} className="btn-primary w-full">
                  {forgot.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Send Reset Link
                </button>
              </form>
            </>
          )}

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
