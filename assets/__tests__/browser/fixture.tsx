/// <reference types="vite/client" />
// The single page behind every browser fixture: /<react>/<name> runs
// fixtures/<name>.fixture.tsx, which renders into #root and exposes its
// window.render*() hooks. helpers.ts `open()` waits for data-fixture.
import '../../styles/index.css'

const fixtures = import.meta.glob('./fixtures/*.fixture.tsx')
const name = location.pathname.split('/').pop() ?? ''
const load = fixtures[`./fixtures/${name}.fixture.tsx`]
if (!load) throw new Error(`Unknown browser fixture "${name}"`)
load().then(() => {
  document.documentElement.dataset.fixture = name
})
