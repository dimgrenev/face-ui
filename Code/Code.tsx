import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react'
import { createAnatomy } from '../assets/anatomy'
import { cn } from '../assets/utils'
import { hasSlotContent } from '../assets/slot-content'
import { getCardSurfaceProps } from '../assets/internal/card-surface'
import { useControllableState } from '../assets/adapters/react/use-controllable-state'
import { useIsomorphicLayoutEffect } from '../assets/adapters/react/use-isomorphic-layout-effect'
import { resolveLabels, type CommonLabels } from '../assets/runtime/labels'
import { invalidProp, readNumber } from '../assets/runtime/props'
import { Text } from '../Text/Text'
import { Button } from '../Button/Button'

export const codeAnatomy = createAnatomy('code').parts(
  'root',
  'pre',
  'line',
  'lineNumber',
)

/** One colored run of a line, as a syntax highlighter such as Shiki emits it. */
export interface CodeToken {
  /** Text of the run; the runs of a line spell that line of the source. */
  content: string
  /** CSS color of the run; without it the run keeps the block's text color. */
  color?: string
}

/** Names of Code's own buttons and its copy confirmation. */
export interface CodeLabels
  extends Pick<CommonLabels, 'copy' | 'expand' | 'collapse'> {
  /** Announced after the source reaches the clipboard, while the copy button shows a check. */
  copied: string
}

const defaultLabels: CodeLabels = Object.freeze({
  copy: 'Copy code',
  copied: 'Copied',
  expand: 'Expand code',
  collapse: 'Collapse code',
})
/** How long the copy button confirms a successful copy, in milliseconds. */
const CONFIRMATION = 2000

export interface CodeProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    'children' | 'title' | 'dangerouslySetInnerHTML' | 'defaultChecked' | 'defaultValue'
  > {
  /** Source text, shown line by line and copied verbatim; a final line break ends the last line instead of adding an empty one. */
  children?: string
  /** Language of the source, set as the `language-*` class of `<code>` for highlighters; Code itself does not color the text. */
  language?: string
  /** Syntax colors from a highlighter, one token array per line of `children`; a line whose tokens spell other text renders plain. */
  tokenizedLines?: readonly (readonly CodeToken[])[]
  /** Header text such as a file name; without it a one-line source keeps its copy button beside it instead of a header. */
  title?: ReactNode
  /** Number each line in a gutter that is never selected, copied or read aloud. */
  showLineNumbers?: boolean
  /** Numbers of the lines to mark, whole and from 1; each renders as a highlighted `<mark>`. */
  highlightedLines?: readonly number[]
  /** Controlled collapse: a source longer than `collapsedLines` shows only its first lines and cannot scroll; a shorter one always shows in full. */
  collapsed?: boolean
  /** Uncontrolled `collapsed` on mount; read once. */
  defaultCollapsed?: boolean
  /** Called when the user collapses or expands the source; prop updates are silent. */
  onCollapsedChange?: (details: { collapsed: boolean }) => void
  /** Lines a collapsed source shows, an integer from 1; a source with no more lines cannot collapse. */
  collapsedLines?: number
  /** Names of the copy and collapse buttons and the copy confirmation. */
  labels?: Partial<CodeLabels>
}

/** The source's lines: split like a highlighter splits them, a final line break closing the last line. */
function readLines(children: unknown): readonly string[] {
  if (typeof children !== 'string') {
    if (children != null)
      invalidProp('Code', 'children', children, 'rendering an empty source')
    return ['']
  }
  return children.replace(/\r?\n$/, '').split(/\r?\n/)
}

/** Each line's tokens, or null where they are missing or spell other text (reported once). */
function readTokens(tokenizedLines: unknown, lines: readonly string[]) {
  if (tokenizedLines == null) return undefined
  const rows: unknown[] = Array.isArray(tokenizedLines) ? tokenizedLines : []
  const tokens = lines.map((line, index) => {
    const row = rows[index]
    return Array.isArray(row) &&
      row.map((token: CodeToken | null) => token?.content).join('') === line
      ? (row as readonly CodeToken[])
      : null
  })
  if (tokens.includes(null))
    invalidProp('Code', 'tokenizedLines', tokenizedLines, 'rendering lines whose tokens do not spell children as plain text')
  return tokens
}

function readMarked(highlightedLines: unknown): ReadonlySet<number> {
  if (highlightedLines === undefined) return new Set()
  if (!Array.isArray(highlightedLines)) {
    invalidProp('Code', 'highlightedLines', highlightedLines, 'marking no line')
    return new Set()
  }
  const marked = highlightedLines.filter((line) => Number.isInteger(line) && line > 0)
  if (marked.length < highlightedLines.length)
    invalidProp('Code', 'highlightedLines', highlightedLines, 'marking only its whole line numbers from 1')
  return new Set(marked)
}

