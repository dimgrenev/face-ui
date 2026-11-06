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

describe('Badge content contract', () => {
  it('Badge renders its children, omits an empty content slot and forwards native root props', async () => {
    const ref = createRef<HTMLElement>()
    const click = vi.fn()
    await render(<Badge>Plain</Badge>)
    expect(host.textContent).toBe('Plain')
    await render(<Badge>{0}</Badge>)
    expect(host.textContent).toBe('0')
    for (const empty of [false, '', null]) {
      await render(<Badge>{empty}</Badge>)
      expect(host.textContent).toBe('')
      expect(host.querySelector('.uf-text__content')).toBeNull()
    }
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

  it('variant sets the fill or outline treatment independently of tone', async () => {
    await render(<Badge tone="positive">Ready</Badge>)
    const badge = () => host.querySelector('.uf-badge')!
    expect(badge().getAttribute('data-variant')).toBe('outline')
    expect(badge().getAttribute('data-tone')).toBe('positive')
    await render(<Badge variant="fill" tone="positive">Ready</Badge>)
    expect(badge().getAttribute('data-variant')).toBe('fill')
    expect(badge().getAttribute('data-tone')).toBe('positive')
  })
})
