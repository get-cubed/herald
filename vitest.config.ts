import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["src/integration/**"], // Integration tests run separately
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/integration/**/*.ts",
        "src/types.ts",
        "src/cli/**/*.ts", // CLI scripts have UI output that's hard to test
        "src/hooks/**/*.ts", // Thin wrappers - logic tested via handlers
      ],
    },
  },
});
