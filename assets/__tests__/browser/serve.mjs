// Builds every browser fixture as a production bundle for React 18 and for the
// pinned React 19 install on each run, then serves both builds:
//   /18/<name>, /19/<name>  -> fixture.html running fixtures/<name>.fixture.tsx
//   /<react>/hydration      -> the same page with server-rendered markup
// Nothing is reused between runs, so a stale build can never be tested.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { connect } from 'node:net'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build, preview } from 'vite'

const here = fileURLToPath(new URL('.', import.meta.url))
const port = Number(process.env.FACE_UI_TEST_PORT || 4317)
// One build directory per port: runs in parallel on other ports (RFC §8.0,
// rule 5) never rebuild the files this run is serving.
const builds = fileURLToPath(
  new URL('../../../node_modules/.cache/face-ui-browser/', import.meta.url),
)
const cache = `${builds}${port}/`
// Playwright kills this server, so a port's build outlives its run. Remove the
// builds of other ports that nothing serves and no run has started for an hour.
const serving = (port) =>
  new Promise((resolve) => {
    const socket = connect(port, '127.0.0.1')
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
for (const other of existsSync(builds) ? readdirSync(builds) : []) {
  if (!/^\d+$/.test(other) || Number(other) === port) continue
  const stale = Date.now() - statSync(`${builds}${other}`).mtimeMs > 3_600_000
  if (stale && !(await serving(Number(other))))
    rmSync(`${builds}${other}`, { recursive: true, force: true })
}
mkdirSync(cache, { recursive: true })
utimesSync(cache, new Date(), new Date())
const react19 = fileURLToPath(new URL('../react-19/node_modules/', import.meta.url))
const SSR_ENTRY = 'virtual:hydration-ssr'

// package.json "sideEffects" declares this package's modules pure, but a
// fixture exists only for its side effects (render, window hooks).
const fixtureSideEffects = {
  name: 'fixture-side-effects',
  transform: (code, id) =>
    id.startsWith(`${here}fixtures/`) ? { code, moduleSideEffects: true } : null,
}
const shared = (react, { plugins = [], ...extra }) => ({
  configFile: false,
  root: here,
  logLevel: 'warn',
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias:
      react === 19
        ? { react: `${react19}react`, 'react-dom': `${react19}react-dom` }
        : {},
  },
  plugins: [fixtureSideEffects, ...plugins],
  ...extra,
})

for (const react of [18, 19]) {
  const out = `${cache}${react}`
  await build(
    shared(react, {
      base: `/${react}/`,
      build: {
        outDir: out,
        emptyOutDir: true,
        rollupOptions: { input: `${here}fixture.html` },
      },
    }),
  )
  await build(
    shared(react, {
      ssr: { noExternal: true },
      plugins: [
        {
          name: 'hydration-ssr-entry',
          resolveId: (id) => (id === SSR_ENTRY ? `\0${id}` : null),
          load: (id) =>
            id === `\0${SSR_ENTRY}`
              ? `import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { HydrationFixture } from '${here}fixtures/hydration.fixture.tsx'
export const render = () => renderToString(createElement(HydrationFixture))`
              : null,
        },
      ],
      build: {
        ssr: true,
        outDir: `${out}-ssr`,
        emptyOutDir: true,
        rollupOptions: {
          input: SSR_ENTRY,
          output: { entryFileNames: 'hydration.mjs' },
        },
      },
    }),
  )
  const { render } = await import(pathToFileURL(`${out}-ssr/hydration.mjs`).href)
  const page = readFileSync(`${out}/fixture.html`, 'utf8')
  const root = '<main id="root"></main>'
  if (!page.includes(root)) throw new Error(`fixture.html lost ${root}`)
  writeFileSync(
    `${out}/hydration.html`,
    page.replace(root, `<main id="root">${render()}</main>`),
  )
}

const server = await preview({
  configFile: false,
  logLevel: 'warn',
  build: { outDir: cache },
  preview: { host: '127.0.0.1', port, strictPort: true },
  plugins: [
    {
      name: 'fixture-routes',
      configurePreviewServer({ middlewares }) {
        middlewares.use((request, _response, next) => {
          const route = /^\/(18|19)\/([a-z-]+)(?=[?#]|$)/.exec(request.url ?? '')
          if (route) {
            const [path, react, name] = route
            const page = existsSync(`${cache}${react}/${name}.html`) ? name : 'fixture'
            request.url = `/${react}/${page}.html${request.url.slice(path.length)}`
          }
          next()
        })
      },
    },
  ],
})
server.printUrls()
