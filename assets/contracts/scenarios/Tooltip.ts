import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Keyboard Shortcut Hint',
    props: {
      children: 'Search',
      content: 'Search workspace - Cmd K',
      side: 'bottom',
      align: 'center',
      sideOffset: 2,
      openDelay: 300,
      closeDelay: 80,
      open: true,
    },
  },
  {
    name: 'Product / Disabled Action Help',
    props: {
      children: 'Deploy',
      content: 'Resolve two failing checks before deploying.',
      side: 'top',
      align: 'end',
      sideOffset: 4,
      openDelay: 150,
      closeDelay: 100,
      open: true,
    },
  },
] satisfies ProductScenarioPair
