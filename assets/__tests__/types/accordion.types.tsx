import { Accordion, type AccordionItem } from '../../../Accordion/Accordion'

const immutableAccordionItems: readonly AccordionItem[] = Object.freeze([{value:'account',label:'Account',content:'Settings',region:true}])
export const accordionNativeProps = <Accordion items={immutableAccordionItems} expanded={Object.freeze(['account'])} defaultExpanded={Object.freeze([])} headingLevel={2} id="sections" dir="rtl" lang="ru" style={{width:320}} hidden className="test" aria-label="Sections" role="group" onClickCapture={event=>event.preventDefault()} onKeyDown={event=>{event.currentTarget.focus()}} ref={node=>{node?.focus()}} />
// @ts-expect-error items owns the accordion's content.
export const accordionChildren = <Accordion>Ignored content</Accordion>
// @ts-expect-error items owns the accordion's markup.
export const accordionHtml = <Accordion dangerouslySetInnerHTML={{__html:'ignored'}} />
// @ts-expect-error Accordion is not a form field; defaultExpanded owns initial expansion.
export const accordionDefaultValue = <Accordion defaultValue="account" />
// @ts-expect-error A div cannot have a default checked state.
export const accordionDefaultChecked = <Accordion defaultChecked />
// @ts-expect-error Focus belongs to user navigation; React does not autofocus the root div.
export const accordionAutoFocus = <Accordion autoFocus />
// @ts-expect-error Editing the library-owned disclosure markup is not a content editor API.
export const accordionEditable = <Accordion contentEditable />
// @ts-expect-error There is no contentEditable API on the root.
export const accordionEditableWarning = <Accordion suppressContentEditableWarning />
// @ts-expect-error There are six native heading levels.
export const accordionHeading = <Accordion headingLevel={7} />
// @ts-expect-error Item identities are not coerced.
export const accordionNumericIdentity = <Accordion items={[{value:1,label:'One',content:'One'}]} />
// @ts-expect-error Expanded identities are string values.
export const accordionNumericValue = <Accordion expanded={[1]} />
// @ts-expect-error The forwarded ref owns the root div.
export const accordionButtonRef = <Accordion ref={(node: HTMLButtonElement|null)=>{node?.click()}} />
export const accordionPayload = <Accordion onExpandedChange={({ expanded }) => expanded.push('fresh')} />
// @ts-expect-error The payload key matches the prop: `expanded`.
export const accordionLegacyPayload = <Accordion onExpandedChange={({ expandedIds }) => expandedIds} />
// @ts-expect-error `expandedIds` is now `expanded`.
export const accordionLegacyProp = <Accordion expandedIds={['account']} />
