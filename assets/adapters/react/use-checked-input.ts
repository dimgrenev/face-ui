import {
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type ChangeEventHandler,
  type InputHTMLAttributes,
  type Ref,
} from 'react'
import { flushSync } from 'react-dom'
import { useComposedRefs } from './use-composed-refs'
import { useControllableState } from './use-controllable-state'
import { useFormReset } from './use-form-reset'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect'
import { composeHandlers } from './merge-props'

/** Native attributes shared by checkbox-backed boolean controls. */
export type CheckedInputAttributes = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'type'
  | 'checked'
  | 'defaultChecked'
  | 'defaultValue'
  | 'value'
  | 'role'
  | 'aria-checked'
  | 'readOnly'
  | 'placeholder'
  | 'min'
  | 'max'
  | 'step'
  | 'pattern'
  | 'list'
  | 'multiple'
  | 'size'
  | 'height'
  | 'width'
  | 'accept'
  | 'capture'
  | 'src'
  | 'alt'
  | 'minLength'
  | 'maxLength'
  | 'formAction'
  | 'formEncType'
  | 'formMethod'
  | 'formNoValidate'
  | 'formTarget'
>

type Checked = boolean | 'indeterminate'

export interface CheckedInputOptions<T extends Checked> {
  /** Component named in the controlled/uncontrolled switch report. */
  component: string
  /** Controlled state; `undefined` leaves it to the component. */
  checked: T | undefined
  /** Uncontrolled state on mount, restored by form reset. */
  defaultChecked: T
  /** Called once per user activation that proposes a new state. */
  onCheckedChange?: (details: { checked: T }) => void
  /** The consumer's native handler: it runs first and its `preventDefault()` cancels the change. */
  onChange?: ChangeEventHandler<HTMLInputElement>
  /** The consumer's ref to the native input. */
  ref: Ref<HTMLInputElement> | undefined
}

/**
 * The checked state of a native checkbox: `checked`/`defaultChecked`/`onCheckedChange` through
 * useControllableState, with the input's `checked` and `indeterminate` written together after every
 * commit. After each activation the input is written again from the committed state, once the
 * browser has rolled back a canceled click: a refused change never stays on screen, and React's
 * change tracking stays in step with the input.
 */
export function useCheckedInput<T extends Checked>(
  options: CheckedInputOptions<T>,
) {
  const [checked, setChecked, replaceChecked] = useControllableState<T>({
    value: options.checked,
    defaultValue: options.defaultChecked,
    onChange: (next) => options.onCheckedChange?.({ checked: next }),
    name: [options.component, 'checked'],
  })
  const [initial] = useState(checked)
  const [, commit] = useReducer((count: number) => count + 1, 0)
  const input = useRef<HTMLInputElement>(null)
  const shown = useRef(checked)
  const ref = useComposedRefs(input, options.ref)
  const write = () => {
    const node = input.current
    if (!node) return
    node.checked = shown.current === true
    node.indeterminate = shown.current === 'indeterminate'
  }
  useIsomorphicLayoutEffect(() => {
    shown.current = checked
    write()
  })
  // Reset before the next paint, so a controlled input never shows the reset default.
  useFormReset(input, () =>
    flushSync(() => {
      replaceChecked()
      commit()
    }),
  )
  const change = composeHandlers(
    options.onChange,
    (event: ChangeEvent<HTMLInputElement>) =>
      setChecked(event.currentTarget.checked as T),
  )
  return {
    checked,
    /** Spread last onto the native `<input>`. */
    inputProps: {
      ref,
      type: 'checkbox' as const,
      // Server markup and the native reset target; React never rewrites it.
      defaultChecked: initial === true,
      onChange(event: ChangeEvent<HTMLInputElement>) {
        // An earlier click handler canceled the activation: nothing changed.
        if (event.nativeEvent.defaultPrevented) event.stopPropagation()
        else change(event)
        queueMicrotask(write)
      },
    },
  }
}
