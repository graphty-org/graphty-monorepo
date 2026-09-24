import { depthFirstSearch } from "@graphty/algorithms";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
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
import { type OptionsSchema } from "./types/OptionSchema";

/**
 * Zod-based options schema for DFS algorithm
 */
const dfsOptionsSchema = defineOptions({
    source: {
        schema: z.union([z.string(), z.number()]).nullable().default(null),
        meta: {
            label: "Source Node",
            description: "Starting node for DFS traversal (uses first node if not set)",
        },
    },
    targetNode: {
        schema: z.union([z.string(), z.number()]).nullable().default(null),
        meta: {
            label: "Target Node",
            description: "Target node for early termination (optional - searches all nodes if not set)",
            advanced: true,
        },
    },
    recursive: {
        schema: z.boolean().default(false),
        meta: {
            label: "Recursive",
            description: "Use recursive implementation instead of iterative (may cause stack overflow on large graphs)",
            advanced: true,
        },
    },
    preOrder: {
        schema: z.boolean().default(true),
        meta: {
            label: "Pre-Order",
            description: "Visit nodes before their children (pre-order) vs after (post-order)",
            advanced: true,
        },
    },
});

/**
 * Options for DFS algorithm
 */
interface DFSOptions extends Record<string, unknown> {
    /** Starting node for traversal (defaults to first node if not provided) */
    source: number | string | null;
    /** Target node for early termination (optional) */
    targetNode: number | string | null;
    /** Use recursive implementation vs iterative */
    recursive: boolean;
    /** Use pre-order traversal (visit before children) vs post-order */
    preOrder: boolean;
}

/**
 * Depth-First Search (DFS) algorithm for graph traversal
 *
 * Performs a depth-first traversal from a source node, computing discovery time,
 * finish time, and predecessor relationships for each reachable node.
 */
export class DFSAlgorithm extends DeclaredAlgorithm<DFSOptions> {
    static namespace = "graphty";
    static type = "dfs";

    static zodOptionsSchema: ZodOptionsSchema = dfsOptionsSchema;

    /**
     * Options schema for DFS algorithm
     */
    static optionsSchema: OptionsSchema = {
        source: {
            type: "nodeId",
            default: null,
            label: "Source Node",
            description: "Starting node for DFS traversal (uses first node if not set)",
            required: false,
        },
        targetNode: {
            type: "nodeId",
            default: null,
            label: "Target Node",
            description: "Target node for early termination (optional - searches all nodes if not set)",
            required: false,
            advanced: true,
        },
        recursive: {
            type: "boolean",
            default: false,
            label: "Recursive",
            description: "Use recursive implementation instead of iterative (may cause stack overflow on large graphs)",
            advanced: true,
        },
        preOrder: {
            type: "boolean",
            default: true,
            label: "Pre-Order",
            description: "Visit nodes before their children (pre-order) vs after (post-order)",
            advanced: true,
        },
    };

    /**
     * Legacy options set via configure() for backward compatibility
     */
    private legacyOptions: { source: number | string } | null = null;

    /**
     * Configure the algorithm with source node
     * @param options - Configuration options
     * @param options.source - The source node to start DFS from
     * @returns This algorithm instance for chaining
     * @deprecated Use constructor options instead. This method is kept for backward compatibility.
     */
    configure(options: { source: number | string }): this {
        this.legacyOptions = options;
        return this;
    }

    /**
     * Walk as deep as possible from one node before backtracking.
     *
     * What a depth-first walk produces is one number per node -- the position it was reached in
     * -- so the result is a node metric, and the ranking and range of that column come from the
     * element rather than from here. A node the walk never reached carries no position, and says
     * so with `visited`, because "not reached" and "reached first" are not the same answer.
     * @param context - What the element gave the run.
     * @returns The exploration order, or null when there is nothing to walk.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const dataManager = this.graph.getDataManager();
        const nodeIds = Array.from(dataManager.nodes.keys());

        if (nodeIds.length === 0) {
            return null;
        }

        // Get source from legacy options, schema options, or use first node as default
        // Legacy configure() takes precedence for backward compatibility
        const source = this.legacyOptions?.source ?? this._schemaOptions.source ?? nodeIds[0];
        const { targetNode, recursive, preOrder } = this._schemaOptions;

        if (!dataManager.nodes.has(source)) {
            return null;
        }

        // Undirected: the traversal follows an edge in either direction.
        const graphData = this.algorithmGraph("undirected");

        context.report({ phase: "Walking deep", total: null });
        const result = depthFirstSearch(graphData, source, {
            targetNode: targetNode ?? undefined,
            recursive,
            preOrder,
        });

        const positionOf = new Map<number | string, number>();
        result.order.forEach((nodeId, position) => positionOf.set(nodeId, position));

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Recording the order", nodeIds, (nodeId) => {
            const position = positionOf.get(nodeId);

            nodes.push({ id: nodeId, values: { value: position, visited: result.visited.has(nodeId) } });
        });

        return {
            shape: "node-metric",
            fields: [...metricFieldSpecs("node", "integer"), { name: "visited", kind: "node", type: "boolean" }],
            nodes,
            caveats: declaredCaveats({
                method: "dfs",
                direction: "undirected",
                weight: null,
                notes: [`Walked from ${String(source)}, ${preOrder ? "recording each node as it was reached" : "recording each node as it was left"}.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(DFSAlgorithm);
