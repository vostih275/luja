import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30000,
    env: {
      DATABASE_URL: "file:./test.db",
      JWT_SECRET: "test-secret-0123456789abcdef",
      STORAGE_DIR: "./storage/books-test",
      ADMIN_EMAIL: "admin@test.local",
      ADMIN_PASSWORD: "AdminPass123!",
      MAX_UPLOAD_MB: "50",
      NODE_ENV: "test",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
