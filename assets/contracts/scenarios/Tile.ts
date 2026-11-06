import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Active Project',
    props: {
      children: 'Production API',
      meta: 'Healthy',
      tone: 'positive',
      icon: 'folder',
      active: true,
      fullWidth: true,
      align: 'start',
      actionVisibility: 'hover',
      membrane: true,
    },
  },
  {
    name: 'Product / Collapsible Workspace',
    props: {
      children: 'Customer success',
      meta: '12',
      tone: 'neutral',
      icon: 'folder',
      chevron: 'down',
      'aria-expanded': false,
      active: true,
      fullWidth: true,
      align: 'start',
      actionVisibility: 'reveal',
      membrane: true,
    },
  },
] satisfies ProductScenarioPair
