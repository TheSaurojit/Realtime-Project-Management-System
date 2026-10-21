import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const envVars = loadEnv(mode || "test", process.cwd(), "");
  return {
    test: {
      environment: "node",
      globals: true,
      env: {
        DATABASE_URL:
          process.env.DATABASE_URL ||
          envVars.DATABASE_URL ||
          "postgresql://postgres:postgrespassword@localhost:5433/project_management?schema=public",
        JWT_SECRET:
          process.env.JWT_SECRET ||
          envVars.JWT_SECRET ||
          "super-secret-jwt-key-project-mgmt-platform-2026",
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
  };
});

