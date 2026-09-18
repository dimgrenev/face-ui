/**
 * A rewrite in `scripts/migrate.ts` for rows whose new value depends on more than a
 * rename or a lookup. Rows naming the same transform are rewritten together; a reader
 * that does not implement it, such as the engine sanitizer, treats them as manual.
 */
export type MigrationTransform = 'button-chevron' | 'switcher-label' | 'breadcrumb-max-items'

/**
 * One breaking change since the last release. Each `scripts/migrations/<Name>.ts`
 * default-exports the rows of one component (`_all.ts`: changes that belong to no
 * single component); `pnpm migration:sync` renders them into MIGRATION.md and
 * migrations.json, and `pnpm migrate` applies them.
 *
 * `component` is the JSX name as written after import: `Button`, or `Card.Header`
 * for a compound part. `codemod: 'auto'` rewrites every literal usage; dynamic
 * values and conflicts are still reported for manual review.
 */
export type Migration =
  /** The prop keeps its meaning under a new name. */
  | {
      kind: 'rename-prop'
      component: string
      from: string
      to: string
      codemod: 'auto' | 'manual'
      transform?: MigrationTransform
    }
  /**
   * The prop is gone; `use` tells the reader what replaces it. `values` maps each
   * former literal value (`"true"` for a bare attribute) to the JSX attributes that
   * replace it, `''` for none; without `values` the automatic fix deletes the prop.
   * `prop` may name an item field as `items[].field`, which is only reported.
   */
  | {
      kind: 'remove-prop'
      component: string
      prop: string
      use: string
      codemod: 'auto' | 'manual'
      values?: Record<string, string>
      transform?: MigrationTransform
    }
  /** Former literal values of the prop map to their current spelling. */
  | { kind: 'rename-value'; component: string; prop: string; values: Record<string, string>; codemod: 'auto' }
  /** A flat string prop moves into `labels[key]`. */
  | { kind: 'move-to-labels'; component: string; from: string; key: string; codemod: 'auto' }
  /** A string prop becomes the element's children. */
  | { kind: 'text-to-children'; component: string; from: string; codemod: 'auto' }
  /**
   * The prop keeps its name but takes another type. A value is reported when it matches
   * `legacy`, a regular expression tested against a literal or an expression's source;
   * the type checker finds the rest.
   */
  | {
      kind: 'retype-prop'
      component: string
      prop: string
      before: string
      after: string
      codemod: 'manual'
      legacy?: string
    }
  /**
   * A public name is gone. `from` is `Name` (any Face UI entry point),
   * `module#Name` (one module, path relative to the package root) or
   * `Component.Part` (a compound member). An automatic `to` has the same shape,
   * and a part may carry JSX attributes (`Bar.Section align="end"`); with a
   * manual codemod `to` is guidance for the reader.
   */
  | { kind: 'export'; from: string; to?: string; codemod: 'auto' | 'manual' }
  /** Same API, different observable behavior; documented only. */
  | { kind: 'behavior'; component: string; before: string; after: string }
