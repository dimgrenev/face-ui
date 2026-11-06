import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Filter Builder',
    props: {
      children: 'Add filter',
      content: 'Status is Active and owner is Current user.',
      side: 'bottom',
      align: 'start',
      sideOffset: 4,
      open: true,
    },
  },
  {
    name: 'Product / AI Citation',
    props: {
      children: 'Source 3',
      content: 'Authentication guide, section 4.2: Session renewal.',
      side: 'right',
      align: 'center',
      sideOffset: 6,
      open: true,
    },
  },
] satisfies ProductScenarioPair
