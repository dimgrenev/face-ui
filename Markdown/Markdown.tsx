import { forwardRef, useMemo, type HTMLAttributes } from 'react'
import sanitizeHtml, { type IOptions } from 'sanitize-html'
import { Marked, type RendererObject, type Tokens } from 'marked'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Membrane } from '../assets/adapters/react/Membrane'
import { invalidProp } from '../assets/runtime/props'

export const markdownAnatomy = createAnatomy('markdown').parts('root')

export interface MarkdownProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'children' | 'content' | 'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue'
  > {
  /** Markdown source, rendered as HTML that never carries scripts, styles, event handlers or unsafe URLs. */
  children?: string
  /** GitHub Flavored Markdown as in GitHub comments: tables, task lists, strikethrough, autolinks, a line break as a break; `false` parses plain CommonMark. */
  gfm?: boolean
  /** Render raw HTML in the source through an allowlist of text and block tags (no scripts, styles, forms, frames or attributes that run code); otherwise it shows as typed. */
  html?: boolean
  /** Where links to other sites (http(s) and protocol-relative URLs) open; relative links, anchors and mailto/tel links always open in place. */
  linkTarget?: '_self' | '_blank'
  /** `rel` of every link to another site, whatever its target, such as `nofollow ugc noopener` for user content; an empty string adds none. */
  linkRel?: string
  /** Wrap the block in the 1px outer spacing box that Face UI controls share, to line it up with controls in a row. */
  membrane?: boolean
}

/** A task item's checkbox and its text share a `<label>`, so the checkbox is named by its task. */
const listitem: RendererObject['listitem'] = function (item) {
  if (!item.task) return false
  // The checkbox precedes the item's first text, or already leads it in a loose list.
  const rest = [...item.tokens]
  const checkbox = rest[0]?.type === 'checkbox' ? rest.splice(0, 1) : []
  const text = /^(paragraph|text)$/.test(rest[0]?.type ?? '')
    ? (rest.shift() as Tokens.Paragraph | Tokens.Text)
    : undefined
  const label = `<label>${this.parser.parseInline([...checkbox, ...(text?.tokens ?? [])])}</label>`
  return `<li>${text?.type === 'paragraph' ? `<p>${label}</p>\n` : label}${this.parser.parse(rest)}</li>\n`
}
const tasks: RendererObject = {
  listitem,
  // The checkbox takes its bullet's place, so no space separates it from its text.
  checkbox: ({ checked }) => `<input type="checkbox" disabled${checked ? ' checked' : ''}>`,
}
const escape = (text: string) => text.replace(/[&<>]/g, (char) => `&#${char.charCodeAt(0)};`)
/** Private instances: a consumer's global `marked.use()` never changes what Markdown renders. */
const parsers = {
  html: new Marked({ breaks: true, renderer: tasks }),
  text: new Marked({
    breaks: true,
    renderer: {
      ...tasks,
      // Raw HTML stays the text it was typed as; a block keeps its own paragraph.
      html: ({ text, block }) => (block ? `<p>${escape(text.trim())}</p>\n` : escape(text)),
    },
  }),
}

/** What Markdown emits, plus the text-level and block tags `html` lets the source use. */
const TAGS = [
  ...['p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'li'],
  ...['a', 'strong', 'em', 'del', 'code', 'pre', 'img', 'input', 'label'],
  ...['table', 'thead', 'tbody', 'tfoot', 'caption', 'tr', 'th', 'td'],
  ...['div', 'span', 'b', 'i', 'u', 's', 'ins', 'sub', 'sup', 'kbd', 'samp', 'var', 'mark', 'small'],
  ...['abbr', 'cite', 'q', 'dfn', 'time', 'bdi', 'wbr', 'ruby', 'rt', 'rp'],
  ...['details', 'summary', 'dl', 'dt', 'dd', 'figure', 'figcaption'],
]
const CELL = ['align', 'colspan', 'rowspan']
/** An http(s) URL with a host: a link that leaves the site. */
const EXTERNAL = /^(?:https?:)?\/\//i

function sanitizeOptions(linkTarget: MarkdownProps['linkTarget'], linkRel: string): IOptions {
  return {
    allowedTags: TAGS,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      th: CELL,
      td: CELL,
      ol: ['start'],
      code: ['class'],
      input: ['type', 'checked', 'disabled'],
      abbr: ['title'],
      details: ['open'],
    },
    allowedClasses: { code: [/^language-/] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    // No style attribute is allowed, so its CSS parser never runs.
    parseStyleAttributes: false,
    transformTags: {
      // Only the component decides where a link opens.
      a: (tagName, { target, rel, ...attribs }) => {
        if (EXTERNAL.test(attribs.href ?? '')) {
          if (linkTarget === '_blank') attribs.target = '_blank'
          if (linkRel) attribs.rel = linkRel
        }
        return { tagName, attribs }
      },
      // Task checkboxes show state; no input from the source is ever editable.
      input: (tagName, { checked }) => ({
        tagName,
        attribs: { type: 'checkbox', disabled: '', ...(checked !== undefined && { checked: '' }) },
      }),
    },
  }
}

/** Renders a Markdown source as sanitized HTML: GitHub Flavored Markdown by default, raw HTML only through an allowlist. */
export const Markdown = forwardRef<HTMLDivElement, MarkdownProps>(function Markdown(
  {
    children,
    gfm = true,
    html = false,
    linkTarget = '_self',
    linkRel = 'noopener noreferrer',
    membrane = false,
    className,
    ...rest
  },
  ref,
) {
  let source = children
  if (typeof source !== 'string') {
    if (source != null) invalidProp('Markdown', 'children', source, 'rendering nothing')
    source = ''
  }
  const markup = useMemo(
    () =>
      sanitizeHtml(
        parsers[html ? 'html' : 'text'].parse(source, { gfm, async: false }),
        sanitizeOptions(linkTarget, linkRel),
      ),
    [source, gfm, html, linkTarget, linkRel],
  )
  return (
    <Membrane enabled={membrane} as="div" fullWidth>
      <div
        {...rest}
        ref={ref}
        {...markdownAnatomy.getPartAttrs('root')}
        className={cn('uf-markdown', className)}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </Membrane>
  )
})
