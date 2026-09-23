/**
 * @file Max Flow Algorithm wrapper
 *
 * This algorithm finds the maximum flow from a source to a sink
 * in a flow network using the Ford-Fulkerson method.
 */

import { fordFulkerson, Graph as AlgorithmGraph } from "@graphty/algorithms";
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
    metricFieldSpecs,
} from "./results";
import { type OptionsSchema } from "./types/OptionSchema";
import { edgePairKey } from "./utils/graphUtils";

/**
 * Zod-based options schema for Max Flow algorithm
 */
const maxFlowOptionsSchema = defineOptions({
    source: {
        schema: z.union([z.string(), z.number()]).nullable().default(null),
        meta: {
            label: "Source Node",
            description: "Source node for flow network (uses first node if not set)",
        },
    },
    sink: {
        schema: z.union([z.string(), z.number()]).nullable().default(null),
        meta: {
            label: "Sink Node",
            description: "Sink node for flow network (uses last node if not set)",
        },
    },
});

/**
 * Options for Max Flow algorithm
 */
interface MaxFlowOptions extends Record<string, unknown> {
    /** Source node for flow network (defaults to first node if not provided) */
    source: string | number | null;
    /** Sink node for flow network (defaults to last node if not provided) */
    sink: string | number | null;
}

/**
 * Maximum Flow algorithm using Ford-Fulkerson method
 *
 * Computes the maximum flow from a source to a sink node in a flow network.
 */
export class MaxFlowAlgorithm extends DeclaredAlgorithm<MaxFlowOptions> {
    static namespace = "graphty";
    static type = "max-flow";

    static zodOptionsSchema: ZodOptionsSchema = maxFlowOptionsSchema;

    /**
     * Options schema for Max Flow algorithm
     */
    static optionsSchema: OptionsSchema = {
        source: {
            type: "nodeId",
            default: null,
            label: "Source Node",
            description: "Source node for flow network (uses first node if not set)",
            required: false,
        },
        sink: {
            type: "nodeId",
            default: null,
            label: "Sink Node",
            description: "Sink node for flow network (uses last node if not set)",
            required: false,
        },
    };

    /**
     * Legacy options set via configure() for backward compatibility
     */
    private legacyOptions: { source: string; sink: string } | null = null;

    /**
     * Configure the algorithm with source and sink nodes
     * @param options - Configuration options
     * @param options.source - The source node for the flow network
     * @param options.sink - The sink node for the flow network
     * @returns This algorithm instance for chaining
     * @deprecated Use constructor options instead. This method is kept for backward compatibility.
     */
    configure(options: { source: string; sink: string }): this {
        this.legacyOptions = options;
        return this;
    }

    /**
     * Find the most that can flow from the source to the sink.
     *
     * The answer is a number per edge -- how much runs through it -- so the result is shaped as
     * an edge metric, and the ranking, the range and the rest come from that column. Two further
     * numbers travel with each edge because they cannot be recovered from the flow alone: the
     * capacity it was measured against, and the share of that capacity it used.
     * @param context - What the element gave the run.
     * @returns The flow per edge, or null when there is no network to measure.
     */
    async compute(context: AlgorithmRunContext): Promise<AlgorithmOutput | null> {
        const dataManager = this.graph.getDataManager();
        const graphEdges = Array.from(dataManager.edges.values());
        const nodeIds = Array.from(dataManager.nodes.keys());

        if (graphEdges.length === 0 || nodeIds.length === 0) {
            return null;
        }

        // Get source and sink from legacy options, schema options, or use defaults
        // Legacy configure() takes precedence for backward compatibility
        const source = String(this.legacyOptions?.source ?? this._schemaOptions.source ?? nodeIds[0]);
        const sink = String(this.legacyOptions?.sink ?? this._schemaOptions.sink ?? nodeIds[nodeIds.length - 1]);

        // Directed: a capacity runs the way the edge was declared.
        const capacityGraph = new AlgorithmGraph({ directed: true });
        for (const nodeId of nodeIds) {
            capacityGraph.addNode(String(nodeId));
        }

        const capacityOf = new Map<string, number>();
        for (const edge of graphEdges) {
            const srcId = String(edge.srcId);
            const dstId = String(edge.dstId);

            // Get capacity from edge data
            const edgeData = edge.data as Record<string, unknown> | undefined;
            const edgeObject = edge as unknown as Record<string, unknown>;
            const rawCapacity = edgeData?.capacity ?? edgeData?.value ?? edgeObject.value ?? 1;
            const capacity: number = typeof rawCapacity === "number" ? rawCapacity : 1;

            capacityGraph.addEdge(srcId, dstId, capacity);
            capacityOf.set(edgePairKey(srcId, dstId), capacity);
        }

        context.report({ phase: "Pushing flow", total: null });
        const result = fordFulkerson(capacityGraph, source, sink);

        // One pass over the flow graph, rather than one pass per node: the net flow through a
        // node is what arrives minus what leaves, and both sums are read off the same walk.
        const arriving = new Map<string, number>();
        const leaving = new Map<string, number>();
        let busiest = 0;
        for (const [from, targets] of result.flowGraph) {
            for (const [to, flow] of targets) {
                leaving.set(from, (leaving.get(from) ?? 0) + flow);
                arriving.set(to, (arriving.get(to) ?? 0) + flow);
                busiest = Math.max(busiest, Math.abs(flow));
            }
        }

        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Measuring edges", graphEdges, (edge) => {
            const srcId = String(edge.srcId);
            const dstId = String(edge.dstId);

            // The pair key reads the flow back out of the algorithm's answer; the element's own
            // id is what is published.
            const flow = result.flowGraph.get(srcId)?.get(dstId) ?? 0;
            const capacity = capacityOf.get(edgePairKey(srcId, dstId)) ?? 1;
            const utilization = capacity > 0 ? Math.abs(flow) / capacity : 0;

            edges.push({ id: edge.id, values: { value: flow, capacity, utilization } });
        });

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Measuring nodes", nodeIds, (nodeId) => {
            const key = String(nodeId);
            const inFlow = arriving.get(key) ?? 0;
            const outFlow = leaving.get(key) ?? 0;

            const values: Record<string, number | string> = { netFlow: inFlow - outFlow };

            // Only the two ends carry a role, so a picture drawn from it paints those two alone.
            if (key === source) {
                values.role = "source";
            } else if (key === sink) {
                values.role = "sink";
            }

            nodes.push({ id: nodeId, values });
        });

        return {
            shape: "edge-metric",
            fields: [
                ...metricFieldSpecs("edge"),
                { name: "capacity", kind: "edge", type: "number" },
                { name: "utilization", kind: "edge", type: "number" },
                { name: "netFlow", kind: "node", type: "number" },
                { name: "role", kind: "node", type: "string" },
                { name: "maxFlow", kind: "graph", type: "number" },
            ],
            nodes,
            edges,
            graph: { maxFlow: result.maxFlow },
            caveats: declaredCaveats({
                method: "ford-fulkerson",
                direction: "directed",
                weight: { attribute: "capacity", meaning: "strength" },
                notes: [`Flow from ${source} to ${sink}.`],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(MaxFlowAlgorithm);
