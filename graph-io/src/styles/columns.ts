/**
 * Collecting a reader's canonical values per property and element, shared by the format readers.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

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

/**
 * Marks not visible every edge with an end the program does not draw (a node whose `visible` is false), for the
 * programs that draw no edge of a node they hide: Cytoscape desktop, and Cytoscape.js for `display: none`.
 * @param snapshot - the graph
 * @param shown - the nodes' `visible` values
 * @param values - the edge values per property, changed in place
 */
export function hideEdgesAtHiddenEnds(
    snapshot: GraphSnapshot,
    shown: StyleColumn | undefined,
    values: Partial<Record<string, StyleColumn>>,
): void {
    if (shown?.includes(false) !== true) {
        return;
    }
    const { src, dst } = snapshot.edgeList();
    const visible =
        values.visible === undefined ? new Array<StyleValue | null>(src.length).fill(null) : [...values.visible];
    for (let e = 0; e < src.length; e++) {
        if (shown[src[e]] === false || shown[dst[e]] === false) {
            visible[e] = false;
        }
    }
    values.visible = visible;
}
