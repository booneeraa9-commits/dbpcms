/**
 * Departments list page.
 * Browse, create, edit, and delete academic departments.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2, Plus, Trash2, X, Loader2, BookOpen, Users, Search, AlertCircle,
} from 'lucide-react';
import {
  useDepartments, useCreateDepartment, useDeleteDepartment,
  type Department,
} from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@dbpcms/shared';
import { EmptyState } from '@/components/feedback/EmptyState';

const formSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z0-9-]+$/, 'Uppercase letters, numbers, dashes only'),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
});
type FormData = z.infer<typeof formSchema>;

export default function DepartmentsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const { data, isLoading } = useDepartments({ page, pageSize: 20, search: search || undefined });
  const create = useCreateDepartment();
  const remove = useDeleteDepartment();

  const canManage = hasPermission(PERMISSIONS.DEPARTMENT_MANAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="mt-1 text-sm text-gray-600">Manage academic departments</p>
        </div>
        {canManage && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            New Department
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search departments…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input pl-9"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading…
          </div>
        ) : data?.items.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No departments yet"
            description="Departments are the top-level academic units in your college. Create your first one to start organizing programs and courses."
            action={canManage ? { label: 'Create the first department', onClick: () => setShowModal(true) } : undefined}
          />
        ) : (
          <div className="table-wrapper border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Programs</th>
                  <th>Courses</th>
                  <th>Status</th>
                  {canManage && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data?.items.map((d: Department) => (
                  <tr key={d.id}>
                    <td className="font-mono text-sm">{d.code}</td>
                    <td>
                      <div className="font-medium text-gray-900">{d.name}</div>
                      {d.description && <div className="text-xs text-gray-500 mt-0.5">{d.description}</div>}
                    </td>
                    <td className="text-sm text-gray-600">
                      <Users className="inline h-3.5 w-3.5 mr-1" />
                      {d._count?.programs ?? 0}
                    </td>
                    <td className="text-sm text-gray-600">
                      <BookOpen className="inline h-3.5 w-3.5 mr-1" />
                      {d._count?.courses ?? 0}
                    </td>
                    <td>
                      {d.isActive ? <span className="badge-success">Active</span> : <span className="badge-gray">Inactive</span>}
                    </td>
                    {canManage && (
                      <td className="text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${d.name}"?`)) remove.mutate(d.id);
                          }}
                          className="p-1.5 rounded text-gray-400 hover:text-danger-600 hover:bg-danger-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <CreateModal
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

function CreateModal({
  onClose, onSubmit, isLoading,
}: {
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: '', name: '', description: '' },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">New Department</h3>
          <button onClick={onClose} className="p-1.5 rounded text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="form-label">Code</label>
            <input {...register('code')} className="form-input font-mono" placeholder="e.g. COMP" />
            {errors.code && <p className="form-error">{errors.code.message}</p>}
            <p className="text-xs text-gray-500 mt-1">Short identifier used everywhere (uppercase)</p>
          </div>
          <div>
            <label className="form-label">Name</label>
            <input {...register('name')} className="form-input" placeholder="e.g. Computing Department" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label">Description (optional)</label>
            <textarea {...register('description')} rows={3} className="form-input" />
          </div>

          <div className="rounded-md bg-primary-50 border border-primary-200 p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 text-primary-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-primary-900">
              <strong>Tip:</strong> After creating a department, you can add programs (e.g. &quot;Computer Science&quot;) and occupations (Ethiopian TVET jobs).
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Department
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
