/**
 * @face-ui/core — Pagination Machine
 *
 * Framework-agnostic FSM for page navigation.
 * Computes total pages, visible page ranges with ellipses, and prev/next state.
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineConfig, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const paginationAnatomy = createAnatomy('pagination').parts(
  'root',
  'prev',
  'next',
  'item',
  'ellipsis',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface PaginationContext {
  [key: string]: unknown
  page: number
  total: number
  pageSize: number
  siblingCount: number
  disabled: boolean
  onPageChange: ((details: { page: number }) => void) | null
}

type PaginationState = 'idle'

type PaginationEvent =
  | { type: 'SET_PAGE'; page: number }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'FIRST' }
  | { type: 'LAST' }

export interface PaginationSchema extends MachineSchema {
  context: PaginationContext
  state: PaginationState
  event: PaginationEvent
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeTotalPages(ctx: PaginationContext): number {
  return Math.max(1, Math.ceil(ctx.total / ctx.pageSize))
}

function clampPage(page: number, totalPages: number): number {
  return Math.max(1, Math.min(page, totalPages))
}

/**
 * Build the visible page range with ellipsis markers.
 * Returns an array of page numbers and -1 for ellipsis positions.
 */
function computeRange(page: number, totalPages: number, siblingCount: number): number[] {
  // Total slots: first + last + current + 2*siblings + 2 ellipsis positions
  const totalSlots = 2 * siblingCount + 5

  // If total pages fit in the slots, show all pages
  if (totalPages <= totalSlots) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const leftSiblingIndex = Math.max(page - siblingCount, 1)
  const rightSiblingIndex = Math.min(page + siblingCount, totalPages)

  const showLeftEllipsis = leftSiblingIndex > 2
  const showRightEllipsis = rightSiblingIndex < totalPages - 1

  if (!showLeftEllipsis && showRightEllipsis) {
    // Show first N pages + ellipsis + last page
    const leftCount = 3 + 2 * siblingCount
    const leftRange = Array.from({ length: leftCount }, (_, i) => i + 1)
    return [...leftRange, -1, totalPages]
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    // Show first page + ellipsis + last N pages
    const rightCount = 3 + 2 * siblingCount
    const rightRange = Array.from(
      { length: rightCount },
      (_, i) => totalPages - rightCount + i + 1,
    )
    return [1, -1, ...rightRange]
  }

  // Both ellipses
  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i,
  )
  return [1, -1, ...middleRange, -1, totalPages]
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

const isNotDisabled = (ctx: PaginationContext): boolean => !ctx.disabled

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const setPage = (ctx: PaginationContext, event: PaginationEvent): void => {
  const e = event as { type: 'SET_PAGE'; page: number }
  const totalPages = computeTotalPages(ctx)
  ctx.page = clampPage(e.page, totalPages)
}

const goNext = (ctx: PaginationContext): void => {
  const totalPages = computeTotalPages(ctx)
  ctx.page = clampPage(ctx.page + 1, totalPages)
}

const goPrev = (ctx: PaginationContext): void => {
  ctx.page = clampPage(ctx.page - 1, computeTotalPages(ctx))
}

const goFirst = (ctx: PaginationContext): void => {
  ctx.page = 1
}

const goLast = (ctx: PaginationContext): void => {
  ctx.page = computeTotalPages(ctx)
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const paginationMachine: MachineConfig<PaginationSchema> = createMachine<PaginationSchema>({
  id: 'pagination',
  initial: 'idle',
  context: {
    page: 1,
    total: 0,
    pageSize: 10,
    siblingCount: 1,
    disabled: false,
    onPageChange: null,
  },

  computed: {
    totalPages: (ctx: PaginationContext) => computeTotalPages(ctx),
    range: (ctx: PaginationContext) =>
      computeRange(ctx.page, computeTotalPages(ctx), ctx.siblingCount),
    hasPrev: (ctx: PaginationContext) => ctx.page > 1,
    hasNext: (ctx: PaginationContext) => ctx.page < computeTotalPages(ctx),
  },

  watch: {
    page: (ctx: PaginationContext) => {
      ctx.onPageChange?.({ page: ctx.page })
    },
  },

  states: {
    idle: {
      on: {
        SET_PAGE: {
          guard: isNotDisabled,
          actions: [setPage],
        },
        NEXT: {
          guard: isNotDisabled,
          actions: [goNext],
        },
        PREV: {
          guard: isNotDisabled,
          actions: [goPrev],
        },
        FIRST: {
          guard: isNotDisabled,
          actions: [goFirst],
        },
        LAST: {
          guard: isNotDisabled,
          actions: [goLast],
        },
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect — maps machine state to DOM props
// ---------------------------------------------------------------------------

export function connectPagination(state: MachineSnapshot<PaginationSchema>, send: SendFn<PaginationSchema>) {
  const ctx = state.context
  const computed = state.computed
  const attrs = paginationAnatomy.getPartAttrs

  const totalPages = computed.totalPages as number
  const range = computed.range as number[]
  const hasPrev = computed.hasPrev as boolean
  const hasNext = computed.hasNext as boolean

  return {
    /** Current page number (1-indexed) */
    page: ctx.page,
    /** Total number of pages */
    totalPages,
    /** Visible page numbers (-1 = ellipsis) */
    range,
    /** Whether there is a previous page */
    hasPrev,
    /** Whether there is a next page */
    hasNext,

    getRootProps() {
      return {
        ...attrs('root'),
        role: 'navigation' as const,
        'aria-label': 'Pagination',
        'data-disabled': ctx.disabled ? '' : undefined,
      }
    },

    getPrevProps() {
      const isDisabled = ctx.disabled || !hasPrev
      return {
        ...attrs('prev'),
        type: 'button' as const,
        'aria-label': 'Previous page',
        'data-disabled': isDisabled ? '' : undefined,
        disabled: isDisabled,
        onClick() {
          if (!isDisabled) {
            send({ type: 'PREV' })
          }
        },
      }
    },

    getNextProps() {
      const isDisabled = ctx.disabled || !hasNext
      return {
        ...attrs('next'),
        type: 'button' as const,
        'aria-label': 'Next page',
        'data-disabled': isDisabled ? '' : undefined,
        disabled: isDisabled,
        onClick() {
          if (!isDisabled) {
            send({ type: 'NEXT' })
          }
        },
      }
    },

    getPageProps(page: number) {
      const isCurrent = ctx.page === page
      const isDisabled = ctx.disabled
      return {
        ...attrs('item'),
        type: 'button' as const,
        'aria-label': `Page ${page}`,
        'aria-current': isCurrent ? ('page' as const) : undefined,
        'data-selected': isCurrent ? '' : undefined,
        'data-disabled': isDisabled ? '' : undefined,
        'data-value': page,
        disabled: isDisabled,
        onClick() {
          if (!isDisabled) {
            send({ type: 'SET_PAGE', page })
          }
        },
      }
    },

    getEllipsisProps() {
      return {
        ...attrs('ellipsis'),
        'aria-hidden': true as const,
      }
    },
  }
}
