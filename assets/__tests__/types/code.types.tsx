import { Code, type CodeToken } from '../../../index'

const tokens: CodeToken[][] = [[{ content: 'ls', color: '#fff' }]]
export const code = (
  <Code
    title={<b>install.sh</b>}
    language="bash"
    tokenizedLines={tokens}
    highlightedLines={[1]}
    collapsedLines={4}
    labels={{ copy: 'Copy', copied: 'Done' }}
    onCollapsedChange={({ collapsed }: { collapsed: boolean }) => collapsed}
    aria-label="Install"
  >
    ls
  </Code>
)
// @ts-expect-error The source is children; the code prop was removed.
export const codeProp = <Code code="ls" />
// @ts-expect-error The source is text, not elements.
export const codeElement = <Code><b>ls</b></Code>
// @ts-expect-error Marked lines are highlightedLines.
export const codeHighlight = <Code highlight={[1]}>ls</Code>
// @ts-expect-error A collapsed source is measured in lines: collapsedLines.
export const codeHeight = <Code collapsedHeight={160}>ls</Code>
// @ts-expect-error No native tooltip on the block: title is the header.
export const codeTitleAttr = <Code titleAttr="Snippet">ls</Code>
// @ts-expect-error Unknown label key.
export const codeLabel = <Code labels={{ copyCode: 'Copy' }}>ls</Code>
