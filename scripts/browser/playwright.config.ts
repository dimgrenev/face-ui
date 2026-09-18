import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'
const baseURL = `http://127.0.0.1:${process.env.FACE_UI_TEST_PORT || 4317}`
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: `../../test-results/${process.env.FACE_UI_TEST_PORT || 4317}`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    command: 'node scripts/browser/server.mjs',
    url: `${baseURL}/scripts/browser/`,
    reuseExistingServer: !process.env.CI,
  },
})
