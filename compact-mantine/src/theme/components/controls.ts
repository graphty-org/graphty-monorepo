import { Checkbox, Radio, RangeSlider, SegmentedControl, Slider, Switch } from "@mantine/core";

import {
    compactCheckboxVars,
    compactControlLabelStyles,
    compactRadioVars,
    compactSegmentedControlIndicatorStyles,
    compactSegmentedControlRootStyles,
    compactSegmentedControlVars,
    compactSliderMarkLabelStyles,
    compactSliderVars,
    compactSwitchVars,
} from "../styles/controls";

/**
 * Theme extensions for control components with compact sizing by default.
 *
 * All control components default to size="sm" for a compact appearance.
 * CSS variables are applied via `vars` functions to override Mantine's defaults:
 * - Switch: --switch-height: 16px, --switch-width: 28px
 * - Checkbox: --checkbox-size: 16px
 * - Radio: --radio-size: 16px
 * - Slider: --slider-size: 4px, --slider-thumb-size: 12px
 * - SegmentedControl: --sc-font-size: 10px
 */
export const controlComponentExtensions = {
    SegmentedControl: SegmentedControl.extend({
        defaultProps: {
            size: "sm",
            withItemsBorders: false,
        },
        vars: () => ({
            root: compactSegmentedControlVars,
        }),
        styles: {
            root: compactSegmentedControlRootStyles,
            indicator: compactSegmentedControlIndicatorStyles,
        },
    }),

    Checkbox: Checkbox.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactCheckboxVars,
        }),
        styles: {
            label: compactControlLabelStyles,
        },
    }),

    Switch: Switch.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactSwitchVars,
        }),
        styles: {
            label: compactControlLabelStyles,
        },
    }),

    Slider: Slider.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactSliderVars,
        }),
        styles: {
            markLabel: compactSliderMarkLabelStyles,
        },
    }),

    Radio: Radio.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactRadioVars,
        }),
        styles: {
            label: compactControlLabelStyles,
        },
    }),

    RangeSlider: RangeSlider.extend({
        defaultProps: {
            size: "sm",
        },
        vars: () => ({
            root: compactSliderVars,
        }),
        styles: {
            markLabel: compactSliderMarkLabelStyles,
        },
    }),
};
