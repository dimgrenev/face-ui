import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FELD_GALLERY_ENTRIES } from '../../utils/__generated__/render_gallery.generated'
import '../../assets/styles/index.css'
const name = new URLSearchParams(location.search).get('component')
const entry = FELD_GALLERY_ENTRIES.find((item) => item.name === name)
const props = { ...entry?.sampleProps }
if (name === 'Calendar' && new URLSearchParams(location.search).has('range'))
  Object.assign(props, {
    selection: 'range',
    defaultValue: { start: '2026-03-06', end: '2026-03-06' },
  })
if (name === 'Modal') Object.assign(props, { open: true })
if (name === 'Command') Object.assign(props, { open: true })
if (name === 'Markdown')
  props.content =
    '# Markdown\n\n- [x] Complete\n\n[Documentation](https://example.com)'
if (name === 'Radio' || name === 'Select') props['aria-label'] = name
if (name === 'Input') props.label = 'Input'
function Fixture() {
  if (!entry)
    return (
      <main>
        <h1>Choose a component</h1>
      </main>
    )
  const { Component } = entry
  return (
    <main style={{ maxWidth: 720, padding: 16, margin: '32px auto' }}>
      <h1>{name}</h1>
      <Component {...props} />
    </main>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
)
