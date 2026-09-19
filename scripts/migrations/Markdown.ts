import type { Migration } from './types'

export default [
  { kind: 'text-to-children', component: 'Markdown', from: 'content', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Markdown', from: 'allowRawHtml', to: 'html', codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'Markdown',
    prop: 'safeMode',
    use: 'Remove it: sanitization is always on, and `html` alone decides whether raw HTML renders (`safeMode={false}` without `allowRawHtml` changed nothing)',
    codemod: 'auto',
  },
  {
    kind: 'remove-prop',
    component: 'Markdown',
    prop: 'fullWidth',
    use: 'Remove it: Markdown always fills its container; `fullWidth={false}` narrowed it only inside a membrane',
    codemod: 'auto',
  },
  {
    kind: 'behavior',
    component: 'Markdown',
    before: 'Markdown had the 1px outer spacing box of `membrane` by default',
    after: 'Block content has none by default, like Table and Media; pass `membrane` to keep it',
  },
  {
    kind: 'behavior',
    component: 'Markdown',
    before: 'Without `allowRawHtml`, a raw HTML block vanished with its text and inline tags were dropped; with it, `safeMode` chose between Markdown tags only and a wider set',
    after: 'Without `html`, raw HTML shows as the text it was typed as; with `html` it renders through one allowlist of text and block tags (details, kbd, sup, div, …), never scripts, styles, forms, frames, ids or classes',
  },
  {
    kind: 'behavior',
    component: 'Markdown',
    before: '`linkTarget` applied to every link not starting with `/` or `#` (a relative `docs/x` opened in a new tab, `//host` in place), and `linkRel` only to links opening in a new tab',
    after: '`linkTarget` and `linkRel` apply to links to other sites: http(s) and protocol-relative URLs. `linkRel` (default `noopener noreferrer`) applies whatever the target; a link that opens in place has no `target`',
  },
  {
    kind: 'behavior',
    component: 'Markdown',
    before: 'A task checkbox was named "Completed task" or "Incomplete task"',
    after: 'A task checkbox and its text share a `<label>`, so the checkbox is named by its task and announces its own checked state',
  },
  {
    kind: 'behavior',
    component: 'Markdown',
    before: 'The HTML sat in an inner `[data-part="content"]` element, and the root carried `data-full-width`',
    after: 'The root holds the HTML itself; there is no content part and no `data-full-width`',
  },
  {
    kind: 'behavior',
    component: 'Markdown',
    before: 'Table cells were always left-aligned, overriding GFM column alignment; lists and quotes were indented from the left and task lists lost their indent',
    after: 'Columns follow their alignment and unaligned cells start at the inline start; lists, quotes and task checkboxes follow the text direction, a task checkbox takes its bullet’s place, and code blocks read left to right',
  },
] satisfies Migration[]
