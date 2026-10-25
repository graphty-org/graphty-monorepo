/**
 * @file Graphviz's `-Tjson` answer read back into node coordinates.
 *
 * Graphviz writes points with y growing upward, which is the element's scene orientation too, so
 * only the units change: points become scene units, and the drawing is centered on the origin.
 * Edge routes are not read: the element draws its own edges between the placed nodes.
 */

import type { F32 } from "@graphty/graph-format";

import { POINTS_PER_UNIT } from "./toDot";

/** The part of a `-Tjson` object this reads. */
interface JsonObject {
    readonly name?: unknown;
    readonly pos?: unknown;
}

/**
 * Read node positions out of Graphviz's json output.
 * @param json - the `-Tjson` text
 * @param nodeCount - how many rows the answer has
 * @returns two numbers per row, in scene units, NaN for a row Graphviz did not place
 * @throws when the text is not Graphviz json
 */
export function fromJson(json: string, nodeCount: number): F32 {
    const parsed = JSON.parse(json) as { readonly bb?: unknown; readonly objects?: readonly JsonObject[] };
    const out = new Float32Array(2 * nodeCount).fill(Number.NaN);
    const bb = typeof parsed.bb === "string" ? parsed.bb.split(",").map(Number) : [0, 0, 0, 0];
    const cx = (bb[0] + bb[2]) / 2;
    const cy = (bb[1] + bb[3]) / 2;
    for (const object of parsed.objects ?? []) {
        const row = typeof object.name === "string" && /^n\d+$/.test(object.name) ? Number(object.name.slice(1)) : -1;
        if (row < 0 || row >= nodeCount || typeof object.pos !== "string") {
            continue;
        }

        const [x, y] = object.pos.split(",").map(Number);
        out[2 * row] = (x - cx) / POINTS_PER_UNIT;
        out[2 * row + 1] = (y - cy) / POINTS_PER_UNIT;
    }

    return out;
}
