/**
 * Where Graphviz puts an edge's labels: a stored `lp` (the label's center), and the head and tail labels at
 * `head_lp` / `tail_lp` -- kept only with the edge's stored `pos` (`neato -n2` routes an edge without one again, and
 * places its labels again) -- or where Graphviz's `place_portlabel` (lib/common/splines.c) puts them, when the edge's
 * `labelangle` or `labeldistance` is not its default: `10 * labeldistance` points from the end of the line, turned
 * `labelangle` degrees (default -25) from the line. With both at their defaults Graphviz places end labels as external
 * labels, which graphty leaves to its own place beside the end. Read as offsets from where graphty puts each label:
 * the edge label from the middle of its route, an end label from where the line meets its node.
 */

import type { GraphSnapshot } from "@graphty/graph-format";

import { type BendPoint, flattenCubic } from "../../styles/canon/bends.js";
import { num6 } from "../../styles/canon/number.js";
import type { StyleValue } from "../../styles/types.js";
import { textWidth } from "./record.js";

/** Graphviz's `PORT_LABEL_DISTANCE`, in points. */
const PORT_LABEL_DISTANCE = 10;

/** Graphviz's `PORT_LABEL_ANGLE`, in degrees. */
const PORT_LABEL_ANGLE = -25;

/** Graphviz's default node size, in inches. */
const DEFAULT_SIZE = { w: 0.75, h: 0.5 } as const;

/** One attribute of an element as text, or null when it is unset. */
type Attr = (name: string) => string | null;

/** Receives one property's value. */
type Put = (property: string, value: StyleValue | null) => void;

/** What the label places of one graph's edges are read against. */
export interface LabelPlaceContext {
    /** A node's center from its position, in points, y up. */
    readonly center: (n: number) => BendPoint | null;
    /** A node's attribute. */
    readonly node: (n: number, name: string) => string | null;
    /**
     * Whether the layout engine places an edge label it was not given as an external label (every engine but `dot`,
     * which ranks a label as a node of its own): lib/common/postproc.c `addXLabels` takes each unplaced edge label as
     * an xlabel of the edge's middle, and lib/label/xlabels.c puts it, where nothing else is drawn, up and to the left
     * of that point, its box's lower right corner on it.
     */
    readonly external: boolean;
}

/**
 * Reads an edge's stored label places and its head and tail label places as offsets.
 * @param snapshot - the graph
 * @param cx - the graph's label place context
 * @param e - the edge
 * @param get - the edge's attributes
 * @param put - receives the values
 */
export function readLabelPlaces(snapshot: GraphSnapshot, cx: LabelPlaceContext, e: number, get: Attr, put: Put): void {
    const s = snapshot.edgeSource(e);
    const t = snapshot.edgeTarget(e);
    const [source, target] = [cx.center(s), cx.center(t)];
    const route = source === null || target === null ? null : edgeRoute(source, target, get("pos"));
    const lp = (route?.start ?? null) === null ? null : point(get("lp"));
    if (lp === null && cx.external && s !== t && (get("label") ?? get("xlabel")) !== null) {
        // ponytail: the first place xlabels.c tries; one that would cover another label or node moves elsewhere
        put("labelPosition", "center");
        put("labelShiftX", -0.5);
        put("labelShiftY", -0.5);
    }
    if (route === null || source === null || target === null || s === t) {
        return;
    }
    if (lp !== null && get("label") !== null) {
        const mid = routeMiddle(route.points);
        put("labelOffsetX", num6(lp[0] - mid[0]));
        put("labelOffsetY", num6(mid[1] - lp[1]));
    }
    readEndLabel(cx, route, { node: t, at: target, other: source }, "head", get, put);
    readEndLabel(cx, route, { node: s, at: source, other: target }, "tail", get, put);
}

/** One end of an edge: its node, that node's center and the other end's center. */
interface EdgeEnd {
    readonly node: number;
    readonly at: BendPoint;
    readonly other: BendPoint;
}

/**
 * Reads one end's label place as an offset from where its line meets its node.
 * @param cx - the graph's label place context
 * @param route - the edge's route
 * @param end - the end's node and the two centers
 * @param which - which end
 * @param get - the edge's attributes
 * @param put - receives the values
 */
