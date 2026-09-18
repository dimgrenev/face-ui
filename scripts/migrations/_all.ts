import type { Migration } from './types'

export default [
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
    from: 'assets/membrane-interactions#installMembraneInteractions',
    to: 'Remove the call; each component owns its membrane',
    codemod: 'manual',
  },
] satisfies Migration[]
