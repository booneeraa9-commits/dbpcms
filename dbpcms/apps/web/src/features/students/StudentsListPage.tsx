/**
 * Students list page.
 * Browse, search, filter, and create students.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Filter, Trash2, Loader2, GraduationCap, Users, Upload, Eye,
} from 'lucide-react';
import {
  useStudents, useDeleteStudent,
} from '@/hooks/useStudents';
import { useActiveDepartments, usePrograms } from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/authStore';
import { PERMISSIONS } from '@dbpcms/shared';

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  ACTIVE: { label: 'Active', class: 'badge-success' },
  GRADUATED: { label: 'Graduated', class: 'badge-info' },
  SUSPENDED: { label: 'Suspended', class: 'badge-warning' },
  WITHDRAWN: { label: 'Withdrawn', class: 'badge-gray' },
  TRANSFERRED: { label: 'Transferred', class: 'badge-gray' },
};

export default function StudentsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const { data, isLoading } = useStudents({
    page, pageSize: 20, search: search || undefined,
    status: statusFilter || undefined, programId: programFilter || undefined,
    level: levelFilter ? Number(levelFilter) : undefined,
  });
  const { data: depts } = useActiveDepartments();
  const { data: programsData } = usePrograms({ pageSize: 100 });
  const remove = useDeleteStudent();

  const canCreate = hasPermission(PERMISSIONS.STUDENT_CREATE);
  const canImport = hasPermission(PERMISSIONS.STUDENT_IMPORT);
  const canDelete = hasPermission(PERMISSIONS.STUDENT_DELETE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-sm text-gray-600">
            {data?.meta.total ?? 0} total student{data?.meta.total === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-2">
          {canImport && (
            <Link to="/app/students/import" className="btn-secondary">
              <Upload className="h-4 w-4" />
              Bulk Import
            </Link>
          )}
          {canCreate && (
            <Link to="/app/students/new" className="btn-primary">
              <Plus className="h-4 w-4" />
              New Student
            </Link>
          )}
        </div>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search by name, ID number, phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="form-input pl-9"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="form-input sm:w-40">
          <option value="">All status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={programFilter} onChange={(e) => { setProgramFilter(e.target.value); setPage(1); }} className="form-input sm:w-56">
          <option value="">All programs</option>
          {programsData?.items.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }} className="form-input sm:w-32">
          <option value="">All levels</option>
          {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Level {l}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />Loading students…
          </div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No students found.</p>
            {canCreate && (
              <Link to="/app/students/new" className="btn-primary mt-4">
                <Plus className="h-4 w-4" />
                Add the first student
              </Link>
            )}
          </div>
        ) : (
          <div className="table-wrapper border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID Number</th>
                  <th>Program / Level</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td>
                      <Link to={`/app/students/${s.id}`} className="flex items-center gap-3 group">
                        <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                          {s.firstName[0]}{s.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 group-hover:text-primary-700">
                            {s.firstName} {s.middleName ? s.middleName + ' ' : ''}{s.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{s.gender.toLowerCase()} · {s.age} years</div>
                        </div>
                      </Link>
                    </td>
                    <td className="font-mono text-sm">{s.studentIdNumber}</td>
                    <td>
                      <div className="text-sm text-gray-900">{s.programCode}</div>
                      {s.currentRegistration ? (
                        <span className="badge-info text-xs">L{s.currentRegistration.level} · {s.currentRegistration.academicYearName}</span>
                      ) : (
                        <span className="text-xs text-gray-400">not registered</span>
                      )}
                    </td>
                    <td className="text-sm text-gray-600">{s.phone ?? '—'}</td>
                    <td>
                      <span className={STATUS_LABELS[s.status]?.class ?? 'badge-gray'}>
                        {STATUS_LABELS[s.status]?.label ?? s.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/app/students/${s.id}`}
                          className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {canDelete && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${s.firstName} ${s.lastName}?`)) remove.mutate(s.id);
                            }}
                            className="p-1.5 rounded text-gray-400 hover:text-danger-600 hover:bg-danger-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} total
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">Previous</button>
              <button onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))} disabled={page === data.meta.totalPages} className="btn-secondary">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
