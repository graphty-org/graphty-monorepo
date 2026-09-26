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
 * The compact (sm) values, Figma's (design/figma-spec.md 8.8):
 * - Loader: --loader-size: 16px (the Figma button spinner); drawn in --cm-icon
 * - Progress: --progress-size: 4px, a full radius, track --cm-bg-secondary, fill --cm-bg-brand
 * - RingProgress: tokens only (numeric size prop)
 *
 * Colours are in ../css/overlays.css.ts, keyed on the classNames below.
 */

import type { CompactSizeScale } from "./size-scale";

/**
 * Per-size CSS variables for the compact Loader.
 */
export const compactLoaderScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--loader-size": "14px" },
        sm: { "--loader-size": "16px" },
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
 * Static styles for compact Progress component: the section label in the 9px caption size.
 */
export const compactProgressStyles = {
    label: {
        fontSize: 9,
    },
} as const;

/** A fully round bar (spec 8.8: radius full). */
export const PROGRESS_RADIUS = "9999px";

/** The Loader part: drawn in the icon colour. */
export const compactLoaderClassNames = { root: "cm-loader" } as const;

/** The Progress parts: the track and the fill. */
export const compactProgressClassNames = {
    root: "cm-progress",
    section: "cm-progress-section",
    label: "cm-progress-label",
} as const;

/** The RingProgress parts: the track colour and the label type. */
export const compactRingProgressClassNames = {
    root: "cm-ring-progress",
    curve: "cm-ring-curve",
    label: "cm-ring-progress-label",
} as const;
