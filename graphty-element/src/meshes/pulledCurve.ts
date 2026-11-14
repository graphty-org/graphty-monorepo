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
 * its radius, a raised arc (`line.route` "arc", `edgeRoute.raisedArc`) as its height, and a great-circle arc over a
 * globe (`line.route` "great-circle", `edgeRoute.greatCircleArc`) as its height and the angle it turns through. A
 * self-loop's teardrop (`edgeRoute.loopTeardrop`) is the cut of a cubic from its node's center back to it, kept as
 * its two control points ({@link loopShape}). A curve through a support point (`line.supportModel`, `Edge.bundleRoute`'s
 * `bezierThroughControls`) is the cut of a quadratic through it, kept as the point's share along the chord and across
 * it ({@link viaShare}). Nothing here reads Babylon.js, so it runs in Node.
 */

import {
    bendPoints,
    BEZIER_STEPS,
    centerCircle,
    fanArcPieces,
    greatCircle,
    LOOP_STEPS,
    loopControls,
    routeOutside,
    type Xyz,
} from "./edgeRoute";

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
     * radius alone; null otherwise. Its cut path goes in the route table ({@link routed}), not to the shader.
     */
    readonly turn: number | null;
    /**
     * For a raised arc (`line.route` "arc", `edgeRoute.raisedArc`), how high it rises toward -z at its middle as a
     * share of the chord in the x-y plane (`line.arcHeight`); null otherwise.
     */
    readonly height: number | null;
    /**
     * For a great-circle arc (`line.route` "great-circle", `edgeRoute.greatCircleArc`), the angle between its two
     * centers' directions from the globe's center, 0 where it is drawn straight; null otherwise. Its lift is `height`.
     */
    readonly angle: number | null;
    /**
     * For the lone curve drawn uncut in place of a route no sample of which clears both nodes, how far along the
     * chord from source to target it starts and stops, when a gap (`line.nodeGap`) moves those ends off the centers
     * (`Edge.bareEnd`); null otherwise. The curve is then the lone curve between those two points of the chord.
     */
    readonly ends: readonly [number, number] | null;
    /**
     * For a self-loop's teardrop, its two control points from the node's center as (x, y, k): their mean (x, y), and
     * how far they stand either side of it, a share k of it turned a quarter left (the first) and right (the
     * second); null otherwise ({@link loopShape}).
     */
    readonly loop: readonly [number, number, number] | null;
    /**
     * For a curve through a support point (`line.supportModel`), the point as (along, across): its share along the chord
     * from source to target and its share of the chord turned a quarter left, in the x-y plane, its z the chord's at
     * `along`, as `supportPoints` places it; null otherwise ({@link viaShare}).
     */
    readonly via: readonly [number, number] | null;
    /**
     * For a straight line through bends (`line.bends`), the bends as `edgeRoute.parseBends` reads them, flat (along,
     * across) pairs placed between the centers as `edgeRoute.bendPoints` places them: sample 0 is the source center,
     * sample `samples` the target's and the samples between are the bends; null otherwise. A shader reads the cut path they place from
     * the batch's route table, not from the span ({@link curveShape}).
     */
    readonly bends: readonly number[] | null;
}

/**
 * A support point as {@link CurveSpan.via} keeps it, as `supportPoints`' `toRel` has it: an edge of no length in x-y
 * keeps it at its middle.
 * @param src - The source center.
 * @param dst - The target center.
 * @param via - The support point.
 * @returns Its (along, across).
 */
export function viaShare(src: Xyz, dst: Xyz, via: Xyz): [number, number] {
    const dx = dst.x - src.x;
    const dy = dst.y - src.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) {
        return [0.5, 0];
    }

    const qx = via.x - src.x;
    const qy = via.y - src.y;
    return [(qx * dx + qy * dy) / l2, (dx * qy - dy * qx) / l2];
}

/**
 * One sample of a straight line through bends: the source center, a bend, or the target center.
 * @param src - The source center.
 * @param dst - The target center.
 * @param i - The sample, 0 to `samples`.
 * @param samples - The bends plus one.
 * @param bends - The bends, flat (along, across) pairs.
 * @returns The point.
 */
function bendSampleAt(src: Xyz, dst: Xyz, i: number, samples: number, bends: readonly number[]): Xyz {
    if (i <= 0 || i >= samples) {
        return i <= 0 ? src : dst;
    }

    const [x, y, z] = bendPoints(src, dst, bends.slice(2 * i - 2, 2 * i));
    return { x, y, z };
}

