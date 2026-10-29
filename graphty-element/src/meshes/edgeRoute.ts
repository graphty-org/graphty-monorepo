/**
 * @file The geometry of an edge drawn through bends (`line.bends`): reading the value, placing the
 * bends between the two node centers, rounding the corners of a curved route, and where a segment
 * leaves a node's surface.
 *
 * Plain numbers, nothing from Babylon.js, so it runs in Node.
 */

/** A point or a direction. */
export interface Xyz {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

/** How many points each rounded corner is drawn with, its two ends included. */
const CORNER_STEPS = 6;

/** How much of the shorter of a corner's two segments the rounding takes, at most. */
const CORNER_CUT = 0.25;

/**
 * Read a `line.bends` value: `along,across` pairs separated by white space.
 * @param text - The value.
 * @returns The pairs, flat (`along0, across0, along1, ...`), or null when the value is absent,
 *     empty, or holds anything that is not a pair of finite numbers.
 */
export function parseBends(text: string | undefined): number[] | null {
    const parts = text?.trim().split(/\s+/) ?? [];
    if (parts.length === 0 || parts[0] === "") {
        return null;
    }

    const out: number[] = [];
    for (const part of parts) {
        const pair = part.split(",");
        const along = Number(pair[0]);
        const across = Number(pair[1]);
        if (
            pair.length !== 2 ||
            pair[0] === "" ||
            pair[1] === "" ||
            !Number.isFinite(along) ||
            !Number.isFinite(across)
        ) {
            return null;
        }

        out.push(along, across);
    }

    return out;
}

/**
 * Where the bends are, between two node centers: `along` of the way from the source center to the
 * target's, `across` of the same length to the left of that line in the x-y plane.
 * @param src - The source node's center.
 * @param dst - The target node's center.
 * @param bends - The pairs, as {@link parseBends} reads them.
 * @returns The points, flat x, y, z.
 */
export function bendPoints(src: Xyz, dst: Xyz, bends: readonly number[]): number[] {
    const dx = dst.x - src.x;
    const dy = dst.y - src.y;
    const dz = dst.z - src.z;
    const out: number[] = [];
    for (let i = 0; i + 1 < bends.length; i += 2) {
        const along = bends[i];
        const across = bends[i + 1];
        out.push(src.x + along * dx - across * dy, src.y + along * dy + across * dx, src.z + along * dz);
    }

    return out;
}

/**
 * Read a port value (`line.sourcePort`, `line.targetPort`): one `x,y` pair.
 * @param text - The value.
 * @returns The pair, or null when the value is absent or not one pair of finite numbers.
 */
export function parsePort(text: string | undefined): [number, number] | null {
    const pair = parseBends(text);
    return pair?.length === 2 ? [pair[0], pair[1]] : null;
}

/**
 * The route a file stored for an edge, from one end to the other: from its source port (the source
 * node's center without one) through its bends to its target port (the target's center without
 * one). A port, and a self-loop's bends, are `x,y` fractions of the node's half extents from its
 * center; any other edge's bends are placed between the two centers ({@link bendPoints}).
 * @param src - The source node's center.
 * @param dst - The target node's center.
 * @param route - What the file stored.
 * @param route.bends - The bends, as {@link parseBends} reads them, or null.
 * @param route.srcPort - The source port, or null.
 * @param route.dstPort - The target port, or null.
 * @param route.loop - Whether the edge is a self-loop, whose bends are placed around its node.
 * @param srcHalf - The source node's half extents.
 * @param dstHalf - The target node's half extents.
 * @returns The points, flat x, y, z, both ends included.
 */
export function fileRoute(
    src: Xyz,
    dst: Xyz,
    route: {
        readonly bends: readonly number[] | null;
        readonly srcPort: readonly number[] | null;
        readonly dstPort: readonly number[] | null;
        readonly loop: boolean;
    },
    srcHalf: Xyz,
    dstHalf: Xyz,
): number[] {
    const around = (c: Xyz, half: Xyz, pairs: readonly number[]): number[] => {
        const out: number[] = [];
        for (let i = 0; i + 1 < pairs.length; i += 2) {
            out.push(c.x + pairs[i] * half.x, c.y + pairs[i + 1] * half.y, c.z);
        }

        return out;
    };
    let mid: number[] = [];
    if (route.bends !== null) {
        mid = route.loop ? around(src, srcHalf, route.bends) : bendPoints(src, dst, route.bends);
    }

    return [
        ...(route.srcPort ? around(src, srcHalf, route.srcPort) : [src.x, src.y, src.z]),
        ...mid,
        ...(route.dstPort ? around(dst, dstHalf, route.dstPort) : [dst.x, dst.y, dst.z]),
    ];
}

/**
 * A route's inner points without those an end cap covers: each point nearer an end than that end's
 * reach is dropped, so the cap points along the stretch of route it lies over, not along a stub. A
 * route laid round a node of another shape than the one drawn (Graphviz's spline, which ends on the
 * outline Graphviz was handed) can leave its last point a hair outside the drawn node, and the stub
 * from there to the outline points the cap anywhere.
 * @param mid - The inner points, flat x, y, z, from the start.
 * @param start - Where the line starts.
 * @param end - Where the line ends.
 * @param reach - How near each end a point may not lie: 0 for an end without a cap.
 * @param reach.start - At the start.
 * @param reach.end - At the end.
 * @returns The points kept, flat.
 */
export function clearOfCaps(
    mid: readonly number[],
    start: Xyz,
    end: Xyz,
    reach: { readonly start: number; readonly end: number },
): number[] {
    const n = mid.length / 3;
    const near = (i: number, to: Xyz, limit: number): boolean =>
        Math.hypot(mid[3 * i] - to.x, mid[3 * i + 1] - to.y, mid[3 * i + 2] - to.z) < limit;
    let first = 0;
    while (first < n && near(first, start, reach.start)) {
        first++;
    }

    let last = n - 1;
    while (last >= first && near(last, end, reach.end)) {
        last--;
    }

    return mid.slice(3 * first, 3 * (last + 1));
}

/**
 * Which part of a stored route is drawn: from its first point outside the source node to its last
 * outside the target -- what a tool draws when it clips a line at the outlines -- except that an end
 * at a port is drawn from the port itself, wherever it lies.
 * @param flat - The route, flat x, y, z, from {@link fileRoute}.
 * @param ports - Whether the route starts and ends at a port.
 * @param ports.src - Whether it starts at a source port.
 * @param ports.dst - Whether it ends at a target port.
 * @param outsideSrc - Whether a point is outside the source node.
 * @param outsideDst - Whether a point is outside the target node.
 * @returns The indices of the first and last points drawn through, or null when no point is outside.
 */
export function routeEnds(
    flat: readonly number[],
    ports: { readonly src: boolean; readonly dst: boolean },
    outsideSrc: (x: number, y: number, z: number) => boolean,
    outsideDst: (x: number, y: number, z: number) => boolean,
): { first: number; last: number } | null {
    const n = flat.length / 3;
    const at = (test: typeof outsideSrc, i: number): boolean => test(flat[3 * i], flat[3 * i + 1], flat[3 * i + 2]);
    let first = 0;
    while (!ports.src && first < n && !at(outsideSrc, first)) {
        first++;
    }

    let last = n - 1;
    while (!ports.dst && last >= first && !at(outsideDst, last)) {
        last--;
    }

    return first < n && last >= first ? { first, last } : null;
}

/**
 * A polyline with every interior corner rounded: each corner is replaced by a quadratic curve
 * from a quarter of the way along the shorter of its two segments, on each side, through the
 * corner's pull.
 * @param flat - The polyline, flat x, y, z, ends included.
 * @returns The rounded polyline, the same ends.
 */
export function roundCorners(flat: readonly number[]): number[] {
    const n = flat.length / 3;
    if (n < 3) {
        return [...flat];
    }

    const out = [flat[0], flat[1], flat[2]];
    for (let i = 1; i < n - 1; i++) {
        const p = i * 3;
        const before = Math.hypot(flat[p] - flat[p - 3], flat[p + 1] - flat[p - 2], flat[p + 2] - flat[p - 1]);
        const after = Math.hypot(flat[p + 3] - flat[p], flat[p + 4] - flat[p + 1], flat[p + 5] - flat[p + 2]);
        const cut = CORNER_CUT * Math.min(before, after);
        const a = before > 0 ? cut / before : 0;
        const b = after > 0 ? cut / after : 0;
        for (let s = 0; s < CORNER_STEPS; s++) {
            const t = s / (CORNER_STEPS - 1);
            for (let k = 0; k < 3; k++) {
                const from = flat[p + k] + (flat[p - 3 + k] - flat[p + k]) * a;
                const to = flat[p + k] + (flat[p + 3 + k] - flat[p + k]) * b;
                out.push((1 - t) * (1 - t) * from + 2 * (1 - t) * t * flat[p + k] + t * t * to);
            }
        }
    }

    out.push(flat.at(-3) ?? 0, flat.at(-2) ?? 0, flat.at(-1) ?? 0);

    return out;
}

/**
 * How far each piece of a curve through midpoints is pulled toward its bend: `4 (sqrt 2 - 1) / 3`, the pull that
 * draws a quarter of an ellipse round a right-angled corner.
 */
const MIDPOINT_PULL = (4 * (Math.SQRT2 - 1)) / 3;

/** How many points each piece of a curve through midpoints is drawn with, its start included. */
const MIDPOINT_STEPS = 12;

/**
 * A polyline drawn as one smooth curve that uses its interior points as control points rather than passing
 * through them (`line.bendCurve` "midpoints"): one cubic piece from each end, or from the middle of a segment
 * between two bends, to the next, each of its two controls pulled from its own end toward the bend between them by
 * {@link MIDPOINT_PULL}. It leaves each end along its first and last segments. Cytoscape desktop draws a curved
 * edge through its handles this way (`GraphGraphics.computeCubicPolyEdgePath`).
 * @param flat - The polyline, flat x, y, z, ends included.
 * @returns The curve, the same ends.
 */
export function curveThroughMidpoints(flat: readonly number[]): number[] {
    const n = flat.length / 3;
    if (n < 3) {
        return [...flat];
    }

    const at = (i: number, k: number): number => flat[3 * i + k];
    // the pieces' ends: the polyline's ends and the middle of each segment between two bends
    const knot = (j: number, k: number): number => {
        if (j === 0 || j === n - 2) {
            return at(j === 0 ? 0 : n - 1, k);
        }

        return (at(j, k) + at(j + 1, k)) / 2;
    };
    const out = [flat[0], flat[1], flat[2]];
    for (let j = 0; j < n - 2; j++) {
        for (let s = 1; s <= MIDPOINT_STEPS; s++) {
            const t = s / MIDPOINT_STEPS;
            const u = 1 - t;
            for (let k = 0; k < 3; k++) {
                const from = knot(j, k);
                const to = knot(j + 1, k);
                const bend = at(j + 1, k);
                const c1 = from + (bend - from) * MIDPOINT_PULL;
                const c2 = to + (bend - to) * MIDPOINT_PULL;
                out.push(u * u * u * from + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * to);
            }
        }
    }

    return out;
}

/** How many pieces a curve through its control points (`line.bendCurve` "bezier") is drawn with. */
const BEZIER_STEPS = 24;

/**
 * A polyline drawn as one Bezier curve whose control points are its interior points (`line.bendCurve` "bezier"):
 * one bend draws a quadratic curve, two a cubic, more a curve of higher degree, leaving each end toward the bend
 * next to it. vis-network draws its smooth edges this way (`quadraticCurveTo`, `bezierCurveTo`).
 * @param flat - The polyline, flat x, y, z, ends included.
 * @returns The curve, the same ends.
 */
export function bezierThroughControls(flat: readonly number[]): number[] {
    const n = flat.length / 3;
    if (n < 3) {
        return [...flat];
    }

    const out: number[] = [];
    const work = new Array<number>(flat.length);
    for (let s = 0; s <= BEZIER_STEPS; s++) {
        const t = s / BEZIER_STEPS;
        for (let i = 0; i < flat.length; i++) {
            work[i] = flat[i];
        }
        // de Casteljau: n - 1 rounds of interpolating neighbors
        for (let r = n - 1; r > 0; r--) {
            for (let i = 0; i < r; i++) {
                for (let k = 0; k < 3; k++) {
                    work[3 * i + k] += (work[3 * (i + 1) + k] - work[3 * i + k]) * t;
                }
            }
        }
        out.push(work[0], work[1], work[2]);
    }

    return out;
}

/**
 * How far from a node's center a segment leaving it in a direction crosses its surface: its
 * radius when it is round, where the ray leaves the ellipse filling its box across the view when
 * it is a flat ellipse, else where the ray leaves its box.
 * @param dir - The unit direction.
 * @param half - The node's half extents.
 * @param radius - The node's radius when it is round, else null.
 * @param elliptic - Whether the node is drawn as a flat ellipse (`ellipse`), whose box corners are empty.
 * @returns The distance.
 */
export function surfaceReach(dir: Xyz, half: Xyz, radius: number | null, elliptic = false): number {
    if (radius !== null) {
        return radius;
    }

    if (elliptic && half.x > 0 && half.y > 0 && (dir.x !== 0 || dir.y !== 0)) {
        // ponytail: across the view only; a flat ellipse has no depth for a segment to leave through
        return 1 / Math.hypot(dir.x / half.x, dir.y / half.y);
    }

    const reach = Math.min(
        dir.x === 0 ? Infinity : half.x / Math.abs(dir.x),
        dir.y === 0 ? Infinity : half.y / Math.abs(dir.y),
        dir.z === 0 ? Infinity : half.z / Math.abs(dir.z),
    );

    return Number.isFinite(reach) ? reach : 0;
}

/** The fewest pieces a lifted route is drawn with, so its arc reads as a curve. */
const LIFT_PIECES = 16;

/**
 * A route lifted out of its layout plane (`edge.lift`): resampled into at least
 * {@link LIFT_PIECES} pieces, spread over its segments by length, each point raised along +z by
 * `lift * sin(pi * s)`, where `s` is how far along the route it is by length. The ends stay where
 * they are, so the route still leaves and meets its nodes, and the highest point is `lift` above
 * the middle of the route.
 * @param flat - The route, flat x, y, z, ends included.
 * @param lift - How far the middle rises, in world units; 0 returns the route as it is.
 * @returns The lifted route.
 */
export function liftRoute(flat: readonly number[], lift: number): number[] {
    const n = flat.length / 3;
    if (lift === 0 || n < 2 || !Number.isFinite(lift)) {
        return [...flat];
    }

    const lengths: number[] = [];
    let total = 0;
    for (let i = 0; i + 1 < n; i++) {
        const p = i * 3;
        const length = Math.hypot(flat[p + 3] - flat[p], flat[p + 4] - flat[p + 1], flat[p + 5] - flat[p + 2]);
        lengths.push(length);
        total += length;
    }

    if (total === 0) {
        return [...flat];
    }

    const out = [flat[0], flat[1], flat[2]];
    let walked = 0;
    for (let i = 0; i + 1 < n; i++) {
        const p = i * 3;
        const steps = Math.max(1, Math.round((LIFT_PIECES * lengths[i]) / total));
        for (let s = 1; s <= steps; s++) {
            const f = s / steps;
            const along = (walked + f * lengths[i]) / total;
            out.push(
                flat[p] + (flat[p + 3] - flat[p]) * f,
                flat[p + 1] + (flat[p + 4] - flat[p + 1]) * f,
                flat[p + 2] + (flat[p + 5] - flat[p + 2]) * f + lift * Math.sin(Math.PI * along),
            );
        }

        walked += lengths[i];
    }

    // The last point is the route's own end, raised by sin(pi) = 0 up to rounding: put it back exactly.
    out.splice(-3, 3, ...flat.slice(-3));
    return out;
}

/**
 * The points of a route strictly between its ends that lie outside both end nodes' reach, so a
 * route trimmed at the node surfaces never doubles back inside a node.
 * @param flat - The route, flat x, y, z, ends (the node centers) included.
 * @param srcReach - How far from the source center its surface lies.
 * @param dstReach - The same for the target.
 * @returns The interior points kept, flat.
 */
export function interiorOutside(flat: readonly number[], srcReach: number, dstReach: number): number[] {
    const n = flat.length / 3;
    const out: number[] = [];
    const last = (n - 1) * 3;
    for (let i = 1; i < n - 1; i++) {
        const p = i * 3;
        const fromSrc = Math.hypot(flat[p] - flat[0], flat[p + 1] - flat[1], flat[p + 2] - flat[2]);
        const fromDst = Math.hypot(flat[p] - flat[last], flat[p + 1] - flat[last + 1], flat[p + 2] - flat[last + 2]);
        if (fromSrc > srcReach && fromDst > dstReach) {
            out.push(flat[p], flat[p + 1], flat[p + 2]);
        }
    }

    return out;
}

/** How many pieces a self-loop's teardrop, and the most a fanned edge's arc, is drawn with. */
const BUNDLE_STEPS = 24;

/**
 * The most a fanned arc turns per piece, on average: 7.5 degrees, 48 pieces to a full circle, the
 * resolution a circle is commonly drawn at. Every piece is one instance the line shader draws, so
 * an arc drawn with a fixed 24 pieces multiplied a bundled edge's cost by 24 whatever it bent: a
 * benchmark of 1000 edges between 20 nodes (bundles of about five) drew 23,600 pieces where it
 * had drawn 1000 straight lines, and fell from 55 frames a second to 5 on a software rasterizer.
 * At this resolution a piece's middle strays from the true curve by under 2% of its length.
 */
const ARC_TURN_PER_PIECE = Math.PI / 24;

/**
 * A curved edge drawn as an arc of the circle through both node centers (`line.arcRadius`), bowing to the left of
 * the direction from the source to the target in the x-y plane, the shorter way round, as Gephi draws a curved
 * edge (`EdgeRenderer.CurvedEdgeRenderer`: radius the center distance over its arc curveness). z runs straight
 * from one end to the other.
 * @param src - The source node's center.
 * @param dst - The target node's center.
 * @param radius - The circle's radius as a multiple of the distance between the centers in the x-y plane, at
 *     least 0.5 (a half circle).
 * @returns The arc, flat x, y, z, both ends included; the straight line when the centers meet in the x-y plane.
 */
export function centerArc(src: Xyz, dst: Xyz, radius: number): number[] {
    const dx = dst.x - src.x;
    const dy = dst.y - src.y;
    const chord = Math.hypot(dx, dy);
    if (chord < 1e-9) {
        return [src.x, src.y, src.z, dst.x, dst.y, dst.z];
    }

    const r = Math.max(radius, 0.5) * chord;
    // the circle's center is to the right of the chord's middle, so the arc bows to its left
    const back = Math.sqrt(Math.max(0, r * r - (chord / 2) ** 2));
    const cx = (src.x + dst.x) / 2 + (dy / chord) * back;
    const cy = (src.y + dst.y) / 2 - (dx / chord) * back;
    const from = Math.atan2(src.y - cy, src.x - cx);
    let turn = Math.atan2(dst.y - cy, dst.x - cx) - from;
    turn -= 2 * Math.PI * Math.round(turn / (2 * Math.PI));
    const pieces = Math.min(BUNDLE_STEPS, Math.max(2, Math.ceil(Math.abs(turn) / ARC_TURN_PER_PIECE - 1e-9)));
    const out: number[] = [];
    for (let i = 0; i <= pieces; i++) {
        const t = i / pieces;
        const a = from + turn * t;
        out.push(cx + r * Math.cos(a), cy + r * Math.sin(a), src.z + (dst.z - src.z) * t);
    }

    out.splice(0, 3, src.x, src.y, src.z);
    out.splice(-3, 3, dst.x, dst.y, dst.z);
    return out;
}

/**
 * A route through one bend drawn as an arc of the circle through its start, the bend and its end (`line.bendCurve`
 * "arc"), the bend on the arc between the ends, as yEd draws an arc edge through its one bend (`y:ArcEdge`, whose
 * bend yEd saves at the arc's apex, `y:Arc height` from the line between the ends). Drawn in the x-y plane; z runs
 * straight from one end to the other.
 * @param flat - The route, flat x, y, z: its start, the bend, its end.
 * @returns The arc, flat x, y, z, both ends included; null with another number of points, or when the three are
 *     on one line.
 */
export function arcThroughBend(flat: readonly number[]): number[] | null {
    if (flat.length !== 9) {
        return null;
    }

    const [ax, ay, az, bx, by, , cx, cy, cz] = flat;
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const span = Math.hypot(cx - ax, cy - ay);
    if (Math.abs(d) < 1e-9 * Math.max(span * span, 1e-18)) {
        return null;
    }

    const sq = (x: number, y: number): number => x * x + y * y;
    const ox = (sq(ax, ay) * (by - cy) + sq(bx, by) * (cy - ay) + sq(cx, cy) * (ay - by)) / d;
    const oy = (sq(ax, ay) * (cx - bx) + sq(bx, by) * (ax - cx) + sq(cx, cy) * (bx - ax)) / d;
    const r = Math.hypot(ax - ox, ay - oy);
    const from = Math.atan2(ay - oy, ax - ox);
    const around = (x: number, y: number): number => {
        const a = Math.atan2(y - oy, x - ox) - from;
        return a - 2 * Math.PI * Math.floor(a / (2 * Math.PI));
    };
    // the way round from the start that meets the bend before the end
    const toEnd = around(cx, cy);
    const turn = around(bx, by) < toEnd ? toEnd : toEnd - 2 * Math.PI;
    const pieces = Math.min(2 * BUNDLE_STEPS, Math.max(2, Math.ceil(Math.abs(turn) / ARC_TURN_PER_PIECE - 1e-9)));
    const out: number[] = [];
    for (let i = 0; i <= pieces; i++) {
        const t = i / pieces;
        out.push(ox + r * Math.cos(from + turn * t), oy + r * Math.sin(from + turn * t), az + (cz - az) * t);
    }

    out.splice(0, 3, ax, ay, az);
    out.splice(-3, 3, cx, cy, cz);
    return out;
}

/**
 * How many pieces a fanned edge's arc is drawn with: enough that no piece turns more, on average,
 * than {@link ARC_TURN_PER_PIECE}, and at least two, so the arc's bowed middle is one of its points.
 * @param chord - The distance from the arc's start to its end.
 * @param offset - How far the arc's middle bows from that line.
 * @returns The piece count, 2 to {@link BUNDLE_STEPS}.
 */
export function fanArcPieces(chord: number, offset: number): number {
    // A quadratic curve's tangents at its ends point at its control point, which sits twice the
    // bow from the chord's middle, so each end turns atan(4 * bow / chord) off the chord.
    const turn = 2 * Math.atan2(4 * Math.abs(offset), chord);
    return Math.min(BUNDLE_STEPS, Math.max(2, Math.ceil(turn / ARC_TURN_PER_PIECE - 1e-9)));
}

/**
 * How far one fanned edge sits from the next at its middle, in node radii (the larger endpoint's).
 * Cytoscape.js spaces bundled edges 40 px apart around 30 px nodes, about 2.7 radii; a little
 * under that keeps a wide bundle between two close nodes readable.
 */
const FAN_STEP_RADII = 2;

/** The most a bundle may spread at its middle, as a fraction of the distance between the nodes. */
const FAN_SPREAD_MAX = 1.2;

/** How far a self-loop reaches past its node's surface, in the node's radii there. */
const LOOP_EXTENT_RADII = 1.5;

/**
 * Where a curved edge sits in its bundle's fan, in steps to the left of the bundle's first edge's
 * direction (negative is to the right). Only curved edges fan; a straight edge stays on the line
 * between the nodes, so its slot is 0.
 *
 * With no straight edge in the bundle, or only one in its middle, the edges spread evenly either
 * side of the line, in bundle order (as Cytoscape.js fans `bezier` edges). Otherwise the line is
 * taken, and the curved edges alternate sides outward from it, first to the right (as Cytoscape
 * desktop fans the edges after the first).
 * @param curved - Whether each edge of the bundle is curved, in bundle order.
 * @param rank - The edge's place in the bundle, from zero.
 * @returns The slot.
 */
export function fanSlot(curved: readonly boolean[], rank: number): number {
    if (!curved[rank]) {
        return 0;
    }

    const n = curved.length;
    const straight = curved.filter((c) => !c).length;
    if (straight === 0 || (straight === 1 && n % 2 === 1 && !curved[(n - 1) / 2])) {
        return rank - (n - 1) / 2;
    }

    const k = curved.slice(0, rank).filter(Boolean).length;
    return (Math.floor(k / 2) + 1) * (k % 2 === 0 ? -1 : 1);
}

/**
 * How far one edge of a bundle bows to the side at its middle: its {@link fanSlot} times the step
 * between neighboring edges.
 * @param slot - The edge's slot, from {@link fanSlot}.
 * @param count - How many edges the bundle holds.
 * @param radius - The larger endpoint's radius.
 * @param distance - The distance between the two node centers.
 * @param spacing - The step the edge's style asks for (`line.fanSpacing`), drawn as it is; unset,
 *     the step is two radii, narrowed so a wide bundle between close nodes stays readable.
 * @returns The offset, to the left of the bundle's first edge's direction.
 */
export function fanOffset(slot: number, count: number, radius: number, distance: number, spacing?: number): number {
    if (count < 2) {
        return 0;
    }

    const step = spacing ?? Math.min(FAN_STEP_RADII * radius, (FAN_SPREAD_MAX * distance) / (count - 1));
    return slot * step;
}

/**
 * A fanned edge's arc from one node center to the other: the quadratic curve whose middle is
 * `offset` to the left of the line from `left` to `right`, so edges of one bundle drawn either way
 * round bow to the same sides.
 * @param src - Where the edge starts.
 * @param dst - Where it ends.
 * @param left - The bundle's first edge's source center.
 * @param right - Its target center.
 * @param offset - How far the middle bows, from {@link fanOffset}.
 * @returns The points, flat x, y, z, from `src` to `dst`: {@link fanArcPieces} pieces.
 */
export function fanArc(src: Xyz, dst: Xyz, left: Xyz, right: Xyz, offset: number): number[] {
    const dx = right.x - left.x;
    const dy = right.y - left.y;
    const length = Math.hypot(dx, dy) || 1;
    // The control point that puts the curve's middle (t = 1/2) at the bowed midpoint.
    const cx = (src.x + dst.x) / 2 - (dy / length) * offset * 2;
    const cy = (src.y + dst.y) / 2 + (dx / length) * offset * 2;
    const cz = (src.z + dst.z) / 2;
    const pieces = fanArcPieces(Math.hypot(dst.x - src.x, dst.y - src.y, dst.z - src.z), offset);
    const out: number[] = [];
    for (let i = 0; i <= pieces; i++) {
        const t = i / pieces;
        const a = (1 - t) * (1 - t);
        const b = 2 * (1 - t) * t;
        const c = t * t;
        out.push(a * src.x + b * cx + c * dst.x, a * src.y + b * cy + c * dst.y, a * src.z + b * cz + c * dst.z);
    }

    return out;
}

/**
 * A self-loop's teardrop, from its node's center back to it, outside the node: it leaves in one
 * direction and comes back in the next, the bundle's loops spread evenly round the node, the first
 * up and to the right as Cytoscape.js draws one.
 * @param center - The node's center.
 * @param rank - The loop's place among the loops on its node, from zero.
 * @param count - How many loops the node has.
 * @param reachAt - How far the node's surface (and border) is from its center in a direction.
 * @returns The points, flat x, y, z.
 */
export function loopTeardrop(center: Xyz, rank: number, count: number, reachAt: (dir: Xyz) => number): number[] {
    const share = (2 * Math.PI) / Math.max(count, 4);
    const angle = Math.PI / 4 - rank * share;
    const sweep = Math.min(Math.PI / 2, 0.8 * share);
    const toward = { x: Math.cos(angle), y: Math.sin(angle), z: 0 };
    const reach = reachAt(toward);
    // A cubic from the center back to it reaches 3/4 of its controls' mean: far enough that its
    // tip clears the surface by the loop's extent.
    const far = (reach * (1 + LOOP_EXTENT_RADII)) / (0.75 * Math.cos(sweep / 2));
    const c1 = { x: Math.cos(angle + sweep / 2) * far, y: Math.sin(angle + sweep / 2) * far };
    const c2 = { x: Math.cos(angle - sweep / 2) * far, y: Math.sin(angle - sweep / 2) * far };
    const out: number[] = [];
    for (let i = 0; i <= BUNDLE_STEPS; i++) {
        const t = i / BUNDLE_STEPS;
        const b = 3 * (1 - t) * (1 - t) * t;
        const c = 3 * (1 - t) * t * t;
        out.push(center.x + b * c1.x + c * c2.x, center.y + b * c1.y + c * c2.y, center.z);
    }

    return out;
}

/**
 * The part of a route from one node center to another that lies outside both nodes: the index of
 * the first point outside the source and of the last outside the target, which are one point when
 * a shallow arc is drawn with two pieces and only its middle clears the nodes.
 * @param flat - The route, flat x, y, z.
 * @param outsideSrc - Whether a point is outside the source node.
 * @param outsideDst - Whether a point is outside the target node.
 * @returns The two indices, or null when no point is outside both.
 */
export function routeOutside(
    flat: readonly number[],
    outsideSrc: (x: number, y: number, z: number) => boolean,
    outsideDst: (x: number, y: number, z: number) => boolean,
): { first: number; last: number } | null {
    const n = flat.length / 3;
    let first = 0;
    while (first < n && !outsideSrc(flat[3 * first], flat[3 * first + 1], flat[3 * first + 2])) {
        first++;
    }

    let last = n - 1;
    while (last >= first && !outsideDst(flat[3 * last], flat[3 * last + 1], flat[3 * last + 2])) {
        last--;
    }

    return last >= first ? { first, last } : null;
}

/**
 * Where a route's segment crosses a node's outline: the point between `inside` and `outside` where the outline test
 * turns, found by halving the segment. A route drawn as short straight pieces (an arc) leaves its node there, on the
 * curve, where a line from the node's center toward the first point outside would cut the curve's corner.
 * @param inside - The segment's end inside the node.
 * @param outside - Its end outside it.
 * @param isOutside - Whether a point is outside the node.
 * @returns The crossing, within a millionth of the segment's length.
 */
export function crossingOf(inside: Xyz, outside: Xyz, isOutside: (x: number, y: number, z: number) => boolean): Xyz {
    let lo = 0;
    let hi = 1;
    const at = (t: number): Xyz => ({
        x: inside.x + (outside.x - inside.x) * t,
        y: inside.y + (outside.y - inside.y) * t,
        z: inside.z + (outside.z - inside.z) * t,
    });
    for (let i = 0; i < 20; i++) {
        const mid = (lo + hi) / 2;
        const p = at(mid);
        if (isOutside(p.x, p.y, p.z)) {
            hi = mid;
        } else {
            lo = mid;
        }
    }
    return at(hi);
}

/**
 * Where a path is cut so an end cap of a given length fits before its end: the last point along it that far, in a
 * straight line, from the end, as a program cuts a curved edge back for its arrowhead and draws the head along that
 * chord (Gephi, Cytoscape.js).
 * @param path - The path, start to end.
 * @param length - How far from the end the cut is.
 * @returns The cut point and the index of the last path point kept before it, or null when the whole path lies
 *     nearer the end than that.
 */
export function cutFromEnd(path: readonly Xyz[], length: number): { at: Xyz; keep: number } | null {
    const end = path.at(-1);
    if (end === undefined) {
        return null;
    }
    const far = (x: number, y: number, z: number): boolean => Math.hypot(x - end.x, y - end.y, z - end.z) >= length;
    for (let i = path.length - 2; i >= 0; i--) {
        if (far(path[i].x, path[i].y, path[i].z)) {
            return { at: crossingOf(path[i + 1], path[i], far), keep: i };
        }
    }
    return null;
}

/**
 * Where an arrow cap drawn part-way along a line has its tip, and which way it points there: a
 * fraction of the line's length back from its end, pointing toward that end along the line.
 * @param path - The line's points, from the cap's end.
 * @param fraction - How far back, as a fraction of the line's length; 0 is the end itself.
 * @returns The tip and the unit direction, or null for a cap at the end (or a line of no length).
 */
export function pointFromEnd(path: readonly Xyz[], fraction: number): { tip: Xyz; toward: Xyz } | null {
    // Checked first: every edge asks, every frame, and nearly every cap is at its end.
    if (Number.isNaN(fraction) || fraction <= 0) {
        return null;
    }

    const lengths = path.slice(1).map((b, i) => Math.hypot(b.x - path[i].x, b.y - path[i].y, b.z - path[i].z));
    let left = fraction * lengths.reduce((sum, length) => sum + length, 0);
    for (const [i, length] of lengths.entries()) {
        if (length > 0 && (left <= length || i === lengths.length - 1)) {
            const [a, b] = [path[i], path[i + 1]];
            const t = Math.min(left, length) / length;
            return {
                tip: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t },
                toward: { x: (a.x - b.x) / length, y: (a.y - b.y) / length, z: (a.z - b.z) / length },
            };
        }

        left -= length;
    }