/** Whether the user can scroll `pre`: true while it overflows, kept current as its box or content resizes. */
function useScrollable(pre: RefObject<HTMLPreElement | null>, enabled: boolean) {
  const [scrollable, setScrollable] = useState(false)
  useEffect(() => {
    const node = pre.current
    if (!enabled || !node || typeof ResizeObserver === 'undefined') {
      setScrollable(false)
      return
    }
    const observer = new ResizeObserver(() =>
      setScrollable(node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight),
    )
    observer.observe(node)
    if (node.firstElementChild) observer.observe(node.firstElementChild)
    return () => observer.disconnect()
  }, [enabled])
  return scrollable
}

/** A block of source code with an optional title, line numbers, marked lines, syntax colors, copy and collapse. */
export const Code = forwardRef<HTMLDivElement, CodeProps>(function Code(
  {
    children,
    language,
    tokenizedLines,
    title,
    showLineNumbers = false,
    highlightedLines,
    collapsed: collapsedProp,
    defaultCollapsed = false,
    onCollapsedChange,
    collapsedLines = 8,
    labels,
    className,
    ...rest
  },
  ref,
) {
  const lines = readLines(children)
  const tokens = readTokens(tokenizedLines, lines)
  const marked = readMarked(highlightedLines)
  const visibleLines = readNumber('Code', 'collapsedLines', collapsedLines, 8, { integer: true, min: 1 })
  const text = resolveLabels(defaultLabels, labels, 'Code')

  const [collapsedIntent, setCollapsed] = useControllableState({
    value: collapsedProp,
    defaultValue: defaultCollapsed,
    onChange: (collapsed) => onCollapsedChange?.({ collapsed }),
    name: ['Code', 'collapsed'],
  })
  // The intent is kept; a source that fits in `collapsedLines` shows in full.
  const collapsible = lines.length > visibleLines
  const collapsed = collapsible && Boolean(collapsedIntent)

  const preRef = useRef<HTMLPreElement>(null)
  const scrollable = useScrollable(preRef, !collapsed)
  // A collapsed source cannot scroll (overflow: clip); expanding it starts again from its first line.
  useIsomorphicLayoutEffect(() => {
    const pre = preRef.current
    if (!collapsed && pre) pre.scrollTop = pre.scrollLeft = 0
  }, [collapsed])

  // Successful copies since the confirmation last ended; each one restarts it.
  const [copies, setCopies] = useState(0)
  useEffect(() => {
    if (!copies) return
    const timer = setTimeout(() => setCopies(0), CONFIRMATION)
    return () => clearTimeout(timer)
  }, [copies])

  const titled = hasSlotContent(title)
  const toggleName = collapsed ? text.expand : text.collapse
  const actions = (
    <div className="uf-code-actions">
      <Button
        icon={copies ? 'check' : 'copy'}
        iconOnly
        className="uf-code-action"
        title={text.copy}
        copyText={typeof children === 'string' ? children : ''}
        onCopied={() => setCopies((count) => count + 1)}
      >
        {text.copy}
      </Button>
      {collapsible && (
        <Button
          icon={collapsed ? 'arrow-down' : 'arrow-up'}
          iconOnly
          className="uf-code-action"
          title={toggleName}
          onClick={() => setCollapsed(!collapsed)}
        >
          {toggleName}
        </Button>
      )}
      <span role="status" className="uf-visually-hidden">
        {/* A new node per copy, so a repeated copy is announced again. */}
        {copies ? <span key={copies}>{text.copied}</span> : null}
      </span>
    </div>
  )

  return (
    <div
      ref={ref}
      {...rest}
      {...codeAnatomy.getPartAttrs('root')}
      {...getCardSurfaceProps({
        variant: 'code',
        padding: 'none',
        radius: 'md',
        border: true,
        hoverable: false,
        fullWidth: true,
        className: cn('uf-code', className),
      })}
      data-state={collapsible ? (collapsed ? 'collapsed' : 'expanded') : undefined}
    >
      {titled || lines.length > 1 ? (
        <div className="uf-code-header">
          {titled && (
            <Text as="span" fullWidth className="uf-code-title">
              {title}
            </Text>
          )}
          {actions}
        </div>
      ) : (
        actions
      )}
      <pre
        ref={preRef}
        {...codeAnatomy.getPartAttrs('pre')}
        dir="ltr"
        translate="no"
        tabIndex={scrollable ? 0 : undefined}
        style={{ '--uf-code-collapsed-lines': visibleLines } as CSSProperties}
      >
        <code className={language ? `language-${language}` : undefined}>
          {lines.map((line, index) => {
            const Line = marked.has(index + 1) ? 'mark' : 'span'
            const lineTokens = tokens?.[index]
            return (
              <Line key={index} {...codeAnatomy.getPartAttrs('line')}>
                {showLineNumbers && (
                  <span
                    {...codeAnatomy.getPartAttrs('lineNumber')}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                )}
                {lineTokens
                  ? lineTokens.map((token, at) => (
                      <span
                        key={at}
                        style={token?.color ? { color: token.color } : undefined}
                      >
                        {token?.content}
                      </span>
                    ))
                  : line}
                {'\n'}
              </Line>
            )
          })}
        </code>
      </pre>
    </div>
  )
})