/**
 * One sample of a curve through a support point, as `bezierThroughControls` computes it for one control: the quadratic
 * through the point {@link CurveSpan.via} names.
 * @param src - The source center.
 * @param dst - The target center.
 * @param i - The sample, 0 to `samples`.
 * @param samples - The pieces the curve is sampled with.
 * @param via - The point's (along, across).
 * @returns The point.
 */
function viaSampleAt(src: Xyz, dst: Xyz, i: number, samples: number, via: readonly [number, number]): Xyz {
    const [along, across] = via;
    const dx = dst.x - src.x;
    const dy = dst.y - src.y;
    const c = {
        x: src.x + along * dx - across * dy,
        y: src.y + along * dy + across * dx,
        z: src.z + (dst.z - src.z) * along,
    };
    const t = i / samples;
    // de Casteljau, as `bezierThroughControls` interpolates
    const at = (a: number, b: number, d: number): number => {
        const near = a + (b - a) * t;
        return near + (b + (d - b) * t - near) * t;
    };
    return { x: at(src.x, c.x, dst.x), y: at(src.y, c.y, dst.y), z: at(src.z, c.z, dst.z) };
}

/**
 * A self-loop's teardrop as {@link CurveSpan.loop} keeps it, from where `edgeRoute.loopTeardrop` puts its controls.
 * @param rank - The loop's place among the loops on its node, from zero.
 * @param count - How many loops the node has.
 * @param reachAt - How far the node's surface (and border) is from its center in a direction.
 * @returns The loop's (x, y, k).
 */
export function loopShape(rank: number, count: number, reachAt: (dir: Xyz) => number): [number, number, number] {
    const { c1, c2, sweep } = loopControls(rank, count, reachAt);
    return [(c1.x + c2.x) / 2, (c1.y + c2.y) / 2, Math.tan(sweep / 2)];
}

/**
 * One sample of a self-loop's teardrop, as `loopTeardrop` computes it: a cubic from the center back to it, flat in z.
 * @param center - The node's center.
 * @param i - The sample, 0 to `samples`.
 * @param samples - The pieces the teardrop is sampled with.
 * @param loop - Its controls, {@link CurveSpan.loop}.
 * @returns The point.
 */
function loopSampleAt(center: Xyz, i: number, samples: number, loop: readonly [number, number, number]): Xyz {
    const [x, y, k] = loop;
    const t = i / samples;
    const b = 3 * (1 - t) * (1 - t) * t;
    const c = 3 * (1 - t) * t * t;
    return {
        x: center.x + b * (x - k * y) + c * (x + k * y),
        y: center.y + b * (y + k * x) + c * (y - k * x),
        z: center.z,
    };
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

/**
 * One sample of a raised arc, as `raisedArc` computes it: the chord, lifted toward -z by a parabola.
 * @param src - The source center.
 * @param dst - The target center.
 * @param i - The sample, 0 to `samples`.
 * @param samples - The pieces the arc is sampled with.
 * @param height - Its peak, a share of the chord in the x-y plane.
 * @returns The point.
 */
function raisedSampleAt(src: Xyz, dst: Xyz, i: number, samples: number, height: number): Xyz {
    const peak = height * Math.hypot(dst.x - src.x, dst.y - src.y);
    const t = i / samples;
    const lift = 4 * peak * t * (1 - t);
    return { x: src.x + (dst.x - src.x) * t, y: src.y + (dst.y - src.y) * t, z: src.z + (dst.z - src.z) * t - lift };
}

/**
 * One sample of a great-circle arc, as `greatCircleArc` computes it: both ends exactly the centers, the straight line
 * when its angle is 0.
 * @param src - The source center.
 * @param dst - The target center.
 * @param i - The sample, 0 to `samples`.
 * @param samples - The pieces the arc is sampled with.
 * @param height - Its lift, a share of the straight distance between the centers.
 * @returns The point.
 */
function globeSampleAt(src: Xyz, dst: Xyz, i: number, samples: number, height: number): Xyz {
    if (i <= 0 || i >= samples) {
        return i <= 0 ? src : dst;
    }

    const circle = greatCircle(src, dst, height);
    if (circle === null) {
        return along(src, dst, i / samples);
    }

    const { ra, rb, angle, sin, lift } = circle;
    const t = i / samples;
    const a = Math.sin((1 - t) * angle) / sin / ra;
    const b = Math.sin(t * angle) / sin / rb;
    const r = ra + (rb - ra) * t + lift * Math.sin(Math.PI * t);
    return { x: (a * src.x + b * dst.x) * r, y: (a * src.y + b * dst.y) * r, z: (a * src.z + b * dst.z) * r };
}

/**
 * Which path a span samples: a lone curve, a fanned arc (`bow`), a center arc (`radius`), a raised arc (`height`) or a
 * great-circle arc (`angle`), a self-loop's teardrop (`loop`), or a curve through a support point (`via`).
 */
type Shape = Pick<CurveSpan, "bow" | "radius" | "turn" | "height" | "angle" | "ends" | "loop" | "via" | "bends">;

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
    const { ends, loop, bends } = shape;
    if (bends !== null) {
        return bendSampleAt(src, dst, i, samples, bends);
    }

    if (loop !== null) {
        return loopSampleAt(src, i, samples, loop);
    }

    if (ends !== null) {
        return sampleAt(along(src, dst, ends[0]), along(src, dst, ends[1]), i, samples);
    }

    if (shape.angle !== null) {
        return globeSampleAt(src, dst, i, samples, shape.height ?? 0);
    }

    if (shape.height !== null) {
        return raisedSampleAt(src, dst, i, samples, shape.height);
    }

    if (shape.via !== null) {
        return viaSampleAt(src, dst, i, samples, shape.via);
    }

    if (shape.radius !== null) {
        return circleSampleAt(src, dst, i, samples, shape.radius);
    }

    return shape.bow === null ? sampleAt(src, dst, i, samples) : arcSampleAt(src, dst, i, samples, shape.bow);
}

