import type { JSX } from "react";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  employeeCreateSchema,
  GENDERS,
  MARITAL_STATUSES,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_STATUS_LABELS,
} from "@dbpcms/shared";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";
import { departmentOptionsApi, type EmployeeDetail } from "./api";

/**
 * The create/edit employee form. Grouped into Personal and Employment sections.
 * Validates with the shared Zod schema so rules match the backend exactly.
 */
export interface EmployeeFormValues {
  [key: string]: string;
}

function Select({
  id, label, value, onChange, error, children,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; error?: string; children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const SectionTitle = ({ children }: { children: React.ReactNode }): JSX.Element => (
  <h3 className="col-span-full mt-2 border-b border-slate-100 pb-1 text-sm font-semibold text-slate-700">
    {children}
  </h3>
);

export function EmployeeForm({
  initial,
  submitting,
  onCancel,
  onSubmit,
}: {
  initial?: EmployeeDetail | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: EmployeeFormValues) => Promise<void>;
}): JSX.Element {
  const { data: departments } = useQuery({
    queryKey: ["employee-department-options"],
    queryFn: () => departmentOptionsApi.list(),
  });

  const [v, setV] = useState<EmployeeFormValues>({
    firstName: initial?.firstName ?? "",
    middleName: initial?.middleName ?? "",
    lastName: initial?.lastName ?? "",
    gender: initial?.gender ?? "",
    dateOfBirth: initial?.dateOfBirth ? initial.dateOfBirth.slice(0, 10) : "",
    nationality: initial?.nationality ?? "",
    maritalStatus: initial?.maritalStatus ?? "",
    nationalId: initial?.nationalId ?? "",
    taxId: initial?.taxId ?? "",
    phoneNumber: initial?.phoneNumber ?? "",
    email: initial?.email ?? "",
    address: initial?.address ?? "",
    departmentId: initial?.departmentId ?? "",
    position: initial?.position ?? "",
    employmentType: initial?.employmentType ?? "",
    contractType: initial?.contractType ?? "",
    employmentStatus: initial?.employmentStatus ?? "",
    dateOfEmployment: initial?.dateOfEmployment ? initial.dateOfEmployment.slice(0, 10) : "",
    contractEndDate: initial?.contractEndDate ? initial.contractEndDate.slice(0, 10) : "",
    salaryGrade: initial?.salaryGrade ?? "",
    officeLocation: initial?.officeLocation ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string) => (e: { target: { value: string } }) =>
    setV((cur) => ({ ...cur, [key]: e.target.value }));

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setErrors({});
    const parsed = employeeCreateSchema.safeParse(v);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const issue of parsed.error.issues) e[String(issue.path[0])] = issue.message;
      setErrors(e);
      return;
    }
    try {
      await onSubmit(v);
    } catch (error) {
      if (error instanceof ApiError) setErrors({ form: error.message });
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SectionTitle>Personal information</SectionTitle>
        <Input id="firstName" label="First name" value={v.firstName} onChange={set("firstName")} error={errors.firstName} />
        <Input id="middleName" label="Middle name (optional)" value={v.middleName} onChange={set("middleName")} error={errors.middleName} />
        <Input id="lastName" label="Last name" value={v.lastName} onChange={set("lastName")} error={errors.lastName} />
        <Select id="gender" label="Gender" value={v.gender} onChange={(val) => setV((c) => ({ ...c, gender: val }))} error={errors.gender}>
          <option value="">Select…</option>
          {GENDERS.map((g) => <option key={g} value={g}>{g[0]!.toUpperCase() + g.slice(1)}</option>)}
        </Select>
        <Input id="dateOfBirth" label="Date of birth" type="date" value={v.dateOfBirth} onChange={set("dateOfBirth")} error={errors.dateOfBirth} />
        <Select id="maritalStatus" label="Marital status (optional)" value={v.maritalStatus} onChange={(val) => setV((c) => ({ ...c, maritalStatus: val }))} error={errors.maritalStatus}>
          <option value="">Select…</option>
          {MARITAL_STATUSES.map((m) => <option key={m} value={m}>{m[0]!.toUpperCase() + m.slice(1)}</option>)}
        </Select>
        <Input id="nationality" label="Nationality (optional)" value={v.nationality} onChange={set("nationality")} error={errors.nationality} />
        <Input id="nationalId" label="National ID" value={v.nationalId} onChange={set("nationalId")} error={errors.nationalId} />
        <Input id="taxId" label="Tax ID (optional)" value={v.taxId} onChange={set("taxId")} error={errors.taxId} />
        <Input id="phoneNumber" label="Phone number" value={v.phoneNumber} onChange={set("phoneNumber")} error={errors.phoneNumber} />
        <Input id="email" label="Email" type="email" value={v.email} onChange={set("email")} error={errors.email} />
        <Input id="address" label="Address (optional)" value={v.address} onChange={set("address")} error={errors.address} />

        <SectionTitle>Employment information</SectionTitle>
        <Select id="departmentId" label="Department" value={v.departmentId} onChange={(val) => setV((c) => ({ ...c, departmentId: val }))} error={errors.departmentId}>
          <option value="">Select a department…</option>
          {departments?.items.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
        </Select>
        <Input id="position" label="Position" value={v.position} onChange={set("position")} error={errors.position} />
        <Select id="employmentType" label="Employment type" value={v.employmentType} onChange={(val) => setV((c) => ({ ...c, employmentType: val }))} error={errors.employmentType}>
          <option value="">Select…</option>
          {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{EMPLOYMENT_TYPE_LABELS[t]}</option>)}
        </Select>
        <Select id="employmentStatus" label="Employment status" value={v.employmentStatus} onChange={(val) => setV((c) => ({ ...c, employmentStatus: val }))} error={errors.employmentStatus}>
          <option value="">Select…</option>
          {EMPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{EMPLOYMENT_STATUS_LABELS[s]}</option>)}
        </Select>
        <Input id="dateOfEmployment" label="Date of employment" type="date" value={v.dateOfEmployment} onChange={set("dateOfEmployment")} error={errors.dateOfEmployment} />
        <Input id="contractType" label="Contract type (optional)" value={v.contractType} onChange={set("contractType")} error={errors.contractType} />
        <Input id="contractEndDate" label="Contract end date (optional)" type="date" value={v.contractEndDate} onChange={set("contractEndDate")} error={errors.contractEndDate} />
        <Input id="salaryGrade" label="Salary grade (optional)" value={v.salaryGrade} onChange={set("salaryGrade")} error={errors.salaryGrade} />
        <Input id="officeLocation" label="Office location (optional)" value={v.officeLocation} onChange={set("officeLocation")} error={errors.officeLocation} />
      </div>

      {errors.form && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={submitting}>{initial ? "Save changes" : "Register employee"}</Button>
      </div>
    </form>
  );
}
