import type { JSX } from "react";
import { useState, type FormEvent } from "react";
import { departmentCreateSchema } from "@dbpcms/shared";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api-client";
import type { Department } from "./api";

/**
 * Create/edit form for a department. Validates with the shared Zod schema, shows
 * inline field errors, and reports server errors (e.g. duplicate code).
 */
export interface DepartmentFormValues {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}

export function DepartmentForm({
  initial,
  submitting,
  onCancel,
  onSubmit,
}: {
  initial?: Department | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: DepartmentFormValues) => Promise<void>;
}): JSX.Element {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setErrors({});
    const parsed = departmentCreateSchema.safeParse({
      name,
      code,
      description,
      isActive,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
      setErrors(errs);
      return;
    }
    try {
      await onSubmit({ name, code, description, isActive });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors({ form: error.message });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Input
        id="name"
        label="Department name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="e.g. Electrical Engineering"
      />
      <Input
        id="code"
        label="Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        error={errors.code}
        placeholder="e.g. EE"
      />
      <div>
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Active
      </label>

      {errors.form && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.form}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {initial ? "Save changes" : "Create department"}
        </Button>
      </div>
    </form>
  );
}
