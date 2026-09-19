import {
  Command,
  type CommandItem,
  type CommandItemEntry,
  type CommandLabels,
} from '../../../Command/Command'

// Commands and labelled groups; a group heading may be rich content.
const commandItems: readonly CommandItemEntry[] = [
  { value: 'copy', label: 'Copy', icon: 'copy', keywords: ['duplicate'] },
  { type: 'group', label: <strong>Danger</strong>, items: [{ value: 'delete', label: 'Delete' }] },
]
const one: CommandItem = { value: 'x', label: <em>X</em>, textValue: 'X', disabled: true }
export const command = (
  <Command
    items={[...commandItems, one]}
    search="co"
    defaultSearch=""
    onSearchChange={({ search }) => search.trim()}
    onSelect={({ value }) => {
      const key: string = value
      return key
    }}
    placeholder="Search"
    surface="dialog"
    open={false}
    defaultOpen
    onOpenChange={({ open }) => open}
    aria-label="Commands"
    aria-labelledby="heading"
    aria-describedby="hint"
    className="palette"
    style={{ maxWidth: 480 }}
    id="palette-search"
    autoFocus
    inputMode="search"
    onKeyDown={(event) => event.key}
    ref={(node) => {
      const field: HTMLInputElement | null = node
      field?.focus()
    }}
  />
)
const emptyOnly: CommandLabels = { empty: 'Aucun résultat' }
export const commandLabels = <Command labels={emptyOnly} />
export const commandPartialLabels = <Command labels={{}} />

// @ts-expect-error The search text is search; value was renamed.
export const legacyCommandValue = <Command value="co" />
// @ts-expect-error The search text on mount is defaultSearch.
export const legacyCommandDefaultValue = <Command defaultValue="co" />
// @ts-expect-error Edits are reported by onSearchChange({ search }).
export const legacyCommandValueChange = <Command onValueChange={() => {}} />
// @ts-expect-error surface="auto" switches at one 900px boundary.
export const legacyCommandBreakpoint = <Command surfaceBreakpoint={700} />
// @ts-expect-error The empty text is labels.empty.
export const legacyCommandEmpty = <Command emptyContent="Nothing" />
// @ts-expect-error Groups are group items inside items.
export const legacyCommandGroups = <Command groups={[{ id: 'edit', label: 'Edit' }]} />
// @ts-expect-error Items are keyed by value.
export const legacyCommandItemId = <Command items={[{ id: 'a', label: 'A' }]} />
// @ts-expect-error An item belongs to a group by sitting in its items.
export const legacyCommandItemGroup = <Command items={[{ value: 'a', label: 'A', group: 'edit' }]} />
// @ts-expect-error Items have one activation callback, Command onSelect.
export const legacyCommandItemSelect = <Command items={[{ value: 'a', label: 'A', onSelect: () => {} }]} />
// @ts-expect-error The group type is CommandItemEntry.
export type LegacyCommandGroup = import('../../../Command/Command').CommandGroup
// @ts-expect-error onSelect receives { value }, not the item.
export const legacyCommandSelectItem = <Command onSelect={({ item }) => item} />
// @ts-expect-error Command owns the combobox role.
export const wrongCommandRole = <Command role="searchbox" />
// @ts-expect-error The search is the value triad, not the native change event.
export const wrongCommandChange = <Command onChange={() => {}} />
// @ts-expect-error Only inline, dialog and auto surfaces exist.
export const wrongCommandSurface = <Command surface="popover" />
// @ts-expect-error No separators: groups structure a Command list.
export const wrongCommandSeparator = <Command items={[{ type: 'separator' }]} />
