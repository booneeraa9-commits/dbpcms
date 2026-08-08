/**
 * Programs list page.
 * A program belongs to a department and has occupations and levels.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  GraduationCap, Plus, Trash2, X, Loader2, Search, Filter, BookOpen, Clock,
} from 'lucide-react';
import {
  usePrograms, useCreateProgram, useDeleteProgram,
  useActiveDepartments, useActiveOccupations,
  type Program,
} from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@dbpcms/shared';

const formSchema = z.object({
  departmentId: z.string().uuid('Select a department'),
  code: z.string().min(2).max(20).regex(/^[A-Z0-9-]+$/),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  durationYears: z.coerce.number().int().min(1).max(6),
  totalCredits: z.coerce.number().int().min(0),
  levels: z.array(z.coerce.number().int().min(1).max(5)).min(1, 'Select at least one level'),
  occupationIds: z.array(z.string().uuid()).default([]),
});
type FormData = z.infer<typeof formSchema>;

const ALL_LEVELS = [1, 2, 3, 4, 5];

export default function ProgramsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const { data, isLoading } = usePrograms({
    page, pageSize: 20, search: search || undefined, departmentId: deptFilter || undefined,
  });
  const { data: depts } = useActiveDepartments();
  const create = useCreateProgram();
  const remove = useDeleteProgram();

  const canManage = hasPermission(PERMISSIONS.DEPARTMENT_MANAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
          <p className="mt-1 text-sm text-gray-600">Manage academic programs within departments</p>
        </div>
        {canManage && (
          <button onClick={() => setShowModal(true)} className="btn-primary" disabled={!depts?.length}>
            <Plus className="h-4 w-4" />
            New Program
          </button>
        )}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search programs…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input pl-9"
          />
        </div>
        <div className="relative sm:w-64">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
            className="form-input pl-9"
          >
            <option value="">All departments</option>
            {depts?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading…
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No programs yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="table-wrapper border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Levels</th>
                  <th>Occupations</th>
                  <th>Duration</th>
                  {canManage && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data?.items.map((p: Program) => (
                  <tr key={p.id}>
                    <td className="font-mono text-sm">{p.code}</td>
                    <td>
                      <div className="font-medium text-gray-900">{p.name}</div>
                      {p.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.description}</div>}
                    </td>
                    <td className="text-sm text-gray-600">{p.departmentName ?? '—'}</td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {p.levels.map((l) => <span key={l} className="badge-info">L{l}</span>)}
                      </div>
                    </td>
                    <td className="text-sm text-gray-600">
                      {p.occupations.length > 0 ? p.occupations.map(o => o.code).join(', ') : '—'}
                    </td>
                    <td className="text-sm text-gray-600">
                      <Clock className="inline h-3.5 w-3.5 mr-1" />
                      {p.durationYears}y
                    </td>
                    {canManage && (
                      <td className="text-right">
                        <button
                          onClick={() => { if (confirm(`Delete "${p.name}"?`)) remove.mutate(p.id); }}
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
        <CreateProgramModal
          departments={depts ?? []}
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

function CreateProgramModal({
  departments, onClose, onSubmit, isLoading,
}: {
  departments: { id: string; code: string; name: string }[];
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading: boolean;
}) {
  const { data: occupations } = useActiveOccupations();
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      departmentId: '', code: '', name: '', description: '',
      durationYears: 3, totalCredits: 0, levels: [1], occupationIds: [],
    },
  });
  const selectedLevels = watch('levels');
  const selectedOccs = watch('occupationIds');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">New Program</h3>
          <button onClick={onClose} className="p-1.5 rounded text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="form-label">Department *</label>
            <select {...register('departmentId')} className="form-input">
              <option value="">Select department…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {errors.departmentId && <p className="form-error">{errors.departmentId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Code *</label>
              <input {...register('code')} className="form-input font-mono" placeholder="e.g. CS" />
              {errors.code && <p className="form-error">{errors.code.message}</p>}
            </div>
            <div>
              <label className="form-label">Duration (years)</label>
              <input type="number" min={1} max={6} {...register('durationYears')} className="form-input" />
            </div>
          </div>
          <div>
            <label className="form-label">Name *</label>
            <input {...register('name')} className="form-input" placeholder="e.g. Computer Science" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea {...register('description')} rows={2} className="form-input" />
          </div>
          <div>
            <label className="form-label">Total credits</label>
            <input type="number" min={0} {...register('totalCredits')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Levels covered *</label>
            <div className="flex gap-2 flex-wrap mt-2">
              {ALL_LEVELS.map((l) => (
                <button
                  key={l} type="button"
                  onClick={() => {
                    const next = selectedLevels.includes(l)
                      ? selectedLevels.filter(x => x !== l)
                      : [...selectedLevels, l].sort();
                    setValue('levels', next, { shouldValidate: true });
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    selectedLevels.includes(l)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary-300'
                  }`}
                >
                  Level {l}
                </button>
              ))}
            </div>
            {errors.levels && <p className="form-error">{errors.levels.message}</p>}
          </div>
          {occupations && occupations.length > 0 && (
            <div>
              <label className="form-label">Occupations (optional)</label>
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {occupations.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedOccs.includes(o.id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selectedOccs, o.id]
                          : selectedOccs.filter(id => id !== o.id);
                        setValue('occupationIds', next);
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600"
                    />
                    <span className="text-sm">{o.name}</span>
                    <span className="text-xs text-gray-500 ml-auto font-mono">{o.code}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Program
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
