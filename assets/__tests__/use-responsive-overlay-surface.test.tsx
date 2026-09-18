import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { useResponsiveOverlaySurface } from '../adapters/react/use-responsive-overlay-surface'
import { installMatchMedia, type MatchMediaRestore } from './harness/match-media'
import { mount } from './harness'

describe('responsive overlay surfaces', () => {
  let container: HTMLDivElement
  let root: Root
  let restoreMatchMedia: MatchMediaRestore | null

  beforeEach(() => {
    ;({ host: container, root } = mount())
    restoreMatchMedia = installMatchMedia(true)
  })

  afterEach(() => {
    restoreMatchMedia?.()
    restoreMatchMedia = null
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
    document.body.style.touchAction = ''
  })

  it('keeps auto overlay initial render SSR-stable before compact viewport promotion', async () => {
    const renderSequence: string[] = []

    function SurfaceProbe() {
      const surface = useResponsiveOverlaySurface('auto')
      renderSequence.push(surface)
      return <div data-testid="surface-probe" data-surface={surface} />
    }

    await act(async () => {
      root.render(<SurfaceProbe />)
    })

    expect(renderSequence[0]).toBe('popover')
    expect(renderSequence).toContain('sheet')
    expect(
      container
        .querySelector('[data-testid="surface-probe"]')
        ?.getAttribute('data-surface'),
    ).toBe('sheet')
  })
})
