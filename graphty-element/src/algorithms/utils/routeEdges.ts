import { INVALID_INDEX, type U32 } from "@graphty/graph-format";

import type { ScopedInput, scopeEdges } from "../input/ScopedInput";

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
