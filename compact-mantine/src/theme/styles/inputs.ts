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
    "--input-bd": "none",
} as const;

/**
 * CSS variables for compact input wrapper WITHOUT fixed height.
 * Used for multi-line inputs (Textarea, JsonInput) and variable-height inputs.
 */
export const compactInputVarsNoHeight = {
    "--input-fz": "11px",
    "--input-bg": "var(--mantine-color-default)",
    "--input-bd": "none",
} as const;

// NOTE: compactInputVarsFn and compactInputVarsNoHeightFn were removed as unused.
// The object constants (compactInputVars, compactInputVarsNoHeight) are used directly
// in theme component extensions rather than through wrapper functions.

/**
 * Label styles shared across all input components.
 */
export const compactLabelStyles = {
    fontSize: 11,
    color: "var(--mantine-color-dimmed)",
    marginBottom: 1,
    lineHeight: 1.2,
};

/**
 * Input element styles shared across all input components.
 */
export const compactInputElementStyles = {
    paddingLeft: 8,
    paddingRight: 8,
    border: "none",
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
