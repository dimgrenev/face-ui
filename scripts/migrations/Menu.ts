import type { Migration } from './types'

export default [
  {
    kind: 'behavior',
    component: 'Menu',
    before: 'The `.uf-menu` root was a `<div>`',
    after: 'It is a `<span>`, so a Menu is valid inside a `<p>`; select it by class',
  },
  { kind: 'rename-prop', component: 'Menu', from: 'trigger', to: 'openOn', codemod: 'auto' },
  { kind: 'rename-prop', component: 'Menu', from: 'surfaceTitle', to: 'aria-label', codemod: 'auto' },
  {
    kind: 'remove-prop',
    component: 'Menu',
    prop: 'surfaceBreakpoint',
    use: 'Remove it; `surface="auto"` becomes a sheet below 900px',
    codemod: 'auto',
  },
  { kind: 'export', from: 'Menu/Menu#MenuItemDef', to: 'Menu/Menu#MenuItem', codemod: 'auto' },
  {
    kind: 'export',
    from: 'Menu/Menu#MenuSeparatorDef',
    to: '`MenuItemEntry`, which includes `{ type: "separator" }`',
    codemod: 'manual',
  },
  {
    kind: 'export',
    from: 'Menu/Menu#MenuGroupDef',
    to: '`MenuItemEntry`, which includes `{ type: "group", label, items }`',
    codemod: 'manual',
  },
  {
    kind: 'behavior',
    component: 'Menu',
    before: 'Without children the trigger was an "Options" button, and "Options" titled the sheet',
    after: 'Without children nothing renders; the sheet is titled by `aria-label`, else by text children',
  },
  {
    kind: 'behavior',
    component: 'Menu',
    before: '`surfaceTitle` only titled the sheet; the menu had no accessible name',
    after: '`aria-label` names the menu and titles the sheet; without it a click menu is named by its trigger',
  },
  {
    kind: 'behavior',
    component: 'Menu',
    before: '`ref` pointed to the `.uf-menu-content` surface, which stayed in the document while closed',
    after: '`ref` and native attributes go on the `[role="menu"]` list, which exists only while open; `className` and `style` stay on `.uf-menu-content`',
  },
  {
    kind: 'behavior',
    component: 'Menu',
    before: 'Items were Face UI Buttons (`.uf-button`, `[data-scope="button"]`)',
    after: 'Items are `[data-scope="menu"][data-part="item"].uf-menu-item` buttons, or links with `href`; the label is `.uf-menu-itemLabel`',
  },
  {
    kind: 'behavior',
    component: 'Menu',
    before: '`.uf-menu` and `.uf-menu-content` carried `data-trigger="click|context"`',
    after: 'They carry `data-open-on="click|context"`, after the prop',
  },
  {
    kind: 'behavior',
    component: 'Menu',
    before: 'Typeahead read the text inside an item label that was an element',
    after: 'Typeahead reads `textValue`, else a text `label`; give an element label a `textValue` to keep it searchable',
  },
  {
    kind: 'behavior',
    component: 'Menu',
    before: 'A context menu opened below its trigger',
    after: 'It opens at the pointer; `side`, `align` and `sideOffset` place click menus only',
  },
  {
    kind: 'behavior',
    component: 'Menu',
    before: 'A press inside the context area kept an open context menu open, and closing it moved focus to the area or its first focusable element',
    after: 'Any press outside the menu closes it, and a right-click reopens it at the new point; focus returns to where it was when the menu opened',
  },
  {
    kind: 'behavior',
    component: 'Menu',
    before: 'Opening by click kept focus on the trigger; Tab left the menu open; disabling an open menu left it open',
    after: 'A click focuses the menu list and a key opens at the first or last item; Tab closes it from the trigger; `disabled` closes it',
  },
] satisfies Migration[]
