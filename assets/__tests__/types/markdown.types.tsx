import { createRef } from 'react'
import { Markdown } from '../../../index'

export const markdown = (
  <Markdown
    ref={createRef<HTMLDivElement>()}
    gfm={false}
    breaks
    html
    linkTarget="_blank"
    linkRel="nofollow ugc noopener"
    membrane
    id="answer"
    aria-label="Answer"
    onClick={(event) => event.currentTarget.id}
  >
    {'# Title\n\n- [x] Done'}
  </Markdown>
)
// @ts-expect-error The source is children; the content prop was removed.
export const contentProp = <Markdown content="# Title" />
// @ts-expect-error The source is text, not elements.
export const elementSource = <Markdown><b>Title</b></Markdown>
// @ts-expect-error Raw HTML is one switch: html.
export const allowRawHtml = <Markdown allowRawHtml>{'<b>x</b>'}</Markdown>
// @ts-expect-error Sanitization cannot be turned off; html is the only switch.
export const safeMode = <Markdown safeMode={false}>{'<b>x</b>'}</Markdown>
// @ts-expect-error Markdown always fills its container.
export const fullWidth = <Markdown fullWidth={false}>Text</Markdown>
// @ts-expect-error The component owns the markup.
export const innerHtml = <Markdown dangerouslySetInnerHTML={{ __html: '<b>x</b>' }} />
// @ts-expect-error Links open in place or in a new tab.
export const linkTarget = <Markdown linkTarget="_top">Text</Markdown>
