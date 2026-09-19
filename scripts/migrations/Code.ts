import type { Migration } from './types'

export default [
  { kind: 'text-to-children', component: 'Code', from: 'code', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Code', from: 'highlight', to: 'highlightedLines', codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'Code',
    prop: 'titleAttr',
    use: 'Remove it; a native tooltip on the whole block has no replacement (`title` is the header)',
    codemod: 'auto',
  },
  {
    kind: 'remove-prop',
    component: 'Code',
    prop: 'collapsedHeight',
    use: '`collapsedLines`, the number of lines a collapsed source shows (the old 160px showed about 7)',
    codemod: 'manual',
  },
  {
    kind: 'behavior',
    component: 'Code',
    before: 'A source collapsed when it had more than 8 lines or 240 characters, to `collapsedHeight` pixels',
    after: 'A source collapses when it has more lines than `collapsedLines` (default 8), to exactly that many lines',
  },
  {
    kind: 'behavior',
    component: 'Code',
    before: 'Without `title`, a short source had no copy button',
    after: 'The copy button is always there: in the header with `title`, otherwise at the inline end beside the source; a successful copy shows a check and announces `labels.copied`',
  },
  {
    kind: 'behavior',
    component: 'Code',
    before: '`tokenizedLines` supplied the source when `code` was omitted, and their text was shown even where it differed from `code`',
    after: '`children` is the only source; a line whose tokens spell other text renders plain and is reported, so what is shown is what is copied',
  },
  {
    kind: 'behavior',
    component: 'Code',
    before: 'A final line break rendered an empty, numbered last line',
    after: 'A final line break ends the last line; the copy button still copies it',
  },
  {
    kind: 'behavior',
    component: 'Code',
    before: 'The root carried `data-language`; lines carried `data-line` and `data-highlight`; the `pre` carried `is-collapsed`/`is-scrollable`',
    after: '`<code>` carries the `language-*` class; highlighted lines are `<mark>` elements; the root carries `data-state="collapsed" | "expanded"` when the source can collapse; the `pre` is `dir="ltr"` and `translate="no"`',
  },
] satisfies Migration[]
