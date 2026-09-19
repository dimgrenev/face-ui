/**
 * RFC §0 B1: rendering never throws on data. Every own data prop of every
 * component receives each hostile value on top of its first product scenario
 * and must render (invalidProp reports and React warnings are fine); the
 * product scenarios themselves render without a single report.
 */
import { format } from 'node:util'
import { act, Component, type ReactNode } from 'react'
import { mount } from '../harness'
import {
  checker,
  componentParts,
  describeGate,
  errorText,
  isCallable,
  loadComponent,
  type Props,
} from './gates'

const VALUES: ReadonlyArray<readonly [label: string, value: unknown]> = [
  ['null', null],
  ["''", ''],
  ["'x'", 'x'],
  ['0', 0],
  ['-1', -1],
  ['1e9', 1e9],
  ['true', true],
  ['false', false],
  ['[]', []],
  ['[null]', [null]],
  ['[{}]', [{}]],
]
/** Plain objects in a ReactNode slot crash React itself; JSON is guarded by the engine's sanitizer (§2.1). */
const NODE = /\b(ReactNode|ReactElement|ReactPortal|JSX\.Element|SlotContent)\b/

/** Own data props: not callbacks, not class names or styles. */
function dataProps(name: string) {
  const check = checker()
  return componentParts(name)[0]!.props
    .filter(
      (prop) =>
        prop.own &&
        !prop.types.some(isCallable) &&
        !/^(className|style)$|ClassName$/.test(prop.name),
    )
    .map((prop) => ({
      name: prop.name,
      node: prop.types.some((type) => NODE.test(check.typeToString(type))),
    }))
}

class Boundary extends Component<{ onError: (error: unknown) => void; children: ReactNode }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * Runs `run` with console.error/warn captured instead of printed, and with
 * render errors kept from jsdom's console (React 18 rethrows them through a
 * window error event); returns the captured messages.
 */
async function quietly(run: () => Promise<void>): Promise<string[]> {
  const { error, warn } = console
  const messages: string[] = []
  const silence = (event: Event) => event.preventDefault()
  console.error = console.warn = (...args: unknown[]) => void messages.push(format(...args))
  window.addEventListener('error', silence)
  try {
    await run()
  } finally {
    Object.assign(console, { error, warn })
    window.removeEventListener('error', silence)
  }
  return messages
}


/** `prop=value|value: error` for the hostile values that make the component throw. */
async function fuzz(name: string): Promise<string[]> {
  const { Component: Subject, scenarios } = await loadComponent(name)
  const base = scenarios[0]!.props
  const { root } = mount()
  const failures = new Map<string, string[]>()
  await quietly(async () => {
    for (const prop of dataProps(name)) {
      const cases = VALUES.filter(([label]) => !(prop.node && label === '[{}]'))
      const fail = (label: string, error: unknown) => {
        const key = `${prop.name}: ${errorText(error)}`
        failures.set(key, [...(failures.get(key) ?? []), label])
      }
      try {
        await act(async () =>
          root.render(
            <>
              {cases.map(([label, value]) => (
                <Boundary key={`${prop.name}=${label}`} onError={(error) => fail(label, error)}>
                  <Subject {...base} {...{ [prop.name]: value }} />
                </Boundary>
              ))}
            </>,
          ),
        )
        await act(async () => root.render(null))
      } catch (error) {
        // Outside every boundary: an effect cleanup or the root itself.
        fail('(root)', error)
      }
    }
  })
  return [...failures].map(([key, labels]) => key.replace(': ', `=${labels.join('|')}: `))
}

/** Exceptions and invalidProp reports while rendering the component's product scenarios. */
async function scenarioReports(name: string): Promise<string[]> {
  const { Component: Subject, scenarios } = await loadComponent(name)
  const { root } = mount()
  const failures: string[] = []
  const messages = await quietly(async () => {
    for (const scenario of scenarios)
      await act(async () =>
        root.render(
          <Boundary key={scenario.name} onError={(error) => failures.push(`${scenario.name}: ${errorText(error)}`)}>
            <Subject {...(scenario.props as Props)} />
          </Boundary>,
        ),
      )
  })
  return [...failures, ...messages.filter((message) => message.startsWith('Face UI '))]
}

/** Components that still violate each rule; only the wave-closing WP edits these, and they only shrink. */
const PENDING = {
  'hostile props': ['Code', 'Command', 'Menu', 'Modal', 'Navigation', 'Panel', 'Toc', 'Tree', 'Upload'],
  'scenario reports': [],
} satisfies Record<string, readonly string[]>

describeGate('invalid-props fuzz: hostile values render', PENDING['hostile props'], fuzz)
describeGate('invalid-props fuzz: product scenarios report nothing', PENDING['scenario reports'], scenarioReports)
