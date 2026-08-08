import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PlaceholderPage } from "@/features/misc/PlaceholderPage";
import { DepartmentsPage } from "@/features/departments/DepartmentsPage";
import { EmployeesListPage } from "@/features/employees/EmployeesListPage";
import { EmployeeProfilePage } from "@/features/employees/EmployeeProfilePage";
import { AcademicPage } from "@/features/academic/AcademicPage";
import { AdministrationPage } from "@/features/admin/AdministrationPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { VerifyPage } from "@/features/verify/VerifyPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { ChangePasswordPage } from "@/features/auth/ChangePasswordPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";

/**
 * Central route table.
 *  - /login and /change-password are shown outside the app shell.
 *  - Everything else is behind <ProtectedRoute>, which requires a logged-in user.
 * Route-level permission guards per feature are added as modules are built.
 */
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  // Public document verification (no login required).
  { path: "/verify", element: <VerifyPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/change-password", element: <ChangePasswordPage /> },
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "employees", element: <EmployeesListPage /> },
          { path: "employees/:id", element: <EmployeeProfilePage /> },
          { path: "grading", element: <PlaceholderPage title="Grading" /> },
          { path: "departments", element: <DepartmentsPage /> },
          { path: "academic", element: <AcademicPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "admin", element: <AdministrationPage /> },
          { path: "*", element: <PlaceholderPage title="Page not found" /> },
        ],
      },
    ],
  },
]);
