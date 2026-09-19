import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Account Settings',
    props: {
      multiple: true,
      collapsible: true,
      defaultExpanded: ['profile', 'security'],
      items: [
        {
          value: 'profile',
          label: 'Profile and workspace',
          icon: 'account',
          content:
            'Company details, workspace identity, and member preferences.',
        },
        {
          value: 'security',
          label: 'Security',
          icon: 'settings',
          content: 'Single sign-on, sessions, and recovery policies.',
        },
        {
          value: 'billing',
          label: 'Billing',
          icon: 'file',
          content: 'Plan, invoices, and payment methods.',
        },
      ],
    },
  },
  {
    name: 'Product / AI Run Details',
    props: {
      multiple: false,
      collapsible: true,
      defaultExpanded: ['reasoning'],
      items: [
        {
          value: 'reasoning',
          label: 'Reasoning summary',
          icon: 'component',
          content:
            'The agent compared three implementation paths before selecting the safest migration.',
        },
        {
          value: 'tools',
          label: 'Tool activity',
          icon: 'props',
          content:
            'Search, code inspection, and verification calls used for this run.',
        },
        {
          value: 'sources',
          label: 'Sources',
          icon: 'link',
          content:
            'Documentation and repository references used in the answer.',
        },
      ],
    },
  },
] satisfies ProductScenarioPair
