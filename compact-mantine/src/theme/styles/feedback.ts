/**
 * Static visual styles and CSS variables for compact-sized feedback components.
 *
 * These are applied via the `vars` and `styles` props on component extensions,
 * providing compact sizing with consistent dimensions.
 *
 * CSS Variables (from baseline):
 * - Loader: --loader-size: 18px
 * - Progress: --progress-size: 4px
 * - RingProgress: --rp-size: calc(3rem * 1) (48px) - uses numeric size prop
 */

/**
 * CSS variables for compact Loader component.
 */
export const compactLoaderVars = {
    "--loader-size": "18px",
} as const;

/**
 * CSS variables for compact Progress component.
 */
export const compactProgressVars = {
    "--progress-size": "4px",
} as const;

/**
 * Static styles for compact Progress component.
 */
export const compactProgressStyles = {
    label: {
        fontSize: 9,
    },
} as const;
