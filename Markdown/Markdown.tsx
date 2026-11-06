import { forwardRef, useMemo, type HTMLAttributes } from 'react'
import sanitizeHtml, { type IOptions } from 'sanitize-html'
import { Marked, type RendererObject, type TokenizerExtension, type Tokens } from 'marked'
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
  /** GitHub Flavored Markdown: tables, task lists, strikethrough and autolinks; `false` parses plain CommonMark. */
  gfm?: boolean
  /** A newline inside a paragraph breaks the line, as in GitHub comments and chat messages; otherwise it is a space, as in Markdown files. */
  breaks?: boolean
  /** Render raw HTML in the source through an allowlist of text and block tags (no scripts, styles, forms, frames or attributes that run code); otherwise it shows as typed. */
  html?: boolean
  /** Where absolute links (http(s) and protocol-relative URLs, which can lead to other sites) open; relative links, anchors and mailto/tel links always open in place. */
  linkTarget?: '_self' | '_blank'
  /** `rel` of every absolute link, whatever its target, such as `nofollow ugc noopener` for user content; an empty string adds none. */
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
/** The parse call's `breaks` turns a newline inside a paragraph into a line break in either dialect; marked's own needs gfm. */
const lineBreaks: TokenizerExtension = {
  name: 'breaks',
  level: 'inline',
  start(src) {
    return this.lexer.options.breaks ? src.search(/ *\n/) : undefined
  },
  tokenizer(src) {
    const newline = this.lexer.options.breaks ? /^ *\n(?!\s*$)/.exec(src) : null
    return newline ? { type: 'br', raw: newline[0] } : undefined
  },
}
const escape = (text: string) => text.replace(/[&<>]/g, (char) => `&#${char.charCodeAt(0)};`)
/** Private instances: a consumer's global `marked.use()` never changes what Markdown renders. */
const parsers = {
  html: new Marked({ renderer: tasks, extensions: [lineBreaks] }),
  text: new Marked({
    extensions: [lineBreaks],
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
/**
 * An http(s) or protocol-relative URL, read as browsers read it: spaces and control characters
 * around it and tabs and newlines in it are ignored, and `\` counts as `/`.
 */
const absolute = (href = '') => /^(?:https?:|[\\/]{2})/i.test(href.replace(/^[\0- ]+|[\t\n\r]/g, ''))

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
        if (absolute(attribs.href)) {
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

function render(source: string, gfm: boolean, breaks: boolean, html: boolean, options: IOptions) {
  try {
    return sanitizeHtml(parsers[html ? 'html' : 'text'].parse(source, { gfm, breaks, async: false }), options)
  } catch {
    // marked overflows the stack on a source nested thousands of levels deep.
    invalidProp('Markdown', 'children', source, 'showing it as text')
    return `<p>${escape(source)}</p>\n`
  }
}

/** Renders a Markdown source as sanitized HTML: GitHub Flavored Markdown by default, raw HTML only through an allowlist. */
export const Markdown = forwardRef<HTMLDivElement, MarkdownProps>(function Markdown(
  {
    children,
    gfm = true,
    breaks = false,
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
    () => render(source, gfm, breaks, html, sanitizeOptions(linkTarget, linkRel)),
    [source, gfm, breaks, html, linkTarget, linkRel],
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
