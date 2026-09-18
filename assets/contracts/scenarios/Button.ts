import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Create Workspace',
    props: {
      text: 'Create workspace',
      icon: 'plus',
      variant: 'accent',
      fullWidth: false,
      align: 'left',
      membrane: true,
    },
  },
  {
    name: 'Product / Revoke API Key',
    props: {
      text: 'Revoke key',
      icon: 'close',
      variant: 'destructive',
      fullWidth: false,
      loading: false,
      membrane: true,
    },
  },
] satisfies ProductScenarioPair
