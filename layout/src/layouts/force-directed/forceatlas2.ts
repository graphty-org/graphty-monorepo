import { ForceAtlas2Simulation, seedPositions, toLayoutSnapshot } from "../../simulation";
import type { Graph, Node, PositionMap } from "../../types";
import { rescaleLayout } from "../../utils/rescale";

/**
 * Position nodes using the ForceAtlas2 force-directed algorithm.
 *
 * A one-shot wrapper over the steppable ForceAtlas2Simulation of the layout seam (design 9.3, D-17): the legacy
 * graph is converted to an undirected snapshot once, the caller's positions seed the stride-3 array (missing rows
 * and components are drawn from the seed), the simulation runs every one of maxIter iterations, and the result is
 * rescaled exactly as the legacy body did. The positional signature and the return type are unchanged. Documented
 * behaviour changes (design 9.3, 7.2; graph-format design 14.3): the published FA2 laws replace the port's 1/d^2
 * repulsion; force-based swing / traction; the attraction sums over parallel arcs (the dense matrix collapsed
 * them); mass defaults to outDegree() + 1 (a self-loop counted once); nodeSize is inert until the adjustSizes slice
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
    const positions = new Float32Array(3 * n).fill(Number.NaN);
    if (pos !== null) {
        for (let i = 0; i < n; i++) {
            const given = pos[s.ids.idOf(i)];
            if (given !== undefined) {
                positions[3 * i] = given[0];
                positions[3 * i + 1] = given[1];
                positions[3 * i + 2] = dimension === 3 ? (given[2] ?? 0) : 0;
            }
        }
    }
    seedPositions(s, positions, seed, dimension, 1, null, "fa2");
    // legacy tolerance: the old `for (iter = 0; iter < maxIter; iter++)` ran ceil(maxIter) iterations and none for
    // maxIter <= 0 or NaN; the simulation's option and step() count must be integers >= 1, so the count is
    // normalised here and step() is skipped when nothing runs
    const iterations = Number.isFinite(maxIter) ? Math.max(0, Math.ceil(maxIter)) : 0;
    const sim = new ForceAtlas2Simulation({
        maxIter: Math.max(1, iterations),
        jitterTolerance,
        scalingRatio,
        gravity,
        distributedAction,
        strongGravity,
        nodeMass,
        nodeSize,
        // the legacy attribute NAME was consumed by toLayoutSnapshot (getEdgeData -> the snapshot's arc weights);
        // the simulation's `weight` is therefore a boolean here, never the attribute name
        weight: weight !== null,
        dissuadeHubs: _dissuadeHubs,
        linlog,
        dim: dimension,
        settleThreshold: 0, // the one-shot function runs every iteration (design 9.3)
    });
    sim.load(s, positions);
    if (iterations > 0) {
        // load() does not write the owner's array, so skipping step() returns the rescaled seed as the legacy body did
        sim.step(iterations);
    }
    sim.dispose();
    const result: PositionMap = {};
    for (let i = 0; i < n; i++) {
        const row = [positions[3 * i], positions[3 * i + 1]];
        if (dimension === 3) {
            row.push(positions[3 * i + 2]);
        }
        result[s.ids.idOf(i)] = row;
    }
    return rescaleLayout(result) as PositionMap; // rescaleLayout is typed PositionMap | number[][]; the legacy body casts the same way
}
