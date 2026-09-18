import { format } from 'node:util'
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

/**
 * Runs `run` (sync, or async like `act`) and fails unless it logged a console.error matching
 * `pattern`, such as an `invalidProp` report; matching output is swallowed, anything else still
 * fails the test. Returns what `run` returns.
 */
export function expectDevError<R>(run: () => R, pattern: RegExp): R {
  const previous = console.error
  let matched = false
  console.error = (...args: unknown[]) => {
    if (pattern.test(format(...args))) matched = true
    else previous(...args)
  }
  const settle = () => {
    console.error = previous
    if (!matched)
      throw new Error(
        `Expected a console.error matching ${pattern} (Face UI reports each distinct message once per test).`,
      )
  }
  let result: R
  try {
    result = run()
  } catch (error) {
    console.error = previous
    throw error
  }
  const thenable = result as PromiseLike<unknown> | null | undefined
  if (typeof thenable?.then !== 'function') {
    settle()
    return result
  }
  // Subscribe synchronously: React's act() thenable warns unless awaited in the same tick.
  return new Promise((resolve, reject) =>
    thenable.then(
      (value) => {
        try {
          settle()
          resolve(value)
        } catch (error) {
          reject(error)
        }
      },
      (error) => {
        console.error = previous
        reject(error)
      },
    ),
  ) as R
}
