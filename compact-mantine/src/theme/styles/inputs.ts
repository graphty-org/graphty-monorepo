import type { CompactSizeScale, CompactVars } from "./size-scale";

/**
 * Per-size CSS variables for the input family (design/figma-spec.md 6).
 *
 * The look of a field -- its fill, its outline slot, hover and focus, the outlined variant, the
 * listbox -- lives in ../css/inputs.css.ts keyed on the `cm-*` classes the extensions in
 * ../components/inputs.ts hand out. What stays here is what Mantine sizes from variables: the
 * field height, its text size and line height, and a multi-line field's vertical inset. Each
 * resolver looks the
 * rendered size up in one of these scales (see ./size-scale.ts for why a scale and not one
 * frozen object).
 *
 * The compact entry (sm) is Figma's field: 24 tall, 11/16 text. The other entries
 * keep an explicitly sized field distinct from its neighbors: xs 20, md 32 with 13/24 text (the
 * quick-actions search), lg 36, xl 44.
 *
 * Section widths are NOT set here: a theme variable wins over the component's own, so setting
 * `--input-right-section-width` here would silently override every caller's
 * `rightSectionWidth` prop. The CSS gives sections the field height as their default instead.
 * The text inset (`--input-padding`: 8 filled, 7 outlined, 8 in a select trigger) is not set
 * here either: an inline variable would beat the stylesheet's per-look values.
 */

/**
 * One field size: height, text size, line height.
 * @param height - the field height
 * @param fontSize - the text size
 * @param lineHeight - the text line height
 * @returns the wrapper variables
 */
function fieldVars(height: string, fontSize: string, lineHeight: string): CompactVars {
    return {
        "--input-height": height,
        "--input-size": height,
        "--input-fz": fontSize,
        "--input-line-height": lineHeight,
    };
}

/**
 * One multi-line or self-sizing field size: no fixed height, a minimum and a vertical inset.
 * @param minHeight - the smallest height
 * @param paddingY - the text's top and bottom inset
 * @param fontSize - the text size
 * @param lineHeight - the text line height
 * @returns the wrapper variables
 */
function growingVars(minHeight: string, paddingY: string, fontSize: string, lineHeight: string): CompactVars {
    return {
        "--input-height": minHeight,
        "--input-fz": fontSize,
        "--input-line-height": lineHeight,
        "--input-padding-y": paddingY,
    };
}

/**
 * Fixed-height fields: TextInput, NumberInput, Select, NativeSelect, PasswordInput,
 * Autocomplete, FileInput, ColorInput.
 */
export const compactInputScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: fieldVars("20px", "11px", "16px"),
        sm: fieldVars("24px", "11px", "16px"),
        md: fieldVars("32px", "13px", "24px"),
        lg: fieldVars("36px", "15px", "25px"),
        xl: fieldVars("44px", "24px", "32px"),
    },
};

/** Textarea and JsonInput: at least 56 tall, text inset 4 8 (spec 6, Textarea). */
export const compactTextareaScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: growingVars("48px", "4px", "11px", "16px"),
        sm: growingVars("56px", "4px", "11px", "16px"),
        md: growingVars("64px", "4px", "13px", "22px"),
        lg: growingVars("72px", "6px", "15px", "25px"),
        xl: growingVars("88px", "8px", "24px", "32px"),
    },
};

/**
 * Pill fields: MultiSelect, TagsInput, PillsInput. One row of 20px pills sits in a 24px field
 * (2px above and below); more rows grow the field.
 */
export const compactPillsInputScale: CompactSizeScale = {
    compactSize: "sm",
    sizes: {
        xs: growingVars("20px", "0px", "11px", "16px"),
        sm: growingVars("24px", "2px", "11px", "16px"),
        md: growingVars("32px", "6px", "13px", "24px"),
        lg: growingVars("36px", "8px", "15px", "25px"),
        xl: growingVars("44px", "12px", "24px", "32px"),
    },
};

/**
 * The clear (x) button of a field (`InputClearButton`, a CloseButton): a 16px button with a 10px
 * cross, in the field's 24px trailing slot (spec 6.2). Own scale rather than the CloseButton's,
 * so the field's clear button does not move when the buttons family resizes its close button.
 */
export const compactInputClearButtonScale: CompactSizeScale = {
    compactSize: "xs",
    sizes: {
        xs: { "--cb-size": "16px", "--cb-icon-size": "10px", "--cb-radius": "5px" },
        sm: { "--cb-size": "20px", "--cb-icon-size": "12px", "--cb-radius": "5px" },
        md: { "--cb-size": "24px", "--cb-icon-size": "14px", "--cb-radius": "5px" },
        lg: { "--cb-size": "28px", "--cb-icon-size": "16px", "--cb-radius": "5px" },
        xl: { "--cb-size": "32px", "--cb-icon-size": "20px", "--cb-radius": "5px" },
    },
};
