// The route algorithms import the same helper set, so this list is a deliberate parallel of DijkstraAlgorithm.ts.
// jscpd:ignore-start
import { allSimplePaths, SIMPLE_PATHS_DEFAULT_MAX_PATHS } from "@graphty/algorithms";
import { INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod";

import type { EdgeId, SelectionDirection } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import type { ResultElementValues } from "../session/results";
import { caveat } from "../session/runs/caveatFacts";
import { Algorithm } from "./Algorithm";
import type { SimplifyPolicy } from "./input/derivedInputs";
import { scopeEdges, type ScopeInputDeclaration } from "./input/ScopedInput";
import {
    type AlgorithmOutput,
    type AlgorithmRunContext,
    DeclaredAlgorithm,
    declaredCaveats,
    forEachChunked,
    type ResultFieldSpec,
    setFieldSpecs,
} from "./results";
import type { OptionsSchema } from "./types/OptionSchema";
import { routeEdgeRows } from "./utils/routeEdges";
import { endpointIds, endpointOptions, endpointSchema, routeInput } from "./utils/routeEndpoints";
// jscpd:ignore-end

const SOURCE_DESCRIPTION = "Node every path starts at (uses first node if not set)";
const TARGET_DESCRIPTION = "Node every path ends at (uses last node if not set)";
const MAX_LENGTH_DESCRIPTION = "The longest path to find, in edges (optional - any length if not set)";
const MAX_PATHS_DESCRIPTION = "The most paths to find; the search stops once it has this many";
const DIRECTION_DESCRIPTION =
    "On a directed graph, which way a path may cross an edge: out (source to target), in (target to source) or all (either way). An undirected graph is always read either way";

const allPathsOptionsSchema = defineOptions({
    ...endpointOptions(SOURCE_DESCRIPTION, TARGET_DESCRIPTION),
    maxLength: {
        schema: z.number().int().min(1).nullable().default(null),
        meta: { label: "Max Length", description: MAX_LENGTH_DESCRIPTION },
    },
    maxPaths: {
        schema: z.number().int().min(1).default(SIMPLE_PATHS_DEFAULT_MAX_PATHS),
        meta: { label: "Max Paths", description: MAX_PATHS_DESCRIPTION, advanced: true },
    },
    direction: {
        schema: z.enum(["out", "in", "all"]).default("all"),
        meta: { label: "Follow Edges", description: DIRECTION_DESCRIPTION, advanced: true },
    },
});

/** Options for all paths. */
interface AllPathsOptions extends Record<string, unknown> {
    /** Where every path starts; the first node when null. */
    source: number | string | null;
    /** Where every path ends; the last node when null. */
    target: number | string | null;
    /** The longest path, in edges; any length when null. */
    maxLength: number | null;
    /** The most paths to find. */
    maxPaths: number;
    /** Which way a path may cross a directed edge. */
    direction: SelectionDirection;
}

/** What an all-paths run publishes beside the set's own `in` and `count`. */
const ALL_PATHS_FIELDS: readonly ResultFieldSpec[] = [
    { name: "pathCount", kind: "node", type: "integer" },
    { name: "in", kind: "edge", type: "boolean" },
    { name: "pathCount", kind: "edge", type: "integer" },
    { name: "complete", kind: "graph", type: "boolean" },
    { name: "shortest", kind: "graph", type: "integer" },
    { name: "longest", kind: "graph", type: "integer" },
    { name: "paths", kind: "graph", type: "table" },
];

/**
 * Every simple path between two nodes: the routes from the source to the target that visit no
 * node twice, as networkx's `all_simple_paths`. On a directed graph `direction` says which way a
 * path may cross an edge; by default either way, as the shortest-path key.
 *
 * Publishes a node set: `in` on every node and edge of a path found, and `pathCount`, how many of
 * the paths found run through it. On the graph: `found` (paths found), `complete` (false when the
 * `maxPaths` cap, or the search's own step budget, left paths unfound), the `shortest` and
 * `longest` path in edges, and `paths`, one row per path in the order found, with its nodes and
 * its length. The number of paths grows exponentially with the graph, so `maxLength` and
 * `maxPaths` bound the search.
 */
export class AllPathsAlgorithm extends DeclaredAlgorithm<AllPathsOptions> {
    static readonly namespace = "graphty";
    static readonly type = "all-paths";
    /** Searches the run's scope: the node and edge lists and the graph all come from the input. */
    static readonly scopeInput: ScopeInputDeclaration = "subgraph";
    /** Parallel edges between the same two nodes are one step, so they give one path. */
    static readonly parallelEdges: SimplifyPolicy = "min";

    static readonly zodOptionsSchema: ZodOptionsSchema = allPathsOptionsSchema;

    static readonly optionsSchema: OptionsSchema = {
        ...endpointSchema(SOURCE_DESCRIPTION, TARGET_DESCRIPTION),
        maxLength: {
            type: "integer",
            default: null,
            label: "Max Length",
            description: MAX_LENGTH_DESCRIPTION,
            min: 1,
            required: false,
        },
        maxPaths: {
            type: "integer",
            default: SIMPLE_PATHS_DEFAULT_MAX_PATHS,
            label: "Max Paths",
            description: MAX_PATHS_DESCRIPTION,
            min: 1,
            advanced: true,
        },
        direction: {
            type: "select",
            default: "all",
            label: "Follow Edges",
            description: DIRECTION_DESCRIPTION,
            options: [
                { value: "out", label: "Out" },
                { value: "in", label: "In" },
                { value: "all", label: "All" },
            ],
            advanced: true,
        },
    };

    /**
     * Find the paths from the source to the target.
     * @param context - What the element gave the run.
     * @returns The paths, or null when there are no nodes to search.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const { direction, maxLength, maxPaths } = this.schemaOptions;
        const { directed, input, nodeIds } = routeInput((orientation) => this.input(orientation), direction);
        if (nodeIds.length === 0) {
            return null;
        }

        const { snapshot, edgeRemap } = input.derived();
        const { ids } = snapshot;
        const { source, target } = endpointIds(snapshot, this.schemaOptions);
        const sourceIndex = this.nodeIndex(snapshot, "source", source);
        const targetIndex = this.nodeIndex(snapshot, "target", target);

        context.report({ phase: "searching-for-paths", total: null });
        // The transpose keeps the node and edge spaces, so the result reads the same either way.
        const searched = directed && direction === "in" ? snapshot.transpose().snapshot : snapshot;
        const found = allSimplePaths(searched, sourceIndex, targetIndex, {
            maxLength: maxLength ?? undefined,
            maxPaths,
        });
        context.signal.throwIfAborted();

        const nodeCount = new Map<number, number>();
        const edgeCount = new Map<number, number>();
        const tally = (counts: Map<number, number>, index: number): void => {
            counts.set(index, (counts.get(index) ?? 0) + 1);
        };
        found.paths.forEach((path, k) => {
            path.forEach((index) => {
                tally(nodeCount, index);
            });
            found.edges[k].forEach((edge) => {
                tally(edgeCount, edge);
            });
        });

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "marking-the-paths", nodeIds, (nodeId) => {
            const index = ids.indexOf(nodeId);
            const count = index === INVALID_INDEX ? 0 : (nodeCount.get(index) ?? 0);
            nodes.push({ id: nodeId, values: { in: count > 0, pathCount: count } });
        });

        // Of parallel edges, the one a path took: see routeEdgeRows.
        const scoped = scopeEdges(input);
        const onPaths = routeEdgeRows(input, scoped, edgeRemap, new Set(edgeCount.keys()));
        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "marking-the-paths", scoped, (edge) => {
            const merged = edgeRemap === null ? edge.row : edgeRemap[edge.row];
            const count = onPaths.has(edge.row) ? (edgeCount.get(merged) ?? 0) : 0;
            edges.push({ id: edge.id, values: { in: count > 0, pathCount: count } });
        });

        const lengths = found.edges.map((path) => path.length);
        const complete = found.stoppedBy === null;

        return {
            shape: "node-set",
            fields: [...setFieldSpecs("node", { name: "found", type: "integer" }), ...ALL_PATHS_FIELDS],
            nodes,
            edges,
            graph: {
                found: found.paths.length,
                complete,
                shortest: lengths.length === 0 ? 0 : Math.min(...lengths),
                longest: lengths.length === 0 ? 0 : Math.max(...lengths),
                paths: found.paths.map((path, k) => ({
                    path: k,
                    nodes: Array.from(path, (index) => ids.idOf(index)),
                    length: found.edges[k].length,
                })),
            },
            caveats: declaredCaveats({
                method: "all-paths",
                direction: directed ? "directed" : "undirected",
                weight: null,
                facts: [
                    caveat(found.paths.length > 0 ? "route.found" : "route.none", { source, target }),
                    ...(maxLength === null ? [] : [caveat("all-paths.length-bounded", { maxLength })]),
                    ...(complete ? [] : [caveat("all-paths.capped", { maxPaths, found: found.paths.length })]),
                ],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(AllPathsAlgorithm);
