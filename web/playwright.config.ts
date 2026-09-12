import { defineConfig, devices } from "@playwright/test";

const BASE = process.env.KERYX_WEB_BASE ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // The dev server compiles a route on first request, which is slow but only once.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: BASE,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
