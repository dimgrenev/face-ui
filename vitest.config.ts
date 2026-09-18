import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  root: import.meta.dirname,
  test: {
    dir: path.resolve(import.meta.dirname, 'assets'),
    include: [path.resolve(import.meta.dirname, 'assets/**/*.test.{ts,tsx}')],
    exclude: ['**/.claude/**', '**/node_modules/**'],
    environment: 'node',
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      '@face-ui/core': path.resolve(import.meta.dirname, 'assets/core.ts'),
      '@face-ui/core/adapters/react': path.resolve(
        import.meta.dirname,
        'assets/adapters/react/use-machine.ts',
      ),
    },
  },
  oxc: { jsx: { runtime: 'automatic' } },
})
