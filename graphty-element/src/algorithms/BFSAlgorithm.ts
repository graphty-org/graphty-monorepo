import { breadthFirstSearch } from "@graphty/algorithms";
import { INVALID_INDEX } from "@graphty/graph-format";
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

        const targetNode = this._schemaOptions.targetNode ?? undefined;
        const declared = this.graph.getDataManager().getSnapshot();

        if (declared.nodeCount === 0) {
            return null;
        }

        /* Get source from legacy options, schema options, or use the graph's first node. The
           DEFAULT comes from the snapshot rather than from the render objects, because the
           snapshot is what the walk is over: a record the scene has not built a mesh for is in it
           already, and a record with an id the graph could not store is not. The undirected view
           renumbers edges, never nodes, so the first node is the same one on either route. */
        const source = this.legacyOptions?.source ?? this._schemaOptions.source ?? declared.ids.idOf(0);

        /* A run that stops early at a target visits a different set of nodes, and no index-based
           port has an early stop, so this one keeps the reference implementation and says so in
           its notes. The decision is taken before the undirected view is derived, so a walk that
           never reaches the accelerator does not pay for the trip. */
        if (targetNode !== undefined) {
            return this.legacyWalk(context, nodeIds, source, targetNode);
        }

        // Undirected: the traversal follows an edge in either direction.
        const { snapshot, run } = this.accelerated("breadthFirstSearch", "undirected");
        const sourceIndex = this.nodeIndex(snapshot, "source", source);

        context.report({ phase: "Walking outwards", total: null });
        const { value, precision } = await run((dispatch, s) => dispatch.breadthFirstSearch(s, sourceIndex));

        // `order` holds the visited rows in visit order, so the position a node was reached in is
        // its place in that array.
        const orderOf = new Map<number, number>();
        for (let position = 0; position < value.visitedCount; position++) {
            orderOf.set(value.order[position], position);
        }

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Recording levels", nodeIds, (nodeId) => {
            const index = snapshot.ids.indexOf(nodeId);
            const level = index === INVALID_INDEX ? INVALID_INDEX : value.depth[index];

            // INVALID_INDEX is the port's "never reached", and a node the walk never reached
            // carries nothing at all -- it is not on level 0.
            if (level === INVALID_INDEX) {
                return;
            }

            nodes.push({ id: nodeId, values: { level, order: orderOf.get(index) } });
        });

        return {
            shape: "layered-grouping",
            fields: [...LAYERED_GROUPING_FIELD_SPECS, { name: "order", kind: "node", type: "integer" }],
            nodes,
            caveats: declaredCaveats({
                method: "bfs",
                direction: "undirected",
                weight: null,
                precision,
                notes: [`Walked outwards from ${String(source)}, which is level 0.`],
            }),
        };
    }

    /**
     * Walk with an early stop at a target, on the CPU reference implementation.
     * @param context - What the element gave the run.
     * @param nodeIds - The nodes to publish for.
     * @param source - Where the walk starts.
     * @param targetNode - Where it stops.
     * @returns The layered result, or null when the source is not in the graph.
     */
    private async legacyWalk(
        context: AlgorithmRunContext,
        nodeIds: readonly (number | string)[],
        source: number | string,
        targetNode: number | string,
    ): Promise<AlgorithmOutput | null> {
        const graphData = this.algorithmGraph("undirected");

        if (!graphData.hasNode(source)) {
            return null;
        }

        const levelOf = new Map<number | string, number>();
        const orderOf = new Map<number | string, number>();
        let targetFound = false;

        context.report({ phase: "Walking outwards", total: null });
        breadthFirstSearch(graphData, source, {
            targetNode,
            visitCallback: (node, level) => {
                levelOf.set(node, level);
                orderOf.set(node, orderOf.size);

                if (node === targetNode) {
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
            { name: "targetFound", kind: "graph", type: "boolean" },
        ];

        return {
            shape: "layered-grouping",
            fields,
            nodes,
            graph: { targetFound },
            caveats: declaredCaveats({
                method: "bfs",
                direction: "undirected",
                weight: null,
                notes: [
                    `Walked outwards from ${String(source)}, which is level 0.`,
                    `Computed on the CPU reference implementation: the walk stops early at ${String(targetNode)}, and no accelerated implementation has an early stop.`,
                ],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(BFSAlgorithm);
