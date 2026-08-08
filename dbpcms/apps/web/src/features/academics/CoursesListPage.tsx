/**
 * Courses list page.
 * Courses are the most-used academic entity — they belong to departments,
 * can be linked to programs, have a level, credits, hours, and competencies.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BookOpen, Plus, Trash2, X, Loader2, Search, Filter, Clock, Award, ListChecks,
} from 'lucide-react';
import {
  useCourses, useCreateCourse, useDeleteCourse,
  useActiveDepartments, useCompetencies,
  type Course,
} from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@dbpcms/shared';

const formSchema = z.object({
  departmentId: z.string().uuid('Select a department'),
  code: z.string().min(2).max(30).regex(/^[A-Z0-9-]+$/),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  level: z.coerce.number().int().min(1).max(5),
  credits: z.coerce.number().int().min(0).default(3),
  theoryHours: z.coerce.number().int().min(0).default(0),
  practicalHours: z.coerce.number().int().min(0).default(0),
  competencyIds: z.array(z.string().uuid()).default([]),
});
type FormData = z.infer<typeof formSchema>;

export default function CoursesListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const { data, isLoading } = useCourses({
    page, pageSize: 20, search: search || undefined,
    departmentId: deptFilter || undefined, level: levelFilter || undefined,
  });
  const { data: depts } = useActiveDepartments();
  const create = useCreateCourse();
  const remove = useDeleteCourse();

  const canManage = hasPermission(PERMISSIONS.COURSE_MANAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="mt-1 text-sm text-gray-600">Manage courses offered by the college</p>
        </div>
        {canManage && (
          <button onClick={() => setShowModal(true)} className="btn-primary" disabled={!depts?.length}>
            <Plus className="h-4 w-4" />
            New Course
          </button>
        )}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search by code or name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input pl-9"
          />
        </div>
        <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }} className="form-input sm:w-56">
          <option value="">All departments</option>
          {depts?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }} className="form-input sm:w-32">
          <option value="">All levels</option>
          {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Level {l}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading…
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No courses yet.</p>
          </div>
        ) : (
          <div className="table-wrapper border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Dept / Level</th>
                  <th>Credits / Hours</th>
                  <th>Competencies</th>
                  <th>Questions</th>
                  {canManage && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data?.items.map((c: Course) => (
                  <tr key={c.id}>
                    <td className="font-mono text-sm">{c.code}</td>
                    <td>
                      <div className="font-medium text-gray-900">{c.name}</div>
                      {c.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{c.description}</div>}
                    </td>
                    <td>
                      <div className="text-sm text-gray-900">{c.departmentName}</div>
                      <span className="badge-info text-xs">Level {c.level}</span>
                    </td>
                    <td className="text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Award className="h-3.5 w-3.5" /> {c.credits} cr
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Clock className="h-3 w-3" /> {c.theoryHours + c.practicalHours}h
                        {c.practicalHours > 0 && <span className="text-gray-400">({c.theoryHours}t + {c.practicalHours}p)</span>}
                      </div>
                    </td>
                    <td>
                      {c.competencies.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {c.competencies.slice(0, 2).map((comp) => (
                            <span key={comp.id} className="badge-gray text-[10px]">{comp.code}</span>
                          ))}
                          {c.competencies.length > 2 && (
                            <span className="text-xs text-gray-500">+{c.competencies.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="text-sm text-gray-600">
                      <ListChecks className="inline h-3.5 w-3.5 mr-1" />
                      {c._count?.questions ?? 0}
                    </td>
                    {canManage && (
                      <td className="text-right">
                        <button
                          onClick={() => { if (confirm(`Delete "${c.name}"?`)) remove.mutate(c.id); }}
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
        <CreateCourseModal
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

function CreateCourseModal({
  departments, onClose, onSubmit, isLoading,
}: {
  departments: { id: string; code: string; name: string }[];
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  isLoading: boolean;
}) {
  const { data: competencies } = useCompetencies();
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      departmentId: '', code: '', name: '', description: '',
      level: 1, credits: 3, theoryHours: 2, practicalHours: 2, competencyIds: [],
    },
  });
  const selectedComps = watch('competencyIds');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">New Course</h3>
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
              <input {...register('code')} className="form-input font-mono" placeholder="e.g. CS101" />
              {errors.code && <p className="form-error">{errors.code.message}</p>}
            </div>
            <div>
              <label className="form-label">Level *</label>
              <select {...register('level')} className="form-input">
                {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Name *</label>
            <input {...register('name')} className="form-input" placeholder="e.g. Introduction to Programming" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea {...register('description')} rows={2} className="form-input" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Credits</label>
              <input type="number" min={0} {...register('credits')} className="form-input" />
            </div>
            <div>
              <label className="form-label">Theory (h)</label>
              <input type="number" min={0} {...register('theoryHours')} className="form-input" />
            </div>
            <div>
              <label className="form-label">Practical (h)</label>
              <input type="number" min={0} {...register('practicalHours')} className="form-input" />
            </div>
          </div>
          {competencies && competencies.length > 0 && (
            <div>
              <label className="form-label">Competencies developed (optional)</label>
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {competencies.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedComps.includes(c.id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selectedComps, c.id]
                          : selectedComps.filter(id => id !== c.id);
                        setValue('competencyIds', next);
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600"
                    />
                    <span className="text-sm">{c.name}</span>
                    <span className="text-xs text-gray-500 ml-auto font-mono">{c.code}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Course
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