function readEndLabel(
    cx: LabelPlaceContext,
    route: EdgeRoute,
    end: EdgeEnd,
    which: "head" | "tail",
    get: Attr,
    put: Put,
): void {
    if (get(`${which}label`) === null) {
        return;
    }
    const head = which === "head";
    const tip = (head ? route.end : route.start) ?? boundary(cx, end.node, end.at, end.other);
    // the nearest route point back from the end that is not the end itself (a spline with no arrow ends at it);
    // the route's last point is the node's center, past the end
    const back = head ? route.points.slice(0, -1).reverse() : route.points.slice(1);
    const toward = back.find((p) => Math.hypot(p[0] - tip[0], p[1] - tip[1]) > 1e-6) ?? end.other;
    const stored = route.start === null ? null : point(get(`${which}_lp`));
    const at = stored ?? portLabel(get, tip, toward);
    if (at !== null) {
        const prefix = head ? "target" : "source";
        put(`${prefix}LabelOffset`, 0);
        put(`${prefix}LabelOffsetX`, num6(at[0] - tip[0]));
        put(`${prefix}LabelOffsetY`, num6(tip[1] - at[1]));
    }
}

/**
 * Where Graphviz's `place_portlabel` puts an end label's center: only when the edge's `labelangle` or
 * `labeldistance` is not its default.
 * @param get - the edge's attributes
 * @param tip - the end of the line
 * @param toward - a point back along the line from the end
 * @returns the center, or null when Graphviz places the label as an external label
 */
function portLabel(get: Attr, tip: BendPoint, toward: BendPoint): BendPoint | null {
    const turn = finite(get("labelangle"), PORT_LABEL_ANGLE, -180);
    const distance = finite(get("labeldistance"), 1, 0);
    if (turn === PORT_LABEL_ANGLE && distance === 1) {
        return null;
    }
    const angle = Math.atan2(toward[1] - tip[1], toward[0] - tip[0]) + (turn * Math.PI) / 180;
    const dist = PORT_LABEL_DISTANCE * distance;
    return [tip[0] + dist * Math.cos(angle), tip[1] + dist * Math.sin(angle)];
}

/**
 * A number attribute as Graphviz's `late_double` reads it: the default when unset or not a number, at least `low`.
 * @param raw - the value
 * @param fallback - the default
 * @param low - the least value
 * @returns the number
 */
function finite(raw: string | null, fallback: number, low: number): number {
    const v = raw === null || raw.trim() === "" ? Number.NaN : Number(raw);
    return Number.isFinite(v) ? Math.max(low, v) : fallback;
}

/**
 * An "x,y" point (a trailing `!` allowed).
 * @param raw - the text
 * @returns the point, or null
 */
function point(raw: string | null): BendPoint | null {
    const parts = (raw ?? "").replace(/!$/, "").split(",").map(Number);
    return parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) ? [parts[0], parts[1]] : null;
}

/** An edge's route: its points from center to center, and the ends of its line when stored. */
interface EdgeRoute {
    readonly points: BendPoint[];
    readonly start: BendPoint | null;
    readonly end: BendPoint | null;
}

/**
 * The route an edge is drawn along: its stored spline's points (flattened) between the two centers, and the ends of
 * its line where `pos` gives arrow points (`s,` / `e,`) or its spline's own ends.
 * @param source - the source's center
 * @param target - the target's center
 * @param pos - the edge's `pos`
 * @returns the route
 */
function edgeRoute(source: BendPoint, target: BendPoint, pos: string | null): EdgeRoute {
    const tokens = (pos ?? "").split(";")[0].trim().split(/\s+/).filter(Boolean);
    const marked = (flag: string): BendPoint | null => {
        const token = tokens.find((x) => x.startsWith(`${flag},`));
        return token === undefined ? null : point(token.slice(2));
    };
    const controls = tokens.filter((x) => !/^[es],/.test(x)).map((x) => point(x));
    const flat = controls.every((p) => p !== null) && controls.length >= 4 ? flattenCubic(controls) : null;
    if (flat === null) {
        return { points: [source, target], start: null, end: null };
    }
    return {
        points: [source, ...flat, target],
        start: marked("s") ?? flat[0],
        end: marked("e") ?? flat.at(-1) ?? null,
    };
}

/**
 * The point halfway along a route.
 * @param points - the route
 * @returns the point
 */
