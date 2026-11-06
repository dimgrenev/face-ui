import { act } from 'react'
import { expect, it, vi } from 'vitest'
import * as compat from '../../compat'
import { SegmentedControl } from '../../SegmentedControl/SegmentedControl'
import { Toggle } from '../../Toggle/Toggle'
import { mount } from './harness'

it('Toggle is SegmentedControl under its former name, from compat and its own entry', () => {
  expect(compat.Toggle).toBe(SegmentedControl)
  expect(Toggle).toBe(SegmentedControl)
})

it('the compat Toggle takes `multiple` for independent options', async () => {
  const { host, root } = mount()
  const cb = vi.fn()
  await act(async () =>
    root.render(
      <compat.Toggle
        multiple
        aria-label="Format"
        defaultValue={['bold']}
        onValueChange={cb}
        items={[
          { value: 'bold', label: 'Bold' },
          { value: 'italic', label: 'Italic' },
        ]}
      />,
    ),
  )
  expect(host.firstElementChild!.getAttribute('role')).toBe('group')
  const [, italic] = host.querySelectorAll('button')
  await act(async () => italic.click())
  expect(cb.mock.calls).toEqual([[{ value: ['bold', 'italic'] }]])
  expect(italic.getAttribute('aria-pressed')).toBe('true')
})
