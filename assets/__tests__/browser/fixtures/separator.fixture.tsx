import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Bar, Button, Card, Input, Separator, Text, type SeparatorProps } from '../../../../index'

/**
 * Where separators are authored. `card` is the engine's settings and
 * list-detail patterns (a heading, a separator, then fields); `toolbar` is a
 * divider between buttons in a Bar; `row` and `flow` are plain flex and
 * block containers that set no geometry of their own.
 */
const layouts = {
  card: (subject: ReactNode) => (
    <Card data-testid="frame">
      <Text>Profile</Text>
      {subject}
      <Input label="Display name" />
    </Card>
  ),
  toolbar: (subject: ReactNode) => (
    <Bar data-testid="frame">
      <Button>Bold</Button>
      {subject}
      <Button>Italic</Button>
    </Bar>
  ),
  row: (subject: ReactNode) => (
    <div data-testid="frame" style={{ display: 'flex', height: 48, alignItems: 'center' }}>
      <span>Start</span>
      {subject}
      <span>End</span>
    </div>
  ),
  flow: (subject: ReactNode) => <div data-testid="frame">{subject}</div>,
}
export type Layout = keyof typeof layouts

const root = createRoot(document.getElementById('root')!)
/** Mounts a Separator with `props` inside `layout`, in a 360px column. */
const renderSeparator = (
  props: SeparatorProps,
  layout: Layout = 'flow',
  direction: 'ltr' | 'rtl' = 'ltr',
) => {
  document.documentElement.dir = direction
  flushSync(() =>
    root.render(
      <StrictMode>
        <main style={{ width: 360, padding: 16 }}>
          {layouts[layout](<Separator data-testid="subject" {...props} />)}
        </main>
      </StrictMode>,
    ),
  )
}
Object.assign(window, { renderSeparator })
export type Hooks = { renderSeparator: typeof renderSeparator }
renderSeparator({})
