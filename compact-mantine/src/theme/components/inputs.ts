import {
    Autocomplete,
    ColorInput,
    Combobox,
    FileInput,
    InputClearButton,
    JsonInput,
    type MantineTheme,
    MultiSelect,
    NativeSelect,
    NumberInput,
    PasswordInput,
    PillsInput,
    Select,
    TagsInput,
    Textarea,
    TextInput,
} from "@mantine/core";
import { createElement } from "react";

import {
    belowComboboxProps,
    ensureFocusModality,
    ensureListboxKeyboard,
    FieldCaret,
    overTriggerComboboxProps,
    renderListboxOption,
} from "../../components/inputs/listbox";
import { installOverlayBehaviour } from "../../components/overlays/overlayBehaviour";
import {
    compactInputClearButtonScale,
    compactInputScale,
    compactPillsInputScale,
    compactTextareaScale,
} from "../styles/inputs";
import { type CompactSizeScale, type CompactVars, compactVarsForSize } from "../styles/size-scale";

/**
 * Theme extensions for the input family (design/figma-spec.md 6).
 *
 * Every field is Figma's filled field -- 24 tall, `--cm-bg-secondary`, radius 5, no border, a
 * 1px outline slot that hover (`--cm-border`) and any focus (`--cm-border-selected`) paint --
 * except Select and NativeSelect, which are Figma's one OUTLINED field (`--cm-bg`, 1px
 * `--cm-border`). `variant="outlined"` (or Mantine's own `"default"`) gives any field the
 * outlined look; `variant="filled"` gives Select the filled one; `"unstyled"` opts out.
 *
 * The look is the stylesheet (../css/inputs.css.ts and the foundation's `cm-field`), reached
 * through `classNames`; `vars` carries only the per-size metrics (../styles/inputs.ts). Every
 * dropdown is the dark listbox (`cm-menu-surface`): over the trigger for Select, below the
 * field for Autocomplete, MultiSelect and TagsInput. No overlay animates.
 *
 * `props?.size` is read with optional chaining: the theme suites call `extension.vars!()` with
 * no arguments, and compactVarsForSize maps an absent size onto the compact entry.
 */

/** The props a field's classNames depend on. */
interface FieldClassProps {
    variant?: string;
}

/**
 * Which look a variant draws.
 * @param variant - the field's variant
 * @param fallback - the look of a variant this family does not name
 * @returns the look
 */
function fieldLook(variant: string | undefined, fallback: "filled" | "outlined"): "filled" | "outlined" | "none" {
    if (variant === "unstyled") {
        return "none";
    }
    if (variant === "outlined" || variant === "default") {
        return "outlined";
    }
    if (variant === "filled") {
        return "filled";
    }
    return fallback;
}

/**
 * The classNames every field shares.
 * @param fallback - the look of a variant this family does not name
 * @param extra - classes the wrapper also takes (`cm-select`, `cm-pills-field`, ...)
 * @returns a classNames resolver
 */
function fieldClassNames(fallback: "filled" | "outlined", extra = "") {
    return (_theme: MantineTheme, props: FieldClassProps): Record<string, string> => {
        const look = fieldLook(props.variant, fallback);
        if (look === "none") {
            return {};
        }
        const wrapper = ["cm-field", look === "outlined" ? "cm-field-outlined" : "", "cm-input-wrapper", extra]
            .filter(Boolean)
            .join(" ");
        return {
            wrapper,
            input: "cm-input",
            section: "cm-input-section",
            label: "cm-field-label",
            description: "cm-field-description",
            error: "cm-field-error",
        };
    };
}

/**
 * The dark listbox's classNames (spec 6.5). The dropdown is also a `cm-menu`: it scrolls itself
 * (no ScrollArea) and takes the menus' 24px scroll chevron rows (overlayBehaviour.ts).
 */
const LISTBOX_CLASS_NAMES = {
    dropdown: "cm-menu-surface cm-menu cm-listbox",
    options: "cm-listbox-options",
    option: "cm-menu-row cm-listbox-option",
    group: "cm-listbox-group",
    groupLabel: "cm-listbox-group-label",
    empty: "cm-listbox-empty",
};

/**
 * The pill field's pill classNames (spec 6.7: variable-pill shaped pills), and its list, where
 * several options are checked but only the pointer's or the keyboard's row is ever filled.
 */
const PILL_CLASS_NAMES = {
    dropdown: "cm-menu-surface cm-menu cm-listbox cm-listbox-multi",
    pill: "cm-input-pill",
    pillsList: "cm-input-pills",
    inputField: "cm-input-pills-field",
};

