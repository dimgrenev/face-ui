import { createRef } from 'react'
import { Skeleton } from '../../../index'

export const line = <Skeleton />
export const lastLine = <Skeleton width="60%" />
export const block = <Skeleton shape="rect" height={160} />
export const avatar = <Skeleton shape="circle" width={40} />
export const native = (
  <Skeleton ref={createRef<HTMLDivElement>()} id="loading-title" className="title" style={{ marginBlock: 4 }} />
)
// @ts-expect-error variant is now shape.
export const variant = <Skeleton variant="circle" />
// @ts-expect-error A skeleton is a line of text, a block or a circle.
export const square = <Skeleton shape="square" />
// @ts-expect-error A placeholder has no content; it stands in for it.
export const children = <Skeleton>Loading</Skeleton>
// @ts-expect-error A placeholder has no content; it stands in for it.
export const html = <Skeleton dangerouslySetInnerHTML={{ __html: 'Loading' }} />
// @ts-expect-error A placeholder holds no value.
export const value = <Skeleton defaultValue="x" />
