/**
 * @file Fade by age: what the renderer reads to fade older edges in the time window, and why the
 * setting does nothing where it cannot apply. Design: `design/data/timeline-attribute.md` 5.5.
 */

import type { KindIndex } from "./timeIndex";

/**
 * Why a fade by age set below 1 draws nothing: the field times no edges, its edges carry spells
 * or instant lists (no single start to age by), or elements outside the window are ghosted.
 */
export type AgeFadeInactiveReason = "no-edge-time" | "spells" | "ghost";

/** The age the renderer gives an edge with no start: the newest, drawn at full opacity. */
export const UNTIMED_AGE = 1;

/**
 * What the renderer reads to fade edges by age. Times are normalized over the data's extent, so a
 * 32-bit float holds them: at 1.7e12 ms a float steps by about two minutes.
 */
export interface EdgeAgeFade {
    /** Per edge row, its start normalized over the extent; {@link UNTIMED_AGE} for none. */
    readonly ages: Float32Array;
    /** Where the window starts, normalized the same way. */
    readonly from: number;
    /** Where it ends. */
    readonly to: number;
    /** The opacity the oldest instant in the window draws at; 1 with no window. */
    readonly fade: number;
}

/**
 * Why fade by age cannot apply to a designation and settings, if it cannot.
 * @param edges - The designated field's edges, or undefined when it times none.
 * @param edges.spells - Its spells or instant-list column, if any.
 * @param outside - The `outside` playback setting.
 * @returns The reason, or null when it applies.
 */
export function ageFadeInactive(
    edges: { readonly spells?: unknown } | undefined,
    outside: "hide" | "ghost",
): AgeFadeInactiveReason | null {
    if (edges === undefined) {
        return "no-edge-time";
    }

    if (edges.spells !== undefined) {
        return "spells";
    }

    return outside === "ghost" ? "ghost" : null;
}

/**
 * Every edge row's start, normalized over an extent: 0 at its start, 1 at its end. An open start
 * reads 0 and an edge with no start {@link UNTIMED_AGE}.
 * @param kind - The edges' index.
 * @param from - The extent's first instant.
 * @param to - Just past its last.
 * @returns One value per row.
 */
export function normalizedStarts(kind: KindIndex, from: number, to: number): Float32Array {
    const { rows, spans } = kind;
    const out = new Float32Array(rows.length);
    const scale = to > from ? 1 / (to - from) : 1;
    for (let row = 0; row < rows.length; row++) {
        const start = spans === null ? rows[row] : spanStart(spans.starts, spans.first, row);
        out[row] = Number.isNaN(start) ? UNTIMED_AGE : Math.max(0, (start - from) * scale);
    }

    return out;
}

/**
 * A row's first span's start.
 * @param starts - Every span's start.
 * @param first - Where each row's spans begin.
 * @param row - The row.
 * @returns The start; NaN for a row with no span.
 */
function spanStart(starts: Float64Array, first: Uint32Array, row: number): number {
    return first[row + 1] > first[row] ? starts[first[row]] : Number.NaN;
}
