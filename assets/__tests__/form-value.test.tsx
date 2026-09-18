import { act, StrictMode, useRef, useState, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FormValue } from '../adapters/react/FormValue'
import { Select } from '../../Select/Select'
import { mount } from './harness'

const options = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
]
const render = async (ui: ReactNode) => {
  const view = mount()
  await act(async () => view.root.render(<StrictMode>{ui}</StrictMode>))
  return view
}
const byId = (id: string) => document.getElementById(id) as HTMLElement
const proxies = () => [...document.querySelectorAll('select')]

/** A bare owner: a trigger button and the value it proxies. */
function Owner({
  onReport,
  initial = null,
}: {
  onReport: (message: string | null) => void
  initial?: string | null
}) {
  const [value, setValue] = useState<string | null>(initial)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  return (
    <form id="form">
      <span style={{ position: 'relative' }}>
        <FormValue
          name="plan"
          required
          value={value}
          resetValue={initial}
          options={options}
          triggerRef={triggerRef}
          onReset={() => {
            setValue(initial)
            return initial
          }}
          onChange={(next) => setValue(typeof next === 'string' ? next : null)}
          onReport={onReport}
        />
        <button type="button" id="trigger" ref={triggerRef}>
          Plan
        </button>
      </span>
      <button type="button" id="choose" onClick={() => setValue('b')}>
        Choose
      </button>
    </form>
  )
}

describe('§5 #4/#10: FormValue validation', () => {
  it('form.checkValidity() never moves focus out of the field being edited', async () => {
    await render(
      <form id="form">
        <input id="email" name="email" />
        <Select name="plan" required aria-label="Plan" options={options} />
        <Select name="region" required aria-label="Region" options={options} />
      </form>,
    )
    byId('email').focus()
    expect((byId('form') as HTMLFormElement).checkValidity()).toBe(false)
    await act(async () => {})
    expect(document.activeElement).toBe(byId('email'))
  })

  it('a proxy focused by interactive validation reports its message, then hands focus to its trigger', async () => {
    const onReport = vi.fn()
    await render(<Owner onReport={onReport} />)
    const [proxy] = proxies()
    let during: Element | null = null
    await act(async () => {
      proxy.focus()
      during = document.activeElement
    })
    // Not during the focus event: Firefox would skip its next report.
    expect(during).toBe(proxy)
    expect(document.activeElement).toBe(byId('trigger'))
    expect(proxy.validationMessage).not.toBe('')
    expect(onReport.mock.calls).toEqual([[proxy.validationMessage]])
  })

  it('clears the report once the value becomes valid', async () => {
    const onReport = vi.fn()
    await render(<Owner onReport={onReport} />)
    const [proxy] = proxies()
    const message = proxy.validationMessage
    await act(async () => proxy.focus())
    await act(async () => byId('choose').click())
    await act(async () => proxy.focus())
    expect(onReport.mock.calls).toEqual([[message], [null]])
  })

  it('clears the report on form reset', async () => {
    const onReport = vi.fn()
    await render(<Owner onReport={onReport} />)
    const [proxy] = proxies()
    await act(async () => proxy.focus())
    await act(async () => {
      ;(byId('form') as HTMLFormElement).reset()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(onReport.mock.calls).toEqual([[proxy.validationMessage], [null]])
  })

  it('covers its positioned root, so the browser anchors its bubble to the control', async () => {
    await render(<Owner onReport={() => {}} />)
    const { style } = proxies()[0]
    expect(style.position).toBe('absolute')
    expect([style.inset, style.width, style.height, style.opacity]).toEqual([
      '0',
      '100%',
      '100%',
      '0',
    ])
    expect(style.pointerEvents).toBe('none')
  })
})
