import { act, version } from 'react'
import { expect, it } from 'vitest'
import { inertProp } from '../adapters/react/inert-prop'
import { mount } from './harness'

it(`inertProp makes an element inert and releases it on React ${version}`, async () => {
  const { host, root } = mount()
  const render = (on: boolean) =>
    act(async () => root.render(<div {...inertProp(on)} />))
  await render(true)
  expect(host.firstElementChild!.hasAttribute('inert')).toBe(true)
  const { inert } = inertProp(true) as { inert?: unknown }
  expect(inert).toBe(Number.parseInt(version, 10) >= 19 ? true : '')
  await render(false)
  expect(host.firstElementChild!.hasAttribute('inert')).toBe(false)
  expect(inertProp(false)).toEqual({})
})
