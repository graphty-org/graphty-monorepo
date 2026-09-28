import { INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod/v4";

import type { EdgeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import { scopeEdges, type ScopeInputDeclaration, scopeNodeIds } from "./input/ScopedInput";
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
    /** Searches the run's scope: the node and edge lists and the graph all come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
        // The nodes and edges of the run's input: its scope's, or the whole graph's.
        const input = this.input("undirected");
        const nodeIds = scopeNodeIds(input);

        if (nodeIds.length === 0) {
            return null;
        }

        // Get source and target from legacy options, schema options, or use defaults
        // Legacy configure() takes precedence for backward compatibility
        const source = this.legacyOptions?.source ?? this._schemaOptions.source ?? nodeIds[0];
        const target = this.legacyOptions?.target ?? this._schemaOptions.target ?? nodeIds[nodeIds.length - 1];

        /* Undirected: a shortest path may cross an edge in either direction, and a negative edge
           read that way is a loop of its own. No accelerator the element hands work to runs
           Bellman-Ford, so this is the CPU port's decision. */
        const { snapshot, edgeRemap, run } = this.accelerated("bellmanFord", "undirected");
        const sourceIndex = this.nodeIndex(snapshot, "source", source);
        const targetIndex = this.nodeIndex(snapshot, "target", target);

        context.report({ phase: "Relaxing edges", total: null });
        const { value, precision } = await run((dispatch, s) => dispatch.bellmanFord(s, sourceIndex));

        /* With a negative loop the predecessors can chase each other round it, so no route is
           read off them: the distances are published, and the graph half says why there is no
           route. */
        const path = value.hasNegativeCycle ? new Uint32Array(0) : value.pathTo(targetIndex);
        const routeEdges = new Set<number>(value.hasNegativeCycle ? [] : value.pathEdges(targetIndex));
        const orderOf = new Map<number, number>();
        path.forEach((index, position) => orderOf.set(index, position));

        const { ids } = snapshot;
        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Marking the route", nodeIds, (nodeId) => {
            const index = ids.indexOf(nodeId);
            const order = index === INVALID_INDEX ? undefined : orderOf.get(index);
            const distance = index === INVALID_INDEX ? Infinity : value.dist[index];

            nodes.push({ id: nodeId, values: { onPath: order !== undefined, order, distance } });
        });

        /* The route names edges of the UNDIRECTED, simplified view, so each of the element's own
           edges is mapped onto that space: both records of a reciprocal pair, and every edge of a
           parallel group, stand for the one merged edge the route crossed, and all of them are on
           it. The id PUBLISHED is the element's own, which a style layer can name. */
        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Marking the route", scopeEdges(input), (edge) => {
            const merged = edgeRemap === null ? edge.row : (edgeRemap[edge.row] ?? INVALID_INDEX);
            edges.push({ id: edge.id, values: { onPath: routeEdges.has(merged) } });
        });

        const notes = [`Route from ${String(source)} to ${String(target)}.`];
        if (value.hasNegativeCycle) {
            notes.push(
                "A loop that costs less every time round was found, so no distance past it is meaningful and no route is marked.",
            );
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
                cost: path.length > 0 ? value.dist[targetIndex] : 0,
                hops: Math.max(path.length - 1, 0),
                hasNegativeCycle: value.hasNegativeCycle,
            },
            caveats: declaredCaveats({
                method: "bellman-ford",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "distance" },
                precision,
                notes,
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(BellmanFordAlgorithm);
