import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Dashboard Heading',
    props: {
      children: 'Revenue overview',
      variant: 'h2',
      size: 'xl',
      as: 'h2',
      inset: 'control',
      fullWidth: true,
      align: 'start',
      membrane: true,
    },
  },
  {
    name: 'Product / Keyboard Shortcut',
    props: {
      children: 'Cmd K',
      variant: 'kbd',
      size: 'sm',
      as: 'kbd',
      inset: 'none',
      fullWidth: false,
      align: 'center',
      membrane: true,
    },
  },
] satisfies ProductScenarioPair
