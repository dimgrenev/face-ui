/**
 * Resizable Machine
 *
 * States: idle | dragging
 * Manages resizable panel layout with drag handles and keyboard support.
 * Sizes are percentages that sum to 100.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const resizableAnatomy = createAnatomy('resizable').parts(
  'root',
  'panel',
  'handle',
)

// ---------------------------------------------------------------------------
// Panel config (stored in machine context, without ReactNode content)
// ---------------------------------------------------------------------------

export interface ResizablePanelConfig {
  id: string
  minSize: number  // percentage
  maxSize: number  // percentage
  collapsible: boolean
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface ResizableSchema extends MachineSchema {
  context: {
    /** Current sizes as percentages (sum to 100) */
    sizes: number[]
    /** Layout orientation */
    orientation: 'horizontal' | 'vertical'
    /** Per-panel config (min/max/collapsible) */
    panelConfigs: ResizablePanelConfig[]
    /** Index of the handle being dragged (between panel[i] and panel[i+1]) */
    dragIndex: number
    /** Pointer position at drag start */
    startPosition: number
    /** Sizes snapshot at drag start */
    startSizes: number[]
    /** Container size in px at drag start (needed to convert px delta to %) */
    containerSize: number
    /** Callback when sizes change */
    onSizesChange: ((details: { sizes: number[] }) => void) | null
  }
  state: 'idle' | 'dragging'
  event:
    | { type: 'DRAG_START'; handleIndex: number; position: number; containerSize: number }
    | { type: 'DRAG'; position: number }
    | { type: 'DRAG_END' }
    | { type: 'SET_SIZES'; sizes: number[] }
    | { type: 'COLLAPSE'; panelIndex: number }
    | { type: 'EXPAND'; panelIndex: number }
    | { type: 'KEY_DOWN'; handleIndex: number; direction: 'increase' | 'decrease' }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KEYBOARD_STEP = 5 // percentage per keyboard step

function clampSizes(
  sizes: number[],
  configs: ResizablePanelConfig[],
): number[] {
  const clamped = sizes.map((s, i) => {
    const cfg = configs[i]
    if (!cfg) return s
    return Math.min(cfg.maxSize, Math.max(cfg.minSize, s))
  })

  // Normalize to sum to 100
  const sum = clamped.reduce((a, b) => a + b, 0)
  if (sum > 0 && Math.abs(sum - 100) > 0.01) {
    const scale = 100 / sum
    return clamped.map((s) => s * scale)
  }
  return clamped
}

