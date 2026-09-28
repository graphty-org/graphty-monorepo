/**
 * Fruchterman-Reingold force-directed layout algorithm
 */

import { INVALID_INDEX, makeMask, maskSet, type NodeMask } from "@graphty/graph-format";

import { fruchtermanReingold } from "../../indexed/force";
import { fromPositionMap, toPositionMap } from "../../positions";
import { toLayoutSnapshot } from "../../simulation/snapshot";
import type { Graph, Node, PositionMap } from "../../types";
import { _processParams } from "../../utils/params";
import { fruchtermanReingoldLayoutLegacy } from "./fruchterman-reingold-legacy";

/**
 * Position nodes using Fruchterman-Reingold force-directed algorithm.
 *
 * Runs indexed.fruchtermanReingold. Nodes missing from `pos` are drawn from one seeded generator (each used to take
 * a fresh generator, so every missing node started at the same point); fixed nodes keep the caller's coordinates
 * exactly; the other positions are f32 values. A `dim` other than 2 or 3, or a negative or infinite `k`, runs the
 * loop this function had before, which the indexed code does not take.
 * @param G - Graph or list of nodes
 * @param k - Optimal distance between nodes (null, 0 or NaN: 1 / sqrt(node count))
 * @param pos - Initial positions for nodes
 * @param fixed - Nodes to keep fixed at initial position
 * @param iterations - Maximum number of iterations (a fractional count runs its ceiling; 0, a negative or a
 * non-finite count runs none)
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @param dim - Dimension of layout
 * @param seed - Random seed for initial positions
 * @returns Positions dictionary keyed by node
 */
export function fruchtermanReingoldLayout(
    G: Graph,
    k: number | null = null,
    pos: PositionMap | null = null,
    fixed: Node[] | null = null,
    iterations: number = 50,
    scale: number = 1,
    center: number[] | null = null,
    dim: number = 2,
    seed: number | null = null,
): PositionMap {
    if ((dim !== 2 && dim !== 3) || (k ?? 0) < 0 || k === Number.POSITIVE_INFINITY) {
        return fruchtermanReingoldLayoutLegacy(G, k, pos, fixed, iterations, scale, center, dim, seed);
    }
    const dimension: 2 | 3 = dim;
    ({ center } = _processParams(G, center, dim));
    const s = toLayoutSnapshot(G);
    let mask: NodeMask | null = null;
    if (fixed !== null) {
        mask = makeMask(s.nodeCount);
        for (const id of fixed) {
            const i = s.ids.indexOf(id);
            if (i !== INVALID_INDEX) {
                maskSet(mask, i, true);
            }
        }
    }
    const result = fruchtermanReingold(s, {
        k: k || null,
        pos:
            pos === null
                ? null
                : fromPositionMap(pos, s.ids, dimension, (i, out) =>
                      out.fill(Number.NaN, dimension * i, dimension * (i + 1)),
                  ),
        fixed: mask,
        iterations,
        scale,
        center,
        dim: dimension,
        seed,
    });
    const out = toPositionMap(result, s.ids);
    for (const id of fixed ?? []) {
        if (pos?.[id] !== undefined && id in out) {
            out[id] = [...pos[id]];
        }
    }
    return out;
}
