import { StrictMode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { RovingProbe, type RovingProbeProps } from '../../harness/roving-probe'

const root = createRoot(document.getElementById('root')!)
// In the scroller scene the items overflow a 200px list that sits below the
// bottom edge of a 100px scroller: revealing an item can scroll either. Only
// there is the list a scroll container (Firefox puts scroll containers in the
// tab order).
const css = `
[data-roving-probe] button { flex: 0 0 120px; height: 40px; }
#scroller { height: 100px; overflow: auto; }
#scroller::before { content: ''; display: block; height: 120px; }
#scroller::after { content: ''; display: block; height: 200px; }
#scroller [role='group'] { display: flex; width: 200px; overflow: auto; }`

/** Renders the probe between two outside buttons, inside a short scroller when `scroller`. */
function renderRoving(props: RovingProbeProps, scroller = false) {
  flushSync(() =>
    root.render(
      <StrictMode>
        <style>{css}</style>
        <button id="before">Before</button>
        <div id={scroller ? 'scroller' : undefined}>
          <RovingProbe {...props} />
        </div>
        <button id="after">After</button>
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderRoving })
export type Hooks = { renderRoving: typeof renderRoving }
