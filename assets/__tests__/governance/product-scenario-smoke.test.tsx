import React from 'react'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { beforeEach, describe, expect, it } from 'vitest'
import { Overlay } from '../../../Overlay/Overlay'
import { Toggle } from '../../../Toggle/Toggle'
import { FELD_GALLERY_ENTRIES } from '../../../utils/__generated__/render_gallery.generated'
import { collectProductScenarioContracts } from '../../contracts/sync-face-json'
import { mount } from '../harness'

const componentByName = new Map<
  string,
  React.ComponentType<Record<string, unknown>>
>([
  ...FELD_GALLERY_ENTRIES.map(
    (entry) => [entry.name, entry.Component] as const,
  ),
  ['Overlay', Overlay],
  ['Toggle', Toggle],
])
const scenarios = collectProductScenarioContracts()

describe('product scenario contracts', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('includes every published scenario', () => {
    expect(scenarios).toHaveLength(92)
  })

  it.each(scenarios)(
    'mounts $componentName: $scenarioName with visible component DOM',
    async (scenario) => {
      const Component = componentByName.get(scenario.componentName)
      const contract = scenario.currentContract
      const label = `${scenario.componentName}: ${scenario.scenarioName}`

      expect(
        Component,
        `${label} should resolve to a public component`,
      ).toBeDefined()
      expect(
        contract,
        `${label} should have a generated face contract`,
      ).not.toBeNull()
      if (!Component || !contract) return

      await act(async () => {
        root.render(<Component {...contract.currentState.props} />)
      })

      const renderedNode =
        container.querySelector(
          '[data-scope], svg, img, video, canvas, input, textarea, button, table, [role]',
        ) ??
        Array.from(document.body.children).find(
          (node) => node !== container && node.querySelector?.('[data-scope]'),
        )

      expect(
        renderedNode,
        `${label} should not render an empty preview`,
      ).toBeTruthy()
    },
  )
})
