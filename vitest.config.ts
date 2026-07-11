import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    // Node environment — the SDK targets the Expo app / backend server,
    // but every unit test here runs against mocked clients (no live RPC).
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Integration tests (`*.integration.test.ts`) hit live Base Sepolia and are
    // opt-in via `npm run test:integration`; keep the default run offline.
    exclude: [...configDefaults.exclude, "tests/**/*.integration.test.ts"],
    globals: false,
  },
});