/**
 * The point a share of the way along the chord from one center to the other.
 * @param src - The source center.
 * @param dst - The target center.
 * @param t - The share.
 * @returns The point.
 */
function along(src: Xyz, dst: Xyz, t: number): Xyz {
    return { x: src.x + (dst.x - src.x) * t, y: src.y + (dst.y - src.y) * t, z: src.z + (dst.z - src.z) * t };
}

/**
 * The span's shape as the shader's three numbers: (bow or where an uncut curve starts; 0 for a lone curve,
 * 1 for a fanned arc, 3 for a lone curve between two points of the chord, 4 for a raised arc
 * (its height first), 5 for a great-circle arc (its height first), or for a self-loop's teardrop (its controls'
 * mean x first) 6 plus its share k, under tan(pi / 5), 7 for a curve through a support point (its share along
 * first), 8 for a straight line through bends or a center arc (the texel its cut path starts at in the route table
 * first); where that
 * curve stops, a great-circle arc's angle, the teardrop's mean y, or the support point's share across), the last three
 * of a curve piece's fourth texel.
 * @param span - The span, or null.
 * @param route - For a routed path ({@link routed}), the route table texel its cut path starts at, one point to a texel.
 * @returns The three numbers.
 */
export function curveShape(span: Shape | null, route = 0): [number, number, number] {
    if ((span?.bends ?? null) !== null) {
        return [route, 8, 0];
    }

    const loop = span?.loop ?? null;
    if (loop !== null) {
        return [loop[0], 6 + loop[2], loop[1]];
    }

    const ends = span?.ends ?? null;
    if (ends !== null) {
        return [ends[0], 3, ends[1]];
    }

    const via = span?.via ?? null;
    if (via !== null) {
        return [via[0], 7, via[1]];
    }

    const height = span?.height ?? null;
    const angle = span?.angle ?? null;
    if (angle !== null) {
        return [height ?? 0, 5, angle];
    }

    if (height !== null) {
        return [height, 4, 0];
    }

    // a center arc is routed too: the shader's float32 sine and cosine put its points a last bit off the object
    // path's, which flips a multisample on its edge (#6392)
    if ((span?.turn ?? null) !== null) {
        return [route, 8, 0];
    }

    const bow = span?.bow ?? null;
    return bow === null ? [0, 0, 0] : [bow, 1, 0];
}

/**
 * Whether a span's cut path is read from the batch's route table, placed in doubles, rather than worked out by the
 * shader: a line through bends and a center arc ({@link curveShape} kind 8).
 * @param span - The span.
 * @returns True when its points go in the route table.
 */