/**
 * A field family's classNames plus the listbox's.
 * @param fallback - see fieldClassNames
 * @param extra - wrapper classes
 * @param more - further classNames (pills)
 * @returns a classNames resolver
 */
function listFieldClassNames(fallback: "filled" | "outlined", extra = "", more: Record<string, string> = {}) {
    const field = fieldClassNames(fallback, extra);
    return (theme: MantineTheme, props: FieldClassProps): Record<string, string> => ({
        ...field(theme, props),
        ...LISTBOX_CLASS_NAMES,
        ...more,
    });
}

/** The 5 x 3 caret every select-like trigger shows in its 24px trailing slot. */
const CARET = createElement(FieldCaret);

/**
 * A single-choice list: opens over its trigger, the selected option on top of it. No ScrollArea:
 * the dropdown itself scrolls, clamped by the stylesheet to the viewport less 6px each side.
 */
const SINGLE_LIST_DEFAULTS = {
    comboboxProps: overTriggerComboboxProps(),
    withScrollArea: false,
    renderOption: renderListboxOption,
};

/** A list that opens below its field. */
const BELOW_LIST_DEFAULTS = {
    comboboxProps: belowComboboxProps(),
    withScrollArea: false,
    renderOption: renderListboxOption,
};

/**
 * The per-size variables of a field with a list, installing the document-level list behaviour
 * (scroll chevrons) on first use.
 * @param scale - the size scale
 * @param size - the field's size
 * @returns the wrapper variables
 */
function listVars(
    scale: CompactSizeScale,
    size?: string | number | null,
): { root: Record<string, never>; wrapper: CompactVars } {
    installOverlayBehaviour();
    return { root: {}, wrapper: compactVarsForSize(scale, size) };
}

