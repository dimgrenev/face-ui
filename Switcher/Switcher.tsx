/**
 * Switcher — binary toggle control with thumb animation.
 *
 * `<Switcher label="Dark mode" />`
 * `<Switcher checked disabled />`
 * `<Switcher text="Accept terms" withText />`
 * `<Switcher text="Long description..." withText textWrap="wrap" />`
 */

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { switcherMachine, connectSwitcher } from '../assets/machines/switcher.machine'
import { cn } from '../assets/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SwitcherTextWrap = 'truncate' | 'wrap'

export interface SwitcherProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Checked state (controlled). */
  checked?: boolean
  /** Initial checked state (uncontrolled). */
  defaultChecked?: boolean
  /** Disabled state. */
  disabled?: boolean
  /** Mark as required. */
  required?: boolean
  /** Form field name. */
  name?: string
  /** Hidden input value when checked. */
  value?: string
  /** Label content (ReactNode). */
  label?: ReactNode
  /** Text content (string shorthand, used when `withText` is true). */
  text?: string
  /** Show text label alongside the switch. */
  withText?: boolean
  /** Label text overflow: 'truncate' clips with ellipsis, 'wrap' wraps full text. */
  textWrap?: SwitcherTextWrap
  /** Callback when checked state changes. */
  onCheckedChange?: (details: { checked: boolean }) => void
  /** Legacy callback alias that receives the plain checked state. */
  onChange?: (checked: boolean) => void
  /** Additional CSS class. */
  className?: string
  /** Outer membrane wrapper (+1px outside control geometry). */
  membrane?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Switcher = forwardRef<HTMLDivElement, SwitcherProps>(
  function Switcher(props, ref) {
    const {
      checked,
      defaultChecked,
      disabled = false,
      required = false,
      name = '',
      value = 'on',
      label,
      text,
      withText = true,
      textWrap = 'truncate',
      onCheckedChange,
      onChange,
      className,
      membrane = true,
      ...rest
    } = props

    const resolvedChecked = useControllableMachineProp(
      checked !== undefined ? checked : undefined,
      defaultChecked ?? false,
    )

    const { state, send } = useMachine(switcherMachine, {
      checked: resolvedChecked,
      disabled,
      required,
      name,
      value,
      onCheckedChange: ((details: { checked: boolean }) => {
        try { onCheckedChange?.(details) } catch {}
        try { onChange?.(details.checked) } catch {}
      }) as any,
    })

    const api = connectSwitcher(state, send)

    // Determine label content: explicit `label` prop takes priority, then `text` when `withText`
    const labelContent = label ?? (withText && text ? text : null)
    const hasLabel = labelContent != null
    const switchOnly = !hasLabel

    const rootNode = (
      <div
        ref={ref}
        {...api.getRootProps()}
        {...rest}
        data-switch-only={switchOnly || undefined}
        data-text-wrap={textWrap === 'wrap' || undefined}
        className={cn('uf-switcher', className)}
      >
        {hasLabel && (
          <label {...api.getLabelProps()}>
            {labelContent}
          </label>
        )}
        <div {...api.getControlProps()}>
          <span {...api.getThumbProps()} />
        </div>
        <input {...api.getHiddenInputProps()} />
      </div>
    )

    if (!membrane) return rootNode
    return <span className="uf-membrane uf-membrane--full">{rootNode}</span>
  },
)
