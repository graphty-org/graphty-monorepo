import { INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod/v4";

import type { EdgeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { Algorithm } from "./Algorithm";
import type { SimplifyPolicy } from "./input/derivedInputs";
import { scopeEdges, type ScopeInputDeclaration, scopeNodeIds } from "./input/ScopedInput";
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
    /** Searches the run's scope: the node and edge lists and the graph all come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";
    /** A route takes the cheapest of a group of parallel edges, not their sum. */
    static parallelEdges: SimplifyPolicy = "min";

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
        // The nodes and edges of the run's input: its scope's, or the whole graph's.
        const input = this.input("undirected");
        const nodeIds = scopeNodeIds(input);

        if (nodeIds.length === 0) {
            return null;
        }

        // Undirected: a shortest path may cross an edge in either direction.
        const { snapshot, edgeRemap, run } = this.accelerated("sssp", "undirected");

        /* Get source and target from legacy options, schema options, or use the input's first and
           last node -- the scope's, for a scoped run. The DEFAULTS come from the snapshot rather
           than from the render objects, because the snapshot is what the search runs over. */
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

        /* The route names edges of the UNDIRECTED, simplified view, so each of the element's own
           edges is mapped onto that space. A merged route edge stands for every parallel edge
           between its pair, and the walk took ONE of them: the cheapest, the lowest row on a tie.
           Only that edge is on the route, so a path set made from the run names one edge per step
           (design/sets 4.4). A reciprocal pair read undirected is one step taken over both
           directions, so the cheapest edge of EACH direction is on it. */
        const scoped = scopeEdges(input);
        const { src, weights } = input.graph.edgeList();
        const taken = new Map<string, { row: number; weight: number }>();
        for (const edge of scoped) {
            const merged = edgeRemap === null ? edge.row : (edgeRemap[edge.row] ?? INVALID_INDEX);
            if (!routeEdges.has(merged)) {
                continue;
            }

            // A declared undirected edge has no direction to tell apart: one key per merged edge.
            const key = input.graph.directed ? `${String(merged)}>${String(src[edge.row])}` : String(merged);
            const weight = weights === null ? 1 : weights[edge.row];
            const best = taken.get(key);
            if (best === undefined || weight < best.weight) {
                taken.set(key, { row: edge.row, weight });
            }
        }

        const onRoute = new Set([...taken.values()].map((entry) => entry.row));
        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Marking the route", scoped, (edge) => {
            // The id PUBLISHED is the element's own, which a style layer can name.
            edges.push({ id: edge.id, values: { onPath: onRoute.has(edge.row) } });
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