export const inputComponentExtensions = {
    TextInput: TextInput.extend({
        defaultProps: { size: "sm", variant: "filled" },
        vars: (_theme, props) => ({ root: {}, wrapper: compactVarsForSize(compactInputScale, props?.size) }),
        classNames: fieldClassNames("filled"),
    }),

    // No stepper chevrons (spec 6.1): ArrowUp / ArrowDown still step. `hideControls={false}`
    // brings Mantine's steppers back for a caller who asks.
    NumberInput: NumberInput.extend({
        defaultProps: { size: "sm", variant: "filled", hideControls: true },
        vars: (_theme, props) => ({
            root: {},
            wrapper: compactVarsForSize(compactInputScale, props?.size),
            controls: {},
        }),
        classNames: fieldClassNames("filled"),
    }),

    // The APG combobox: role="combobox" plus aria-expanded (from ComboboxTarget below), so a
    // screen reader hears the list open and the highlight move (aria-activedescendant).
    Select: Select.extend({
        defaultProps: {
            size: "sm",
            variant: "outlined",
            rightSection: CARET,
            role: "combobox",
            ...SINGLE_LIST_DEFAULTS,
        },
        vars: (_theme, props) => {
            ensureFocusModality();
            ensureListboxKeyboard();
            return listVars(compactInputScale, props?.size);
        },
        classNames: listFieldClassNames("outlined", "cm-select"),
    }),

    NativeSelect: NativeSelect.extend({
        defaultProps: { size: "sm", variant: "outlined", rightSection: CARET },
        vars: (_theme, props) => {
            ensureFocusModality();
            return { root: {}, wrapper: compactVarsForSize(compactInputScale, props?.size) };
        },
        classNames: fieldClassNames("outlined", "cm-select"),
    }),

    Textarea: Textarea.extend({
        defaultProps: { size: "sm", variant: "filled" },
        // An autosize field's floor is its minRows lines, not the size's fixed 56px: a one-line
        // composer is 4 + 16 + 4 = 24, the panel's control height, and grows a line at a time.
        // Mantine's Textarea strips `autosize` before the styles API sees the props and forwards
        // minRows / maxRows only while autosizing, so those are the signal.
        vars: (_theme, props) => ({
            root: {},
            wrapper: {
                ...compactVarsForSize(compactTextareaScale, props?.size),
                ...(props?.autosize || props?.minRows !== undefined || props?.maxRows !== undefined
                    ? {
                          "--input-height": `calc(${props.minRows ?? 1} * var(--input-line-height) + 2 * var(--input-padding-y))`,
                      }
                    : {}),
            },
        }),
        classNames: fieldClassNames("filled"),
    }),

    PasswordInput: PasswordInput.extend({
        defaultProps: { size: "sm", variant: "filled" },
        vars: (_theme, props) => ({
            root: { "--psi-button-size": "24px", "--psi-icon-size": "12px" },
            wrapper: compactVarsForSize(compactInputScale, props?.size),
        }),
        classNames: (theme, props) => ({
            ...fieldClassNames("filled")(theme, props),
            innerInput: "cm-input-inner",
            visibilityToggle: "cm-input-toggle",
        }),
    }),

    Autocomplete: Autocomplete.extend({
        defaultProps: { size: "sm", variant: "filled", role: "combobox", ...BELOW_LIST_DEFAULTS },
        vars: (_theme, props) => listVars(compactInputScale, props?.size),
        classNames: listFieldClassNames("filled"),
    }),

    MultiSelect: MultiSelect.extend({
        defaultProps: { size: "sm", variant: "filled", rightSection: CARET, ...BELOW_LIST_DEFAULTS },
        vars: (_theme, props) => listVars(compactPillsInputScale, props?.size),
        classNames: listFieldClassNames("filled", "cm-pills-field", PILL_CLASS_NAMES),
    }),

    TagsInput: TagsInput.extend({
        defaultProps: { size: "sm", variant: "filled", ...BELOW_LIST_DEFAULTS },
        vars: (_theme, props) => listVars(compactPillsInputScale, props?.size),
        classNames: listFieldClassNames("filled", "cm-pills-field", PILL_CLASS_NAMES),
    }),

    PillsInput: PillsInput.extend({
        defaultProps: { size: "sm", variant: "filled" },
        vars: (_theme, props) => ({ root: {}, wrapper: compactVarsForSize(compactPillsInputScale, props?.size) }),
        classNames: fieldClassNames("filled", "cm-pills-field"),
    }),

    FileInput: FileInput.extend({
        defaultProps: { size: "sm", variant: "filled" },
        vars: (_theme, props) => ({ root: {}, wrapper: compactVarsForSize(compactInputScale, props?.size) }),
        classNames: (theme, props) => ({
            ...fieldClassNames("filled")(theme, props),
            placeholder: "cm-input-placeholder",
        }),
    }),

    JsonInput: JsonInput.extend({
        defaultProps: { size: "sm", variant: "filled" },
        // An autosize field's floor is its minRows lines, not the size's fixed 56px: a one-line
        // composer is 4 + 16 + 4 = 24, the panel's control height, and grows a line at a time.
        // Mantine's Textarea strips `autosize` before the styles API sees the props and forwards
        // minRows / maxRows only while autosizing, so those are the signal.
        vars: (_theme, props) => ({
            root: {},
            wrapper: {
                ...compactVarsForSize(compactTextareaScale, props?.size),
                ...(props?.autosize || props?.minRows !== undefined || props?.maxRows !== undefined
                    ? {
                          "--input-height": `calc(${props.minRows ?? 1} * var(--input-line-height) + 2 * var(--input-padding-y))`,
                      }
                    : {}),
            },
        }),
        classNames: fieldClassNames("filled"),
    }),

    // A filled field with the 14px colour chit at x+5 in a 24px leading slot (spec 6.7, 7.1).
    ColorInput: ColorInput.extend({
        defaultProps: { size: "sm", variant: "filled" },
        vars: (_theme, props) => ({
            root: {},
            wrapper: compactVarsForSize(compactInputScale, props?.size),
            eyeDropperIcon: { "--ci-eye-dropper-icon-size": "12px" },
            eyeDropperButton: { "--ci-button-size": "24px" },
            colorPreview: { "--ci-preview-size": "14px" },
        }),
        classNames: (theme, props) => ({
            ...fieldClassNames("filled", "cm-color-field")(theme, props),
            colorPreview: "cm-color-field-chit",
            dropdown: "cm-popover-surface",
        }),
    }),

    // Mantine's combobox targets omit aria-expanded unless asked; every themed target states it.
    ComboboxTarget: Combobox.Target.extend({
        defaultProps: { withExpandedAttribute: true },
    }),

    // The clear (x) of a field: a CloseButton, 16px in the 24px trailing slot (spec 6.2).
    InputClearButton: InputClearButton.extend({
        defaultProps: { size: "xs" },
        vars: (_theme, props) => ({ root: compactVarsForSize(compactInputClearButtonScale, props?.size) }),
        classNames: { root: "cm-input-clear cm-focus-outside" },
    }),
};
