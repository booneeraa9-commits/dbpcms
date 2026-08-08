/**
 * @dbpcms/shared — the single source of truth shared by the backend and frontend.
 *
 * Anything that BOTH apps must agree on lives here: validation schemas (Zod),
 * shared TypeScript types, and constants like roles and permissions.
 * This prevents the frontend and backend from drifting out of sync.
 */

export * from "./constants/roles.js";
export * from "./constants/permissions.js";
export * from "./constants/role-permissions.js";
export * from "./types/api.js";
export * from "./validation/auth.js";
export * from "./validation/academic.js";
export * from "./validation/users.js";
export * from "./validation/employees.js";
export * from "./validation/employee-subrecords.js";
