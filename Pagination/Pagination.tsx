/** Pagination — page navigation with numbered buttons and a page-number picker. */
import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type MouseEvent,
} from 'react'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Modal } from '../Modal/Modal'
import { Input } from '../Input/Input'
import { Text } from '../Text/Text'
import { composeHandlers } from '../assets/adapters/react/merge-props'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useIsCompactViewport } from '../assets/adapters/react/use-responsive-overlay-surface'
import {
  formatLabel,
  resolveLabels,
  type CommonLabels,
} from '../assets/runtime/labels'
import { pageCount, pageRange } from '../assets/runtime/pagination'
import { readNumber } from '../assets/runtime/props'

export interface PaginationLabels
  extends Pick<CommonLabels, 'previous' | 'next' | 'close'> {
  /** Accessible name of each numbered page button; `{page}` becomes its number. */
  page: string
  /** Name of the page-picker button and title of its dialog. */
  choosePage: string
  /** Label of the picker's page-number input. */
  pageNumber: string
  /** Submit button of the page picker. */
  goToPage: string
}

const defaultLabels: PaginationLabels = Object.freeze({
  previous: 'Previous page',
  next: 'Next page',
  page: 'Page {page}',
  choosePage: 'Choose page',
  pageNumber: 'Page number',
  goToPage: 'Go to page',
  close: 'Close',
})
/** Landmark name until a native aria-label or aria-labelledby names the nav (K14). */
const defaultRootLabels = Object.freeze({ nav: 'Pagination' })
const POSITIVE = { integer: true, min: 1 } as const
/** WebKit leaves buttons without an explicit tabIndex out of the Tab order. */
const TABBABLE = { tabIndex: 0 } as const

export interface PaginationProps extends Omit<
  HTMLAttributes<HTMLElement>,
  | 'children'
  | 'dangerouslySetInnerHTML'
  | 'defaultValue'
  | 'defaultChecked'
  | 'autoFocus'
  | 'contentEditable'
  | 'suppressContentEditableWarning'
> {
  /** Controlled current page, from 1; a page past the last one shows the last page. */
  page?: number
  /** Uncontrolled page on mount, from 1; read once. */
  defaultPage?: number
  /** Number of items being paged, an integer from 0; no items still show page 1. */
  total?: number
  /** Items per page, an integer from 1. */
  pageSize?: number
  /** Page buttons on each side of the current page, an integer from 0 to 20; the bar keeps its length near either end. */
  siblingCount?: number
  /** Disables page changes and the picker button; an open picker can still be closed. */
  disabled?: boolean
  /** Called once per user change to a different page; `page` updates from the parent never call it. */
  onPageChange?: (details: { page: number }) => void
  /** Additional class name on the root nav. */
  className?: string
  /** Membrane spacing around the navigation buttons; the picker dialog owns its own spacing. */
  membrane?: boolean
  /** Names and text of the component's own controls; the nav itself takes a native aria-label or aria-labelledby. */
  labels?: Partial<PaginationLabels>
}

