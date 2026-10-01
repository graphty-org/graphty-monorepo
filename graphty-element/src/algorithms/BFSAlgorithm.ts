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
    LAYERED_GROUPING_FIELD_SPECS,
    type ResultFieldSpec,
} from "./results";
import { type OptionsSchema } from "./types/OptionSchema";
import { declarationArcOrder } from "./utils/graphUtils";

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
    /** Walks the run's scope: the node list and the graph both come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
        // The nodes of the run's input, in row order: its scope's, or every node of the graph.
        const nodeIds = scopeNodeIds(this.input("undirected"));

        if (nodeIds.length === 0) {
            return null;
        }

        const targetNode = this._schemaOptions.targetNode ?? undefined;

        /* Get source from legacy options, schema options, or use the input's first node. The
           DEFAULT comes from the input rather than from the render objects, because the input is
           what the walk is over: a record the scene has not built a mesh for is in it already,
           a record with an id the graph could not store is not, and a scoped run starts from its
           scope's first node. The undirected view renumbers edges, never nodes, so the first node
           is the same one on either route. */
        const source = this.legacyOptions?.source ?? this._schemaOptions.source ?? nodeIds[0];

        /* Undirected: the traversal follows an edge in either direction.

           A walk that stops at a target is not one an accelerator answers -- a GPU walk expands
           whole levels at once -- so the decision says so before any work starts. It also tries
           each node's neighbours in the order their edges were declared: which nodes it expands
           before it reaches the target depends on that order, and the element's walks have always
           used it. A walk with no target keeps row order, which an accelerator can reproduce and
           which reaches every node on the same level either way. */
        const { snapshot, run } = this.accelerated("breadthFirstSearch", "undirected", {
            accelerable: targetNode === undefined,
        });
        const sourceIndex = this.nodeIndex(snapshot, "source", source);
        const targetIndex = targetNode === undefined ? undefined : this.nodeIndex(snapshot, "targetNode", targetNode);

        context.report({ phase: "Walking outwards", total: null });
        const { value, precision } = await run((dispatch, s) =>
            dispatch.breadthFirstSearch(
                s,
                sourceIndex,
                targetIndex === undefined ? undefined : { target: targetIndex, arcOrder: declarationArcOrder(s) },
            ),
        );

        /* `order` holds the visited rows in visit order, so the position a node was reached in is
           its place in that array. A walk that stopped at its target discovered some nodes it
           never expanded; they sit after the target in `order`, and the walk did not reach them in
           the sense a reader means, so they carry nothing. */
        const visited = value.order.subarray(0, value.visitedCount);
        const stop = targetIndex === undefined ? -1 : visited.indexOf(targetIndex);
        const expanded = stop === -1 ? visited : visited.subarray(0, stop + 1);
        const orderOf = new Map<number, number>();
        expanded.forEach((index, position) => orderOf.set(index, position));

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Recording levels", nodeIds, (nodeId) => {
            const index = snapshot.ids.indexOf(nodeId);
            const order = index === INVALID_INDEX ? undefined : orderOf.get(index);

            // A node the walk never reached carries nothing at all -- it is not on level 0.
            if (order === undefined) {
                return;
            }

            nodes.push({ id: nodeId, values: { level: value.depth[index], order } });
        });

        const fields: ResultFieldSpec[] = [
            ...LAYERED_GROUPING_FIELD_SPECS,
            { name: "order", kind: "node", type: "integer" },
        ];
        const notes = [`Walked outwards from ${String(source)}, which is level 0.`];

        if (targetNode !== undefined) {
            fields.push({ name: "targetFound", kind: "graph", type: "boolean" });
            notes.push(
                stop === -1
                    ? `The walk never reached ${String(targetNode)}, so it covered everything reachable.`
                    : `The walk stopped at ${String(targetNode)}.`,
            );
        }

        return {
            shape: "layered-grouping",
            fields,
            nodes,
            ...(targetNode === undefined ? {} : { graph: { targetFound: stop !== -1 } }),
            caveats: declaredCaveats({
                method: "bfs",
                direction: "undirected",
                weight: null,
                precision,
                notes,
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(BFSAlgorithm);
