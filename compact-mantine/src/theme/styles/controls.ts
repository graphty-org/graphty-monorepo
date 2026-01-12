/**
 * Static visual styles and CSS variables for compact-sized control components.
 *
 * These are applied via the `vars` and `styles` props on component extensions,
 * providing compact sizing with consistent dimensions.
 *
 * CSS Variables (from baseline):
 * - Switch: --switch-height: 16px, --switch-width: 28px
 * - Checkbox: --checkbox-size: 16px
 * - Radio: --radio-size: 16px
 * - Slider: --slider-size: 4px, --slider-thumb-size: 12px
 * - SegmentedControl: --sc-font-size: 10px
 */

/**
 * CSS variables for compact Switch component.
 */
export const compactSwitchVars = {
    "--switch-height": "16px",
    "--switch-width": "28px",
    "--switch-thumb-size": "12px",
    "--switch-track-label-padding": "2px",
    "--switch-label-font-size": "5px",
} as const;

/**
 * CSS variables for compact Checkbox component.
 */
export const compactCheckboxVars = {
    "--checkbox-size": "16px",
} as const;

/**
 * CSS variables for compact Radio component.
 */
export const compactRadioVars = {
    "--radio-size": "16px",
    "--radio-icon-size": "6px",
} as const;

/**
 * CSS variables for compact Slider and RangeSlider components.
 */
export const compactSliderVars = {
    "--slider-size": "4px",
    "--slider-thumb-size": "12px",
} as const;

/**
 * CSS variables for compact SegmentedControl component.
 * Background is transparent to match page background.
 * Indicator uses a lighter shade for contrast.
 */
export const compactSegmentedControlVars = {
    "--sc-font-size": "10px",
    "--sc-padding": "4px 8px",
} as const;

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
