import { StrictMode, createElement, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { CheckboxPreview, userfaceExample as checkboxExample } from '../../../../Checkbox/Checkbox.preview'
import { DatePreview, userfaceExample as dateExample } from '../../../../Date/Date.preview'
import { PaginationPreview, userfaceExample as paginationExample } from '../../../../Pagination/Pagination.preview'
import { TocPreview, userfaceExample as tocExample } from '../../../../Toc/Toc.preview'
import checkbox from '../../../../Checkbox/Checkbox.partial-selection.face.json'
import date from '../../../../Date/Date.json'
import pagination from '../../../../Pagination/Pagination.json'
import toc from '../../../../Toc/Toc.json'

const root = createRoot(document.getElementById('root')!)
const components = { Checkbox: CheckboxPreview, Date: DatePreview, Pagination: PaginationPreview, Toc: TocPreview }
const definitions = { Checkbox: checkboxExample, Date: dateExample, Pagination: paginationExample, Toc: tocExample }
type Family = keyof typeof components
let previous = '', generation = 0
let current: Family | undefined

/** Render actual authored Face inputs, with no controlled-to-default conversion. */
function renderControlledExample(name: Family, state = '', patch: Record<string, unknown> = {}, reset = false) {
  const identity = `${name}:${state}`
  if (identity !== previous || reset) generation++
  previous = identity
  current = name
  const states = name === 'Date' ? date.states : name === 'Pagination' ? pagination.states : name === 'Toc' ? toc.states : []
  const props = name === 'Checkbox' ? checkbox.currentState.props : states.find(candidate => candidate.name === state)?.props
  if (!props) throw new Error(`Unknown authored state ${identity}`)
  const Component = components[name] as ComponentType<Record<string, unknown>>
  flushSync(() => root.render(<StrictMode><section data-example-fixture="" style={{ width: 480, padding: 12 }}>
    {createElement(Component, { ...structuredClone(props), ...patch, key: generation })}
  </section></StrictMode>))
}
/** Execute the actual authored definitions separately from physical pointer proof. */
async function runControlledExampleChecks() {
  if (!current) throw new Error('An authored example must be mounted first.')
  const canvas = document.querySelector<HTMLElement>('[data-example-fixture]')!
  const signal = AbortSignal.timeout(5000)
  for (const check of definitions[current].checks) await check.run({
    canvas, signal,
    assert(condition, message) { if (!condition) throw new Error(message) },
    async waitFor(assertion) {
      let failure: unknown
      while (!signal.aborted) {
        try { await assertion(); return } catch (error) { failure = error }
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      }
      throw failure ?? signal.reason
    },
  })
}
Object.assign(window, { renderControlledExample, runControlledExampleChecks })
export type Hooks = { renderControlledExample: typeof renderControlledExample; runControlledExampleChecks: typeof runControlledExampleChecks }
