import { Radio, type RadioItem } from '../../../index'

const radioItems: readonly RadioItem[] = [{value:'',label:<strong>Default</strong>,id:'default-choice','aria-describedby':'choice-help'}]
export const radioNativeProps = <Radio items={radioItems} value={null} name="plan" required form="settings" aria-label="Plan" style={{width:320}} ref={node=>{node?.focus()}} />
export const radioField = <Radio items={radioItems} label="Plan" description="Billed monthly" error={<em>Required</em>} labelPosition="start" />
export const unnamedRadio = <Radio items={radioItems} />
// @ts-expect-error Native radio group validation requires a submission name.
export const unnamedRequiredRadio = <Radio required />
// @ts-expect-error Items are the group's content; arbitrary children are not rendered.
export const radioChildren = <Radio>Plan</Radio>
// @ts-expect-error `options` is now `items`.
export const radioOptions = <Radio options={radioItems} />
// @ts-expect-error Items have no icon slot; the indicator takes the start.
export const radioItemIcon = <Radio items={[{ value: 'a', label: 'A', icon: 'x' }]} />
// @ts-expect-error The label sits above or at the inline start of the list.
export const radioLabelSide = <Radio label="Plan" labelPosition="left" />
// @ts-expect-error Accessible names use native attributes.
export const radioAriaAlias = <Radio ariaLabel="Plan" />
// @ts-expect-error External headings use native aria-labelledby.
export const radioLabelledByAlias = <Radio ariaLabelledBy="plan-heading" />
// @ts-expect-error Selection belongs to value/defaultValue, not a group checked flag.
export const radioDefaultChecked = <Radio defaultChecked />
// @ts-expect-error The radiogroup role is part of the component's semantics.
export const radioRole = <Radio role="listbox" />
