import {
    ActionIcon,
    Autocomplete,
    Badge,
    Button,
    Checkbox,
    ColorInput,
    createTheme,
    MantineProvider,
    NativeSelect,
    NumberInput,
    PasswordInput,
    Pill,
    Radio,
    SegmentedControl,
    Select,
    Slider,
    Switch,
    Textarea,
    TextInput,
} from "@mantine/core";
import React, {ReactElement} from "react";

const theme = createTheme({
    colors: {
        dark: [
            "#d5d7da",
            "#a3a8b1",
            "#7a828e",
            "#5f6873",
            "#48525c",
            "#374047",
            "#2a3035",
            "#1f2428",
            "#161b22",
            "#0d1117",
        ],
    },

    components: {
        TextInput: TextInput.extend({
            vars: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {},
                        wrapper: {
                            "--input-size": "24px",
                            "--input-fz": "11px",
                            "--input-bg": "var(--mantine-color-dark-8)",
                            "--input-bd": "none",
                        },
                    };
                }

                return {root: {}, wrapper: {}};
            },
            styles: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        input: {
                            paddingLeft: 8,
                            paddingRight: 8,
                        },
                    };
                }

                return {};
            },
        }),

        NumberInput: NumberInput.extend({
            vars: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {},
                        wrapper: {
                            "--input-size": "24px",
                            "--input-fz": "11px",
                            "--input-bg": "var(--mantine-color-dark-8)",
                            "--input-bd": "none",
                        },
                        controls: {},
                    };
                }

                return {root: {}, wrapper: {}, controls: {}};
            },
            styles: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        input: {
                            paddingLeft: 8,
                            paddingRight: 8,
                        },
                    };
                }

                return {};
            },
        }),

        NativeSelect: NativeSelect.extend({
            vars: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {},
                        wrapper: {
                            "--input-size": "24px",
                            "--input-fz": "11px",
                            "--input-bg": "var(--mantine-color-dark-8)",
                            "--input-bd": "none",
                        },
                    };
                }

                return {root: {}, wrapper: {}};
            },
            styles: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        input: {
                            paddingLeft: 8,
                            paddingRight: 8,
                        },
                    };
                }

                return {};
            },
        }),

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

                return {root: {}};
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

                return {root: {}};
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
                        },
                    };
                }

                return {root: {}};
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

                return {root: {}};
            },
        }),

        Button: Button.extend({
            vars: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {
                            "--button-height": "24px",
                            "--button-fz": "11px",
                            "--button-padding-x": "8px",
                        },
                    };
                }

                return {root: {}};
            },
        }),

        ActionIcon: ActionIcon.extend({
            vars: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {
                            "--ai-size": "24px",
                        },
                    };
                }

                return {root: {}};
            },
        }),

        // Phase 3 Components

        Select: Select.extend({
            vars: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {},
                        wrapper: {
                            "--input-size": "24px",
                            "--input-fz": "11px",
                            "--input-bg": "var(--mantine-color-dark-8)",
                            "--input-bd": "none",
                        },
                    };
                }

                return {root: {}, wrapper: {}};
            },
            styles: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        input: {
                            paddingLeft: 8,
                            paddingRight: 8,
                        },
                    };
                }

                return {};
            },
        }),

        Textarea: Textarea.extend({
            vars: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {},
                        wrapper: {
                            "--input-fz": "11px",
                            "--input-bg": "var(--mantine-color-dark-8)",
                            "--input-bd": "none",
                        },
                    };
                }

                return {root: {}, wrapper: {}};
            },
            styles: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        input: {
                            paddingLeft: 8,
                            paddingRight: 8,
                        },
                    };
                }

                return {};
            },
        }),

        PasswordInput: PasswordInput.extend({
            vars: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {},
                        wrapper: {
                            "--input-size": "24px",
                            "--input-fz": "11px",
                            "--input-bg": "var(--mantine-color-dark-8)",
                            "--input-bd": "none",
                        },
                    };
                }

                return {root: {}, wrapper: {}};
            },
            styles: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        input: {
                            paddingLeft: 8,
                            paddingRight: 8,
                        },
                    };
                }

                return {};
            },
        }),

        Autocomplete: Autocomplete.extend({
            vars: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {},
                        wrapper: {
                            "--input-size": "24px",
                            "--input-fz": "11px",
                            "--input-bg": "var(--mantine-color-dark-8)",
                            "--input-bd": "none",
                        },
                    };
                }

                return {root: {}, wrapper: {}};
            },
            styles: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        input: {
                            paddingLeft: 8,
                            paddingRight: 8,
                        },
                    };
                }

                return {};
            },
        }),

        ColorInput: ColorInput.extend({
            vars: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        root: {},
                        wrapper: {
                            "--input-size": "24px",
                            "--input-fz": "11px",
                            "--input-bg": "var(--mantine-color-dark-8)",
                            "--input-bd": "none",
                        },
                        eyeDropperIcon: {},
                        eyeDropperButton: {},
                        colorPreview: {},
                    };
                }

                return {root: {}, wrapper: {}, eyeDropperIcon: {}, eyeDropperButton: {}, colorPreview: {}};
            },
            styles: (_theme, props) => {
                if (props.size === "compact") {
                    return {
                        input: {
                            paddingLeft: 8,
                            paddingRight: 8,
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

                return {root: {}};
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

        Badge: Badge.extend({
            vars: (_theme, props) => {
                if ((props.size as string) === "compact") {
                    return {
                        root: {
                            "--badge-height": "14px",
                            "--badge-fz": "9px",
                            "--badge-padding-x": "4px",
                        },
                    };
                }

                return {root: {}};
            },
        }),

        Pill: Pill.extend({
            vars: (_theme, props) => {
                if ((props.size as string) === "compact") {
                    return {
                        root: {
                            "--pill-height": "16px",
                            "--pill-fz": "10px",
                        },
                    };
                }

                return {root: {}};
            },
        }),
    },
});

export function AllProviders({children}: {children: React.ReactNode}): ReactElement {
    return (
        <MantineProvider theme={theme} defaultColorScheme="dark">
            {children}
        </MantineProvider>
    );
}
