/**
 * The compact size scale: one set of CSS variables per Mantine size token, and
 * the lookup that a component extension's `vars` resolver uses to pick one.
 *
 * WHY THIS MODULE EXISTS. Every extension in ../components used to declare
 * `vars: () => ({ root: <one frozen object> })`. Mantine 8 resolves a
 * component's variables in
 * node_modules/@mantine/core/esm/core/styles-api/use-styles/get-style/resolve-vars/resolve-vars.mjs
 * as mergeVars([componentVarsResolver(theme, props), theme.components[name].vars(theme, props),
 * props.vars(theme, props)]) -- a per-key merge in which the theme's value wins
 * a collision. An argument-less resolver therefore answered with the same
 * literal for xs through xl and flattened the whole size axis: a Slider at
 * size="xl" drew the same 4px track as one at size="xs". Reported by the
 * product owner on 2026-09-13 ("sizes aren't varying anymore", Storybook
 * Compact/Controls "Slider - Size Comparison") and contrary to this package's
 * own README lines 118-119, which promise that passing size="md" or size="lg"
 * gets Mantine's usual sizes back.
 *
 * WHY A SCALE AND NOT A GATE. The resolver this replaced an earlier version of
 * was a boolean gate: compact values for one size name, `{}` for everything
 * else. A gate hands xs straight back to Mantine, and Mantine's xs is LARGER
 * than compact (a 30px xs Button against compact's 24px), so xs would render
 * bigger than sm. A keyed scale keeps the package's whole point -- compact at
 * the default size -- while letting an explicitly sized control differ from
 * its neighbours.
 *
 * The scales are anchored so that each component's `defaultProps` size resolves
 * to exactly the values this package shipped before the fix; that is what keeps
 * the css-*.browser and *-regression suites measuring the same pixels.
 */

/**
 * A set of CSS custom properties, shaped the way a Mantine `vars` resolver
 * returns them for one selector.
 *
 * Exported because ./inputs.ts builds its entries through helper functions, and
 * eslint's explicit-function-return-type rule means those helpers have to name
 * this type. Nothing outside this package's theme uses it: it is not re-exported
 * from src/index.ts.
 */
export type CompactVars = Readonly<Record<`--${string}`, string>>;

/**
 * A component's compact values, keyed by Mantine size token.
 *
 * Only the five Mantine tokens are keyed. Anything else a call site can pass --
 * a number, a custom token -- falls back to the `compactSize` entry; see
 * compactVarsForSize for why.
 */
export interface CompactSizeScale {
    /**
     * The token whose entry is THE compact size -- the one this component's
     * `defaultProps` names. An unspecified size and the legacy size name
     * "compact" both resolve here.
     */
    readonly compactSize: string;
    /** The compact CSS variables for each size token this scale answers for. */
    readonly sizes: Readonly<Record<string, CompactVars>>;
}

/**
 * Pick the compact variables for one rendered size.
 *
 * `size` is read straight off the post-`useProps` props object a Mantine vars
 * resolver receives, so theme `defaultProps` are already folded in. A size the
 * scale does not key falls back to the compact entry, which is what this package
 * returned for every size before the scale existed. Three such values reach the
 * resolver in practice:
 *
 * - `undefined`/`null`, which a caller that bypasses Mantine can still produce
 *   (the theme's own regression tests invoke `extension.vars!()` with no
 *   arguments at all);
 * - `"compact"`, this app's private legacy size name. It is NOT a Mantine size
 *   token -- bare Mantine yields an empty `--slider-size` and a 0px track for
 *   it -- and graphty still passes it at several hundred call sites, so it has
 *   to keep resolving to the compact values;
 * - a number, which several components in this package pass as
 *   `size={PANEL_GRID.TRAIL}`.
 *
 * The fallback is the compact entry rather than `{}` on purpose. Returning `{}`
 * would leave Mantine's own varsResolver unopposed, and Mantine answers in rem:
 * an ActionIcon at `size={24}` resolves to
 * `calc(1.5rem * var(--mantine-scale))`. That paints the same 24 pixels today
 * but it is a different unit system from the px grid this package is built on
 * (PANEL_GRID, COMPACT_SIZING), and it would drift the moment a consumer changed
 * Mantine's rem base or scale. Keeping the compact entry keeps one unit system
 * per panel.
 * @param scale - the component's compact scale
 * @param size - the size prop as Mantine resolved it
 * @returns the variables for that size, or the compact entry's
 */
export function compactVarsForSize(scale: CompactSizeScale, size?: string | number | null): CompactVars {
    const key = size === undefined || size === null ? scale.compactSize : String(size);
    const vars = scale.sizes[key];
    return vars ?? scale.sizes[scale.compactSize];
}
