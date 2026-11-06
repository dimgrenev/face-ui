import { Date as DateField, type DateProps } from './Date'
import type { DateValueExternal } from '../assets/date-utils'
import { areContextValuesEqual } from '../assets/create-machine'
import { useAuthoredValue } from '../assets/examples/use-authored-value'
import { pressExampleControl, type ExampleCheckContext } from '../assets/examples/check-context'

/** A real value owner for all Date modes; the component still owns its picker. */
export function DatePreview(props: DateProps) {
  const [value, setValue] = useAuthoredValue<DateValueExternal>(props.value, areContextValuesEqual)
  // Mode/selection/valueFormat remain the caller's correlated union. The callback
  // reports that same representation; the example performs no value conversion.
  const owned = { ...props, value, onValueChange(details: { value: DateValueExternal }) {
    setValue(details.value)
    const notify = props.onValueChange as ((details: { value: DateValueExternal }) => void) | undefined
    notify?.(details)
  } } as DateProps
  return <div data-face-date-example="" data-clearable={props.clearable !== false}><DateField {...owned} /></div>
}

export const userfaceExample = { checks: [{ id: 'value-change', name: 'Choose an editable date or time',
  async run(context: ExampleCheckContext) {
    context.signal.throwIfAborted()
    const assert: ExampleCheckContext['assert'] = context.assert
    const root = context.canvas.querySelector<HTMLElement>('[data-face-date-example]')
    assert(root, 'The current Date example must be mounted.')
    const trigger = root.querySelector<HTMLButtonElement>('[data-scope="date"][data-part="trigger"]')
    const field = root.querySelector<HTMLSelectElement>('select[aria-hidden="true"]')
    assert(trigger && field, 'The Date must expose its real trigger and submitted value.')
    if (trigger.disabled || trigger.getAttribute('aria-readonly') === 'true') {
      trigger.click()
      assert(trigger.getAttribute('aria-expanded') === 'false', 'An unavailable field must not open its picker.')
      return
    }
    const wasOpen = trigger.getAttribute('aria-expanded') === 'true'
    const content = () => root.ownerDocument.getElementById(trigger.getAttribute('aria-controls') ?? '')
    const open = async () => {
      if (!content()) pressExampleControl(context, trigger)
      await context.waitFor(() => assert(content(), 'The owned picker must open.'))
    }
    await open()
    const clear = root.dataset.clearable === 'true' ? content()?.querySelector<HTMLButtonElement>('.uf-date__footer button') : null
    if (clear && !clear.disabled) {
      pressExampleControl(context, clear)
      await context.waitFor(() => assert(field.value === '', 'Clear must commit an empty value.'))
      await open()
    }
    const before = field.value
    const choice = content()?.querySelector<HTMLButtonElement>(
      '.uf-calendar-dayButton:not(:disabled):not([data-disabled]):not([data-selected]), .uf-date__grid button:not(:disabled):not([aria-pressed="true"])',
    )
    assert(choice, 'The configured picker must have an available date or time choice.')
    pressExampleControl(context, choice)
    // A range is submitted only after both endpoints have been selected.
    await context.waitFor(() => assert(field.value !== before || content()?.querySelector('[data-range-start]'), 'The picker must accept the chosen value or range start.'))
    if (field.value === '' && content()) {
      const endpoint = Array.from(content()!.querySelectorAll<HTMLButtonElement>(
        '.uf-calendar-dayButton:not(:disabled):not([data-disabled])',
      )).find(button => button !== choice)
      assert(endpoint, 'The configured range must offer its second endpoint.')
      pressExampleControl(context, endpoint)
    }
    await context.waitFor(() => assert(field.value !== before, 'The selected date or time must be committed.'))
    if (!wasOpen && content()) {
      context.signal.throwIfAborted()
      const Event = root.ownerDocument.defaultView!.KeyboardEvent
      content()!.dispatchEvent(new Event('keydown', { key: 'Escape', bubbles: true }))
      await context.waitFor(() => assert(!content(), 'Escape must close the owned picker.'))
    }
  },
}] }
