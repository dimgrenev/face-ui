import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / AI Model Picker',
    props: {
      label: 'Model',
      placeholder: 'Choose model',
      defaultValue: 'balanced',
      'aria-label': 'AI model',
      surface: 'side',
      surfaceTitle: 'Choose model',
      stretchText: true,
      membrane: true,
      options: [
        { value: 'fast', label: 'Fast' },
        { value: 'balanced', label: 'Balanced' },
        { value: 'reasoning', label: 'Reasoning' },
      ],
    },
  },
  {
    name: 'Product / Team Filter',
    props: {
      multiple: true,
      label: 'Teams',
      placeholder: 'All teams',
      defaultValue: ['design', 'engineering'],
      'aria-label': 'Filter by team',
      surface: 'sheet',
      surfaceTitle: 'Filter teams',
      stretchText: true,
      membrane: true,
      options: [
        { value: 'design', label: 'Design' },
        { value: 'engineering', label: 'Engineering' },
        { value: 'sales', label: 'Sales' },
      ],
    },
  },
] satisfies ProductScenarioPair
