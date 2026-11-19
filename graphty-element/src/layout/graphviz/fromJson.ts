/**
 * @file Graphviz's `-Tjson` answer read back into node coordinates.
 *
 * Graphviz writes points with y growing upward, which is the element's scene orientation too, so
 * only the units change: points become scene units, and the drawing is centered on the origin.
 * Edge routes are read by {@link edgeBends}: each edge's spline as bends between its two nodes' centers.
 */

import type { F32 } from "@graphty/graph-format";

import type { GroupMargins } from "../groupMargins";
import type { EdgePosition } from "../LayoutEngine";
import { POINTS_PER_UNIT } from "./toDot";

/** The part of a `-Tjson` object or edge this reads. */
interface JsonObject {
    readonly name?: unknown;
    readonly id?: unknown;
    readonly pos?: unknown;
    /** A node's width and height, in inches. */
    readonly width?: unknown;
    readonly height?: unknown;
    readonly lp?: unknown;
    readonly xlp?: unknown;
    readonly xlabel?: unknown;
    readonly head_lp?: unknown;
    readonly tail_lp?: unknown;
    readonly label?: unknown;
    readonly headlabel?: unknown;
    readonly taillabel?: unknown;
    /** The xdot drawing of the edge's label and external label, of its head label and of its tail label. */
    readonly _ldraw_?: unknown;
    readonly _hldraw_?: unknown;
    readonly _tldraw_?: unknown;
    readonly tailport?: unknown;
    readonly headport?: unknown;
}

/** An edge label the layout may leave out, as {@link EdgePosition.leftOut} names it. */
type EdgeLabelPart = NonNullable<EdgePosition["leftOut"]>[number];

/** The places `-Tjson` gives an edge's labels: its label, its external label, and its head and tail labels. */
type EdgeLabelKey = "lp" | "xlp" | "head_lp" | "tail_lp";

