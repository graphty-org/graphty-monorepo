/**
 * @file Where a straight edge's ends fall, twice over: `EDGE_TRIM_GLSL`, the text the line and cap
 * shaders will take in, and `trimEnds`, its TypeScript mirror for whatever reads an end on the CPU.
 * Design: `design/rendering/row-renderer.md`, section 4.3.
 *
 * `Edge.getInterceptPoints` answers from `trimEnds` once a batch draws either end, and no shader takes
 * in the include yet. Both follow its order. Each end first meets its node's surface, then both move
 * out past their borders and gaps, a group's end replaces either, and the line stops short of the
 * arrow head.
 *
 * Plain numbers and strings, nothing from Babylon.js, as `edgeJoinShader.ts` is.
 */

import { surfaceReach, type Xyz } from "./edgeRoute";
import type { Point2 } from "./shapeOutlines";

/** {@link TrimEnd.measured} of an end {@link surfaceReach} works out. */
export const TRIM_CLOSED = -1;

/** {@link TrimEnd.measured} of an end no closed form reaches and no ray has met. */
export const TRIM_NO_HIT = -2;

/** One end of an edge: what is known of the node there. */
export interface TrimEnd {
    /** The node's radius when it is round, else null. */
    radius: number | null;
    /** The node's half extents. */
    half: Xyz;
    /** What {@link surfaceReach} takes as `flat`; the shader knows only true, the ellipse. */
    flat: boolean | readonly Point2[];
    /** How far the node's border reaches past its surface. */
    border: number;
    /** The edge's gap at this end. */
    gap: number;
    /** How far from the node's center a ray met its surface, else {@link TRIM_CLOSED} or {@link TRIM_NO_HIT}. */
    measured: number;
    /** Whether the line leaves the node at its box, its border included: a glyph's, or a shape with no body. */
    leaves: boolean;
    /** Whether the node is drawn behind every edge (a group region), so the line leaves its outline across the view. */
    group: boolean;
}

/** What an edge's two ends are worked out from. */
export interface EdgeTrimInput {
    /** The source node's center. */
    src: Xyz;
    /** The target node's center. */
    dst: Xyz;
    /** The source end. */
    source: TrimEnd;
    /** The target end. */
    target: TrimEnd;
    /** How far short of the target end, after {@link EdgeTrimInput.capGap}, the line stops for its arrow head. */
    capBack: number;
    /** The gap before the arrow head, taken off first, as `Edge.lineEndBefore` takes it; 0 when left out. */
    capGap?: number;
}

/** The answer, as `Edge.getInterceptPoints` gives it: null where a line has no end. */
export interface TrimmedEnds {
    /** Where the line leaves the source. */
    src: Xyz | null;
    /** Where the line meets the target. */
    dst: Xyz | null;
    /** Where the line stops, before the arrow head. */
    lineEnd: Xyz | null;
}

/**
 * A point along a direction.
 * @param from - The start.
 * @param dir - The direction.
 * @param distance - How far.
 * @returns The point.
 */
function along(from: Xyz, dir: Xyz, distance: number): Xyz {
    return { x: from.x + dir.x * distance, y: from.y + dir.y * distance, z: from.z + dir.z * distance };
}

/**
 * Where a line leaves a node that is not one of two round ones.
 * @param centre - The node's center.
 * @param dir - The unit direction toward the other node.
 * @param end - The end.
 * @param span - The distance between the two centers.
 * @returns The point, or null when the line never met the surface.
 */
function surfaceEnd(centre: Xyz, dir: Xyz, end: TrimEnd, span: number): Xyz | null {
    if (end.measured === TRIM_NO_HIT) {
        return null;
    }

    if (end.measured >= 0) {
        return along(centre, dir, end.measured);
    }

    const reach = surfaceReach(dir, end.half, end.radius, end.flat);
    return along(centre, dir, end.leaves ? Math.min(reach + end.border, span) : reach);
}

/**
 * Move both ends out past their borders and gaps, unless that would cross them.
 * @param src - The source end.
 * @param dst - The target end.
 * @param srcReach - How far to move it.
 * @param dstReach - How far to move it.
 * @returns The two ends.
 */
function pastBorders(src: Xyz, dst: Xyz, srcReach: number, dstReach: number): [Xyz, Xyz] {
    const [dx, dy, dz] = [dst.x - src.x, dst.y - src.y, dst.z - src.z];
    const span = Math.sqrt(dx * dx + dy * dy + dz * dz); // NOSONAR(S7769): per edge, per frame, as in Edge.getInterceptPoints
    if ((srcReach === 0 && dstReach === 0) || span <= srcReach + dstReach) {
        return [src, dst];
    }

    // scaled by the reciprocal, as `Edge.pastBorders` does
    const dir = scaled(dx, dy, dz, 1 / span);
    return [along(src, dir, srcReach), along(dst, dir, -dstReach)];
}

