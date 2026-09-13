/**
 * Visual styles and per-size CSS variables for compact control components.
 *
 * These are applied via the `vars` and `styles` props on the component
 * extensions in ../components/controls.ts.
 *
 * Each `*Scale` is a CompactSizeScale: a compact value set per Mantine size
 * token, with `compactSize` naming the entry that the extension's `defaultProps`
 * size resolves to. The sm entries hold the exact values this package shipped
 * when its resolvers ignored the size prop entirely, so the compact default is
 * unchanged and only the other tokens move. See ./size-scale.ts for why the
 * scale replaced a single frozen object (product owner, 2026-09-13: "sizes
 * aren't varying anymore").
 *
 * The compact (sm) baseline, unchanged:
 * - Switch: --switch-height: 16px, --switch-width: 28px
 * - Checkbox: --checkbox-size: 16px
 * - Radio: --radio-size: 16px
 * - Slider: --slider-size: 4px, --slider-thumb-size: 12px
 * - SegmentedControl: --sc-font-size: 10px
 */

import type { CompactSizeScale } from "./size-scale";

/**
 * Per-size CSS variables for the compact Switch.
 */
export const compactSwitchScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: {
            "--switch-height": "12px",
            "--switch-width": "22px",
            "--switch-thumb-size": "8px",
            "--switch-track-label-padding": "2px",
            "--switch-label-font-size": "4px",
        },
        sm: {
            "--switch-height": "16px",
            "--switch-width": "28px",
            "--switch-thumb-size": "12px",
            "--switch-track-label-padding": "2px",
            "--switch-label-font-size": "5px",
        },
        md: {
            "--switch-height": "20px",
            "--switch-width": "36px",
            "--switch-thumb-size": "16px",
            "--switch-track-label-padding": "3px",
            "--switch-label-font-size": "7px",
        },
        lg: {
            "--switch-height": "24px",
            "--switch-width": "44px",
            "--switch-thumb-size": "20px",
            "--switch-track-label-padding": "3px",
            "--switch-label-font-size": "9px",
        },
        xl: {
            "--switch-height": "28px",
            "--switch-width": "52px",
            "--switch-thumb-size": "24px",
            "--switch-track-label-padding": "4px",
            "--switch-label-font-size": "11px",
        },
    },
};

/**
 * Per-size CSS variables for the compact Checkbox.
 */
export const compactCheckboxScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--checkbox-size": "12px" },
        sm: { "--checkbox-size": "16px" },
        md: { "--checkbox-size": "20px" },
        lg: { "--checkbox-size": "24px" },
        xl: { "--checkbox-size": "28px" },
    },
};

/**
 * Per-size CSS variables for the compact Radio.
 */
export const compactRadioScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--radio-size": "12px", "--radio-icon-size": "5px" },
        sm: { "--radio-size": "16px", "--radio-icon-size": "6px" },
        md: { "--radio-size": "20px", "--radio-icon-size": "8px" },
        lg: { "--radio-size": "24px", "--radio-icon-size": "10px" },
        xl: { "--radio-size": "28px", "--radio-icon-size": "12px" },
    },
};

/**
 * Per-size CSS variables for the compact Slider and RangeSlider.
 */
export const compactSliderScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--slider-size": "2px", "--slider-thumb-size": "8px" },
        sm: { "--slider-size": "4px", "--slider-thumb-size": "12px" },
        md: { "--slider-size": "6px", "--slider-thumb-size": "16px" },
        lg: { "--slider-size": "8px", "--slider-thumb-size": "20px" },
        xl: { "--slider-size": "10px", "--slider-thumb-size": "24px" },
    },
};

/**
 * Per-size CSS variables for the compact SegmentedControl.
 * Background is transparent to match page background.
 * Indicator uses a lighter shade for contrast.
 */
export const compactSegmentedControlScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--sc-font-size": "9px", "--sc-padding": "2px 6px" },
        sm: { "--sc-font-size": "10px", "--sc-padding": "4px 8px" },
        md: { "--sc-font-size": "12px", "--sc-padding": "6px 10px" },
        lg: { "--sc-font-size": "14px", "--sc-padding": "8px 12px" },
        xl: { "--sc-font-size": "16px", "--sc-padding": "10px 16px" },
    },
};

/**
 * Styles for compact SegmentedControl root element.
 * Transparent background blends with page background.
 */
export const compactSegmentedControlRootStyles = {
    backgroundColor: "transparent",
};

/**
 * Styles for compact SegmentedControl indicator (selected item highlight).
 * Uses light-dark() CSS function for theme-aware colors:
 * - Light mode: gray-2 for subtle contrast on light backgrounds
 * - Dark mode: dark-6 for visibility on dark backgrounds
 */
export const compactSegmentedControlIndicatorStyles = {
    backgroundColor: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-6))",
};

/**
 * Shared label styles for controls with labels (Switch, Checkbox, Radio).
 */
export const compactControlLabelStyles = {
    fontSize: 11,
};

/**
 * Styles for compact Slider mark labels.
 */
export const compactSliderMarkLabelStyles = {
    fontSize: 10,
    marginTop: 2,
};
