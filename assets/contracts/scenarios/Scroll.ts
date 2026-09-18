import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / Activity Feed',
    props: {
      orientation: 'vertical',
      height: 240,
      ariaLabel: 'Recent workspace activity',
      children:
        '09:42 Deployment completed\n09:38 Smoke tests passed\n09:31 Build started\n09:27 Pull request approved\n09:16 Security scan passed\n09:04 Database backup completed\n08:55 Release candidate created',
    },
  },
  {
    name: 'Product / Wide Data Preview',
    props: {
      orientation: 'both',
      height: 180,
      ariaLabel: 'Dataset preview',
      children:
        'timestamp,workspace,agent,model,input_tokens,output_tokens,latency_ms,status\n2026-07-10T09:41:00Z,production,research,gpt-5,2840,612,1842,completed',
    },
  },
] satisfies ProductScenarioPair