/**
 * A vector times a number.
 * @param x - Its x.
 * @param y - Its y.
 * @param z - Its z.
 * @param by - The number.
 * @returns The vector.
 */
function scaled(x: number, y: number, z: number, by: number): Xyz {
    return { x: x * by, y: y * by, z: z * by };
}

/**
 * Where a line leaves a group: through its outline across the view, its depth carried along.
 * @param centre - The group's center.
 * @param toward - The other end's center.
 * @param end - The end.
 * @returns The point.
 */
function groupEnd(centre: Xyz, toward: Xyz, end: TrimEnd): Xyz {
    const [dx, dy] = [toward.x - centre.x, toward.y - centre.y];
    const across = Math.hypot(dx, dy);
    if (across === 0) {
        return centre;
    }

    const dir = { x: dx / across, y: dy / across, z: 0 };
    const reached = Math.min(surfaceReach(dir, end.half, end.radius, end.flat) + end.border, across);
    return {
        x: centre.x + dir.x * reached,
        y: centre.y + dir.y * reached,
        z: centre.z + ((toward.z - centre.z) * reached) / across,
    };
}

/**
 * Where a straight edge's ends fall: the mirror of {@link EDGE_TRIM_GLSL}, and of
 * `Edge.getInterceptPoints`.
 * @param edge - The edge.
 * @returns The ends.
 */
export function trimEnds(edge: EdgeTrimInput): TrimmedEnds {
    const { src, dst, source, target, capBack, capGap = 0 } = edge;
    const [dx, dy, dz] = [dst.x - src.x, dst.y - src.y, dst.z - src.z];
    const span = Math.sqrt(dx * dx + dy * dy + dz * dz); // NOSONAR(S7769): per edge, per frame, as in Edge.getInterceptPoints
    const dir = span > 0 ? { x: dx / span, y: dy / span, z: dz / span } : { x: 0, y: 0, z: 0 };
    const back = { x: -dir.x, y: -dir.y, z: -dir.z };

    let start: Xyz | null = null;
    let end: Xyz | null = null;
    if (source.radius !== null && target.radius !== null) {
        // two nodes closer than their own surfaces have no line between them
        if (span > source.radius + target.radius) {
            start = along(src, dir, source.radius);
            end = along(dst, back, target.radius);
        }
    } else if (span > 0) {
        start = surfaceEnd(src, dir, source, span);
        end = surfaceEnd(dst, back, target, span);
        // two overlapping nodes meet the line in the wrong order: they have no line between them either
        if (
            start !== null &&
            end !== null &&
            (end.x - start.x) * dir.x + (end.y - start.y) * dir.y + (end.z - start.z) * dir.z <= 0
        ) {
            start = null;
            end = null;
        }
    }

    if (start !== null && end !== null) {
        [start, end] = pastBorders(start, end, source.border + source.gap, target.border + target.gap);
    }

    start = source.group ? groupEnd(src, dst, source) : start;
    end = target.group ? groupEnd(dst, src, target) : end;
    if (start === null || end === null) {
        return { src: start, dst: end, lineEnd: null };
    }

    const [lx, ly, lz] = [end.x - start.x, end.y - start.y, end.z - start.z];
    const length = Math.sqrt(lx * lx + ly * ly + lz * lz); // NOSONAR(S7769): per edge, per frame, as in Edge.getInterceptPoints
    // scaled by the reciprocal and taken off in two steps, as `Edge.lineEndBefore` does with Babylon's `normalize`
    const unit = length > 0 ? scaled(lx, ly, lz, 1 / length) : { x: 0, y: 0, z: 0 };
    return { src: start, dst: end, lineEnd: along(along(end, unit, -capGap), unit, -capBack) };
}

/**
 * The same, in GLSL ES 3.00, for a shader to take in by interpolation, as `edgeJoinShader.ts` is
 * taken in. A null radius is negative; `ellipse`, `leaves` and `group` are 0 or 1. A polygon's
 * outline is not here: its end comes by `measured`, and a group of that shape stays on the CPU. Its `capBack` is
 * {@link EdgeTrimInput.capGap} and {@link EdgeTrimInput.capBack} together.
 */
