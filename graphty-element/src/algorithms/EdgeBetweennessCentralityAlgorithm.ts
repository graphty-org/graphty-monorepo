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
    metricFieldSpecs,
} from "./results";
import type { OptionsSchema } from "./types/OptionSchema";

const SAMPLED_SOURCES_DESCRIPTION =
    "Estimate from this many sources, drawn the same way every time, instead of from every node (empty = exact)";

const edgeBetweennessOptionsSchema = defineOptions({
    k: {
        schema: z.number().int().min(1).nullable().default(null),
        meta: { label: "Sampled sources", description: SAMPLED_SOURCES_DESCRIPTION, advanced: true },
    },
});

/** Options for edge betweenness centrality. */
interface EdgeBetweennessOptions extends Record<string, unknown> {
    /** How many sources to draw for a sampled run, or null for the exact count from every node. */
    k: number | null;
}

/**
 * Edge betweenness centrality: how many of the shortest paths between pairs of nodes cross an edge.
 *
 * The answer is a number per EDGE, so the result is an edge metric and only edges carry it. The
 * published `value` is the raw count of pairs whose shortest paths cross the edge, unscaled. With
 * `k` the run is sampled: only the paths from `k` drawn sources are counted.
 *
 * Every edge of a group of parallel edges, and both edges of a reciprocal pair, carries the score
 * of the one edge the undirected view merged them into.
 */
export class EdgeBetweennessCentralityAlgorithm extends DeclaredAlgorithm<EdgeBetweennessOptions> {
    static readonly namespace = "graphty";
    static readonly type = "edge-betweenness";
    /** Computes over the run's scope: the edge list and the graph both come from the input. */
    static readonly scopeInput: ScopeInputDeclaration = "subgraph";

    static readonly zodOptionsSchema: ZodOptionsSchema = edgeBetweennessOptionsSchema;

    static readonly optionsSchema: OptionsSchema = {
        k: {
            type: "integer",
            default: null,
            label: "Sampled sources",
            description: SAMPLED_SOURCES_DESCRIPTION,
            min: 1,
            required: false,
            advanced: true,
        },
    };

    /**
     * Score every edge by the shortest paths that cross it.
     * @param context - What the element gave the run.
     * @returns The edge metric, or null when there are no edges to measure.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const input = this.input("undirected");
        const scoped = scopeEdges(input);

        if (scoped.length === 0 || scopeNodeIds(input).length === 0) {
            return null;
        }

        // Undirected, like node betweenness. The element does not offer this capability to an
        // accelerator (src/acceleration/narrow.ts), so it always runs on the CPU port.
        const { k } = this.schemaOptions;
        const { snapshot, edgeRemap, run } = this.accelerated("edgeBetweennessCentrality", "undirected");
        const drawn = k === null ? undefined : Math.min(k, snapshot.nodeCount);
        const sampled = drawn !== undefined;

        context.report({ phase: "Tracing shortest paths", total: null });
        const { value, precision } = await run((dispatch, s) =>
            dispatch.edgeBetweennessCentrality(s, sampled ? { k: drawn } : undefined),
        );
        context.signal.throwIfAborted();

        // Each of the element's own edges reads the score of the edge it merged into.
        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Reading scores", scoped, (edge) => {
            const merged = edgeRemap === null ? edge.row : (edgeRemap[edge.row] ?? INVALID_INDEX);
            const score = merged === INVALID_INDEX ? undefined : value.scores[merged];
            edges.push({ id: edge.id, values: score === undefined ? {} : { value: score } });
        });

        return {
            shape: "edge-metric",
            fields: metricFieldSpecs("edge"),
            edges,
            caveats: declaredCaveats({
                method: sampled ? "brandes-edge-sampled" : "brandes-edge",
                direction: "undirected",
                weight: null,
                precision,
                exact: !sampled,
                ...(sampled ? { sampleSize: drawn } : {}),
                notes: [
                    sampled
                        ? `Estimated from the shortest paths of ${String(drawn)} sampled sources of ${String(snapshot.nodeCount)} nodes, unscaled.`
                        : "Every shortest path is counted exactly, over the graph read as undirected.",
                    "Path lengths count edges; edge weights are not read.",
                ],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(EdgeBetweennessCentralityAlgorithm);
