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
import { compactCloseButtonScale } from "../styles/buttons";
import {
    compactDropdownStyles,
    compactInputElementStyles,
    compactInputNoHeightScale,
    compactInputScale,
    compactInputStyles,
    compactInputStylesNoHeight,
    compactLabelStyles,
    compactMultiSelectScale,
    compactMultiValueStyles,
    compactNumberInputControlsScale,
    compactNumberInputScale,
} from "../styles/inputs";
import { compactVarsForSize } from "../styles/size-scale";

/**
 * Theme extensions for input components with compact sizing by default.
 *
 * All input components default to size="sm" and variant="filled" for a compact,
 * borderless appearance with semantic background colors.
 *
 * CSS variables are applied via `vars` functions to override Mantine's defaults.
 * At the sm default:
 * - --input-size: 24px (height)
 * - --input-fz: 11px (font size)
 * - --input-bg: semantic background
 * - --input-bd: transparent (borderless at rest, primary colour on focus)
 *
 * Each resolver reads `props.size` and looks that size up in the component's
 * scale in ../styles/inputs.ts, so an explicitly sized field differs from its
 * neighbours instead of collapsing onto the compact value. Before 2026-09-13
 * these resolvers took no arguments and returned one frozen object, so xs
 * through xl all rendered identically -- a TextInput Size Comparison drew four
 * 24px rows. See ../styles/size-scale.ts for the mechanism and the product
 * owner's report.
 *
 * `props?.size` is read with optional chaining on purpose: the theme regression
 * suites invoke `extension.vars!()` with no arguments at all, and
 * compactVarsForSize maps an absent size onto the compact entry.
 */
export const inputComponentExtensions = {
    TextInput: TextInput.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
        },
        vars: (_theme, props) => ({
            root: {},
            wrapper: compactVarsForSize(compactInputScale, props?.size),
        }),
        styles: compactInputStyles,
    }),

    NumberInput: NumberInput.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
        },
        vars: (_theme, props) => ({
            root: {},
            wrapper: compactVarsForSize(compactNumberInputScale, props?.size),
            controls: compactVarsForSize(compactNumberInputControlsScale, props?.size),
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
        vars: (_theme, props) => ({
            root: {},
            wrapper: compactVarsForSize(compactInputScale, props?.size),
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
        vars: (_theme, props) => ({
            root: {},
            wrapper: compactVarsForSize(compactInputNoHeightScale, props?.size),
        }),
        styles: compactInputStylesNoHeight,
    }),

    PasswordInput: PasswordInput.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
        },
        vars: (_theme, props) => ({
            root: {},
            wrapper: compactVarsForSize(compactInputScale, props?.size),
        }),
        styles: {
            ...compactInputStyles,
            innerInput: {
                // Logical, so a password field pads its own leading edge under
                // dir="rtl" rather than always the left one.
                paddingInlineStart: 8,
                paddingInlineEnd: 8,
            },
        },
    }),

    Autocomplete: Autocomplete.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
            comboboxProps: { zIndex: FLOATING_UI_Z_INDEX },
        },
        vars: (_theme, props) => ({
            root: {},
            wrapper: compactVarsForSize(compactInputScale, props?.size),
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
        vars: (_theme, props) => ({
            root: {},
            wrapper: compactVarsForSize(compactMultiSelectScale, props?.size),
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
        vars: (_theme, props) => ({
            root: {},
            wrapper: compactVarsForSize(compactInputNoHeightScale, props?.size),
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
        vars: (_theme, props) => ({
            root: {},
            wrapper: compactVarsForSize(compactInputNoHeightScale, props?.size),
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
        vars: (_theme, props) => ({
            root: {},
            wrapper: compactVarsForSize(compactInputScale, props?.size),
        }),
        styles: compactInputStyles,
    }),

    JsonInput: JsonInput.extend({
        defaultProps: {
            size: "sm",
            variant: "filled",
        },
        vars: (_theme, props) => ({
            root: {},
            wrapper: compactVarsForSize(compactInputNoHeightScale, props?.size),
        }),
        styles: compactInputStylesNoHeight,
    }),

    // InputClearButton is a CloseButton: Mantine renders it as one and sizes it
    // from the same --cb-size / --cb-icon-size pair, so it shares
    // compactCloseButtonScale rather than repeating its numbers. Both default to
    // xs, that scale's compact entry.
    InputClearButton: InputClearButton.extend({
        defaultProps: {
            size: "xs",
        },
        vars: (_theme, props) => ({
            root: compactVarsForSize(compactCloseButtonScale, props?.size),
        }),
    }),
};
