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

import type { CompactSizeScale, CompactVars } from "./size-scale";

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
 *
 * The one variable this component names beyond the size is `--ai-bd`, and it is
 * named per VARIANT rather than per size: see compactActionIconVariantVars below.
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
 * The border an ActionIcon draws for the variant it is rendered with.
 *
 * `light` is the treatment a dense toggle draws its ACTIVE state with -- a tinted
 * ground and an accent glyph -- and the tint alone is not a state boundary.
 * Composited over the panel ground this library paints
 * (`PANEL_INK.PANEL`, `var(--mantine-color-body)`) Mantine's light ground measures
 * 1.36:1 in the dark scheme (rgba(116,192,252,0.15) over #1f2428) and 1.14:1 in the
 * light one (rgba(25,113,194,0.1) over #ffffff), where WCAG 2.2 (1.4.11) asks 3:1
 * of the visual boundary that distinguishes a control's state. A one-pixel accent
 * border is that boundary: drawn in the variant's OWN ink, `--ai-color`, it measures
 * 14.09:1 against the ground and 10.35:1 against the tint it encloses in the dark
 * scheme, and 5.02:1 / 4.39:1 in the light one -- past 3:1 on both of its sides, in
 * both schemes. (These are for the theme's default primary shades, blue-5 dark and
 * blue-8 light.) The ink is kept over the filled accent because it is the
 * variant's own glyph colour, so the border and the glyph always agree.
 *
 * It belongs here rather than at a call site. graphty's shell wrote this boundary
 * itself as an inset box-shadow on two of its header rows (`activeRingStyle`,
 * removed 2026-09-13 at the product owner's direction: "the custom lock button was
 * not necessary ... if the components are wrong, they should be fixed"), which left
 * those two toggles drawing a state the app's other toggles did not draw.
 *
 * `--ai-bd` is the variable Mantine's own ActionIcon reads
 * (node_modules/@mantine/core/styles/ActionIcon.css: `border: var(--ai-bd, ...)`),
 * and its variant resolver fills it with `1px solid transparent` for every variant,
 * so overriding it here neither adds a box nor moves a grid: the 24px control stays
 * 24px. Reading the colour from `--ai-color` rather than naming the primary keeps a
 * `color="red" variant="light"` icon bordered in its own red.
 *
 * Every other variant is left exactly as Mantine resolved it -- `outline` already
 * draws a real border, `filled` carries its own ground, and a white or grey border
 * on either would be a new treatment rather than a fix.
 * @param variant - the variant prop as Mantine resolved it
 * @returns the border override for `light`, and nothing at all for anything else
 */
export function compactActionIconVariantVars(variant?: string | null): CompactVars {
    return variant === "light" ? { "--ai-bd": "1px solid var(--ai-color)" } : {};
}

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
