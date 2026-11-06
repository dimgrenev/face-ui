import { Pagination, type PaginationProps } from './Pagination'
import { useAuthoredValue } from '../assets/examples/use-authored-value'
import { pressExampleControl, type ExampleCheckContext } from '../assets/examples/check-context'

/** The authored parent explicitly accepts Pagination's page proposals. */
export function PaginationPreview({ page: input, onPageChange, ...props }: PaginationProps) {
  const [page, setPage] = useAuthoredValue(input)
  return <div data-face-pagination-example=""><Pagination {...props} page={page}
    onPageChange={details => { setPage(details.page); onPageChange?.(details) }} /></div>
}

export const userfaceExample = { checks: [{ id: 'page-change', name: 'Change and restore page',
  async run(context: ExampleCheckContext) {
    context.signal.throwIfAborted()
    const assert: ExampleCheckContext['assert'] = context.assert
    const root = context.canvas.querySelector<HTMLElement>('[data-face-pagination-example]')
    assert(root, 'The current Pagination example must be mounted.')
    const current = () => root.querySelector<HTMLButtonElement>('[aria-current="page"]')?.dataset.page
    const before = current()
    assert(before, 'The current page must be identified.')
    const next = root.querySelector<HTMLButtonElement>('[data-part="next"]:not(:disabled)')
    const previous = root.querySelector<HTMLButtonElement>('[data-part="prev"]:not(:disabled)')
    const button = next ?? previous
    if (!button) {
      assert(!root.querySelector('button:not(:disabled):not([aria-current="page"])'), 'An unavailable or single-page paginator must not offer a page change.')
      const currentButton = root.querySelector<HTMLButtonElement>('[aria-current="page"]')
      if (currentButton && !currentButton.disabled) {
        pressExampleControl(context, currentButton)
        await context.waitFor(() => assert(current() === before, 'The current page must remain a no-op.'))
      }
      return
    }
    pressExampleControl(context, button)
    await context.waitFor(() => assert(current() !== before, 'Navigation must commit the next current page.'))
    pressExampleControl(context, root.querySelector<HTMLButtonElement>(`[data-part="${next ? 'prev' : 'next'}"]`))
    await context.waitFor(() => assert(current() === before, 'Navigation must restore the original current page.'))
  },
}] }
