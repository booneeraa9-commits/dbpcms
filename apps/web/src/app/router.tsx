import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { PlaceholderPage } from "@/features/misc/PlaceholderPage";

/**
 * Central route table. As features are built, their pages replace the
 * placeholders here. Route-level permission guards are added in Phase 2.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "employees", element: <PlaceholderPage title="Employees" /> },
      { path: "grading", element: <PlaceholderPage title="Grading" /> },
      { path: "departments", element: <PlaceholderPage title="Departments" /> },
      { path: "admin", element: <PlaceholderPage title="Administration" /> },
      { path: "*", element: <PlaceholderPage title="Page not found" /> },
    ],
  },
]);
