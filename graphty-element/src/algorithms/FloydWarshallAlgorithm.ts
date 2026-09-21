import { floydWarshall } from "@graphty/algorithms";

import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
} from "./results";

/**
 *
 */
export class FloydWarshallAlgorithm extends DeclaredAlgorithm {
    static namespace = "graphty";
    static type = "floyd-warshall";

    /**
     * Measure the distance between every pair of nodes, and what that says about the graph.
     *
     * Asked for every pair, the shortest-path question stops being one route and becomes a set of
     * facts about the whole graph: how far the furthest node is from each node, the widest of
     * those distances and the narrowest. So the result is shaped as facts rather than as a path
     * -- there is no route here to put an `onPath` on.
     * @param context - What the element gave the run.
     * @returns The all-pairs facts, or null when there are no nodes to measure.
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

            nodes.push({ id: nodeId, values: { eccentricity } });
        });

        return {
            shape: "fact",
            fields: [
                { name: "eccentricity", kind: "node", type: "number" },
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
                notes: ["Every pair was measured, so the result describes the graph rather than one route."],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(FloydWarshallAlgorithm);
