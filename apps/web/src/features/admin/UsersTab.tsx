import type { JSX } from "react";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, KeyRound, Search } from "lucide-react";
import { userCreateSchema } from "@dbpcms/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/toast/ToastProvider";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/lib/api-client";
import { usersApi, ROLE_LABELS, type ManagedUser } from "./api";

const PAGE_SIZE = 10;

export function UsersTab(): JSX.Element {
  const toast = useToast();
  const qc = useQueryClient();
  const { hasPermission, user: currentUser } = useAuth();
  const canCreate = hasPermission("user:create");
  const canUpdate = hasPermission("user:update");
  const canDelete = hasPermission("user:delete");
  const canReset = hasPermission("user:reset-password");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState<ManagedUser | null>(null);
  const [resetting, setResetting] = useState<ManagedUser | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["users", page, search],
    queryFn: () => usersApi.list({ page, pageSize: PAGE_SIZE, search: search || undefined }),
  });
  const { data: roles } = useQuery({ queryKey: ["roles"], queryFn: () => usersApi.roles() });

  // form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetPassword, setResetPassword] = useState("");

  function openCreate(): void {
    setEditing(null);
    setFullName(""); setEmail(""); setTempPassword(""); setRoleIds([]); setIsActive(true);
    setErrors({});
    setFormOpen(true);
  }
  function openEdit(u: ManagedUser): void {
    setEditing(u);
    setFullName(u.fullName); setEmail(u.email);
    setRoleIds(u.roles.map((r) => r.id)); setIsActive(u.isActive);
    setErrors({});
    setFormOpen(true);
  }
  function toggleRole(id: string): void {
    setRoleIds((cur) => (cur.includes(id) ? cur.filter((r) => r !== id) : [...cur, id]));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return usersApi.update(editing.id, { fullName, isActive, roleIds });
      }
      const payload = { fullName, email, temporaryPassword: tempPassword, roleIds, isActive };
      const parsed = userCreateSchema.safeParse(payload);
      if (!parsed.success) {
        const e: Record<string, string> = {};
        for (const i of parsed.error.issues) e[String(i.path[0])] = i.message;
        setErrors(e);
        throw new Error("validation");
      }
      return usersApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "User updated." : "User created.");
      setFormOpen(false);
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) setErrors({ form: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => { toast.success("User deleted."); setDeleting(null); void qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (err: Error) => { toast.error(err.message); setDeleting(null); },
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) => usersApi.resetPassword(id, { temporaryPassword: resetPassword }),
    onSuccess: () => { toast.success("Password reset. The user must change it at next login."); setResetting(null); setResetPassword(""); },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns: Column<ManagedUser>[] = [
    {
      header: "Name",
      cell: (u) => (
        <div>
          <p className="font-medium text-slate-900">{u.fullName}</p>
          <p className="text-xs text-slate-500">{u.email}</p>
        </div>
      ),
    },
    {
      header: "Roles",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.map((r) => (
            <span key={r.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {ROLE_LABELS[r.name] ?? r.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: "Status",
      cell: (u) => (
        <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
          {u.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Last login",
      cell: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"),
    },
    {
      header: "",
      className: "text-right",
      cell: (u) => (
        <div className="flex justify-end gap-1">
          {canReset && (
            <button type="button" onClick={() => { setResetting(u); setResetPassword(""); }} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600" aria-label="Reset password" title="Reset password">
              <KeyRound className="h-4 w-4" />
            </button>
          )}
          {canUpdate && (
            <button type="button" onClick={() => openEdit(u)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600" aria-label="Edit" title="Edit">
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {canDelete && u.id !== currentUser?.id && (
            <button type="button" onClick={() => setDeleting(u)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600" aria-label="Delete" title="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  function submit(e: FormEvent): void {
    e.preventDefault();
    setErrors({});
    saveMutation.mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by name or email…" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
        </form>
        {canCreate && (
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> New user</Button>
        )}
      </div>

      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(u) => u.id} isLoading={isLoading} isError={isError} emptyMessage="No users found." onRetry={() => void refetch()} />
      {data && data.totalItems > 0 && (
        <Pagination page={data.page} pageSize={data.pageSize} totalItems={data.totalItems} onPageChange={setPage} />
      )}

      {/* Create / edit modal */}
      <Modal open={formOpen} title={editing ? "Edit user" : "New user"} onClose={() => setFormOpen(false)}>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Input id="u-name" label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} />
          {!editing && (
            <>
              <Input id="u-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
              <Input id="u-temp" label="Temporary password" type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} error={errors.temporaryPassword} placeholder="Min 12 characters" />
              <p className="text-xs text-slate-500">The user will be required to change this at first login.</p>
            </>
          )}
          <div>
            <p className="mb-1 block text-sm font-medium text-slate-700">Roles</p>
            <div className="grid grid-cols-2 gap-2">
              {roles?.map((r) => (
                <label key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input type="checkbox" checked={roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} className="h-4 w-4 rounded border-slate-300" />
                  {ROLE_LABELS[r.name] ?? r.name}
                </label>
              ))}
            </div>
            {errors.roleIds && <p className="mt-1 text-xs text-red-600">{errors.roleIds}</p>}
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Active
            </label>
          )}
          {errors.form && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>{editing ? "Save changes" : "Create user"}</Button>
          </div>
        </form>
      </Modal>

      {/* Reset password modal */}
      <Modal open={resetting !== null} title="Reset password" onClose={() => setResetting(null)}>
        <p className="mb-4 text-sm text-slate-600">
          Set a new temporary password for <strong>{resetting?.fullName}</strong>. They will be
          required to change it at their next login, and all their active sessions will end.
        </p>
        <Input id="reset-pw" label="Temporary password" type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Min 12 characters" />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setResetting(null)}>Cancel</Button>
          <Button loading={resetMutation.isPending} onClick={() => resetting && resetMutation.mutate(resetting.id)}>Reset password</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete user"
        message={`Delete "${deleting?.fullName}"? Their access will be revoked immediately.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
      />
    </div>
  );
}
