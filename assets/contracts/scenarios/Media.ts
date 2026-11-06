import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Dashboard Screenshot',
    props: {
      type: 'image',
      src: '/assets/media/examples/office-core/lobby-day.webp',
      alt: 'Analytics dashboard overview',
      objectFit: 'contain',
      height: 320,
      fallback: 'Screenshot unavailable',
    },
  },
  {
    name: 'Product / Customer Portrait',
    props: {
      type: 'image',
      src: '/assets/media/examples/office-core/lobby-glass-blocks.webp',
      alt: 'Customer profile portrait',
      variant: 'circle',
      width: 96,
      membrane: true,
    },
  },
] satisfies ProductScenarioPair
