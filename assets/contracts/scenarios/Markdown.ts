import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / AI Answer',
    props: {
      children:
        '## Migration plan\n\n1. Back up production data.\n2. Apply the schema change.\n3. Verify the health check.\n\n```sql\nCREATE INDEX CONCURRENTLY idx_events_created_at ON events(created_at);\n```\n\nSee the [runbook](https://example.com/runbook).',
      linkTarget: '_blank',
    },
  },
  {
    name: 'Product / Release Notes',
    props: {
      children:
        '# Version 2.4\n\n- [x] Workspace templates\n- [x] Audit log export\n- [ ] SSO session renewal\n\n<details><summary>Upgrade notes</summary>Press <kbd>Ctrl</kbd>+<kbd>R</kbd> after updating.</details>\n\n[Read the upgrade guide](https://example.com/upgrade).',
      html: true,
      linkTarget: '_blank',
      linkRel: 'noopener',
    },
  },
] satisfies ProductScenarioPair
