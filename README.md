# @userface/face-ui-react

React implementation of Face UI: typed components, CSS tokens, interaction state machines, and machine-readable component contracts.

It is built for product interfaces that need a strict visual system and a predictable API surface. The package ships ESM, CommonJS, TypeScript declarations, CSS, component metadata, and `face.json` contracts for tooling.

## Install

```bash
npm install @userface/face-ui-react react react-dom
```

Peer dependencies:

```txt
react ^18.0.0 || ^19.0.0
react-dom ^18.0.0 || ^19.0.0
```

## Use

Load Akt from Google Fonts in the document head:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Akt:wght@100..900&display=swap"
  rel="stylesheet"
/>
```

Import the CSS once at the application boundary:

```tsx
import '@userface/face-ui-react/assets/styles/index.css'
```

Use the primary barrel for normal application code:

```tsx
import { Button, Text } from '@userface/face-ui-react'

export function Example() {
  return <Button variant="accent">Create project</Button>
}
```

Component subpaths resolve to the same implementation:

```tsx
import { Button } from '@userface/face-ui-react/Button/Button'
```

Compatibility aliases live outside the primary barrel:

```tsx
import { Toggle } from '@userface/face-ui-react/compat'
```

## Documentation

Each question has exactly one source. Nothing else documents props.

| Question | Source |
| --- | --- |
| Which component, and how do they compose? | [`docs.md`](docs.md): rules, API conventions, recipes, one article per component |
| What does a prop do, and which values does it take? | its JSDoc, shipped as `.d.ts` and as the `<Name>/<Name>.json` contract |
| What broke, and how do I move? | [`MIGRATION.md`](MIGRATION.md), with `migrations.json` behind `pnpm migrate` |
| What is a component's status? | `component-registry.json`: `status`, `apiReviewed`, `a11yReviewed`, `mobileReviewed` |
| Which token do I author, and where? | [`design-system/README.md`](design-system/README.md) |

`docs.md` lists no props, defaults or tokens, and a contract's `description` is always the JSDoc.

## Known limits

Behaviour no prop controls, kept here because it changes what you build around it. What a prop does is in its JSDoc.

- Mount `Toaster` near the document root. Its region moves into an active modal so notifications remain accessible there; outside a modal it is `position: fixed`, so a transformed ancestor becomes its containing block.
- Only `Select` and `Command` report a control left without an accessible name; the other seven fields do not.
- `Markdown` has no size limit: the whole source is parsed and sanitized on every change, memoized per source, so cap user-supplied sources yourself. A source nested thousands of levels deep overflows the parser and is shown as escaped text with a report. It brings `marked` and `sanitize-html` — and, through that, PostCSS — into your bundle.
- Every default string is English: the root names of `Breadcrumb`, `Carousel`, `Navigation` ("Main"), `Pagination`, `Panel` ("Sidebar"), `Scroll`, `Toast`, `Toc` and `Tree`, every `labels` default, and `Upload`'s `B`/`KB`/`MB` sizes with a `.` decimal. Pass `aria-label` and `labels` per instance.
- `Scroll` is a tab stop while it overflows and drops a `tabIndex` of your own, so content that is itself entirely tabbable gets one extra stop. From a JSON face document its only sizing is the fixed `height`; grow-then-cap needs `style`, which contracts omit.
- `Command` with `surface="dialog"` is a bottom sheet at every width.
- An autoplaying `Carousel` renders its rotation control after the slides, not before them as APG suggests. Keyboard focus anywhere inside stops the rotation until that control starts it again.
- `Modal`'s `role="alertdialog"` cannot be asked for from a JSON face document: `role` is omitted from every contract.
- An image that finished loading before hydration and reports a zero natural size — a sizeless SVG — counts as failed and shows the fallback (`Avatar`, `Media`).
- TypeScript rejects `{ "type": "group" }` and `{ "type": "separator" }` in a flat list, but a hand-written face document can still carry them. Flat lists drop them with a development report; `Menu` and `Command` support groups and separators, while `Navigation` supports groups only inside dropdowns.
- `pnpm migrate --check` cannot reach zero on every codebase. The codemod reads one JSX usage at a time, so a list or handler held in a variable, a one-argument `render`, props spread through a wrapper of your own, a component reached through your own re-export, and prop names or module paths written as plain data are invisible to it. Run `tsc` after it, and read "Migrating a consumer" in [`MIGRATION.md`](MIGRATION.md).

## Contracts

Each component is published with a JSON contract next to the module:

```ts
import buttonContract from '@userface/face-ui-react/Button/Button.json'
```

The package registry is available as:

```ts
import registry from '@userface/face-ui-react/component-registry.json'
```

Preview and runtime tooling can read:

```ts
import runtime from '@userface/face-ui-react/uf.runtime'
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

