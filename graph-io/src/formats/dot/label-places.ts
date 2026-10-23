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
    if (source === null || target === null || s === t) {
        return;
    }
    const route = edgeRoute(source, target, get("pos"));
    const lp = route.start === null ? null : point(get("lp"));
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
