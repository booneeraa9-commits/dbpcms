/**
 * Users management page (admin only).
 * Lists all users with search, filters, and CRUD actions.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { z } from 'zod';
import { ROLE_LABELS, emailSchema, passwordSchema } from '@dbpcms/shared';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useRoles, type RoleOption } from '@/hooks/useUsers';
import type { Role, User } from '@dbpcms/shared';

const createFormSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  phone: z.string().optional().or(z.literal('')),
  password: passwordSchema,
  roleIds: z.array(z.string()).min(1, 'Select at least one role'),
});

type CreateForm = z.infer<typeof createFormSchema>;

export default function UsersListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);

  const { data, isLoading } = useUsers({ page, pageSize: 20, search: search || undefined });
  const { data: roles } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const handleDelete = (id: string, email: string) => {
    if (confirm(`Delete user ${email}? This cannot be undone.`)) {
      deleteUser.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-600">Manage staff and admin accounts</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <UserPlus className="h-4 w-4" />
          New User
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="form-input pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-wrapper border-0 rounded-none">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Last Login</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading users…
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                data?.items.map((user: User) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          {user.phone && (
                            <div className="text-xs text-gray-500">{user.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-gray-700">{user.email}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                      {user.roles.map((r: Role) => (
                        <span key={r} className="badge-info">{ROLE_LABELS[r] ?? r}</span>
                      ))}
                      </div>
                    </td>
                    <td>
                      {user.isActive ? (
                        <span className="badge-success">Active</span>
                      ) : (
                        <span className="badge-gray">Inactive</span>
                      )}
                    </td>
                    <td className="text-sm text-gray-600">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleDelete(user.id, user.email)}
                        className="p-1.5 rounded text-gray-400 hover:text-danger-600 hover:bg-danger-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {(data.meta.page - 1) * data.meta.pageSize + 1}-
              {Math.min(data.meta.page * data.meta.pageSize, data.meta.total)} of{' '}
              {data.meta.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                disabled={page === data.meta.totalPages}
                className="btn-secondary"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showModal && (
        <CreateUserModal
          roles={roles ?? []}
          onClose={() => {
            setShowModal(false);
            setEditingUser(null);
          }}
          onSubmit={async (data) => {
            await createUser.mutateAsync(data);
            setShowModal(false);
          }}
          isLoading={createUser.isPending}
        />
      )}
    </div>
  );
}

// ─── Create User Modal ────────────────────────────────
function CreateUserModal({
  roles,
  onClose,
  onSubmit,
  isLoading,
}: {
  roles: RoleOption[];
  onClose: () => void;
  onSubmit: (data: CreateForm) => Promise<void>;
  isLoading: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateForm>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      roleIds: [],
    },
  });

  const selectedRoles = watch('roleIds');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
          <button onClick={onClose} className="p-1.5 rounded text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
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
            <label className="form-label">Email</label>
            <input type="email" {...register('email')} className="form-input" />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <div>
            <label className="form-label">Phone (optional)</label>
            <input {...register('phone')} className="form-input" placeholder="+251911234567" />
          </div>

          <div>
            <label className="form-label">Password</label>
            <input type="password" {...register('password')} className="form-input" />
            {errors.password && <p className="form-error">{errors.password.message}</p>}
            <p className="text-xs text-gray-500 mt-1">
              Min 8 characters, with uppercase, lowercase, and a number.
            </p>
          </div>

          <div>
            <label className="form-label">Roles</label>
            <div className="space-y-2 mt-2">
              {roles.map((role) => (
                <label key={role.id} className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.id)}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...selectedRoles, role.id]
                        : selectedRoles.filter((id) => id !== role.id);
                      setValue('roleIds', next, { shouldValidate: true });
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{role.name}</div>
                    {role.description && (
                      <div className="text-xs text-gray-500">{role.description}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
            {errors.roleIds && <p className="form-error">{errors.roleIds.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
