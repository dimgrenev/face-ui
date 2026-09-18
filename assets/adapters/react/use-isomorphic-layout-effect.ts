import { useEffect, useLayoutEffect } from 'react'

/** `useLayoutEffect` in the browser; `useEffect` on the server, where layout effects never run. */
export const useIsomorphicLayoutEffect =
  typeof document !== 'undefined' ? useLayoutEffect : useEffect
