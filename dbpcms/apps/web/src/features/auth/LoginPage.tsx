/**
 * Login page — fully wired.
 * On success, redirects to where the user was trying to go, or dashboard.
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, GraduationCap, Check } from 'lucide-react';
import { loginSchema, type LoginInput } from '@dbpcms/shared';
import { useLogin } from '@/hooks/useAuth';
import { Logo } from '@/components/ui/Logo';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/app/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (data: LoginInput) => {
    login.mutate(data, {
      onSuccess: () => {
        navigate(from, { replace: true });
      },
    });
  };

  const fillDemo = (email: string, password: string) => {
    // Quick fill for demo accounts
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    if (emailInput) emailInput.value = email;
    if (passwordInput) passwordInput.value = password;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ─── Left brand panel ─── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 text-white flex-col justify-between p-12">
        <Logo size="lg" />
        <div>
          <h1 className="text-4xl font-bold mb-4">Welcome to DBPCMS</h1>
          <p className="text-lg text-primary-100 mb-8">
            The centralized digital platform for Donna Barbar Polytechnic College.
          </p>
          <ul className="space-y-3 text-primary-100">
            <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Centralized question bank</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Year-round student registration</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Multi-level result approval</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4" /> Role-based access control</li>
          </ul>
        </div>
        <div className="text-sm text-primary-200">
          © 2026 Donna Barbar Polytechnic College. All rights reserved.
        </div>
      </div>

      {/* ─── Right form panel ─── */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="lg" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your credentials to access the management system.
          </p>

          {/* Demo credentials (Phase 2 dev mode) */}
          <div className="mt-6 rounded-md border border-primary-200 bg-primary-50 p-3 flex gap-2">
            <AlertCircle className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-primary-900 w-full">
              <strong>Demo accounts</strong> (click to fill):
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {[
                  { email: 'admin@dbpc.edu.et', password: 'Admin@12345', label: 'Super Admin' },
                  { email: 'teacher@dbpc.edu.et', password: 'Teacher@123', label: 'Teacher' },
                  { email: 'registrar@dbpc.edu.et', password: 'Registrar@123', label: 'Registrar' },
                  { email: 'principal@dbpc.edu.et', password: 'Principal@123', label: 'Principal' },
                ].map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => fillDemo(d.email, d.password)}
                    className="text-left px-2 py-1 rounded hover:bg-primary-100 text-primary-700"
                  >
                    → {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="form-label">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="form-input pl-9"
                  placeholder="you@dbpc.edu.et"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="form-label">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="form-input pl-9 pr-10"
                  placeholder="Enter your password"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            {login.isError && (
              <div className="rounded-md bg-danger-50 p-3 flex gap-2">
                <AlertCircle className="h-5 w-5 text-danger-600 flex-shrink-0" />
                <p className="text-sm text-danger-700">
                  {(login.error as Error)?.message || 'Login failed. Please try again.'}
                </p>
              </div>
            )}

            <button type="submit" disabled={login.isPending} className="btn-primary w-full">
              {login.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <GraduationCap className="h-4 w-4" />
              Sign in
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600">
            Need help? Contact{' '}
            <a href="mailto:support@dbpc.edu.et" className="font-medium text-primary-600 hover:text-primary-700">
              support@dbpc.edu.et
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
