import type { ProductScenarioPair } from '../sync-face-json'

export default [
  {
    name: 'Product / API Example',
    props: {
      title: 'request.ts',
      language: 'ts',
      showLineNumbers: true,
      highlightedLines: [2, 3],
      children: "const response = await client.responses.create({\n  model: 'gpt-5',\n  input: 'Summarize this workspace'\n})",
    },
  },
  {
    name: 'Product / Build Log',
    props: {
      title: 'production-build.log',
      language: 'text',
      defaultCollapsed: true,
      collapsedLines: 3,
      children: 'Installing dependencies...\nCompiling application...\nRunning tests...\nCreating optimized bundle...\nUploading source maps...\nDeployment completed.',
    },
  },
] satisfies ProductScenarioPair
