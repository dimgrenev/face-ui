import React, { act, createRef } from 'react'
import { expect, it, vi } from 'vitest'
import { Select, SelectTrigger } from '../../Select/Select'
import { mount } from './harness'

it('lets an external dialog own visibility and interactions without creating a list or form proxy', async () => {
  const { host, root } = mount()
  const ref = createRef<HTMLButtonElement>()
  const onClick = vi.fn()
  const onKeyDown = vi.fn()
  const render = (open: boolean) => act(async () => root.render(
    <SelectTrigger ref={ref} open={open} surface="side" aria-haspopup="dialog"
      aria-controls="child-properties" aria-label="Child properties"
      className="owned-trigger" valueClassName="owned-value" style={{ width: 240 }}
      onClick={onClick} onKeyDown={onKeyDown}>Button</SelectTrigger>,
  ))
  await render(false)
  const button = ref.current!
  expect(button.type).toBe('button')
  expect(button.getAttribute('role')).toBeNull()
  expect(button.getAttribute('aria-haspopup')).toBe('dialog')
  expect(button.getAttribute('aria-controls')).toBe('child-properties')
  expect(button.classList.contains('owned-trigger')).toBe(true)
  expect(button.style.width).toBe('240px')
  expect(button.querySelector('.owned-value')?.textContent).toBe('Button')
  expect(button.querySelector('svg[data-icon="select-chevron-right"]')).not.toBeNull()
  await act(async () => {
    button.click()
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
  })
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(onKeyDown).toHaveBeenCalledTimes(1)
  expect(button.getAttribute('aria-expanded')).toBe('false')
  expect(host.querySelector('select,input,[role="listbox"],[role="dialog"]')).toBeNull()
  await render(true)
  expect(ref.current).toBe(button)
  expect(button.getAttribute('aria-expanded')).toBe('true')
  expect(button.querySelector('svg[data-icon="select-chevron-right"]')).not.toBeNull()
})

it('keeps the same trigger and single spacing boundary inside Select', async () => {
  const { host, root } = mount()
  const onOpenChange = vi.fn()
  const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault())
  await act(async () => root.render(<>
    <Select items={[{ value: 'a', label: 'Alpha' }]} value="a" surface="side"
      aria-label="Plan" membrane={false} onOpenChange={onOpenChange} onClick={onClick} />
    <SelectTrigger surface="side" membrane={false} aria-label="External">Alpha</SelectTrigger>
  </>))
  const [selectButton, externalButton] = host.querySelectorAll<HTMLButtonElement>('.uf-select-trigger')
  expect(selectButton.getAttribute('role')).toBe('combobox')
  expect(selectButton.parentElement?.parentElement?.classList.contains('uf-select-wrapper')).toBe(true)
  for (const button of [selectButton, externalButton]) {
    expect(button.parentElement?.classList.contains('uf-membrane')).toBe(true)
    expect(button.parentElement?.hasAttribute('data-membrane-disabled')).toBe(true)
    expect(button.parentElement?.querySelectorAll('button')).toHaveLength(1)
    expect(button.querySelector('[data-part="value"]')?.textContent).toBe('Alpha')
    expect(button.querySelector('svg[data-icon="select-chevron-right"]')).not.toBeNull()
  }
  await act(async () => selectButton.click())
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(onOpenChange).not.toHaveBeenCalled()
  expect(document.querySelector('[role="listbox"]')).toBeNull()
})

it('preserves unavailable focus, native disabled/tabIndex, icon-only and placeholder states across updates', async () => {
  const { host, root } = mount()
  const ref = createRef<HTMLButtonElement>()
  await act(async () => root.render(
    <SelectTrigger ref={ref} unavailable isPlaceholder aria-label="Unavailable">None</SelectTrigger>,
  ))
  const button = ref.current!
  expect(button.disabled).toBe(false)
  expect(button.tabIndex).toBe(0)
  expect(button.getAttribute('aria-disabled')).toBe('true')
  expect(button.hasAttribute('data-placeholder')).toBe(true)
  expect(button.querySelector('.uf-select__value--placeholder')).not.toBeNull()
  await act(async () => root.render(
    <SelectTrigger ref={ref} disabled iconOnly fullWidth={false} membrane={false} aria-label="Disabled">X</SelectTrigger>,
  ))
  expect(ref.current).toBe(button)
  expect(button.disabled).toBe(true)
  expect(button.tabIndex).toBe(-1)
  expect(button.hasAttribute('data-placeholder')).toBe(false)
  expect(button.hasAttribute('data-icon-only')).toBe(true)
  expect(button.querySelector('[data-part="indicator"]')).toBeNull()
  expect(button.parentElement?.classList.contains('uf-membrane--full')).toBe(false)
  expect(host.querySelectorAll('button')).toHaveLength(1)
  await act(async () => root.render(
    <SelectTrigger disabled tabIndex={2} aria-label="Explicit tab order">X</SelectTrigger>,
  ))
  expect(host.querySelector('button')?.tabIndex).toBe(2)
})

it('forwards membrane activation once to the actual button and keeps popover indicators controlled', async () => {
  const { host, root } = mount()
  const clicked = vi.fn()
  await act(async () => root.render(<SelectTrigger open aria-label="Details" onClick={clicked}>Details</SelectTrigger>))
  const button = host.querySelector('button')!
  expect(button.querySelector('svg[data-icon="select-chevron-up"]')).not.toBeNull()
  await act(async () => (button.parentElement as HTMLElement).click())
  expect(clicked).toHaveBeenCalledTimes(1)
  expect(clicked.mock.calls[0][0].target).toBe(button)
  expect(document.activeElement).toBe(button)
  expect(button.getAttribute('aria-expanded')).toBe('true')
})
