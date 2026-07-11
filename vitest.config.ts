import { defineConfig, configDefaults } from "vitest/config";

// Integration tests (`*.integration.test.ts`) hit live Base Sepolia and are
// opt-in via `npm run test:integration` (which sets INTEGRATION=1). The default
// run stays offline: it includes only the unit tests and excludes the
// integration suffix. Both modes reuse this one config so they share an
// identical transform pipeline.
const integration = !!process.env.INTEGRATION;

export default defineConfig({
  test: {
    // Node environment — the SDK targets the Expo app / backend server,
    // but every unit test here runs against mocked clients (no live RPC).
    environment: "node",
    include: integration
      ? ["tests/**/*.integration.test.ts"]
      : ["tests/**/*.test.ts"],
    exclude: integration
      ? [...configDefaults.exclude]
      : [...configDefaults.exclude, "tests/**/*.integration.test.ts"],
    globals: false,
  },
});
