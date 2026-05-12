/**
 * Code — source code display with optional line numbers, line highlighting,
 * title bar, copy-to-clipboard, and collapse/expand.
 *
 * `<Code code="const x = 1" language="tsx" />`
 * `<Code code={snippet} showLineNumbers highlight={[3, 5]} />`
 * `<Code code={snippet} title="example.ts" defaultCollapsed />`
 */

import { forwardRef, useState, useCallback, useMemo, type CSSProperties } from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { Text } from '../Text/Text'
import { Button } from '../Button/Button'
import { Icon } from '../Icon/Icon'

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------

export const codeAnatomy = createAnatomy('code').parts(
  'root',
  'pre',
  'line',
  'lineNumber',
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single token within a highlighted line. */
export interface CodeToken {
  content: string
  /** CSS color value or token reference. Omit for default text color. */
  color?: string
}

export interface CodeProps {
  /** Source code string. */
  code: string
  /** Language hint (used as a data attribute for syntax highlighter integration). */
  language?: string
  /**
   * Pre-tokenized lines from a syntax highlighter (e.g. Shiki).
   * When provided, renders colored tokens instead of plain text.
   * Each entry is an array of tokens for that line.
   */
  tokenizedLines?: CodeToken[][]
  /** Title shown in the header bar. */
  title?: string
  /** Whether to display line numbers. */
  showLineNumbers?: boolean
  /** Line numbers to visually highlight (1-based). */
  highlight?: number[]
  /** Start collapsed (auto-disables if content is short). */
  defaultCollapsed?: boolean
  /** Maximum height when collapsed (px). */
  collapsedHeight?: number
  /** Additional class name on the root element. */
  className?: string
  /** Wrapper attributes compatibility. */
  id?: string
  role?: string
  titleAttr?: string
  style?: CSSProperties
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Code = forwardRef<HTMLDivElement, CodeProps>(
  function Code(props, ref) {
    const {
      code,
      language,
      tokenizedLines: tokenLines,
      title,
      showLineNumbers = false,
      highlight = [],
      defaultCollapsed = false,
      collapsedHeight = 160,
      className,
      id,
      role,
      titleAttr,
      style,
    } = props

    const canToggle = (String(code || '').split('\n').length > 8) || (String(code || '').length > 240)
    const [collapsed, setCollapsed] = useState(Boolean(defaultCollapsed) && canToggle)

    const lines = useMemo(() => (code || '').split('\n'), [code])
    const highlightSet = useMemo(
      () => new Set(Array.isArray(highlight) ? highlight : []),
      [highlight],
    )

    const hasTitle = title != null
    const hasHeader = hasTitle || canToggle

    const onCopy = useCallback(async () => {
      const text = String(code ?? '')
      const canUseNavigatorClipboard =
        typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        typeof navigator.clipboard?.writeText === 'function' &&
        window.isSecureContext &&
        window.top === window.self

      if (canUseNavigatorClipboard) {
        try {
          await navigator.clipboard.writeText(text)
          return
        } catch {
          // fall through to legacy copy path
        }
      }

      if (typeof document === 'undefined') return

      try {
        const el = document.createElement('textarea')
        el.value = text
        el.setAttribute('readonly', 'true')
        el.style.position = 'fixed'
        el.style.left = '-9999em'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      } catch {
        // ignore
      }
    }, [code])

    const onToggle = useCallback(() => setCollapsed((v) => !v), [])

    return (
      <div
        ref={ref}
        {...codeAnatomy.getPartAttrs('root')}
        data-language={language}
        data-line-numbers={showLineNumbers || undefined}
        data-collapsed={collapsed || undefined}
        data-has-header={hasHeader || undefined}
        className={cn('uf-code', className)}
        id={id}
        role={role}
        title={titleAttr}
        style={style}
      >
        {hasHeader && (
          <div className="uf-code-header">
            {hasTitle && (
              <Text as="span" fullWidth className="uf-code-title">
                {title}
              </Text>
            )}
            <div className="uf-code-actions">
              <Button
                icon={<Icon name="copy" size={16} />}
                iconOnly
                fullWidth={false}
                variant="default"
                className="uf-code-action"
                aria-label="Copy code"
                title="Copy"
                onClick={onCopy}
              />
              {canToggle && (
                <Button
                  icon={<Icon name={collapsed ? 'down' : 'up'} size={16} />}
                  iconOnly
                  fullWidth={false}
                  variant="default"
                  className="uf-code-action"
                  aria-label={collapsed ? 'Expand code' : 'Collapse code'}
                  title={collapsed ? 'Expand' : 'Collapse'}
                  onClick={onToggle}
                />
              )}
              {/* Copy button is always available via header; no disabled button for collapse */}
            </div>
          </div>
        )}
        <pre
          {...codeAnatomy.getPartAttrs('pre')}
          style={collapsed ? { maxHeight: `${collapsedHeight}px` } : undefined}
          className={cn(
            collapsed && 'is-collapsed',
            !collapsed && canToggle && 'is-scrollable',
          )}
        >
          <code>
            {lines.map((line, index) => {
              const lineNum = index + 1
              const isHighlighted = highlightSet.has(lineNum)
              const tokens = tokenLines?.[index]

              return (
                <span
                  key={index}
                  {...codeAnatomy.getPartAttrs('line')}
                  data-highlight={isHighlighted || undefined}
                  data-line={lineNum}
                >
                  {showLineNumbers && (
                    <span
                      {...codeAnatomy.getPartAttrs('lineNumber')}
                      aria-hidden="true"
                    >
                      {lineNum}
                    </span>
                  )}
                  {tokens
                    ? tokens.map((tok, ti) =>
                        tok.color ? (
                          <span key={ti} style={{ color: tok.color }}>
                            {tok.content}
                          </span>
                        ) : (
                          <span key={ti}>{tok.content}</span>
                        ),
                      )
                    : line}
                  {'\n'}
                </span>
              )
            })}
          </code>
        </pre>
      </div>
    )
  },
)
