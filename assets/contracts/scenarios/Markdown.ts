import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / AI Answer',
    props: {
      content:
        '## Migration plan\n\n1. Back up production data.\n2. Apply the schema change.\n3. Verify the health check.\n\n```sql\nCREATE INDEX CONCURRENTLY idx_events_created_at ON events(created_at);\n```',
      gfm: true,
      safeMode: true,
      allowRawHtml: false,
      linkTarget: '_self',
      membrane: true,
      fullWidth: true,
    },
  },
  {
    name: 'Product / Release Notes',
    props: {
      content:
        '# Version 2.4\n\n- Added workspace templates\n- Improved audit logs\n- Fixed SSO session renewal\n\n[Read the upgrade guide](https://example.com/upgrade).',
      gfm: true,
      safeMode: true,
      linkTarget: '_blank',
      linkRel: 'noopener noreferrer',
      membrane: false,
      fullWidth: true,
    },
  },
] satisfies ProductScenarioPair
