/**
 * Pagination — page navigation component.
 *
 * Renders prev/next buttons and numbered page buttons with ellipsis.
 * Range items with value -1 are rendered as ellipsis spans.
 *
 * `<Pagination page={1} total={100} pageSize={10} />`
 */

import { forwardRef, useEffect, useState, type HTMLAttributes } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import {
  paginationMachine,
  connectPagination,
} from '../assets/machines/pagination.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Modal } from '../Modal/Modal'
import { useIsCompactViewport } from '../assets/adapters/react/use-responsive-overlay-surface'
import { Input } from '../Input/Input'
import { Text } from '../Text/Text'
import { resolveLabel, resolveLabels } from '../assets/runtime/labels'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaginationLabels {
  /** Visible text and accessible name of the previous-page button. */
  previousPage: string
  /** Visible text and accessible name of the next-page button. */
  nextPage: string
  /** Accessible page name, with exactly one {page} placeholder. */
  page: string
  /** Page-picker trigger name and default dialog title. */
  choosePage: string
  /** Label of the page-number input. */
  pageNumber: string
  /** Submit action in the page picker. */
  goToPage: string
  /** Accessible name of the page-picker close button. */
  close: string
}

const defaultLabels: PaginationLabels = Object.freeze({
  previousPage: 'Previous page',
  nextPage: 'Next page',
  page: 'Page {page}',
  choosePage: 'Choose page',
  pageNumber: 'Page number',
  goToPage: 'Go to page',
  close: 'Close',
})

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
  /** Controlled positive integer page; displayed within the current total/pageSize bounds. */
  page?: number
  /** Initial uncontrolled page (1-indexed); later changes are ignored. */
  defaultPage?: number
  /** Total item count: a nonnegative safe integer. Defaults to 0, displaying page 1. */
  total?: number
  /** Items per page: a positive safe integer. Defaults to 10. */
  pageSize?: number
  /** Neighbor count, an integer from 0 to 20. Edge ranges fill the available slots. Defaults to 1. */
  siblingCount?: number
  /** Disable page changes and picker opening; an already open picker can still be closed. */
  disabled?: boolean
  /** One proposal for a user change to a different visible page; external updates are quiet. */
  onPageChange?: (details: { page: number }) => void
  /** Additional class name on the root element. */
  className?: string
  /** Membrane spacing around the outer navigation buttons; the dialog owns its own spacing. */
  membrane?: boolean
  /** Page-picker dialog title at any viewport size. Defaults to labels.choosePage. */
  surfaceTitle?: string
  /** Internal control labels. The nav itself uses native aria-label or aria-labelledby. */
  labels?: Partial<PaginationLabels>
}

