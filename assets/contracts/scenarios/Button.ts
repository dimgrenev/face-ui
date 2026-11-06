import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Create Workspace',
    props: {
      children: 'Create workspace',
      icon: 'plus',
      variant: 'accent',
      fullWidth: false,
      align: 'start',
      membrane: true,
    },
  },
  {
    name: 'Product / Revoke API Key',
    props: {
      children: 'Revoke key',
      icon: 'close',
      variant: 'destructive',
      fullWidth: false,
      loading: false,
      membrane: true,
    },
  },
] satisfies ProductScenarioPair
