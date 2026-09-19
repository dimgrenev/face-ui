/**
 * RFC §0 B3 (§5 #1): a Suspense boundary that re-suspends under StrictMode
 * hides and then reveals its content; every stateful component must still
 * respond to its user afterwards. The interaction is found on a plain mount
 * (the first probe that changes the document) and replayed after the reveal.
 */
import { format } from 'node:util'
import { act, StrictMode, Suspense, type ComponentType, type ReactNode } from 'react'
import { mount } from '../harness'
import { componentParts, describeGate, errorText, loadComponent, type Props } from './gates'

/** Components that hold state a user can change (RFC §3.2 "State → target"). */
const STATEFUL = new Set([
  'Accordion', 'Avatar', 'Calendar', 'Carousel', 'Checkbox', 'Code', 'Command', 'Date', 'Input', 'Media', 'Menu',
  'Modal', 'Navigation', 'Overlay', 'Pagination', 'Panel', 'Popover', 'Radio', 'Rating', 'SegmentedControl', 'Select',
  'Slider', 'Steps', 'Switcher', 'Table', 'Tabs', 'Toast', 'Toc', 'Toggle', 'Tooltip', 'Tree', 'Upload',
])
/** Props a scenario lacks for its state to be reachable by a user. */
const LONG_SOURCE = Array.from({ length: 12 }, (_, line) => `line ${line + 1}`).join('\n')
const EXTRA_PROPS: Record<string, Props> = {
  // Only a source longer than collapsedLines can collapse.
  Code: { children: LONG_SOURCE },
  Modal: { trigger: 'Open' },
}

interface Probe {
  label: string
  run: () => void
}
type Subject = { ui: ReactNode; probes?: () => Probe[] }
/** Components whose state lives outside the rendered element: the Toast store. */
const DRIVERS: Record<string, (module: Record<string, unknown>) => Subject> = {
  Toast(module) {
    const { Toaster, toaster } = (module.createToastContext as () => {
      Toaster: ComponentType
      toaster: { toast: (options: { title: string }) => unknown }
    })()
    return { ui: <Toaster />, probes: () => [{ label: 'toast()', run: () => void toaster.toast({ title: 'Probe' }) }] }
  },
}

type Action = 'click' | 'focus' | 'hover' | 'type' | 'nudge' | 'arrow' | 'fail' | 'upload'
/** What a user can do, in the order it is tried. */
const ACTIONS: ReadonlyArray<readonly [selector: string, action: Action]> = [
  ['[role="slider"]', 'arrow'],
  ['input[type="range"]', 'nudge'],
  ['input:not([type]), input[type="text"], input[type="search"], textarea', 'type'],
  ['input[type="file"]', 'upload'],
  [
    'button, summary, a[href^="#"], input[type="checkbox"], input[type="radio"], [role="tab"], [role="radio"], ' +
      '[role="checkbox"], [role="switch"], [role="option"], [role="treeitem"], [role="menuitem"], [role="button"]',
    'click',
  ],
  ['[data-part="trigger"], button, [tabindex="0"]', 'focus'],
  ['[data-part="trigger"], button, [tabindex="0"]', 'hover'],
  ['img', 'fail'],
]

const dispatch = (element: Element, type: string, init: EventInit = {}) =>
  element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, composed: true, ...init }))
const setValue = (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')!.set!.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}
/** A file the input's `accept` admits. */
function acceptedFile(input: HTMLInputElement) {
  const token = input.accept.split(',')[0]!.trim()
  const type = token.includes('/') ? token.replace('*', 'png') : 'text/plain'
  const name = token.startsWith('.') ? `probe${token}` : `probe.${type.split('/')[1]}`
  return new File(['probe'], name, { type })
}

function perform(element: HTMLElement, action: Action) {
  switch (action) {
    case 'click':
      for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) dispatch(element, type)
      element.click()
      return
    case 'focus':
      return element.focus()
    case 'hover':
      return ['pointerover', 'mouseover'].forEach((type) => dispatch(element, type))
    case 'arrow':
      element.focus()
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
      return
    case 'type':
      return setValue(element as HTMLInputElement, `${(element as HTMLInputElement).value}x`)
    case 'nudge': {
      const input = element as HTMLInputElement
      return setValue(input, String(Number(input.value) + (Number(input.step) || 1)))
    }
    case 'upload':
      Object.defineProperty(element, 'files', {
        configurable: true,
        value: [acceptedFile(element as HTMLInputElement)],
      })
      element.dispatchEvent(new Event('change', { bubbles: true }))
      return
    case 'fail':
      element.dispatchEvent(new Event('error'))
  }
}

