import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Avatar, Card, Skeleton, Text, type SkeletonProps } from '../../../../index'

/**
 * Where skeletons stand in for content. `column` is a plain block column;
 * `flow` and `card` put the subject under a Text line that has already loaded,
 * in block flow and in a Card; `avatar` puts it beside a loaded Avatar; `row`
 * is a list row with an avatar placeholder before the subject; `busy` is a
 * card region marked busy while it loads.
 */
const layouts = {
  column: (subject: ReactNode) => <div data-testid="frame">{subject}</div>,
  flow: (subject: ReactNode) => (
    <div data-testid="frame">
      <Text data-testid="text">Profile</Text>
      {subject}
    </div>
  ),
  card: (subject: ReactNode) => (
    <Card data-testid="frame">
      <Text data-testid="text">Profile</Text>
      {subject}
    </Card>
  ),
  avatar: (subject: ReactNode) => (
    <div data-testid="frame" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Avatar name="Ada Lovelace" data-testid="loaded" />
      {subject}
    </div>
  ),
  row: (subject: ReactNode) => (
    <div data-testid="frame" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Skeleton shape="circle" data-testid="avatar" />
      {subject}
    </div>
  ),
  busy: (subject: ReactNode) => (
    <Card data-testid="frame" aria-busy="true">
      <Skeleton shape="circle" />
      {subject}
      <Skeleton width="60%" />
    </Card>
  ),
}
export type Layout = keyof typeof layouts
/** The size scale around the column: the default, `.uf-compact` or `.uf-large`. */
export type Density = 'default' | 'compact' | 'large'

const root = createRoot(document.getElementById('root')!)
/** Mounts a Skeleton with `props` inside `layout`, in a 360px column. */
const renderSkeleton = (props: SkeletonProps, layout: Layout = 'column', density: Density = 'default') => {
  flushSync(() =>
    root.render(
      <StrictMode>
        <main
          data-testid="column"
          className={density === 'default' ? undefined : `uf-${density}`}
          style={{ width: 360, padding: 16 }}
        >
          {layouts[layout](<Skeleton data-testid="subject" {...props} />)}
        </main>
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderSkeleton })
export type Hooks = { renderSkeleton: typeof renderSkeleton }
renderSkeleton({})
