import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Terms Accepted',
    props: {
      label: 'I agree to the Terms of Service',
      defaultChecked: true,
      required: true,
      name: 'terms',
      membrane: true,
    },
  },
  {
    name: 'Product / Partial Selection',
    props: {
      label: 'Select all team members',
      checked: 'indeterminate',
      name: 'members',
      membrane: true,
    },
  },
] satisfies ProductScenarioPair
