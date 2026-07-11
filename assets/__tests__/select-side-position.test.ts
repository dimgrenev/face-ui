import { describe, expect, it } from 'vitest'
import {
  computeSelectSideOptionViewportHeight,
  computeSelectSidePosition,
} from '../../Select/Select'

describe('Select side positioning', () => {
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

  it('shows five side options before enabling scrolling', () => {
    expect(computeSelectSideOptionViewportHeight({
      contentHeight: 162,
      optionBottomOffsets: [33, 65, 97, 129, 161],
    })).toBe(162)

    expect(computeSelectSideOptionViewportHeight({
      contentHeight: 354,
      optionBottomOffsets: [33, 65, 97, 129, 161, 193, 225, 257, 289, 321, 353],
    })).toBe(162)
  })

  it('keeps all side options measurable while capping the visual viewport', () => {
    expect(computeSelectSideOptionViewportHeight({
      contentHeight: 450,
      optionBottomOffsets: [33, 65, 97, 129, 161, 193, 225, 257, 289, 321, 353, 385, 417, 449],
    })).toBe(162)
  })
})
