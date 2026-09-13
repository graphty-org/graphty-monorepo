import { PANEL_INK } from "../../constants/panel";
import type { CompactSizeScale, CompactVars } from "./size-scale";

/**
 * Static visual styles and per-size CSS variables for compact-sized inputs.
 *
 * These styles are applied via the `styles` prop on component extensions,
 * providing borderless inputs with semantic background colors and compact typography.
 *
 * IMPORTANT: CSS custom properties are set via `vars` functions to override
 * Mantine's default size-based variables. Static styles cannot override vars.
 *
 * Each `*Scale` below is a CompactSizeScale: one variable set per Mantine size
 * token, which the `vars` resolvers in ../components/inputs.ts look the rendered
 * size up in. The sm entry of every scale IS the object this package shipped
 * while those resolvers took no arguments and answered every size with one
 * frozen object, so the compact default is unchanged and only the other tokens
 * move. See ./size-scale.ts for the mechanism and the product owner's
 * 2026-09-13 report, "sizes aren't varying anymore".
 */

/**
 * The colour of the 1px border a field draws while it holds keyboard focus.
 *
 * The border is the field's whole focus indicator -- inputs are the one family
 * of controls Mantine gives a border swap rather than the 2px outline every
 * button, checkbox and switch in this library gets -- so its contrast against
 * the field it sits on is what decides whether focus can be seen at all.
 *
 * Mantine's own default is `--mantine-primary-color-filled`, which is shade 6
 * in light but shade 8 in dark. Shade 8 measures 2.66:1 on the filled field
 * (#1971c2 on #2a3035) and 3.12:1 on the panel behind it, so in dark mode the
 * ring landed under the 3:1 WCAG 1.4.11 asks of a non-text indicator. Shade 5
 * is the same hue as whatever primary colour the consumer set, two steps
 * lighter, and measures 4.46:1 on the field and 5.23:1 on the panel. Light mode
 * keeps the filled colour, which already measures 3.20:1 and 3.56:1.
 */
const INPUT_FOCUS_BORDER = "light-dark(var(--mantine-primary-color-filled), var(--mantine-primary-color-5))";

/**
 * CSS variables for compact input wrapper (used in vars functions).
 * These control Mantine's internal sizing calculations.
 *
 * Note: Mantine uses --input-height for actual height, not --input-size.
 * We set both for compatibility.
 */
export const compactInputVars = {
    "--input-height": "24px",
    "--input-size": "24px", // For components that use this variable
    "--input-fz": "11px",
    "--input-bg": "var(--mantine-color-default)",
    // `transparent`, not `none`. Mantine draws the input's border as
    // `1px solid var(--input-bd)` and shows focus by swapping that one variable
    // to `--input-bd-focus`; `none` makes the whole border declaration invalid,
    // so the focus border could never paint. A transparent border keeps the
    // resting field borderless and reserves the 1px the focus ring needs.
    "--input-bd": "transparent",
    // See INPUT_FOCUS_BORDER: the default is too dark to see on a dark field.
    "--input-bd-focus": INPUT_FOCUS_BORDER,
} as const;

/**
 * CSS variables for compact input wrapper WITHOUT fixed height.
 * Used for multi-line inputs (Textarea, JsonInput) and variable-height inputs.
 */
export const compactInputVarsNoHeight = {
    "--input-fz": "11px",
    "--input-bg": "var(--mantine-color-default)",
    // See compactInputVars: transparent rather than none, so focus can paint.
    "--input-bd": "transparent",
    // See INPUT_FOCUS_BORDER.
    "--input-bd-focus": INPUT_FOCUS_BORDER,
} as const;

// NOTE: compactInputVarsFn and compactInputVarsNoHeightFn were removed as unused.
// The object constants (compactInputVars, compactInputVarsNoHeight) are used directly
// in theme component extensions rather than through wrapper functions.

/**
 * Label styles shared across all input components.
 */
export const compactLabelStyles = {
    fontSize: 11,
    // The secondary ink, not `--mantine-color-dimmed`: at 11px the latter is
    // 4.03:1 on the panel and 3.32:1 in light mode, under the 4.5:1 WCAG AA
    // asks of text.
    color: PANEL_INK.CHROME,
    marginBottom: 1,
    lineHeight: 1.2,
};

/**
 * Input element styles shared across all input components.
 *
 * The border is deliberately absent here: it is controlled by the `--input-bd`
 * custom property, which is transparent at rest and takes the primary colour
 * while the field has focus.
 */
export const compactInputElementStyles = {
    // An inline `border` here would win over Mantine's focus rule and put the
    // library back to having no visible focus indicator on any input.
    //
    // Logical, not paddingLeft/paddingRight: an input under dir="rtl" has to
    // pad the edge its text starts from. These are also the two properties
    // PanelField clears so that Mantine's leftSectionWidth can drive the inset
    // instead, and it can only clear them under the names they are written in.
    paddingInlineStart: 8,
    paddingInlineEnd: 8,
    backgroundColor: "var(--mantine-color-default)",
};

/**
 * Shared styles for compact-sized inputs (TextInput, NumberInput, etc.).
 * CSS variables are NOT included here - they're set via vars functions.
 */
export const compactInputStyles = {
    label: compactLabelStyles,
    input: compactInputElementStyles,
};

/**
 * Styles for inputs that don't need fixed height (Textarea, JsonInput).
 * CSS variables are NOT included here - they're set via vars functions.
 */
export const compactInputStylesNoHeight = {
    label: compactLabelStyles,
    input: compactInputElementStyles,
};

