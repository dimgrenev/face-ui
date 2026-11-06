import { act, useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { inertProp } from '../adapters/react/inert-prop'
import { useFocusRecovery } from '../adapters/react/use-focus-recovery'
import { mount, type View } from './harness'

interface ListProps {
  keys: readonly string[]
  fallback: (lost: HTMLElement) => HTMLElement | null | undefined
  lose?: 'disabled' | 'hidden' | 'inert' | 'display'
  loseKey?: string
  hideRoot?: boolean
  autoFocusInput?: boolean
}

function List({
  keys,
  fallback,
  lose,
  loseKey,
  hideRoot,
  autoFocusInput,
}: ListProps) {
  const ref = useRef<HTMLUListElement>(null)
  useFocusRecovery(ref, fallback)
  return (
    <ul ref={ref} hidden={hideRoot}>
      {keys.map((key) => {
        const lost = key === loseKey
        return (
          <li key={key} {...inertProp(lost && lose === 'inert')}>
            <button
              data-key={key}
              disabled={lost && lose === 'disabled'}
              hidden={lost && lose === 'hidden'}
              style={
                lost && lose === 'display' ? { display: 'none' } : undefined
              }
            >
              {key}
            </button>
          </li>
        )
      })}
      {autoFocusInput && <input autoFocus />}
    </ul>
  )
}

describe('useFocusRecovery', () => {
  let view: View
  let outside: HTMLButtonElement
  const button = (key: string) =>
    view.host.querySelector<HTMLButtonElement>(`[data-key="${key}"]`)!
  const first = () =>
    view.host.querySelector<HTMLElement>('button:not([disabled],[hidden])')
  const render = (props: ListProps) =>
    act(async () => view.root.render(<List {...props} />))
  const focus = (element: HTMLElement) => act(async () => element.focus())
  beforeEach(() => {
    view = mount()
    outside = document.body.appendChild(document.createElement('button'))
    return () => outside.remove()
  })

  it('focuses the fallback after the focused element is removed', async () => {
    const fallback = vi.fn(first)
    await render({ keys: ['a', 'b', 'c'], fallback })
    const lost = button('b')
    await focus(lost)
    await render({ keys: ['a', 'c'], fallback })
    expect(fallback).toHaveBeenCalledTimes(1)
    expect(fallback).toHaveBeenCalledWith(lost)
    expect(document.activeElement).toBe(button('a'))
  })

  for (const lose of ['disabled', 'hidden', 'inert', 'display'] as const)
    it(`recovers when the focused element becomes ${lose}`, async () => {
      const fallback = vi.fn(() => button('c'))
      await render({ keys: ['a', 'b', 'c'], fallback })
      await focus(button('b'))
      await render({ keys: ['a', 'b', 'c'], fallback, lose, loseKey: 'b' })
      expect(fallback).toHaveBeenCalledWith(button('b'))
      expect(document.activeElement).toBe(button('c'))
    })

  it('leaves focus alone when it moved elsewhere or was blurred on purpose first', async () => {
    const fallback = vi.fn(first)
    await render({ keys: ['a', 'b', 'c'], fallback })
    await focus(button('b'))
    await focus(outside)
    await render({ keys: ['a', 'c'], fallback })
    expect(document.activeElement).toBe(outside)
    await focus(button('c'))
    // A click on the page: <body> takes focus while the button is still usable.
    await act(async () => button('c').blur())
    await render({ keys: ['a'], fallback })
    expect(document.activeElement).toBe(document.body)
    expect(fallback).not.toHaveBeenCalled()
  })

  it('does not recover into a root that became unavailable', async () => {
    const fallback = vi.fn(first)
    await render({ keys: ['a', 'b'], fallback })
    await focus(button('b'))
    await render({ keys: ['a'], fallback, hideRoot: true })
    expect(fallback).not.toHaveBeenCalled()
    // The loss is forgotten: showing the root again steals nothing.
    await render({ keys: ['a'], fallback })
    expect(document.activeElement).toBe(document.body)
  })

  it('keeps focus that a child placed during the same commit', async () => {
    const fallback = vi.fn(first)
    await render({ keys: ['a', 'b'], fallback })
    await focus(button('b'))
    await render({ keys: ['a'], fallback, autoFocusInput: true })
    expect(document.activeElement).toBe(view.host.querySelector('input'))
    expect(fallback).not.toHaveBeenCalled()
    // …and tracks it: that element is the next one recovered from.
    await render({ keys: ['a'], fallback })
    expect(fallback).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(button('a'))
  })

  it('ignores a fallback that cannot take focus', async () => {
    await render({ keys: ['a', 'b'], fallback: () => null })
    await focus(button('b'))
    await render({
      keys: ['a'],
      fallback: () => button('a'),
      lose: 'hidden',
      loseKey: 'a',
    })
    expect(document.activeElement).toBe(document.body)
  })
})
