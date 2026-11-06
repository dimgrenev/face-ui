import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import {
  Navigation,
  type NavigationItem,
  type NavigationProps,
} from '../../../../Navigation/Navigation'
import { Panel, type PanelItem, type PanelProps } from '../../../../Panel/Panel'

const root = createRoot(document.getElementById('root')!)
Object.assign(document.body.style, {
  margin: '0',
  background: 'var(--uf-color-bg)',
  color: 'var(--uf-color-fg)',
})
const events: unknown[] = []
Object.assign(window, { navigationEvents: events })

const navigationItems: NavigationItem[] = [
  { value: 'home', label: 'Home', href: '#home' },
  {
    value: 'products',
    label: 'Products',
    items: [
      { value: 'fonts', label: 'Fonts', href: '#fonts' },
      { value: 'retired', label: 'Retired', href: '#retired', disabled: true },
      {
        type: 'group',
        label: 'Services',
        items: [
          { value: 'hosting', label: 'Hosting', href: '#hosting' },
          { value: 'support', label: 'Support' },
        ],
      },
    ],
  },
  { value: 'off', label: 'Unavailable', disabled: true },
  { value: 'docs', label: 'Docs' },
  { value: 'about', label: 'About', items: [{ value: 'team', label: 'Team', href: '#team' }] },
]
const panelItems: PanelItem[] = [
  { value: 'overview', label: 'Overview', icon: 'home', href: '#overview' },
  {
    value: 'settings',
    label: 'Settings',
    icon: 'settings',
    items: [
      { value: 'profile', label: 'Profile', href: '#profile' },
      { value: 'billing', label: 'Billing' },
    ],
  },
  { value: 'files', label: 'Files', icon: 'folder' },
]

type Layout = { dir?: 'ltr' | 'rtl' }
type NavigationOptions = Omit<NavigationProps, 'items' | 'onValueChange' | 'onOpenChange'>
type PanelOptions = Omit<PanelProps, 'items' | 'onValueChange' | 'onOpenChange' | 'onExpandedChange'>

let generation = 0
/** Every render mounts afresh, so no state carries over between calls. */
const page = (layout: Layout, children: ReactNode) =>
  flushSync(() =>
    root.render(
      <StrictMode>
        <div key={generation++} dir={layout.dir ?? 'ltr'} style={{ minHeight: '100vh' }}>
          {/* Text fields: WebKit's Tab skips buttons and links by default. */}
          <input id="before" aria-label="Before" />
          {children}
          <input id="after" aria-label="After" />
        </div>
      </StrictMode>,
    ),
  )

function renderNavigation(props: NavigationOptions = {}, layout: Layout = {}) {
  events.length = 0
  page(
    layout,
    <header style={{ display: 'flex', justifyContent: 'center', padding: 8 }}>
      <Navigation
        aria-label="Main"
        surface="inline"
        items={navigationItems}
        {...props}
        onValueChange={(details) => events.push(details)}
        onOpenChange={(details) => events.push(details)}
      />
    </header>,
  )
}

function renderPanel(props: PanelOptions = {}, layout: Layout = {}) {
  events.length = 0
  page(
    layout,
    <div style={{ display: 'flex', height: 480 }}>
      <Panel
        aria-label="Workspace"
        surface="inline"
        items={panelItems}
        defaultExpanded={[]}
        {...props}
        onValueChange={(details) => events.push(details)}
        onOpenChange={(details) => events.push(details)}
        onExpandedChange={(details) => events.push(details)}
      />
      <main style={{ flex: 1 }}>Content</main>
    </div>,
  )
}

Object.assign(window, { renderNavigation, renderPanel })
export type Hooks = {
  renderNavigation: typeof renderNavigation
  renderPanel: typeof renderPanel
}
renderNavigation()