/**
 * Shared styles for compact-sized dropdown menus (Select, Autocomplete, etc.).
 */
export const compactDropdownStyles = {
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
 * Styles for multi-value inputs (MultiSelect, TagsInput, PillsInput).
 *
 * NOTE: The pill styles only set margin, NOT padding. Our Pill component extension
 * now applies --pill-height unconditionally, so pills handle their own sizing.
 * Adding paddingTop/paddingBottom here would conflict with the pill's internal
 * flexbox centering and cause text misalignment.
 */
export const compactMultiValueStyles = {
    input: {
        ...compactInputStyles.input,
        minHeight: 24,
        height: "auto",
        display: "flex",
        alignItems: "center",
        paddingTop: 4,
        paddingBottom: 4,
    },
    pillsList: {
        columnGap: 4,
        rowGap: 2,
    },
    pill: {
        // Only set margin, not padding. Pill component controls its own height/centering.
        margin: 0,
    },
};

/**
 * The compact input variables at one field height and one text size.
 *
 * Every size token shares the same chrome -- the field's ground, its transparent
 * resting border and INPUT_FOCUS_BORDER -- and differs only in those two
 * metrics, so each entry is compactInputVars with the two swapped. That keeps
 * the chrome, and the compact values every other entry is built from, in one
 * place.
 * @param height - the field height; Mantine reads it as --input-height, and some
 *   input components as --input-size, so both are set
 * @param fontSize - the size the field's own text is set in
 * @returns the wrapper variables for a fixed-height field at that size
 */
function compactInputVarsAt(height: string, fontSize: string): CompactVars {
    return {
        ...compactInputVars,
        "--input-height": height,
        "--input-size": height,
        "--input-fz": fontSize,
    };
}

/**
 * The compact input variables at one text size, for the fields that size
 * themselves to their content.
 *
 * No height variable at any size, for the reason compactInputVarsNoHeight gives
 * -- a fixed height would clip a second line -- and
 * tests/theme/css-baseline-regression.test.ts asserts the absence.
 * @param fontSize - the size the field's own text is set in
 * @returns the wrapper variables for a variable-height field at that size
 */
function compactInputVarsNoHeightAt(fontSize: string): CompactVars {
    return {
        ...compactInputVarsNoHeight,
        "--input-fz": fontSize,
    };
}

/**
 * Per-size wrapper variables for the fixed-height compact inputs: TextInput,
 * Select, PasswordInput, Autocomplete and FileInput.
 *
 * The heights follow compactButtonScale's ramp (20/24/30/36/44) so a field and a
 * button asked for the same size still line up beside each other in a row.
 */
export const compactInputScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: compactInputVarsAt("20px", "10px"),
        // The shipped compact object itself, not a copy of its numbers.
        sm: compactInputVars,
        md: compactInputVarsAt("30px", "13px"),
        lg: compactInputVarsAt("36px", "15px"),
        xl: compactInputVarsAt("44px", "17px"),
    },
};

/**
 * Per-size wrapper variables for the compact inputs that size themselves to
 * their content: Textarea, TagsInput, PillsInput and JsonInput.
 */
export const compactInputNoHeightScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: compactInputVarsNoHeightAt("10px"),
        sm: compactInputVarsNoHeight,
        md: compactInputVarsNoHeightAt("13px"),
        lg: compactInputVarsNoHeightAt("15px"),
        xl: compactInputVarsNoHeightAt("17px"),
    },
};

/**
 * Per-size wrapper variables for the compact NumberInput.
 *
 * compactInputScale's fields plus --input-right-section-width, the width
 * reserved for the increment/decrement stack. It equals the field height at
 * every size, which is what the shipped compact pair already was (24px in a 24px
 * field), so the stack stays square as the field grows.
 */
export const compactNumberInputScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { ...compactInputVarsAt("20px", "10px"), "--input-right-section-width": "20px" },
        sm: { ...compactInputVars, "--input-right-section-width": "24px" },
        md: { ...compactInputVarsAt("30px", "13px"), "--input-right-section-width": "30px" },
        lg: { ...compactInputVarsAt("36px", "15px"), "--input-right-section-width": "36px" },
        xl: { ...compactInputVarsAt("44px", "17px"), "--input-right-section-width": "44px" },
    },
};

/**
 * Per-size variables for the compact NumberInput's controls section: the size of
 * the chevron glyph inside the increment and decrement buttons.
 */
export const compactNumberInputControlsScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { "--ni-chevron-size": "8px" },
        sm: { "--ni-chevron-size": "10px" },
        md: { "--ni-chevron-size": "12px" },
        lg: { "--ni-chevron-size": "14px" },
        xl: { "--ni-chevron-size": "16px" },
    },
};

/**
 * Per-size wrapper variables for the compact MultiSelect: compactInputScale's
 * fields plus the combobox chevron, which Mantine sizes from its own variable
 * rather than from the field's font size.
 */
export const compactMultiSelectScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: { ...compactInputVarsAt("20px", "10px"), "--combobox-chevron-size": "10px" },
        sm: { ...compactInputVars, "--combobox-chevron-size": "12px" },
        md: { ...compactInputVarsAt("30px", "13px"), "--combobox-chevron-size": "14px" },
        lg: { ...compactInputVarsAt("36px", "15px"), "--combobox-chevron-size": "16px" },
        xl: { ...compactInputVarsAt("44px", "17px"), "--combobox-chevron-size": "18px" },
    },
};
