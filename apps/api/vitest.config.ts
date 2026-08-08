import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Tests run against a database. The values here are overridden by the real
    // .env when running locally; these are safe fallbacks for CI.
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://dbpcms:dbpcms_dev_password@localhost:5432/dbpcms?schema=public",
      JWT_ACCESS_SECRET: "test-access-secret-that-is-long-enough-32c",
      JWT_REFRESH_SECRET: "test-refresh-secret-that-is-long-enough-32c",
      SEED_ADMIN_EMAIL: "booneeraa9@gmail.com",
      SEED_ADMIN_PASSWORD: "Abbaakoo1@Abbaakoo1@",
      STORAGE_ROOT: "./.test-storage",
    },
    // Run test files one at a time (they share one database).
    fileParallelism: false,
  },
});
