/**
 * The routes Cytoscape.js 3.34 draws for edges that do not run straight between their nodes, as neutral `bends`:
 * `segments` and `taxi` edges through their corner points, and `unbundled-bezier` edges and loops as the quadratic
 * splines Cytoscape.js draws through their control points, sampled into points (cytoscape.js 3.34.3
 * dist/cytoscape.cjs.js: `findSegmentsPoints` 23774, `findTaxiPoints` 23919, `findBezierPoints` 23878,
 * `findLoopPoints` 23806, the pair geometry 24400-24470).
 */

import { type BendPoint, canonBends, canonNodeOffsets, flattenQuadSpline } from "../canon/bends.js";

/** One node as Cytoscape.js measures it for routing. */
export interface CyjsRouteNode {
    /** Its center, y down. */
    readonly center: BendPoint;
    /** Its outer width and height (the border included), which routes are measured against. */
    readonly size: BendPoint;
    /** Its width and height as drawn, which a loop's points are written relative to. */
    readonly box: BendPoint;
    /** Whether its shape is an ellipse (any other shape is measured as its box). */
    readonly ellipse: boolean;
}

/** One edge's routing settings, as Cytoscape.js spells them (null where unset: Cytoscape.js's default). */
export interface CyjsRouteEdge {
    readonly curveStyle: string;
    readonly segmentDistances: string | null;
    readonly segmentWeights: string | null;
    readonly controlPointDistances: string | null;
    readonly controlPointWeights: string | null;
    readonly controlPointStepSize: number | null;
    readonly taxiDirection: string | null;
    readonly taxiTurn: string | null;
    readonly taxiTurnMinDistance: number | null;
    readonly edgeDistances: string | null;
    readonly loopDirection: string | null;
    readonly loopSweep: string | null;
    /** A `round-segments` edge's corner radii (`segment-radii`). */
    readonly segmentRadii?: string | null;
    /** A `round-taxi` edge's corner radius (`taxi-radius`). */
    readonly taxiRadius?: string | null;
    /** Whether a radius is the arc's (`arc-radius`, the default) or how far back the arc starts (`influence-radius`). */
    readonly radiusType?: string | null;
}

/** An edge's route: its neutral `bends`, or null when Cytoscape.js draws it some other way. */
type CyjsRoute = string | null;

/**
 * A list of lengths (`20px -20px`, numbers in pixels).
 * @param text - the value
 * @returns the numbers, none when one is not a number
 */
function lengths(text: string): number[] {
    const out = text
        .trim()
        .split(/\s+/)
        .map((t) => Number.parseFloat(t));
    return out.every((n) => Number.isFinite(n)) ? out : [];
}

/**
 * A Cytoscape.js angle in radians (`-45deg`, `0.5rad`, or radians with no unit).
 * @param text - the value
 * @returns the radians, or NaN
 */
function radians(text: string): number {
    const t = text.trim();
    const x = Number.parseFloat(t);
    return t.endsWith("deg") ? (x * Math.PI) / 180 : x;
}

/**
 * Where the ray from a node's center toward a point leaves the node: its ellipse, or its box.
 * @param node - the node
 * @param toward - the point
 * @returns the point on the node's outline
 */
function outlinePoint(node: CyjsRouteNode, toward: BendPoint): BendPoint {
    const [cx, cy] = node.center;
    const dx = toward[0] - cx;
    const dy = toward[1] - cy;
    const [hw, hh] = [node.size[0] / 2, node.size[1] / 2];
    if ((dx === 0 && dy === 0) || hw <= 0 || hh <= 0) {
        return node.center;
    }
    // ponytail: every shape but the ellipse is measured as its box; the polygons' own outlines if a route needs them
    const t = node.ellipse ? 1 / Math.hypot(dx / hw, dy / hh) : Math.min(axisReach(dx, hw), axisReach(dy, hh));
    return [cx + dx * t, cy + dy * t];
}

/**
 * How many steps of a direction reach a box's side along one axis.
 * @param d - the step along the axis
 * @param half - the box's half size along it
 * @returns the steps, Infinity for a step of 0
 */
function axisReach(d: number, half: number): number {
    return d === 0 ? Infinity : half / Math.abs(d);
}

/**
 * The line distances along a route are measured on: the two outline points (`edge-distances: intersection`, the
 * default) or the two centers (`node-position`).
 * @param edge - the edge's settings
 * @param src - its source
 * @param tgt - its target
 * @returns the two points and the unit normal Cytoscape.js offsets by (to the right of the line, y down)
 */
