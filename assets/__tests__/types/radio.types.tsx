import { Radio, type RadioOption } from '../../../index'

const radioOptions: readonly RadioOption[] = [{value:'',label:<strong>Default</strong>,id:'default-choice','aria-describedby':'choice-help'}]
export const radioNativeProps = <Radio options={radioOptions} value={null} name="plan" required form="settings" aria-label="Plan" style={{width:320}} ref={node=>{node?.focus()}} />
export const unnamedRadio = <Radio options={radioOptions} />
// @ts-expect-error Native radio group validation requires a submission name.
export const unnamedRequiredRadio = <Radio required />
// @ts-expect-error Group content comes from options; arbitrary children are not rendered.
export const radioChildren = <Radio>Plan</Radio>
// @ts-expect-error Accessible names use native attributes.
export const radioAriaAlias = <Radio ariaLabel="Plan" />
// @ts-expect-error External headings use native aria-labelledby.
export const radioLabelledByAlias = <Radio ariaLabelledBy="plan-heading" />
// @ts-expect-error Selection belongs to value/defaultValue, not a group checked flag.
export const radioDefaultChecked = <Radio defaultChecked />
// @ts-expect-error The radiogroup role is part of the component's semantics.
export const radioRole = <Radio role="listbox" />
