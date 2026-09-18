import { Checkbox } from '../../../index'

export const checkboxNative = <Checkbox checked="indeterminate" defaultChecked={false} name="permission" value="edit" form="settings" required autoFocus fullWidth aria-label="Permission" onChange={event=>{event.currentTarget.checked}} ref={node=>{node?.focus()}} />
// @ts-expect-error Checkbox owns the input type.
export const checkboxType = <Checkbox type="radio" />
// @ts-expect-error Selection comes from checked, not a native text default.
export const checkboxDefaultValue = <Checkbox defaultValue="yes" />
// @ts-expect-error readOnly has no native meaning for a checkbox; disabled prevents activation.
export const checkboxReadOnly = <Checkbox readOnly />
// @ts-expect-error Native text validation does not apply to checkboxes.
export const checkboxPattern = <Checkbox pattern=".*" />
// @ts-expect-error The label slot owns visible content.
export const checkboxChildren = <Checkbox>Choice</Checkbox>
// @ts-expect-error Checkbox preserves its native checkbox role.
export const checkboxRole = <Checkbox role="switch" />
