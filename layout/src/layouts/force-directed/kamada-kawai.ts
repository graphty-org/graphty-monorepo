import type { DistanceMap } from "../../algorithms/optimization";
import { kamadaKawai } from "../../indexed/kamada-kawai";
import { fromPositionMap, toPositionMap } from "../../positions";
import { toLayoutSnapshot } from "../../simulation/snapshot";
import type { Graph, PositionMap } from "../../types";
import { _processParams } from "../../utils/params";

/**
 * Position nodes using Kamada-Kawai path-length cost-function.
 *
 * Runs indexed.kamadaKawai. Weights are distances: a zero weight is a zero distance and parallel edges take the
 * shortest; an unreachable pair (in `dist` or in the graph) has the ideal distance 1e6, as in networkx. The 2D
 * start is the unit circle about the origin. A `dim` other than 3 lays out in 2D; positions are f32 values.
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
    const dimension: 2 | 3 = dim === 3 ? 3 : 2;
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
