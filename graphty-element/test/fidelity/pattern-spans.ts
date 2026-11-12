/**
 * @file Where each element of a patterned line spans along the line, on screen, for the dash pattern the fidelity
 * capture reads off a line drawn as elements (`elementDashes` in drawn-scene.ts).
 */

/** A point on screen, x and y in pixels. */
type Xy = readonly [number, number];

/**
 * Each element's span along its line: from where its outline starts to where it ends, measured along the line
 * through the elements' centers. A straight line's elements are measured along it; a line laid along a route (its
 * bends, a curve, a self-loop) has each element measured along the route where it sits, the route's length taken
 * from center to center, so its dashes and gaps are the ones drawn round the corners (issue #3102) rather than their
 * shadows on the straight line between its two ends.
 * @param centers - Each element's center, in order along the line.
 * @param outlines - Each element's outline.
 * @returns Each element's span, start and end, in pixels from the first element's center; null for fewer than two
 *     elements or elements all at one point.
 */
export function spansAlongCenters(
    centers: readonly Xy[],
    outlines: readonly (readonly Xy[])[],
): [number, number][] | null {
    const n = centers.length;
    if (n < 2 || outlines.length !== n) {
        return null;
    }

    const along = [0];
    for (let i = 1; i < n; i++) {
        along.push(along[i - 1] + Math.hypot(centers[i][0] - centers[i - 1][0], centers[i][1] - centers[i - 1][1]));
    }
    if ((along.at(-1) ?? 0) < 1e-9) {
        return null;
    }

    return centers.map((c, i) => {
        // the line's direction at the element: from its neighbor before to its neighbor after
        const [from, to] = [centers[Math.max(0, i - 1)], centers[Math.min(n - 1, i + 1)]];
        const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
        const u = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
        const t = outlines[i].map(([x, y]) => (x - c[0]) * u[0] + (y - c[1]) * u[1]);
        return [along[i] + Math.min(...t), along[i] + Math.max(...t)];
    });
}
