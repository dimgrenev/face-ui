/**
 * Switcher — binary toggle control with thumb animation.
 *
 * `<Switcher label="Dark mode" />`
 * `<Switcher checked disabled />`
 * `<Switcher text="Accept terms" withText />`
 * `<Switcher text="Long description..." withText textWrap="wrap" />`
 */

import { forwardRef, useEffect, useId, useMemo, useRef, type HTMLAttributes, type ReactNode } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { switcherMachine, connectSwitcher } from '../assets/machines/switcher.machine'
import type { SwitcherSchema } from '../assets/machines/switcher.machine'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'

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
  /** Additional CSS class. */
  className?: string
  /** Outer membrane wrapper around control geometry. */
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
      className,
      membrane = true,
      ...rest
    } = props

    const isControlled = checked !== undefined
    const initialCheckedRef = useRef(Boolean(checked ?? defaultChecked ?? false))
    const switcherMachineConfig = useMemo(() => ({
      ...switcherMachine,
      initial: initialCheckedRef.current ? 'checked' : 'unchecked',
      context: {
        ...switcherMachine.context,
        checked: initialCheckedRef.current,
      },
    } as typeof switcherMachine), [])

    const { state, send } = useMachine<SwitcherSchema>(switcherMachineConfig, {
      disabled,
      required,
      name,
      value,
      onCheckedChange: ((details: { checked: boolean }) => {
        if (isControlled && details.checked === checked) return
        onCheckedChange?.(details)
      }) as any,
    })

    useEffect(() => {
      if (checked === undefined) return
      const nextChecked = Boolean(checked)
      if (state.context.checked === nextChecked) return
      send({ type: 'SET', checked: nextChecked })
    }, [checked, send, state.context.checked])

    const api = connectSwitcher(state, send)
    const rootProps = { ...(api.getRootProps() as any) }
    const labelProps = { ...(api.getLabelProps() as any) }
    const controlProps = { ...(api.getControlProps() as any) }
    const hiddenInputProps = { ...(api.getHiddenInputProps() as any) }
    delete labelProps.onClick
    delete controlProps.onClick
    delete hiddenInputProps.onChange
    const generatedLabelId = useId()

    // Determine label content: explicit `label` prop takes priority, then `text` when `withText`
    const labelContent = label ?? (withText && text ? text : null)
    const hasLabel = labelContent != null
    const labelId = hasLabel ? `${generatedLabelId}-label` : undefined
    const switchOnly = !hasLabel

    const rootNode = (
      <div
        ref={ref}
        {...rootProps}
        {...rest}
        data-switch-only={switchOnly || undefined}
        data-text-wrap={textWrap === 'wrap' || undefined}
        className={cn('uf-switcher', className)}
        onClick={(event) => {
          const target = event.target as HTMLElement | null
          if (target?.tagName === 'INPUT') return
          send({ type: 'TOGGLE' })
        }}
      >
        {hasLabel && (
          <label {...labelProps} id={labelId}>
            <Text as="span" variant="body" inset="none" membrane={false}>
              {labelContent}
            </Text>
          </label>
        )}
        <div {...controlProps} aria-labelledby={labelId}>
          <span {...api.getThumbProps()} />
        </div>
        <input
          {...hiddenInputProps}
          readOnly
          onClick={(event) => {
            event.preventDefault()
          }}
        />
      </div>
    )

    if (!membrane) return rootNode
    return <span className="uf-membrane uf-membrane--full">{rootNode}</span>
  },
)
