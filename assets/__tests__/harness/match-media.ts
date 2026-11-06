import { vi } from 'vitest'

interface MatchMediaStub {
  matches: boolean
  listeners: Set<(event: MediaQueryListEvent) => void>
}

export type MatchMediaRestore = (() => void) & {
  setMatches: (matches: boolean) => void
  dispatchChange: () => void
}

/** Stubs `window.matchMedia` with a controllable `matches`; call the result to restore it. */
export function installMatchMedia(matches: boolean): MatchMediaRestore {
  const original = window.matchMedia
  const stub: MatchMediaStub = {
    matches,
    listeners: new Set(),
  }

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: stub.matches,
    media: query,
    onchange: null,
    addEventListener: (
      _event: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => {
      stub.listeners.add(listener)
    },
    removeEventListener: (
      _event: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => {
      stub.listeners.delete(listener)
    },
    addListener: (listener: (event: MediaQueryListEvent) => void) => {
      stub.listeners.add(listener)
    },
    removeListener: (listener: (event: MediaQueryListEvent) => void) => {
      stub.listeners.delete(listener)
    },
    dispatchEvent: () => true,
  }))

  const restore = (() => {
    window.matchMedia = original
  }) as MatchMediaRestore

  restore.setMatches = (nextMatches: boolean) => {
    stub.matches = nextMatches
  }
  restore.dispatchChange = () => {
    const event = { matches: stub.matches } as MediaQueryListEvent
    stub.listeners.forEach((listener) => listener(event))
  }

  return restore
}
