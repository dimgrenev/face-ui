import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Team Member',
    props: {
      src: '/assets/media/examples/office-core/lobby-glass-blocks.webp',
      name: 'Maya Chen',
      fallback: 'MC',
      fallbackDelayMs: 150,
    },
  },
  {
    name: 'Product / AI Assistant',
    props: {
      name: 'Research assistant',
      fallback: 'AI',
      fallbackDelayMs: 0,
    },
  },
] satisfies ProductScenarioPair