function readInteger(
  value: unknown,
  name: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new RangeError(
      `Pagination ${name} must be an integer between ${min} and ${max}`,
    )
  return value
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Pagination = forwardRef<HTMLElement, PaginationProps>(
  function Pagination(props, ref) {
    const {
      page: rawPage,
      defaultPage: rawDefaultPage = 1,
      total: rawTotal = 0,
      pageSize: rawPageSize = 10,
      siblingCount: rawSiblingCount = 1,
      disabled = false,
      onPageChange,
      className,
      membrane = true,
      surfaceTitle,
      labels,
      hidden,
      ...rest
    } = props

    const controlledPage =
      rawPage === undefined ? undefined : readInteger(rawPage, 'page', 1)
    const [defaultPage] = useState(() =>
      rawPage === undefined
        ? readInteger(rawDefaultPage, 'defaultPage', 1)
        : 1,
    )
    const total = readInteger(rawTotal, 'total', 0)
    const pageSize = readInteger(rawPageSize, 'pageSize', 1)
    const siblingCount = readInteger(rawSiblingCount, 'siblingCount', 0, 20)
    const page = useControllableMachineProp(controlledPage, defaultPage)
    const resolvedLabels = resolveLabels(defaultLabels, labels, 'Pagination')
    if ((resolvedLabels.page.match(/\{page\}/g) ?? []).length !== 1)
      throw new RangeError(
        'Pagination labels.page must contain exactly one {page} placeholder',
      )
    const pickerTitle = resolveLabel(
      surfaceTitle,
      resolvedLabels.choosePage,
      'Pagination surfaceTitle',
    )

    const { state, send } = useMachine(paginationMachine, {
      page,
      total,
      pageSize,
      siblingCount,
      disabled,
      onPageChange: onPageChange ?? null,
    })

    const api = connectPagination(state, send)
    const pickerDisabled = disabled || api.totalPages <= 1
    const compact = useIsCompactViewport()
    const [pickerOpen, setPickerOpen] = useState(false)
    useEffect(() => {
      if (hidden) setPickerOpen(false)
    }, [hidden])
    const [pageInput, setPageInput] = useState('1')
    const nextPage = Number(pageInput)
    const validPage =
      Number.isSafeInteger(nextPage) &&
      nextPage >= 1 &&
      nextPage <= api.totalPages
    const jump = () => {
      if (disabled || !validPage) return
      send({ type: 'SET_PAGE', page: nextPage })
      setPickerOpen(false)
    }

    return (
      <nav
        ref={ref}
        {...api.getRootProps()}
        {...rest}
        hidden={hidden}
        className={cn('uf-pagination', className)}
      >
        <Button
          {...api.getPrevProps()}
          text={resolvedLabels.previousPage}
          aria-label={resolvedLabels.previousPage}
          fullWidth={false}
          membrane={membrane}
          variant="ghost"
          className="uf-pagination-nav uf-pagination-navPrev"
        />

        <span className="uf-pagination-pages">
          {api.range.map((rangeItem, index) =>
            rangeItem === -1 ? (
              <Text
                key={`ellipsis-${index}`}
                as="span"
                {...api.getEllipsisProps()}
                membrane={false}
                fullWidth={false}
                className="uf-pagination-ellipsis"
              >
                …
              </Text>
            ) : (
              <Button
                key={rangeItem}
                {...api.getPageProps(rangeItem)}
                text={String(rangeItem)}
                fullWidth={false}
                membrane={membrane}
                variant={api.page === rangeItem ? 'primary' : 'ghost'}
                aria-label={resolvedLabels.page.replace(
                  '{page}',
                  String(rangeItem),
                )}
                className="uf-pagination-page"
              />
            ),
          )}
        </span>

        <span className="uf-pagination-trailing">
          <Button
            {...api.getNextProps()}
            text={resolvedLabels.nextPage}
            aria-label={resolvedLabels.nextPage}
            fullWidth={false}
            membrane={membrane}
            variant="ghost"
            className="uf-pagination-nav uf-pagination-navNext"
          />
          <Modal
            open={pickerOpen && !hidden}
            onOpenChange={({ open }) => {
              if (open && pickerDisabled) return
              setPickerOpen(open)
              if (open) setPageInput(String(api.page))
            }}
            title={pickerTitle}
            closeLabel={resolvedLabels.close}
            placement={compact ? 'bottom' : 'center'}
            width={280}
            className="uf-pagination-pagePicker"
            dir={rest.dir}
            lang={rest.lang}
            trigger={
              <Button
                disabled={pickerDisabled}
                tabIndex={pickerDisabled ? -1 : 0}
                icon="more"
                iconOnly
                fullWidth={false}
                membrane={membrane}
                variant="ghost"
                className="uf-pagination-more"
                aria-label={resolvedLabels.choosePage}
                title={resolvedLabels.choosePage}
              />
            }
          >
            <div>
              <Input
                label={resolvedLabels.pageNumber}
                clearable={false}
                description={<bdi dir="ltr">1–{api.totalPages}</bdi>}
                disabled={disabled}
                aria-invalid={!validPage || undefined}
                type="number"
                min={1}
                max={api.totalPages}
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
                text={resolvedLabels.goToPage}
                disabled={!validPage || disabled}
                tabIndex={!validPage || disabled ? -1 : 0}
                onClick={(event) => {
                  if (!event.defaultPrevented) jump()
                }}
              />
            </div>
          </Modal>
        </span>
      </nav>
    )
  },
)
