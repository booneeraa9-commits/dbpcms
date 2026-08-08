/**
 * Profile page — view and edit own profile.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Phone, Calendar, Shield, Loader2, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { ROLE_LABELS } from '@dbpcms/shared';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional().or(z.literal('')),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    setSaving(true);
    // For Phase 2 we just update locally — PATCH /users/me will come in next iteration
    setTimeout(() => {
      if (user) {
        setUser({ ...user, ...data });
        toast.success('Profile updated');
      }
      setSaving(false);
    }, 500);
  };

  if (!user) return null;

  const initials = `${user.firstName[0]}${user.lastName[0]}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-600">View and update your personal information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="card">
          <div className="card-body text-center">
            <div className="mx-auto h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-3xl">
              {initials}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-gray-600">{user.email}</p>
            <div className="mt-4 flex flex-wrap gap-1 justify-center">
              {user.roles.map((r) => (
                <span key={r} className="badge-info">{ROLE_LABELS[r]}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Edit Information</h2>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">First name</label>
                <input {...register('firstName')} className="form-input" />
                {errors.firstName && <p className="form-error">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="form-label">Last name</label>
                <input {...register('lastName')} className="form-input" />
                {errors.lastName && <p className="form-error">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="form-label">Email (read-only)</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input value={user.email} readOnly className="form-input pl-9 bg-gray-50" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Contact an administrator to change your email.
              </p>
            </div>

            <div>
              <label className="form-label">Phone</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input {...register('phone')} className="form-input pl-9" placeholder="+251911234567" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={!isDirty || saving}
                className="btn-primary"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Security info */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-600" />
            Security & Access
          </h2>
        </div>
        <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">User ID</div>
            <div className="font-mono text-xs text-gray-900 mt-1">{user.id}</div>
          </div>
          <div>
            <div className="text-gray-500">Email Verified</div>
            <div className="text-gray-900 mt-1">
              {user.emailVerified ? '✓ Yes' : '✗ No'}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Last Login</div>
            <div className="text-gray-900 mt-1">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}
            </div>
          </div>
          <div>
            <div className="text-gray-500 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Account Created
            </div>
            <div className="text-gray-900 mt-1">
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
