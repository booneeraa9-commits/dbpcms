/** The HR report definitions available in the Employee module. */
export const HR_REPORTS = [
  { key: "employee-directory", label: "Employee Directory" },
  { key: "department-employees", label: "Department Employees" },
  { key: "qualification-summary", label: "Qualification Summary" },
  { key: "new-employees", label: "New Employees" },
  { key: "contract-expiry", label: "Contract Expiry" },
  { key: "retirement-list", label: "Retirement List" },
  { key: "staff-distribution", label: "Staff Distribution" },
] as const;

export type HrReportKey = (typeof HR_REPORTS)[number]["key"];

export const EXPORT_FORMATS = ["pdf", "excel", "csv"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
