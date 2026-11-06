import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Editor Mode',
    props: {
      'aria-label': 'Editor mode',
      orientation: 'horizontal',
      defaultValue: 'visual',
      membrane: true,
      items: [
        { value: 'visual', label: 'Visual' },
        { value: 'code', label: 'Code' },
      ],
    },
  },
  {
    name: 'Product / Visible Layers',
    props: {
      multiple: true,
      'aria-label': 'Visible layers',
      orientation: 'horizontal',
      defaultValue: ['grid', 'guides'],
      membrane: true,
      items: [
        { value: 'grid', label: 'Grid' },
        { value: 'guides', label: 'Guides' },
        { value: 'comments', label: 'Comments' },
      ],
    },
  },
] satisfies ProductScenarioPair
