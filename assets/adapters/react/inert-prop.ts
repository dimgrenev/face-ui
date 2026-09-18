import { version, type HTMLAttributes } from 'react'

const booleanInert = Number.parseInt(version, 10) >= 19

/** Props that make an element inert: React 19 receives `inert={true}`, React 18 `inert=""`. */
export function inertProp(on: boolean): HTMLAttributes<HTMLElement> {
  // Cast: React 18's types lack `inert`, React 19's type it as boolean only.
  return on
    ? ({ inert: booleanInert ? true : '' } as HTMLAttributes<HTMLElement>)
    : {}
}
