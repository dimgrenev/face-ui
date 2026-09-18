import { beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Code } from '../../Code/Code'
import { mount } from './harness'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Code uses Text for the title and membrane-wrapped action buttons', async () => {
    await act(async () => {
      root.render(
        <Code
          title="Files / Playground"
          code={'const answer = 42\n'.repeat(12)}
          defaultCollapsed
        />,
      )
    })

    const title = container.querySelector(
      '.uf-code-title[data-scope="text"]',
    ) as HTMLElement | null
    const codeRoot = container.querySelector(
      '[data-scope="code"][data-part="root"]',
    ) as HTMLElement | null
    expect(codeRoot?.getAttribute('data-border')).toBe('true')
    expect(codeRoot?.getAttribute('data-card-variant')).toBe('code')
    expect(codeRoot?.getAttribute('data-full-width')).toBe('')
    expect(title?.textContent).toContain('Files / Playground')

    const actions = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.uf-code-action[data-scope="button"]',
      ),
    )
    expect(actions.length).toBeGreaterThan(0)
    expect(
      actions.every((button) => button.closest('.uf-membrane') != null),
    ).toBe(true)
  })

  it('Code treats tokenizedLines as a complete source when raw code is omitted', async () => {
    const tokenizedLines = Array.from({ length: 9 }, (_, index) => [
      {
        content: `const value${index + 1} = ${index + 1}`,
        color: 'currentColor',
      },
    ])

    await act(async () => {
      root.render(
        <Code
          tokenizedLines={tokenizedLines}
          showLineNumbers
          defaultCollapsed
        />,
      )
    })

    const lines = container.querySelectorAll(
      '[data-scope="code"][data-part="line"]',
    )
    const pre = container.querySelector(
      '[data-scope="code"][data-part="pre"]',
    ) as HTMLElement | null

    expect(lines).toHaveLength(9)
    expect(lines[8]?.textContent).toContain('const value9 = 9')
    expect(pre?.classList.contains('is-collapsed')).toBe(true)
    expect(container.querySelector('[aria-label="Copy code"]')).not.toBeNull()
    expect(container.querySelector('[aria-label="Expand code"]')).not.toBeNull()
  })
})
