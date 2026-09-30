import { INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { type ScopeInputDeclaration, scopeNodeIds } from "./input/ScopedInput";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
    metricFieldSpecs,
} from "./results";
import { type OptionsSchema } from "./types/OptionSchema";
import { declarationArcOrder, withoutArcsOf } from "./utils/graphUtils";

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
            description:
                "Walk recursively: with a pre-order target, the walk skips only the target's subtree and goes on instead of stopping",
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
    /** With a pre-order target, skip only the target's subtree instead of stopping the walk. */
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
    /** Walks the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
            description:
                "Walk recursively: with a pre-order target, the walk skips only the target's subtree and goes on instead of stopping",
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
        // The nodes of the run's input: its scope's, or the whole graph's.
        const nodeIds = scopeNodeIds(this.input("undirected"));

        if (nodeIds.length === 0) {
            return null;
        }

        // Get source from legacy options, schema options, or use first node as default
        // Legacy configure() takes precedence for backward compatibility
        const source = this.legacyOptions?.source ?? this._schemaOptions.source ?? nodeIds[0];
        const { targetNode, recursive, preOrder } = this._schemaOptions;

        // Undirected: the traversal follows an edge in either direction. No accelerator walks
        // depth first, so this is the CPU port's decision, made the same way as every other.
        const { snapshot, run } = this.accelerated("depthFirstSearch", "undirected");
        const sourceIndex = this.nodeIndex(snapshot, "source", source);
        // Only a pre-order walk stops at a target, so a post-order walk never reads one.
        const targetIndex =
            targetNode === null || !preOrder ? undefined : this.nodeIndex(snapshot, "targetNode", targetNode);

        /* Each node's neighbours are tried in the order their edges were declared, as the element's
           walks always have: the order IS the result here. A post-order walk runs to the end, since
           a node's place is known only once everything below it is done, so a target stops only a
           pre-order walk and a post-order one reaches everything it can. A recursive walk records
           the target and goes no further from it, but goes on elsewhere: the same walk over a view
           in which the target has no arcs of its own. */
        context.report({ phase: "Walking deep", total: null });
        const { value, precision } = await run((dispatch, s) => {
            const view = recursive && targetIndex !== undefined ? withoutArcsOf(s, targetIndex) : s;
            return dispatch.depthFirstSearch(view, sourceIndex, {
                arcOrder: declarationArcOrder(view),
                order: preOrder ? "pre" : "post",
                target: view === s ? targetIndex : undefined,
            });
        });

        const positionOf = new Map<number, number>();
        value.order.subarray(0, value.visitedCount).forEach((index, position) => positionOf.set(index, position));

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Recording the order", nodeIds, (nodeId) => {
            const index = snapshot.ids.indexOf(nodeId);
            const reached = index !== INVALID_INDEX && value.depth[index] !== INVALID_INDEX;

            nodes.push({ id: nodeId, values: { value: positionOf.get(index), visited: reached } });
        });

        return {
            shape: "node-metric",
            fields: [...metricFieldSpecs("node", "integer"), { name: "visited", kind: "node", type: "boolean" }],
            nodes,
            caveats: declaredCaveats({
                method: "dfs",
                direction: "undirected",
                weight: null,
                precision,
                notes: [
                    `Walked from ${String(source)}, ${preOrder ? "recording each node as it was reached" : "recording each node as it was left"}.`,
                ],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(DFSAlgorithm);
