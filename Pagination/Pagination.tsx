/**
 * Pagination — page navigation component.
 *
 * Renders prev/next buttons and numbered page buttons with ellipsis.
 * Range items with value -1 are rendered as ellipsis spans.
 *
 * `<Pagination page={1} total={100} pageSize={10} />`
 */

import { forwardRef } from 'react'
import { useMachine } from '../assets/adapters/react/use-machine'
import { useControllableMachineProp } from '../assets/adapters/react/use-controllable-machine-prop'
import { paginationMachine, connectPagination } from '../assets/machines/pagination.machine'
import { cn } from '../assets/utils'
import { Button } from '../Button/Button'
import { Menu } from '../Menu/Menu'
import { Text } from '../Text/Text'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaginationProps {
  /** Current page number (1-indexed). */
  page?: number
  /** Uncontrolled initial page number (1-indexed). */
  defaultPage?: number
  /** Total number of items. */
  total: number
  /** Number of items per page. */
  pageSize?: number
  /** Number of sibling pages shown around the current page. */
  siblingCount?: number
  /** Disable the entire pagination. */
  disabled?: boolean
  /** Callback when the page changes. */
  onPageChange?: (details: { page: number }) => void
  /** Additional class name on the root element. */
  className?: string
  /** Outer membrane wrapper (+1px outside each pagination button). */
  membrane?: boolean
  /** Title used for the page picker sheet on compact viewports. */
  surfaceTitle?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Pagination = forwardRef<HTMLElement, PaginationProps>(
  function Pagination(props, ref) {
    const {
      page: rawPage,
      defaultPage: rawDefaultPage = 1,
      total: rawTotal,
      pageSize: rawPageSize = 10,
      siblingCount = 1,
      disabled = false,
      onPageChange,
      className,
      membrane = true,
      surfaceTitle = 'Choose page',
    } = props

    // NaN protection: face.json may deliver wrong types for number props
    const controlledPage = rawPage === undefined ? undefined : (Number(rawPage) || 1)
    const defaultPage = Number(rawDefaultPage) || 1
    const total = Number(rawTotal) || 0
    const pageSize = Number(rawPageSize) || 10
    const page = useControllableMachineProp(controlledPage, defaultPage)

    const { state, send } = useMachine(paginationMachine, {
      page,
      total,
      pageSize,
      siblingCount,
      disabled,
      onPageChange: onPageChange ?? null,
    })

    const api = connectPagination(state, send)
    const pageItems = Array.from({ length: api.totalPages }, (_, index) => ({
      value: String(index + 1),
      label: `Page ${index + 1}`,
    }))

    return (
      <nav ref={ref} {...api.getRootProps()} className={cn('uf-pagination', className)}>
        <Button
          {...api.getPrevProps()}
          text="Previous"
          fullWidth={false}
          membrane={membrane}
          variant="ghost"
          className="uf-pagination-nav uf-pagination-navPrev"
        />

        <span className={cn('uf-pagination-currentSlot', membrane && 'uf-membrane')}>
          <Text
            as="span"
            membrane={false}
            fullWidth={false}
            variant="label"
            className="uf-pagination-current"
            aria-current="page"
            title={`Page ${api.page} of ${api.totalPages}`}
          >
            {api.page}
          </Text>
        </span>

        <span className="uf-pagination-trailing">
          <Button
            {...api.getNextProps()}
            text="Next"
            fullWidth={false}
            membrane={membrane}
            variant="ghost"
            className="uf-pagination-nav uf-pagination-navNext"
          />
          <Menu
            items={pageItems}
            surfaceTitle={surfaceTitle}
            onSelect={(details) => {
              const nextPage = Number(details.value)
              if (!Number.isFinite(nextPage)) return
              send({ type: 'SET_PAGE', page: nextPage })
            }}
          >
            <Button
              icon="more"
              iconOnly
              fullWidth={false}
              membrane={membrane}
              variant="ghost"
              className="uf-pagination-more"
              aria-label="Choose page"
              title="Choose page"
            />
          </Menu>
        </span>
      </nav>
    )
  },
)