function routeMiddle(points: readonly BendPoint[]): BendPoint {
    // ponytail: halfway by length; graphty puts a bent edge's label at its middle segment, close to it
    const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    let left = lengths.reduce((a, b) => a + b, 0) / 2;
    for (let i = 0; i < lengths.length; i++) {
        if (left <= lengths[i] && lengths[i] > 0) {
            const f = left / lengths[i];
            return [
                points[i][0] + f * (points[i + 1][0] - points[i][0]),
                points[i][1] + f * (points[i + 1][1] - points[i][1]),
            ];
        }
        left -= lengths[i];
    }
    return points[0];
}

/**
 * Where the straight line from a node's center toward a point leaves the node, the node taken as the ellipse of its
 * `width` and `height`.
 * @param cx - the label place context
 * @param n - the node
 * @param center - its center
 * @param toward - the point
 * @returns the point on its outline
 */
function boundary(cx: LabelPlaceContext, n: number, center: BendPoint, toward: BendPoint): BendPoint {
    // ponytail: every shape taken as its ellipse; exact for the circles and ellipses the end labels sit on
    const inch = (name: "width" | "height", fallback: number): number => {
        const v = Number(cx.node(n, name) ?? Number.NaN);
        return (Number.isFinite(v) && v >= 0 ? v : fallback) * 72;
    };
    const [rx, ry] = [inch("width", DEFAULT_SIZE.w) / 2, inch("height", DEFAULT_SIZE.h) / 2];
    const [dx, dy] = [toward[0] - center[0], toward[1] - center[1]];
    const len = Math.hypot(dx, dy);
    if (len === 0 || rx === 0 || ry === 0) {
        return center;
    }
    const r = 1 / Math.hypot(dx / len / rx, dy / len / ry);
    return [center[0] + (dx / len) * r, center[1] + (dy / len) * r];
}

/** Graphviz's default font size, in points. */
const DEFAULT_FONT_SIZE = 14;

/** Graphviz's line height as a multiple of the font size. */
const LINE_SPACING = 1.2;

/**
 * The nodes whose external label (`xlabel`) Graphviz leaves out: with the graph's `forcelabels=false` it drops an
 * xlabel that would cover another node (lib/label/xlabels.c), and leaves that node's `xlp` out of its output. A file
 * Graphviz laid out with its xlabels (some node stores an `xlp`) says so by that absence. A file that places every node
 * but stores no `xlp` (drawn as it is, by graphty) is measured as graphty draws it: the label's box against the node's
 * top left corner, outside it, must cover no other node's box. Elsewhere the layout decides (a Graphviz layout leaves
 * out an `xlp` the same way), so nothing is left out here.
 * @param forcelabels - the graph's `forcelabels`, null when unset (true)
 * @param count - how many nodes the graph has
 * @param cx - the graph's label place context
 * @param cluster - whether a node is a cluster's container (never a node that is drawn)
 * @returns the nodes whose xlabel is left out
 */
export function leftOutXlabels(
    forcelabels: string | null,
    count: number,
    cx: LabelPlaceContext,
    cluster: (n: number) => boolean,
): ReadonlySet<number> {
    const out = new Set<number>();
    if (!mayLeaveOut(forcelabels)) {
        return out;
    }
    const nodes = Array.from({ length: count }, (_, n) => n).filter((n) => !cluster(n));
    const unplaced = nodes.filter((n) => cx.node(n, "xlabel") !== null && cx.node(n, "xlp") === null);
    if (unplaced.length === 0) {
        return out;
    }
    if (nodes.some((n) => cx.node(n, "xlp") !== null)) {
        // Graphviz placed the xlabels it had room for
        return new Set(unplaced);
    }
    const boxes = nodes.map((n) => [n, nodeBox(cx, n)] as const);
    if (boxes.some(([, b]) => b === null)) {
        return out;
    }
    const at = new Map(boxes);
    // ponytail: every unplaced xlabel against every node, O(labels x nodes); a grid when a large file needs it
    for (const n of unplaced) {
        const [x0, , , y1] = at.get(n) ?? [0, 0, 0, 0];
        const size = Number(cx.node(n, "fontsize") ?? Number.NaN);
        const font = Number.isFinite(size) && size > 0 ? size : DEFAULT_FONT_SIZE;
        const lines = (cx.node(n, "xlabel") ?? "").split(/\\[nlr]|\n/);
        const w = Math.max(...lines.map((l) => textWidth(l, font)));
        const label: Box = [x0 - w, y1, x0, y1 + lines.length * LINE_SPACING * font];
        if (boxes.some(([m, b]) => m !== n && b !== null && overlaps(label, b))) {
            out.add(n);
        }
    }
    return out;
}

