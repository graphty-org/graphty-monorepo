import { Checkbox, Radio, RangeSlider, SegmentedControl, Slider, Switch } from "@mantine/core";

/**
 * Theme extensions for control components with "compact" size support.
 */
export const controlComponentExtensions = {
    SegmentedControl: SegmentedControl.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--sc-font-size": "10px",
                        "--sc-padding": "4px 8px",
                    },
                };
            }
            return { root: {} };
        },
    }),

    Checkbox: Checkbox.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--checkbox-size": "16px",
                    },
                };
            }
            return { root: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    label: {
                        fontSize: 11,
                    },
                };
            }
            return {};
        },
    }),

    Switch: Switch.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--switch-height": "16px",
                        "--switch-width": "28px",
                        "--switch-thumb-size": "12px",
                        "--switch-track-label-padding": "2px",
                        "--switch-label-font-size": "5px",
                    },
                };
            }
            return { root: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    label: {
                        fontSize: 11,
                    },
                };
            }
            return {};
        },
    }),

    Slider: Slider.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--slider-size": "4px",
                        "--slider-thumb-size": "12px",
                    },
                };
            }
            return { root: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    markLabel: {
                        fontSize: 10,
                        marginTop: 2,
                    },
                };
            }
            return {};
        },
    }),

    Radio: Radio.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--radio-size": "16px",
                        "--radio-icon-size": "6px",
                    },
                };
            }
            return { root: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    label: {
                        fontSize: 11,
                    },
                };
            }
            return {};
        },
    }),

    RangeSlider: RangeSlider.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--slider-size": "4px",
                        "--slider-thumb-size": "12px",
                    },
                };
            }
            return { root: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    markLabel: {
                        fontSize: 10,
                        marginTop: 2,
                    },
                };
            }
            return {};
        },
    }),
};
