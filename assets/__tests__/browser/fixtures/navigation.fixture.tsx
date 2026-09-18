import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Navigation } from '../../../../Navigation/Navigation'
import { Panel } from '../../../../Panel/Panel'

function Fixture() {
  const [actions, setActions] = useState(0)
  const count = () => setActions((n) => n + 1)
  return (
    <>
      <Navigation
        surface="inline"
        items={[
          { id: 'nav-action', label: 'Run navigation', onClick: count },
          {
            id: 'nav-disabled',
            label: 'Disabled navigation',
            disabled: true,
            onClick: () => setActions(999),
          },
          {
            id: 'nav-group',
            label: 'Navigation group',
            items: [{ id: 'nav-child', label: 'Child action', onClick: count }],
          },
        ]}
      />
      <Panel
        surface="inline"
        items={[{ id: 'panel-action', label: 'Run panel', onClick: count }]}
      />
      <output aria-label="Navigation actions">{actions}</output>
      <Panel
        surface="sheet"
        surfaceTitle="Project panel"
        items={[{ id: 'project', label: 'Project' }]}
      />
      <Navigation
        surface="sheet"
        surfaceTitle="Project navigation"
        items={[{ id: 'project', label: 'Project' }]}
      />
    </>
  )
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
)