/** Page navigation with previous, next and numbered buttons, plus a dialog for jumping to any page. */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(
  function Pagination(props, ref) {
    const {
      page,
      defaultPage = 1,
      total = 0,
      pageSize = 10,
      siblingCount = 1,
      disabled = false,
      onPageChange,
      className,
      membrane = true,
      labels,
      hidden,
      onClick,
      ...rest
    } = props
    const pages = pageCount(
      readNumber('Pagination', 'total', total, 0, { integer: true, min: 0 }),
      readNumber('Pagination', 'pageSize', pageSize, 10, POSITIVE),
    )
    const siblings = readNumber('Pagination', 'siblingCount', siblingCount, 1, {
      integer: true,
      min: 0,
      max: 20,
    })
    const [stored, setPage] = useControllableState<number>({
      value:
        page === undefined
          ? undefined
          : readNumber('Pagination', 'page', page, 1, POSITIVE),
      // Read only while uncontrolled: an unused default reports nothing.
      defaultValue: () =>
        page === undefined
          ? readNumber('Pagination', 'defaultPage', defaultPage, 1, POSITIVE)
          : 1,
      onChange: (next) => onPageChange?.({ page: next }),
      name: ['Pagination', 'page'],
    })
    // The stored page is the intent; fewer pages only change what is shown.
    const current = Math.min(stored, pages)
    const text = resolveLabels(defaultLabels, labels, 'Pagination')
    const go = (target: number) => {
      if (!disabled && target >= 1 && target <= pages && target !== current)
        setPage(target)
    }
    const select = (event: MouseEvent<HTMLElement>) => {
      const button = (event.target as Element).closest?.('button[data-page]')
      if (button && !event.defaultPrevented && !button.matches(':disabled'))
        go(Number(button.getAttribute('data-page')))
    }

    const pickerDisabled = disabled || pages <= 1
    const compact = useIsCompactViewport()
    const [pickerOpen, setPickerOpen] = useState(false)
    // A hidden nav closes its portaled picker, which stays closed on reveal.
    if (pickerOpen && hidden) setPickerOpen(false)
    const [pageInput, setPageInput] = useState('1')
    const typed = Number(pageInput)
    const valid = Number.isSafeInteger(typed) && typed >= 1 && typed <= pages
    const jump = () => {
      if (disabled || !valid) return
      go(typed)
      setPickerOpen(false)
    }

    return (
      <nav
        aria-label={defaultRootLabels.nav}
        {...rest}
        ref={ref}
        hidden={hidden}
        data-scope="pagination"
        data-part="root"
        className={cn('uf-pagination', className)}
        onClick={composeHandlers(onClick, select)}
      >
        <Button
          data-scope="pagination"
          data-part="prev"
          data-page={current - 1}
          {...TABBABLE}
          disabled={disabled || current <= 1}
          aria-label={text.previous}
          fullWidth={false}
          membrane={membrane}
          variant="ghost"
          className="uf-pagination-nav uf-pagination-navPrev"
        >
          {text.previous}
        </Button>

        <span className="uf-pagination-pages">
          {pageRange(current, pages, siblings).map((item, index) =>
            item === null ? (
              <Text
                key={`gap-${index}`}
                as="span"
                data-scope="pagination"
                data-part="ellipsis"
                aria-hidden
                membrane={false}
                fullWidth={false}
                className="uf-pagination-ellipsis"
              >
                …
              </Text>
            ) : (
              <Button
                key={item}
                data-scope="pagination"
                data-part="item"
                data-page={item}
                {...TABBABLE}
                aria-current={item === current ? 'page' : undefined}
                aria-label={formatLabel(text.page, { page: item })}
                disabled={disabled}
                fullWidth={false}
                membrane={membrane}
                variant={item === current ? 'primary' : 'ghost'}
                className="uf-pagination-page"
              >
                {String(item)}
              </Button>
            ),
          )}
        </span>

        <span className="uf-pagination-trailing">
          <Button
            data-scope="pagination"
            data-part="next"
            data-page={current + 1}
            {...TABBABLE}
            disabled={disabled || current >= pages}
            aria-label={text.next}
            fullWidth={false}
            membrane={membrane}
            variant="ghost"
            className="uf-pagination-nav uf-pagination-navNext"
          >
            {text.next}
          </Button>
          <Modal
            open={pickerOpen}
            onOpenChange={({ open }) => {
              if (open && pickerDisabled) return
              setPickerOpen(open)
              if (open) setPageInput(String(current))
            }}
            title={text.choosePage}
            closeLabel={text.close}
            placement={compact ? 'bottom' : 'center'}
            width={280}
            className="uf-pagination-pagePicker"
            dir={rest.dir}
            lang={rest.lang}
            trigger={
              <Button
                disabled={pickerDisabled}
                {...TABBABLE}
                icon="more"
                iconOnly
                fullWidth={false}
                membrane={membrane}
                variant="ghost"
                className="uf-pagination-more"
                aria-label={text.choosePage}
                title={text.choosePage}
              />
            }
          >
            <div>
              <Input
                label={text.pageNumber}
                clearable={false}
                description={<bdi dir="ltr">1–{pages}</bdi>}
                disabled={disabled}
                aria-invalid={!valid || undefined}
                type="number"
                min={1}
                max={pages}
                step={1}
                value={pageInput}
                onValueChange={({ value }) => setPageInput(value)}
                onKeyDown={(event) => {
                  if (
                    !event.defaultPrevented &&
                    !event.nativeEvent.isComposing &&
                    event.key === 'Enter'
                  ) {
                    event.preventDefault()
                    jump()
                  }
                }}
              />
              <Button
                disabled={!valid || disabled}
                {...TABBABLE}
                onClick={(event) => {
                  if (!event.defaultPrevented) jump()
                }}
              >
                {text.goToPage}
              </Button>
            </div>
          </Modal>
        </span>
      </nav>
    )
  },
)
