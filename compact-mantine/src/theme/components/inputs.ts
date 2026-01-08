import {
    Autocomplete,
    ColorInput,
    FileInput,
    InputClearButton,
    JsonInput,
    MultiSelect,
    NumberInput,
    PasswordInput,
    PillsInput,
    Select,
    TagsInput,
    Textarea,
    TextInput,
} from "@mantine/core";

import { FLOATING_UI_Z_INDEX } from "../../constants/popout";

/**
 * Shared CSS variables for compact-sized inputs.
 */
const compactInputVars = {
    root: {},
    wrapper: {
        "--input-size": "24px",
        "--input-fz": "11px",
        "--input-bg": "var(--mantine-color-default)",
        "--input-bd": "none",
    },
};

/**
 * Shared styles for compact-sized inputs.
 */
const compactInputStyles = {
    label: {
        fontSize: 11,
        color: "var(--mantine-color-dimmed)",
        marginBottom: 1,
        lineHeight: 1.2,
    },
    input: {
        paddingLeft: 8,
        paddingRight: 8,
        border: "none",
    },
};

/**
 * Shared styles for compact-sized dropdown menus (Select, Autocomplete, etc.).
 */
const compactDropdownStyles = {
    dropdown: {
        padding: 4,
        border: "none",
        boxShadow: "var(--mantine-shadow-md)",
    },
    option: {
        fontSize: 11,
        padding: "4px 8px",
        borderRadius: 4,
    },
    options: {
        // No gap between options for compact appearance
    },
    groupLabel: {
        fontSize: 10,
        padding: "4px 8px",
    },
    empty: {
        fontSize: 11,
        padding: "8px",
    },
};

/**
 * Theme extensions for input components with "compact" size support.
 */
export const inputComponentExtensions = {
    TextInput: TextInput.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputVars;
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputStyles;
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
                        "--input-bg": "var(--mantine-color-default)",
                        "--input-bd": "none",
                        "--input-right-section-width": "24px",
                    },
                    controls: {
                        "--ni-chevron-size": "10px",
                    },
                };
            }
            return { root: {}, wrapper: {}, controls: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    ...compactInputStyles,
                    control: {
                        borderColor: "transparent",
                    },
                };
            }
            return {};
        },
    }),

    Select: Select.extend({
        defaultProps: {
            comboboxProps: { zIndex: FLOATING_UI_Z_INDEX },
        },
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputVars;
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    ...compactInputStyles,
                    ...compactDropdownStyles,
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
                        "--input-bg": "var(--mantine-color-default)",
                        "--input-bd": "none",
                    },
                };
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputStyles;
            }
            return {};
        },
    }),

    PasswordInput: PasswordInput.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputVars;
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    ...compactInputStyles,
                    innerInput: {
                        paddingLeft: 8,
                        paddingRight: 8,
                    },
                };
            }
            return {};
        },
    }),

    Autocomplete: Autocomplete.extend({
        defaultProps: {
            comboboxProps: { zIndex: FLOATING_UI_Z_INDEX },
        },
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputVars;
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    ...compactInputStyles,
                    ...compactDropdownStyles,
                };
            }
            return {};
        },
    }),

    // ColorInput uses styles instead of vars due to complex type requirements
    // (ColorInput requires eyeDropperIcon, eyeDropperButton, colorPreview CSS vars)
    ColorInput: ColorInput.extend({
        defaultProps: {
            popoverProps: { zIndex: FLOATING_UI_Z_INDEX },
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    ...compactInputStyles,
                    wrapper: {
                        "--input-size": "24px",
                        "--input-fz": "11px",
                        "--input-bg": "var(--mantine-color-default)",
                        "--input-bd": "none",
                    },
                };
            }
            return {};
        },
    }),

    MultiSelect: MultiSelect.extend({
        defaultProps: {
            comboboxProps: { zIndex: FLOATING_UI_Z_INDEX },
        },
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {},
                    wrapper: {
                        "--input-fz": "11px",
                        "--input-bg": "var(--mantine-color-default)",
                        "--input-bd": "none",
                        "--input-size": "24px",
                        "--combobox-chevron-size": "12px",
                    },
                };
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    ...compactInputStyles,
                    ...compactDropdownStyles,
                    input: {
                        ...compactInputStyles.input,
                        minHeight: 24,
                        height: "auto",
                        display: "flex",
                        alignItems: "center",
                        paddingTop: 4,
                        paddingBottom: 4,
                    },
                    inputField: {
                        minWidth: 60,
                        flexBasis: 60,
                    },
                    pillsList: {
                        columnGap: 4,
                        rowGap: 2,
                    },
                    pill: {
                        margin: 0,
                        paddingTop: 2,
                        paddingBottom: 2,
                    },
                };
            }
            return {};
        },
    }),

    TagsInput: TagsInput.extend({
        defaultProps: {
            comboboxProps: { zIndex: FLOATING_UI_Z_INDEX },
        },
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {},
                    wrapper: {
                        "--input-fz": "11px",
                        "--input-bg": "var(--mantine-color-default)",
                        "--input-bd": "none",
                    },
                };
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    ...compactInputStyles,
                    ...compactDropdownStyles,
                    input: {
                        ...compactInputStyles.input,
                        minHeight: 24,
                        height: "auto",
                        display: "flex",
                        alignItems: "center",
                        paddingTop: 4,
                        paddingBottom: 4,
                    },
                    inputField: {
                        minWidth: 30,
                        flexBasis: 30,
                    },
                    pillsList: {
                        columnGap: 4,
                        rowGap: 2,
                    },
                    pill: {
                        margin: 0,
                        paddingTop: 2,
                        paddingBottom: 2,
                    },
                };
            }
            return {};
        },
    }),

    PillsInput: PillsInput.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {},
                    wrapper: {
                        "--input-fz": "11px",
                        "--input-bg": "var(--mantine-color-default)",
                        "--input-bd": "none",
                    },
                };
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    ...compactInputStyles,
                    input: {
                        ...compactInputStyles.input,
                        minHeight: 24,
                        height: "auto",
                        display: "flex",
                        alignItems: "center",
                        paddingTop: 4,
                        paddingBottom: 4,
                    },
                    inputField: {
                        minWidth: 30,
                        flexBasis: 30,
                    },
                    pillsList: {
                        columnGap: 4,
                        rowGap: 2,
                    },
                    pill: {
                        margin: 0,
                        paddingTop: 2,
                        paddingBottom: 2,
                    },
                };
            }
            return {};
        },
    }),

    FileInput: FileInput.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputVars;
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputStyles;
            }
            return {};
        },
    }),

    JsonInput: JsonInput.extend({
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {},
                    wrapper: {
                        "--input-fz": "11px",
                        "--input-bg": "var(--mantine-color-default)",
                        "--input-bd": "none",
                    },
                };
            }
            return { root: {}, wrapper: {} };
        },
        styles: (_theme, props) => {
            if (props.size === "compact") {
                return compactInputStyles;
            }
            return {};
        },
    }),

    InputClearButton: InputClearButton.extend({
        defaultProps: {
            size: "compact",
        },
        vars: (_theme, props) => {
            if (props.size === "compact") {
                return {
                    root: {
                        "--cb-size": "16px",
                        "--cb-icon-size": "12px",
                    },
                };
            }
            return { root: {} };
        },
    }),
};
