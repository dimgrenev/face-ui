import { act, type ReactElement } from 'react'
import { createRoot, hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'

export { libraryCss } from './css'

export interface View {
  host: HTMLDivElement
  root: Root
}

/** Roots made by `mount`/`hydrate`; `setup.ts` unmounts them and removes their hosts after every test. */
export const views: View[] = []
/** console.error output the running test declared as expected; `setup.ts` clears it after every test. */
export const allowedConsoleErrors: RegExp[] = []

/** A fresh host in `document.body` with a React root, torn down after the test. */
export function mount(): View {
  const host = document.body.appendChild(document.createElement('div'))
  const view = { host, root: createRoot(host) }
  views.push(view)
  return view
}

/**
 * Server-renders `ui` into `host`, hydrates it (torn down after the test) and
 * collects the errors React reports through `onRecoverableError`.
 */
export async function hydrate(ui: ReactElement, host: HTMLDivElement) {
  host.innerHTML = renderToString(ui)
  const recoverableErrors: unknown[] = []
  let root!: Root
  await act(async () => {
    root = hydrateRoot(host, ui, {
      onRecoverableError: (error) => recoverableErrors.push(error),
    })
  })
  views.push({ host, root })
  return { root, recoverableErrors }
}

/** The form's submission entries in document order, as the browser would send them. */
export const formEntries = (form: HTMLFormElement) =>
  Array.from(new FormData(form).entries())

/**
 * Declares console.error output the running test expects. Any other
 * console.error fails the test (see `setup.ts`).
 */
export function allowConsoleError(...patterns: RegExp[]) {
  allowedConsoleErrors.push(...patterns)
}
