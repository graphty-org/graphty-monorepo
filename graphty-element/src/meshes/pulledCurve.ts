/**
 * @file A curved edge's path, worked out from its two node centers and a few numbers kept per edge, so a
 * shader can draw it from the row table (design/rendering/row-renderer.md, stage 21).
 *
 * The object path draws a lone curve (`line.bezier`) as `EdgeMesh.createBezierLine`'s samples, cut where
 * the run of samples leaves each node (`Edge.placeRoute`: `routeOutside`, then `crossingOf` on the chord
 * between the last sample inside and the first outside). This file is that path again in plain numbers:
 * {@link bezierSamples} gives the same samples, {@link curveSpan} the numbers the cut leaves (which
 * sample is first outside, how many pieces, and how far along each cut chord the line starts and stops),
 * and {@link curvePathPoint} any one point of the cut path from those numbers alone. `PULLED_CURVE_GLSL`
 * is {@link curvePathPoint} for a shader. A curve fanned out of a bundle (`edgeRoute.fanArc`) is the same
 * cut of another path: a quadratic that bows a signed distance to the chord's left, kept in the span. A curve drawn
 * as an arc of a circle through both centers (`line.arcRadius`, `edgeRoute.centerArc`) is the cut of a third, kept as
 * its radius. Nothing here reads Babylon.js, so it runs in Node.
 */

import { centerCircle, fanArcPieces, routeOutside, type Xyz } from "./edgeRoute";

/** How far the two control points stand off the chord, a share of its length (`EDGE_CONSTANTS.BEZIER_CONTROL_POINT_OFFSET`). */
const CONTROL_OFFSET = 0.3;

/** Samples per unit of the curve's estimated length (`EDGE_CONSTANTS.BEZIER_POINT_DENSITY`). */
const DENSITY = 8;

/** The most and fewest pieces a curve is sampled with (`EDGE_CONSTANTS.BEZIER_MAX_SEGMENTS`, and `createBezierLine`'s 10). */
const MAX_PIECES = 64;
const MIN_PIECES = 10;

/** Where a curve's drawn path starts and stops, as {@link curveSpan} finds it. */
export interface CurveSpan {
    /** The pieces the curve is sampled with: samples 0 to `samples`, at t = i / samples. */
    readonly samples: number;
    /** The first sample outside the source node; the path starts on the chord before it. */
    readonly first: number;
    /** The pieces the cut path is drawn with; its last sample kept is `first + pieces - 2`. */
    readonly pieces: number;
    /** How far from sample `first - 1` toward `first` the path starts. */
    readonly startAt: number;
    /** How far from sample `first + pieces - 1` back toward the last sample kept the path stops. */
    readonly endAt: number;
    /**
     * For a fanned arc, how far its middle bows to the left of the chord from source to target in the
     * x-y plane (`fanArc`'s offset, negated for an edge drawn against its bundle's first); null for a
     * lone curve.
     */
    readonly bow: number | null;
    /**
     * For a center arc, the circle's radius as a multiple of the chord in the x-y plane (`line.arcRadius`, at
     * least 0.5); null otherwise.
     */
    readonly radius: number | null;
    /**
     * For a center arc, the angle it turns through from the source to the target, negative clockwise: set by the
     * radius alone, so the shader needs no arc tangent and turns a half circle the way `centerArc` did; null otherwise.
     */
    readonly turn: number | null;
}

/**
 * How many pieces a curve between two centers is sampled with, as `createBezierLine` counts them.
 * @param src - The source center.
 * @param dst - The target center.
 * @returns The count.
 */
function curvePieces(src: Xyz, dst: Xyz): number {
    const length = Math.hypot(dst.x - src.x, dst.y - src.y, dst.z - src.z) * 1.5;
    return Math.min(MAX_PIECES, Math.max(MIN_PIECES, Math.ceil(length * DENSITY)));
}

