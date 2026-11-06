import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Analytics Views',
    props: {
      'aria-label': 'Analytics views',
      orientation: 'horizontal',
      activationMode: 'automatic',
      defaultValue: 'overview',
      variant: 'underline',
      membrane: true,
      renderPanels: true,
      items: [
        {
          value: 'overview',
          label: 'Overview',
          content: 'Key metrics and recent trends.',
        },
        {
          value: 'funnels',
          label: 'Funnels',
          content: 'Conversion performance by journey.',
        },
        {
          value: 'retention',
          label: 'Retention',
          content: 'Cohort retention over time.',
        },
      ],
    },
  },
  {
    name: 'Product / Settings Sections',
    props: {
      'aria-label': 'Settings sections',
      orientation: 'vertical',
      activationMode: 'manual',
      defaultValue: 'general',
      variant: 'pill',
      wrap: true,
      membrane: true,
      renderPanels: true,
      items: [
        {
          value: 'general',
          label: 'General',
          content: 'Workspace identity and defaults.',
        },
        {
          value: 'security',
          label: 'Security',
          content: 'Authentication and session policies.',
        },
        {
          value: 'billing',
          label: 'Billing',
          content: 'Plan and invoice settings.',
        },
      ],
    },
  },
] satisfies ProductScenarioPair
