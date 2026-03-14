/**
 * @face-ui/core — Anatomy
 *
 * Generates data-scope/data-part attributes for CSS targeting.
 * Example: createAnatomy('checkbox').parts('root', 'control', 'indicator')
 */

export interface Anatomy<TParts extends string = string> {
  scope: string
  parts: readonly TParts[]
  getPartAttrs: (part: TParts) => { 'data-scope': string; 'data-part': string }
}

interface AnatomyBuilder<TParts extends string = never> {
  parts: <P extends string>(...parts: P[]) => Anatomy<P>
}

export function createAnatomy(scope: string): AnatomyBuilder {
  return {
    parts: (...parts) => ({
      scope,
      parts,
      getPartAttrs: (part) => ({
        'data-scope': scope,
        'data-part': part,
      }),
    }),
  }
}
