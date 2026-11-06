import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import {
  Command,
  type CommandItemEntry,
  type CommandProps,
} from '../../../../Command/Command'

const root = createRoot(document.getElementById('root')!)
const events: unknown[] = []
// More commands than the list shows at once, so it scrolls.
const items: CommandItemEntry[] = [
  { type: 'group', label: 'Files', items: Array.from({ length: 12 }, (_, index) => ({ value: `file-${index + 1}`, label: `Open file ${index + 1}` })) },
  { value: 'locked', label: 'Locked command', disabled: true },
  { type: 'group', label: 'Views', items: Array.from({ length: 12 }, (_, index) => ({ value: `view-${index + 1}`, label: `Show view ${index + 1}` })) },
]

type Props = Omit<CommandProps, 'items' | 'onSelect' | 'onOpenChange'>

function renderCommand(props: Props = {}) {
  events.length = 0
  flushSync(() =>
    root.render(
      <StrictMode>
        <section style={{ display: 'grid', gap: 16, padding: 16, maxWidth: 480 }}>
          {/* Text fields: WebKit's Tab skips buttons by default. */}
          <input id="before" aria-label="Before" />
          <Command
            aria-label="Commands"
            placeholder="Type a command"
            items={items}
            {...props}
            onSelect={(details) => events.push({ type: 'select', ...details })}
            onOpenChange={(details) => events.push({ type: 'open', ...details })}
          />
          <input id="after" aria-label="After" />
        </section>
      </StrictMode>,
    ),
  )
}

Object.assign(window, { React, commandEvents: events, renderCommand })
export type Hooks = { renderCommand: typeof renderCommand }
