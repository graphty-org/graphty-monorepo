/**
 * @file Where the names given to values (`session.data.setValueLabel`) are kept: one key per path
 * and value in the project's `valueLabels` slice. A value keeps its JSON type in its key, so the
 * number 5 and the text "5" of a mixed column are named apart.
 */

import type { Path } from "../catalog/types";

/** A value a name can be given to: a category as the legend spells it. */
export type LabelledValue = string | number | boolean;

/**
 * Whether a value can be given a name.
 * @param value - The value.
 * @returns True for text, a number or a boolean.
 */
export function isLabelledValue(value: unknown): value is LabelledValue {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * A value a version 1 file wrote as text, in its column's type: such files spelled every value as
 * the legend does, so a value of a number or boolean column is read back from that text.
 * @param value - The value as the file held it.
 * @param type - The type of the column at its path, when known.
 * @returns The value.
 */
export function valueFromText(value: LabelledValue, type: string | undefined): LabelledValue {
    if (typeof value !== "string") {
        return value;
    }

    if ((type === "number" || type === "integer") && value.trim() !== "" && String(Number(value)) === value) {
        return Number(value);
    }

    if (type === "boolean" && (value === "true" || value === "false")) {
        return value === "true";
    }

    return value;
}

/**
 * The `valueLabels` slice key one value's name is kept under.
 * @param path - The value path.
 * @param value - The value, in its own type.
 * @returns The key.
 */
export function valueLabelKey(path: Path, value: LabelledValue): string {
    return JSON.stringify([path, value]);
}

/**
 * The names given to one path's values, each value in its own type.
 * @param labels - The `valueLabels` slice.
 * @param path - The value path.
 * @returns The values and their names.
 */
export function typedValueLabelsAt(
    labels: ReadonlyMap<string, string>,
    path: Path,
): { readonly value: LabelledValue; readonly label: string }[] {
    return [...labels].flatMap(([key, label]) => {
        const at = valueLabelOf(key);
        return at.path === path ? [{ value: at.value, label }] : [];
    });
}

/**
 * The names given to one path's values, by the value as the legend spells it (its text: 5 and "5"
 * both read "5" here, the text's name over the number's).
 * @param labels - The `valueLabels` slice.
 * @param path - The value path.
 * @returns The names, by the value as the legend spells it.
 */
export function valueLabelsAt(labels: ReadonlyMap<string, string>, path: Path): ReadonlyMap<string, string> {
    const named = new Map<string, string>();
    for (const { value, label } of typedValueLabelsAt(labels, path)) {
        if (typeof value === "string" || !named.has(String(value))) {
            named.set(String(value), label);
        }
    }

    return named;
}

/**
 * The path and the value a `valueLabels` key names.
 * @param key - The key, as {@link valueLabelKey} wrote it.
 * @returns The path and the value in its own type.
 */
export function valueLabelOf(key: string): { readonly path: Path; readonly value: LabelledValue } {
    const [path, value] = JSON.parse(key) as [Path, LabelledValue];
    return { path, value };
}