/**
 * The curve's two control points, as `EdgeMesh.calculateControlPoints` places them: a quarter and three
 * quarters along the chord, stood off to its left in the x-y plane (sideways for a chord along z).
 * @param src - The source center.
 * @param dst - The target center.
 * @returns The two points.
 */
function controls(src: Xyz, dst: Xyz): [Xyz, Xyz] {
    const dx = dst.x - src.x;
    const dy = dst.y - src.y;
    const dz = dst.z - src.z;
    const distance = Math.hypot(dx, dy, dz);
    let side: Xyz = { x: -dy, y: dx, z: 0 };
    if (Math.hypot(side.x, side.y, side.z) < 1e-6 * Math.max(distance, 1e-12)) {
        side = { x: -dz, y: 0, z: dx };
    }

    const length = Math.hypot(side.x, side.y, side.z);
    const scale = length === 0 ? 0 : (1 / length) * distance * CONTROL_OFFSET;
    const lerp = (a: Xyz, b: Xyz, t: number): Xyz => ({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
    });
    const mid = lerp(src, dst, 0.5);
    const a = lerp(src, mid, 0.5);
    const b = lerp(mid, dst, 0.5);
    return [
        { x: a.x + side.x * scale, y: a.y + side.y * scale, z: a.z + side.z * scale },
        { x: b.x + side.x * scale, y: b.y + side.y * scale, z: b.z + side.z * scale },
    ];
}

/**
 * One sample of the curve.
 * @param src - The source center.
 * @param dst - The target center.
 * @param i - The sample, 0 to `samples`.
 * @param samples - The pieces the curve is sampled with.
 * @returns The point.
 */
function sampleAt(src: Xyz, dst: Xyz, i: number, samples: number): Xyz {
    const [c1, c2] = controls(src, dst);
    const t = i / samples;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return {
        x: src.x * a + c1.x * b + c2.x * c + dst.x * d,
        y: src.y * a + c1.y * b + c2.y * c + dst.y * d,
        z: src.z * a + c1.z * b + c2.z * c + dst.z * d,
    };
}

/**
 * One sample of a fanned arc, as `fanArc` computes it: the quadratic whose middle is `bow` to the chord's left.
 * @param src - The source center.
 * @param dst - The target center.
 * @param i - The sample, 0 to `samples`.
 * @param samples - The pieces the arc is sampled with.
 * @param bow - The bow.
 * @returns The point.
 */
function arcSampleAt(src: Xyz, dst: Xyz, i: number, samples: number, bow: number): Xyz {
    const dx = dst.x - src.x;
    const dy = dst.y - src.y;
    const length = Math.hypot(dx, dy) || 1;
    const cx = (src.x + dst.x) / 2 - (dy / length) * bow * 2;
    const cy = (src.y + dst.y) / 2 + (dx / length) * bow * 2;
    const cz = (src.z + dst.z) / 2;
    const t = i / samples;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    return { x: a * src.x + b * cx + c * dst.x, y: a * src.y + b * cy + c * dst.y, z: a * src.z + b * cz + c * dst.z };
}

/**
 * One sample of a center arc, as `centerArc` computes it: both ends exactly the centers, z straight between them.
 * @param src - The source center.
 * @param dst - The target center.
 * @param i - The sample, 0 to `samples`.
 * @param samples - The pieces the arc is sampled with.
 * @param radius - The radius, a multiple of the chord in the x-y plane.
 * @returns The point.
 */
function circleSampleAt(src: Xyz, dst: Xyz, i: number, samples: number, radius: number): Xyz {
    const t = i / samples;
    const circle = centerCircle(src, dst, radius);
    if (circle === null) {
        return { x: src.x + (dst.x - src.x) * t, y: src.y + (dst.y - src.y) * t, z: src.z + (dst.z - src.z) * t };
    }

    if (i <= 0 || i >= samples) {
        return i <= 0 ? src : dst;
    }

    const { cx, cy, r, from, turn } = circle;
    const a = from + turn * t;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), z: src.z + (dst.z - src.z) * t };
}

