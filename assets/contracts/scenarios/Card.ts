import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Usage Summary',
    props: {
      title: 'API usage',
      children: '1.8M of 2M monthly tokens used across production agents.',
      padding: 'default',
      radius: 'lg',
      border: true,
      footerAlign: 'between',
      footer: {
        __componentName__: 'Button',
        children: 'View usage',
        icon: 'arrow-right',
        iconPosition: 'end',
        fullWidth: false,
      },
    },
  },
  {
    name: 'Product / AI Approval',
    props: {
      title: 'Approve database migration?',
      description: 'Production change',
      children: 'The agent will add one index and backfill 24,600 records.',
      radius: 'lg',
      hoverable: true,
      footerAlign: 'end',
      footer: [
        {
          __componentName__: 'Button',
          children: 'Review SQL',
          variant: 'outline',
          fullWidth: false,
        },
        {
          __componentName__: 'Button',
          children: 'Approve',
          variant: 'accent',
          fullWidth: false,
        },
      ],
    },
  },
] satisfies ProductScenarioPair
