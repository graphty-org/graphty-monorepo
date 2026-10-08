import { astar } from "@graphty/algorithms";
import { type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
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
import type { OptionsSchema } from "./types/OptionSchema";
import { routeEdgeRows } from "./utils/routeEdges";

const SOURCE_DESCRIPTION = "Starting node for the route (uses first node if not set)";
const TARGET_DESCRIPTION = "Destination node for the route (uses last node if not set)";
const HEURISTIC_DESCRIPTION =
    "How the search guesses the distance still to go. None always finds the shortest route. Layout distance uses the straight-line distance between the nodes' current positions: faster on a laid-out graph, but the route may not be the shortest when edge weights are smaller than the distances they span";

const HEURISTICS = ["none", "layout-distance"] as const;

const astarOptionsSchema = defineOptions({
    source: {
        schema: z.union([z.string(), z.number()]).nullable().default(null),
        meta: { label: "Source Node", description: SOURCE_DESCRIPTION },
    },
    target: {
        schema: z.union([z.string(), z.number()]).nullable().default(null),
        meta: { label: "Target Node", description: TARGET_DESCRIPTION },
    },
    heuristic: {
        schema: z.enum(HEURISTICS).default("none"),
        meta: { label: "Heuristic", description: HEURISTIC_DESCRIPTION },
    },
});

/** Options for A*. */
interface AStarOptions extends Record<string, unknown> {
    /** Starting node; the first node when null. */
    source: number | string | null;
    /** Destination node; the last node when null. */
    target: number | string | null;
    /** The estimate of the distance still to go. */
    heuristic: (typeof HEURISTICS)[number];
}

/**
 * The straight-line distance between two nodes' current positions, as an A* heuristic over a
 * snapshot's node indices. A node with no position yet estimates 0, which never misleads the search.
 * @param graph - The declared graph, which carries the element's position column.
 * @param searched - The snapshot the search runs over.
 * @returns The heuristic.
 */
function layoutDistance(graph: GraphSnapshot, searched: GraphSnapshot): (node: number, target: number) => number {
    const column = graph.nodes.byRole("position");
    const xyz = column?.dtype === "f32" || column?.dtype === "f64" ? column.data : null;
    if (xyz === null) {
        return () => 0;
    }

    const rowOf = (index: number): number => graph.ids.indexOf(searched.ids.idOf(index));

    return (node, target) => {
        const a = rowOf(node) * 3;
        const b = rowOf(target) * 3;
        const d = Math.hypot(xyz[a] - xyz[b], xyz[a + 1] - xyz[b + 1], xyz[a + 2] - xyz[b + 2]);
        return Number.isFinite(d) ? d : 0;
    };
}

/**
 * A* search for the cheapest route between two nodes.
 *
 * With the default heuristic, `none`, A* estimates nothing and finds exactly the route Dijkstra
 * finds. With `layout-distance` it is steered by where the nodes are drawn, which is only a lower
 * bound on the route's cost when every edge weighs at least the distance it spans; otherwise the
 * route it returns may not be the cheapest, and the caveats say so.
 *
 * Publishes the path shape's fields, like the shortest-path key.
 */
export class AStarAlgorithm extends DeclaredAlgorithm<AStarOptions> {
    static readonly namespace = "graphty";
    static readonly type = "astar";
    /** Searches the run's scope: the node and edge lists and the graph all come from the input. */
    static readonly scopeInput: ScopeInputDeclaration = "subgraph";
    /** A route takes the cheapest of a group of parallel edges, not their sum. */
    static readonly parallelEdges: SimplifyPolicy = "min";

    static readonly zodOptionsSchema: ZodOptionsSchema = astarOptionsSchema;

    static readonly optionsSchema: OptionsSchema = {
        source: {
            type: "nodeId",
            default: null,
            label: "Source Node",
            description: SOURCE_DESCRIPTION,
            required: false,
        },
        target: {
            type: "nodeId",
            default: null,
            label: "Target Node",
            description: TARGET_DESCRIPTION,
            required: false,
        },
        heuristic: {
            type: "select",
            default: "none",
            label: "Heuristic",
            description: HEURISTIC_DESCRIPTION,
            options: [
                { value: "none", label: "None" },
                { value: "layout-distance", label: "Layout distance" },
            ],
        },
    };

    /**
     * Find a route from the source to the target.
     * @param context - What the element gave the run.
     * @returns The route, or null when there are no nodes to search.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const input = this.input("undirected");
        const nodeIds = scopeNodeIds(input);

        if (nodeIds.length === 0) {
            return null;
        }

        // Undirected: a route may cross an edge in either direction. No accelerator implements A*.
        const { snapshot, edgeRemap } = input.derived();
        const { ids } = snapshot;
        const { heuristic } = this.schemaOptions;
        const source = this.schemaOptions.source ?? ids.idOf(0);
        const target = this.schemaOptions.target ?? ids.idOf(snapshot.nodeCount - 1);
        const sourceIndex = this.nodeIndex(snapshot, "source", source);
        const targetIndex = this.nodeIndex(snapshot, "target", target);
        const estimate = heuristic === "none" ? () => 0 : layoutDistance(input.graph, snapshot);

        context.report({ phase: "Searching for the route", total: null });
        const value = astar(snapshot, sourceIndex, targetIndex, estimate);
        context.signal.throwIfAborted();

        const orderOf = new Map<number, number>();
        value.path.forEach((index, position) => orderOf.set(index, position));

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Marking the route", nodeIds, (nodeId) => {
            const index = ids.indexOf(nodeId);
            const order = index === INVALID_INDEX ? undefined : orderOf.get(index);
            nodes.push({ id: nodeId, values: { onPath: order !== undefined, order } });
        });

        const scoped = scopeEdges(input);
        const onRoute = routeEdgeRows(input, scoped, edgeRemap, new Set(value.edges));
        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Marking the route", scoped, (edge) => {
            edges.push({ id: edge.id, values: { onPath: onRoute.has(edge.row) } });
        });

        const found = value.path.length > 0;

        return {
            shape: "path",
            fields: PATH_FIELD_SPECS,
            nodes,
            edges,
            graph: {
                length: value.path.length,
                cost: found ? value.distance : 0,
                hops: Math.max(value.path.length - 1, 0),
            },
            caveats: declaredCaveats({
                method: heuristic === "none" ? "astar" : "astar-layout-distance",
                direction: "undirected",
                weight: { attribute: "weight", meaning: "distance" },
                exact: heuristic === "none",
                notes: [
                    found
                        ? `Route from ${String(source)} to ${String(target)}.`
                        : `No route runs from ${String(source)} to ${String(target)}.`,
                    ...(heuristic === "none"
                        ? []
                        : [
                              "Steered by the straight-line distance between the nodes' current positions: the route is the cheapest only when every edge weighs at least the distance it spans.",
                          ]),
                ],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(AStarAlgorithm);
