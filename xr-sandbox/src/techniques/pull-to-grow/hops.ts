// Pull distance to hop count (design section 9.6), pure so the Node tests can import it: a dead
// zone, then one hop per step, with a hysteresis band centered on each boundary so a hand
// trembling across a boundary never flickers the readout.

/** How distance maps to hops, in meters. */
export interface HopSteps {
    /** Pull inside this is zero hops (release cancels). */
    deadM: number;
    /** Each hop past the dead zone. */
    stepM: number;
    /** Width of the band around each boundary; half of it on each side. */
    hystM: number;
}

export const DEFAULT_STEPS: HopSteps = { deadM: 0.06, stepM: 0.08, hystM: 0.02 };

/**
 * The boundary between `k - 1` and `k` hops.
 * @param k - hop count, 1 or more
 * @param s - the steps
 * @returns the distance in meters
 */
const boundary = (k: number, s: HopSteps): number => s.deadM + (k - 1) * s.stepM;

/**
 * The hop count for a pull distance, given the count shown last. Moving out, the count rises only
 * past a boundary plus half the band; moving in, it falls only below a boundary minus half.
 * @param distM - filtered pull distance in meters
 * @param prev - the hop count shown last
 * @param max - the most hops there are (the deepest BFS level), so the count never runs past the graph
 * @param s - the steps
 * @returns the hop count to show
 */
export function hopsFor(distM: number, prev: number, max: number, s: HopSteps = DEFAULT_STEPS): number {
    const half = s.hystM / 2;
    let h = Math.min(prev, max);
    while (h < max && distM > boundary(h + 1, s) + half) {
        h++;
    }
    while (h > 0 && distM < boundary(h, s) - half) {
        h--;
    }
    return h;
}

/**
 * How many nodes sit at each BFS depth.
 * @param depth - depth per node from breadthFirstSearch; unreached nodes hold a value past `maxDepth`
 * @param maxDepth - the deepest level counted
 * @returns count per level, index 0 is the source; trailing empty levels are dropped
 */
export function levelCounts(depth: ArrayLike<number>, maxDepth: number): number[] {
    const out = new Array<number>(maxDepth + 1).fill(0);
    for (let i = 0; i < depth.length; i++) {
        if (depth[i] <= maxDepth) {
            out[depth[i]]++;
        }
    }
    while (out.length > 1 && out.at(-1) === 0) {
        out.pop();
    }
    return out;
}

/**
 * The readout's words for a hop count: "1 hop: 6", then "2 hops: +5" (what the step adds).
 * @param hops - the hop count
 * @param levels - from levelCounts
 * @returns the readout text
 */
export function readoutText(hops: number, levels: readonly number[]): string {
    if (hops <= 0) {
        return "Release to cancel";
    }
    return hops === 1 ? `1 hop: ${levels[1] ?? 0}` : `${hops} hops: +${levels[hops] ?? 0}`;
}
