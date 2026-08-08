import { api } from "@/lib/api-client";

export interface DashboardSummary {
  roles: string[];
  counts: Partial<Record<"users" | "employees" | "students" | "departments" | "courses" | "sections", number>>;
  employeesByDepartment?: { label: string; value: number }[];
  hr?: { newThisMonth: number; contractsExpiring: number };
  studentsByStatus?: { label: string; value: number }[];
  gradePipeline?: {
    draft: number; submitted: number; dept_approved: number; published: number; returned: number;
  };
  mySections?: {
    sectionId: string; course: string; semester: string; enrolled: number; status: string;
  }[];
  recentActivity?: { action: string; who: string; entityType: string | null; at: string }[];
}

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>("/dashboard/summary"),
};
