import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PlaceholderPage } from "@/features/misc/PlaceholderPage";
import { DepartmentsPage } from "@/features/departments/DepartmentsPage";
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
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/change-password", element: <ChangePasswordPage /> },
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "employees", element: <PlaceholderPage title="Employees" /> },
          { path: "grading", element: <PlaceholderPage title="Grading" /> },
          { path: "departments", element: <DepartmentsPage /> },
          { path: "admin", element: <PlaceholderPage title="Administration" /> },
          { path: "*", element: <PlaceholderPage title="Page not found" /> },
        ],
      },
    ],
  },
]);
