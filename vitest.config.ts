import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    // JSDOM and database integration files are memory-heavy when the complete
    // gate runs beside the local Supabase stack. A bounded worker pool avoids
    // resource-contention timeouts that do not occur in the tested behavior.
    maxWorkers: 4,
    testTimeout: 10_000,
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
      "tests/contract/**/*.test.{ts,tsx}",
      "tests/resilience/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["./tests/setup/vitest.ts"],
    coverage: {
      reporter: ["text", "json-summary", "html"],
    },
  },
});
