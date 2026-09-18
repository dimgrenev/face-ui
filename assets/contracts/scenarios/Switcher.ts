import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Auto Save',
    props: {
      label: 'Auto save',
      defaultChecked: true,
      name: 'auto-save',
      value: 'enabled',
      membrane: true,
      fullWidth: true,
    },
  },
  {
    name: 'Product / Analytics Consent',
    props: {
      label: 'Product analytics',
      truncate: false,
      defaultChecked: false,
      name: 'analytics',
      value: 'allowed',
      membrane: true,
      fullWidth: true,
    },
  },
] satisfies ProductScenarioPair
