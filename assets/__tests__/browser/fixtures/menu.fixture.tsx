import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Menu, type MenuItemEntry, type MenuProps } from '../../../../Menu/Menu'

const root = createRoot(document.getElementById('root')!)
const events: unknown[] = []
const items: MenuItemEntry[] = [
  { value: 'copy', label: 'Copy', icon: 'copy' },
  { value: 'paste', label: 'Paste', disabled: true },
  { value: 'print', label: 'Print' },
  { value: 'preview', label: 'Preview' },
  { type: 'separator' },
  {
    type: 'group',
    label: 'View',
    items: [
      { value: 'grid', label: 'Snap to grid', checked: true },
      { value: 'rulers', label: 'Rulers', checked: false },
    ],
  },
  { type: 'separator' },
  { value: 'docs', label: 'Documentation', href: '#docs' },
  { value: 'delete', label: 'Delete', tone: 'destructive' },
]

type Props = Omit<MenuProps, 'children' | 'onSelect' | 'onOpenChange' | 'items'>
interface Layout {
  /** Puts the trigger at the bottom edge of the viewport. */
  bottom?: boolean
}

function renderMenu(props: Props = {}, layout: Layout = {}) {
  events.length = 0
  const context = props.openOn === 'context'
  flushSync(() =>
    root.render(
      <StrictMode>
        <section
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            padding: 16,
            ...(layout.bottom ? { position: 'fixed', bottom: 0, left: 0 } : {}),
          }}
        >
          {/* Text fields: WebKit's Tab skips buttons by default. */}
          <input id="before" aria-label="Before" />
          <Menu
            items={items}
            surface="popover"
            {...props}
            onSelect={({ value, event }) =>
              events.push({ type: 'select', value, modified: event.ctrlKey || event.metaKey })
            }
            onOpenChange={(details) => events.push({ type: 'open', ...details })}
          >
            {context ? (
              <div id="canvas" style={{ width: 360, height: 240, background: '#eee' }}>
                Canvas
              </div>
            ) : (
              <button id="trigger" type="button">
                Actions
              </button>
            )}
          </Menu>
          <input id="after" aria-label="After" />
        </section>
      </StrictMode>,
    ),
  )
}

Object.assign(window, { React, menuEvents: events, renderMenu })
export type Hooks = { renderMenu: typeof renderMenu }
