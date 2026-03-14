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

export interface CodeProps {
  /** Source code string. */
  code: string
  /** Language hint (used as a data attribute for syntax highlighter integration). */
  language?: string
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
    const hasHeader = true

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
        el.style.left = '-9999px'
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
              {!canToggle && (
                <Button
                  icon={<Icon name="up" size={16} />}
                  iconOnly
                  fullWidth={false}
                  variant="default"
                  className="uf-code-action"
                  aria-label="Collapse unavailable"
                  title="Not enough content to collapse"
                  disabled
                />
              )}
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
                  {line}
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
