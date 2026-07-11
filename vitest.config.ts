import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Node environment — the SDK targets the Expo app / backend server,
    // but every test here runs against mocked clients (no live RPC).
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
