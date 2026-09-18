import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Avatar,
  Badge,
  Bar,
  BarSection,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Icon,
  Input,
  Radio,
  Steps,
  Text,
  Tile,
} from '../../index'
import '../../assets/styles/index.css'

const components = {
  Avatar,
  Badge,
  Bar,
  BarSection,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Icon,
  Input,
  Radio,
  Steps,
  Text,
  Tile,
}
const root = createRoot(document.getElementById('root')!)
Object.assign(window, {
  React,
  propComponents: components,
  propEvents: [] as string[],
  renderProps(name: keyof typeof components, props: Record<string, unknown>) {
    const Component = components[name] as React.ElementType
    const { key, ...componentProps } = props
    root.render(
      <StrictMode>
        <section data-prop-fixture style={{ width: 400, padding: 20 }}>
          <Component key={key as React.Key} {...componentProps} />
        </section>
      </StrictMode>,
    )
  },
})
