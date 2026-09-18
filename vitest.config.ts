import path from 'node:path'
import { defineConfig } from 'vitest/config'

const react19 = path.resolve(
  import.meta.dirname,
  'assets/__tests__/react-19/node_modules',
)
// Pure-logic suites (`*.test.ts`) run once in node. Everything that touches the
// DOM or React (`*.test.tsx`, plus these DOM-only `.ts` suites) runs in jsdom
// on both React majors, so the two React projects always hold the same tests.
const domTs = ['assets/__tests__/use-body-scroll-lock.test.ts']
const dom = (name: string) => ({
  name,
  environment: 'jsdom' as const,
  include: ['assets/**/*.test.tsx', ...domTs],
})

export default defineConfig({
  // Pin the root so `include`/`setupFiles` resolve from the repo, not the cwd.
  root: import.meta.dirname,
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    exclude: ['**/node_modules/**', '**/.claude/**'],
    setupFiles: ['assets/__tests__/harness/setup.ts'],
    testTimeout: 20000,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['assets/**/*.test.ts'],
          exclude: domTs,
        },
      },
      { extends: true, test: dom('react18') },
      {
        extends: true,
        test: dom('react19'),
        resolve: {
          alias: {
            react: `${react19}/react`,
            'react-dom': `${react19}/react-dom`,
          },
        },
      },
    ],
  },
})
