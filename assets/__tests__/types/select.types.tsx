import { Select, type SelectItem, type SelectLabels } from '../../../Select/Select'

// Select's mode owns the shape of its values and callbacks.
const selectItems: readonly SelectItem[] = [{ value: '', label: <strong>Default</strong>, textValue: 'Default' }]
export const singleSelect = <Select items={selectItems} value={null} onValueChange={({value})=>{const single: string | null = value; return single}} ref={node=>{const button: HTMLButtonElement | null = node; button?.focus()}} aria-label="Plan" open={false} defaultOpen name="plan" required />
// The payload is a fresh, mutable array.
export const multipleSelect = <Select multiple items={selectItems} value={['a'] as const} onValueChange={({value})=>{const items: string[] = value; items.push('b'); return items}} />
export const selectField = <Select items={selectItems} label="Plan" description="Billed monthly" error={<em>Required</em>} labelPosition="start" />
const closeOnly: SelectLabels = { close: 'Fermer' }
export const selectLabels = <Select items={selectItems} aria-label="Plan" labels={closeOnly} />
export const selectPartialLabels = <Select items={selectItems} aria-label="Plan" labels={{}} />
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
// @ts-expect-error `options` is now `items`.
export const legacySelectOptions = <Select options={selectItems} />
// @ts-expect-error The close button's name lives in labels.close.
export const legacySelectCloseLabel = <Select closeLabel="Close" />
// @ts-expect-error The sheet is titled by label or aria-label.
export const legacySelectSurfaceTitle = <Select surfaceTitle="Plan" />
// @ts-expect-error surface="auto" switches at one 900px boundary.
export const legacySelectBreakpoint = <Select surfaceBreakpoint={700} />
// @ts-expect-error The label sits above or at the inline start of the trigger.
export const legacySelectOrientation = <Select labelOrientation="horizontal" />
// @ts-expect-error Items have no icon slot.
export const selectItemIcon = <Select items={[{ value: 'a', label: 'A', icon: 'x' }]} />
// @ts-expect-error Select owns its combobox semantics.
export const wrongSelectRole = <Select role="menu" />
// @ts-expect-error Selection changes are onValueChange; trigger onChange has no selection semantics.
export const wrongSelectChange = <Select onChange={()=>{}} />
// @ts-expect-error Content belongs to items and displayValue.
export const selectChildren = <Select>Plan</Select>

// @ts-expect-error The required prop owns both native validation and ARIA state.
export const redundantSelectRequired: import('../../../Select/Select').SelectProps = { 'aria-required': true }
// @ts-expect-error The popup is owned by Select, not the native Popover API.
export const competingSelectPopup = <Select popoverTarget="another-popup" />
