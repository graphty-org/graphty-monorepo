/**
 * Fruchterman-Reingold force-directed layout algorithm
 */

import { INVALID_INDEX, makeMask, maskSet, type NodeMask } from "@graphty/graph-format";

import { fruchtermanReingold } from "../../indexed/force";
import { fromPositionMap, toPositionMap } from "../../positions";
import { toLayoutSnapshot } from "../../simulation/snapshot";
import type { Graph, Node, PositionMap } from "../../types";
import { _processParams } from "../../utils/params";

/**
 * Position nodes using Fruchterman-Reingold force-directed algorithm.
 *
 * Runs indexed.fruchtermanReingold. Nodes missing from `pos` are drawn from one seeded generator (each used to take
 * a fresh generator, so every missing node started at the same point); fixed nodes keep the caller's coordinates
 * exactly; the other positions are f32 values. A `dim` other than 3 lays out in 2D.
 * @param G - Graph or list of nodes
 * @param k - Optimal distance between nodes
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
    ({ center } = _processParams(G, center, dim));
    const s = toLayoutSnapshot(G);
    const dimension: 2 | 3 = dim === 3 ? 3 : 2;
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
        k,
        pos:
            pos === null
                ? null
                : fromPositionMap(pos, s.ids, dimension, (i, out) =>
                      out.fill(Number.NaN, dimension * i, dimension * (i + 1)),
                  ),
        fixed: mask,
        iterations: Number.isFinite(iterations) ? Math.max(0, Math.ceil(iterations)) : 0,
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
