import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Repository Path',
    props: {
      separator: '/',
      membrane: true,
      maxItems: 4,
      items: [
        { label: 'workspace' },
        { label: 'apps' },
        { label: 'dashboard' },
        { label: 'components' },
        { label: 'Button.tsx' },
      ],
    },
  },
  {
    name: 'Product / Checkout Flow',
    props: {
      separator: '/',
      membrane: true,
      maxItems: 5,
      items: [
        { label: 'Cart', href: '#cart' },
        { label: 'Delivery', href: '#delivery' },
        { label: 'Payment', href: '#payment' },
        { label: 'Review' },
      ],
    },
  },
] satisfies ProductScenarioPair
