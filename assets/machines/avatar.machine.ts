/**
 * @face-ui/core — Avatar Machine
 *
 * Manages image loading state with optional fallback delay.
 * States: loading -> loaded | error
 * If fallbackDelayMs > 0, the fallback waits before showing (gives image time to load).
 */

import { splitGraphemes } from 'unicode-segmenter/grapheme'
import { createMachine } from '../create-machine'
import { createAnatomy } from '../anatomy'
import type { MachineSchema, TransitionConfig } from '../types'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const avatarAnatomy = createAnatomy('avatar').parts(
  'root',
  'image',
  'fallback',
)

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface AvatarSchema extends MachineSchema {
  context: {
    src: string
    name: string
    fallbackDelayMs: number
    fallbackTimerElapsed: boolean
    onLoadChange: ((details: { loaded: boolean }) => void) | null
  }
  state: 'loading' | 'loaded' | 'error'
  event:
    | { type: 'IMG_LOAD'; src: string }
    | { type: 'IMG_ERROR'; src: string }
    | { type: 'SHOW_FALLBACK' }
    | { type: 'SRC_CHANGE'; src: string }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const initials =
    parts.length === 1 ? parts : [parts[0], parts[parts.length - 1]]
  // Use the same Unicode rules on the server and client, independent of ICU.
  return initials
    .map((part) => splitGraphemes(part).next().value ?? '')
    .join('')
    .toUpperCase()
}

// ---------------------------------------------------------------------------
// Machine
// ---------------------------------------------------------------------------

const reload: TransitionConfig<AvatarSchema> = {
  target: 'loading',
  reenter: true,
  actions: [
    (ctx, event) => {
      if (event.type !== 'SRC_CHANGE') return
      ctx.src = event.src
      ctx.fallbackTimerElapsed = false
    },
  ],
}

export const avatarMachine = createMachine<AvatarSchema>({
  id: 'avatar',
  initial: 'loading',

  context: {
    src: '',
    name: '',
    fallbackDelayMs: 0,
    fallbackTimerElapsed: false,
    onLoadChange: null,
  },

  states: {
    loading: {
      effects: ['fallbackTimer'],
      on: {
        SRC_CHANGE: reload,
        IMG_LOAD: {
          target: 'loaded',
          guard: (ctx, event) =>
            event.type === 'IMG_LOAD' && event.src === ctx.src,
        },
        IMG_ERROR: {
          target: 'error',
          guard: (ctx, event) =>
            event.type === 'IMG_ERROR' && event.src === ctx.src,
        },
        SHOW_FALLBACK: {
          actions: [
            (ctx) => {
              ctx.fallbackTimerElapsed = true
            },
          ],
        },
      },
    },

    loaded: {
      entry: [
        (ctx) => {
          ctx.onLoadChange?.({ loaded: true })
        },
      ],
      on: {
        SRC_CHANGE: reload,
      },
    },

    error: {
      entry: [
        (ctx) => {
          ctx.fallbackTimerElapsed = true
          ctx.onLoadChange?.({ loaded: false })
        },
      ],
      on: {
        SRC_CHANGE: reload,
      },
    },
  },

  computed: {
    showImage: (_ctx, { matches }) => matches('loaded'),
    showFallback: (ctx, { matches }) => {
      if (matches('error')) return true
      if (matches('loading') && ctx.fallbackDelayMs <= 0) return true
      if (matches('loading') && ctx.fallbackTimerElapsed) return true
      return false
    },
    initials: (ctx) => getInitials(ctx.name),
  },

  implementations: {
    effects: {
      fallbackTimer: (ctx, send) => {
        if (!ctx.src) {
          send({ type: 'IMG_ERROR', src: '' })
          return
        }
        if (ctx.fallbackDelayMs <= 0) return
        const timer = setTimeout(() => {
          send({ type: 'SHOW_FALLBACK' })
        }, ctx.fallbackDelayMs)
        return () => clearTimeout(timer)
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

interface AvatarPartProps {
  'data-scope': string
  'data-part': string
  'data-state'?: string
  src?: string
  alt?: string
  hidden?: boolean
  style?: Record<string, string>
  onLoad?: () => void
  onError?: () => void
}

export function connectAvatar(
  state: {
    value: AvatarSchema['state']
    context: AvatarSchema['context']
    computed: Record<string, unknown>
  },
  send: (event: AvatarSchema['event']) => void,
) {
  const { value: stateValue, context: ctx, computed } = state
  const showImage = computed['showImage'] as boolean
  const showFallback = computed['showFallback'] as boolean
  const initials = computed['initials'] as string

  return {
    getRootProps(): AvatarPartProps {
      return {
        ...avatarAnatomy.getPartAttrs('root'),
        'data-state': stateValue,
      }
    },

    getImageProps(src = ctx.src): AvatarPartProps {
      return {
        ...avatarAnatomy.getPartAttrs('image'),
        src,
        alt: ctx.name,
        hidden: !showImage,
        'data-state': stateValue,
        onLoad: () => send({ type: 'IMG_LOAD', src }),
        onError: () => send({ type: 'IMG_ERROR', src }),
      }
    },

    getFallbackProps(): AvatarPartProps & { children?: string } {
      return {
        ...avatarAnatomy.getPartAttrs('fallback'),
        hidden: !showFallback,
        'data-state': stateValue,
        children: initials,
      }
    },

    /** Imperative helpers */
    setSrc(src: string) {
      send({ type: 'SRC_CHANGE', src })
    },

    /** Computed accessors */
    showImage,
    showFallback,
    initials,
    isLoading: stateValue === 'loading',
    isLoaded: stateValue === 'loaded',
    isError: stateValue === 'error',
  }
}
