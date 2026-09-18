import { beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Toc } from '../../Toc/Toc'
import { mount } from './harness'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Toc changes active item in uncontrolled mode', async () => {
    await act(async () => {
      root.render(
        <Toc
          defaultActiveId="intro"
          items={[
            { id: 'intro', label: 'Introduction' },
            { id: 'setup', label: 'Setup' },
          ]}
        />,
      )
    })

    const intro =
      Array.from(container.querySelectorAll<HTMLElement>('button')).find(
        (button) => button.textContent?.includes('Introduction'),
      ) ?? null
    const setup =
      Array.from(container.querySelectorAll<HTMLElement>('button')).find(
        (button) => button.textContent?.includes('Setup'),
      ) ?? null

    expect(intro?.getAttribute('aria-current')).toBe('location')
    expect(intro?.getAttribute('data-full-width')).toBe('')
    expect(setup?.getAttribute('data-full-width')).toBe('')

    await act(async () => {
      setup?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(setup?.getAttribute('aria-current')).toBe('location')
  })
})
