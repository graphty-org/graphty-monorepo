/**
 * @file Graphviz's `-Tjson` answer read back into node coordinates.
 *
 * Graphviz writes points with y growing upward, which is the element's scene orientation too, so
 * only the units change: points become scene units, and the drawing is centered on the origin.
 * Edge routes are read by {@link edgeBends}: each edge's spline as bends between its two nodes' centers.
 */

import type { F32 } from "@graphty/graph-format";

import { POINTS_PER_UNIT } from "./toDot";

/** The part of a `-Tjson` object or edge this reads. */
interface JsonObject {
    readonly name?: unknown;
    readonly id?: unknown;
    readonly pos?: unknown;
}

/** The part of the `-Tjson` answer this reads. */
interface JsonGraph {
    readonly bb?: unknown;
    readonly objects?: readonly JsonObject[];
    readonly edges?: readonly JsonObject[];
}

/** A point in Graphviz's coordinates. */
type Point = readonly [x: number, y: number];

/**
 * Read node positions out of Graphviz's json output.
 * @param json - the `-Tjson` text
 * @param nodeCount - how many rows the answer has
 * @returns two numbers per row, in scene units, NaN for a row Graphviz did not place
 * @throws when the text is not Graphviz json
 */
export function fromJson(json: string, nodeCount: number): F32 {
    const parsed = JSON.parse(json) as JsonGraph;
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

/**
 * Where Graphviz put each node, by name, in its own points.
 * @param parsed - the `-Tjson` answer
 * @returns the centers
 */
function nodeCenters(parsed: JsonGraph): Map<string, Point> {
    const centers = new Map<string, Point>();
    for (const { name, pos } of parsed.objects ?? []) {
        if (typeof name === "string" && typeof pos === "string") {
            const [x, y] = pos.split(",").map(Number);
            centers.set(name, [x, y]);
        }
    }

    return centers;
}

/**
 * Read the route Graphviz laid each edge along out of its json output, as bends between the two
 * nodes' centers: the edges are named `e<k>` by their place in the list handed over (see `toDot`).
 * @param json - the `-Tjson` text
 * @param edges - the edges handed over, each with its end rows
 * @param bendsOf - an edge's bends from its `pos` text and its ends' centers (graph-io's reading)
 * @returns each edge's bends, by place in the list; absent for an edge drawn straight or not laid
 */
export function edgeBends(
    json: string,
    edges: readonly { readonly src: number; readonly dst: number }[],
    bendsOf: (source: Point, target: Point, pos: string) => string | null,
): Map<number, string> {
    const parsed = JSON.parse(json) as JsonGraph;
    const centers = nodeCenters(parsed);
    const out = new Map<number, string>();
    for (const { id, pos } of parsed.edges ?? []) {
        const k = typeof id === "string" && /^e\d+$/.test(id) ? Number(id.slice(1)) : -1;
        const edge = k >= 0 ? edges[k] : undefined;
        if (edge === undefined || typeof pos !== "string") {
            continue;
        }

        const source = centers.get(`n${edge.src}`);
        const target = centers.get(`n${edge.dst}`);
        const bends = source && target ? bendsOf(source, target, pos) : null;
        if (bends !== null) {
            out.set(k, bends);
        }
    }

    return out;
}
