/**
 * @file Graphviz's `-Tjson` answer read back into node coordinates.
 *
 * Graphviz writes points with y growing upward, which is the element's scene orientation too, so
 * only the units change: points become scene units, and the drawing is centered on the origin.
 * Edge routes are read by {@link edgeBends}: each edge's spline as bends between its two nodes' centers.
 */

import type { F32 } from "@graphty/graph-format";

import type { GroupMargins } from "../groupMargins";
import { POINTS_PER_UNIT } from "./toDot";

/** The part of a `-Tjson` object or edge this reads. */
interface JsonObject {
    readonly name?: unknown;
    readonly id?: unknown;
    readonly pos?: unknown;
    readonly lp?: unknown;
    readonly xlp?: unknown;
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

/**
 * Read where Graphviz put each edge's label (its `lp`, the label's center) out of its json output, as `along` of the
 * way from the source node's center to the target's and `across` that length to the left of the line, as an edge's
 * bends are given: the edges are named `e<k>` by their place in the list handed over (see `toDot`).
 * @param json - the `-Tjson` text
 * @param edges - the edges handed over, each with its end rows
 * @returns each labelled edge's label place, by place in the list; absent for an edge with no `lp` or a self-loop
 */
export function edgeLabelPlaces(
    json: string,
    edges: readonly { readonly src: number; readonly dst: number }[],
): Map<number, readonly [along: number, across: number]> {
    const parsed = JSON.parse(json) as JsonGraph;
    const centers = nodeCenters(parsed);
    const out = new Map<number, readonly [number, number]>();
    for (const { id, lp } of parsed.edges ?? []) {
        const k = typeof id === "string" && /^e\d+$/.test(id) ? Number(id.slice(1)) : -1;
        const edge = k >= 0 ? edges[k] : undefined;
        const source = edge && centers.get(`n${edge.src}`);
        const target = edge && centers.get(`n${edge.dst}`);
        const [x, y] = typeof lp === "string" ? lp.split(",").map(Number) : [];
        if (source === undefined || target === undefined || !Number.isFinite(x) || !Number.isFinite(y)) {
            continue;
        }

        const dx = target[0] - source[0];
        const dy = target[1] - source[1];
        const length2 = dx * dx + dy * dy;
        if (length2 > 0) {
            const vx = x - source[0];
            const vy = y - source[1];
            out.set(k, [(vx * dx + vy * dy) / length2, (vy * dx - vx * dy) / length2]);
        }
    }

    return out;
}

/**
 * Read where Graphviz put each node's external label (its `xlp`, the label's center) out of its json output, as an
 * offset from the node's center in Graphviz's points, right and down.
 * @param json - the `-Tjson` text
 * @returns each placed external label's offset, by row
 */
export function nodeXlabelPlaces(json: string): Map<number, readonly [right: number, down: number]> {
    const parsed = JSON.parse(json) as JsonGraph;
    const out = new Map<number, readonly [number, number]>();
    for (const { name, pos, xlp } of parsed.objects ?? []) {
        const row = typeof name === "string" && /^n\d+$/.test(name) ? Number(name.slice(1)) : -1;
        const [px, py] = typeof pos === "string" ? pos.split(",").map(Number) : [];
        const [lx, ly] = typeof xlp === "string" ? xlp.split(",").map(Number) : [];
        if (row >= 0 && [px, py, lx, ly].every(Number.isFinite)) {
            out.set(row, [lx - px, py - ly]);
        }
    }

    return out;
}

/** A box in Graphviz's points: low x, low y, high x, high y. */
type Box = [x0: number, y0: number, x1: number, y1: number];

/**
 * A `bb` text as a box.
 * @param bb - the text, "llx,lly,urx,ury"
 * @returns the box, or null when it is not one
 */
function boxOf(bb: unknown): Box | null {
    const parts = typeof bb === "string" ? bb.split(",").map(Number) : [];
    return parts.length === 4 && parts.every(Number.isFinite) ? (parts as Box) : null;
}

/** The part of a `-Tjson` object a cluster's margins read. */
interface JsonPart {
    readonly name?: unknown;
    readonly bb?: unknown;
    readonly pos?: unknown;
    readonly width?: unknown;
    readonly height?: unknown;
    readonly nodes?: unknown;
    readonly subgraphs?: unknown;
}

/**
 * A laid-out node's box, from its center and its width and height in inches.
 * @param object - the node
 * @returns the box, or null when it has no place
 */
function nodeBox(object: JsonPart | undefined): Box | null {
    if (typeof object?.pos !== "string") {
        return null;
    }

    const [x, y] = object.pos.split(",").map(Number);
    const w = (Number(object.width) * POINTS_PER_UNIT) / 2;
    const h = (Number(object.height) * POINTS_PER_UNIT) / 2;
    return [x, y, w, h].every(Number.isFinite) ? [x - w, y - h, x + w, y + h] : null;
}

/**
 * Read how far Graphviz drew each cluster past its members (its nodes and inner clusters) on each
 * side, out of its json output: the room its margin, its label and the edges routed inside it take.
 * @param json - the `-Tjson` text
 * @returns each cluster's margins in points (not scene units), by the row of the group it stands for (`cluster_n<row>`)
 */
export function clusterMargins(json: string): Map<number, GroupMargins> {
    const objects = (JSON.parse(json) as { objects?: readonly JsonPart[] }).objects ?? [];
    const out = new Map<number, GroupMargins>();
    for (const cluster of objects) {
        const name = typeof cluster.name === "string" ? /^cluster_n(\d+)$/.exec(cluster.name) : null;
        const bb = boxOf(cluster.bb);
        if (name === null || bb === null) {
            continue;
        }

        const members = [
            ...(Array.isArray(cluster.nodes) ? cluster.nodes : []).map((i: number) => nodeBox(objects[i])),
            ...(Array.isArray(cluster.subgraphs) ? cluster.subgraphs : []).map((i: number) => boxOf(objects[i]?.bb)),
        ].filter((box) => box !== null);
        if (members.length > 0) {
            const inner = members.reduce(
                (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])],
                members[0],
            );
            out.set(Number(name[1]), {
                left: inner[0] - bb[0],
                bottom: inner[1] - bb[1],
                right: bb[2] - inner[2],
                top: bb[3] - inner[3],
            });
        }
    }

    return out;
}
