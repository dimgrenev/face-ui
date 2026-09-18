import {
  useEffect,
  useLayoutEffect,
  type InputHTMLAttributes,
  type RefObject,
} from 'react'

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

type CheckedState = boolean | 'indeterminate'
const useCommitEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

export function syncCheckedInput(
  input: HTMLInputElement | null,
  checked: CheckedState,
) {
  if (!input) return
  input.checked = checked === true
  input.indeterminate = checked === 'indeterminate'
}

/** Commit both properties together; native activation owns canceled-click rollback. */
export function useCheckedInput(
  ref: RefObject<HTMLInputElement | null>,
  checked: CheckedState,
) {
  useCommitEffect(() => syncCheckedInput(ref.current, checked))
}
