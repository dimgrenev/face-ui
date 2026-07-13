// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Overlay } from '../../Overlay/Overlay'
import { Toggle } from '../../Toggle/Toggle'
import { FELD_GALLERY_ENTRIES } from '../../utils/__generated__/render_gallery.generated'
import { collectProductScenarioContracts } from '../contracts/sync-face-json'

const componentByName = new Map<string, React.ComponentType<Record<string, unknown>>>([
  ...FELD_GALLERY_ENTRIES.map((entry) => [entry.name, entry.Component] as const),
  ['Overlay', Overlay],
  ['Toggle', Toggle],
])

describe('product scenario contracts', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('mounts every published scenario with visible component DOM', async () => {
    const scenarios = collectProductScenarioContracts()

    expect(scenarios).toHaveLength(90)

    for (const scenario of scenarios) {
      const Component = componentByName.get(scenario.componentName)
      const contract = scenario.currentContract
      const label = `${scenario.componentName}: ${scenario.scenarioName}`

      expect(Component, `${label} should resolve to a public component`).toBeDefined()
      expect(contract, `${label} should have a generated face contract`).not.toBeNull()
      if (!Component || !contract) continue

      await act(async () => {
        root.render(<Component {...contract.currentState.props} />)
      })

      const renderedNode = container.querySelector(
        '[data-scope], svg, img, video, canvas, input, textarea, button, table, [role]',
      ) ?? Array.from(document.body.children).find((node) => node !== container && node.querySelector?.('[data-scope]'))

      expect(renderedNode, `${label} should not render an empty preview`).toBeTruthy()

      await act(async () => {
        root.render(null)
      })
    }
  })
})
