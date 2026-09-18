import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Tree } from '../../Tree/Tree'
import { libraryCss, mount } from './harness'
import { interpret } from '../create-machine'
import { treeMachine } from '../machines/tree.machine'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Tree expands a branch and selects a nested node', async () => {
    await act(async () => {
      root.render(
        <Tree
          items={[
            {
              id: 'src',
              label: 'src',
              icon: 'folder',
              children: [
                { id: 'index', label: 'index.ts', icon: 'file' },
                { id: 'utils', label: 'utils.ts', icon: 'file', kind: 'tile' },
                {
                  id: 'custom',
                  label: 'Custom',
                  kind: 'custom',
                  content: (
                    <span data-testid="custom-tree-content">Custom node</span>
                  ),
                },
              ],
            },
          ]}
        />,
      )
    })

    const branchButton = container.querySelector(
      '[data-tree-node-id="src"]',
    ) as HTMLButtonElement | null
    const branchContent = container.querySelector(
      '[data-part="branchContent"][data-value="src"]',
    ) as HTMLElement | null

    expect(branchButton).not.toBeNull()
    expect(branchContent?.hidden).toBe(true)
    expect(branchButton?.getAttribute('data-full-width')).toBe('')
    expect(
      branchButton?.parentElement?.classList.contains('uf-membrane--full'),
    ).toBe(true)

    await act(async () => {
      branchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(branchContent?.hidden).toBe(false)
    expect(branchContent?.classList.contains('uf-tree-branch-content')).toBe(
      true,
    )

    const childButton = container.querySelector(
      '[data-tree-node-id="index"]',
    ) as HTMLButtonElement | null
    expect(childButton).not.toBeNull()
    expect(childButton?.getAttribute('data-full-width')).toBe('')
    expect(
      childButton?.parentElement?.classList.contains('uf-membrane--full'),
    ).toBe(true)

    await act(async () => {
      childButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(childButton?.getAttribute('data-selected')).toBe('')

    const tileNode = container.querySelector(
      '[data-tree-node-id="utils"][data-scope="tile"]',
    ) as HTMLElement | null
    const customNode = container.querySelector(
      '[data-tree-node-id="custom"].uf-tree-custom-node',
    ) as HTMLElement | null
    expect(tileNode).not.toBeNull()
    expect(tileNode?.getAttribute('data-full-width')).toBe('')
    expect(customNode?.textContent).toContain('Custom node')

    const componentStyles = libraryCss()
    expect(componentStyles).toContain('.uf-tree[data-scope] .uf-tree-branch')
    expect(componentStyles).toContain(
      '.uf-tree[data-scope] [data-part="branchContent"]',
    )
    expect(componentStyles).toContain('flex-direction: column;')
    expect(componentStyles).toContain('width: 100%;')
  })

  it('Tree treats expandedIds as controlled even without a change handler', async () => {
    await act(async () => {
      root.render(
        <Tree
          expandedIds={['src']}
          selectedId="index"
          items={[
            {
              id: 'src',
              label: 'src',
              icon: 'folder',
              children: [{ id: 'index', label: 'index.ts', icon: 'file' }],
            },
          ]}
        />,
      )
    })

    const branchButton = container.querySelector(
      '[data-tree-node-id="src"]',
    ) as HTMLButtonElement | null
    const branchContent = container.querySelector(
      '[data-part="branchContent"][data-value="src"]',
    ) as HTMLElement | null
    expect(branchContent?.hidden).toBe(false)

    await act(async () => {
      branchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(branchContent?.hidden).toBe(false)
  })

  it('Tree ignores non-function render overrides from generated preview props', async () => {
    await act(async () => {
      root.render(
        <Tree
          renderNode={'preview-string-placeholder' as any}
          items={[
            {
              id: 'readme',
              label: 'README.md',
              icon: 'file',
              render: 'preview-string-placeholder' as any,
            },
          ]}
        />,
      )
    })

    const node = container.querySelector(
      '[data-tree-node-id="readme"]',
    ) as HTMLElement | null
    expect(node).not.toBeNull()
    expect(node?.textContent).toContain('README.md')
  })

  it('Tree keeps expansion stable when preview bridge promotes it to controlled props', async () => {
    const items = [
      {
        id: 'src',
        label: 'src',
        icon: 'folder',
        children: [
          {
            id: 'components',
            label: 'components',
            icon: 'folder',
            children: [{ id: 'button', label: 'Button.tsx', icon: 'file' }],
          },
          {
            id: 'assets',
            label: 'assets',
            icon: 'folder',
            children: [{ id: 'icons', label: 'icons', icon: 'folder' }],
          },
        ],
      },
    ]

    function PreviewBridgeHarness() {
      const [bridgeProps, setBridgeProps] = React.useState<
        Record<string, unknown>
      >({
        defaultExpandedIds: ['src'],
        defaultSelectedId: 'button',
      })

      return (
        <Tree
          items={items}
          {...bridgeProps}
          onExpandedChange={(details) => {
            setBridgeProps((prev) => ({
              ...prev,
              expandedIds: details.expandedIds,
            }))
          }}
          onSelectedChange={(details) => {
            setBridgeProps((prev) => ({
              ...prev,
              selectedId: details.selectedId,
            }))
          }}
        />
      )
    }

    await act(async () => {
      root.render(<PreviewBridgeHarness />)
    })

    const assetsButton = container.querySelector(
      '[data-tree-node-id="assets"]',
    ) as HTMLButtonElement | null
    const componentsButton = container.querySelector(
      '[data-tree-node-id="components"]',
    ) as HTMLButtonElement | null
    const assetsContent = container.querySelector(
      '[data-part="branchContent"][data-value="assets"]',
    ) as HTMLElement | null
    const componentsContent = container.querySelector(
      '[data-part="branchContent"][data-value="components"]',
    ) as HTMLElement | null

    expect(assetsContent?.hidden).toBe(true)
    expect(componentsContent?.hidden).toBe(true)

    await act(async () => {
      assetsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(assetsContent?.hidden).toBe(false)
    expect(assetsButton?.getAttribute('aria-selected')).toBe('true')
    expect(assetsButton?.closest('[role="none"]')).not.toBeNull()

    await act(async () => {
      componentsButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })

    expect(assetsContent?.hidden).toBe(false)
    expect(componentsContent?.hidden).toBe(false)
  })
})

describe('keyboard machine fidelity', () => {
  it('tree uses visible order for home/end/arrow navigation', () => {
    const svc = interpret(treeMachine, {
      visibleIds: ['root', 'child-a', 'child-b', 'leaf'],
      selectedId: 'root',
    }).start()

    svc.send({ type: 'FOCUS', id: 'root' })
    svc.send({ type: 'FOCUS_NEXT' })
    expect(svc.getSnapshot().context.focusedId).toBe('child-a')

    svc.send({ type: 'FOCUS_LAST' })
    expect(svc.getSnapshot().context.focusedId).toBe('leaf')

    svc.send({ type: 'FOCUS_FIRST' })
    expect(svc.getSnapshot().context.focusedId).toBe('root')
    svc.stop()
  })
})
