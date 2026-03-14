import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  root: __dirname,
  test: {
    dir: path.resolve(__dirname, 'assets'),
    include: [path.resolve(__dirname, 'assets/**/*.test.{ts,tsx}')],
    exclude: ['**/.claude/**', '**/node_modules/**'],
    environment: 'node',
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      '@face-ui/core': path.resolve(__dirname, 'assets/core.ts'),
      '@face-ui/core/adapters/react': path.resolve(__dirname, 'assets/adapters/react/use-machine.ts'),
    },
  },
  esbuild: {
    tsconfigRaw: '{}',
  },
})
