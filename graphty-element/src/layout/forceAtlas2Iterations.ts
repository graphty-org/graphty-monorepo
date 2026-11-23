/**
 * @file ForceAtlas2's iteration cap when the consumer sets none: scaled to the graph.
 *
 * A fixed 100 (the NetworkX default the simulation keeps) stops a 10,000-node graph long before it
 * has spread out: measured on the CPU simulation, a run settles on its own after roughly 450
 * iterations at 150 nodes and roughly 1,000 at 10,000, and at 100 iterations the larger one is
 * still moving by about its own radius per hundred iterations. The cap grows with the square root
 * of the node count, so a graph of up to 224 nodes keeps the 100 it always had and a 10,000-node
 * graph gets 1,000. It is rounded to a whole hundred so a graph that grows by a few nodes keeps
 * the same cap and its simulation is not rebuilt for it.
 */

/** The cap below which the automatic rule never goes: the simulation's own default. */
const FORCE_ATLAS2_MIN_ITERATIONS = 100;

/**
 * The iteration cap ForceAtlas2 runs with when `maxIter` is null.
 * @param nodeCount - The graph the simulation is loaded with.
 * @returns The cap: 100 up to 224 nodes, then 100 times the square root of the node count over ten, rounded.
 */
export function forceAtlas2MaxIterFor(nodeCount: number): number {
    return Math.max(FORCE_ATLAS2_MIN_ITERATIONS, 100 * Math.round(Math.sqrt(nodeCount) / 10));
}
