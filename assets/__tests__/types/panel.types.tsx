import type { MouseEvent } from 'react'
import { Panel, type PanelItem, type PanelLabels } from '../../../Panel/Panel'

const items: readonly PanelItem[] = [
  { value: 'home', label: 'Home', icon: 'home', href: '/' },
  {
    value: 'settings',
    label: <span>Settings</span>,
    icon: 'settings',
    items: [
      { value: 'profile', label: 'Profile', onClick: (event: MouseEvent<HTMLElement>) => event.preventDefault() },
      { value: 'billing', label: 'Billing', disabled: true, items: [{ value: 'invoices', label: 'Invoices' }] },
    ],
  },
]
export const panel = (
  <Panel
    items={items}
    value={null}
    defaultValue="home"
    onValueChange={({ value }) => {
      const key: string = value
      return key
    }}
    expanded={['settings']}
    defaultExpanded={[]}
    onExpandedChange={({ expanded }) => {
      const keys: string[] = expanded
      return keys
    }}
    collapsed={false}
    defaultCollapsed
    onCollapsedChange={({ collapsed }) => collapsed}
    collapsible={false}
    width="100%"
    collapsedWidth={60}
    surface="sheet"
    open
    defaultOpen={false}
    onOpenChange={({ open }) => open}
    trigger="Sections"
    aria-label="Sections"
    labels={{ expand: 'Expand' }}
    ref={(node) => {
      const nav: HTMLElement | null = node
      nav?.focus()
    }}
    style={{ height: 400 }}
  />
)
const all: PanelLabels = { open: 'Open', close: 'Close', expand: 'Expand', collapse: 'Collapse' }
export const panelLabels = <Panel labels={all} />

// @ts-expect-error The current row is value; selectedId was renamed.
export const legacySelected = <Panel selectedId="home" />
// @ts-expect-error The payload is { value }.
export const legacyPayload = <Panel onValueChange={({ selectedId }) => selectedId} />
// @ts-expect-error Items are keyed by value.
export const legacyItemId = <Panel items={[{ id: 'home', label: 'Home' }]} />
// @ts-expect-error surface="auto" switches at one 900px boundary.
export const legacyBreakpoint = <Panel surfaceBreakpoint={700} />
// @ts-expect-error The sheet is titled by aria-label.
export const legacyTitle = <Panel surfaceTitle="Workspace" />
// @ts-expect-error Groups expand by value, a list of strings.
export const wrongExpanded = <Panel expanded="settings" />
// @ts-expect-error Panel owns its navigation role.
export const wrongRole = <Panel role="complementary" />
// @ts-expect-error The alias lives in the compat barrel.
export type LegacySidebar = import('../../../Panel/Panel').SidebarProps
// @ts-expect-error Panel has no typeahead, so items take no textValue; a rail keeps the label as the name.
export const itemTextValue = <Panel items={[{ value: 'a', label: 'A', textValue: 'A' }]} />
