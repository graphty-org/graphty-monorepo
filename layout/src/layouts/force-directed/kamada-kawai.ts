import type { GraphSnapshot } from "@graphty/graph-format";

import { _kamadaKawaiSolve, type DistanceMap } from "../../algorithms/optimization";
import { idealDistances, kamadaKawai } from "../../indexed/kamada-kawai";
import { fromPositionMap, toPositionMap } from "../../positions";
import { toLayoutSnapshot } from "../../simulation/snapshot";
import type { Graph, PositionMap } from "../../types";
import { _processParams } from "../../utils/params";
import { RandomNumberGenerator } from "../../utils/random";
import { rescaleLayout } from "../../utils/rescale";

/**
 * Kamada-Kawai in a dim the indexed code does not take (1, or 4 and more), as this function laid it out before:
 * a 1D start spread over [0, 1], a higher one random in the unit cube from seed 42, a node missing from `pos` at
 * the origin.
 * @param s - the layout snapshot
 * @param dist - the ideal distances, n * n, or null for the graph's
 * @param pos - start positions
 * @param weight - whether edge weights are read
 * @param scale - scale factor
 * @param center - the centre, `dim` components
 * @param dim - the dimension
 * @returns positions keyed by node
 */
function kamadaKawaiOtherDim(
    s: GraphSnapshot,
    dist: Float64Array | null,
    pos: PositionMap | null,
    weight: boolean,
    scale: number,
    center: number[],
    dim: number,
): PositionMap {
    const n = s.nodeCount;
    const ids = Array.from({ length: n }, (_, i) => s.ids.idOf(i));
    if (n <= 1) {
        return Object.fromEntries(ids.map((id) => [id, center]));
    }
    const rng = new RandomNumberGenerator(42);
    const start = ids.map((id, i) => {
        if (pos === null) {
            return dim === 1 ? [i / (n - 1)] : (rng.rand(dim) as number[]);
        }
        return Array.from({ length: dim }, (_, k) => pos[id]?.[k] ?? 0);
    });
    const solved = _kamadaKawaiSolve(idealDistances(s, { dist, weight }), start, dim);
    return rescaleLayout(Object.fromEntries(ids.map((id, i) => [id, solved[i]])), scale, center) as PositionMap;
}

/**
 * Position nodes using Kamada-Kawai path-length cost-function.
 *
 * Runs indexed.kamadaKawai. Weights are distances: a zero weight is a zero distance and parallel edges take the
 * shortest; an unreachable pair (in `dist` or in the graph) has the ideal distance 1e6, as in networkx. The 2D
 * start is the unit circle about the origin; positions are f32 values. A `dim` other than 2 or 3 runs the same solver
 * from the start this function had before (see kamadaKawaiOtherDim).
 * @param G - Graph, or a list of nodes when `dist` is given
 * @param dist - A two-level dictionary of optimal distances between nodes
 * @param pos - Initial positions for nodes (a missing node starts at the origin)
 * @param weight - The edge attribute used for edge weights, or null for none
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @returns Positions dictionary keyed by node
 */
export function kamadaKawaiLayout(
    G: Graph,
    dist: DistanceMap | null = null,
    pos: PositionMap | null = null,
    weight: string | null = "weight",
    scale: number = 1,
    center: number[] | null = null,
    dim: number = 2,
): PositionMap {
    ({ center } = _processParams(G, center, dim));
    if (Array.isArray(G) && G.length > 1 && dist === null) {
        throw new Error("Kamada-Kawai layout requires a Graph with edges, not just a list of nodes");
    }
    const s = toLayoutSnapshot(G, weight);
    const n = s.nodeCount;
    let matrix: Float64Array | null = null;
    if (dist !== null) {
        matrix = new Float64Array(n * n);
        for (let i = 0; i < n; i++) {
            const row = dist[s.ids.idOf(i)];
            for (let j = 0; j < n; j++) {
                matrix[i * n + j] = row?.[s.ids.idOf(j)] ?? Number.POSITIVE_INFINITY;
            }
        }
    }
    if (dim !== 2 && dim !== 3) {
        return kamadaKawaiOtherDim(s, matrix, pos, weight !== null, scale, center, dim);
    }
    const dimension: 2 | 3 = dim;
    const result = kamadaKawai(s, {
        dist: matrix,
        pos: pos === null ? null : fromPositionMap(pos, s.ids, dimension, () => undefined),
        weight: weight !== null,
        scale,
        center,
        dim: dimension,
    });
    return toPositionMap(result, s.ids);
}
