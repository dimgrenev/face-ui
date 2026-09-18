import { createRef as createPaginationRef } from 'react'
import { Breadcrumb as AuditedBreadcrumb } from '../../../index'
import type { BreadcrumbItem as AuditedCrumbItem } from '../../../Breadcrumb/Breadcrumb'

export const breadcrumbReadonlyItems: readonly AuditedCrumbItem[] = Object.freeze([{key:'root',label:'Root',href:'#root',onClick:e=>e.preventDefault()},{key:2,label:'Current'}])
export const breadcrumbNative = <AuditedBreadcrumb items={breadcrumbReadonlyItems} maxItems={null} membrane={false} separator={null} overflowLabel="Показать путь" ref={createPaginationRef<HTMLElement>()} id="path" lang="ru" dir="rtl" hidden={false} className="path" style={{width:320}} aria-label="Путь" onClickCapture={e=>e.preventDefault()} />
// @ts-expect-error Breadcrumb follows native navigation without a sandbox opt-in.
export const breadcrumbRemovedAllowNavigation = <AuditedBreadcrumb allowNavigation />
// @ts-expect-error maxItems names the bound including the overflow position.
export const breadcrumbRemovedCollapseAfter = <AuditedBreadcrumb collapseAfter={4} />
// @ts-expect-error The component owns its trail markup.
export const breadcrumbInvalidChildren = <AuditedBreadcrumb>custom</AuditedBreadcrumb>
// @ts-expect-error The component owns its trail markup.
export const breadcrumbInvalidHTML = <AuditedBreadcrumb dangerouslySetInnerHTML={{__html:'custom'}} />
// @ts-expect-error Navigation is not an editable field.
export const breadcrumbInvalidEditable = <AuditedBreadcrumb contentEditable />
// @ts-expect-error Navigation is not a value field.
export const breadcrumbInvalidDefaultValue = <AuditedBreadcrumb defaultValue="path" />
// @ts-expect-error Navigation cannot honor autofocus.
export const breadcrumbInvalidAutoFocus = <AuditedBreadcrumb autoFocus />
// @ts-expect-error The overflow name is text, not content markup.
export const breadcrumbInvalidOverflowLabel = <AuditedBreadcrumb overflowLabel={<span>Path</span>} />
// @ts-expect-error The ref belongs to the HTML nav.
export const breadcrumbInvalidRef = <AuditedBreadcrumb ref={createPaginationRef<SVGSVGElement>()} />
