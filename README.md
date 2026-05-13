# @userface/face-ui-react

React implementation of Face UI: typed components, CSS tokens, interaction state machines, and machine-readable component contracts.

It is built for product interfaces that need a strict visual system and a predictable API surface. The package ships ESM, CommonJS, TypeScript declarations, CSS, component metadata, and `face.json` contracts for tooling.

## Install

```bash
npm install @userface/face-ui-react react react-dom
```

Peer dependencies:

```txt
react >=18
react-dom >=18
```

## Use

Import the CSS once at the application boundary:

```tsx
import '@userface/face-ui-react/assets/styles/index.css';
```

Use the primary barrel for normal application code:

```tsx
import { Button, Text } from '@userface/face-ui-react';

export function Example() {
  return (
    <Button text="Create project" variant="accent" />
  );
}
```

Canonical component subpaths are also exported:

```tsx
import { Button } from '@userface/face-ui-react/Button/Button';
```

Compatibility aliases live outside the primary barrel:

```tsx
import { Sheet, Toggle } from '@userface/face-ui-react/compat';
```

## Public Surface

Primitives: `Button`, `Text`, `Icon`, `Separator`, `Tile`.

Forms: `Input`, `Checkbox`, `Radio`, `Switcher`, `SegmentedControl`, `Slider`, `Rating`, `Select`, `DatePicker`, `Calendar`, `Upload`.

Overlays: `Tooltip`, `Popover`, `Menu`, `Modal`, `Drawer`, `Command`.

Navigation: `Tabs`, `Accordion`, `Breadcrumb`, `Pagination`, `Steps`, `Navigation`, `Panel`, `Tree`, `Toc`.

Display and patterns: `Avatar`, `Badge`, `Card`, `Skeleton`, `Progress`, `Carousel`, `Table`, `Code`, `Markdown`, `Media`, `Scroll`, `Toast`, `Bar`.

Deprecated compatibility names are still shipped for migration, but new code should use the canonical names:

| Compatibility | Use instead |
| --- | --- |
| `Overlay` | `Tooltip` or `Popover` |
| `Toggle` | `SegmentedControl` |
| `Sidebar` | `Panel` |
| `Sheet` | `Drawer` |
| `Date` | `DatePicker` |

## Contracts

Each component is published with a JSON contract next to the module:

```ts
import buttonContract from '@userface/face-ui-react/Button/Button.json';
```

The package registry is available as:

```ts
import registry from '@userface/face-ui-react/component-registry.json';
```

Preview and runtime tooling can read:

```ts
import runtime from '@userface/face-ui-react/uf.runtime';
```

These files describe props, states, behavior, anatomy, token mapping, accessibility notes, usage rules, and governance metadata.

## Styling

Face UI ships plain CSS:

- `assets/styles/tokens.css`
- `assets/styles/base.css`
- `assets/styles/components.css`
- `assets/styles/animations.css`
- `assets/styles/index.css`

No Tailwind, CSS-in-JS runtime, or provider is required. Component styling is scoped with `data-scope` and `data-part` attributes, plus `--uf-*` CSS variables.

## Development

```bash
pnpm install --no-frozen-lockfile
pnpm check
```

`pnpm check` runs:

- npm build for ESM, CommonJS, and types
- Vitest contract and interaction tests
- npm smoke checks for export paths and forbidden artifacts
- `npm pack --dry-run`

Useful focused commands:

```bash
pnpm build
pnpm test
pnpm smoke
pnpm pack:dry
```

## Release

The npm package is published by `.github/workflows/face-ui-release.yml`.

Release paths:

- push a tag named `face-ui-v<version>`
- or run the workflow manually with a version input

Required GitHub secret:

```txt
NPM_TOKEN
```

The release workflow installs dependencies, applies the requested version, runs `pnpm check`, and publishes the package publicly to npm.

## Governance

The primary public API is `index.ts`. Component status and migration metadata live in `component-registry.json`. Human guidance lives in `docs.md`; the concise taxonomy is in `docs/component-map.md`.

Stable components require compatibility. Beta components may change before `1.0`. Deprecated aliases are migration surfaces only.

## License

MIT
