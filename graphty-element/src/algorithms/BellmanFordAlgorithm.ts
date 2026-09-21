import { bellmanFord } from "@graphty/algorithms";
import { z } from "zod/v4";

import type { EdgeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
    PATH_FIELD_SPECS,
} from "./results";
import type { OptionsSchema } from "./types/OptionSchema";

/**
 * Zod-based options schema for Bellman-Ford algorithm
 */
const bellmanFordOptionsSchema = defineOptions({
    source: {
        schema: z.union([z.string(), z.number()]).nullable().default(null),
        meta: {
            label: "Source Node",
            description: "Starting node for shortest path (uses first node if not set)",
        },
    },
    target: {
        schema: z.union([z.string(), z.number()]).nullable().default(null),
        meta: {
            label: "Target Node",
            description: "Destination node for shortest path (uses last node if not set)",
        },
    },
});

/**
 * Options for Bellman-Ford algorithm
 */
interface BellmanFordOptions extends Record<string, unknown> {
    source: number | string | null;
    target: number | string | null;
}

/**
 * Bellman-Ford algorithm for finding shortest paths
 *
 * Computes shortest paths from a source node to all other nodes, supporting
 * negative edge weights and detecting negative cycles.
 */
export class BellmanFordAlgorithm extends DeclaredAlgorithm<BellmanFordOptions> {
    static namespace = "graphty";
    static type = "bellman-ford";

    static zodOptionsSchema: ZodOptionsSchema = bellmanFordOptionsSchema;

    static optionsSchema: OptionsSchema = {
        source: {
            type: "nodeId",
            default: null,
            label: "Source Node",
            description: "Starting node for shortest path (uses first node if not set)",
            required: false,
        },
        target: {
            type: "nodeId",
            default: null,
            label: "Target Node",
            description: "Destination node for shortest path (uses last node if not set)",
            required: false,
        },
    };

    /**
     * Legacy options set via configure() for backward compatibility
     */
    private legacyOptions: { source: number | string; target?: number | string } | null = null;

    /**
     * Configure the algorithm with source and optional target nodes
     * @param options - Configuration options
     * @param options.source - The source node ID
     * @param options.target - The optional target node ID
     * @returns This algorithm instance for chaining
     * @deprecated Use constructor options instead. This method is kept for backward compatibility.
     */
    configure(options: { source: number | string; target?: number | string }): this {
        this.legacyOptions = options;
        return this;
    }

    /**
     * Find the cheapest route from the source to the target, negative weights included.
     *
     * Publishes the same path fields Dijkstra does, because the engine is a parameter of the
     * question and not a different question. What is different is what the method can tell you:
     * it detects a loop that costs less every time round, and it says so on the graph half of
     * the result, where a distance computed in the presence of one cannot be trusted.
     * @param context - What the element gave the run.
     * @returns The route, or null when there are no nodes to search.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const dataManager = this.graph.getDataManager();
        const nodeIds = Array.from(dataManager.nodes.keys());

        if (nodeIds.length === 0) {
            return null;
        }

        // Get source and target from legacy options, schema options, or use defaults
        // Legacy configure() takes precedence for backward compatibility
        const source = this.legacyOptions?.source ?? this._schemaOptions.source ?? nodeIds[0];
        const target = this.legacyOptions?.target ?? this._schemaOptions.target ?? nodeIds[nodeIds.length - 1];

        const graphData = this.algorithmGraph("undirected");

        context.report({ phase: "Relaxing edges", total: null });
        const result = bellmanFord(graphData, source);

        const path = this.reconstructPath(result.predecessors, source, target);
        const orderOf = new Map<number | string, number>();
        path.forEach((nodeId, position) => orderOf.set(nodeId, position));

        // The 1.10 result scaled every distance against the furthest reachable node.
        let furthest = 0;
        for (const distance of result.distances.values()) {
            if (isFinite(distance) && distance > furthest) {
                furthest = distance;
            }
        }

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Marking the route", nodeIds, (nodeId) => {
            const order = orderOf.get(nodeId);
            const distance = result.distances.get(nodeId) ?? Infinity;

            nodes.push({ id: nodeId, values: { onPath: order !== undefined, order, distance } });
        });

        const routeEdges = this.getPathEdges(path);
        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Marking the route", Array.from(dataManager.edges.values()), (edge) => {
            const key = `${String(edge.srcId)}:${String(edge.dstId)}`;
            const reversed = `${String(edge.dstId)}:${String(edge.srcId)}`;

            edges.push({ id: key, values: { onPath: routeEdges.has(key) || routeEdges.has(reversed) } });
        });

        const notes = [`Route from ${String(source)} to ${String(target)}.`];
        if (result.hasNegativeCycle) {
            notes.push("A loop that costs less every time round was found, so no distance past it is meaningful.");
        }

        return {
            shape: "path",
            fields: [
                ...PATH_FIELD_SPECS,
                { name: "distance", kind: "node", type: "number" },
                { name: "hasNegativeCycle", kind: "graph", type: "boolean" },
            ],
            nodes,
            edges,
            graph: {
                length: path.length,
                cost: path.length > 0 ? (result.distances.get(target) ?? 0) : 0,
                hops: Math.max(path.length - 1, 0),
                hasNegativeCycle: result.hasNegativeCycle,
            },
            caveats: declaredCaveats({
                method: "bellman-ford",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "distance" },
                notes,
            }),
        };
    }

    /**
     * Reconstruct the shortest path from predecessors
     * @param predecessors - Map of node to its predecessor in the shortest path
     * @param source - The source node
     * @param target - The target node
     * @returns Array of node IDs representing the shortest path
     */
    private reconstructPath(
        predecessors: Map<string | number, string | number | null>,
        source: string | number,
        target: string | number,
    ): (string | number)[] {
        const path: (string | number)[] = [];
        let current: string | number | null = target;

        while (current !== null) {
            path.unshift(current);
            if (current === source) {
                break;
            }

            current = predecessors.get(current) ?? null;
        }

        // If path doesn't start with source, no valid path exists
        if (path.length === 0 || path[0] !== source) {
            return [];
        }

        return path;
    }

    /**
     * Get set of edge keys that are part of the path
     * @param path - Array of node IDs representing the path
     * @returns Set of edge keys in "srcId:dstId" format
     */
    private getPathEdges(path: (string | number)[]): Set<string> {
        const edges = new Set<string>();

        for (let i = 0; i < path.length - 1; i++) {
            edges.add(`${String(path[i])}:${String(path[i + 1])}`);
        }

        return edges;
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(BellmanFordAlgorithm);
