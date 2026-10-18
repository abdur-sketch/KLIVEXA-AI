import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

loadEnv({ path: path.resolve(import.meta.dirname, "../../.env"), quiet: true });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "src/test/server-only.ts"),
    },
  },
  test: {
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    sequence: { concurrent: false },
  },
});
