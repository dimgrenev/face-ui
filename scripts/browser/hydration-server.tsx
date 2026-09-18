import { renderToString } from 'react-dom/server'
import { HydrationFixture } from './hydration-fixture'
export function render() {
  return renderToString(<HydrationFixture />)
}