const genericProbes = (): Probe[] =>
  ACTIONS.flatMap(([selector, action]) =>
    [...document.body.querySelectorAll<HTMLElement>(selector)].map((_, index) => ({
      label: `${action} ${selector.split(',')[0]} #${index}`,
      run: () => {
        const element = document.body.querySelectorAll<HTMLElement>(selector)[index]
        if (element) perform(element, action)
      },
    })),
  )

/** The document, including the live state of form controls (React restores controlled values it rejects). */
const snapshot = () =>
  document.body.innerHTML +
  [...document.body.querySelectorAll<HTMLInputElement>('input, textarea, select')]
    .map((control) => `${control.value}:${control.checked}`)
    .join()

/** Runs a probe; true when the document changed. */
async function changes(probe: Probe): Promise<boolean> {
  const before = snapshot()
  await act(async () => {
    probe.run()
    await new Promise((resolve) => setTimeout(resolve, 5))
  })
  return snapshot() !== before
}

/**
 * Scenario props a user can drive: `x` becomes `defaultX` where the component
 * has one, surfaces start closed, delays drop to 0.
 */
function uncontrolled(name: string, props: Props): Props {
  const own = new Set(componentParts(name)[0]!.props.map((prop) => prop.name))
  const entries = Object.entries({ ...props, ...EXTRA_PROPS[name] }).flatMap(([key, value]): Array<[string, unknown]> => {
    if (key === 'open' || key === 'defaultOpen') return []
    if (/Delay$/.test(key)) return [[key, 0]]
    const initial = `default${key[0]!.toUpperCase()}${key.slice(1)}`
    return [[own.has(initial) && !(initial in props) ? initial : key, value]]
  })
  return Object.fromEntries(entries)
}

let suspended: Promise<void> | null = null
function Suspender() {
  if (suspended) throw suspended
  return null
}

/** A fresh subject for each scenario in turn, with the label of the first probe that changes it on a plain mount. */
async function probeFor(name: string) {
  const { Component, scenarios, module } = await loadComponent(name)
  for (const scenario of scenarios) {
    const make = (): Subject =>
      DRIVERS[name]?.(module) ?? { ui: <Component {...uncontrolled(name, scenario.props)} /> }
    const subject = make()
    const view = mount()
    await act(async () => view.root.render(subject.ui))
    let label: string | undefined
    for (const probe of (subject.probes ?? genericProbes)())
      if (await changes(probe)) {
        label = probe.label
        break
      }
    await act(async () => view.root.render(null))
    if (label) return { make, label }
  }
  return undefined
}

async function staysResponsive(name: string): Promise<string[]> {
  const failures: string[] = []
  const { error, warn } = console
  console.error = console.warn = (...args: unknown[]) => {
    const message = format(...args)
    // jsdom lacks media playback and navigation: environment gaps, not component output.
    if (!/Not implemented/.test(message)) failures.push(`console: ${message.split('\n')[0]}`)
  }
  try {
    const found = await probeFor(name)
    if (!found) {
      if (STATEFUL.has(name)) failures.push('no probe changes it on a plain mount; extend ACTIONS or DRIVERS')
      return failures
    }
    const subject = found.make()
    const { root, host } = mount()
    const view = () => (
      <StrictMode>
        <Suspense fallback={<span data-suspense-fallback="" />}>
          {subject.ui}
          <Suspender />
        </Suspense>
      </StrictMode>
    )
    await act(async () => root.render(view()))
    let resume!: () => void
    const pending = new Promise<void>((resolve) => (resume = resolve))
    suspended = pending
    await act(async () => root.render(view()))
    if (!host.querySelector('[data-suspense-fallback]')) failures.push('the boundary did not show its fallback')
    suspended = null
    resume()
    await act(async () => {
      await pending
      root.render(view())
    })
    const probe = (subject.probes ?? genericProbes)().find((candidate) => candidate.label === found.label)
    if (host.querySelector('[data-suspense-fallback]')) failures.push('the boundary did not reveal its content')
    else if (!probe) failures.push(`${found.label} has no target after the reveal`)
    else if (!(await changes(probe))) failures.push(`${probe.label} no longer updates it after a re-suspend`)
  } catch (thrown) {
    failures.push(`threw ${errorText(thrown)}`)
  } finally {
    Object.assign(console, { error, warn })
    suspended = null
  }
  return failures
}

/** Components that still violate the gate; only the wave-closing WP edits this, and it only shrinks. */
const PENDING: readonly string[] = []

describeGate('suspense: responsive after a re-suspend under StrictMode', PENDING, staysResponsive)
