import { bellmanFord } from "@graphty/algorithms";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema as ZodOptionsSchema, type SuggestedStylesConfig } from "../config";
import type { Graph } from "../Graph";
import { Algorithm } from "./Algorithm";
import type { OptionsSchema } from "./types/OptionSchema";
import { toAlgorithmGraph } from "./utils/graphConverter";

/**
 * Zod-based options schema for Bellman-Ford algorithm
 */
export const bellmanFordOptionsSchema = defineOptions({
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
export class BellmanFordAlgorithm extends Algorithm<BellmanFordOptions> {
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

    static suggestedStyles = (): SuggestedStylesConfig => ({
        layers: [
            {
                edge: {
                    selector: "",
                    style: { enabled: true },
                    calculatedStyle: {
                        inputs: ["algorithmResults.graphty.bellman-ford.isInPath"],
                        output: "style.line.color",
                        expr: "{ return StyleHelpers.color.binary.blueHighlight(arguments[0]) }",
                    },
                },
                metadata: {
                    name: "Bellman-Ford - Path Edges",
                    description: "Highlights shortest path edges (blue) - colorblind-safe",
                },
            },
            {
                node: {
                    selector: "",
                    style: { enabled: true },
                    calculatedStyle: {
                        inputs: ["algorithmResults.graphty.bellman-ford.isInPath"],
                        output: "style.texture.color",
                        expr: "{ return StyleHelpers.color.binary.blueHighlight(arguments[0]) }",
                    },
                },
                metadata: {
                    name: "Bellman-Ford - Path Nodes",
                    description: "Highlights path nodes (blue) - colorblind-safe",
                },
            },
            {
                node: {
                    selector: "",
                    style: { enabled: true },
                    calculatedStyle: {
                        inputs: ["algorithmResults.graphty.bellman-ford.distancePct"],
                        output: "style.opacity",
                        expr: "{ return StyleHelpers.opacity.linear(1 - (arguments[0] ?? 0)) }",
                    },
                },
                metadata: {
                    name: "Bellman-Ford - Distance Fade",
                    description: "Fades nodes by distance from source (closer = more visible)",
                },
            },
        ],
        description: "Visualizes shortest paths with support for negative edge weights",
        category: "path",
    });

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
     * Executes the Bellman-Ford algorithm on the graph
     *
     * Computes shortest path distances and highlights the path from source to target.
     */
    async run(): Promise<void> {
        const g = this.graph;
        const dm = g.getDataManager();
        const nodes = Array.from(dm.nodes.keys());
        const n = nodes.length;

        if (n === 0) {
            return;
        }

        // Get source and target from legacy options, schema options, or use defaults
        // Legacy configure() takes precedence for backward compatibility
        const source = this.legacyOptions?.source ?? this._schemaOptions.source ?? nodes[0];
        const target = this.legacyOptions?.target ?? this._schemaOptions.target ?? nodes[nodes.length - 1];

        // Convert to @graphty/algorithms format
        // Note: Using directed=false (default) so converter adds reverse edges for undirected path finding
        const graphData = toAlgorithmGraph(g as unknown as Graph, { directed: false });

        // Run Bellman-Ford algorithm
        const result = bellmanFord(graphData, source);

        // Store negative cycle information at graph level
        this.addGraphResult("hasNegativeCycle", result.hasNegativeCycle);
        if (result.negativeCycleNodes.length > 0) {
            this.addGraphResult("negativeCycleNodes", result.negativeCycleNodes);
        }

        // Find max distance for normalization (excluding Infinity)
        let maxDistance = 0;
        for (const dist of result.distances.values()) {
            if (isFinite(dist) && dist > maxDistance) {
                maxDistance = dist;
            }
        }

        // Store distance results on nodes
        for (const nodeId of nodes) {
            const distance = result.distances.get(nodeId) ?? Infinity;
            this.addNodeResult(nodeId, "distance", distance);

            // Normalize distance to percentage
            const distancePct = maxDistance > 0 && isFinite(distance) ? distance / maxDistance : 0;
            this.addNodeResult(nodeId, "distancePct", distancePct);
        }

        // Mark the path from source to target
        {
            const path = this.reconstructPath(result.predecessors, source, target);
            const pathNodeSet = new Set(path);

            // Mark nodes in path
            for (const nodeId of nodes) {
                const isInPath = pathNodeSet.has(nodeId);
                this.addNodeResult(nodeId, "isInPath", isInPath);
            }

            // Mark edges in path
            const pathEdges = this.getPathEdges(path);
            for (const edge of dm.edges.values()) {
                const edgeKey = `${edge.srcId}:${edge.dstId}`;
                const reverseEdgeKey = `${edge.dstId}:${edge.srcId}`;
                const isInPath = pathEdges.has(edgeKey) || pathEdges.has(reverseEdgeKey);
                this.addEdgeResult(edge, "isInPath", isInPath);
            }
        }
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
            edges.add(`${path[i]}:${path[i + 1]}`);
        }

        return edges;
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(BellmanFordAlgorithm);