function measureLine(
    edge: CyjsRouteEdge,
    src: CyjsRouteNode,
    tgt: CyjsRouteNode,
): { a: BendPoint; b: BendPoint; normal: BendPoint } {
    const a0 = outlinePoint(src, tgt.center);
    const b0 = outlinePoint(tgt, src.center);
    const dx = b0[0] - a0[0];
    const dy = b0[1] - a0[1];
    const l = Math.hypot(dx, dy) || 1;
    const normal: BendPoint = [-dy / l, dx / l];
    return edge.edgeDistances === "node-position" ? { a: src.center, b: tgt.center, normal } : { a: a0, b: b0, normal };
}

/**
 * Points at weights along a line, each offset across it by a distance.
 * @param line - the line and its normal
 * @param line.a - its start
 * @param line.b - its end
 * @param line.normal - the unit normal
 * @param weights - the weights, 0 at the start
 * @param distances - the distances
 * @returns the points (as many as the shorter list)
 */
function offsetPoints(
    line: { a: BendPoint; b: BendPoint; normal: BendPoint },
    weights: readonly number[],
    distances: readonly number[],
): BendPoint[] {
    const n = Math.min(weights.length, distances.length);
    return Array.from({ length: n }, (_, s): BendPoint => {
        const w = weights[s];
        const d = distances[s];
        return [
            line.a[0] * (1 - w) + line.b[0] * w + line.normal[0] * d,
            line.a[1] * (1 - w) + line.b[1] * w + line.normal[1] * d,
        ];
    });
}

/**
 * A taxi edge's corner points (`findTaxiPoints`).
 * @param edge - the edge's settings
 * @param src - its source
 * @param tgt - its target
 * @returns the corners
 */
function taxiPoints(edge: CyjsRouteEdge, src: CyjsRouteNode, tgt: CyjsRouteNode): BendPoint[] {
    const body = edge.edgeDistances !== "node-position";
    const [x1, y1] = src.center;
    const [x2, y2] = tgt.center;
    const [srcW, srcH] = src.size;
    const [tgtW, tgtH] = tgt.size;
    const pdx = x2 - x1;
    const pdy = y2 - y1;
    const dx = towardZero(pdx, body ? (srcW + tgtW) / 2 : 0);
    const dy = towardZero(pdy, body ? (srcH + tgtH) / 2 : 0);
    const raw = edge.taxiDirection ?? "auto";
    const vertical =
        raw === "auto" ? Math.abs(dx) <= Math.abs(dy) : raw === "vertical" || raw === "upward" || raw === "downward";
    const [along, pl] = vertical ? [dy, pdy] : [dx, pdx];
    const { d, l, sgn, forced } = taxiTurn(edge, raw, along, pl);
    const minD = edge.taxiTurnMinDistance ?? 10;
    const tooClose = (v: number): boolean => Math.abs(v) < minD || Math.abs(v) >= Math.abs(l);
    if ((tooClose(d) || tooClose(Math.abs(l) - Math.abs(d))) && !forced) {
        return taxiFallback(vertical, { x1, y1, x2, y2, pl, pdx, pdy }, src.size, tgt.size);
    }
    const srcAlong = vertical ? srcH : srcW;
    const out = body ? (srcAlong / 2) * sgn : 0;
    if (vertical) {
        const y = y1 + d + out;
        return [
            [x1, y],
            [x2, y],
        ];
    }
    const x = x1 + d + out;
    return [
        [x, y1],
        [x, y2],
    ];
}

/**
 * A difference less a gap, toward 0 and no further.
 * @param v - the difference
 * @param gap - the gap
 * @returns what is left
 */
function towardZero(v: number, gap: number): number {
    return v > 0 ? Math.max(v - gap, 0) : Math.min(v + gap, 0);
}

/**
 * Where a taxi edge turns (`findTaxiPoints`): `taxi-turn` along its direction, a percentage of the gap between the
 * nodes or a distance from the source, a negative one from the target. A direction the nodes run against turns it
 * round (forced) unless an explicit direction is given with a percentage or a negative turn.
 * @param edge - the edge's settings
 * @param raw - its `taxi-direction`
 * @param along - the gap between the nodes along its direction
 * @param pl - the difference between the centers along its direction
 * @returns the turn's distance from the source, the gap and its sign as turned, and whether it was turned round
 */
function taxiTurn(
    edge: CyjsRouteEdge,
    raw: string,
    along: number,
    pl: number,
): { d: number; l: number; sgn: number; forced: boolean } {
    const explicit = raw !== "auto" && raw !== "vertical" && raw !== "horizontal";
    const turnText = (edge.taxiTurn ?? "50%").trim();
    const percent = turnText.endsWith("%");
    const turn = percent ? Number.parseFloat(turnText) / 100 : Number.parseFloat(turnText);
    const forced = !(explicit && (percent || turn < 0)) && runsAgainst(raw, pl);
    const sgn = forced ? -Math.sign(pl) : Math.sign(pl);
    const l = forced ? sgn * Math.abs(along) : along;
    if (percent) {
        return { d: (turn < 0 ? 1 + turn : turn) * l, l, sgn, forced };
    }
    return { d: (turn < 0 ? l : 0) + turn * sgn, l, sgn, forced };
}

