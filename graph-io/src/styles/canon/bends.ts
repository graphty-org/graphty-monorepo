/**
 * The neutral `bends` value of an edge: the points its route passes through between its two nodes, each relative to
 * the straight line from the source node's center to the target node's center. `along` is how far along that line
 * the point lies (0 at the source center, 1 at the target center) and `across` how far to its left, y up, both as
 * fractions of the line's length. Written `along,across` per point, in order from the source, separated by spaces:
 * `"0,-0.5 1,-0.5"` is a route that leaves the source, runs parallel to the line half its length to the right, and
 * comes back to the target. Relative, so a drawing that moves or scales the nodes keeps the route's shape and its
 * right angles.
 */

/** A point in the file's own coordinates. */
export type BendPoint = readonly [x: number, y: number];

/**
 * Rounds a fraction to 4 decimals, so a value spells the same whatever float noise the file's numbers carry.
 * @param v - the fraction
 * @returns its spelling
 */
const fraction = (v: number): string => String(Math.round(v * 1e4) / 1e4);

/**
 * The `bends` value of an edge whose route passes through `points`.
 * @param source - the source node's center
 * @param target - the target node's center
 * @param points - the bend points, from the source end
 * @param yDown - true when the file's y axis points down (the value is always y up)
 * @returns the value, or null with no bends, no line between distinct centers, or a coordinate that is not finite
 * @category Styles
 */
export function canonBends(
    source: BendPoint,
    target: BendPoint,
    points: readonly BendPoint[],
    yDown: boolean,
): string | null {
    const flip = yDown ? -1 : 1;
    const dx = target[0] - source[0];
    const dy = (target[1] - source[1]) * flip;
    const length2 = dx * dx + dy * dy;
    if (points.length === 0 || !(length2 > 0) || !Number.isFinite(length2)) {
        return null;
    }
    const out: string[] = [];
    for (const [px, py] of points) {
        const rx = px - source[0];
        const ry = (py - source[1]) * flip;
        const along = (rx * dx + ry * dy) / length2;
        const across = (dx * ry - dy * rx) / length2;
        if (!Number.isFinite(along) || !Number.isFinite(across)) {
            return null;
        }
        out.push(`${fraction(along)},${fraction(across)}`);
    }
    return out.join(" ");
}

/**
 * The bend points a `bends` value places between two node centers: the inverse of {@link canonBends}.
 * @param source - the source node's center
 * @param target - the target node's center
 * @param value - the `bends` value
 * @param yDown - true when the points are wanted in a y-down file's coordinates
 * @returns the points, or null when the value is not `along,across` pairs or a coordinate is not finite
 * @category Styles
 */
export function bendsToPoints(source: BendPoint, target: BendPoint, value: string, yDown: boolean): BendPoint[] | null {
    const flip = yDown ? -1 : 1;
    const dx = target[0] - source[0];
    const dy = (target[1] - source[1]) * flip;
    const out: BendPoint[] = [];
    for (const pair of value.trim().split(/\s+/)) {
        const [a, c, extra] = pair.split(",").map(Number);
        if (extra !== undefined || !Number.isFinite(a) || !Number.isFinite(c)) {
            return null;
        }
        const x = source[0] + a * dx - c * dy;
        const y = source[1] + (a * dy + c * dx) * flip;
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return null;
        }
        out.push([x, y]);
    }
    return out.length === 0 ? null : out;
}
