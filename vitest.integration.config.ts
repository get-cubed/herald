import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/integration/**/*.test.ts"],
    testTimeout: 10000, // Longer timeout for actual system commands
  },
});
