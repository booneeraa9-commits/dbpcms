import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "@/lib/query-client";
import { router } from "@/app/router";
import { AuthProvider } from "@/features/auth/AuthContext";
import "@/styles/index.css";

/**
 * The frontend entry point. It wires up:
 *  - React Query (server data management)
 *  - React Router (navigation)
 * and mounts the app into index.html's #root element.
 */
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
