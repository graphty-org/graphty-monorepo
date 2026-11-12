import type { AcceleratedAlgorithms } from "@graphty/algorithms";
import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import type { AccelerationPrecision } from "../../acceleration/types";
import type { AcceleratedAlgorithmRun } from "../Algorithm";
import { releaseOnAccelerator, type ScopedInput, type scopeEdges } from "../input/ScopedInput";

/**
 * Runs a shortest-path search over the searched snapshot, or over its transpose when the route
 * follows edges against their direction (`direction: "in"`). The transpose keeps the node and
 * edge spaces, so the result reads the same either way. It is built per run and uncached, so it
 * is released here.
 * @param owner - The graph, whose accelerator may have uploaded the transpose.
 * @param reverse - True to search the transpose.
 * @param run - The run from `accelerated()`.
 * @param fn - The search.
 * @returns What the search produced, and its precision.
 */
export async function searchFollowing<T>(
    owner: Parameters<typeof releaseOnAccelerator>[0],
    reverse: boolean,
    run: AcceleratedAlgorithmRun["run"],
    fn: (dispatch: AcceleratedAlgorithms, snapshot: GraphSnapshot) => Promise<T>,
): Promise<{ value: T; precision: AccelerationPrecision }> {
    if (!reverse) {
        return run(fn);
    }

    let transposed: GraphSnapshot | null = null;
    try {
        return await run((dispatch, s) => {
            transposed = s.transpose().snapshot;
            return fn(dispatch, transposed);
        });
    } finally {
        if (transposed !== null) {
            releaseOnAccelerator(owner, transposed);
        }
    }
}

/**
 * Which of the element's own edges a route took, by row.
 *
 * The route names edges of the UNDIRECTED, simplified view, so each of the element's own edges is
 * mapped onto that space. A merged route edge stands for every parallel edge between its pair,
 * and the walk took ONE of them: the cheapest, the lowest row on a tie. Only that edge is on the
 * route, so a path set made from the run names one edge per step (design/sets 4.4). A reciprocal
 * pair read undirected is one step taken over both directions, so the cheapest edge of EACH
 * direction is on it.
 * @param input - The run's input.
 * @param scoped - The scope's edges, from `scopeEdges(input)`.
 * @param edgeRemap - Declared edge row to the searched snapshot's edge, or null when they agree.
 * @param routeEdges - The searched snapshot's edges on the route.
 * @returns The rows of the element's edges on the route.
 */
export function routeEdgeRows(
    input: ScopedInput,
    scoped: ReturnType<typeof scopeEdges>,
    edgeRemap: U32 | null,
    routeEdges: ReadonlySet<number>,
): Set<number> {
    const { src, weights } = input.graph.edgeList();
    const taken = new Map<string, { row: number; weight: number }>();
    for (const edge of scoped) {
        const merged = edgeRemap === null ? edge.row : (edgeRemap[edge.row] ?? INVALID_INDEX);
        if (!routeEdges.has(merged)) {
            continue;
        }

        // A declared undirected edge has no direction to tell apart: one key per merged edge.
        const key = input.graph.directed ? `${String(merged)}>${String(src[edge.row])}` : String(merged);
        const weight = weights === null ? 1 : weights[edge.row];
        const best = taken.get(key);
        if (best === undefined || weight < best.weight) {
            taken.set(key, { row: edge.row, weight });
        }
    }

    return new Set([...taken.values()].map((entry) => entry.row));
}
