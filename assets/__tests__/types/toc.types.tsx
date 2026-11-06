import { createRef, type SyntheticEvent } from 'react'
import { Toc } from '../../../index'
import type { TocItem } from '../../../Toc/Toc'

export const tocItems: readonly TocItem[] = Object.freeze([
  { value: 'intro', label: 'Introduction' },
  { value: 'hooks', label: <code>useState</code>, level: 2 },
])
export const tocNative = (
  <Toc
    items={tocItems}
    value={null}
    onValueChange={({ value }) => value.toUpperCase()}
    onSelect={({ value, event }) => (value ? event.preventDefault() : undefined)}
    line="end"
    ref={createRef<HTMLElement>()}
    id="outline"
    dir="rtl"
    className="outline"
    style={{ maxWidth: 240 }}
    aria-labelledby="outline-heading"
    onClick={(event) => event.preventDefault()}
  />
)
export const tocUncontrolled = <Toc items={tocItems} defaultValue="intro" line="none" />
// @ts-expect-error The current entry is value.
export const tocRemovedActiveId = <Toc activeId="intro" />
// @ts-expect-error The initial entry is defaultValue.
export const tocRemovedDefaultActiveId = <Toc defaultActiveId="intro" />
// @ts-expect-error Changes report through onValueChange({ value }).
export const tocRemovedOnActiveChange = <Toc onActiveChange={() => {}} />
// @ts-expect-error The rail is line="none" to hide it.
export const tocRemovedWithLine = <Toc withLine />
// @ts-expect-error The rail side is line="start" | "end".
export const tocRemovedLineSide = <Toc lineSide="left" />
// @ts-expect-error The rail side follows the text direction.
export const tocPhysicalLine = <Toc line="left" />
// @ts-expect-error Entries are keyed by value.
export const tocRemovedItemId: TocItem = { id: 'intro', label: 'Introduction' }
// @ts-expect-error Every section in the document can be reached; an entry cannot be disabled.
export const tocRemovedItemDisabled: TocItem = { value: 'intro', label: 'Introduction', disabled: true }
// @ts-expect-error Entries come from items.
export const tocInvalidChildren = <Toc>custom</Toc>
// @ts-expect-error onSelect reports an entry, not a text selection.
export const tocInvalidNativeSelect = <Toc onSelect={(event: SyntheticEvent) => event} />
// @ts-expect-error A table of contents is not a value field.
export const tocInvalidAutoFocus = <Toc autoFocus />
// @ts-expect-error The ref belongs to the HTML nav.
export const tocInvalidRef = <Toc ref={createRef<SVGSVGElement>()} />