/** Which path a span samples: a lone curve, a fanned arc (`bow`) or a center arc (`radius`). */
type Shape = Pick<CurveSpan, "bow" | "radius" | "turn">;

/**
 * One sample of the path a span's shape names.
 * @param src - The source center.
 * @param dst - The target center.
 * @param i - The sample.
 * @param samples - The pieces.
 * @param shape - The span's bow, radius and turn.
 * @returns The point.
 */
function pathSampleAt(src: Xyz, dst: Xyz, i: number, samples: number, shape: Shape): Xyz {
    if (shape.radius !== null) {
        return circleSampleAt(src, dst, i, samples, shape.radius);
    }

    return shape.bow === null ? sampleAt(src, dst, i, samples) : arcSampleAt(src, dst, i, samples, shape.bow);
}

/**
 * The span's shape as the shader's two numbers: (bow or turn, 0 for a lone curve, 1 for a fanned arc, 2 for a
 * center arc), the last two of a curve piece's fourth texel.
 * @param span - The span, or null.
 * @returns The two numbers.
 */
export function curveShape(span: Shape | null): [number, number] {
    const turn = span?.turn ?? null;
    if (turn !== null) {
        return [turn, 2];
    }

    const bow = span?.bow ?? null;
    return bow === null ? [0, 0] : [bow, 1];
}

/**
 * The curve's samples, flat x, y, z: `EdgeMesh.createBezierLine` for two different centers.
 * @param src - The source center.
 * @param dst - The target center.
 * @returns The samples.
 */
export function bezierSamples(src: Xyz, dst: Xyz): number[] {
    const samples = curvePieces(src, dst);
    const out: number[] = [];
    for (let i = 0; i <= samples; i++) {
        const p = sampleAt(src, dst, i, samples);
        out.push(p.x, p.y, p.z);
    }

    return out;
}

/**
 * How far along a chord from `inside` to `outside` it crosses a node's outline: `crossingOf`'s halving,
 * answering the fraction in place of the point, so `inside + (outside - inside) * fraction` is its point.
 * @param inside - The chord's end inside the node.
 * @param outside - Its end outside it.
 * @param isOutside - Whether a point is outside the node.
 * @returns The fraction, in (0, 1].
 */
function crossingAlong(inside: Xyz, outside: Xyz, isOutside: (x: number, y: number, z: number) => boolean): number {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        const outsideAt = isOutside(
            inside.x + (outside.x - inside.x) * mid,
            inside.y + (outside.y - inside.y) * mid,
            inside.z + (outside.z - inside.z) * mid,
        );
        if (outsideAt) {
            hi = mid;
        } else {
            lo = mid;
        }
    }

    return hi;
}

/**
 * Where the drawn path of a curve starts and stops, cut where its samples leave each node as
 * `Edge.placeRoute` cuts it.
 * @param src - The source center.
 * @param dst - The target center.
 * @param outsideSrc - Whether a point is outside the source node.
 * @param outsideDst - Whether a point is outside the target node.
 * @param bow - A fanned arc's bow ({@link CurveSpan.bow}), or null for a lone curve.
 * @param radius - A center arc's radius ({@link CurveSpan.radius}), or null; it wins over `bow`.
 * @returns The span; the lone curve from center to center, uncut, when no sample is outside both nodes, as
 *     the object path then draws it; or null when it draws the curve another way: a center outside its own node
 *     (the line then leaves from the center, `Edge.leaveNode`).
 */
