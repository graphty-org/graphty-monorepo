/**
 * Per-size CSS variables for compact button components.
 *
 * These are applied via the `vars` prop on the component extensions in
 * ../components/buttons.ts.
 *
 * Each `*Scale` is a CompactSizeScale: a compact value set per Mantine size
 * token, with `compactSize` naming the entry that the extension's `defaultProps`
 * size resolves to -- sm for Button and ActionIcon, xs for CloseButton. Those
 * entries hold the exact values this package shipped when its resolvers ignored
 * the size prop entirely, so the compact default is unchanged and only the other
 * tokens move. See ./size-scale.ts for why the scale replaced a single frozen
 * object (product owner, 2026-09-13: "sizes aren't varying anymore").
 *
 * The compact baseline, unchanged:
 * - Button (sm): --button-height: 24px, --button-fz: 11px
 * - ActionIcon (sm): --ai-size: 24px
 * - CloseButton (xs): --cb-size: 16px, --cb-icon-size: 12px
 */

import type { CompactSizeScale } from "./size-scale";

/**
 * Per-size CSS variables for the compact Button.
 */
export const compactButtonScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--button-height": "20px", "--button-fz": "10px", "--button-padding-x": "6px" },
        sm: { "--button-height": "24px", "--button-fz": "11px", "--button-padding-x": "8px" },
        md: { "--button-height": "30px", "--button-fz": "13px", "--button-padding-x": "12px" },
        lg: { "--button-height": "36px", "--button-fz": "15px", "--button-padding-x": "16px" },
        xl: { "--button-height": "44px", "--button-fz": "17px", "--button-padding-x": "20px" },
    },
};

/**
 * Per-size CSS variables for the compact ActionIcon.
 *
 * --ai-size is the ONLY variable this scale names. Mantine derives --ai-bg,
 * --ai-color, --ai-hover, --ai-hover-color and --ai-bd from the color and
 * variant props in its own varsResolver, and because resolve-vars merges per
 * key those five survive untouched -- which is what lets variant="filled"
 * render filled in its colour at a compact 24px.
 */
export const compactActionIconScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--ai-size": "18px" },
        sm: { "--ai-size": "24px" },
        md: { "--ai-size": "30px" },
        lg: { "--ai-size": "36px" },
        xl: { "--ai-size": "44px" },
    },
};

/**
 * Per-size CSS variables for the compact CloseButton.
 *
 * CloseButton's compact entry is xs, not sm: it is chrome that sits inside
 * another control, so the extension defaults it one token smaller than the rest.
 */
export const compactCloseButtonScale: CompactSizeScale = {
    compactSize: "xs",
    sizes: {
        xs: { "--cb-size": "16px", "--cb-icon-size": "12px" },
        sm: { "--cb-size": "20px", "--cb-icon-size": "14px" },
        md: { "--cb-size": "24px", "--cb-icon-size": "16px" },
        lg: { "--cb-size": "30px", "--cb-icon-size": "20px" },
        xl: { "--cb-size": "36px", "--cb-icon-size": "24px" },
    },
};
