import { Menu, type MenuItem, type MenuItemEntry, type MenuLabels } from '../../../Menu/Menu'

// Items, separators and labelled groups; the group heading may be rich content.
const menuItems: readonly MenuItemEntry[] = [
  { value: 'copy', label: 'Copy', icon: 'copy' },
  { value: 'docs', label: 'Docs', href: '/docs' },
  { value: 'grid', label: 'Grid', checked: true },
  { type: 'separator' },
  { type: 'group', label: <strong>Danger</strong>, items: [{ value: 'delete', label: 'Delete', tone: 'destructive' }] },
]
const one: MenuItem = { value: 'x', label: <em>X</em>, textValue: 'X', disabled: true }
export const menu = (
  <Menu
    items={[...menuItems, one]}
    openOn="context"
    open={false}
    defaultOpen
    onOpenChange={({ open }) => open}
    onSelect={({ value, event }) => {
      const key: string = value
      event.preventDefault()
      return key
    }}
    surface="sheet"
    side="left"
    align="start"
    sideOffset={-2}
    aria-label="Actions"
    ref={(node) => {
      const list: HTMLDivElement | null = node
      list?.focus()
    }}
    id="actions"
    onKeyDown={(event) => event.key}
  >
    <button type="button">Actions</button>
  </Menu>
)
const closeOnly: MenuLabels = { close: 'Fermer' }
export const menuLabels = <Menu labels={closeOnly}>More</Menu>
export const menuPartialLabels = <Menu labels={{}}>More</Menu>

// @ts-expect-error The interaction mode is openOn; trigger was renamed.
export const legacyMenuTrigger = <Menu trigger="context">More</Menu>
// @ts-expect-error The menu is named by the native aria-label.
export const legacyMenuSurfaceTitle = <Menu surfaceTitle="Actions">More</Menu>
// @ts-expect-error surface="auto" switches at one 900px boundary.
export const legacyMenuBreakpoint = <Menu surfaceBreakpoint={700}>More</Menu>
// @ts-expect-error The item type is MenuItem.
export type LegacyMenuItemDef = import('../../../Menu/Menu').MenuItemDef
// @ts-expect-error Separators and groups are part of MenuItemEntry.
export type LegacyMenuGroupDef = import('../../../Menu/Menu').MenuGroupDef
// @ts-expect-error Menu owns its menu role.
export const wrongMenuRole = <Menu role="listbox">More</Menu>
// @ts-expect-error onSelect is the item activation, not the native text selection event.
export const wrongMenuSelect = <Menu onSelect={(event: React.SyntheticEvent) => event}>More</Menu>
// @ts-expect-error Only destructive or neutral tones exist.
export const wrongMenuTone = <Menu items={[{ value: 'a', label: 'A', tone: 'accent' }]}>More</Menu>
// @ts-expect-error Items have one activation callback, Menu onSelect.
export const itemOnSelect = <Menu items={[{ value: 'a', label: 'A', onSelect: () => {} }]}>More</Menu>
// @ts-expect-error No shortcut field: trailing text such as a shortcut belongs in the label.
export const itemShortcut = <Menu items={[{ value: 'a', label: 'A', shortcut: '⌘A' }]}>More</Menu>
