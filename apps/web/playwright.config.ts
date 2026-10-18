import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chrome-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "chrome-mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm --prefix ../.. run build && npx concurrently --kill-others --success first \"npm --prefix ../.. run worker:media\" \"npm run start\"",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: { MEDIA_RATE_LIMIT_MAX: "1000" },
  },
});
