import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Vite runs the frontend in development and builds it for release.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // listen on 0.0.0.0 so it works in the preview environment
    port: 5173,
    // Allow the hosted preview domain (and localhost) to load the dev server.
    // ".e2b.app" covers the Arena live-preview host. On your Windows machine
    // you use http://localhost:5173 which is always allowed.
    allowedHosts: [".e2b.app", "localhost"],
    // In dev, forward any /api call to the backend so the browser only ever
    // talks to the same origin (no CORS headaches, no hardcoded localhost).
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
