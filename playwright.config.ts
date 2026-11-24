import { defineConfig, devices } from "@playwright/test";
import { APP_ENV, APP_URL, MOCK_LLM_PORT, MOCK_LLM_URL } from "./e2e/env";

export default defineConfig({
  testDir: "./e2e",
  // Tests share a single seeded database and app server.
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node e2e/mock-llm-server.mjs",
      url: `${MOCK_LLM_URL}/health`,
      env: { MOCK_LLM_PORT: String(MOCK_LLM_PORT) },
      reuseExistingServer: false,
    },
    {
      // Not reused: the in-memory rate limiter must start empty on each run.
      command: "node e2e/start-app.mjs",
      url: APP_URL,
      env: APP_ENV,
      reuseExistingServer: false,
    },
  ],
});
