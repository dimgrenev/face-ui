import { build, createServer } from 'vite'
// Exercise the shipped CSS lowering/minification, not only Vite's dev transform.
await build({
  configFile: false,
  base: './',
  logLevel: 'error',
  oxc: { jsx: { runtime: 'automatic' } },
  build: {
    outDir: '.artifacts/browser-production',
    rollupOptions: {
      input: [
        'scripts/browser/switcher.html',
        'scripts/browser/select.html',
        'scripts/browser/date.html',
        'scripts/browser/layer-focus.html',
        'scripts/browser/calendar-dom.html',
        'scripts/browser/accordion.html',
        'scripts/browser/pagination.html',
        'scripts/browser/breadcrumb.html',
        'scripts/browser/floating-overlay.html',
        'scripts/browser/steps.html',
        'scripts/browser/progress.html',
        'scripts/browser/rating.html',
        'scripts/browser/slider.html',
        'scripts/browser/segmented.html',
        'scripts/browser/tabs.html',
      ],
    },
  },
})
const server = await createServer({
  configFile: false,
  server: {
    host: '127.0.0.1',
    port: Number(process.env.FACE_UI_TEST_PORT || 4317),
    strictPort: true,
    watch: {
      ignored: [
        '**/.artifacts/**',
        '**/test-results/**',
        '**/playwright-report/**',
        '**/dist/**',
      ],
    },
  },
  oxc: { jsx: { runtime: 'automatic' } },
  plugins: [
    {
      name: 'hydration-fixture',
      configureServer(server) {
        server.middlewares.use(
          '/scripts/browser/hydration',
          async (_request, response, next) => {
            try {
              const { render } = await server.ssrLoadModule(
                '/scripts/browser/hydration-server.tsx',
              )
              const html = `<!doctype html><html lang="en" data-theme="light"><title>Hydration test</title><body><div id="root">${render()}</div><script type="module" src="/scripts/browser/hydration-client.tsx"></script></body></html>`
              response.setHeader('Content-Type', 'text/html; charset=utf-8')
              response.end(
                await server.transformIndexHtml(
                  '/scripts/browser/hydration',
                  html,
                ),
              )
            } catch (error) {
              next(error)
            }
          },
        )
      },
    },
  ],
})
await server.listen()
server.printUrls()
