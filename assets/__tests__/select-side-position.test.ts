import { describe, expect, it } from 'vitest'
import {
  computeSelectSideOptionViewportHeight,
  computeSelectSidePosition,
} from '../../Select/select-side-position'

describe('Select side positioning', () => {
  it('attaches to a short Card without reducing the independent workbench height', () => {
    const position = computeSelectSidePosition({
      triggerRect: { left: 24, right: 160, top: 30, bottom: 58, width: 136, height: 28 },
      boundaryRect: { left: 0, right: 1200, top: 0, bottom: 800, width: 1200, height: 800 },
      attachmentRect: { left: 7, right: 427, top: 7, bottom: 45, width: 420, height: 38 },
      surfaceInsets: { left: 1, right: 1 },
      requestedGap: 6,
      contentHeight: 200,
      viewportWidth: 1200,
      viewportHeight: 800,
    })
    expect(position.left).toBe(432)
    expect(position.left + 1 - 427).toBe(6)
    expect(position.maxHeight).toBe(200)
  })

  it('flips using attachment edges and the painted membrane inset', () => {
    const position = computeSelectSidePosition({
      triggerRect: { left: 620, right: 760, top: 320, bottom: 348, width: 140, height: 28 },
      boundaryRect: null,
      attachmentRect: { left: 600, right: 990, top: 7, bottom: 45, width: 390, height: 38 },
      surfaceInsets: { left: 1, right: 2 },
      requestedGap: 6,
      contentHeight: 200,
      viewportWidth: 1000,
      viewportHeight: 800,
    })
    expect(position.left).toBe(356)
    expect(600 - (position.left + position.width - 2)).toBe(6)
    expect(position.top).toBe(320)
  })
  it('aligns the selected side option with the trigger row', () => {
    const position = computeSelectSidePosition({
      triggerRect: {
        left: 1140,
        right: 1500,
        top: 320,
        bottom: 384,
        width: 360,
        height: 64,
      },
      boundaryRect: {
        left: 1120,
        right: 1520,
        top: 120,
        bottom: 760,
        width: 400,
        height: 640,
      },
      contentHeight: 144,
      activeOptionCenterOffset: 88,
      viewportWidth: 1600,
      viewportHeight: 900,
    })

    expect(position.top).toBe(264)
    expect(position.left).toBe(876)
  })

  it('top-aligns a side dropdown to the trigger row', () => {
    const position = computeSelectSidePosition({
      triggerRect: {
        left: 1140,
        right: 1500,
        top: 320,
        bottom: 384,
        width: 360,
        height: 64,
      },
      boundaryRect: {
        left: 1120,
        right: 1520,
        top: 120,
        bottom: 760,
        width: 400,
        height: 640,
      },
      contentHeight: 72,
      viewportWidth: 1600,
      viewportHeight: 900,
    })

    expect(position.top).toBe(320)
    expect(position.left).toBe(876)
  })

  it('clamps a side dropdown to the nearest boundary instead of the viewport edge', () => {
    const position = computeSelectSidePosition({
      triggerRect: {
        left: 1140,
        right: 1500,
        top: 720,
        bottom: 784,
        width: 360,
        height: 64,
      },
      boundaryRect: {
        left: 1120,
        right: 1520,
        top: 120,
        bottom: 760,
        width: 400,
        height: 640,
      },
      contentHeight: 200,
      viewportWidth: 1600,
      viewportHeight: 900,
    })

    expect(position.top).toBe(556)
    expect(position.maxHeight).toBe(200)
  })

  it('keeps the natural dropdown height instead of recursively shrinking an already clipped panel', () => {
    const position = computeSelectSidePosition({
      triggerRect: {
        left: 1140,
        right: 1500,
        top: 680,
        bottom: 744,
        width: 360,
        height: 64,
      },
      boundaryRect: {
        left: 1120,
        right: 1520,
        top: 120,
        bottom: 760,
        width: 400,
        height: 640,
      },
      contentHeight: 80,
      activeOptionCenterOffset: 40,
      viewportWidth: 1600,
      viewportHeight: 900,
    })

    expect(position.top).toBe(672)
    expect(position.maxHeight).toBe(80)
    expect(position.initialScrollTop).toBe(0)
    expect(position.top + 40).toBe(712)
  })

  it('keeps a scrolled selection inside the panel when its trigger is below the first rows', () => {
    const position = computeSelectSidePosition({
      triggerRect: {
        left: 26,
        right: 334,
        top: 216,
        bottom: 248,
        width: 308,
        height: 32,
      },
      boundaryRect: null,
      contentHeight: 546,
      requestedMaxHeight: 172,
      activeOptionCenterOffset: 360,
      viewportWidth: 1000,
      viewportHeight: 720,
    })
    const selectedCenter = position.top + 360 - position.initialScrollTop
    expect(selectedCenter).toBe(232)
    expect(selectedCenter).toBeGreaterThan(position.top + 16)
    expect(selectedCenter).toBeLessThan(position.top + position.maxHeight - 16)
  })

  it.each([216, 600])(
    'keeps a narrow side popup clear of its trigger at y=%i',
    (top) => {
      const position = computeSelectSidePosition({
        triggerRect: {
          left: 26,
          right: 334,
          top,
          bottom: top + 32,
          width: 308,
          height: 32,
        },
        boundaryRect: null,
        contentHeight: 546,
        requestedMaxHeight: 172,
        activeOptionCenterOffset: 360,
        viewportWidth: 360,
        viewportHeight: 720,
      })
      expect(
        position.top >= top + 32 || position.top + position.maxHeight <= top,
      ).toBe(true)
      const selectedCenter = 360 - position.initialScrollTop
      expect(selectedCenter).toBeGreaterThan(16)
      expect(selectedCenter).toBeLessThan(position.maxHeight - 16)
    },
  )

  it('shows five side options before enabling scrolling', () => {
    expect(
      computeSelectSideOptionViewportHeight({
        contentHeight: 162,
        optionBottomOffsets: [33, 65, 97, 129, 161],
      }),
    ).toBe(162)

    expect(
      computeSelectSideOptionViewportHeight({
        contentHeight: 354,
        optionBottomOffsets: [
          33, 65, 97, 129, 161, 193, 225, 257, 289, 321, 353,
        ],
      }),
    ).toBe(162)
  })

  it('keeps all side options measurable while capping the visual viewport', () => {
    expect(
      computeSelectSideOptionViewportHeight({
        contentHeight: 450,
        optionBottomOffsets: [
          33, 65, 97, 129, 161, 193, 225, 257, 289, 321, 353, 385, 417, 449,
        ],
      }),
    ).toBe(162)
  })
})
