import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Provide env vars so config/env.ts validation passes during tests.
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        "postgresql://dbpcms:dbpcms_dev_password@localhost:5432/dbpcms_test?schema=public",
      JWT_ACCESS_SECRET: "test-access-secret-that-is-long-enough-32c",
      JWT_REFRESH_SECRET: "test-refresh-secret-that-is-long-enough-32c",
    },
  },
});
