import { beforeEach, describe, expect, it } from 'vitest'
import type { Root } from 'react-dom/client'
import { act } from 'react'
import { Progress } from '../../Progress/Progress'
import { mount } from './harness'

describe('component smoke', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('Progress renders a visible track without requiring text labels', async () => {
    await act(async () => {
      root.render(<Progress value={60} aria-label="Build progress" />)
    })

    const rootNode = container.querySelector(
      '[data-scope="progress"]',
    ) as HTMLElement | null
    const header = container.querySelector(
      '.uf-range-indicator__header',
    ) as HTMLElement | null
    const trackWrap = container.querySelector(
      '.uf-range-indicator__track-wrap',
    ) as HTMLElement | null
    const track = container.querySelector(
      '[data-scope="progress"] [data-part="track"]',
    ) as HTMLElement | null
    const indicator = container.querySelector(
      '[data-scope="progress"] [data-part="indicator"]',
    ) as HTMLElement | null

    expect(rootNode?.getAttribute('aria-label')).toBe('Build progress')
    expect(rootNode?.getAttribute('data-shape')).toBe('linear')
    expect(header).toBeNull()
    expect(trackWrap).not.toBeNull()
    expect(track).not.toBeNull()
    expect(indicator).not.toBeNull()
    expect(indicator?.style.getPropertyValue('--uf-range-percent')).toBe('60%')
    expect(container.textContent).not.toContain('%')

  })

  it('Progress aligns linear labels above the track', async () => {
    await act(async () => {
      root.render(<Progress value={28} label="Uploading assets" showValue />)
    })

    const header = container.querySelector(
      '.uf-range-indicator__header',
    ) as HTMLElement | null
    const label = container.querySelector(
      '[data-scope="progress"][data-part="label"]',
    ) as HTMLElement | null
    const percent = container.querySelector(
      '.uf-range-indicator__value',
    ) as HTMLElement | null
    const trackWrap = container.querySelector(
      '.uf-range-indicator__track-wrap',
    ) as HTMLElement | null
    const track = container.querySelector(
      '[data-scope="progress"] [data-part="track"]',
    ) as HTMLElement | null

    expect(header).not.toBeNull()
    expect(label?.textContent).toBe('Uploading assets')
    expect(percent?.textContent).toBe('28%')
    expect(trackWrap).not.toBeNull()
    expect(track).not.toBeNull()

  })

  it('Progress renders a circular ring variant without scaling the ring by percent width', async () => {
    await act(async () => {
      root.render(
        <Progress
          value={28}
          shape="circle"
          showValue
          aria-label="Import progress"
        />,
      )
    })

    const rootNode = container.querySelector(
      '[data-scope="progress"]',
    ) as HTMLElement | null
    const track = container.querySelector(
      '[data-scope="progress"] [data-part="track"]',
    ) as HTMLElement | null
    const indicator = container.querySelector(
      '[data-scope="progress"] [data-part="indicator"]',
    ) as HTMLElement | null

    expect(rootNode?.getAttribute('aria-label')).toBe('Import progress')
    expect(rootNode?.getAttribute('data-shape')).toBe('circle')
    expect(track).not.toBeNull()
    expect(indicator).not.toBeNull()
    expect(indicator?.style.width).toBe('')
    expect(parseFloat(indicator!.style.getPropertyValue('--uf-range-percent'))).toBeCloseTo(28)
    expect(container.textContent).toContain('28%')

  })

  it('Progress clamps finite out-of-range values and exposes semantic tone independently from shape', async () => {
    await act(async () => {
      root.render(
        <Progress
          value={150}
          max={100}
          tone="destructive"
          aria-label="Upload failed"
        />,
      )
    })

    const rootNode = container.querySelector(
      '[data-scope="progress"]',
    ) as HTMLElement | null
    const indicator = container.querySelector(
      '[data-scope="progress"] [data-part="indicator"]',
    ) as HTMLElement | null

    expect(rootNode?.getAttribute('data-tone')).toBe('destructive')
    expect(rootNode?.getAttribute('data-state')).toBe('complete')
    expect(rootNode?.getAttribute('aria-valuenow')).toBe('100')
    expect(rootNode?.getAttribute('aria-valuemax')).toBe('100')
    expect(indicator?.style.getPropertyValue('--uf-range-percent')).toBe('100%')
  })
})

describe('data and feedback a11y characterization', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;({ host: container, root } = mount())
  })

  it('links Progress visible labels to the progressbar root', async () => {
    await act(async () => {
      root.render(<Progress value={75} max={100} label="Uploading assets" />)
    })

    const progress = container.querySelector<HTMLElement>(
      '[data-scope="progress"][data-part="root"]',
    )
    const label = container.querySelector<HTMLElement>(
      '[data-scope="progress"][data-part="label"]',
    )

    expect(progress).not.toBeNull()
    expect(label).not.toBeNull()
    expect(progress?.getAttribute('role')).toBe('progressbar')
    expect(progress?.getAttribute('aria-valuenow')).toBe('75')
    expect(progress?.getAttribute('aria-valuetext')).toBe('75%')
    expect(label?.textContent).toBe('Uploading assets')
    expect(label?.id).toBeTruthy()
    expect(progress?.getAttribute('aria-labelledby')).toBe(label?.id)

    await act(async () => {
      root.render(<Progress value={null} aria-label="Loading assets" />)
    })

    const labelledProgress = container.querySelector<HTMLElement>(
      '[data-scope="progress"][data-part="root"]',
    )
    expect(labelledProgress?.getAttribute('aria-label')).toBe('Loading assets')
    expect(labelledProgress?.getAttribute('aria-labelledby')).toBeNull()
    expect(labelledProgress?.getAttribute('aria-valuenow')).toBeNull()
    expect(labelledProgress?.getAttribute('data-state')).toBe('indeterminate')
  })
})
