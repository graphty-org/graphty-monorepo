import { forceAtlas2 } from "../../indexed/force";
import { fromPositionMap, toPositionMap } from "../../positions";
import { toLayoutSnapshot } from "../../simulation/snapshot";
import type { Graph, Node, PositionMap } from "../../types";

/**
 * Position nodes using the ForceAtlas2 force-directed algorithm.
 *
 * Runs indexed.forceAtlas2: the legacy graph is converted to an undirected snapshot once, the caller's positions
 * seed the start (missing rows and a missing x or y are drawn from the seed, a missing 3D z is 0), every one of
 * maxIter iterations runs, and the result is rescaled as the legacy body did (f64 scratch, f32 output). The positional signature and the return type are
 * unchanged. Documented behaviour changes (design 9.3, 7.2; graph-format design 14.3): the published FA2 laws
 * replace the port's 1/d^2 repulsion; force-based swing / traction; the attraction sums over parallel arcs (the
 * dense matrix collapsed them); mass defaults to outDegree() + 1 (a self-loop counted once); nodeSize is inert until the adjustSizes slice
 * lands (design 7.14, Q-25).
 * @param G - Graph
 * @param pos - Initial positions for nodes
 * @param maxIter - Maximum number of iterations (a fractional value runs ceil(maxIter) iterations and a value <= 0
 * or not finite runs none, returning the rescaled seed, as the legacy loop did)
 * @param jitterTolerance - Controls tolerance for node speed adjustments
 * @param scalingRatio - Scaling of attraction and repulsion forces
 * @param gravity - Attraction to center to prevent disconnected components from drifting
 * @param distributedAction - Distributes attraction force among nodes
 * @param strongGravity - Uses a stronger gravity model
 * @param nodeMass - Dictionary mapping nodes to their masses
 * @param nodeSize - Dictionary mapping nodes to their sizes; accepted and ignored (adjustSizes is deferred, design
 * 7.14 / Q-25; the legacy sign-suspect correction is gone)
 * @param weight - Edge attribute for weight
 * @param _dissuadeHubs - Whether to prevent hub nodes from clustering (unused)
 * @param linlog - Whether to use logarithmic attraction
 * @param seed - Random seed for initial positions
 * @param dim - Dimension of layout
 * @returns Positions dictionary keyed by node
 */
export function forceatlas2Layout(
    G: Graph,
    pos: PositionMap | null = null,
    maxIter: number = 100,
    jitterTolerance: number = 1.0,
    scalingRatio: number = 2.0,
    gravity: number = 1.0,
    distributedAction: boolean = false,
    strongGravity: boolean = false,
    nodeMass: Record<Node, number> | null = null,
    nodeSize: Record<Node, number> | null = null,
    weight: string | null = null,
    _dissuadeHubs: boolean = false,
    linlog: boolean = false,
    seed: number | null = null,
    dim: number = 2,
): PositionMap {
    const s = toLayoutSnapshot(G, weight);
    const n = s.nodeCount;
    const dimension: 2 | 3 = dim === 3 ? 3 : 2;
    // an unseeded row is NaN, which seedPositions then draws from the seed
    const given = fromPositionMap(pos, s.ids, dimension, (i, out) =>
        out.fill(Number.NaN, dimension * i, dimension * (i + 1)),
    );
    // fromPositionMap reads a missing component as 0; here only a missing z is 0, and a missing x or y is NaN too
    for (let i = 0; pos !== null && i < n; i++) {
        const row = pos[s.ids.idOf(i)];
        for (let k = 0; row !== undefined && k < 2; k++) {
            if (row[k] === undefined) {
                given[dimension * i + k] = Number.NaN;
            }
        }
    }
    const result = forceAtlas2(s, {
        pos: given,
        maxIter,
        jitterTolerance,
        scalingRatio,
        gravity,
        distributedAction,
        strongGravity,
        nodeMass,
        nodeSize,
        // the legacy attribute NAME was consumed by toLayoutSnapshot (getEdgeData -> the snapshot's arc weights);
        // the indexed `weight` is therefore a boolean here, never the attribute name
        weight: weight !== null,
        dissuadeHubs: _dissuadeHubs,
        linlog,
        seed,
        dim: dimension,
    });
    return toPositionMap(result, s.ids);
}
