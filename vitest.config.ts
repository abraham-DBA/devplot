import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    testTimeout: 20000, // integration tests make several real round trips to the dev Postgres instance
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "actions/**/*.ts"],
      exclude: ["lib/db.ts", "lib/auth.ts", "lib/schema.ts"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
