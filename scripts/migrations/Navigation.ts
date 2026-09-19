import type { Migration } from './types'

export default [
  { kind: 'rename-prop', component: 'Navigation', from: 'activeId', to: 'value', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Navigation', from: 'defaultActiveId', to: 'defaultValue', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Navigation', from: 'onActiveChange', to: 'onValueChange', codemod: 'auto' },
  {
    kind: 'retype-prop',
    component: 'Navigation',
    prop: 'onValueChange',
    before: '`details.id`',
    after: '`details.value`',
    codemod: 'manual',
    legacy: String.raw`\.id\b|\{\s*id\s*\}`,
  },
  {
    kind: 'remove-prop',
    component: 'Navigation',
    prop: 'items[].id',
    use: '`items[].value`',
    codemod: 'manual',
  },
  {
    kind: 'remove-prop',
    component: 'Navigation',
    prop: 'orientation',
    use: 'Remove it: the bar is horizontal; a vertical navigation is `Panel`',
    codemod: 'manual',
  },
  {
    kind: 'remove-prop',
    component: 'Navigation',
    prop: 'surfaceBreakpoint',
    use: 'Remove it; `surface="auto"` becomes a sheet below 900px',
    codemod: 'auto',
  },
  { kind: 'rename-prop', component: 'Navigation', from: 'surfaceTitle', to: 'aria-label', codemod: 'auto' },
  {
    kind: 'behavior',
    component: 'Navigation',
    before: 'A `<div role="navigation">` with a `menubar` of `menuitem`s; `className` and `ref` moved to the sheet host and dialog on narrow screens',
    after: 'A `<nav>` landmark of links and disclosure buttons (APG disclosure navigation) on every surface; native attributes, `className`, `style` and `ref` stay on it',
  },
  {
    kind: 'behavior',
    component: 'Navigation',
    before: '`items[].onClick()` took no event and cancelled the item\'s `href`',
    after: '`items[].onClick(event)` runs first; the link is followed unless it calls `event.preventDefault()`, and the item still becomes current',
  },
  {
    kind: 'behavior',
    component: 'Navigation',
    before: 'Items nested two levels deep rendered as a labelled section of the dropdown',
    after: 'A dropdown section is `{ type: "group", label, items }`; `items` of a dropdown link are ignored',
  },
  {
    kind: 'behavior',
    component: 'Navigation',
    before: 'Hovering a dropdown item opened it at once, and `onActiveChange` also fired when `activeId` changed from the parent',
    after: 'Hover opens after 200 ms and closes 150 ms after leaving; `onValueChange` reports only user activations',
  },
  {
    kind: 'behavior',
    component: 'Navigation',
    before: 'In the sheet, links were buttons that called `location.assign`, and the sheet was titled "Navigation"',
    after: 'The sheet is a modal bottom sheet of real links, titled by `aria-label`; `labels.open` and `labels.close` name its buttons',
  },
] satisfies Migration[]
