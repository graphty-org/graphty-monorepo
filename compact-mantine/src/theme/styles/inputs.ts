import { PANEL_INK } from "../../constants/panel";

/**
 * Static visual styles for compact-sized inputs.
 *
 * These styles are applied via the `styles` prop on component extensions,
 * providing borderless inputs with semantic background colors and compact typography.
 *
 * IMPORTANT: CSS custom properties are set via `vars` functions to override
 * Mantine's default size-based variables. Static styles cannot override vars.
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