/**
 * Whether the nodes run against a taxi edge's explicit direction.
 * @param raw - its `taxi-direction`
 * @param pl - the difference between the centers along it
 * @returns whether they do
 */
function runsAgainst(raw: string, pl: number): boolean {
    return (
        (raw === "downward" && pl < 0) ||
        (raw === "upward" && pl > 0) ||
        (raw === "leftward" && pl > 0) ||
        (raw === "rightward" && pl < 0)
    );
}

/**
 * A taxi edge's corners when its turn would fall too close to a node: a Z or an L shape (`findTaxiPoints`).
 * @param vertical - whether the taxi runs vertically
 * @param p - the centers and their differences
 * @param p.x1 - the source's x
 * @param p.y1 - the source's y
 * @param p.x2 - the target's x
 * @param p.y2 - the target's y
 * @param p.pl - the difference along the taxi's direction
 * @param p.pdx - the difference in x
 * @param p.pdy - the difference in y
 * @param srcSize - the source's outer size
 * @param tgtSize - the target's outer size
 * @returns the corners
 */
function taxiFallback(
    vertical: boolean,
    p: { x1: number; y1: number; x2: number; y2: number; pl: number; pdx: number; pdy: number },
    srcSize: BendPoint,
    tgtSize: BendPoint,
): BendPoint[] {
    const { x1, y1, x2, y2, pl, pdx, pdy } = p;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    if (vertical) {
        if (Math.abs(pl) <= srcSize[1] / 2) {
            return [
                [midX, y1],
                [midX, y2],
            ];
        }
        if (Math.abs(pdx) <= tgtSize[0] / 2) {
            return [
                [x1, midY],
                [x2, midY],
            ];
        }
        return [[x1, y2]];
    }
    if (Math.abs(pl) <= srcSize[0] / 2) {
        return [
            [x1, midY],
            [x2, midY],
        ];
    }
    if (Math.abs(pdy) <= tgtSize[1] / 2) {
        return [
            [midX, y1],
            [midX, y2],
        ];
    }
    return [[x2, y1]];
}

/**
 * The points between an edge's two ends of the quadratic spline Cytoscape.js draws through control points: from the
 * node's outline toward the first control point to the other node's outline toward the last.
 * @param src - the source
 * @param tgt - the target
 * @param controls - the control points
 * @returns the sampled points, the ends left out
 */
function splinePoints(src: CyjsRouteNode, tgt: CyjsRouteNode, controls: readonly BendPoint[]): BendPoint[] {
    const start = outlinePoint(src, controls[0]);
    const end = outlinePoint(tgt, controls.at(-1) ?? tgt.center);
    return flattenQuadSpline([start, ...controls, end], 0).slice(1, -1);
}

/**
 * The route of one edge, as neutral `bends`.
 * @param edge - the edge's settings
 * @param src - its source
 * @param tgt - its target
 * @param loopIndex - for a loop, how many loops of the same direction and sweep on its node come before it
 * @returns the bends, or null when Cytoscape.js draws the edge straight or as a bundle's bezier
 */
export function cyjsRoute(edge: CyjsRouteEdge, src: CyjsRouteNode, tgt: CyjsRouteNode, loopIndex: number): CyjsRoute {
    const style = edge.curveStyle;
    if (style === "haystack") {
        return null;
    }
    if (src === tgt) {
        return loopRoute(edge, src, loopIndex);
    }
    let points: BendPoint[] = [];
    if (style.endsWith("segments")) {
        const distances = lengths(edge.segmentDistances ?? "20");
        const weights = lengths(edge.segmentWeights ?? "0.5");
        points = offsetPoints(measureLine(edge, src, tgt), weights, distances);
    } else if (style.endsWith("taxi")) {
        points = taxiPoints(edge, src, tgt);
    } else if (style === "unbundled-bezier") {
        // with no control-point-distances, its one control point is the step size out (cytoscape.js 3.34.3
        // `findBezierPoints`: "fall back on step size")
        const distances = lengths(edge.controlPointDistances ?? String(edge.controlPointStepSize ?? 40));
        const weights = lengths(edge.controlPointWeights ?? "0.5");
        const controls = offsetPoints(measureLine(edge, src, tgt), weights, distances);
        points = controls.length === 0 ? [] : splinePoints(src, tgt, controls);
    }
    if (points.length > 0 && style.startsWith("round-")) {
        const radii = lengths((style === "round-taxi" ? edge.taxiRadius : edge.segmentRadii) ?? "15");
        const types = (edge.radiusType ?? "arc-radius").trim().split(/\s+/);
        const start = outlinePoint(src, points[0]);
        const end = outlinePoint(tgt, points.at(-1) ?? tgt.center);
        points = roundedCorners([start, ...points, end], radii, types).slice(1, -1);
    }
    return points.length === 0 ? null : canonBends(src.center, tgt.center, points, true);
}

