import {
  Pagination as AuditedPagination,
  type PaginationLabels,
} from '../../../index'
import { createRef as createPaginationRef } from 'react'

export const paginationDictionary: Readonly<PaginationLabels> = { previous:'Назад',next:'Далее',page:'Страница {page}',choosePage:'Страница',pageNumber:'Номер',goToPage:'Перейти',close:'Закрыть' }
export const paginationNative = <AuditedPagination ref={createPaginationRef<HTMLElement>()} labels={paginationDictionary} page={3} defaultPage={2} total={100} pageSize={10} siblingCount={2} membrane={false} disabled={false} id="pages" className="pages" style={{width:300}} dir="rtl" lang="ru" hidden={false} aria-label="Pages" aria-labelledby="heading" data-page-nav="yes" onClickCapture={e=>e.preventDefault()} onPageChange={({page})=>page.toFixed()} />
// @ts-expect-error Pagination owns the navigation children.
export const paginationInvalidChildren = <AuditedPagination>custom</AuditedPagination>
// @ts-expect-error Pagination owns the navigation markup.
export const paginationInvalidHTML = <AuditedPagination dangerouslySetInnerHTML={{__html:'custom'}} />
// @ts-expect-error Page is a number, not a coercible string.
export const paginationInvalidPage = <AuditedPagination page="2" />
// @ts-expect-error Pagination root is not a form field.
export const paginationInvalidDefaultValue = <AuditedPagination defaultValue="2" />
// @ts-expect-error Pagination root is not a checkable field.
export const paginationInvalidDefaultChecked = <AuditedPagination defaultChecked />
// @ts-expect-error A nav cannot honor native autofocus.
export const paginationInvalidAutoFocus = <AuditedPagination autoFocus />
// @ts-expect-error Editable markup conflicts with generated navigation controls.
export const paginationInvalidEditable = <AuditedPagination contentEditable />
// @ts-expect-error Editable markup is not part of Pagination's API.
export const paginationInvalidEditableWarning = <AuditedPagination suppressContentEditableWarning />
// @ts-expect-error The ref points at an HTML nav, not an SVG node.
export const paginationInvalidRef = <AuditedPagination ref={createPaginationRef<SVGSVGElement>()} />
// @ts-expect-error Labels are string templates, not callback formatters.
export const paginationInvalidLabels = <AuditedPagination labels={{page:(page:number)=>String(page)}} />
// @ts-expect-error surfaceTitle is not duplicated in the internal label dictionary.
export const paginationInvalidTitleAlias = <AuditedPagination labels={{surfaceTitle:'Pages'}} />
// @ts-expect-error labels.choosePage titles the picker dialog.
export const paginationRemovedSurfaceTitle = <AuditedPagination surfaceTitle="Pages" />
// @ts-expect-error The previous and next names use the shared label keys.
export const paginationRenamedPreviousPage = <AuditedPagination labels={{previousPage:'Назад'}} />
