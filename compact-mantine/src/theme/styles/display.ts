/**
 * Per-size CSS variables for the display components (design/figma-spec.md 11.6-11.10).
 *
 * Each `*Scale` is a CompactSizeScale: one variable set per Mantine size token, with `compactSize`
 * naming the entry the extension's `defaultProps` size resolves to. The compact (sm) entries are
 * Figma's measurements; the other sizes keep a ramp around them so an explicitly sized component
 * still differs from its neighbours (see ./size-scale.ts).
 *
 * The compact (sm) values:
 * - Badge: 16 tall, 11px, padding 0 4, radius 5 (bt/mode-metronome-full #296)
 * - Avatar: 24 (hm/header-right-default #59)
 * - ThemeIcon: 24, radius 5
 * - Indicator: a 9px dot (5 + a 2px ring; ls/rail-default #56)
 * - Kbd: 25 tall, min 26 wide, 11/16 (pm/keyboard-shortcuts-tab-tools #114); md is the 31-tall
 *   14/24 cap of the "Essential" tab (ma/keyboard-shortcuts-essential #128)
 * - Pill: 20 tall, 11px, radius 5 (the variable pill, spec 6.6)
 */

import type { CompactSizeScale } from "./size-scale";

/** Per-size CSS variables for the Badge. */
export const compactBadgeScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--badge-height": "14px", "--badge-fz": "9px", "--badge-padding-x": "3px", "--badge-lh": "14px" },
        sm: { "--badge-height": "16px", "--badge-fz": "11px", "--badge-padding-x": "4px", "--badge-lh": "16px" },
        md: { "--badge-height": "20px", "--badge-fz": "11px", "--badge-padding-x": "6px", "--badge-lh": "20px" },
        lg: { "--badge-height": "24px", "--badge-fz": "13px", "--badge-padding-x": "8px", "--badge-lh": "24px" },
        xl: { "--badge-height": "28px", "--badge-fz": "15px", "--badge-padding-x": "10px", "--badge-lh": "28px" },
    },
};

/** Per-size CSS variables for the Avatar (the same ramp as the icon buttons). */
export const compactAvatarScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--avatar-size": "16px" },
        sm: { "--avatar-size": "24px" },
        md: { "--avatar-size": "32px" },
        lg: { "--avatar-size": "40px" },
        xl: { "--avatar-size": "48px" },
    },
};

/** Per-size CSS variables for the ThemeIcon. */
export const compactThemeIconScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--ti-size": "16px" },
        sm: { "--ti-size": "24px" },
        md: { "--ti-size": "32px" },
        lg: { "--ti-size": "40px" },
        xl: { "--ti-size": "48px" },
    },
};

/** Per-size CSS variables for the Indicator. The sm dot is 9px: 5px of colour in a 2px ring. */
export const compactIndicatorScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--indicator-size": "7px" },
        sm: { "--indicator-size": "9px" },
        md: { "--indicator-size": "11px" },
        lg: { "--indicator-size": "13px" },
        xl: { "--indicator-size": "15px" },
    },
};

/** Per-size CSS variables for the Kbd key cap. */
export const compactKbdScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--kbd-fz": "9px", "--kbd-lh": "14px", "--kbd-height": "21px", "--kbd-min-width": "22px" },
        sm: { "--kbd-fz": "11px", "--kbd-lh": "16px", "--kbd-height": "25px", "--kbd-min-width": "26px" },
        md: { "--kbd-fz": "14px", "--kbd-lh": "24px", "--kbd-height": "31px", "--kbd-min-width": "32px" },
        lg: { "--kbd-fz": "16px", "--kbd-lh": "26px", "--kbd-height": "35px", "--kbd-min-width": "36px" },
        xl: { "--kbd-fz": "20px", "--kbd-lh": "30px", "--kbd-height": "41px", "--kbd-min-width": "42px" },
    },
};

/** Per-size CSS variables for the Pill. */
export const compactPillScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--pill-height": "16px", "--pill-fz": "9px" },
        sm: { "--pill-height": "20px", "--pill-fz": "11px" },
        md: { "--pill-height": "24px", "--pill-fz": "13px" },
        lg: { "--pill-height": "28px", "--pill-fz": "15px" },
        xl: { "--pill-height": "32px", "--pill-fz": "16px" },
    },
};
