import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Toc', from: 'activeId', to: 'value', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Toc', from: 'defaultActiveId', to: 'defaultValue', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Toc', from: 'onActiveChange', to: 'onValueChange', codemod: 'auto' },
  {
    kind: 'retype-prop',
    component: 'Toc',
    prop: 'onValueChange',
    before: '`details.id`',
    after: '`details.value`',
    codemod: 'manual',
    legacy: String.raw`\bid\b`,
  },
  // Rows run in order: lineSide becomes line first, so withLine={false} beside it is left for review.
  { kind: 'rename-prop', component: 'Toc', from: 'lineSide', to: 'line', codemod: 'auto' },
  { kind: 'rename-value', component: 'Toc', prop: 'line', values: { left: 'start', right: 'end' }, codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'Toc',
    prop: 'withLine',
    use: '`line="none"` hides the rail; `line` defaults to `"start"`',
    codemod: 'auto',
    values: { true: '', false: 'line="none"' },
  },
  { kind: 'remove-prop', component: 'Toc', prop: 'items[].id', use: '`items[].value`', codemod: 'manual' },
  {
    kind: 'remove-prop',
    component: 'Toc',
    prop: 'items[].disabled',
    use: 'Leave out an entry whose section is not in the document',
    codemod: 'manual',
  },
  {
    kind: 'behavior',
    component: 'Toc',
    before: 'Entries were buttons: a click only reported the id, and the page scrolled if the handler did it; clicking the current entry reported nothing',
    after: 'Entries are links to `#value`: the browser scrolls to the section and updates the hash; `onSelect({ value, event })` fires on every follow, the current entry included, and `event.preventDefault()` there keeps the page still (for a scroll of your own)',
  },
  {
    kind: 'behavior',
    component: 'Toc',
    before: 'Without `activeId` or `defaultActiveId` the first entry was current',
    after: 'No entry is current until one is followed or `value`/`defaultValue` names it; a `defaultValue` waits for items that arrive later',
  },
  {
    kind: 'behavior',
    component: 'Toc',
    before: '`level` only indented a flat list of Face UI buttons, `button.uf-toc-item[data-scope="button"]`, with a `.uf-toc-indicator` element',
    after: 'A deeper entry nests in a `<ul>` under the previous shallower one: `nav > ul[data-part="list"] > li.uf-toc-item > a.uf-toc-link[data-part="link"]`; the marker is the top list\'s `::after`',
  },
  {
    kind: 'behavior',
    component: 'Toc',
    before: 'The contract promised ArrowUp/ArrowDown between entries, but only Tab worked; long labels were cut with an ellipsis',
    after: 'Tab and Enter work as for any links and arrow keys scroll the page; long labels wrap',
  },
  {
    kind: 'behavior',
    component: 'Toc',
    before: 'The nav was always named "Table of contents" and took no native attributes',
    after: 'Native attributes and `ref` reach the `<nav>`; `aria-label` or `aria-labelledby` replaces the default name',
  },
] satisfies Migration[]
