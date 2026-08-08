import { api } from "@/lib/api-client";
import type { GradeComponentInput, GradingScaleInput } from "@dbpcms/shared";

export interface GradeComponent {
  id: string;
  name: string;
  weightPercent: number;
  maxScore: number;
  sequence: number;
  isActive: boolean;
}
export interface ScaleBand {
  id?: string;
  minPercent: number;
  maxPercent: number;
  letter: string;
  gradePoint: number;
  isPass: boolean;
}
export interface GradingScale {
  id: string;
  name: string;
  passMark: number;
  rounding: string;
  isActive: boolean;
  bands: ScaleBand[];
}

export const gradingConfigApi = {
  components: () =>
    api.get<{ components: GradeComponent[]; weightTotal: number }>("/grading-config/components"),
  createComponent: (i: GradeComponentInput) => api.post<GradeComponent>("/grading-config/components", i),
  updateComponent: (id: string, i: Partial<GradeComponentInput>) =>
    api.patch<GradeComponent>(`/grading-config/components/${id}`, i),
  removeComponent: (id: string) => api.delete<void>(`/grading-config/components/${id}`),

  scales: () => api.get<GradingScale[]>("/grading-config/scales"),
  activeScale: () => api.get<GradingScale | null>("/grading-config/scales/active"),
  saveScale: (i: GradingScaleInput) => api.post<GradingScale>("/grading-config/scales", i),
};
