/**
 * Collecting a reader's canonical values per property and element, shared by the format readers.
 */

import type { StyleColumn, StyleProperty, StyleValue } from "./types.js";

/** Canonical values per property, by element index. */
export type ValueColumns = Partial<Record<string, (StyleValue | null)[]>>;

/**
 * A collector of canonical values for one target.
 * @param n - the element count
 * @returns the values and a setter for element i
 */
export function valueColumns(n: number): {
    readonly values: ValueColumns;
    put(i: number, property: string, value: StyleValue | null): void;
} {
    const values: ValueColumns = Object.create(null) as ValueColumns;
    return {
        values,
        put(i, property, value) {
            if (value !== null) {
                values[property] ??= new Array<StyleValue | null>(n).fill(null);
                values[property][i] = value;
            }
        },
    };
}

/**
 * The properties with at least one value.
 * @param values - per property, each element's value
 * @returns the same without all-null properties
 */
export function nonEmpty(values: Partial<Record<string, StyleColumn>>): Partial<Record<StyleProperty, StyleColumn>> {
    const out: Partial<Record<string, StyleColumn>> = {};
    for (const [p, col] of Object.entries(values)) {
        if (col?.some((v) => v !== null) === true) {
            out[p] = col;
        }
    }
    return out;
}