/**
 * Whether the graph's `forcelabels` lets Graphviz leave out a label it has no room for: `false` (unset is true).
 * @param forcelabels - the graph's `forcelabels`, null when unset
 * @returns true when labels may be left out
 */
function mayLeaveOut(forcelabels: string | null): boolean {
    return /^(false|no|0+)$/i.test((forcelabels ?? "").trim());
}

/** An edge label's attribute and the xdot attribute that draws it (`-Txdot` output). */
const EDGE_LABEL_DRAWS = [
    ["label", "_ldraw_"],
    ["headlabel", "_hldraw_"],
    ["taillabel", "_tldraw_"],
] as const;

/**
 * The labels Graphviz leaves out of each edge: with the graph's `forcelabels=false` it drops an edge's `xlabel`, a head
 * or tail label it places as an external label, and, in every engine but dot, its `label`, where each would cover a
 * node or another label (lib/common/postproc.c `addXLabels`). Its output says so for an `xlabel` by leaving out the
 * edge's `xlp`, read once the file shows Graphviz placed its external labels (`placed`). For the others it still
 * writes an `lp`, `head_lp` or `tail_lp`, at no place it drew, so only an xdot file (`-Txdot`, the edge has a
 * `_draw_`) says so: by leaving out the label's `_ldraw_`, `_hldraw_` or `_tldraw_`.
 * @param forcelabels - the graph's `forcelabels`, null when unset (true)
 * @param count - how many edges the graph has
 * @param edge - an edge's attribute
 * @param placed - whether some node or edge stores an `xlp`
 * @returns the attributes of the labels left out, by edge; absent for an edge with none left out
 */
export function leftOutEdgeLabels(
    forcelabels: string | null,
    count: number,
    edge: (e: number, name: string) => string | null,
    placed: boolean,
): ReadonlyMap<number, ReadonlySet<string>> {
    const out = new Map<number, ReadonlySet<string>>();
    if (!mayLeaveOut(forcelabels)) {
        return out;
    }
    for (let e = 0; e < count; e++) {
        const has = (name: string): boolean => (edge(e, name) ?? "") !== "";
        const xdot = edge(e, "_draw_") !== null;
        const gone = new Set<string>();
        if ((placed || xdot) && has("xlabel") && edge(e, "xlp") === null) {
            gone.add("xlabel");
        }
        // ponytail: an edge's label and xlabel share one `_ldraw_`, so a label left out beside a kept xlabel is kept
        for (const [name, draw] of xdot ? EDGE_LABEL_DRAWS : []) {
            if (has(name) && !has(draw)) {
                gone.add(name);
            }
        }
        if (gone.size > 0) {
            out.set(e, gone);
        }
    }
    return out;
}

/** A box in points, y up: low x, low y, high x, high y. */
type Box = readonly [number, number, number, number];

/**
 * A node's box from its stored center and its `width` and `height`.
 * @param cx - the label place context
 * @param n - the node
 * @returns the box, or null when the node has no stored position
 */
function nodeBox(cx: LabelPlaceContext, n: number): Box | null {
    // ponytail: a node Graphviz grows to fit its label is taken at its least size (`width`, `height`)
    const c = cx.center(n);
    if (c === null) {
        return null;
    }
    const inch = (name: "width" | "height", fallback: number): number => {
        const v = Number(cx.node(n, name) ?? Number.NaN);
        return (Number.isFinite(v) && v >= 0 ? v : fallback) * 72;
    };
    const [hw, hh] = [inch("width", DEFAULT_SIZE.w) / 2, inch("height", DEFAULT_SIZE.h) / 2];
    return [c[0] - hw, c[1] - hh, c[0] + hw, c[1] + hh];
}

/**
 * Whether two boxes share some area (touching edges do not).
 * @param a - one box
 * @param b - the other
 * @returns true when they overlap
 */
function overlaps(a: Box, b: Box): boolean {
    return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}
