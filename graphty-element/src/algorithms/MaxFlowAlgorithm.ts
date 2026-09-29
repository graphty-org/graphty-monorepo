/**
 * @file Max Flow Algorithm wrapper
 *
 * This algorithm finds the maximum flow from a source to a sink
 * in a flow network using the Ford-Fulkerson method.
 */

import { maxFlow } from "@graphty/algorithms";
import { expandEdges, fromEdgeArrays } from "@graphty/graph-format";
import { z } from "zod/v4";

import type { EdgeId } from "../catalog/types";
import { defineOptions, type OptionsSchema as ZodOptionsSchema } from "../config";
import { CAPACITY_COLUMN } from "../data/GraphStore";
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
import { type OptionsSchema } from "./types/OptionSchema";
import { requireDistinctEnds, requireNodeOption } from "./utils/graphUtils";

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
    /** Flows within the run's scope: the node and edge lists come from the input. */
    static scopeInput: ScopeInputDeclaration = "subgraph";

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
        // The nodes and declared edges of the run's input: its scope's, or the whole graph's.
        const input = this.input("declared");
        const graphEdges = scopeEdges(input);
        const nodeIds = scopeNodeIds(input);

        // A flow needs two different nodes; a lone node has no source and sink to choose.
        if (graphEdges.length === 0 || nodeIds.length < 2) {
            return null;
        }

        // Get source and sink from legacy options, schema options, or use defaults
        // Legacy configure() takes precedence for backward compatibility
        // An id the caller named must be a node, and the two ends must differ: the flow is
        // undefined otherwise, so the run says which option is wrong instead of measuring nothing.
        const sourceOption = this.legacyOptions?.source ?? this._schemaOptions.source;
        const sinkOption = this.legacyOptions?.sink ?? this._schemaOptions.sink;
        const source =
            sourceOption === null ? nodeIds[0] : requireNodeOption("max-flow", "source", sourceOption, nodeIds);
        const sink =
            sinkOption === null
                ? nodeIds[nodeIds.length - 1]
                : requireNodeOption("max-flow", "sink", sinkOption, nodeIds);
        requireDistinctEnds("max-flow", source, sink);

        // The network is the input's declared edges, directed whatever the graph is -- a capacity
        // runs the way the edge was declared -- over the declared graph's node rows. Edge k of the
        // network is graphEdges[k], so the answer needs no map back.
        const { graph } = input;
        const { src, dst } = graph.edgeList();
        const capacityColumn = graph.edges.typed(CAPACITY_COLUMN, "f64");
        const networkSrc = new Uint32Array(graphEdges.length);
        const networkDst = new Uint32Array(graphEdges.length);
        const n = graph.nodeCount;
        // Parallel edges are one pipe: their capacities add up, a negative one included, and a pipe
        // whose total is negative carries nothing. The pipe's capacity rides on its first edge.
        const pairCapacity = new Map<number, number>();
        const firstOfPair = new Map<number, number>();
        graphEdges.forEach(({ row }, k) => {
            networkSrc[k] = src[row];
            networkDst[k] = dst[row];
            const pair = networkSrc[k] * n + networkDst[k];
            const capacity = capacityColumn === null ? 1 : capacityColumn.data[row];
            pairCapacity.set(pair, (pairCapacity.get(pair) ?? 0) + capacity);
            if (!firstOfPair.has(pair)) {
                firstOfPair.set(pair, k);
            }
        });
        const capacities = new Float64Array(graphEdges.length);
        for (const [pair, k] of firstOfPair) {
            const capacity = Math.max(pairCapacity.get(pair) ?? 0, 0);
            pairCapacity.set(pair, capacity);
            capacities[k] = capacity;
        }
        const network = fromEdgeArrays({
            directed: true,
            nodeCount: n,
            src: networkSrc,
            dst: networkDst,
        });

        context.report({ phase: "Pushing flow", total: null });
        const result = maxFlow(network, graph.ids.indexOf(source), graph.ids.indexOf(sink), {
            algorithm: "ford-fulkerson",
            weights: expandEdges(network, capacities),
        });

        // Each parallel edge reports its pipe's flow against its pipe's capacity. The net flow
        // through a node is what arrives minus what leaves.
        const pairFlow = new Map<number, number>();
        const net = new Float64Array(n);
        for (let k = 0; k < graphEdges.length; k++) {
            const pair = networkSrc[k] * n + networkDst[k];
            pairFlow.set(pair, (pairFlow.get(pair) ?? 0) + result.flow[k]);
            net[networkSrc[k]] -= result.flow[k];
            net[networkDst[k]] += result.flow[k];
        }

        const edges: ResultElementValues<EdgeId>[] = [];
        await forEachChunked(context, "Measuring edges", graphEdges, (edge, k) => {
            const pair = networkSrc[k] * n + networkDst[k];
            const flow = pairFlow.get(pair) ?? 0;
            const capacity = pairCapacity.get(pair) ?? 1;
            const utilization = capacity > 0 ? Math.abs(flow) / capacity : 0;

            edges.push({ id: edge.id, values: { value: flow, capacity, utilization } });
        });

        const nodes: ResultElementValues[] = [];
        await forEachChunked(context, "Measuring nodes", nodeIds, (nodeId) => {
            const values: Record<string, number | string> = { netFlow: net[graph.ids.indexOf(nodeId)] };

            // Only the two ends carry a role, so a picture drawn from it paints those two alone.
            if (nodeId === source) {
                values.role = "source";
            } else if (nodeId === sink) {
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
                notes: [
                    `Flow from ${String(source)} to ${String(sink)}.`,
                    ...(sourceOption === null || sinkOption === null
                        ? [
                              "The source or sink was chosen automatically (the first and last node); " +
                                  "set the source and sink options to measure between the nodes you mean.",
                          ]
                        : []),
                    ...(result.maxFlow === 0
                        ? [`There is no directed path from ${String(source)} to ${String(sink)}, so no flow can run.`]
                        : []),
                ],
            }),
        };
    }
}

// Auto-register this algorithm when the module is imported
Algorithm.register(MaxFlowAlgorithm);
