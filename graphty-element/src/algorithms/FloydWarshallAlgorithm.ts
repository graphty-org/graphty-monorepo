import { floydWarshall } from "@graphty/algorithms";

import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
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
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const nodeIds = Array.from(this.graph.getDataManager().nodes.keys());

        if (nodeIds.length === 0) {
            return null;
        }

        // Undirected: floydWarshall seeds both directions of every edge when its input is undirected.
        const graphData = this.algorithmGraph("undirected");

        context.report({ phase: "Measuring every pair", total: null });
        const result = floydWarshall(graphData);

        // Eccentricity: how far the furthest reachable node is. Unreachable nodes are skipped
        // rather than counted as infinitely far, which is what makes the diameter finite on a
        // graph that comes in several pieces.
        const eccentricityOf = new Map<number | string, number>();
        await forEachChunked(context, "Measuring reach", nodeIds, (nodeId) => {
            const distances = result.distances.get(nodeId);

            if (distances === undefined) {
                eccentricityOf.set(nodeId, Infinity);
                return;
            }

            let furthest = 0;
            for (const distance of distances.values()) {
                if (isFinite(distance) && distance > furthest) {
                    furthest = distance;
                }
            }

            eccentricityOf.set(nodeId, furthest);
        });

        let diameter = 0;
        let radius = Infinity;
        for (const eccentricity of eccentricityOf.values()) {
            if (!isFinite(eccentricity)) {
                continue;
            }

            diameter = Math.max(diameter, eccentricity);
            radius = Math.min(radius, eccentricity);
        }

        if (radius === Infinity) {
            radius = 0;
        }

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Publishing distances", nodeIds, (nodeId) => {
            const eccentricity = eccentricityOf.get(nodeId) ?? Infinity;

            // An unreachable node has no eccentricity to publish: infinity is not a distance, and
            // publishing it would put every disconnected node at the top of the column.
            if (!isFinite(eccentricity)) {
                return;
            }

            nodes.push({ id: nodeId, values: { value: eccentricity } });
        });

        return {
            shape: "node-metric",
            fields: [
                ...metricFieldSpecs("node"),
                { name: "diameter", kind: "graph", type: "number" },
                { name: "radius", kind: "graph", type: "number" },
                { name: "hasNegativeCycle", kind: "graph", type: "boolean" },
            ],
            nodes,
            graph: { diameter, radius, hasNegativeCycle: result.hasNegativeCycle },
            caveats: declaredCaveats({
                method: "floyd-warshall",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "distance" },
                notes: [
                    "Every pair was measured. Each node's value is its eccentricity: the distance to the " +
                        "furthest node it can reach.",
                ],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(FloydWarshallAlgorithm);
