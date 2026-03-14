/**
 * @face-ui/core — Anatomy
 *
 * Generates data-scope/data-part attributes for CSS targeting.
 * Example: createAnatomy('checkbox').parts('root', 'control', 'indicator')
 */
export function createAnatomy(scope) {
    return {
        parts: (...parts) => ({
            scope,
            parts,
            getPartAttrs: (part) => ({
                'data-scope': scope,
                'data-part': part,
            }),
        }),
    };
}
