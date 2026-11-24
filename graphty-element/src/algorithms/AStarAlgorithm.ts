import { type GraphSnapshot, INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod";

import type { EdgeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { caveat } from "../session/runs/caveatFacts";
import { Algorithm } from "./Algorithm";
import type { SimplifyPolicy } from "./input/derivedInputs";
import { scopeEdges, type ScopeInputDeclaration, scopeNodeIds } from "./input/ScopedInput";
import { offThread } from "./offThread";
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
import { endpointIds, endpointOptions, endpointSchema } from "./utils/routeEndpoints";

const SOURCE_DESCRIPTION = "Starting node for the route (uses first node if not set)";
const TARGET_DESCRIPTION = "Destination node for the route (uses last node if not set)";
const HEURISTIC_DESCRIPTION =
    "How the search guesses the distance still to go. None always finds the shortest route. Layout distance uses the straight-line distance between the nodes' current positions: faster on a laid-out graph, but the route may not be the shortest when edge weights are smaller than the distances they span";

const HEURISTICS = ["none", "layout-distance"] as const;

const astarOptionsSchema = defineOptions({
    ...endpointOptions(SOURCE_DESCRIPTION, TARGET_DESCRIPTION),
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
 * Each searched node's current position, three numbers per node index, for the straight-line A*
 * heuristic; a node with no position yet reads NaN, which estimates 0 and never misleads the search.
 * Numbers rather than a function, so the search can run in the element's Worker.
 * @param graph - The declared graph, which carries the element's position column.
 * @param searched - The snapshot the search runs over.
 * @returns The positions, or null when the graph has none.
 */
function layoutPositions(graph: GraphSnapshot, searched: GraphSnapshot): Float64Array | null {
    const column = graph.nodes.byRole("position");
    const xyz = column?.dtype === "f32" || column?.dtype === "f64" ? column.data : null;
    if (xyz === null) {
        return null;
    }

    const out = new Float64Array(searched.nodeCount * 3).fill(Number.NaN);
    for (let index = 0; index < searched.nodeCount; index++) {
        const row = graph.ids.indexOf(searched.ids.idOf(index));
        if (row !== INVALID_INDEX) {
            out.set([xyz[row * 3], xyz[row * 3 + 1], xyz[row * 3 + 2]], index * 3);
        }
    }

    return out;
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
    /** The weight this algorithm reads; see `Algorithm.weightMeaning`. */
    static readonly weightMeaning = "distance" as const;
    /** Searches the run's scope: the node and edge lists and the graph all come from the input. */
    static readonly scopeInput: ScopeInputDeclaration = "subgraph";
    /** A route takes the cheapest of a group of parallel edges, not their sum. */
    static readonly parallelEdges: SimplifyPolicy = "min";

    static readonly zodOptionsSchema: ZodOptionsSchema = astarOptionsSchema;

    static readonly optionsSchema: OptionsSchema = {
        ...endpointSchema(SOURCE_DESCRIPTION, TARGET_DESCRIPTION),
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
        const { source, target } = endpointIds(snapshot, this.schemaOptions);
        const sourceIndex = this.nodeIndex(snapshot, "source", source);
        const targetIndex = this.nodeIndex(snapshot, "target", target);
        const positions = heuristic === "none" ? null : layoutPositions(input.graph, snapshot);

        context.report({ phase: "searching-for-the-route", total: null });
        const value = await offThread("astar", snapshot, context.signal, sourceIndex, targetIndex, positions);
        context.signal.throwIfAborted();

        const orderOf = new Map<number, number>();
        value.path.forEach((index, position) => orderOf.set(index, position));

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "marking-the-route", nodeIds, (nodeId) => {
            const index = ids.indexOf(nodeId);
            const order = index === INVALID_INDEX ? undefined : orderOf.get(index);
            nodes.push({ id: nodeId, values: { onPath: order !== undefined, order } });
        });

        const scoped = scopeEdges(input);
        const onRoute = routeEdgeRows(input, scoped, edgeRemap, new Set(value.edges));
        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "marking-the-route", scoped, (edge) => {
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
                ...this.weightCaveats(),
                exact: heuristic === "none",
                facts: [
                    caveat(found ? "route.found" : "route.none", { source, target }),
                    ...(heuristic === "none" ? [] : [caveat("astar.straight-line")]),
                ],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(AStarAlgorithm);
