/**
 * Edge crossings of a 2D drawing, for the stories that show what a layout does about them. graphty-element's
 * planar story reads this file by relative path too.
 */

/**
 * How many pairs of edges cross in a 2D drawing. Two edges that share an end never count, and neither do edges that
 * only touch (one ends on the other).
 * @param edges - each edge as its two node ids
 * @param at - where a node is drawn, as [x, y]
 * @returns the number of crossing pairs
 */
export function countCrossings<N>(
    edges: readonly (readonly [N, N])[],
    at: (node: N) => readonly [number, number],
): number {
    const side = (a: readonly [number, number], b: readonly [number, number], c: readonly [number, number]): number =>
        Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
    let count = 0;
    for (let i = 0; i < edges.length; i++) {
        const [a, b] = edges[i];
        for (let j = i + 1; j < edges.length; j++) {
            const [c, d] = edges[j];
            if (a === c || a === d || b === c || b === d) {
                continue;
            }
            const [pa, pb, pc, pd] = [at(a), at(b), at(c), at(d)];
            if (side(pa, pb, pc) * side(pa, pb, pd) < 0 && side(pc, pd, pa) * side(pc, pd, pb) < 0) {
                count++;
            }
        }
    }
    return count;
}
