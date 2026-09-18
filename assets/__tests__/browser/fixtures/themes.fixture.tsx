import { createRoot } from 'react-dom/client'
import { Text } from '../../../../Text/Text'
import { Switcher } from '../../../../Switcher/Switcher'

createRoot(document.getElementById('root')!).render(
  <div className="uf-large">
    <section
      data-theme="light"
      style={{ background: 'var(--uf-color-bg)', padding: 16 }}
    >
      <Text text="Light island" />
      <Switcher label="Light setting" />
      <section
        data-theme="dark"
        style={{ background: 'var(--uf-color-bg)', padding: 16 }}
      >
        <Text text="Nested dark island" />
        <Switcher label="Dark setting" />
      </section>
    </section>
  </div>,
)
