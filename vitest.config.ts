import { defineConfig, configDefaults } from "vitest/config";

// Three opt-in tiers share this config so they share one transform pipeline:
//   default          unit tests only, fully offline
//   INTEGRATION=1    `*.integration.test.ts` and `*.fork.test.ts`, local anvil forks
//   KOKIO_LIVE=1     `*.live.test.ts`, real Base Sepolia and Pimlico
const integration = !!process.env.INTEGRATION;
const live = !!process.env.KOKIO_LIVE;

const INTEGRATION_FILES = ["tests/**/*.integration.test.ts", "tests/**/*.fork.test.ts"];
const LIVE_FILES = ["tests/**/*.live.test.ts"];

export default defineConfig({
  test: {
    // The SDK targets the Expo app and a Node backend. No test needs a DOM.
    environment: "node",
    include: live ? LIVE_FILES : integration ? INTEGRATION_FILES : ["tests/**/*.test.ts"],
    exclude: live || integration
      ? [...configDefaults.exclude]
      : [...configDefaults.exclude, ...INTEGRATION_FILES, ...LIVE_FILES],
    globals: false,
  },
});
