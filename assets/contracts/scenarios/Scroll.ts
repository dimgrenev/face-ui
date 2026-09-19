import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Activity Feed',
    props: {
      orientation: 'vertical',
      height: 120,
      'aria-label': 'Recent workspace activity',
      children:
        '09:42 Deployment completed\n09:38 Smoke tests passed\n09:31 Build started\n09:27 Pull request approved\n09:16 Security scan passed\n09:04 Database backup completed\n08:55 Release candidate created',
    },
  },
  {
    name: 'Product / Wide Data Preview',
    props: {
      orientation: 'both',
      height: 180,
      'aria-label': 'Dataset preview',
      children:
        'timestamp,workspace,agent,model,input_tokens,output_tokens,latency_ms,status\n2026-07-10T09:41:00Z,production,research,gpt-5,2840,612,1842,completed\n2026-07-10T09:43:12Z,production,support,gpt-5-mini,1210,388,904,completed\n2026-07-10T09:44:05Z,staging,research,gpt-5,3920,1040,2511,completed\n2026-07-10T09:46:37Z,production,billing,gpt-5-mini,860,142,611,failed\n2026-07-10T09:48:20Z,production,research,gpt-5,2105,574,1693,completed\n2026-07-10T09:51:02Z,staging,support,gpt-5-mini,1544,402,1022,completed\n2026-07-10T09:53:48Z,production,research,gpt-5,4470,1288,2967,completed',
    },
  },
] satisfies ProductScenarioPair
