import { Select, type SelectOption } from '../../../Select/Select'

// Select's mode owns the shape of its values and callbacks.
const selectOptions: readonly SelectOption[] = [{ value: '', label: <strong>Default</strong>, textValue: 'Default' }]
export const singleSelect = <Select options={selectOptions} value={null} onValueChange={({value})=>{const single: string | null = value; return single}} ref={node=>{const button: HTMLButtonElement | null = node; button?.focus()}} aria-label="Plan" open={false} defaultOpen name="plan" required />
export const multipleSelect = <Select multiple options={selectOptions} value={['a'] as const} onValueChange={({value})=>{const items: readonly string[] = value; return items}} />
// @ts-expect-error A single select cannot receive an array.
export const singleSelectArray = <Select value={['a']} />
// @ts-expect-error Multiple selection requires an array, including for defaults.
export const multipleSelectString = <Select multiple defaultValue="a" />
// @ts-expect-error The empty multiple value is [], not null.
export const multipleSelectNull = <Select multiple value={null} />
// @ts-expect-error Use multiple for selection mode.
export const legacySelectType = <Select type="multiselect" />
// @ts-expect-error Use surface or iconOnly for their respective concerns.
export const legacySelectVariant = <Select variant="side" />
// @ts-expect-error Use the native accessible name.
export const legacySelectName = <Select ariaLabel="Plan" />
// @ts-expect-error Select owns its combobox semantics.
export const wrongSelectRole = <Select role="menu" />
// @ts-expect-error Selection changes are onValueChange; trigger onChange has no selection semantics.
export const wrongSelectChange = <Select onChange={()=>{}} />
// @ts-expect-error Content belongs to options and displayValue.
export const selectChildren = <Select>Plan</Select>

// @ts-expect-error The required prop owns both native validation and ARIA state.
export const redundantSelectRequired: import('../../../Select/Select').SelectProps = { 'aria-required': true }
// @ts-expect-error The popup is owned by Select, not the native Popover API.
export const competingSelectPopup = <Select popoverTarget="another-popup" />
