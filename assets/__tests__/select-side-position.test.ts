import { describe, expect, it } from 'vitest'
import { computeSelectSidePosition } from '../../Select/Select'

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
})
