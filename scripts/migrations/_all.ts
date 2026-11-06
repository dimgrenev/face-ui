import type { Migration } from './types'

export default [
  {
    kind: 'export',
    from: 'assets/adapters/react/* deep imports except use-floating-position',
    to: 'Use public components and FaceUiOverlayProvider from the package root; only use-floating-position remains a supported adapter deep import',
    codemod: 'manual',
  },
  {
    kind: 'export',
    from: 'assets/adapters/react/normalize-props#normalizeProps',
    to: 'Spread the props onto the element directly',
    codemod: 'manual',
  },
  {
    kind: 'export',
    from: 'assets/adapters/react/normalize-props#NormalizedProps',
    to: 'The props type itself',
    codemod: 'manual',
  },
  {
    kind: 'export',
    from: 'assets/adapters/react/use-dismiss-outside#useDismissOutside',
    to: '`useLayer` from `assets/adapters/react/use-layer`',
    codemod: 'manual',
  },
  {
    kind: 'export',
    from: 'assets/adapters/react/use-dismiss-outside#UseDismissOutsideOptions',
    to: 'The options of `useLayer` from `assets/adapters/react/use-layer`',
    codemod: 'manual',
  },
  {
    kind: 'export',
    from: 'assets/adapters/react/use-focus-trap#useFocusTrap',
    to: '`useLayer` from `assets/adapters/react/use-layer`',
    codemod: 'manual',
  },
  {
    kind: 'export',
    from: 'assets/adapters/react/use-controllable-open-state#useControllableOpenState',
    to: '`useControllableState` from `assets/adapters/react/use-controllable-state`',
    codemod: 'manual',
  },
  {
    kind: 'export',
    from: 'assets/adapters/react/use-responsive-overlay-surface#DEFAULT_OVERLAY_SURFACE_BREAKPOINT',
    to: 'Removed with the `breakpoint` argument of `useResponsiveOverlaySurface` and `useIsCompactViewport`: every `auto` surface is a sheet below 900px wide',
    codemod: 'manual',
  },
  {
    kind: 'export',
    from: 'assets/membrane-interactions#installMembraneInteractions',
    to: 'Remove the call; each component owns its membrane',
    codemod: 'manual',
  },
  {
    kind: 'export',
    from: 'FormControlProps',
    to: '`FieldProps` for label, description, error and labelPosition; each control declares disabled, required, name, membrane and className itself',
    codemod: 'manual',
  },
  {
    kind: 'export',
    from: 'NavItemBase',
    to: 'The item type of the component: `PanelItem`, `NavigationLink` or `TreeItem`, each keyed by `value`',
    codemod: 'manual',
  },
] satisfies Migration[]