function resizePanels(
  sizes: number[],
  handleIndex: number,
  delta: number,
  configs: ResizablePanelConfig[],
): number[] {
  const newSizes = [...sizes]
  const leftIndex = handleIndex
  const rightIndex = handleIndex + 1

  if (leftIndex < 0 || rightIndex >= newSizes.length) return newSizes

  const leftConfig = configs[leftIndex]
  const rightConfig = configs[rightIndex]

  let newLeft = newSizes[leftIndex] + delta
  let newRight = newSizes[rightIndex] - delta

  // Clamp left panel
  if (leftConfig) {
    if (newLeft < leftConfig.minSize) {
      const diff = leftConfig.minSize - newLeft
      newLeft = leftConfig.minSize
      newRight -= diff
    }
    if (newLeft > leftConfig.maxSize) {
      const diff = newLeft - leftConfig.maxSize
      newLeft = leftConfig.maxSize
      newRight += diff
    }
  }

  // Clamp right panel
  if (rightConfig) {
    if (newRight < rightConfig.minSize) {
      const diff = rightConfig.minSize - newRight
      newRight = rightConfig.minSize
      newLeft -= diff
    }
    if (newRight > rightConfig.maxSize) {
      const diff = newRight - rightConfig.maxSize
      newRight = rightConfig.maxSize
      newLeft += diff
    }
  }

  // Final clamp (ensure non-negative)
  newSizes[leftIndex] = Math.max(0, newLeft)
  newSizes[rightIndex] = Math.max(0, newRight)

  return newSizes
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const resizableMachine = createMachine<ResizableSchema>({
  id: 'resizable',
  initial: 'idle',

  context: {
    sizes: [50, 50],
    orientation: 'horizontal',
    panelConfigs: [],
    dragIndex: -1,
    startPosition: 0,
    startSizes: [],
    containerSize: 0,
    onSizesChange: null,
  },

  watch: {
    sizes(ctx) {
      ctx.onSizesChange?.({ sizes: ctx.sizes })
    },
  },

  states: {
    idle: {
      on: {
        DRAG_START: {
          target: 'dragging',
          actions: [
            (ctx, event) => {
              const e = event as { type: 'DRAG_START'; handleIndex: number; position: number; containerSize: number }
              ctx.dragIndex = e.handleIndex
              ctx.startPosition = e.position
              ctx.startSizes = [...ctx.sizes]
              ctx.containerSize = e.containerSize
            },
          ],
        },
        SET_SIZES: {
          actions: [
            (ctx, event) => {
              const e = event as { type: 'SET_SIZES'; sizes: number[] }
              ctx.sizes = clampSizes(e.sizes, ctx.panelConfigs)
            },
          ],
        },
        COLLAPSE: {
          actions: [
            (ctx, event) => {
              const e = event as { type: 'COLLAPSE'; panelIndex: number }
              const config = ctx.panelConfigs[e.panelIndex]
              if (!config?.collapsible) return

              const newSizes = [...ctx.sizes]
              const oldSize = newSizes[e.panelIndex]
              newSizes[e.panelIndex] = 0

              // Distribute the freed space to the adjacent panel
              const neighbor = e.panelIndex > 0 ? e.panelIndex - 1 : e.panelIndex + 1
              if (neighbor >= 0 && neighbor < newSizes.length) {
                newSizes[neighbor] += oldSize
              }

              ctx.sizes = clampSizes(newSizes, ctx.panelConfigs)
            },
          ],
        },
        EXPAND: {
          actions: [
            (ctx, event) => {
              const e = event as { type: 'EXPAND'; panelIndex: number }
              const config = ctx.panelConfigs[e.panelIndex]
              if (!config) return

              // Expand to minSize or default (evenly distributed)
              const targetSize = config.minSize > 0 ? config.minSize : (100 / ctx.sizes.length)
              const newSizes = [...ctx.sizes]
              const currentSize = newSizes[e.panelIndex]
              const delta = targetSize - currentSize

              if (delta <= 0) return

              // Take space from the largest neighbor
              const neighbor = e.panelIndex > 0 ? e.panelIndex - 1 : e.panelIndex + 1
              if (neighbor >= 0 && neighbor < newSizes.length) {
                newSizes[e.panelIndex] = targetSize
                newSizes[neighbor] -= delta
              }

              ctx.sizes = clampSizes(newSizes, ctx.panelConfigs)
            },
          ],
        },
        KEY_DOWN: {
          actions: [
            (ctx, event) => {
              const e = event as { type: 'KEY_DOWN'; handleIndex: number; direction: 'increase' | 'decrease' }
              const delta = e.direction === 'increase' ? KEYBOARD_STEP : -KEYBOARD_STEP
              ctx.sizes = resizePanels(ctx.sizes, e.handleIndex, delta, ctx.panelConfigs)
            },
          ],
        },
      },
    },

    dragging: {
      on: {
        DRAG: {
          actions: [
            (ctx, event) => {
              const e = event as { type: 'DRAG'; position: number }
              if (ctx.containerSize <= 0) return

              const pxDelta = e.position - ctx.startPosition
              const percentDelta = (pxDelta / ctx.containerSize) * 100

              ctx.sizes = resizePanels(
                ctx.startSizes,
                ctx.dragIndex,
                percentDelta,
                ctx.panelConfigs,
              )
            },
          ],
        },
        DRAG_END: {
          target: 'idle',
          actions: [
            (ctx) => {
              ctx.dragIndex = -1
              ctx.startPosition = 0
              ctx.startSizes = []
              ctx.containerSize = 0
            },
          ],
        },
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

export function connectResizable(
  state: MachineSnapshot<ResizableSchema>,
  send: SendFn<ResizableSchema>,
) {
  const { sizes, orientation, panelConfigs, dragIndex } = state.context
  const isDragging = state.matches('dragging')
  const isHorizontal = orientation === 'horizontal'

  return {
    /** Computed accessors */
    sizes,
    isDragging,
    orientation,

    getRootProps() {
      return {
        ...resizableAnatomy.getPartAttrs('root'),
        'data-orientation': orientation,
        'data-dragging': isDragging || undefined,
        style: {
          display: 'flex' as const,
          flexDirection: (isHorizontal ? 'row' : 'column') as 'row' | 'column',
          width: '100%',
          height: '100%',
        },
      }
    },

    getPanelProps(index: number) {
      const size = sizes[index] ?? 0
      const config = panelConfigs[index]
      const isCollapsed = config?.collapsible && size === 0

      return {
        ...resizableAnatomy.getPartAttrs('panel'),
        'data-panel-index': index,
        'data-panel-id': config?.id,
        'data-collapsed': isCollapsed || undefined,
        style: {
          flexBasis: `${size}%`,
          flexGrow: 0 as const,
          flexShrink: 0 as const,
          overflow: 'hidden' as const,
        },
      }
    },

    getHandleProps(handleIndex: number) {
      const isActive = isDragging && dragIndex === handleIndex

      // Compute aria values from the left panel
      const leftSize = sizes[handleIndex] ?? 0
      const leftConfig = panelConfigs[handleIndex]
      const ariaMin = leftConfig?.minSize ?? 0
      const ariaMax = leftConfig?.maxSize ?? 100

      return {
        ...resizableAnatomy.getPartAttrs('handle'),
        role: 'separator' as const,
        tabIndex: 0,
        'aria-valuenow': Math.round(leftSize),
        'aria-valuemin': Math.round(ariaMin),
        'aria-valuemax': Math.round(ariaMax),
        'aria-orientation': orientation,
        'data-handle-index': handleIndex,
        'data-orientation': orientation,
        'data-dragging': isActive || undefined,
        style: {
          cursor: isHorizontal ? 'col-resize' : 'row-resize',
        },
        onPointerDown(event: { clientX: number; clientY: number; currentTarget: { closest: (sel: string) => { getBoundingClientRect: () => { width: number; height: number } } | null } }) {
          const position = isHorizontal ? event.clientX : event.clientY
          // Get container size from the root element
          const root = event.currentTarget.closest('[data-scope="resizable"]')
          const rect = root?.getBoundingClientRect()
          const containerSize = isHorizontal ? (rect?.width ?? 0) : (rect?.height ?? 0)
          send({ type: 'DRAG_START', handleIndex, position, containerSize })
        },
        onKeyDown(event: { key: string; preventDefault: () => void }) {
          const increaseKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
          const decreaseKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'

          if (event.key === increaseKey) {
            event.preventDefault()
            send({ type: 'KEY_DOWN', handleIndex, direction: 'increase' })
          } else if (event.key === decreaseKey) {
            event.preventDefault()
            send({ type: 'KEY_DOWN', handleIndex, direction: 'decrease' })
          } else if (event.key === 'Home') {
            event.preventDefault()
            send({ type: 'KEY_DOWN', handleIndex, direction: 'decrease' })
          } else if (event.key === 'End') {
            event.preventDefault()
            send({ type: 'KEY_DOWN', handleIndex, direction: 'increase' })
          } else if (event.key === 'Enter') {
            event.preventDefault()
            // Toggle collapse on the left panel if collapsible
            const leftConfig = panelConfigs[handleIndex]
            if (leftConfig?.collapsible) {
              const leftSize = sizes[handleIndex] ?? 0
              if (leftSize === 0) {
                send({ type: 'EXPAND', panelIndex: handleIndex })
              } else {
                send({ type: 'COLLAPSE', panelIndex: handleIndex })
              }
            }
          }
        },
      }
    },
  }
}
