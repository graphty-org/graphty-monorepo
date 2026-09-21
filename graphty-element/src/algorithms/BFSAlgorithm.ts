import { breadthFirstSearch } from "@graphty/algorithms";
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
    LAYERED_GROUPING_FIELD_SPECS,
    type ResultFieldSpec,
} from "./results";
import { type OptionsSchema } from "./types/OptionSchema";

/**
 * Zod-based options schema for BFS algorithm
 */
const bfsOptionsSchema = defineOptions({
    source: {
        schema: z.union([z.string(), z.number()]).nullable().default(null),
        meta: {
            label: "Source Node",
            description: "Starting node for BFS traversal (uses first node if not set)",
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
});

/**
 * Options for BFS algorithm
 */
interface BFSOptions extends Record<string, unknown> {
    /** Starting node for traversal (defaults to first node if not provided) */
    source: number | string | null;
    /** Target node for early termination (optional) */
    targetNode: number | string | null;
}

/**
 * Breadth-First Search (BFS) algorithm for graph traversal
 *
 * Performs a breadth-first traversal from a source node, computing level information
 * and predecessor relationships for each reachable node.
 */
export class BFSAlgorithm extends DeclaredAlgorithm<BFSOptions> {
    static namespace = "graphty";
    static type = "bfs";

    static zodOptionsSchema: ZodOptionsSchema = bfsOptionsSchema;

    /**
     * Options schema for BFS algorithm
     */
    static optionsSchema: OptionsSchema = {
        source: {
            type: "nodeId",
            default: null,
            label: "Source Node",
            description: "Starting node for BFS traversal (uses first node if not set)",
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
    };

    /**
     * Legacy options set via configure() for backward compatibility
     */
    private legacyOptions: { source: number | string } | null = null;

    /**
     * Configure the algorithm with source node
     * @param options - Configuration options
     * @param options.source - The source node to start BFS from
     * @returns This algorithm instance for chaining
     * @deprecated Use constructor options instead. This method is kept for backward compatibility.
     */
    configure(options: { source: number | string }): this {
        this.legacyOptions = options;
        return this;
    }

    /**
     * Walk outwards from one node a level at a time.
     *
     * A breadth-first walk sorts the graph into layers, so the result is shaped as a layered
     * grouping: every reached node carries the level it sits on and the position it was reached
     * in, and the element derives how many nodes share each level and how many levels there are.
     * A node the walk never reached carries nothing at all -- it is not on level 0, and saying so
     * would put every unreachable node in the same layer as the source.
     * @param context - What the element gave the run.
     * @returns The layered result, or null when there is nothing to walk.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const nodeIds = Array.from(this.graph.getDataManager().nodes.keys());

        if (nodeIds.length === 0) {
            return null;
        }

        // Get source from legacy options, schema options, or use first node as default
        // Legacy configure() takes precedence for backward compatibility
        const source = this.legacyOptions?.source ?? this._schemaOptions.source ?? nodeIds[0];
        const targetNode = this._schemaOptions.targetNode ?? undefined;

        // Undirected: the traversal follows an edge in either direction.
        const graphData = this.algorithmGraph("undirected");

        if (!graphData.hasNode(source)) {
            return null;
        }

        const levelOf = new Map<number | string, number>();
        const orderOf = new Map<number | string, number>();
        let deepest = 0;
        let targetFound = false;

        context.report({ phase: "Walking outwards", total: null });
        breadthFirstSearch(graphData, source, {
            targetNode,
            visitCallback: (node, level) => {
                levelOf.set(node, level);
                orderOf.set(node, orderOf.size);
                deepest = Math.max(deepest, level);

                if (targetNode !== undefined && node === targetNode) {
                    targetFound = true;
                }
            },
        });

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Recording levels", nodeIds, (nodeId) => {
            const level = levelOf.get(nodeId);

            if (level === undefined) {
                return;
            }

            nodes.push({ id: nodeId, values: { level, order: orderOf.get(nodeId) } });
        });

        const fields: ResultFieldSpec[] = [
            ...LAYERED_GROUPING_FIELD_SPECS,
            { name: "order", kind: "node", type: "integer" },
        ];

        if (targetNode !== undefined) {
            fields.push({ name: "targetFound", kind: "graph", type: "boolean" });
        }

        return {
            shape: "layered-grouping",
            fields,
            nodes,
            graph: targetNode === undefined ? undefined : { targetFound },
            caveats: declaredCaveats({
                method: "bfs",
                direction: "undirected",
                weight: null,
                notes: [`Walked outwards from ${String(source)}, which is level 0.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(BFSAlgorithm);
