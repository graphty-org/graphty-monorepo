import { INVALID_INDEX } from "@graphty/graph-format";
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
            description:
                "Accepted and ignored: the shortest-path search relaxes outwards from the source in one direction, and the route it finds is the same one either way",
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
    /** Accepted and ignored; see the option's description. */
    bidirectional: boolean;
}

/**
 * Dijkstra's algorithm for finding shortest paths
 *
 * Computes shortest paths from a source node to all other nodes using
 * non-negative edge weights.
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
            description:
                "Accepted and ignored: the shortest-path search relaxes outwards from the source in one direction, and the route it finds is the same one either way",
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

        // Undirected: a shortest path may cross an edge in either direction.
        const { snapshot, edgeRemap, run } = this.accelerated("sssp", "undirected");

        if (snapshot.nodeCount === 0) {
            return null;
        }

        /* Get source and target from legacy options, schema options, or use the graph's first and
           last node. The DEFAULTS come from the snapshot rather than from the render objects,
           because the snapshot is what the search runs over. */
        const { ids } = snapshot;
        const source = this.legacyOptions?.source ?? this._schemaOptions.source ?? ids.idOf(0);
        const target = this.legacyOptions?.target ?? this._schemaOptions.target ?? ids.idOf(snapshot.nodeCount - 1);
        const sourceIndex = this.nodeIndex(snapshot, "source", source);
        const targetIndex = this.nodeIndex(snapshot, "target", target);

        context.report({ phase: "Searching for the route", total: null });
        const { value, precision } = await run((dispatch, s) => dispatch.sssp(s, sourceIndex));

        /* ONE search answers both questions this run publishes. The distances come straight out of
           it, and the route is walked back from the target through the predecessor arcs -- which
           the dispatcher attaches to an accelerator's bare result too, so there is one loop here
           whichever path ran. */
        const path = value.pathTo(targetIndex);
        const routeEdges = new Set<number>(value.pathEdges(targetIndex));
        const orderOf = new Map<number, number>();
        path.forEach((index, position) => orderOf.set(index, position));

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Marking the route", nodeIds, (nodeId) => {
            const index = ids.indexOf(nodeId);
            const order = index === INVALID_INDEX ? undefined : orderOf.get(index);

            nodes.push({
                id: nodeId,
                values: {
                    onPath: order !== undefined,
                    order,
                    distance: index === INVALID_INDEX ? Infinity : value.dist[index],
                },
            });
        });

        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Marking the route", Array.from(dataManager.edges.values()), (edge) => {
            /* The route names edges of the UNDIRECTED view, so the element's own edge is mapped
               onto that space rather than the other way round: both halves of a reciprocal pair
               that merged into one edge are on the route, and the id PUBLISHED is the element's
               own, because a merged edge cannot name one of two parallel edges and a style layer
               has to be able to. */
            const merged = edgeRemap === null ? edge.index : (edgeRemap[edge.index] ?? INVALID_INDEX);

            edges.push({ id: edge.id, values: { onPath: routeEdges.has(merged) } });
        });

        return {
            shape: "path",
            fields: [...PATH_FIELD_SPECS, { name: "distance", kind: "node", type: "number" }],
            nodes,
            edges,
            graph: {
                length: path.length,
                cost: path.length === 0 ? 0 : value.dist[targetIndex],
                hops: Math.max(path.length - 1, 0),
            },
            caveats: declaredCaveats({
                method: "dijkstra",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "distance" },
                precision,
                notes:
                    path.length === 0
                        ? [`No route runs from ${String(source)} to ${String(target)}.`]
                        : [`Route from ${String(source)} to ${String(target)}.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(DijkstraAlgorithm);
