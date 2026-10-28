/**
 * @file Where the names given to values (`session.data.setValueLabel`) are kept: one key per path
 * and value in the project's `valueLabels` slice.
 */

import type { Path } from "../catalog/types";

/** A value a name can be given to: a category as the legend spells it. */
export type LabelledValue = string | number | boolean;

/**
 * The `valueLabels` slice key one value's name is kept under.
 * @param path - The value path.
 * @param value - The value, spelled as the legend spells it.
 * @returns The key.
 */
export function valueLabelKey(path: Path, value: LabelledValue): string {
    return JSON.stringify([path, String(value)]);
}

/**
 * The names given to one path's values.
 * @param labels - The `valueLabels` slice.
 * @param path - The value path.
 * @returns The names, by the value as the legend spells it.
 */
export function valueLabelsAt(labels: ReadonlyMap<string, string>, path: Path): ReadonlyMap<string, string> {
    const named = new Map<string, string>();
    for (const [key, label] of labels) {
        const at = valueLabelOf(key);
        if (at.path === path) {
            named.set(at.value, label);
        }
    }

    return named;
}

/**
 * The path and the value a `valueLabels` key names.
 * @param key - The key, as {@link valueLabelKey} wrote it.
 * @returns The path and the value as text.
 */
export function valueLabelOf(key: string): { readonly path: Path; readonly value: string } {
    const [path, value] = JSON.parse(key) as [Path, string];
    return { path, value };
}
