import { act, useLayoutEffect, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, it } from 'vitest'
import { useEventCallback } from '../adapters/react/use-event-callback'
import { useIsomorphicLayoutEffect } from '../adapters/react/use-isomorphic-layout-effect'
import { mount } from './harness'

it('useIsomorphicLayoutEffect is useLayoutEffect wherever there is a document', () => {
  expect(useIsomorphicLayoutEffect).toBe(useLayoutEffect)
})

it('useEventCallback keeps its identity and calls the latest committed function', async () => {
  const { root } = mount()
  const seen: string[] = []
  const identities = new Set<unknown>()
  let call!: () => string | undefined
  function Probe({ label }: { label: string }) {
    call = useEventCallback(() => label)
    identities.add(call)
    // A child's layout effect already sees the function of the same commit.
    return <Child call={call} />
  }
  function Child({ call }: { call: () => string | undefined }) {
    const [, force] = useState(0)
    useLayoutEffect(() => {
      seen.push(call()!)
    })
    return <button onClick={() => force((n) => n + 1)} />
  }
  await act(async () => root.render(<Probe label="first" />))
  await act(async () => root.render(<Probe label="second" />))
  expect(call()).toBe('second')
  expect(seen).toEqual(['first', 'second'])
  expect(identities.size).toBe(1)
})

it('useEventCallback without a function returns undefined, also on the server', () => {
  let call!: () => unknown
  function Probe() {
    call = useEventCallback<[], unknown>(undefined)
    return null
  }
  renderToString(<Probe />)
  expect(call()).toBeUndefined()
})
