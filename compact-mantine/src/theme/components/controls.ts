import { Checkbox, Radio, RangeSlider, SegmentedControl, Slider, Switch } from "@mantine/core";

import {
    compactCheckboxScale,
    compactControlLabelStyles,
    compactRadioScale,
    compactSegmentedControlIndicatorStyles,
    compactSegmentedControlRootStyles,
    compactSegmentedControlScale,
    compactSliderMarkLabelStyles,
    compactSliderScale,
    compactSwitchScale,
} from "../styles/controls";
import { compactVarsForSize } from "../styles/size-scale";

/**
 * Theme extensions for control components with compact sizing by default.
 *
 * All control components default to size="sm", which every scale in
 * ../styles/controls.ts answers with the compact values this package has always
 * shipped. Each `vars` resolver reads `props.size` and looks that size up in the
 * component's scale, so an explicitly sized control differs from its neighbours
 * instead of collapsing onto the compact value. Before 2026-09-13 these
 * resolvers took no arguments and returned one frozen object, so xs through xl
 * all rendered identically -- see ../styles/size-scale.ts for the mechanism and
 * the product owner's report.
 *
 * `props?.size` is read with optional chaining on purpose: the theme regression
 * suites invoke `extension.vars!()` with no arguments at all, and
 * compactVarsForSize maps an absent size onto the compact entry.
 *
 * The compact (size="sm") values:
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
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactSegmentedControlScale, props?.size),
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
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactCheckboxScale, props?.size),
        }),
        styles: {
            label: compactControlLabelStyles,
        },
    }),

    Switch: Switch.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactSwitchScale, props?.size),
        }),
        styles: {
            label: compactControlLabelStyles,
        },
    }),

    Slider: Slider.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactSliderScale, props?.size),
        }),
        styles: {
            markLabel: compactSliderMarkLabelStyles,
        },
    }),

    Radio: Radio.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactRadioScale, props?.size),
        }),
        styles: {
            label: compactControlLabelStyles,
        },
    }),

    RangeSlider: RangeSlider.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactSliderScale, props?.size),
        }),
        styles: {
            markLabel: compactSliderMarkLabelStyles,
        },
    }),
};
