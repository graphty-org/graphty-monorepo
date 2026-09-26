import { Checkbox, Radio, RangeSlider, SegmentedControl, Slider, Switch } from "@mantine/core";

import { CompactCheckboxIcon } from "../../components/selection/CompactCheckboxIcon";
import { checkSegmentOnMouseDown } from "../../components/selection/pointer-down";
import {
    CHECKBOX_CLASSES,
    compactCheckboxScale,
    compactRadioScale,
    compactSegmentedControlScale,
    compactSliderScale,
    compactSwitchScale,
    RADIO_CLASSES,
    SEGMENTED_CLASSES,
    SLIDER_CLASSES,
    SWITCH_CLASSES,
} from "../styles/controls";
import { compactVarsForSize } from "../styles/size-scale";

/**
 * Theme extensions for the selection controls, drawn as the Figma editor draws them
 * (design/figma-spec.md 5.2 - 5.8).
 *
 * Each extension does three things:
 * - `vars`: the per-size CSS variables of ../styles/controls.ts. The resolver reads `props.size`
 *   (with optional chaining, because the regression suites call `vars!()` with no arguments), so
 *   an explicitly sized control differs from its neighbours; see ../styles/size-scale.ts.
 * - `classNames`: the `cm-*` classes ../css/selection.css.ts keys every colour, state and focus
 *   ring on, light and dark and the AA option alike (the stylesheet reads tokens only).
 * - `defaultProps`: size sm (the compact default) and the behaviour Figma has and Mantine does
 *   not: the checkbox tick glyph, no sliding segmented indicator, options that activate on
 *   mouse-down.
 *
 * Checkbox variants: `filled` (Mantine's default, kept) is Figma's blue checkbox of dialogs and
 * popovers; `variant="neutral"` is the panel checkbox that stays grey when checked (ToggleRow
 * uses it). SegmentedControl variants: the default is the panel track (5.2),
 * `variant="toolbar"` the mode switch with a raised thumb (5.3), `variant="loose"` the paint-type
 * row of separate 24 x 24 options (5.2).
 */
export const controlComponentExtensions = {
    SegmentedControl: SegmentedControl.extend({
        defaultProps: {
            size: "sm",
            withItemsBorders: false,
            // The selected face is drawn on the option itself, so it jumps in one frame; the
            // floating indicator is hidden by the stylesheet and must not animate either.
            transitionDuration: 0,
            onMouseDown: checkSegmentOnMouseDown,
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactSegmentedControlScale, props?.size),
        }),
        classNames: SEGMENTED_CLASSES,
    }),

    Checkbox: Checkbox.extend({
        defaultProps: {
            size: "sm",
            icon: CompactCheckboxIcon,
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactCheckboxScale, props?.size),
        }),
        classNames: CHECKBOX_CLASSES,
    }),

    Switch: Switch.extend({
        defaultProps: {
            size: "sm",
            // Figma's knob is a plain white pill; Mantine's inner dot is not drawn.
            withThumbIndicator: false,
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactSwitchScale, props?.size),
        }),
        classNames: SWITCH_CLASSES,
    }),

    Slider: Slider.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactSliderScale, props?.size),
        }),
        classNames: SLIDER_CLASSES,
    }),

    Radio: Radio.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactRadioScale, props?.size),
        }),
        classNames: RADIO_CLASSES,
    }),

    RangeSlider: RangeSlider.extend({
        defaultProps: {
            size: "sm",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactSliderScale, props?.size),
        }),
        classNames: SLIDER_CLASSES,
    }),
};