export const EDGE_TRIM_GLSL = /* glsl */ `
const float EDGE_TRIM_NO_HIT = ${TRIM_NO_HIT.toFixed(1)};

struct EdgeTrimEnd {
    float radius;
    vec3 halfSize;
    float ellipse;
    float border;
    float gap;
    float measured;
    float leaves;
    float group;
};

struct EdgeTrimmed {
    vec3 src;
    vec3 dst;
    vec3 lineEnd;
    bool hasSrc;
    bool hasDst;
};

float edgeTrimLength(vec3 v) {
    return sqrt(dot(v, v));
}

float edgeTrimReach(vec3 dir, EdgeTrimEnd end) {
    if (end.radius >= 0.0) {
        return end.radius;
    }

    if (end.ellipse > 0.5 && end.halfSize.x > 0.0 && end.halfSize.y > 0.0 && (dir.x != 0.0 || dir.y != 0.0)) {
        return 1.0 / length(dir.xy / end.halfSize.xy);
    }

    vec3 size = abs(dir);
    float reach = 3.0e38;
    if (size.x > 0.0) reach = min(reach, end.halfSize.x / size.x);
    if (size.y > 0.0) reach = min(reach, end.halfSize.y / size.y);
    if (size.z > 0.0) reach = min(reach, end.halfSize.z / size.z);
    return reach < 3.0e38 ? reach : 0.0;
}

bool edgeTrimSurface(vec3 centre, vec3 dir, EdgeTrimEnd end, float span, out vec3 point) {
    if (end.measured == EDGE_TRIM_NO_HIT) {
        return false;
    }

    float reach = edgeTrimReach(dir, end);
    if (end.measured >= 0.0) {
        reach = end.measured;
    } else if (end.leaves > 0.5) {
        reach = min(reach + end.border, span);
    }

    point = centre + dir * reach;
    return true;
}

vec3 edgeTrimGroupEnd(vec3 centre, vec3 toward, EdgeTrimEnd end) {
    vec2 flatLine = toward.xy - centre.xy;
    float across = length(flatLine);
    if (across == 0.0) {
        return centre;
    }

    vec3 dir = vec3(flatLine / across, 0.0);
    float reached = min(edgeTrimReach(dir, end) + end.border, across);
    return vec3(centre.xy + dir.xy * reached, centre.z + (toward.z - centre.z) * reached / across);
}

EdgeTrimmed edgeTrimEnds(vec3 src, vec3 dst, EdgeTrimEnd source, EdgeTrimEnd target, float capBack) {
    EdgeTrimmed ends;
    ends.src = vec3(0.0);
    ends.dst = vec3(0.0);
    ends.lineEnd = vec3(0.0);
    ends.hasSrc = false;
    ends.hasDst = false;

    float span = edgeTrimLength(dst - src);
    vec3 dir = span > 0.0 ? (dst - src) / span : vec3(0.0);
    if (source.radius >= 0.0 && target.radius >= 0.0) {
        if (span > source.radius + target.radius) {
            ends.src = src + dir * source.radius;
            ends.dst = dst - dir * target.radius;
            ends.hasSrc = true;
            ends.hasDst = true;
        }
    } else if (span > 0.0) {
        ends.hasSrc = edgeTrimSurface(src, dir, source, span, ends.src);
        ends.hasDst = edgeTrimSurface(dst, -dir, target, span, ends.dst);
        if (ends.hasSrc && ends.hasDst && dot(ends.dst - ends.src, dir) <= 0.0) {
            ends.hasSrc = false;
            ends.hasDst = false;
        }
    }

    if (ends.hasSrc && ends.hasDst) {
        float srcReach = source.border + source.gap;
        float dstReach = target.border + target.gap;
        float between = edgeTrimLength(ends.dst - ends.src);
        if ((srcReach != 0.0 || dstReach != 0.0) && between > srcReach + dstReach) {
            vec3 line = (ends.dst - ends.src) / between;
            ends.src += line * srcReach;
            ends.dst -= line * dstReach;
        }
    }

    if (source.group > 0.5) {
        ends.src = edgeTrimGroupEnd(src, dst, source);
        ends.hasSrc = true;
    }

    if (target.group > 0.5) {
        ends.dst = edgeTrimGroupEnd(dst, src, target);
        ends.hasDst = true;
    }

    if (ends.hasSrc && ends.hasDst) {
        float lineLength = edgeTrimLength(ends.dst - ends.src);
        vec3 unit = lineLength > 0.0 ? (ends.dst - ends.src) / lineLength : vec3(0.0);
        ends.lineEnd = ends.dst - unit * capBack;
    }

    return ends;
}
`;
