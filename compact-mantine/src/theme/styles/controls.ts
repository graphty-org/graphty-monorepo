/**
 * Per-size CSS variables and class names for the selection controls (Checkbox, Switch, Radio,
 * Slider, RangeSlider, SegmentedControl), measured from the Figma editor
 * (design/figma-spec.md section 5).
 *
 * Sizes travel through the `vars` resolvers in ../components/controls.ts; every color, state and
 * pseudo element lives in ../css/selection.css.ts, keyed on the `cm-*` class names below, which
 * the extensions hand to Mantine through `classNames`.
 *
 * Each `*Scale` is a CompactSizeScale: a value set per Mantine size token, with `compactSize`
 * naming the entry the extension's default size resolves to. The sm entries are Figma's:
 * - Checkbox: 16 x 16 face (C19)
 * - Switch: 32 x 16 track, the knob a 12 x 8 pill (C20)
 * - Radio: 16 circle, 6px dot (5.6)
 * - Slider: the small variant, 8px track and 12px thumb (C29)
 * - SegmentedControl: 11px type, 0 8px padding (C17)
 * The other sizes keep a monotonic ramp around them so an explicit `size` still differs from its
 * neighbors (product owner, 2026-09-13: "sizes aren't varying anymore"; see ./size-scale.ts).
 */

import type { CompactSizeScale } from "./size-scale";

/**
 * Per-size CSS variables for the Switch. `--switch-thumb-size` is the knob's HEIGHT; the knob is
 * a pill one and a half times as wide (12 x 8 at sm).
 */
export const compactSwitchScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: {
            "--switch-height": "12px",
            "--switch-width": "24px",
            "--switch-thumb-size": "6px",
            "--switch-track-label-padding": "2px",
            "--switch-label-font-size": "4px",
        },
        sm: {
            "--switch-height": "16px",
            "--switch-width": "32px",
            "--switch-thumb-size": "8px",
            "--switch-track-label-padding": "2px",
            "--switch-label-font-size": "5px",
        },
        md: {
            "--switch-height": "20px",
            "--switch-width": "40px",
            "--switch-thumb-size": "10px",
            "--switch-track-label-padding": "3px",
            "--switch-label-font-size": "7px",
        },
        lg: {
            "--switch-height": "24px",
            "--switch-width": "48px",
            "--switch-thumb-size": "12px",
            "--switch-track-label-padding": "3px",
            "--switch-label-font-size": "9px",
        },
        xl: {
            "--switch-height": "28px",
            "--switch-width": "56px",
            "--switch-thumb-size": "14px",
            "--switch-track-label-padding": "4px",
            "--switch-label-font-size": "11px",
        },
    },
};

/**
 * Per-size CSS variables for the Checkbox face.
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
 * Per-size CSS variables for the Radio.
 */
export const compactRadioScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--radio-size": "12px", "--radio-icon-size": "4px" },
        sm: { "--radio-size": "16px", "--radio-icon-size": "6px" },
        md: { "--radio-size": "20px", "--radio-icon-size": "8px" },
        lg: { "--radio-size": "24px", "--radio-icon-size": "10px" },
        xl: { "--radio-size": "28px", "--radio-icon-size": "12px" },
    },
};

/**
 * Per-size CSS variables for the plain Slider and RangeSlider: track height and thumb diameter.
 */
export const compactSliderScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--slider-size": "6px", "--slider-thumb-size": "10px" },
        sm: { "--slider-size": "8px", "--slider-thumb-size": "12px" },
        md: { "--slider-size": "10px", "--slider-thumb-size": "16px" },
        lg: { "--slider-size": "12px", "--slider-thumb-size": "20px" },
        xl: { "--slider-size": "16px", "--slider-thumb-size": "24px" },
    },
};

/**
 * Per-size CSS variables for the SegmentedControl's text options. The panel look (24 tall) is
 * drawn by the stylesheet at every size; only the type and the inline padding move.
 */
export const compactSegmentedControlScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--sc-font-size": "9px", "--sc-padding": "0 6px" },
        sm: { "--sc-font-size": "11px", "--sc-padding": "0 8px" },
        md: { "--sc-font-size": "13px", "--sc-padding": "0 10px" },
        lg: { "--sc-font-size": "15px", "--sc-padding": "0 12px" },
        xl: { "--sc-font-size": "17px", "--sc-padding": "0 16px" },
    },
};

/** The class names the stylesheet (../css/selection.css.ts) keys on, one set per component. */
export const CHECKBOX_CLASSES = {
    root: "cm-checkbox",
    body: "cm-checkbox-body",
    inner: "cm-checkbox-inner",
    input: "cm-checkbox-input",
    icon: "cm-checkbox-icon",
    label: "cm-checkbox-label",
    description: "cm-control-description",
    error: "cm-control-error",
} as const;

export const RADIO_CLASSES = {
    root: "cm-radio",
    body: "cm-radio-body",
    inner: "cm-radio-inner",
    radio: "cm-radio-input",
    icon: "cm-radio-icon",
    label: "cm-radio-label",
    description: "cm-control-description",
    error: "cm-control-error",
} as const;

export const SWITCH_CLASSES = {
    root: "cm-switch",
    body: "cm-switch-body",
    input: "cm-switch-input",
    // cm-focus-switch: the foundation's ring on the track when the hidden input has keyboard focus
    track: "cm-switch-track cm-focus-switch",
    thumb: "cm-switch-thumb",
    label: "cm-switch-label",
    description: "cm-control-description",
    error: "cm-control-error",
} as const;

export const SLIDER_CLASSES = {
    root: "cm-slider",
    track: "cm-slider-track",
    bar: "cm-slider-bar",
    thumb: "cm-slider-thumb",
    mark: "cm-slider-mark",
    markLabel: "cm-slider-mark-label",
} as const;

export const SEGMENTED_CLASSES = {
    root: "cm-sc",
    control: "cm-sc-control",
    input: "cm-sc-input",
    label: "cm-sc-label",
    innerLabel: "cm-sc-inner",
    indicator: "cm-sc-indicator",
} as const;