export function curveSpan(
    src: Xyz,
    dst: Xyz,
    outsideSrc: (x: number, y: number, z: number) => boolean,
    outsideDst: (x: number, y: number, z: number) => boolean,
    bow: number | null = null,
    radius: number | null = null,
): CurveSpan | null {
    const circle = radius === null ? null : centerCircle(src, dst, radius);
    let shape: Shape = { bow, radius: null, turn: null };
    if (radius !== null) {
        shape = { bow: null, radius, turn: circle?.turn ?? 0 };
    }

    let samples = curvePieces(src, dst);
    if (radius !== null) {
        samples = circle?.pieces ?? 1;
    } else if (shape.bow !== null) {
        samples = fanArcPieces(Math.hypot(dst.x - src.x, dst.y - src.y, dst.z - src.z), shape.bow);
    }

    const flat: number[] = [];
    for (let i = 0; i <= samples; i++) {
        const p = pathSampleAt(src, dst, i, samples, shape);
        flat.push(p.x, p.y, p.z);
    }

    const span = routeOutside(flat, outsideSrc, outsideDst);
    if (span === null) {
        // a route no point of which clears both nodes is drawn as the lone curve from center to center, uncut
        // (`Edge.placeCurve`), a fanned arc's too
        const lone = curvePieces(src, dst);
        return { samples: lone, first: 1, pieces: lone, startAt: 0, endAt: 0, bow: null, radius: null, turn: null };
    }

    if (span.first === 0 || span.last === samples) {
        return null;
    }

    const at = (i: number): Xyz => ({ x: flat[3 * i], y: flat[3 * i + 1], z: flat[3 * i + 2] });
    return {
        samples,
        first: span.first,
        pieces: span.last - span.first + 2,
        startAt: crossingAlong(at(span.first - 1), at(span.first), outsideSrc),
        endAt: crossingAlong(at(span.last + 1), at(span.last), outsideDst),
        ...shape,
    };
}

/**
 * One point of a curve's cut path, from the two centers and its span alone: point 0 is where it leaves
 * the source, point `pieces` where it meets the target, and the points between are samples.
 * @param src - The source center.
 * @param dst - The target center.
 * @param span - The span.
 * @param j - The point, 0 to `span.pieces`.
 * @returns The point.
 */
export function curvePathPoint(src: Xyz, dst: Xyz, span: CurveSpan, j: number): Xyz {
    const { samples, first, pieces } = span;
    const cut = (inside: number, outside: number, t: number): Xyz => {
        const a = pathSampleAt(src, dst, inside, samples, span);
        const b = pathSampleAt(src, dst, outside, samples, span);
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    };
    if (j <= 0) {
        return cut(first - 1, first, span.startAt);
    }

    if (j >= pieces) {
        return cut(first + pieces - 1, first + pieces - 2, span.endAt);
    }

    return pathSampleAt(src, dst, first + j - 1, samples, span);
}

/**
 * {@link curvePathPoint} for a shader: `pulledCurvePoint(src, dst, span, cut, j)`, where `span` is
 * (samples, first, pieces, unused) and `cut` is (startAt, endAt, then {@link curveShape}'s two numbers).
 */