/** The part of the `-Tjson` answer this reads. */
interface JsonGraph {
    readonly bb?: unknown;
    readonly objects?: readonly JsonObject[];
    readonly edges?: readonly JsonObject[];
    readonly splines?: unknown;
    readonly nodesep?: unknown;
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
 * A node's width and height as Graphviz drew it, in its points (it gives them in inches, one scene unit each).
 * @param parsed - the `-Tjson` answer
 * @param name - the node's name
 * @returns the size, or undefined when the answer gives none
 */
function nodeSize(parsed: JsonGraph, name: string): Point | undefined {
    const object = parsed.objects?.find((o) => o.name === name);
    const [w, h] = [Number(object?.width) * POINTS_PER_UNIT, Number(object?.height) * POINTS_PER_UNIT];
    return w > 0 && h > 0 ? [w, h] : undefined;
}

/** Graphviz's default `nodesep`, in points: the step between the parallel edges neato lays side by side. */
const DEFAULT_NODESEP_POINTS = 18;

/** How far off the line between its nodes' centers, in points, a laid route may pass and still be on it. */
const STACKED_POINTS = 1;

/**
 * Each pair of nodes' edges, either way, and whether every one of them was laid on the line between the two centers
 * with no port.
 * @param parsed - the `-Tjson` answer
 * @param edges - the edges handed over, each with its end rows
 * @param centers - each node's center, by name
 * @returns the bundles, by pair
 */
function parallelBundles(
    parsed: JsonGraph,
    edges: readonly { readonly src: number; readonly dst: number }[],
    centers: ReadonlyMap<string, Point>,
): Map<string, { edges: number[]; stacked: boolean }> {
    const bundles = new Map<string, { edges: number[]; stacked: boolean }>();
    for (const { id, pos, tailport, headport } of parsed.edges ?? []) {
        const k = typeof id === "string" && /^e\d+$/.test(id) ? Number(id.slice(1)) : -1;
        const edge = k >= 0 ? edges[k] : undefined;
        const p = edge && centers.get(`n${String(edge.src)}`);
        const q = edge && centers.get(`n${String(edge.dst)}`);
        if (edge === undefined || p === undefined || q === undefined || edge.src === edge.dst) {
            continue;
        }
        const key = `${String(Math.min(edge.src, edge.dst))}|${String(Math.max(edge.src, edge.dst))}`;
        const bundle = bundles.get(key) ?? { edges: [], stacked: true };
        bundles.set(key, bundle);
        bundle.edges.push(k);
        const plain = typeof pos === "string" && tailport === undefined && headport === undefined;
        bundle.stacked &&=
            plain &&
            pos
                .trim()
                .split(/[\s;]+/)
                .every((t) => onLine(p, q, t));
    }

    return bundles;
}

/**
 * Whether a point of a `pos` text (an arrow tip's `e,` or `s,` included) lies on the line between two centers.
 * @param p - one center
 * @param q - the other
 * @param token - the point, as `pos` writes it
 * @returns true within {@link STACKED_POINTS}
 */
function onLine(p: Point, q: Point, token: string): boolean {
    const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const at = pointOf(token.replace(/^[es],/, ""));
    const off = at && Math.abs((at[0] - p[0]) * (q[1] - p[1]) - (at[1] - p[1]) * (q[0] - p[0])) / length;
    return length > 0 && off !== null && off <= STACKED_POINTS;
}

/**
 * The routes of parallel edges Graphviz laid on top of one another, spread apart as Graphviz lays them. Graphviz
 * 16.1.0 in WebAssembly (the build the element runs) routes every edge of a parallel bundle along the same line under
 * `neato -n2` with `splines=polyline` or `splines=true`, where the native Graphviz 14.1.2 and 2.43 builds lay them
 * side by side (neato's `makeStraightEdges`, lib/neatogen/neatosplines.c): through the two nodes' centers moved
 * across the line by `nodesep` steps, centered on it, the first edge to the left of the bundle's first direction,
 * as a polyline under `splines=polyline` and as one cubic Bezier curve otherwise. A pair of nodes is spread only when
 * every edge between them, either way, lies on the line between their centers and none has a port.
 * @param parsed - the `-Tjson` answer
 * @param edges - the edges handed over, each with its end rows
 * @param centers - each node's center, by name
 * @returns the spread route of each stacked edge, as `pos` text from center to center, by place in the list
 */
function spreadStacked(
    parsed: JsonGraph,
    edges: readonly { readonly src: number; readonly dst: number }[],
    centers: ReadonlyMap<string, Point>,
): Map<number, string> {
    const bundles = parallelBundles(parsed, edges, centers);
    const nodesep = Number(parsed.nodesep) * POINTS_PER_UNIT;
    const step = Number.isFinite(nodesep) && nodesep > 0 ? nodesep : DEFAULT_NODESEP_POINTS;
    const polyline = typeof parsed.splines === "string" && parsed.splines.toLowerCase() === "polyline";
    const out = new Map<number, string>();
    for (const { edges: bundle, stacked } of bundles.values()) {
        const first = edges[bundle[0]];
        const p = centers.get(`n${String(first.src)}`);
        const q = centers.get(`n${String(first.dst)}`);
        const length = p && q ? Math.hypot(q[0] - p[0], q[1] - p[1]) : 0;
        if (!stacked || bundle.length < 2 || p === undefined || q === undefined || length === 0) {
            continue;
        }
        // the unit normal to the left of p -> q
        const [nx, ny] = [(p[1] - q[1]) / length, (q[0] - p[0]) / length];
        bundle.forEach((k, i) => {
            const d = (step * (bundle.length - 1)) / 2 - step * i;
            const [a, b] = [`${p[0] + d * nx},${p[1] + d * ny}`, `${q[0] + d * nx},${q[1] + d * ny}`];
            const [from, to] = [`${p[0]},${p[1]}`, `${q[0]},${q[1]}`];
            const points = polyline ? [from, from, a, a, a, b, b, b, to, to] : [from, a, b, to];
            out.set(k, (edges[k].src === first.src ? points : [...points].reverse()).join(" "));
        });
    }

    return out;
}

/**
 * Read the route Graphviz laid each edge along out of its json output, as bends between the two
 * nodes' centers: the edges are named `e<k>` by their place in the list handed over (see `toDot`).
 * @param json - the `-Tjson` text
 * @param edges - the edges handed over, each with its end rows
 * @param bendsOf - an edge's bends from its `pos` text and its ends' centers (graph-io's reading); a self-loop's node
 *     size too, whose bends are then offsets round its node
 * @returns each edge's bends, by place in the list; absent for an edge drawn straight or not laid
 */
export function edgeBends(
    json: string,
    edges: readonly { readonly src: number; readonly dst: number }[],
    bendsOf: (source: Point, target: Point, pos: string, loopSize?: Point) => string | null,
): Map<number, string> {
    const parsed = JSON.parse(json) as JsonGraph;
    const centers = nodeCenters(parsed);
    const spread = spreadStacked(parsed, edges, centers);
    const out = new Map<number, string>();
    for (const { id, pos: laid } of parsed.edges ?? []) {
        const k = typeof id === "string" && /^e\d+$/.test(id) ? Number(id.slice(1)) : -1;
        const edge = k >= 0 ? edges[k] : undefined;
        const pos = spread.get(k) ?? laid;
        if (edge === undefined || typeof pos !== "string") {
            continue;
        }

        const source = centers.get(`n${edge.src}`);
        const target = centers.get(`n${edge.dst}`);
        const loopSize = edge.src === edge.dst ? nodeSize(parsed, `n${edge.src}`) : undefined;
        const bends = source && target ? bendsOf(source, target, pos, loopSize) : null;
        if (bends !== null) {
            out.set(k, bends);
        }
    }

    return out;
}

/**
 * Read where Graphviz put each edge's label (its `lp`, the label's center) out of its json output, as `along` of the
 * way from the source node's center to the target's and `across` that length to the left of the line, as an edge's
 * bends are given: the edges are named `e<k>` by their place in the list handed over (see `toDot`). The external,
 * head and tail labels' places (`xlp`, `head_lp`, `tail_lp`) are read the same way when `key` names them.
 * @param json - the `-Tjson` text
 * @param edges - the edges handed over, each with its end rows
 * @param key - which label's place to read
 * @returns each labeled edge's label place, by place in the list; absent for an edge with no such place or a self-loop
 */
export function edgeLabelPlaces(
    json: string,
    edges: readonly { readonly src: number; readonly dst: number }[],
    key: EdgeLabelKey = "lp",
): Map<number, readonly [along: number, across: number]> {
    const parsed = JSON.parse(json) as JsonGraph;
    const centers = nodeCenters(parsed);
    const out = new Map<number, readonly [number, number]>();
    for (const object of parsed.edges ?? []) {
        const { id } = object;
        const place = object[key];
        const k = typeof id === "string" && /^e\d+$/.test(id) ? Number(id.slice(1)) : -1;
        const edge = k >= 0 ? edges[k] : undefined;
        const source = edge && centers.get(`n${edge.src}`);
        const target = edge && centers.get(`n${edge.dst}`);
        const [x, y] = typeof place === "string" ? place.split(",").map(Number) : [];
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
 * A point as `along` of the way from `source` to `target` and `across` that length to the left of the line, as an
 * edge's bends and label places are given.
 * @param source - the source node's center
 * @param target - the target node's center
 * @param p - the point
 * @returns the pair, or null for ends at one place
 */
function alongAcross(source: Point, target: Point, p: Point): readonly [along: number, across: number] | null {
    const dx = target[0] - source[0];
    const dy = target[1] - source[1];
    const length2 = dx * dx + dy * dy;
    const vx = p[0] - source[0];
    const vy = p[1] - source[1];
    return length2 > 0 ? [(vx * dx + vy * dy) / length2, (vy * dx - vx * dy) / length2] : null;
}

/**
 * Read where Graphviz starts and ends each edge's line out of its json output: from its `pos`, the tail arrow's tip
 * (`s,x,y`) or else the first spline's first point, and the head arrow's tip (`e,x,y`) or else the last spline's last
 * point -- on the node's outline, on the outer ring of a node of several peripheries, at a record's field port, or on
 * the border of the cluster an `lhead` or `ltail` names. Given as `along` and `across` the two nodes' centers, as
 * {@link edgeLabelPlaces} gives a label's place.
 * @param json - the `-Tjson` text
 * @param edges - the edges handed over, each with its end rows
 * @returns each edge's two ends, by place in the list handed over; absent for a self-loop or an edge not laid
 */
export function edgeLineEnds(
    json: string,
    edges: readonly { readonly src: number; readonly dst: number }[],
): Map<number, NonNullable<EdgePosition["lineEnds"]>> {
    const parsed = JSON.parse(json) as JsonGraph;
    const centers = nodeCenters(parsed);
    // a stacked parallel edge's ends lie on the line it was stacked on: it is cut at its nodes' outlines instead
    const spread = spreadStacked(parsed, edges, centers);
    return new Map([...laidLineEnds(parsed, centers, edges)].filter(([k]) => !spread.has(k)));
}

/**
 * Where Graphviz starts and ends each edge's line, as {@link edgeLineEnds} reads it, stacked edges included.
 * @param parsed - the `-Tjson` answer
 * @param centers - each node's center, by name
 * @param edges - the edges handed over, each with its end rows
 * @returns each edge's line ends, by place in the list
 */
function laidLineEnds(
    parsed: JsonGraph,
    centers: ReadonlyMap<string, Point>,
    edges: readonly { readonly src: number; readonly dst: number }[],
): Map<number, NonNullable<EdgePosition["lineEnds"]>> {
    const out = new Map<number, NonNullable<EdgePosition["lineEnds"]>>();
    for (const { id, pos } of parsed.edges ?? []) {
        const k = typeof id === "string" && /^e\d+$/.test(id) ? Number(id.slice(1)) : -1;
        const edge = k >= 0 ? edges[k] : undefined;
        const source = edge && centers.get(`n${edge.src}`);
        const target = edge && centers.get(`n${edge.dst}`);
        if (source === undefined || target === undefined || typeof pos !== "string") {
            continue;
        }

        const splines = pos.split(";");
        // the arrow's tip at that end, or else the spline's own end point
        const endOf = (spline: string | undefined, flag: "s" | "e"): Point | null => {
            const tokens = (spline ?? "").trim().split(/\s+/);
            const tip = tokens.find((t) => t.startsWith(`${flag},`));
            const controls = tokens.filter((t) => !/^[es],/.test(t));
            return pointOf(tip?.slice(2) ?? (flag === "s" ? controls[0] : controls.at(-1)));
        };
        const start = endOf(splines[0], "s");
        const end = endOf(splines.at(-1), "e");
        const from = start && alongAcross(source, target, start);
        const to = end && alongAcross(source, target, end);
        if (from && to) {
            out.set(k, { source: from, target: to });
        }
    }

    return out;
}

/**
 * The text an xdot drawing writes, each at its baseline's anchor point.
 * @param ops - the drawing, `-Tjson`'s list of operations
 * @returns the points its text operations write at
 */
function textPoints(ops: unknown): Point[] {
    const out: Point[] = [];
    for (const op of Array.isArray(ops) ? (ops as unknown[]) : []) {
        const { op: kind, pt } = (op ?? {}) as { op?: unknown; pt?: unknown };
        if (kind === "T" && Array.isArray(pt) && pt.length >= 2) {
            out.push([Number(pt[0]), Number(pt[1])]);
        }
    }
    return out;
}

/**
 * A `-Tjson` place ("x,y") as a point.
 * @param place - the text
 * @returns the point, or null when it is not one
 */
function pointOf(place: unknown): Point | null {
    const [x, y] = typeof place === "string" ? place.split(",").map(Number) : [];
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
}

/**
 * Whether Graphviz drew an edge's label: some text of the drawing it shares with the external label (`_ldraw_`) sits
 * nearer the label's place (`lp`) than the external label's (`xlp`).
 * @param edge - the edge's `-Tjson` object
 * @returns true when the label is drawn
 */
function labelDrawn(edge: JsonObject): boolean {
    const lp = pointOf(edge.lp);
    const xlp = pointOf(edge.xlp);
    const far = (p: Point, q: Point | null): number => (q === null ? Infinity : Math.hypot(p[0] - q[0], p[1] - q[1]));
    return textPoints(edge._ldraw_).some((p) => xlp === null || far(p, lp) < far(p, xlp));
}

/**
 * Read which labels Graphviz left out of each edge: with the graph's `forcelabels=false` it drops an edge's external
 * label, a head or tail label it places as an external label, and, in every engine but dot, its label, where each
 * would cover a node or another label (lib/common/postproc.c `addXLabels`). It writes no `xlp` for a dropped external
 * label, but still writes an `lp`, `head_lp` or `tail_lp` for the others, at no place it drew; what it drew says so:
 * the label's text in `_ldraw_`, `_hldraw_` or `_tldraw_`. An edge with only an external label draws it as its label,
 * so its external label left out leaves out both.
 * @param json - the `-Tjson` text
 * @returns the labels left out, by the edge's place in the list handed over; absent for an edge with none left out
 */
export function edgeLabelsLeftOut(json: string): Map<number, EdgeLabelPart[]> {
    const parsed = JSON.parse(json) as JsonGraph;
    const out = new Map<number, EdgeLabelPart[]>();
    for (const edge of parsed.edges ?? []) {
        const k = typeof edge.id === "string" && /^e\d+$/.test(edge.id) ? Number(edge.id.slice(1)) : -1;
        const gone = leftOutOf(edge);
        if (k >= 0 && gone.length > 0) {
            out.set(k, gone);
        }
    }

    return out;
}

/**
 * The labels Graphviz left out of one edge, as {@link edgeLabelsLeftOut} reads them.
 * @param edge - the edge's `-Tjson` object
 * @returns the labels left out
 */
function leftOutOf(edge: JsonObject): EdgeLabelPart[] {
    const has = (text: unknown): boolean => typeof text === "string" && text !== "";
    const gone: EdgeLabelPart[] = [];
    if (has(edge.xlabel) && edge.xlp === undefined) {
        gone.push(...(has(edge.label) ? (["xlabel"] as const) : (["label", "xlabel"] as const)));
    }
    if (has(edge.label) && !labelDrawn(edge)) {
        gone.push("label");
    }
    if (has(edge.headlabel) && textPoints(edge._hldraw_).length === 0) {
        gone.push("headLabel");
    }
    if (has(edge.taillabel) && textPoints(edge._tldraw_).length === 0) {
        gone.push("tailLabel");
    }
    return gone;
}

/** The parts of {@link EdgePosition} an edge's labels are placed by. */
export type EdgeLabelsAt = Pick<EdgePosition, "labelAt" | "headLabelAt" | "tailLabelAt" | "xlabelAt" | "leftOut">;

/**
 * Read where Graphviz put each node's external label (its `xlp`, the label's center) out of its json output, as an
 * offset from the node's center in Graphviz's points, right and down; null for an external label Graphviz left out
 * (with the graph's `forcelabels=false` it drops one that would cover another node, and gives it no `xlp`).
 * @param json - the `-Tjson` text
 * @returns each external label's offset, or null when it was left out, by row
 */
export function nodeXlabelPlaces(json: string): Map<number, readonly [right: number, down: number] | null> {
    const parsed = JSON.parse(json) as JsonGraph;
    const out = new Map<number, readonly [number, number] | null>();
    for (const { name, pos, xlp, xlabel } of parsed.objects ?? []) {
        const row = typeof name === "string" && /^n\d+$/.test(name) ? Number(name.slice(1)) : -1;
        const [px, py] = typeof pos === "string" ? pos.split(",").map(Number) : [];
        const [lx, ly] = typeof xlp === "string" ? xlp.split(",").map(Number) : [];
        if (row >= 0 && [px, py, lx, ly].every(Number.isFinite)) {
            out.set(row, [lx - px, py - ly]);
        } else if (row >= 0 && xlp === undefined && typeof xlabel === "string" && xlabel !== "") {
            out.set(row, null);
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
