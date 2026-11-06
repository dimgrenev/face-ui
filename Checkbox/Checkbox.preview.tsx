import { Checkbox, type CheckboxProps } from './Checkbox'
import { useAuthoredValue } from '../assets/examples/use-authored-value'
import { pressExampleControl, type ExampleCheckContext } from '../assets/examples/check-context'

/** The authored parent explicitly accepts the Checkbox's actual checked proposal. */
export function CheckboxPreview({ checked: input, onCheckedChange, ...props }: CheckboxProps) {
  const [checked, setChecked] = useAuthoredValue(input)
  return <div data-face-checkbox-example=""><Checkbox {...props} checked={checked}
    onCheckedChange={details => { setChecked(details.checked); onCheckedChange?.(details) }} /></div>
}

export const userfaceExample = { checks: [{ id: 'checked-change', name: 'Change checkbox selection',
  async run(context: ExampleCheckContext) {
    context.signal.throwIfAborted()
    const assert: ExampleCheckContext['assert'] = context.assert
    const input = context.canvas.querySelector<HTMLInputElement>('[data-face-checkbox-example] input[role="checkbox"]')
    assert(input, 'The current Checkbox example must be mounted.')
    const before = input.getAttribute('aria-checked')
    if (input.disabled) {
      input.click()
      assert(input.getAttribute('aria-checked') === before, 'A disabled checkbox must keep its selection.')
      return
    }
    pressExampleControl(context, input)
    await context.waitFor(() => assert(input.getAttribute('aria-checked') !== before, 'Activation must commit checked selection.'))
    const after = input.getAttribute('aria-checked')
    pressExampleControl(context, input)
    await context.waitFor(() => assert(input.getAttribute('aria-checked') !== after, 'The checkbox must remain interactive.'))
  },
}] }
