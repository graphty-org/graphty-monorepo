import { dijkstra, dijkstraPath } from "@graphty/algorithms";
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
import { type OptionsSchema } from "./types/OptionSchema";
import { edgePairKey } from "./utils/graphUtils";

/**
 * Zod-based options schema for Dijkstra algorithm
 */
const dijkstraOptionsSchema = defineOptions({
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
    bidirectional: {
        schema: z.boolean().default(true),
        meta: {
            label: "Bidirectional Search",
            description: "Use bidirectional search optimization for faster point-to-point queries",
            advanced: true,
        },
    },
});

/**
 * Options for Dijkstra algorithm
 */
interface DijkstraOptions extends Record<string, unknown> {
    /** Starting node for shortest path (defaults to first node if not provided) */
    source: number | string | null;
    /** Destination node for shortest path (defaults to last node if not provided) */
    target: number | string | null;
    /** Use bidirectional search optimization for point-to-point queries */
    bidirectional: boolean;
}

/**
 * Dijkstra's algorithm for finding shortest paths
 *
 * Computes shortest paths from a source node to all other nodes using
 * non-negative edge weights. Supports bidirectional search optimization.
 */
export class DijkstraAlgorithm extends DeclaredAlgorithm<DijkstraOptions> {
    static namespace = "graphty";
    static type = "dijkstra";

    static zodOptionsSchema: ZodOptionsSchema = dijkstraOptionsSchema;

    /**
     * Options schema for Dijkstra algorithm
     */
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
        bidirectional: {
            type: "boolean",
            default: true,
            label: "Bidirectional Search",
            description: "Use bidirectional search optimization for faster point-to-point queries",
            advanced: true,
        },
    };

    /**
     * Legacy options set via configure() for backward compatibility
     */
    private legacyOptions: { source: number | string; target?: number | string } | null = null;

    /**
     * Configure the algorithm with source and optional target nodes
     * @param options - Configuration options
     * @param options.source - The source node for shortest path computation
     * @param options.target - The target node (optional)
     * @returns This algorithm instance for chaining
     * @deprecated Use constructor options instead. This method is kept for backward compatibility.
     */
    configure(options: { source: number | string; target?: number | string }): this {
        this.legacyOptions = options;
        return this;
    }

    /**
     * Find the cheapest route from the source to the target.
     *
     * Publishes the path shape's uniform fields: whether each node and edge is on the route,
     * where each node sits along it counting the source as 0, and the route's size and cost. It
     * also publishes how far every reachable node is from the source, which is what makes one
     * run answer both "show me the way there" and "how far is everything".
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
        const { bidirectional } = this._schemaOptions;

        // Undirected: a shortest path may cross an edge in either direction.
        const graphData = this.algorithmGraph("undirected");

        context.report({ phase: "Searching for the route", total: null });
        const route = dijkstraPath(graphData, source, target, { bidirectional });
        const path = route?.path ?? [];

        context.report({ phase: "Measuring distances", total: null });
        const distances = dijkstra(graphData, source);

        const orderOf = new Map<number | string, number>();
        path.forEach((nodeId, position) => orderOf.set(nodeId, position));

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Marking the route", nodeIds, (nodeId) => {
            const order = orderOf.get(nodeId);

            nodes.push({
                id: nodeId,
                values: {
                    onPath: order !== undefined,
                    order,
                    distance: distances.get(nodeId)?.distance ?? Infinity,
                },
            });
        });

        const routeEdges = this.getPathEdges(path);
        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Marking the route", Array.from(dataManager.edges.values()), (edge) => {
            // The pair keys are how an @graphty/algorithms route is matched back onto element
            // edges; the id PUBLISHED is the element's own, because a pair cannot name one of two
            // parallel edges and a style layer has to be able to.
            const key = edgePairKey(edge.srcId, edge.dstId);
            const reversed = edgePairKey(edge.dstId, edge.srcId);

            edges.push({ id: edge.id, values: { onPath: routeEdges.has(key) || routeEdges.has(reversed) } });
        });

        return {
            shape: "path",
            fields: [...PATH_FIELD_SPECS, { name: "distance", kind: "node", type: "number" }],
            nodes,
            edges,
            graph: {
                length: path.length,
                cost: route?.distance ?? 0,
                hops: Math.max(path.length - 1, 0),
            },
            caveats: declaredCaveats({
                method: "dijkstra",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "distance" },
                notes:
                    route === null
                        ? [`No route runs from ${String(source)} to ${String(target)}.`]
                        : [`Route from ${String(source)} to ${String(target)}.`],
            }),
        };
    }

    /**
     * Get set of edge keys that are part of the path
     * @param path - Array of node IDs representing the path
     * @returns Set of edge keys in "srcId:dstId" format
     */
    private getPathEdges(path: (number | string)[]): Set<string> {
        const edges = new Set<string>();

        for (let i = 0; i < path.length - 1; i++) {
            edges.add(edgePairKey(path[i], path[i + 1]));
        }

        return edges;
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(DijkstraAlgorithm);
