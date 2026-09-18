import { Switcher } from '../../../Switcher/Switcher'

export const nativeSwitch = <Switcher ref={node => node?.focus()} checked name="sync" value="enabled" form="settings" required autoFocus fullWidth truncate onChange={event => { const input: HTMLInputElement = event.currentTarget; input.checkValidity() }} />
// @ts-expect-error Switcher is a binary setting, not a tri-state summary.
export const mixedSwitch = <Switcher checked="indeterminate" />
// @ts-expect-error One shared truncation prop replaces textWrap.
export const obsoleteSwitchTextWrap = <Switcher textWrap="wrap" />
// @ts-expect-error label owns visible content.
export const switchChildren = <Switcher>Content</Switcher>
// @ts-expect-error native checkbox has no readOnly behavior.
export const switchReadOnly = <Switcher readOnly />
// @ts-expect-error role is owned by the switch component.
export const switchRole = <Switcher role="checkbox" />
// @ts-expect-error defaultChecked owns binary state.
export const switchDefaultValue = <Switcher defaultValue="on" />
