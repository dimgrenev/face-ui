import { Toc, type TocProps } from './Toc'
import { useAuthoredValue } from '../assets/examples/use-authored-value'
import { pressExampleControl, type ExampleCheckContext } from '../assets/examples/check-context'

/** Current entry follows real native links; navigation and onSelect remain intact. */
export function TocPreview({ value: input, onValueChange, ...props }: TocProps) {
  const [value, setValue] = useAuthoredValue(input)
  return <div data-face-toc-example=""><Toc {...props} value={value}
    onValueChange={details => { setValue(details.value); onValueChange?.(details) }} /></div>
}

export const userfaceExample = { checks: [{ id: 'entry-change', name: 'Follow a different entry',
  async run(context: ExampleCheckContext) {
    context.signal.throwIfAborted()
    const assert: ExampleCheckContext['assert'] = context.assert
    const root = context.canvas.querySelector<HTMLElement>('[data-face-toc-example]')
    assert(root, 'The current Toc example must be mounted.')
    const before = root.querySelector<HTMLAnchorElement>('[aria-current="location"]')
    const next = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-scope="toc"][data-part="link"]')).find(link => link !== before)
    assert(next, 'This check requires a different authored entry.')
    pressExampleControl(context, next)
    await context.waitFor(() => assert(next.getAttribute('aria-current') === 'location', 'Following a link must update the current entry.'))
    if (before) {
      pressExampleControl(context, before)
      await context.waitFor(() => assert(before.getAttribute('aria-current') === 'location', 'The initial entry must remain selectable.'))
    }
  },
}] }
