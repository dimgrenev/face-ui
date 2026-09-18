import { format } from 'node:util'
import { act } from 'react'
import { afterEach, beforeEach } from 'vitest'
import { allowedConsoleErrors, views } from './index'

// Every console.error fails the test unless the test declared it with
// allowConsoleError(); undeclared output is still printed where it happened.
// The one suite-wide entry is an artifact of the environment, not of the
// library: React 18 warns about layout effects whenever it server-renders
// where `window` exists, and jsdom provides one.
const environmentNoise = [/^Warning: useLayoutEffect does nothing on the server/]
const expected = (message: string) =>
  [...environmentNoise, ...allowedConsoleErrors].some((pattern) =>
    pattern.test(message),
  )
const print = console.error
const unexpected: string[] = []
function trap(...args: unknown[]) {
  const message = format(...args)
  if (expected(message)) return
  unexpected.push(message)
  print.apply(console, args)
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  unexpected.length = 0
  console.error = trap
})

afterEach(async () => {
  for (const { host, root } of views.splice(0)) {
    await act(async () => root.unmount())
    host.remove()
  }
  allowedConsoleErrors.length = 0
  if (unexpected.length)
    throw new Error(
      `Unexpected console.error (declare expected output with allowConsoleError):\n${unexpected.splice(0).join('\n---\n')}`,
    )
})
