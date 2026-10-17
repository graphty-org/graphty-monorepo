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
 * How far from a node's center a segment leaving it in a direction crosses its surface: its
 * radius when it is round, else where the ray leaves its box.
 * @param dir - The unit direction.
 * @param half - The node's half extents.
 * @param radius - The node's radius when it is round, else null.
 * @returns The distance.
 */
export function surfaceReach(dir: Xyz, half: Xyz, radius: number | null): number {
    if (radius !== null) {
        return radius;
    }

    const reach = Math.min(
        dir.x === 0 ? Infinity : half.x / Math.abs(dir.x),
        dir.y === 0 ? Infinity : half.y / Math.abs(dir.y),
        dir.z === 0 ? Infinity : half.z / Math.abs(dir.z),
    );

    return Number.isFinite(reach) ? reach : 0;
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
 * @returns The offset, to the left of the bundle's first edge's direction.
 */
export function fanOffset(slot: number, count: number, radius: number, distance: number): number {
    if (count < 2) {
        return 0;
    }

    const step = Math.min(FAN_STEP_RADII * radius, (FAN_SPREAD_MAX * distance) / (count - 1));
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
 * the first point outside the source and of the last outside the target.
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
    while (last > first && !outsideDst(flat[3 * last], flat[3 * last + 1], flat[3 * last + 2])) {
        last--;
    }

    return last > first ? { first, last } : null;
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
    if (!(fraction > 0)) {
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
