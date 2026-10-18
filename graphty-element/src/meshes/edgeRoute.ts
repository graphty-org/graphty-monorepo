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
