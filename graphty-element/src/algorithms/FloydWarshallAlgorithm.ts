import { indexed } from "@graphty/algorithms";

import { GraphtyError } from "../errors";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import type { SimplifyPolicy } from "./input/derivedInputs";
import { type ScopeInputDeclaration, scopeNodeIds } from "./input/ScopedInput";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
    metricFieldSpecs,
} from "./results";

/**
 *
 */
export class FloydWarshallAlgorithm extends DeclaredAlgorithm {
    static namespace = "graphty";
    static type = "floyd-warshall";
    /** Measures every pair of the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";
    /** A distance: of a group of parallel edges, the cheapest is the one a shortest path takes. */
    static parallelEdges: SimplifyPolicy = "min";

    /**
     * Measure the distance between every pair of nodes, and give each node the distance to the
     * node furthest from it.
     *
     * Asked for every pair, the shortest-path question stops being one route: there is no route
     * here to put an `onPath` on. What it produces instead is a measurement of every node -- its
     * eccentricity, the distance to the furthest node it can reach -- so the result is shaped as
     * a node metric, and the widest and narrowest of those distances, the graph's diameter and
     * radius, ride along as facts about the whole graph.
     *
     * THE SHAPE IS WHAT MAKES IT PAINTABLE. A shape of "fact" declares no per-element field, so
     * the element would have had nothing to colour by and a consumer asking to encode
     * eccentricity on node colour would have been refused -- with no way to do it by hand
     * either, which is the case that has to be fixed here rather than worked around outside.
     * @param context - What the element gave the run.
     * @returns The all-pairs measurement, or null when there are no nodes to measure.
     * @throws A `GraphtyError` with `E_TOO_LARGE` when the run is over more nodes than the
     *   all-pairs matrix is bounded to, before any of it is allocated.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        // The nodes of the run's input: its scope's, or the whole graph's.
        const nodeIds = scopeNodeIds(this.input("undirected"));

        if (nodeIds.length === 0) {
            return null;
        }

        // Undirected: a shortest path may cross an edge in either direction.
        const { snapshot, run } = this.accelerated("allPairsShortestPath", "undirected");

        // The matrix is n * n doubles. Past the bound it is refused here, before a byte of it is
        // allocated, rather than left to run the tab out of memory.
        const limit = indexed.APSP_DEFAULT_MAX_NODES;
        if (snapshot.nodeCount > limit) {
            throw new GraphtyError({
                code: "E_TOO_LARGE",
                message:
                    `floyd-warshall measures every pair, and ${String(snapshot.nodeCount)} nodes is more than the ` +
                    `${String(limit)} it is bounded to; run it over a smaller scope`,
                source: "run",
                details: { nodeCount: snapshot.nodeCount, limit },
            });
        }

        context.report({ phase: "Measuring every pair", total: null });
        const { value, precision } = await run((dispatch, s) => dispatch.allPairsShortestPath(s));
        const { dist, n, hasNegativeCycle } = value;
        const { ids } = snapshot;

        const notes = [
            "Every pair was measured. Each node's value is its eccentricity: the distance to the " +
                "furthest node it can reach.",
        ];

        // Under a negative cycle no distance is defined -- the matrix is all NaN -- so there is no
        // eccentricity, diameter or radius to publish, only the fact of the cycle.
        const nodes: ResultElementValues[] = [];
        let diameter = 0;
        let radius = Infinity;
        if (hasNegativeCycle) {
            notes.push("The graph has a negative cycle, so no distance is defined and none was published.");
        } else {
            // Eccentricity: how far the furthest reachable node is, read along the node's row.
            // Unreachable nodes are skipped rather than counted as infinitely far, which is what
            // makes the diameter finite on a graph that comes in several pieces.
            await forEachChunked(context, "Measuring reach", nodeIds, (nodeId) => {
                const row = ids.indexOf(nodeId) * n;
                let furthest = 0;
                for (let j = 0; j < n; j++) {
                    const distance = dist[row + j];
                    if (distance !== Infinity && distance > furthest) {
                        furthest = distance;
                    }
                }

                diameter = Math.max(diameter, furthest);
                radius = Math.min(radius, furthest);
                nodes.push({ id: nodeId, values: { value: furthest } });
            });
        }

        return {
            shape: "node-metric",
            fields: [
                ...metricFieldSpecs("node"),
                { name: "diameter", kind: "graph", type: "number" },
                { name: "radius", kind: "graph", type: "number" },
                { name: "hasNegativeCycle", kind: "graph", type: "boolean" },
            ],
            nodes,
            graph: hasNegativeCycle ? { hasNegativeCycle } : { diameter, radius, hasNegativeCycle },
            caveats: declaredCaveats({
                method: "floyd-warshall",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "distance" },
                precision,
                notes,
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(FloydWarshallAlgorithm);
