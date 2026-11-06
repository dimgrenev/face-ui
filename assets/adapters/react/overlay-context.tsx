import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export interface FaceUiOverlayProviderProps {
  children: ReactNode
  /** `undefined` uses the scope root when present, otherwise document.body; `null` waits for a host-owned target. */
  portalContainer?: HTMLElement | null
  /** The instance boundary for modal inertness and focused-layer routing. */
  scopeRoot?: HTMLElement | null
}

interface OverlayBoundary {
  scope: object | undefined
  portalContainer: HTMLElement | null | undefined
  scopeRoot: HTMLElement | null | undefined
}

const Context = createContext<OverlayBoundary | null>(null)

/** Gives a mounted UI instance its own portals and interaction stack. */
export function FaceUiOverlayProvider({
  children,
  portalContainer,
  scopeRoot,
}: FaceUiOverlayProviderProps) {
  const parent = useContext(Context)
  const [ownedScope] = useState(() => ({}))
  const value = useMemo<OverlayBoundary>(() => ({
    // A portal target alone does not establish an interaction boundary. Without
    // a root, keep the document-wide modal stack (or an inherited boundary).
    scope: scopeRoot ? ownedScope : parent?.scope,
    portalContainer: portalContainer === undefined ? parent?.portalContainer : portalContainer,
    scopeRoot: scopeRoot ?? parent?.scopeRoot,
  }), [parent, ownedScope, portalContainer, scopeRoot])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

/** Internal bridge shared by portal and layer hooks. */
export function useFaceUiOverlayBoundary(): OverlayBoundary | null {
  return useContext(Context)
}
