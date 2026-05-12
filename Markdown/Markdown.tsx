/**
 * Markdown — safe GFM renderer for rich text content.
 *
 * `<Markdown content={"# Title\\n\\n- item"} />`
 * `<Markdown content={md} allowRawHtml safeMode={false} />`
 */

import { forwardRef, useMemo, type HTMLAttributes } from 'react'
import sanitizeHtml from 'sanitize-html'
import { marked } from 'marked'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'

export const markdownAnatomy = createAnatomy('markdown').parts('root', 'content')

export interface MarkdownProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content'> {
  /** Markdown source text. */
  content?: string
  /** Enable GitHub Flavored Markdown extensions. */
  gfm?: boolean
  /** Strict sanitization mode for product-safe rendering. */
  safeMode?: boolean
  /** Allow raw HTML blocks from markdown source (still sanitized). */
  allowRawHtml?: boolean
  /** Link target behavior for rendered anchors. */
  linkTarget?: '_self' | '_blank'
  /** Link rel value for rendered anchors. */
  linkRel?: string
  /** Outer membrane wrapper around component geometry. */
  membrane?: boolean
  /** Expand component to full width. */
  fullWidth?: boolean
}

function hasGfmSyntax(source: string): boolean {
  const value = String(source || '')
  // Heuristic: GFM-only patterns (task lists / pipe tables / strikethrough).
  return (
    /(^|\n)\s*[-*]\s+\[[ xX]\]\s+/.test(value) ||
    /(^|\n)\s*\|.+\|\s*\n\s*\|(?:\s*:?-+:?\s*\|)+/m.test(value) ||
    /~~[^~]+~~/.test(value)
  )
}

function stripHtmlTokens(value: any): any {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripHtmlTokens(item))
      .filter((item) => item != null)
  }
  if (!value || typeof value !== 'object') return value
  if (value.type === 'html') return null
  const out: Record<string, any> = { ...value }
  for (const key of Object.keys(out)) {
    out[key] = stripHtmlTokens(out[key])
  }
  return out
}

function getStrictSanitizeOptions(linkTarget: '_self' | '_blank', linkRel: string) {
  return {
    allowedTags: [
      'p', 'br', 'hr',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote',
      'ul', 'ol', 'li',
      'a',
      'strong', 'em', 'del',
      'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img',
      'input',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title'],
      th: ['align'],
      td: ['align'],
      ol: ['start'],
      input: ['type', 'checked', 'disabled'],
      code: ['class'],
    } as Record<string, string[]>,
    allowedClasses: {
      code: [/^language-/],
    } as Record<string, Array<string | RegExp>>,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    } as Record<string, string[]>,
    transformTags: {
      a: (_tagName: string, attribs: Record<string, string>) => {
        const href = String(attribs.href || '')
        const isInternal = href.startsWith('/') || href.startsWith('#')
        const target = isInternal ? '_self' : linkTarget
        const rel = target === '_blank' ? linkRel : (attribs.rel || '')
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            target,
            rel,
          },
        }
      },
      input: (_tagName: string, attribs: Record<string, string>) => ({
        tagName: 'input',
        attribs: {
          ...attribs,
          type: attribs.type === 'checkbox' ? 'checkbox' : 'checkbox',
          disabled: 'disabled',
        },
      }),
    } as Record<string, any>,
  }
}

function getRelaxedSanitizeOptions(linkTarget: '_self' | '_blank', linkRel: string) {
  const allowedTags = Array.from(new Set([
    ...(sanitizeHtml.defaults.allowedTags || []),
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'input',
    'hr',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ]))
  return {
    allowedTags,
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'name', 'target', 'title', 'rel'],
      img: ['src', 'alt', 'title'],
      th: ['align'],
      td: ['align'],
      ol: ['start'],
      input: ['type', 'checked', 'disabled'],
      code: ['class'],
    } as Record<string, string[]>,
    allowedClasses: {
      code: [/^language-/],
    } as Record<string, Array<string | RegExp>>,
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
    } as Record<string, string[]>,
    transformTags: {
      a: (_tagName: string, attribs: Record<string, string>) => {
        const href = String(attribs.href || '')
        const isInternal = href.startsWith('/') || href.startsWith('#')
        const target = isInternal ? '_self' : linkTarget
        const rel = target === '_blank' ? linkRel : (attribs.rel || '')
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            target,
            rel,
          },
        }
      },
    } as Record<string, any>,
  }
}

export const Markdown = forwardRef<HTMLDivElement, MarkdownProps>(
  function Markdown(props, ref) {
    const {
      content = '',
      gfm = true,
      safeMode = true,
      allowRawHtml = false,
      linkTarget = '_self',
      linkRel = 'noopener noreferrer',
      membrane = true,
      fullWidth = true,
      className,
      ...rest
    } = props

    const html = useMemo(() => {
      try {
        const source = String(content || '')
        const effectiveGfm = Boolean(gfm || hasGfmSyntax(source))
        const lexed = marked.lexer(source, { gfm: effectiveGfm, breaks: true }) as any[]
        const tokens = allowRawHtml ? lexed : (stripHtmlTokens(lexed) as any[])
        const parsed = marked.parser(tokens, { gfm: effectiveGfm, breaks: true }) as string
        const sanitizeOptions = safeMode
          ? getStrictSanitizeOptions(linkTarget, linkRel)
          : getRelaxedSanitizeOptions(linkTarget, linkRel)
        return sanitizeHtml(parsed, sanitizeOptions as any)
      } catch {
        return ''
      }
    }, [content, gfm, allowRawHtml, safeMode, linkTarget, linkRel])

    const rootNode = (
      <div
        ref={ref}
        {...markdownAnatomy.getPartAttrs('root')}
        data-full-width={fullWidth ? '' : undefined}
        className={cn('uf-markdown', className)}
        {...rest}
      >
        <div
          {...markdownAnatomy.getPartAttrs('content')}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    )

    if (!membrane) return rootNode

    return (
      <span className={cn('uf-membrane', fullWidth && 'uf-membrane--full')}>
        {rootNode}
      </span>
    )
  },
)