    return null;
}

/** The most pieces a raised arc or a great-circle arc is drawn with. */
const RAISED_STEPS = 48;

/**
 * A raised arc over a flat map (`line.route` "arc"): from one end to the other in the vertical plane
 * through both, bowed toward the viewer (-z, the side the cameras look from) by a parabola whose peak,
 * at the middle, is `height` times the distance between the ends across the map (the x-y plane).
 * @param src - Where the edge starts.
 * @param dst - Where it ends.
 * @param height - The peak as a share of the map distance between the ends.
 * @returns The points, flat x, y, z, both ends included.
 */
export function raisedArc(src: Xyz, dst: Xyz, height: number): number[] {
    const chord = Math.hypot(dst.x - src.x, dst.y - src.y);
    const peak = height * chord;
    if (peak <= 0) {
        return [src.x, src.y, src.z, dst.x, dst.y, dst.z];
    }

    const pieces = fanArcPieces(chord, peak);
    const out: number[] = [];
    for (let i = 0; i <= pieces; i++) {
        const t = i / pieces;
        const lift = 4 * peak * t * (1 - t);
        out.push(src.x + (dst.x - src.x) * t, src.y + (dst.y - src.y) * t, src.z + (dst.z - src.z) * t - lift);
    }

    return out;
}

/**
 * A great-circle arc over a globe centered on the origin (`line.route` "great-circle"): along the
 * great circle between the two ends' directions, its distance from the center running from one
 * end's to the other's, lifted at the middle by `height` times the arc's length (sin(pi t)).
 * @param src - Where the edge starts.
 * @param dst - Where it ends.
 * @param height - The lift as a share of the arc's length.
 * @returns The points, flat x, y, z, both ends included; the straight line when the ends are in
 *     one direction from the center, or in opposite ones.
 */
