import { hydrateRoot } from 'react-dom/client'
import { HydrationFixture } from './hydration-fixture'
import '../../assets/styles/index.css'
hydrateRoot(document.getElementById('root')!, <HydrationFixture />)
