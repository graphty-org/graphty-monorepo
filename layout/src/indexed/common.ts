import type { F64, GraphSnapshot } from "@graphty/graph-format";

import type { LayoutResult } from "../positions.js";

/** Options every index-based layout takes (graph-format design 14.3). */
export interface CommonLayoutOptions {
    /** Components per row, 2 or 3; default 2. */
    readonly dim?: 2 | 3 | undefined;
    /** Size of the layout around its centre; default 1. What it measures is documented per layout. */
    readonly scale?: number | undefined;
    /** The centre (for `random`, the lowest corner of its cell, as in the legacy layout); missing components are 0. Default the origin. */
    readonly center?: ArrayLike<number> | undefined;
    /** Seed of a layout that draws random numbers; a random seed when absent or null. */
    readonly seed?: number | null | undefined;
}

/**
 * The stable `code` a layout's refusal carries, beside `params` holding its facts, so a caller can tell the cases
 * apart without matching message text (which may change):
 *
 * - `E_BAD_OPTION`: an option is out of range or not one of its values; `params` `{ option, value }`, or for an
 *   array of the wrong length `{ option, length, expected }`.
 * - `E_BAD_NODE`: an option names a node index (or id) that is not a node of the graph; `params` `{ option, index }`.
 * - `E_UNKNOWN_COLUMN`: an option names a node column the snapshot does not hold; `params` `{ option, column }`.
 * - `E_BAD_WEIGHT`: an edge weight the layout cannot use (kamadaKawai's weights are distances, so >= 0); `params`
 *   `{ weight }`.
 * - `E_COLUMN_TYPE`: an option names a node column of a dtype the layout cannot read; `params`
 *   `{ option, column, dtype, expected }`.
 * - `E_NOT_PLANAR`, `E_NOT_CONNECTED`, `E_TOO_LARGE`: the graph lacks a property the layout needs, or is too large.
 *
 * The thrown object stays the `Error` it was before codes existed.
 */
export type LayoutErrorCode =
    | "E_BAD_OPTION"
    | "E_BAD_NODE"
    | "E_UNKNOWN_COLUMN"
    | "E_COLUMN_TYPE"
    | "E_BAD_WEIGHT"
    | "E_NOT_PLANAR"
    | "E_NOT_CONNECTED"
    | "E_TOO_LARGE";

/**
 * Attach a code and its facts to an error about to be thrown.
 * @param error - the error
 * @param code - its code
 * @param params - the facts behind it
 * @returns the same error, with `code` and `params` set
 */
export function refusal<E extends Error>(
    error: E,
    code: LayoutErrorCode,
    params: Readonly<Record<string, unknown>>,
): E & { readonly code: LayoutErrorCode; readonly params: Readonly<Record<string, unknown>> } {
    return Object.assign(error, { code, params });
}

/** The resolved common options: `center` has exactly `dim` components. */
interface Resolved {
    readonly n: number;
    readonly dim: 2 | 3;
    readonly scale: number;
    readonly center: number[];
}

/**
 * Validate and default the common options.
 * @param s - the snapshot the layout runs over
 * @param options - the caller's options
 * @returns the node count, dim, scale and a `dim`-component centre
 */
export function resolve(s: GraphSnapshot, options: CommonLayoutOptions): Resolved {
    const dim = options.dim ?? 2;
    if (dim !== 2 && dim !== 3) {
        throw refusal(new Error(`dim must be 2 or 3, got ${String(dim)}`), "E_BAD_OPTION", {
            option: "dim",
            value: dim,
        });
    }
    const center = Array.from({ length: dim }, (_, k) => options.center?.[k] ?? 0);
    return { n: s.nodeCount, dim, scale: options.scale ?? 1, center };
}

/**
 * The f32 layout result of f64 rows.
 * @param rows - `n * dim` values
 * @param dim - components per row
 * @param n - node count
 * @returns the result
 */
export function result(rows: F64, dim: 2 | 3, n: number): LayoutResult {
    return { positions: Float32Array.from(rows), dim, n };
}

/**
 * Widen 2D rows to `dim` rows whose third component is the centre's z (NaN for an unplaced, NaN row); 2D rows come
 * back unchanged.
 * @param rows - `2 * n` values
 * @param dim - the output components per row
 * @param center - the centre; its third component is the z of every row
 * @returns `dim * n` values
 */
export function planar(rows: F64, dim: 2 | 3, center: readonly number[]): F64 {
    if (dim === 2) {
        return rows;
    }
    const n = rows.length / 2;
    const out = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
        out[3 * i] = rows[2 * i];
        out[3 * i + 1] = rows[2 * i + 1];
        out[3 * i + 2] = Number.isNaN(rows[2 * i]) ? Number.NaN : center[2];
    }
    return out;
}
