/**
 * Static visual styles and per-size CSS variables for compact-sized feedback
 * components.
 *
 * These are applied via the `vars` and `styles` props on the component
 * extensions in ../components/feedback.ts.
 *
 * Each `*Scale` is a CompactSizeScale: one variable set per Mantine size token,
 * with `compactSize` naming the entry that the extension's `defaultProps` size
 * resolves to. The sm entries hold the exact values this package shipped while
 * its resolvers ignored the size prop entirely, so the compact default is
 * unchanged and only the other tokens move. See ./size-scale.ts for why the
 * scale replaced a single frozen object (product owner, 2026-09-13: "sizes
 * aren't varying anymore").
 *
 * The compact (sm) baseline, unchanged:
 * - Loader: --loader-size: 18px
 * - Progress: --progress-size: 4px
 * - RingProgress: --rp-size: calc(3rem * 1) (48px) - uses numeric size prop
 */

import type { CompactSizeScale } from "./size-scale";

/**
 * Per-size CSS variables for the compact Loader.
 */
export const compactLoaderScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--loader-size": "14px" },
        sm: { "--loader-size": "18px" },
        md: { "--loader-size": "24px" },
        lg: { "--loader-size": "30px" },
        xl: { "--loader-size": "38px" },
    },
};

/**
 * Per-size CSS variables for the compact Progress.
 *
 * The same track ramp as compactSliderScale: a progress bar and a slider track
 * in the same panel read as one control family.
 */
export const compactProgressScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--progress-size": "2px" },
        sm: { "--progress-size": "4px" },
        md: { "--progress-size": "6px" },
        lg: { "--progress-size": "8px" },
        xl: { "--progress-size": "10px" },
    },
};

/**
 * Static styles for compact Progress component.
 */
export const compactProgressStyles = {
    label: {
        fontSize: 9,
    },
} as const;
