import { Button, ButtonGroup } from '../../../index'

export const logicalButtonIcon = <Button icon="search" iconPosition="start" />
// @ts-expect-error Icon position follows reading direction; physical aliases were removed.
export const physicalButtonIcon = <Button iconPosition="left" />

export const disclosure = (
  <Button chevron="end" aria-expanded>Details</Button>
)
export const group = (
  <ButtonGroup aria-label="Formatting">
    <Button>Bold</Button>
  </ButtonGroup>
)
// @ts-expect-error A single chevron direction replaces the competing selector flags.
export const buttonSelector = <Button selector />
// @ts-expect-error Expanded state uses the native ARIA attribute.
export const buttonSelectorOpen = <Button selectorOpen />
// @ts-expect-error Direction belongs to chevron.
export const buttonSelectorDirection = <Button selectorDirection="side" />
// @ts-expect-error A button has no checked input default.
export const buttonDefaultChecked = <Button defaultChecked />
export const nested = <Button indent={2} meta="⌘K" align="start">Open</Button>
// @ts-expect-error Content is children; the text prop was removed.
export const buttonText = <Button text="Save" />
// @ts-expect-error Secondary text is meta.
export const buttonRightText = <Button rightText="⌘S" />
// @ts-expect-error Nesting is indent; level belongs to Toc.
export const buttonLevel = <Button level={1} />
// @ts-expect-error The side chevron points to the inline end.
export const buttonChevronRight = <Button chevron="right" />
// @ts-expect-error Alignment follows reading direction: start, center or end.
export const buttonAlignLeft = <Button align="left" />
