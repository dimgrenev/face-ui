import { Button, ButtonGroup } from '../../../index'

export const logicalButtonIcon = <Button icon="search" iconPosition="start" />
// @ts-expect-error Icon position follows reading direction; physical aliases were removed.
export const physicalButtonIcon = <Button iconPosition="left" />

export const disclosure = (
  <Button text="Details" chevron="right" aria-expanded />
)
export const group = (
  <ButtonGroup aria-label="Formatting">
    <Button text="Bold" />
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
