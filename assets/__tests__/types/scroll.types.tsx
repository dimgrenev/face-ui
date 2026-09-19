import { createRef } from 'react'
import { Scroll } from '../../../index'

const viewport = createRef<HTMLDivElement>()
export const scroll = (
  <Scroll
    ref={viewport}
    orientation="both"
    height="50vh"
    aria-label="Build log"
    aria-labelledby="log-heading"
    id="log"
    tabIndex={-1}
    onScroll={(event) => event.currentTarget.scrollTop}
    className="log"
    style={{ maxHeight: 240 }}
  >
    rows
  </Scroll>
)
export const scrollNumberHeight = <Scroll height={240}>{42}</Scroll>
// @ts-expect-error The region is named by the native aria-label.
export const scrollAriaLabel = <Scroll ariaLabel="Build log">rows</Scroll>
// @ts-expect-error The component owns the role.
export const scrollRole = <Scroll role="log">rows</Scroll>
// @ts-expect-error Only vertical, horizontal or both.
export const scrollOrientation = <Scroll orientation="diagonal">rows</Scroll>
