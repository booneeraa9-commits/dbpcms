/**
 * Academic Years page.
 * Manage the college's academic calendar.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calendar, Plus, Star, Loader2, Check, X, Clock,
} from 'lucide-react';
import {
  useAcademicYears, useCreateAcademicYear, useCurrentAcademicYear,
} from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@dbpcms/shared';

const formSchema = z.object({
  name: z.string().min(4).max(50),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  isCurrent: z.boolean().optional(),
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});
type FormData = z.infer<typeof formSchema>;

export default function AcademicYearsPage() {
  const [showModal, setShowModal] = useState(false);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { data: years, isLoading } = useAcademicYears();
  const { data: current } = useCurrentAcademicYear();
  const create = useCreateAcademicYear();

  const canManage = hasPermission(PERMISSIONS.DEPARTMENT_MANAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academic Years</h1>
          <p className="mt-1 text-sm text-gray-600">Manage the college's academic calendar</p>
        </div>
        {canManage && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            New Academic Year
          </button>
        )}
      </div>

      {current?.year && (
        <div className="card p-5 border-primary-200 bg-primary-50">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <Star className="h-6 w-6 text-primary-600 fill-primary-600" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-primary-600 uppercase tracking-wider">Current Academic Year</div>
              <div className="text-lg font-semibold text-gray-900">{current.year.name}</div>
              <div className="text-sm text-gray-600 mt-0.5">
                {new Date(current.year.startDate).toLocaleDateString()} → {new Date(current.year.endDate).toLocaleDateString()}
              </div>
            </div>
            {current.semester && (
              <span className="badge-info">{current.semester.name}</span>
            )}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading…
          </div>
        ) : !years || years.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No academic years defined yet.</p>
            {canManage && (
              <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
                <Plus className="h-4 w-4" /> Create the first one
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {years.map((y) => (
              <div key={y.id} className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-gray-900">{y.name}</div>
                    {y.isCurrent && <span className="badge-info">Current</span>}
                    {!y.isActive && <span className="badge-gray">Inactive</span>}
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5 flex items-center gap-3">
                    <span>
                      {new Date(y.startDate).toLocaleDateString()} → {new Date(y.endDate).toLocaleDateString()}
                    </span>
                    {y.semesters.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {y.semesters.length} semester{y.semesters.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CreateYearModal
          onClose={() => setShowModal(false)}
          onSubmit={async (data) => {
            await create.mutateAsync(data);
            setShowModal(false);
          }}
          isLoading={create.isPending}
        />
      )}
    </div>
  );
}

function CreateYearModal({
  onClose, onSubmit, isLoading,
}: {
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `${currentYear}/${currentYear + 1}`,
      startDate: `${currentYear}-09-01`,
      endDate: `${currentYear + 1}-08-31`,
      isCurrent: false,
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">New Academic Year</h3>
          <button onClick={onClose} className="p-1.5 rounded text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="form-label">Name</label>
            <input {...register('name')} className="form-input" placeholder="e.g. 2025/2026" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start date</label>
              <input type="date" {...register('startDate')} className="form-input" />
              {errors.startDate && <p className="form-error">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="form-label">End date</label>
              <input type="date" {...register('endDate')} className="form-input" />
              {errors.endDate && <p className="form-error">{errors.endDate.message}</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('isCurrent')} className="h-4 w-4 rounded border-gray-300 text-primary-600" />
            <span className="text-sm text-gray-700">Set as current academic year</span>
          </label>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
