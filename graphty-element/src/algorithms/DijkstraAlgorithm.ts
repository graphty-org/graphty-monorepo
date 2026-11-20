import { countShortestPaths, timeOrderedPaths } from "@graphty/algorithms";
import { type GraphSnapshot, INVALID_INDEX, type NumericVector } from "@graphty/graph-format";
import { z } from "zod";

import type { EdgeId, SelectionDirection } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import { GraphtyError } from "../errors";
import type { ResultElementValues } from "../session/results";
import { caveat } from "../session/runs/caveatFacts";
import { Algorithm } from "./Algorithm";
import { sessionColumns } from "./input/columns";
import type { SimplifyPolicy } from "./input/derivedInputs";
import { type ElementScopedInput, scopeEdges, type ScopeInputDeclaration, scopeNodeIds } from "./input/ScopedInput";
import { asStrength, type WeightReading } from "./input/weight";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
    PATH_FIELD_SPECS,
} from "./results";
import { type OptionsSchema } from "./types/OptionSchema";
import { routeEdgeRows, searchFollowing } from "./utils/routeEdges";

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
    direction: {
        schema: z.enum(["out", "in", "all"]).default("all"),
        meta: {
            label: "Follow Edges",
            description:
                "On a directed graph, which way the route may cross an edge: out (source to target), in (target to source) or all (either way). An undirected graph is always read either way",
            advanced: true,
        },
    },
    invertStrength: {
        schema: z.boolean().default(false),
        meta: {
            label: "Read Strength as Closeness",
            description:
                "When the weight read is a strength (a larger weight is a stronger connection), cross each edge at a cost of 1 / weight, so the route prefers strong edges. Off, a strength is left unread and every edge counts the same",
            advanced: true,
        },
    },
    timeOrder: {
        schema: z.string().nullable().default(null),
        meta: {
            label: "Time Order",
            description:
                "An edge column holding each edge's time. Set, the route only takes edges in time order: each edge at or after the one before it, and never an edge with no time",
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
    /** On a directed graph, which way the route may cross an edge; `"all"` (the default) reads it undirected. */
    direction: SelectionDirection;
    /** Read a strength weight as a cost of 1 / weight; false (the default) leaves a strength unread. */
    invertStrength: boolean;
    /** The edge column whose times a route must follow in order; null (the default) for none. */
    timeOrder: string | null;
}

/**
 * Dijkstra's algorithm for finding shortest paths
 *
 * Computes shortest paths from a source node to all other nodes using
 * non-negative edge weights.
 */
export class DijkstraAlgorithm extends DeclaredAlgorithm<DijkstraOptions> {
    static readonly namespace: string = "graphty";
    static readonly type: string = "dijkstra";
    /** The weight this algorithm reads; see `Algorithm.weightMeaning`. */
    static readonly weightMeaning = "distance" as const;
    /** Searches the run's scope: the node and edge lists and the graph all come from the input. */
    static readonly scopeInput: ScopeInputDeclaration = "subgraph";
    /** A route takes the cheapest of a group of parallel edges, not their sum. */
    static readonly parallelEdges: SimplifyPolicy = "min";

    static readonly zodOptionsSchema: ZodOptionsSchema = dijkstraOptionsSchema;

    /**
     * Options schema for Dijkstra algorithm
     */
    static readonly optionsSchema: OptionsSchema = {
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
        direction: {
            type: "select",
            default: "all",
            label: "Follow Edges",
            description:
                "On a directed graph, which way the route may cross an edge: out (source to target), in (target to source) or all (either way). An undirected graph is always read either way",
            options: [
                { value: "out", label: "Out" },
                { value: "in", label: "In" },
                { value: "all", label: "All" },
            ],
            advanced: true,
        },
        invertStrength: {
            type: "boolean",
            default: false,
            label: "Read Strength as Closeness",
            description:
                "When the weight read is a strength (a larger weight is a stronger connection), cross each edge at a cost of 1 / weight, so the route prefers strong edges. Off, a strength is left unread and every edge counts the same",
            advanced: true,
        },
        timeOrder: {
            type: "string",
            default: null,
            label: "Time Order",
            description:
                "An edge column holding each edge's time. Set, the route only takes edges in time order: each edge at or after the one before it, and never an edge with no time",
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
     * Whether a weight this run reads is below zero, which Dijkstra cannot answer.
     * @returns True when the run's input carries a negative weight.
     * @internal
     */
    readsNegativeWeight(): boolean {
        // An inverted strength is clamped above zero, so it never needs Bellman-Ford.
        return (
            !this.readsStrength() &&
            (this.input("undirected")
                .derived()
                .snapshot.weights?.some((weight) => weight < 0) ??
                false)
        );
    }

    /**
     * The weight this run reads. With `invertStrength`, a strength the distance reader would
     * leave unread is read, and crossed at 1 / weight.
     * @returns What the run reads.
     * @internal
     */
    protected override weightReading(): WeightReading {
        const reading = super.weightReading();
        if (!this._schemaOptions.invertStrength || reading.skipped?.params.meaning !== "strength") {
            return reading;
        }

        const { attribute } = reading.skipped.params as { attribute: string };
        const weight = Object.freeze({ attribute, meaning: "strength" as const });
        // The column is read again for this run: the input left it out as unreadable.
        return { weight, input: weight };
    }

    /**
     * Whether this run reads its weight as a strength, crossed at 1 / weight.
     * @returns True when it does.
     */
    private readsStrength(): boolean {
        return this.weightReading().weight?.meaning === "strength";
    }

    /**
     * A time-ordered route keeps every parallel edge, since each is a chance at another time; an
     * inverted strength keeps the strongest of a group, which is the cheapest to cross.
     * @returns The policy.
     * @internal
     */
    override parallelEdgePolicy(): SimplifyPolicy | undefined {
        if (this._schemaOptions.timeOrder !== null) {
            return "none";
        }

        return this.readsStrength() ? "max" : super.parallelEdgePolicy();
    }

    /**
     * The cost of crossing each arc of `s`: its weight, or 1 / weight for a strength.
     * @param s - The searched snapshot.
     * @returns The per-arc override, or undefined to read the snapshot's own weights.
     */
    private arcCosts(s: GraphSnapshot): NumericVector | undefined {
        const { weights } = s;
        return this.readsStrength() && weights !== null
            ? Float64Array.from(weights, (weight) => asStrength(weight, "distance"))
            : undefined;
    }

    /**
     * Each arc's time from the `timeOrder` column, negated for a route that follows edges
     * backwards (it walks back in time from the source).
     * @param input - The run's input.
     * @param s - The searched snapshot, or its transpose.
     * @param edgeRemap - Declared edge row to the searched snapshot's edge, or null when they agree.
     * @param backwards - True when the route follows edges against their direction.
     * @returns One time per arc of `s`; NaN where the edge carries none.
     */
    private arcTimes(
        input: ElementScopedInput,
        s: GraphSnapshot,
        edgeRemap: ArrayLike<number> | null,
        backwards: boolean,
    ): NumericVector {
        const path = this._schemaOptions.timeOrder ?? "";
        const read = sessionColumns(this.graph.getSession(), [], {}, "shortest-path").read(
            input.graph,
            path,
            "edge",
            (row) => input.edgeId(row),
        );
        if (read === null) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `No edge carries "${path}", the column the "timeOrder" option names`,
                source: "run",
                details: { option: "timeOrder", value: path },
            });
        }

        const edgeTime = new Float64Array(s.edgeCount).fill(Number.NaN);
        for (const { row } of scopeEdges(input)) {
            const edge = edgeRemap === null ? row : edgeRemap[row];
            // ponytail: a reciprocal pair read undirected is one edge and keeps its first time.
            if (edge < edgeTime.length && Number.isNaN(edgeTime[edge])) {
                edgeTime[edge] = timeOf(read.values[row]) * (backwards ? -1 : 1);
            }
        }

        return Float64Array.from(s.arcToEdge, (edge) => edgeTime[edge]);
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
        // "all", or any value on a graph loaded undirected: a route may cross an edge either way.
        const { direction } = this._schemaOptions;
        const directed = direction !== "all" && this.input("declared").graph.directed;
        // The nodes and edges of the run's input: its scope's, or the whole graph's.
        const input = this.input(directed ? "declared" : "undirected");
        const nodeIds = scopeNodeIds(input);

        if (nodeIds.length === 0) {
            return null;
        }

        const { snapshot, edgeRemap, run } = this.accelerated("sssp", directed ? "directed" : "undirected", {
            // No accelerator searches in time order.
            accelerable: this._schemaOptions.timeOrder === null,
        });

        /* Get source and target from legacy options, schema options, or use the input's first and
           last node -- the scope's, for a scoped run. The DEFAULTS come from the snapshot rather
           than from the render objects, because the snapshot is what the search runs over. */
        const { ids } = snapshot;
        const source = this.legacyOptions?.source ?? this._schemaOptions.source ?? ids.idOf(0);
        const target = this.legacyOptions?.target ?? this._schemaOptions.target ?? ids.idOf(snapshot.nodeCount - 1);
        const sourceIndex = this.nodeIndex(snapshot, "source", source);
        const targetIndex = this.nodeIndex(snapshot, "target", target);

        context.report({ phase: "searching-for-the-route", total: null });
        const backwards = directed && direction === "in";
        const { timeOrder } = this._schemaOptions;
        /* A time-ordered route is searched on the CPU over arc states, and its ties are not counted
           (tiedRoutes is absent). Otherwise the ties are counted over the same view and costs the
           search ran on, so an accelerator's f32 distances are compared with a tolerance. */
        const searched = await searchFollowing(this.graph, backwards, run, async (dispatch, s) => {
            const weights = this.arcCosts(s);
            if (timeOrder !== null) {
                const times = this.arcTimes(input, s, edgeRemap, backwards);
                return { result: timeOrderedPaths(s, sourceIndex, { times, weights }), ties: undefined };
            }

            const result = await dispatch.sssp(s, sourceIndex, { weights });
            return { result, ties: countShortestPaths(s, result.dist, sourceIndex, { weights })[targetIndex] };
        });
        const { precision } = searched;
        const { result: value, ties } = searched.value;

        /* ONE search answers both questions this run publishes. The distances come straight out of
           it, and the route is walked back from the target through the predecessor arcs -- which
           the dispatcher attaches to an accelerator's bare result too, so there is one loop here
           whichever path ran. */
        const path = value.pathTo(targetIndex);
        const routeEdges = new Set<number>(value.pathEdges(targetIndex));
        const orderOf = new Map<number, number>();
        path.forEach((index, position) => orderOf.set(index, position));

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "marking-the-route", nodeIds, (nodeId) => {
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

        // The element's own edges on the route: see routeEdgeRows.
        const scoped = scopeEdges(input);
        const onRoute = routeEdgeRows(input, scoped, edgeRemap, routeEdges, this.readsStrength());
        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "marking-the-route", scoped, (edge) => {
            // The id PUBLISHED is the element's own, which a style layer can name.
            edges.push({ id: edge.id, values: { onPath: onRoute.has(edge.row) } });
        });

        return {
            shape: "path",
            fields: [
                ...PATH_FIELD_SPECS,
                { name: "distance", kind: "node", type: "number" },
                { name: "tiedRoutes", kind: "graph", type: "number" },
            ],
            nodes,
            edges,
            graph: {
                length: path.length,
                cost: path.length === 0 ? 0 : value.dist[targetIndex],
                hops: Math.max(path.length - 1, 0),
                ...(ties === undefined ? {} : { tiedRoutes: ties }),
            },
            caveats: declaredCaveats({
                method: "dijkstra",
                direction: directed ? "directed" : "undirected",
                ...this.weightCaveats(),
                precision,
                facts: [caveat(path.length === 0 ? "route.none" : "route.found", { source, target })],
            }),
        };
    }
}

/**
 * An edge's time as a number: a number as it is, a date or a date string as its milliseconds, a
 * numeric string as its number; NaN for anything else, which no time-ordered route takes.
 * @param value - The cell.
 * @returns The time.
 */
function timeOf(value: unknown): number {
    if (typeof value === "number") {
        return value;
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    if (typeof value === "string" && value.trim() !== "") {
        const numeric = Number(value);
        return Number.isNaN(numeric) ? Date.parse(value) : numeric;
    }

    return Number.NaN;
}

// Auto-register this algorithm when the module is imported
Algorithm.register(DijkstraAlgorithm);
