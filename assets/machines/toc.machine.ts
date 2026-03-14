/**
 * Toc (Table of Contents) Machine — navigational "where you are" indicator.
 *
 * States: idle
 * Context tracks activeId and items list.
 * Events: SET_ACTIVE
 */

import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, MachineSnapshot, SendFn } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const tocAnatomy = createAnatomy('toc').parts(
  'root',
  'item',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface TocItem {
  id: string
  label: string
  level?: number
  disabled?: boolean
}

export interface TocSchema extends MachineSchema {
  context: {
    activeId: string
    items: TocItem[]
    onActiveChange?: ((details: { id: string }) => void) | null
  }
  state: 'idle'
  event:
    | { type: 'SET_ACTIVE'; id: string }
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

export const tocMachine = createMachine<TocSchema>({
  id: 'toc',
  initial: 'idle',
  context: {
    activeId: '',
    items: [],
    onActiveChange: null,
  },

  watch: {
    activeId(ctx) {
      ctx.onActiveChange?.({ id: ctx.activeId })
    },
  },

  states: {
    idle: {
      on: {
        SET_ACTIVE: {
          actions: [
            (ctx, e) => {
              ctx.activeId = (e as { type: 'SET_ACTIVE'; id: string }).id
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

export function connectToc(
  state: MachineSnapshot<TocSchema>,
  send: SendFn<TocSchema>,
) {
  const { activeId } = state.context

  return {
    getRootProps() {
      return {
        ...tocAnatomy.getPartAttrs('root'),
        role: 'navigation' as const,
        'aria-label': 'Table of contents',
      }
    },

    getItemProps(props: { id: string; disabled?: boolean }) {
      const isActive = activeId === props.id
      const isDisabled = props.disabled ?? false

      return {
        ...tocAnatomy.getPartAttrs('item'),
        'data-active': isActive || undefined,
        'data-disabled': isDisabled || undefined,
        'aria-current': isActive ? ('location' as const) : undefined,
        'aria-disabled': isDisabled || undefined,
        onClick() {
          if (!isDisabled) {
            send({ type: 'SET_ACTIVE', id: props.id })
          }
        },
      }
    },
  }
}
