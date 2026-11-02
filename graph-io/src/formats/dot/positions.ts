/**
 * How a DOT file's `pos` values are spelled, for `extractPositions()`: the node's center, y up.
 * Graphviz layout output (the root graph has `bb`) is in points; input `pos` for neato and fdp is
 * in inches. Each cluster's `bb` gives its container node a box.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { median } from "../../positions/convert.js";
import type { ImporterGroupBox, ImporterPositions } from "../../positions/types.js";

/** Points per inch: node `width` is in inches, laid-out coordinates in points. */
const POINTS_PER_INCH = 72;

/**
 * The spelling of a DOT file's positions.
 * @param snapshot - the graph the DOT importer read
 * @returns the spelling, or null when no node has a position
 */
export function dotPositions(snapshot: GraphSnapshot): ImporterPositions | null {
    if (snapshot.nodes.byRole("position") === null) {
        return null;
    }
    const bb = snapshot.graph.get("bb");
    const box = bb?.isSet(0) === true ? boxOf(bb.value(0)) : null;
    const laidOut = box !== null;
    const width = snapshot.nodes.get("width");
    const widths: number[] = [];
    for (let row = 0; width !== null && row < width.length; row++) {
        const w = width.isSet(row) ? Number(width.value(row)) : Number.NaN;
        if (Number.isFinite(w)) {
            widths.push(laidOut ? w * POINTS_PER_INCH : w);
        }
    }
    return {
        units: laidOut ? "px" : "file",
        // input inches are drawn beside the styles' point lengths at 72 points each
        ...(laidOut ? ratioStretch(snapshot, box) : { pxPerUnit: POINTS_PER_INCH }),
        yAxis: "up",
        groups: clusterBoxes(snapshot),
        medianNodeSize: median(widths),
        ...(laidOut ? { tool: "graphviz" } : {}),
    };
}

/**
 * How Graphviz stretches a laid-out drawing to a numeric `ratio` (height over width): the height is scaled up when
 * the drawing is wider than that, else the width; the nodes keep their sizes. ponytail: the positions are stretched,
 * a cluster's `bb` and an edge's spline `pos` are not; stretch them too when a file sets both.
 * @param snapshot - the graph
 * @param box - the drawing's `bb`
 * @returns each axis's points per unit, or nothing for a ratio that is not a number above 0
 */
function ratioStretch(
    snapshot: GraphSnapshot,
    box: ImporterGroupBox["box"],
): { pxPerUnit?: number; pxPerUnitY?: number } {
    const raw = snapshot.graph.get("ratio");
    const ratio = raw?.isSet(0) === true ? Number(raw.value(0)) : Number.NaN;
    if (!Number.isFinite(ratio) || ratio <= 0 || box.width <= 0 || box.height <= 0) {
        return {};
    }
    const actual = box.height / box.width;
    return actual < ratio ? { pxPerUnit: 1, pxPerUnitY: ratio / actual } : { pxPerUnit: actual / ratio, pxPerUnitY: 1 };
}

/**
 * The boxes of the cluster container nodes that carry a `bb`.
 * @param snapshot - the graph
 * @returns one box per container, centered, y up
 */
function clusterBoxes(snapshot: GraphSnapshot): ImporterGroupBox[] {
    const bb = snapshot.nodes.get("bb");
    const out: ImporterGroupBox[] = [];
    for (let node = 0; bb !== null && node < bb.length; node++) {
        const box = bb.isSet(node) ? boxOf(bb.value(node)) : null;
        if (box !== null) {
            out.push({ node, box });
        }
    }
    return out;
}

/**
 * A Graphviz `bb` ("llx,lly,urx,ury", y up) as a centered box.
 * @param value - the attribute value
 * @returns the box, or null when the value is not four finite numbers
 */
function boxOf(value: unknown): ImporterGroupBox["box"] | null {
    if (typeof value !== "string") {
        return null;
    }
    const parts = value.split(",").map(Number);
    if (parts.length !== 4 || !parts.every(Number.isFinite)) {
        return null;
    }
    const [llx, lly, urx, ury] = parts;
    return { x: (llx + urx) / 2, y: (lly + ury) / 2, width: urx - llx, height: ury - lly };
}
