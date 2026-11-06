import type { MouseEvent } from 'react'
import {
  Navigation,
  type NavigationEntry,
  type NavigationItem,
  type NavigationLabels,
} from '../../../Navigation/Navigation'

// Bar items: links, actions and dropdowns of links and labelled groups.
const entries: readonly NavigationEntry[] = [
  { value: 'fonts', label: 'Fonts', href: '/fonts', icon: 'type' },
  { type: 'group', label: <strong>Services</strong>, items: [{ value: 'hosting', label: 'Hosting' }] },
]
const items: readonly NavigationItem[] = [
  { value: 'home', label: 'Home', href: '/', disabled: false },
  { value: 'docs', label: <em>Docs</em>, onClick: (event: MouseEvent<HTMLElement>) => event.preventDefault() },
  { value: 'products', label: 'Products', items: entries },
]
export const navigation = (
  <Navigation
    items={items}
    value={null}
    defaultValue="home"
    onValueChange={({ value }) => {
      const key: string = value
      return key
    }}
    surface="auto"
    open={false}
    defaultOpen
    onOpenChange={({ open }) => open}
    trigger={<button type="button">Menu</button>}
    aria-label="Main"
    labels={{ open: 'Menu' }}
    ref={(node) => {
      const nav: HTMLElement | null = node
      nav?.focus()
    }}
    id="site"
    onKeyDown={(event) => event.key}
  />
)
const both: NavigationLabels = { open: 'Menü', close: 'Schließen' }
export const navigationLabels = <Navigation labels={both} />

// @ts-expect-error The current item is value; activeId was renamed.
export const legacyActiveId = <Navigation activeId="home" />
// @ts-expect-error The payload is { value }.
export const legacyPayload = <Navigation onValueChange={({ id }) => id} />
// @ts-expect-error Items are keyed by value.
export const legacyItemId = <Navigation items={[{ id: 'home', label: 'Home' }]} />
// @ts-expect-error The bar is horizontal; vertical navigation is Panel.
export const legacyOrientation = <Navigation orientation="vertical" />
// @ts-expect-error surface="auto" switches at one 900px boundary.
export const legacyBreakpoint = <Navigation surfaceBreakpoint={700} />
// @ts-expect-error The sheet is titled by aria-label.
export const legacyTitle = <Navigation surfaceTitle="Navigate" />
// @ts-expect-error Navigation owns its navigation role.
export const wrongRole = <Navigation role="menubar" />
// @ts-expect-error A dropdown link cannot open a dropdown of its own.
export const nestedDropdown = <Navigation items={[{ value: 'a', label: 'A', items: [{ value: 'b', label: 'B', items: [] }] }]} />
// @ts-expect-error Navigation has no typeahead, so items take no textValue.
export const itemTextValue = <Navigation items={[{ value: 'a', label: 'A', textValue: 'A' }]} />
// @ts-expect-error Only the component's own strings are labels.
export const unknownLabel = <Navigation labels={{ title: 'Main' }} />
