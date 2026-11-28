/**
 * What one of the sample files from other programs that the graphty app's start page offers (samples.json beside this
 * folder's corpus) says of every node and edge, read by graph-io, and the classes the drawing tests count them in:
 * graphty-element's test/fidelity/program-sample-checks.ts checks a drawing against it, and the graphty app's
 * ProgramSamples.real-element.test.tsx checks the app's drawing. program-samples.test.ts holds graph-io's reading
 * of these files to their own values.
 */
// graph-io's published entries, not its source: graphty-element and the graphty app import this file, and a relative
// import of src/ puts all of graph-io's source (and the sources' neo4j-driver and rxjs types) into their type-aware
// lint, which ran ESLint's workers out of heap (#10142).
import { createRegistry } from "@graphty/graph-io";
import { extractPositions } from "@graphty/graph-io/positions";
import { resolveStyles } from "@graphty/graph-io/styles";
import { assert } from "vitest";

import type SAMPLES from "../corpus/programs/samples.json";
import type { ArrowClass, LineStyle, ShapeClass } from "../fidelity/scene.js";

/** One sample of samples.json. */
export type Sample = (typeof SAMPLES)[number];

const registry = createRegistry();

/** graph-io's shape names as the drawing classes them; null for a polygon, drawn as the class its corners make. */
export const SHAPE_CLASS: Readonly<Record<string, ShapeClass | null>> = {
    rectangle: "rect",
    "round-rectangle": "roundrect",
    ellipse: "ellipse",
    octagon: "octagon",
    hexagon: "hexagon",
    diamond: "diamond",
    parallelogram: "parallelogram",
    triangle: "triangle",
    star: "star",
    none: "other",
    polygon: null,
};

/** graph-io's arrowheads as the drawing classes them. */
export const ARROW_CLASS: Readonly<Record<string, ArrowClass | "none">> = {
    none: "none",
    triangle: "filled-triangle",
    vee: "filled-triangle",
    "open-vee": "other",
    tee: "tee",
};

/** graph-io's line styles as the drawing classes them; a file that states none draws solid lines. */
export const LINE_CLASS: Readonly<Record<string, LineStyle>> = {
    null: "solid",
    solid: "solid",
    dashed: "dashed",
    "long-dash": "dashed",
    dotted: "dotted",
};

/** What the file says of every node and edge, read by graph-io. */
export interface FileFacts {
    readonly ids: readonly string[];
    readonly node: (property: string) => readonly unknown[];
    readonly edge: (property: string) => readonly unknown[];
    /** Node centers, y up, in the unit of the file's sizes, two per node; null for a file that stores none. */
    readonly positions: ArrayLike<number> | null;
}

/**
 * Reads a styled sample's file with graph-io, as the load test reads it.
 * @param sample - the sample
 * @param bytes - the file's bytes, gunzipped when it is stored compressed
 * @returns the file's values
 */
export async function fileFacts(sample: Sample, bytes: Uint8Array): Promise<FileFacts> {
    const result = await registry.importGraph(bytes, { filename: sample.file.replace(/\.gz$/, ""), styles: true });
    const { snapshot, styles } = result;
    assert.isOk(styles, `${sample.id} carries styles`);
    const placed = extractPositions(registry.importer(sample.format), snapshot, result.report);
    const coords = placed?.usable === true ? placed.coords : null;
    // in the unit the file's sizes are in: a Pajek file places its vertices in a unit square its window scales
    const unit = placed?.pxPerUnit ?? 1;
    const ids = Array.from({ length: snapshot.nodeCount }, (_, i) => String(snapshot.ids.idOf(i)));
    return {
        ids,
        node: (property) => resolveStyles(styles, "node", property as never, snapshot),
        edge: (property) => resolveStyles(styles, "edge", property as never, snapshot),
        positions: coords === null ? null : ids.flatMap((_, i) => [coords[i * 3] * unit, coords[i * 3 + 1] * unit]),
    };
}

/**
 * A file's value as text: a string as it is, anything else as JSON (null as "null").
 * @param value - the value
 * @returns the text
 */
export function textOf(value: unknown): string {
    return typeof value === "string" ? value : JSON.stringify(value ?? null);
}

/**
 * Counts values.
 * @param values - the values
 * @returns how many times each occurs
 */
export function counts(values: Iterable<unknown>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const value of values) {
        const key = String(value);
        out[key] = (out[key] ?? 0) + 1;
    }
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Every pair of boxes that overlap by more than `slack` across and down.
 * @param boxes - id, center and size of each box
 * @param slack - how far two may run into each other and not count
 * @returns the pairs, as "a b"
 */
export function overlaps(
    boxes: readonly { id: string; x: number; y: number; w: number; h: number }[],
    slack: number,
): Set<string> {
    const pairs = new Set<string>();
    for (const [i, a] of boxes.entries()) {
        for (const b of boxes.slice(i + 1)) {
            const across = (a.w + b.w) / 2 - Math.abs(a.x - b.x);
            const down = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
            if (across > slack && down > slack) {
                pairs.add([a.id, b.id].sort().join(" "));
            }
        }
    }
    return pairs;
}

/**
 * The median width of the shown boxes over the median distance from one to its nearest neighbor: how large the nodes
 * are drawn beside the gaps between them.
 * @param boxes - center and width of each box, with whether it is shown (a box that does not say is)
 * @returns the ratio
 */
export function widthToSpacing(boxes: readonly { x: number; y: number; w: number; visible?: boolean }[]): number {
    const shown = boxes.filter((box) => box.visible !== false);
    const middle = (values: number[]): number => values.sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
    const nearest = shown.map((a) =>
        Math.min(...shown.filter((b) => b !== a).map((b) => Math.hypot(a.x - b.x, a.y - b.y))),
    );
    return middle(shown.map((box) => box.w)) / middle(nearest);
}

/**
 * The pairs of nodes the file itself draws over each other: their boxes, at the file's positions and sizes, overlap.
 * @param file - the file's values
 * @returns the pairs, as "a b" in id order; none for a file that stores no positions
 */
export function fileOverlaps(file: FileFacts): Set<string> {
    const { positions } = file;
    if (positions === null) {
        return new Set();
    }
    const widths = file.node("width");
    const heights = file.node("height");
    return overlaps(
        file.ids.flatMap((id, i) => {
            const w = Number(widths[i]);
            const h = Number(heights[i]);
            return w > 0 && h > 0 ? [{ id, x: positions[2 * i], y: positions[2 * i + 1], w, h }] : [];
        }),
        0,
    );
}