export function greatCircleArc(src: Xyz, dst: Xyz, height: number): number[] {
    const ra = Math.hypot(src.x, src.y, src.z);
    const rb = Math.hypot(dst.x, dst.y, dst.z);
    const straight = [src.x, src.y, src.z, dst.x, dst.y, dst.z];
    if (ra === 0 || rb === 0) {
        return straight;
    }

    const cos = Math.max(-1, Math.min(1, (src.x * dst.x + src.y * dst.y + src.z * dst.z) / (ra * rb)));
    const angle = Math.acos(cos);
    const sin = Math.sin(angle);
    if (sin < 1e-6) {
        return straight;
    }

    const lift = height * angle * ((ra + rb) / 2);
    const pieces = Math.min(
        RAISED_STEPS,
        Math.max(Math.ceil(angle / ARC_TURN_PER_PIECE - 1e-9), fanArcPieces(angle * ((ra + rb) / 2), lift)),
    );
    const out: number[] = [];
    for (let i = 0; i <= pieces; i++) {
        const t = i / pieces;
        const a = Math.sin((1 - t) * angle) / sin / ra;
        const b = Math.sin(t * angle) / sin / rb;
        const r = ra + (rb - ra) * t + lift * Math.sin(Math.PI * t);
        out.push((a * src.x + b * dst.x) * r, (a * src.y + b * dst.y) * r, (a * src.z + b * dst.z) * r);
    }

    out.splice(0, 3, src.x, src.y, src.z);
    out.splice(-3, 3, dst.x, dst.y, dst.z);
    return out;
}