Set `data-theme="light"` or `data-theme="dark"` on the document element and apply background/foreground tokens to the host surface. Body portals require document-level theme overrides. The runtime stylesheet already includes tokens.

Typography is token-driven. `Akt` is intentionally loaded by the application shell through Google Fonts; code UI uses the system monospace font through `--uf-font-family-mono`. Face UI does not bundle fonts.

## Example Media

Curated media examples ship with the package under `assets/media/examples`. They are intended for `Media`, `Carousel`, cards, and gallery previews, not as product content.

```ts
import officeCoreManifest from '@userface/face-ui-react/assets/media/examples/office-core/manifest.json'
```

Image files are exposed through the same package subpath, for example `@userface/face-ui-react/assets/media/examples/office-core/lobby-day.webp`.
When a host serves package examples as static preview assets, use the manifest `publicPath` values such as `/assets/media/examples/office-core/lobby-day.webp`.

## Application icon libraries

Applications with their own icon library can set one renderer at their UI boundary:

```tsx
import { IconProvider, type IconProps } from '@userface/face-ui-react/Icon'

function ProductIcon(props: IconProps) {
  return <ExistingProductIcon {...props} />
}

<IconProvider renderer={ProductIcon}>
  <Tile icon="folder" chevron="end">Project</Tile>
  <Select items={plans} aria-label="Plan" />
</IconProvider>
```

The renderer receives the requested non-blank `name`, `className`, paint/transform
`style`, `aria-label` and `title`. It owns name resolution, accessible SVG markup
and the fixed 20×20 box. Internal control icons and React portals use the same
renderer; no separate control wrappers are needed. An omitted `renderer` inherits
the parent; `renderer={null}` restores built-in icons in a preview subtree.
Without a provider, built-in aliases, unknown-name diagnostics and geometry are
unchanged. A blank name still renders nothing before calling a host renderer.

## Development

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
```

`pnpm check` is the release gate: drift checks for the generated tokens, contracts and gallery, then
`build`, `test`, `test:types`, `smoke` and `pack:dry`, each of which also runs on its own.

Browser tests cover the component gallery, real keyboard and focus behavior, forms, nested portals, SSR hydration, theme contrast and layout in Chromium, Firefox and WebKit. CI checks React 18 and 19; these regression gates are not accessibility certification.

## Changing the API

### Stable surface geometry

Products may set `data-uf-surface-geometry="stable"` on a static ancestor and add
`uf-surface-stable` to owned surface roots. Card-based floating surfaces carry
the class already; unmarked documents and ordinary Cards keep native borders
and their existing padding shorthand. Manual surfaces carrying the class use
the same axis tokens with native borders outside the opted-in profile.

The shared recipe reserves the authored border width in layout and paints an
inset stroke separately. `--uf-surface-pad-block` and `--uf-surface-pad-inline`
describe content padding; `--uf-surface-pad-top/right/bottom/left` override
individual sides. Card padding variants supply defaults. Products migrating a
custom CSS padding shorthand provide the corresponding axis or side tokens;
arbitrary author styles are not parsed or rewritten.

`--uf-surface-border-width` and `--uf-surface-border-color` default to the local
Card border. Manual surfaces provide them explicitly. `data-border="false"`
removes both stroke and reservation. Each root resets side and border aliases,
so a parent's asymmetric padding cannot leak into a popup. The recipe owns
`::before`, preserves the surface's outer shadow and radius, forwards no pointer
events, and keeps authored fixed/absolute positioning. No wrappers or runtime
border measurements are added.

JSDoc is the only home for a prop decision. Every own prop, compound-part prop, `labels` key and
details field carries one:

- one present-tense sentence about the observable effect, and a second only for what the type cannot say;
- at most 200 characters, with no history, dates or links to reviews;
- the same text in every branch of a union;
- on the exported component, a single line, which becomes the contract's `description`;
- `@deprecated` only on `compat` exports.

`CONTRACT_OVERRIDES` in `assets/contracts/sync-face-json.ts` patches `type` and `options` only; a
`description` there is a type error. Every removal or rename is a row in `scripts/migrations/<Name>.ts`,
written by the change that breaks it, and `pnpm migration:sync` regenerates `MIGRATION.md` and
`migrations.json` from those files.

`pnpm check` enforces this: `contracts:check` regenerates every contract from the source and fails on
descriptions that union branches disagree about, and the suite under `assets/__tests__/governance`
holds the naming conventions, the invalid-prop reports, SSR and reachability. To check a consumer
against the break log, run `pnpm migrate --check <paths…>`.

## Release

The npm package is published by `.github/workflows/face-ui-release.yml`.

Release paths:

- push a tag named `face-ui-v<version>`
- or run the workflow manually with a version input

Required GitHub secret:

```txt
NPM_TOKEN
```

The release workflow installs locked dependencies, applies the requested version, runs package and browser checks, and publishes the package publicly to npm.

## License

MIT
