import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const port = process.env.FACE_UI_TEST_PORT || 4317
const origin = `http://127.0.0.1:${port}`
// FACE_UI_REACT=19 points every engine at the React 19 build (weekly CI run);
// chromium-react19 always checks the React-sensitive tags on React 19.
const react = process.env.FACE_UI_REACT === '19' ? 19 : 18
const here = fileURLToPath(new URL('.', import.meta.url))
// Firefox and WebKit decide only what differs between engines (RFC §7.1).
const engine = /@layout|@css|@focus|@native|@pointer|@intl/

// The capability-tag check lives in ./test; any other file that reaches
// Playwright directly could hand a spec an untagged `test`.
for (const file of readdirSync(here, { recursive: true, encoding: 'utf8' }))
  if (
    /\.[cm]?[jt]sx?$/.test(file) &&
    !['test.ts', 'playwright.config.ts'].includes(file) &&
    /['"`]@playwright\/test['"`]/.test(readFileSync(`${here}${file}`, 'utf8'))
  )
    throw new Error(`${file}: import from './test', not '@playwright/test'`)

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: `../../../test-results/${port}`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: true,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: '../../../playwright-report' }]]
    : 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], baseURL: `${origin}/${react}/` },
    },
    {
      name: 'firefox',
      grep: engine,
      use: { ...devices['Desktop Firefox'], baseURL: `${origin}/${react}/` },
    },
    {
      name: 'webkit',
      grep: engine,
      grepInvert: /@forced-colors/,
      use: { ...devices['Desktop Safari'], baseURL: `${origin}/${react}/` },
    },
    {
      name: 'chromium-react19',
      grep: /@react|@hydration/,
      use: { ...devices['Desktop Chrome'], baseURL: `${origin}/19/` },
    },
  ],
  webServer: {
    command: 'node serve.mjs',
    cwd: here,
    url: `${origin}/18/fixture.html`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
