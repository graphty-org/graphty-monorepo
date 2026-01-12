import {
    Autocomplete,
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
import {
    compactDropdownStyles,
    compactInputElementStyles,
    compactInputStyles,
    compactInputStylesNoHeight,
    compactInputVars,
    compactInputVarsNoHeight,
    compactLabelStyles,
    compactMultiValueStyles,
} from "../styles/inputs";

/**
 * Theme extensions for input components with compact sizing by default.
 *
 * All input components default to size="sm" and variant="filled" for a compact,
 * borderless appearance with semantic background colors.
 *
 * CSS variables are applied via `vars` functions to override Mantine's defaults:
 * - --input-size: 24px (height)
 * - --input-fz: 11px (font size)
 * - --input-bg: semantic background
 * - --input-bd: none (no border)
 */
export const inputComponentExtensions = {
    TextInput: TextInput.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
        },
        vars: () => ({
            root: {},
            wrapper: compactInputVars,
        }),
        styles: compactInputStyles,
    }),

    NumberInput: NumberInput.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
        },
        vars: () => ({
            root: {},
            wrapper: {
                ...compactInputVars,
                "--input-right-section-width": "24px",
            },
            controls: {
                "--ni-chevron-size": "10px",
            },
        }),
        styles: {
            label: compactLabelStyles,
            input: compactInputElementStyles,
            control: {
                borderColor: "transparent",
            },
        },
    }),

    Select: Select.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
            comboboxProps: { zIndex: FLOATING_UI_Z_INDEX },
        },
        vars: () => ({
            root: {},
            wrapper: compactInputVars,
        }),
        styles: {
            ...compactInputStyles,
            ...compactDropdownStyles,
        },
    }),

    Textarea: Textarea.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
        },
        vars: () => ({
            root: {},
            wrapper: compactInputVarsNoHeight,
        }),
        styles: compactInputStylesNoHeight,
    }),

    PasswordInput: PasswordInput.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
        },
        vars: () => ({
            root: {},
            wrapper: compactInputVars,
        }),
        styles: {
            ...compactInputStyles,
            innerInput: {
                paddingLeft: 8,
                paddingRight: 8,
            },
        },
    }),

    Autocomplete: Autocomplete.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
            comboboxProps: { zIndex: FLOATING_UI_Z_INDEX },
        },
        vars: () => ({
            root: {},
            wrapper: compactInputVars,
        }),
        styles: {
            ...compactInputStyles,
            ...compactDropdownStyles,
        },
    }),

    MultiSelect: MultiSelect.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
            comboboxProps: { zIndex: FLOATING_UI_Z_INDEX },
        },
        vars: () => ({
            root: {},
            wrapper: {
                ...compactInputVars,
                "--combobox-chevron-size": "12px",
            },
        }),
        styles: {
            label: compactLabelStyles,
            ...compactDropdownStyles,
            ...compactMultiValueStyles,
            inputField: {
                minWidth: 60,
                flexBasis: 60,
            },
        },
    }),

    TagsInput: TagsInput.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
            comboboxProps: { zIndex: FLOATING_UI_Z_INDEX },
        },
        vars: () => ({
            root: {},
            wrapper: compactInputVarsNoHeight,
        }),
        styles: {
            label: compactLabelStyles,
            ...compactDropdownStyles,
            ...compactMultiValueStyles,
            inputField: {
                minWidth: 30,
                flexBasis: 30,
            },
        },
    }),

    PillsInput: PillsInput.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
        },
        vars: () => ({
            root: {},
            wrapper: compactInputVarsNoHeight,
        }),
        styles: {
            label: compactLabelStyles,
            ...compactMultiValueStyles,
        },
    }),

    FileInput: FileInput.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
        },
        vars: () => ({
            root: {},
            wrapper: compactInputVars,
        }),
        styles: compactInputStyles,
    }),

    JsonInput: JsonInput.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
        },
        vars: () => ({
            root: {},
            wrapper: compactInputVarsNoHeight,
        }),
        styles: compactInputStylesNoHeight,
    }),

    InputClearButton: InputClearButton.extend({
        defaultProps: {
            size: "xs",
        },
        vars: () => ({
            root: {
                "--cb-size": "16px",
                "--cb-icon-size": "12px",
            },
        }),
    }),
};