export const PULLED_CURVE_GLSL = `
vec3 pulledArcSample(vec3 src, vec3 dst, float i, float samples, float bow) {
    vec2 d = dst.xy - src.xy;
    float chord = length(d);
    vec2 left = vec2(-d.y, d.x) / (chord == 0.0 ? 1.0 : chord);
    vec3 c = vec3((src.xy + dst.xy) * 0.5 + left * bow * 2.0, (src.z + dst.z) * 0.5);
    float t = i / samples;
    float u = 1.0 - t;
    return src * (u * u) + c * (2.0 * u * t) + dst * (t * t);
}

vec3 pulledLoneSample(vec3 src, vec3 dst, float i, float samples) {
    vec3 d = dst - src;
    float chordLength = length(d);
    vec3 side = vec3(-d.y, d.x, 0.0);
    if (length(side) < 1e-6 * max(chordLength, 1e-12)) {
        side = vec3(-d.z, 0.0, d.x);
    }
    float sideLength = length(side);
    side *= sideLength == 0.0 ? 0.0 : (1.0 / sideLength) * chordLength * ${CONTROL_OFFSET.toFixed(1)};
    vec3 mid = src + d * 0.5;
    vec3 c1 = src + (mid - src) * 0.5 + side;
    vec3 c2 = mid + (dst - mid) * 0.5 + side;
    float t = i / samples;
    float u = 1.0 - t;
    return src * (u * u * u) + c1 * (3.0 * u * u * t) + c2 * (3.0 * u * t * t) + dst * (t * t * t);
}

// sin and cos of an angle within a quarter turn by their Taylor series, to x^15 and x^14 (under 1e-9 off): a GPU's
// built-in sin and cos may be far coarser (SwiftShader's put a circle's samples 4e-3 off at a radius of 40)
vec2 pulledSinCos(float x) {
    float x2 = x * x;
    float s = 1.0 + x2 * (-1.0 / 6.0 + x2 * (1.0 / 120.0 + x2 * (-1.0 / 5040.0 + x2 * (1.0 / 362880.0
        + x2 * (-1.0 / 39916800.0 + x2 * (1.0 / 6227020800.0 + x2 * (-1.0 / 1307674368000.0)))))));
    float c = 1.0 + x2 * (-0.5 + x2 * (1.0 / 24.0 + x2 * (-1.0 / 720.0 + x2 * (1.0 / 40320.0
        + x2 * (-1.0 / 3628800.0 + x2 * (1.0 / 479001600.0 + x2 * (-1.0 / 87178291200.0)))))));
    return vec2(x * s, c);
}

vec3 pulledCircleSample(vec3 src, vec3 dst, float i, float samples, float turn) {
    float t = i / samples;
    if (turn == 0.0 || i <= 0.0 || i >= samples) {
        return turn == 0.0 ? mix(src, dst, t) : (i <= 0.0 ? src : dst);
    }
    // The radius from the center (to the chord's right) to the source, turned through its share of the turn, as the
    // chord it sweeps: (R - I) v = 2 sin(h) (-sin(h) v + cos(h) perp(v)), h half the angle. Turning v itself puts a
    // float's error times the radius on the point, and the radius grows without bound as the arc flattens.
    vec2 d = dst.xy - src.xy;
    vec2 halfTurn = pulledSinCos(abs(turn) * 0.5);
    vec2 v = -(d * 0.5 + vec2(d.y, -d.x) * (0.5 * halfTurn.y / halfTurn.x));
    vec2 h = pulledSinCos(turn * t * 0.5);
    vec2 p = src.xy + 2.0 * h.x * (-h.x * v + h.y * vec2(-v.y, v.x));
    return vec3(p, mix(src.z, dst.z, t));
}

vec3 pulledCurveSample(vec3 src, vec3 dst, float i, float samples, vec4 cut) {
    if (cut.w > 1.5) {
        return pulledCircleSample(src, dst, i, samples, cut.z);
    }
    return cut.w > 0.5 ? pulledArcSample(src, dst, i, samples, cut.z) : pulledLoneSample(src, dst, i, samples);
}

vec3 pulledCurvePoint(vec3 src, vec3 dst, vec4 span, vec4 cut, int j) {
    float samples = span.x;
    float first = span.y;
    int pieces = int(span.z + 0.5);
    if (j <= 0) {
        vec3 a = pulledCurveSample(src, dst, first - 1.0, samples, cut);
        return a + (pulledCurveSample(src, dst, first, samples, cut) - a) * cut.x;
    }
    if (j >= pieces) {
        float outside = first + float(pieces) - 1.0;
        vec3 a = pulledCurveSample(src, dst, outside, samples, cut);
        return a + (pulledCurveSample(src, dst, outside - 1.0, samples, cut) - a) * cut.y;
    }
    return pulledCurveSample(src, dst, first + float(j) - 1.0, samples, cut);
}
`;
