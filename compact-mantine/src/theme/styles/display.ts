/**
 * Static visual styles and per-size CSS variables for compact-sized display
 * components.
 *
 * These are applied via the `vars` and `styles` props on the component
 * extensions in ../components/display.ts.
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
 * - Badge: --badge-height: 14px, --badge-fz: 9px, --badge-padding-x: 4px
 * - Text: no vars at all -- it reads the theme's global compactFontSizes
 * - Avatar: --avatar-size: 24px
 * - ThemeIcon: --ti-size: 24px
 * - Indicator: --indicator-size: 8px
 * - Kbd: --kbd-fz: 10px, --kbd-padding: 2px 4px
 * - Pill: --pill-height: 16px, --pill-fz: 10px
 */

import type { CompactSizeScale } from "./size-scale";

/**
 * Per-size CSS variables for the compact Badge.
 */
export const compactBadgeScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--badge-height": "12px", "--badge-fz": "8px", "--badge-padding-x": "3px" },
        sm: { "--badge-height": "14px", "--badge-fz": "9px", "--badge-padding-x": "4px" },
        md: { "--badge-height": "18px", "--badge-fz": "11px", "--badge-padding-x": "6px" },
        lg: { "--badge-height": "22px", "--badge-fz": "13px", "--badge-padding-x": "8px" },
        xl: { "--badge-height": "26px", "--badge-fz": "15px", "--badge-padding-x": "10px" },
    },
};

// NOTE: compactTextVars was removed as it was unused.
// Text component relies on global fontSizes from the theme (compactFontSizes)
// rather than component-level vars overrides.

/**
 * Per-size CSS variables for the compact Avatar.
 *
 * The same ramp as compactActionIconScale, so an avatar and an icon button asked
 * for the same size draw the same square.
 */
export const compactAvatarScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--avatar-size": "18px" },
        sm: { "--avatar-size": "24px" },
        md: { "--avatar-size": "30px" },
        lg: { "--avatar-size": "36px" },
        xl: { "--avatar-size": "44px" },
    },
};

/**
 * Per-size CSS variables for the compact ThemeIcon.
 *
 * The same ramp as compactActionIconScale and compactAvatarScale: all three are
 * square chrome that sits in the same rows.
 */
export const compactThemeIconScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--ti-size": "18px" },
        sm: { "--ti-size": "24px" },
        md: { "--ti-size": "30px" },
        lg: { "--ti-size": "36px" },
        xl: { "--ti-size": "44px" },
    },
};

/**
 * Per-size CSS variables for the compact Indicator.
 */
export const compactIndicatorScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--indicator-size": "6px" },
        sm: { "--indicator-size": "8px" },
        md: { "--indicator-size": "10px" },
        lg: { "--indicator-size": "12px" },
        xl: { "--indicator-size": "14px" },
    },
};

/**
 * Per-size CSS variables for the compact Kbd.
 */
export const compactKbdScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--kbd-fz": "9px", "--kbd-padding": "1px 3px" },
        sm: { "--kbd-fz": "10px", "--kbd-padding": "2px 4px" },
        md: { "--kbd-fz": "12px", "--kbd-padding": "3px 6px" },
        lg: { "--kbd-fz": "14px", "--kbd-padding": "4px 8px" },
        xl: { "--kbd-fz": "16px", "--kbd-padding": "5px 10px" },
    },
};

/**
 * Per-size CSS variables for the compact Pill.
 */
export const compactPillScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--pill-height": "14px", "--pill-fz": "9px" },
        sm: { "--pill-height": "16px", "--pill-fz": "10px" },
        md: { "--pill-height": "20px", "--pill-fz": "12px" },
        lg: { "--pill-height": "24px", "--pill-fz": "14px" },
        xl: { "--pill-height": "28px", "--pill-fz": "16px" },
    },
};
