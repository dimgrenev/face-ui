import React, { act, createRef } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Badge } from '../../Badge/Badge'
import { mount } from './harness'

let host: HTMLDivElement
let root: Root
const render = async (node: React.ReactNode) => {
  await act(async () => root.render(node))
}
beforeEach(() => {
  ;({ host, root } = mount())
})

describe('Text and Badge content contracts', () => {
  it('Badge renders text or rich children with predictable precedence and forwards native root props', async () => {
    const ref = createRef<HTMLElement>()
    const click = vi.fn()
    await render(<Badge text="Plain" />)
    expect(host.textContent).toBe('Plain')
    await render(<Badge text="Fallback">{0}</Badge>)
    expect(host.textContent).toBe('0')
    await render(<Badge text="Fallback">{false}</Badge>)
    expect(host.textContent).toBe('')
    expect(host.querySelector('.uf-text__content')).toBeNull()
    await render(<Badge text="Fallback">{''}</Badge>)
    expect(host.textContent).toBe('')
    await render(<Badge text="Fallback">{null}</Badge>)
    expect(host.textContent).toBe('Fallback')
    await render(
      <Badge
        ref={ref}
        id="content"
        title="Hint"
        aria-label="Status"
        role="status"
        lang="ru"
        dir="rtl"
        className="custom"
        style={{ color: 'red' }}
        onClick={click}
      >
        <strong>Ready</strong>
      </Badge>,
    )
    const node = host.querySelector<HTMLElement>('#content')!
    expect(ref.current).toBe(node)
    expect(node.classList.contains('custom')).toBe(true)
    expect(node.title).toBe('Hint')
    expect(node.style.color).toBe('red')
    expect(node.getAttribute('role')).toBe('status')
    expect(node.getAttribute('aria-label')).toBe('Status')
    expect(node.lang).toBe('ru')
    expect(node.dir).toBe('rtl')
    expect(node.querySelector('strong')?.textContent).toBe('Ready')
    await act(async () => node.click())
    expect(click).toHaveBeenCalledTimes(1)
    expect(host.querySelectorAll('.uf-membrane:not([data-membrane-disabled])')).toHaveLength(1)
  })
})
