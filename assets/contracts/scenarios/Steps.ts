import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Workspace Onboarding',
    props: {
      defaultStep: 1,
      linear: true,
      items: [
        { label: 'Workspace', content: 'Choose a name and region.' },
        { label: 'Team', content: 'Invite owners and collaborators.' },
        {
          label: 'Integrations',
          content: 'Connect source control and notifications.',
        },
        { label: 'Review', content: 'Confirm configuration before launch.' },
      ],
    },
  },
  {
    name: 'Product / Deployment Pipeline',
    props: {
      defaultStep: 2,
      linear: false,
      items: [
        { label: 'Build', content: 'Application bundle created.' },
        { label: 'Test', content: 'Unit and integration checks passed.' },
        { label: 'Deploy', content: 'Production rollout is in progress.' },
        {
          label: 'Verify',
          content: 'Health checks will confirm the release.',
        },
      ],
    },
  },
] satisfies ProductScenarioPair