/** How many points each rounded corner's arc is drawn with. */
const ARC_STEPS = 8;

/**
 * A polyline's corners rounded as Cytoscape.js rounds a `round-segments` or `round-taxi` edge's (cytoscape.js 3.34.3
 * `calcCornerArc`): an arc tangent to both sides, its radius the corner's (the last given for the corners after it),
 * or for `influence-radius` starting that far back along each side; never reaching past either side's middle.
 * @param line - the points, ends included
 * @param radii - the corners' radii
 * @param types - each corner's radius type
 * @returns the points with each corner replaced by its arc
 */
function roundedCorners(line: readonly BendPoint[], radii: readonly number[], types: readonly string[]): BendPoint[] {
    const out: BendPoint[] = [line[0]];
    for (let i = 1; i < line.length - 1; i++) {
        const [p, a, b] = [line[i], line[i - 1], line[i + 1]];
        const r = radii[Math.min(i - 1, radii.length - 1)] ?? 15;
        const arc = (types[Math.min(i - 1, types.length - 1)] ?? "arc-radius") !== "influence-radius";
        const l1 = Math.hypot(a[0] - p[0], a[1] - p[1]);
        const l2 = Math.hypot(b[0] - p[0], b[1] - p[1]);
        const u1: BendPoint = [(a[0] - p[0]) / l1, (a[1] - p[1]) / l1];
        const u2: BendPoint = [(b[0] - p[0]) / l2, (b[1] - p[1]) / l2];
        // the angle between the two sides at the corner
        const angle = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
        const half = angle / 2;
        // a radius that is not a number, like one of 0, rounds nothing
        const rounds = r > 0 && l1 > 0 && l2 > 0;
        if (!rounds || Math.abs(Math.PI - angle) < 1e-6) {
            out.push(p);
            continue;
        }
        const limit = Math.min(l1 / 2, l2 / 2);
        const back = Math.min(limit, arc ? r / Math.tan(half) : r);
        const radius = back * Math.tan(half);
        const bis: BendPoint = [u1[0] + u2[0], u1[1] + u2[1]];
        const bl = Math.hypot(bis[0], bis[1]);
        const reach = Math.hypot(back, radius);
        const c: BendPoint = [p[0] + (bis[0] / bl) * reach, p[1] + (bis[1] / bl) * reach];
        const from = Math.atan2(p[1] + u1[1] * back - c[1], p[0] + u1[0] * back - c[0]);
        const to = Math.atan2(p[1] + u2[1] * back - c[1], p[0] + u2[0] * back - c[0]);
        // the short way round
        let sweep = to - from;
        sweep -= 2 * Math.PI * Math.round(sweep / (2 * Math.PI));
        for (let k = 0; k <= ARC_STEPS; k++) {
            const t = from + (sweep * k) / ARC_STEPS;
            out.push([c[0] + Math.cos(t) * radius, c[1] + Math.sin(t) * radius]);
        }
    }
    out.push(line.at(-1) ?? line[0]);
    return out;
}

/**
 * A loop's route (`findLoopPoints`): two control points out from the node's center along the loop's direction, half
 * its sweep to either side, as far as 1.4 times the step size (the control point distance for an unbundled bezier),
 * further for each loop before it; written relative to the node's size.
 * @param edge - the edge's settings
 * @param node - its node
 * @param loopIndex - how many loops of the same direction and sweep come before it
 * @returns the bends
 */
function loopRoute(edge: CyjsRouteEdge, node: CyjsRouteNode, loopIndex: number): CyjsRoute {
    const unbundled = edge.curveStyle === "unbundled-bezier";
    const dist = unbundled
        ? (lengths(edge.controlPointDistances ?? "").at(0) ?? Number.NaN)
        : (edge.controlPointStepSize ?? 40);
    const dir = radians(edge.loopDirection ?? "-45deg");
    const sweep = radians(edge.loopSweep ?? "-90deg");
    if (!Number.isFinite(dist + dir + sweep)) {
        return null;
    }
    const angle = dir - Math.PI / 2;
    const reach = 1.4 * dist * (loopIndex / 3 + 1);
    const [cx, cy] = node.center;
    const at = (a: number): BendPoint => [cx + Math.cos(a) * reach, cy + Math.sin(a) * reach];
    const points = splinePoints(node, node, [at(angle - sweep / 2), at(angle + sweep / 2)]);
    return canonNodeOffsets(node.center, node.box, points, true);
}
