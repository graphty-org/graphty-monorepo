/**
 * How tall a step's histogram bars are drawn (selection spec 4.3, the owner's review of
 * ws-polish 2): presentation only, the counts stay in the bars' labels.
 */

/** A tallest bin this many times the middle one draws log heights. */
const SKEWED_RATIO = 20;

/** The least height of a bin holding anything, as a share of the tallest: about 2 px of a 40 px chart. */
const LEAST_HEIGHT = 0.05;

/**
 * How tall each bar is drawn (presentation only; the counts stay in the labels): log(1 + count)
 * when the values are skewed (graphty-element suggests it) or the tallest bin is over 20 times the
 * median non-empty bin, and never flat for a bin that holds something.
 * @param counts - the bins' counts.
 * @param skewed - graphty-element suggests a log scale for the values.
 * @returns the heights, in the bins' order.
 */
export function barHeights(counts: readonly number[], skewed: boolean): number[] {
    const filled = counts.filter((count) => count > 0).sort((a, b) => a - b);
    const median = filled[Math.floor(filled.length / 2)] ?? 0;
    const tallest = filled.at(-1) ?? 0;
    const log = skewed || (median > 0 && tallest / median > SKEWED_RATIO);
    const heights = counts.map((count) => (log ? Math.log1p(count) : count));
    const least = Math.max(...heights, 0) * LEAST_HEIGHT;
    return heights.map((height, at) => ((counts[at] ?? 0) > 0 ? Math.max(height, least) : 0));
}
