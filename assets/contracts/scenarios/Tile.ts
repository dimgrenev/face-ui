import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Active Project',
    props: {
      text: 'Production API',
      rightText: 'Healthy',
      tone: 'positive',
      icon: 'folder',
      active: true,
      fullWidth: true,
      align: 'left',
      actionVisibility: 'hover',
      membrane: true,
    },
  },
  {
    name: 'Product / Collapsible Workspace',
    props: {
      text: 'Customer success',
      rightText: '12',
      tone: 'neutral',
      icon: 'folder',
      chevron: 'down',
      interactive: true,
      'aria-expanded': false,
      active: true,
      fullWidth: true,
      align: 'left',
      actionVisibility: 'reveal',
      membrane: true,
    },
  },
] satisfies ProductScenarioPair
