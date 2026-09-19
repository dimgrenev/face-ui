import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Tree, type TreeItem, type TreeProps } from '../../../../Tree/Tree'

const root = createRoot(document.getElementById('root')!)
Object.assign(document.body.style, {
  margin: '16px',
  background: 'var(--uf-color-bg)',
  color: 'var(--uf-color-fg)',
})
const events: unknown[] = []
// Every render mounts a fresh tree, so its default* props apply.
let generation = 0

// src ─┬─ components ─┬─ button
//      │              └─ tile
//      └─ index
// assets ── logo
// docs (disabled) ── guide
// new-file, new-folder, readme
const items: TreeItem[] = [
  {
    value: 'src',
    label: 'src',
    icon: 'folder',
    items: [
      {
        value: 'components',
        label: 'components',
        icon: 'folder',
        items: [
          { value: 'button', label: 'Button.tsx', icon: 'file' },
          { value: 'tile', label: 'Tile.tsx', icon: 'file' },
        ],
      },
      { value: 'index', label: 'index.ts', icon: 'file', meta: '3' },
    ],
  },
  {
    value: 'assets',
    label: 'assets',
    icon: 'folder',
    items: [{ value: 'logo', label: 'logo.svg', icon: 'file' }],
  },
  {
    value: 'docs',
    label: 'docs',
    icon: 'folder',
    disabled: true,
    items: [{ value: 'guide', label: 'guide.md', icon: 'file' }],
  },
  { value: 'new-file', label: 'New file', icon: 'file' },
  { value: 'new-folder', label: 'New folder', icon: 'folder' },
  { value: 'readme', label: 'README.md', icon: 'file' },
]

type Props = Omit<TreeProps, 'items' | 'onValueChange' | 'onExpandedChange' | 'renderNode'>

function renderTree(props: Props = {}) {
  events.length = 0
  flushSync(() =>
    root.render(
      <StrictMode>
        {/* Text fields: WebKit's Tab reaches them without Option. */}
        <input id="before" aria-label="Before" />
        <div key={++generation} style={{ width: 320 }}>
          <Tree
            aria-label="Files"
            items={items}
            {...props}
            onValueChange={(details) => events.push(details)}
            onExpandedChange={(details) => events.push(details)}
          />
        </div>
        <input id="after" aria-label="After" />
      </StrictMode>,
    ),
  )
}

export type Hooks = { renderTree: typeof renderTree }
Object.assign(window, { renderTree, treeEvents: events })
renderTree()
