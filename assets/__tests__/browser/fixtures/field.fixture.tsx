import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { FieldProbe, type FieldProbeProps } from '../../harness/field-probe'

const root = createRoot(document.getElementById('root')!)
// The probe's own parts get control geometry, so the field lays out as a
// real Face UI control would: one 32px row, text on the control's padding.
const probeCss = `
.uf-probe__input {
  box-sizing: border-box;
  width: 100%;
  min-block-size: var(--uf-control-height);
  padding: var(--uf-control-pad-y) var(--uf-control-pad-text);
  border: 0;
  background: var(--uf-color-hover-bg);
  color: var(--uf-color-fg);
  font: inherit;
}
.uf-probe__options {
  display: flex;
  align-items: center;
  gap: var(--uf-control-gap);
  min-block-size: var(--uf-control-height);
  padding-inline: var(--uf-control-pad-text);
}`

function renderField(props: FieldProbeProps, width = 420) {
  flushSync(() =>
    root.render(
      <StrictMode>
        <style>{probeCss}</style>
        <section id="frame" style={{ width, padding: 0 }}>
          <span id="outside-name">Outside name</span>
          <FieldProbe {...props} />
        </section>
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderField })
export type Hooks = { renderField: typeof renderField }
