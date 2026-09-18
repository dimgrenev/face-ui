/**
 * RFC §0 B4: every component server-renders without a DOM and hydrates its
 * own markup silently. Markup that can live in a paragraph hydrates inside
 * `<p>`, where a hidden block surface would break the parse (§5 #5);
 * components used inline in text must produce such markup.
 */
import { format } from 'node:util'
import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { views } from '../harness'
import { describeGate, errorText, loadComponent } from './gates'

/** Components whose product scenario sits in running text: their markup must stay phrasing content. */
const INLINE = new Set([
  'Avatar', 'Badge', 'Button', 'Checkbox', 'Icon', 'Menu', 'Overlay', 'Popover', 'Select', 'Switcher', 'Tooltip',
])

/** Start tags that close an open `<p>` in the HTML parser (in-body insertion mode). */
const CLOSES_P = new Set(
  `address article aside blockquote center details dialog dir div dl dd dt fieldset figcaption figure footer form
  h1 h2 h3 h4 h5 h6 header hgroup hr li listing main menu nav ol p plaintext pre search section summary table ul xmp`.split(
    /\s+/,
  ),
)
const HTML = 'http://www.w3.org/1999/xhtml'
/** Whether markup survives being parsed inside `<p>`. */
const fitsInParagraph = (html: string) => {
  const template = document.createElement('template')
  template.innerHTML = html
  return [...template.content.querySelectorAll('*')].every(
    (element) => element.namespaceURI !== HTML || !CLOSES_P.has(element.localName),
  )
}

/** Globals a real server lacks; components must not touch them while rendering. */
const DOM_GLOBALS = [
  'window',
  'self',
  'document',
  'HTMLElement',
  'Element',
  'Node',
  'getComputedStyle',
  'matchMedia',
  'requestAnimationFrame',
  'ResizeObserver',
  'MutationObserver',
  'localStorage',
  'location',
] as const
function withoutDom<T>(run: () => T): T {
  const saved = DOM_GLOBALS.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const)
  for (const [key] of saved) delete (globalThis as Record<string, unknown>)[key]
  try {
    return run()
  } finally {
    for (const [key, descriptor] of saved) if (descriptor) Object.defineProperty(globalThis, key, descriptor)
  }
}

const RESOURCE_HINTS = /<link rel="(?:preload|preconnect|dns-prefetch|modulepreload)"[^>]*>/g
/** React 18 warns about layout effects in every server render; that is not the component's doing. */
const SERVER_NOISE = /useLayoutEffect does nothing on the server/

async function hydration(name: string): Promise<string[]> {
  const { Component: Subject, scenarios } = await loadComponent(name)
  const props = scenarios[0]!.props
  const failures: string[] = []
  const { error } = console
  console.error = (...args: unknown[]) => {
    const message = format(...args)
    if (!SERVER_NOISE.test(message)) failures.push(`console.error: ${message.split('\n')[0]}`)
  }
  try {
    let html: string
    try {
      // React 19 leads with resource hints that a document render places in <head>.
      html = withoutDom(() => renderToString(<Subject {...props} />)).replace(RESOURCE_HINTS, '')
    } catch (thrown) {
      return [`renderToString without a DOM: ${errorText(thrown)}`]
    }
    const inline = fitsInParagraph(html)
    if (INLINE.has(name) && !inline) failures.push(`renders block content, so it cannot sit inside <p>: ${html.slice(0, 160)}`)
    const host = document.body.appendChild(document.createElement('div'))
    host.innerHTML = inline ? `<p>${html}</p>` : html
    const ui = inline ? <p><Subject {...props} /></p> : <Subject {...props} />
    try {
      await act(async () => {
        const root = hydrateRoot(host, ui, {
          onRecoverableError: (recoverable) => failures.push(`onRecoverableError: ${errorText(recoverable)}`),
        })
        views.push({ host, root })
      })
    } catch (thrown) {
      failures.push(`hydrateRoot: ${errorText(thrown)}`)
    }
  } finally {
    console.error = error
  }
  return failures
}

/** Components that still violate the gate; only the wave-closing WP edits this, and it only shrinks. */
const PENDING: readonly string[] = []

describeGate('ssr: server render and hydration', PENDING, hydration)
