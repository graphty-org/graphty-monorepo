/**
 * @file The library calls an algorithm makes outside the dispatcher, written so their result is
 * plain data and so can be computed in the element's Worker (see `offThread.ts`). The page and the
 * Worker run the same function, so the answer does not depend on where it was computed.
 */

import {
    allSimplePaths,
    astar,
    hierarchicalClustering,
    markovClustering,
    type MarkovOptions,
    type SimplePathsOptions,
    spectralClustering,
    type SpectralOptions,
} from "@graphty/algorithms";
import { detHypot, type GraphSnapshot } from "@graphty/graph-format";

/**
 * A straight-line estimate of the distance left, from each node's position.
 * @param xyz - Three numbers per node of the searched graph, or null for no estimate.
 * @returns The heuristic A* takes.
 */
function straightLine(xyz: Float64Array | null): (node: number, target: number) => number {
    if (xyz === null) {
        return () => 0;
    }

    return (node, target) => {
        const a = node * 3;
        const b = target * 3;
        const d = detHypot(xyz[a] - xyz[b], xyz[a + 1] - xyz[b + 1], xyz[a + 2] - xyz[b + 2]);
        return Number.isFinite(d) ? d : 0;
    };
}

/** Each task: the graph first, then its other arguments, all of which a Worker can be handed a copy of. */
export const OFF_THREAD_TASKS = {
    spectralClustering: (s: GraphSnapshot, options: SpectralOptions) => spectralClustering(s, options),
    markovClustering: (s: GraphSnapshot, options: MarkovOptions) => markovClustering(s, options),
    /**
     * The merge tree cut into as many clusters as asked, but never fewer than it has unlinked
     * parts nor more than nodes. The tree itself carries methods, so the cut is made here.
     * @param s - The graph.
     * @param options - The linkage and the cluster count asked for.
     * @param options.linkage - How far apart two clusters are.
     * @param options.clusters - How many clusters to stop at.
     * @returns The labels, and the cluster count the cut was made at.
     */
    hierarchicalClustering: (
        s: GraphSnapshot,
        options: { linkage: "single" | "complete" | "average" | "ward"; clusters: number },
    ) => {
        const tree = hierarchicalClustering(s, { linkage: options.linkage });
        const cut = Math.min(Math.max(options.clusters, tree.roots.length), s.nodeCount);
        return { labels: tree.cutAt({ clusters: cut }).labels, cut };
    },
    allSimplePaths: (s: GraphSnapshot, source: number, target: number, options: SimplePathsOptions) =>
        allSimplePaths(s, source, target, options),
    /**
     * A* with the straight-line heuristic built from positions, which, unlike a function, can be
     * handed to a Worker.
     * @param s - The graph.
     * @param source - The source row.
     * @param target - The target row.
     * @param xyz - Three numbers per row of `s`, or null for no heuristic.
     * @returns The route.
     */
    astar: (s: GraphSnapshot, source: number, target: number, xyz: Float64Array | null) =>
        astar(s, source, target, straightLine(xyz)),
};

/** The name of a task. */
export type OffThreadTask = keyof typeof OFF_THREAD_TASKS;
