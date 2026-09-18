import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Work Email',
    props: {
      type: 'email',
      label: 'Work email',
      description: 'Used for security alerts and account recovery.',
      placeholder: 'name@company.com',
      autoComplete: 'email',
      required: true,
      name: 'email',
      membrane: true,
    },
  },
  {
    name: 'Product / AI Prompt',
    props: {
      type: 'text',
      label: 'System instruction',
      placeholder: 'Describe how the assistant should behave...',
      multiline: true,
      autoGrow: true,
      maxLength: 4000,
      membrane: true,
    },
  },
] satisfies ProductScenarioPair
