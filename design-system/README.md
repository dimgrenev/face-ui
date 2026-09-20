# Face UI design system

The design system defines the geometry, type, color and motion used by Face UI and its consumers. It has one authored source for shared tokens and reproducible outputs.

## Source and outputs

- `source/*.jsonc`: canonical token records, including selector-specific variants. Geometry, motion and compatibility aliases are authored here too.
- `tokens/*.css`, `themes/default.css`: CSS generated from each record's `generatedPath`.
- `generated/token-manifest.json`: generated values, selectors and ownership for tooling.
- `generated/preview-metadata.json`: generated sheet descriptions and representative tokens.
- `assets/styles/component-tokens.css`: runtime component-specific tokens.
- `assets/styles/tokens.css`: generated runtime bundle of foundations and component tokens, including the packaged mono font.
- CSS index files and utilities compose these outputs; they are not alternate token authorities.

```bash
pnpm tokens:sync   # regenerate authored outputs and runtime bundle
pnpm tokens:check  # fail on source/output drift
```

The generator rejects duplicate declarations within an output/selector and invalid source/output paths. It runs as part of `pnpm check`. Review source changes together with their generated diff. Updating only a CSS output is not a persistent edit.

## Consumption

```tsx
import '@userface/face-ui-react/assets/styles/index.css'
```

This is the complete component stylesheet, including tokens. For a token-only consumer use `@userface/face-ui-react/design-system/index.css` instead. Loading both is unnecessary for normal component use.

Set `data-theme="light"` or `data-theme="dark"` on the document element. The host owns its page background, font loading and document-level overrides. Portal content inherits from the document body, so a theme applied only to a local preview wrapper does not theme its body portals.

Local `data-theme` boundaries also support embedded previews. Color-dependent aliases must be declared at these boundaries in their canonical source variants: CSS inherits a custom property's already resolved value, so a root-only `var(...)` alias can retain the outer theme's text, border or surface color. Keep geometry and density declarations independent of these color boundaries. Verify both nested directions and the production CSS output.

```css
html {
  background: var(--uf-color-background);
  color: var(--uf-color-foreground);
  font-family: var(--uf-font-family-base);
}
.product-section {
  padding: var(--uf-content-inset);
  gap: var(--uf-control-gap);
}
```

Use the manifest to inspect actual token names and values. Do not copy an invented scale into documentation or infer that `md` has the same value as another design system.

## Geometry contract

| Responsibility                | Token                                                 | Default     |
| ----------------------------- | ----------------------------------------------------- | ----------- |
| Control body height           | `--uf-control-height`                                 | 32px        |
| Text inside a control         | `--uf-control-font-size` / `--uf-control-line-height` | 14px / 20px |
| Vertical control inset        | `--uf-control-pad-y`                                  | 6px         |
| Text horizontal inset         | `--uf-control-pad-text`                               | 8px         |
| Icon size / icon-only control | `--uf-icon-size` / `--uf-icon-only-size`              | 20px / 32px |
| Outer membrane                | `--uf-membrane`                                       | 1px         |
| Content inset                 | `--uf-content-inset`                                  | 12px        |
| Stable interactive weight     | `--uf-interactive-weight`                             | 500         |

A default single-line control with a membrane occupies 34px externally. A membrane is not content padding or an arbitrary layout gap. Text wrapping, labels and descriptions may increase component height. `Membrane.tsx` is the only implementation of its interaction and outer-spacing boundary. The wrapper remains mounted when disabled and uses `display: contents`, preserving the inner control and its state; semantics and refs belong to the inner control.

Theme related geometry coherently: changing font size alone is not a density system. Keep line height plus vertical insets compatible with the control height, and keep icon-only controls aligned. State changes must not change text metrics. A 32px desktop control is not a universal target-size recommendation for every touch application.

## Typography, color and state

Text variants select semantic component tokens; an explicit size overrides a variant's size without changing its HTML meaning. `Text.as` controls semantics. Controls inherit the interactive type contract, while nested components retain their own type and consumer content retains its styles.

Use foreground/secondary/surface/border tokens according to meaning. Disabled styling is applied once at the owned root. Secondary text must remain readable in both themes; ghost controls do not reduce the entire label's opacity. State uses color, fill, outline and icon changes instead of shifting layout.

Focus indicators remain visible, including forced-colors mode. Reduced motion applies to transitions and loading indicators. Application-defined backgrounds, custom colors and overrides must be checked again for contrast.

## Changes and review

For each foundation change, inspect a mixed row of controls, text with headings, nested surfaces, light/dark themes, narrow viewports and focused/disabled/selected states. Validate computed geometry in a browser; matching token names alone does not establish alignment.

See [the composition contract](../docs.md) for forms, layers, state ownership and migration guidance.