export function routed(span: Shape): boolean {
    return curveShape(span)[1] === 8;
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
 * The shape and sample count of the path {@link curveSpan} cuts.
 * @param src - The source center.
 * @param dst - The target center.
 * @param path - {@link curveSpan}'s path.
 * @param path.bow - The bow.
 * @param path.radius - The radius.
 * @param path.height - The height.
 * @param path.globe - Whether the height lifts a great-circle arc.
 * @param path.loop - A self-loop's teardrop.
 * @param path.via - A support point.
 * @param path.bends - The bends.
 * @returns The shape and the pieces it is sampled with.
 */
function pathShape(
    src: Xyz,
    dst: Xyz,
    path: {
        bow?: number | null;
        radius?: number | null;
        height?: number | null;
        globe?: boolean;
        loop?: readonly [number, number, number] | null;
        via?: readonly [number, number] | null;
        bends?: readonly number[] | null;
    },
): { shape: Shape; samples: number } {
    const { bow = null, radius = null, height = null, globe = false, loop = null, via = null, bends = null } = path;
    const none: Shape = {
        bow: null,
        radius: null,
        turn: null,
        height: null,
        angle: null,
        ends: null,
        loop: null,
        via: null,
        bends: null,
    };
    if (bends !== null) {
        return { shape: { ...none, bends }, samples: bends.length / 2 + 1 };
    }

    if (loop !== null) {
        return { shape: { ...none, loop }, samples: LOOP_STEPS };
    }

    if (height !== null && globe) {
        // `greatCircleArc`: a straight route is its two ends
        const sphere = greatCircle(src, dst, height);
        return { shape: { ...none, height, angle: sphere?.angle ?? 0 }, samples: sphere?.pieces ?? 1 };
    }

    if (height !== null) {
        // `raisedArc`: a flat route is its two ends
        const chord = Math.hypot(dst.x - src.x, dst.y - src.y);
        return { shape: { ...none, height }, samples: height * chord > 0 ? fanArcPieces(chord, height * chord) : 1 };
    }

    if (via !== null) {
        return { shape: { ...none, via }, samples: BEZIER_STEPS };
    }

    if (radius !== null) {
        const circle = centerCircle(src, dst, radius);
        return { shape: { ...none, radius, turn: circle?.turn ?? 0 }, samples: circle?.pieces ?? 1 };
    }

    if (bow !== null) {
        const chord = Math.hypot(dst.x - src.x, dst.y - src.y, dst.z - src.z);
        return { shape: { ...none, bow }, samples: fanArcPieces(chord, bow) };
    }

    return { shape: none, samples: curvePieces(src, dst) };
}

/**
 * Where the drawn path of a curve starts and stops, cut where its samples leave each node as
 * `Edge.placeRoute` cuts it.
 * @param src - The source center.
 * @param dst - The target center.
 * @param outsideSrc - Whether a point is outside the source node.
 * @param outsideDst - Whether a point is outside the target node.
 * @param path - The path, a lone curve when empty: a fanned arc's bow ({@link CurveSpan.bow}), a center arc's radius
 *     ({@link CurveSpan.radius}), which wins over a bow, or a raised arc's height ({@link CurveSpan.height}), which wins
 *     over both; with `globe`, a great-circle arc's; or a self-loop's teardrop ({@link CurveSpan.loop}), which wins
 *     over all of them, from `src`, which `dst` equals, back to it.
 * @param path.bow - The bow.
 * @param path.radius - The radius.
 * @param path.height - The height.
 * @param path.globe - Whether the height lifts a great-circle arc over a globe centered on the origin (`line.route`
 *     "great-circle") rather than a raised arc over a flat map.
 * @param path.straight - Whether the line is straight (no `line.bezier`): a route no sample of which clears both
 *     nodes is then the straight line between the bare ends, not the lone curve.
 * @param path.loop - The teardrop.
 * @param path.via - A support point ({@link CurveSpan.via}), which a bow and a radius give way to and a height and a
 *     teardrop win over, as `Edge.bundleRoute` draws them.
 * @param path.bends - A straight line's bends ({@link CurveSpan.bends}), which win over every other path.
 * @param bareEnds - Where the line starts and stops when it is not cut (`Edge.bareEnd`: the centers, or with a gap,
 *     off the nodes along the chord), asked only when no sample is outside both nodes; unset, the centers.
 * @returns The span; the lone curve between the bare ends, uncut, when no sample is outside both nodes, as
 *     the object path then draws it; or null when it draws the curve another way: a center outside its own node
 *     (the line then leaves from the center, `Edge.leaveNode`), or bare ends that meet, where `createBezierLine`
 *     draws a self-loop.
 */
export function curveSpan(
    src: Xyz,
    dst: Xyz,
    outsideSrc: (x: number, y: number, z: number) => boolean,
    outsideDst: (x: number, y: number, z: number) => boolean,
    path: {
        bow?: number | null;
        radius?: number | null;
        height?: number | null;
        globe?: boolean;
        straight?: boolean;
        loop?: readonly [number, number, number] | null;
        via?: readonly [number, number] | null;
        bends?: readonly number[] | null;
    } = {},
    bareEnds: (() => readonly [Xyz, Xyz]) | null = null,
): CurveSpan | null {
    const { straight = false } = path;
    const { shape, samples } = pathShape(src, dst, path);
    const flat: number[] = [];
    for (let i = 0; i <= samples; i++) {
        const p = pathSampleAt(src, dst, i, samples, shape);
        flat.push(p.x, p.y, p.z);
    }

    const span = routeOutside(flat, outsideSrc, outsideDst);
    if (span === null) {
        // a route no point of which clears both nodes is drawn as the lone curve between its bare ends, uncut
        // (`Edge.placeCurve`), a fanned arc's too; a straight line's as the straight line between them
        return straight ? straightSpan(src, dst, bareEnds?.() ?? null) : uncutSpan(src, dst, bareEnds?.() ?? null);
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
 * The span of the straight line drawn between a line's bare ends in place of a raised route that clears neither
 * node, as `Edge.transformEdgeMesh` draws it: a flat raised arc of one piece, cut at the two ends.
 * @param src - The source center.
 * @param dst - The target center.
 * @param bareEnds - The bare ends, both on the chord, or null for the centers.
 * @returns The span, or null when the ends are within 0.01 on every axis, where the line has no length to draw.
 */
function straightSpan(src: Xyz, dst: Xyz, bareEnds: readonly [Xyz, Xyz] | null): CurveSpan | null {
    const lone = uncutSpan(src, dst, bareEnds);
    if (lone === null) {
        return null;
    }

    const [from, to] = lone.ends ?? [0, 1];
    return { ...lone, samples: 1, first: 1, pieces: 1, startAt: from, endAt: 1 - to, height: 0, ends: null };
}

/**
 * The span of the lone curve drawn uncut between a line's bare ends, as `EdgeMesh.createBezierLine` draws it.
 * @param src - The source center.
 * @param dst - The target center.
 * @param bareEnds - The bare ends, both on the chord, or null for the centers.
 * @returns The span, or null when the ends are within 0.01 on every axis, where `createBezierLine` draws a self-loop.
 */
function uncutSpan(src: Xyz, dst: Xyz, bareEnds: readonly [Xyz, Xyz] | null): CurveSpan | null {
    const [from, to] = bareEnds ?? [src, dst];
    if (Math.abs(from.x - to.x) <= 0.01 && Math.abs(from.y - to.y) <= 0.01 && Math.abs(from.z - to.z) <= 0.01) {
        return null;
    }

    const chord = { x: dst.x - src.x, y: dst.y - src.y, z: dst.z - src.z };
    const square = chord.x * chord.x + chord.y * chord.y + chord.z * chord.z;
    const share = (p: Xyz): number =>
        ((p.x - src.x) * chord.x + (p.y - src.y) * chord.y + (p.z - src.z) * chord.z) / square;
    const ends: [number, number] = [share(from), share(to)];
    const moved = ends[0] !== 0 || ends[1] !== 1;
    const lone = curvePieces(from, to);
    return {
        samples: lone,
        first: 1,
        pieces: lone,
        startAt: 0,
        endAt: 0,
        bow: null,
        radius: null,
        turn: null,
        height: null,
        angle: null,
        ends: moved ? ends : null,
        loop: null,
        via: null,
        bends: null,
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
 * (samples, first, pieces, then {@link curveShape}'s third number) and `cut` is (startAt, endAt, then its first two).
 */
export const PULLED_CURVE_GLSL = `
uniform highp sampler2D edgeRoutes;

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

vec3 pulledRaisedSample(vec3 src, vec3 dst, float i, float samples, float height) {
    float t = i / samples;
    vec3 p = src + (dst - src) * t;
    p.z -= 4.0 * height * length(dst.xy - src.xy) * t * (1.0 - t);
    return p;
}

// sin of an angle within a half turn, from the Taylor series of its half
float pulledSin(float x) {
    vec2 h = pulledSinCos(x * 0.5);
    return 2.0 * h.x * h.y;
}

vec3 pulledGlobeSample(vec3 src, vec3 dst, float i, float samples, float height, float angle) {
    float t = i / samples;
    if (angle == 0.0 || i <= 0.0 || i >= samples) {
        return angle == 0.0 ? mix(src, dst, t) : (i <= 0.0 ? src : dst);
    }
    float ra = length(src);
    float rb = length(dst);
    float s = pulledSin(angle);
    float r = mix(ra, rb, t) + height * length(dst - src) * pulledSin(${Math.PI.toFixed(9)} * t);
    return (src * (pulledSin((1.0 - t) * angle) / s / ra) + dst * (pulledSin(t * angle) / s / rb)) * r;
}

// a self-loop's teardrop: the cubic from the center back to it whose controls stand k times their mean p turned a
// quarter either side of p
vec3 pulledLoopSample(vec3 center, float i, float samples, vec2 p, float k) {
    float t = i / samples;
    float u = 1.0 - t;
    vec2 q = vec2(-p.y, p.x) * k;
    return vec3(center.xy + (p + q) * (3.0 * u * u * t) + (p - q) * (3.0 * u * t * t), center.z);
}

// a curve through a support point: the quadratic through the point a share along the chord and across it, its z the
// chord's there, by de Casteljau
vec3 pulledViaSample(vec3 src, vec3 dst, float i, float samples, vec2 via) {
    vec2 d = dst.xy - src.xy;
    vec3 c = vec3(src.xy + via.x * d + via.y * vec2(-d.y, d.x), src.z + (dst.z - src.z) * via.x);
    float t = i / samples;
    vec3 near = src + (c - src) * t;
    return near + (c + (dst - c) * t - near) * t;
}

vec3 pulledCurveSample(vec3 src, vec3 dst, float i, float samples, vec4 cut, float angle) {
    if (cut.w > 6.9) {
        return pulledViaSample(src, dst, i, samples, vec2(cut.z, angle));
    }
    if (cut.w > 5.5) {
        return pulledLoopSample(src, i, samples, vec2(cut.z, angle), cut.w - 6.0);
    }
    if (cut.w > 4.5) {
        return pulledGlobeSample(src, dst, i, samples, cut.z, angle);
    }
    if (cut.w > 3.5) {
        return pulledRaisedSample(src, dst, i, samples, cut.z);
    }
    return cut.w > 0.5 ? pulledArcSample(src, dst, i, samples, cut.z) : pulledLoneSample(src, dst, i, samples);
}

vec3 pulledCurvePoint(vec3 src, vec3 dst, vec4 span, vec4 cut, int j) {
    if (cut.w > 7.5) {
        // a straight line through bends: its cut path's point j, read from the route table from texel cut.z
        int texel = int(cut.z + 0.5) + j;
        return texelFetch(edgeRoutes, ivec2(texel & 1023, texel >> 10), 0).xyz;
    }
    if (abs(cut.w - 3.0) < 0.5) {
        // the lone curve between two points of the chord, where a gap moves an uncut curve's ends
        vec3 start = mix(src, dst, cut.z);
        dst = mix(src, dst, span.w);
        src = start;
        cut = vec4(cut.xy, 0.0, 0.0);
    }
    float samples = span.x;
    float first = span.y;
    int pieces = int(span.z + 0.5);
    if (j <= 0) {
        vec3 a = pulledCurveSample(src, dst, first - 1.0, samples, cut, span.w);
        return a + (pulledCurveSample(src, dst, first, samples, cut, span.w) - a) * cut.x;
    }
    if (j >= pieces) {
        float outside = first + float(pieces) - 1.0;
        vec3 a = pulledCurveSample(src, dst, outside, samples, cut, span.w);
        return a + (pulledCurveSample(src, dst, outside - 1.0, samples, cut, span.w) - a) * cut.y;
    }
    return pulledCurveSample(src, dst, first + float(j) - 1.0, samples, cut, span.w);
}
`;
