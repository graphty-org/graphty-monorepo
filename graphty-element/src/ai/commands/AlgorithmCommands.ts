/**
 * AlgorithmCommands - Commands for running and listing graph algorithms.
 * @module ai/commands/AlgorithmCommands
 */

import { z } from "zod";

import { Algorithm } from "../../algorithms/Algorithm";
import { algorithmByLegacyKey } from "../../catalog/algorithms";
import { registeredAlgorithmByKey } from "../../catalog/registry";
import type { Graph } from "../../Graph";
import type { CommandResult, GraphCommand } from "./types";

/**
 * Schema for runAlgorithm parameters.
 */
const runAlgorithmParamsSchema = z.object({
    namespace: z.string().describe("The namespace of the algorithm (e.g., 'graphty')"),
    type: z.string().describe("The type of algorithm to run (e.g., 'degree', 'pagerank')"),
    options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
            "The algorithm's options, by name (e.g., { source: 'a', target: 'b' } for dijkstra, { dampingFactor: 0.9 } for pagerank). An unknown name or an out-of-range value is refused.",
        ),
});

/** How many node ids of a route the command returns. Longer routes are cut and marked truncated. */
const ROUTE_NODE_LIMIT = 50;

/**
 * Schema for listAlgorithms parameters.
 */
const listAlgorithmsParamsSchema = z.object({
    namespace: z.string().optional().describe("Optional namespace to filter algorithms by"),
});

/**
 * Run a graph algorithm.
 */
export const runAlgorithm: GraphCommand = {
    name: "runAlgorithm",
    description:
        "Run a graph algorithm to analyze the graph structure, optionally with options such as a source and target. Returns a bounded summary: the top 10 elements and the value range for a metric, the group sizes for a partition, the route for a path, plus any graph-level values.",
    parameters: runAlgorithmParamsSchema,
    examples: [
        {
            input: "Calculate the degree of each node",
            params: { namespace: "graphty", type: "degree" },
        },
        {
            input: "Run pagerank algorithm",
            params: { namespace: "graphty", type: "pagerank" },
        },
        {
            input: "Compute centrality metrics",
            params: { namespace: "graphty", type: "degree" },
        },
        {
            input: "Find the shortest path from node A to node B",
            params: { namespace: "graphty", type: "dijkstra", options: { source: "A", target: "B" } },
        },
    ],

    async execute(graph: Graph, params: Record<string, unknown>): Promise<CommandResult> {
        const parsed = runAlgorithmParamsSchema.safeParse(params);
        if (!parsed.success) {
            return {
                success: false,
                message: `Invalid parameters: ${parsed.error.message}`,
            };
        }

        const { namespace, type, options } = parsed.data;

        try {
            // Check if algorithm exists
            const alg = Algorithm.get(graph, namespace, type);
            if (!alg) {
                const available = Algorithm.getRegisteredAlgorithms(namespace);
                const errorMessage =
                    available.length > 0
                        ? `Available in namespace '${namespace}': ${available.map((a) => a.split(":")[1]).join(", ")}`
                        : `No algorithms found in namespace '${namespace}'. Use listAlgorithms to see available options.`;
                return {
                    success: false,
                    message: `Algorithm not found: ${namespace}:${type}. ${errorMessage}`,
                };
            }

            // The `namespace:type` address this command speaks, as the catalogue key and the base
            // parameters `graph.run` takes -- the same translation the element's own
            // `runAlgorithm` makes.
            const mapping =
                (namespace === "graphty" ? algorithmByLegacyKey(type) : undefined) ??
                registeredAlgorithmByKey(`${namespace}:${type}`) ??
                registeredAlgorithmByKey(type);

            if (mapping === undefined) {
                // A plugin that declared no descriptor has no run and no result to summarise, so
                // it keeps the 1.10 path, options and all.
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                await graph.runAlgorithm(namespace, type, { algorithmOptions: options });

                return {
                    success: true,
                    message: `Successfully ran ${namespace}:${type} algorithm. Results are now available in node data.`,
                    data: { namespace, type, nodeCount: graph.getNodeCount() },
                };
            }

            const params = "params" in mapping ? mapping.params : {};
            const result = await graph.run(mapping.descriptor.key, { ...params, ...options });
            const data: Record<string, unknown> = {
                namespace,
                type,
                algorithm: mapping.descriptor.key,
                shape: result.shape,
                summary: result.summary(),
                graph: result.graph,
            };
            let affectedNodes: string[] | undefined;

            if (result.shape === "path") {
                // Ranked highest first, so reversed it runs from the source.
                const route = result
                    .ranking("order")
                    .map((entry) => String(entry.id))
                    .reverse();
                affectedNodes = route.slice(0, ROUTE_NODE_LIMIT);
                data.path = {
                    nodeIds: affectedNodes,
                    total: route.length,
                    truncated: route.length > ROUTE_NODE_LIMIT,
                };
            }

            return {
                success: true,
                message: `Successfully ran ${namespace}:${type} algorithm. ${result.reading()}`,
                data,
                ...(affectedNodes === undefined ? {} : { affectedNodes }),
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to run algorithm ${namespace}:${type}: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
};

/**
 * List available graph algorithms.
 */
export const listAlgorithms: GraphCommand = {
    name: "listAlgorithms",
    description: "List all available graph algorithms that can be run on the graph. Optionally filter by namespace.",
    parameters: listAlgorithmsParamsSchema,
    examples: [
        {
            input: "What algorithms are available?",
            params: {},
        },
        {
            input: "List graphty algorithms",
            params: { namespace: "graphty" },
        },
        {
            input: "Show me the available analysis tools",
            params: {},
        },
    ],

    // eslint-disable-next-line @typescript-eslint/require-await
    async execute(_graph: Graph, params: Record<string, unknown>): Promise<CommandResult> {
        const parsed = listAlgorithmsParamsSchema.safeParse(params);
        if (!parsed.success) {
            return {
                success: false,
                message: `Invalid parameters: ${parsed.error.message}`,
            };
        }

        const { namespace } = parsed.data;

        try {
            const algorithms = Algorithm.getRegisteredAlgorithms(namespace);

            if (algorithms.length === 0) {
                const noAlgMessage = namespace
                    ? `No algorithms found in namespace '${namespace}'.`
                    : "No algorithms are currently registered.";
                return {
                    success: true,
                    message: noAlgMessage,
                    data: {
                        algorithms: [],
                        count: 0,
                    },
                };
            }

            const message = namespace
                ? `Found ${algorithms.length} algorithm(s) in namespace '${namespace}': ${algorithms.join(", ")}`
                : `Found ${algorithms.length} available algorithm(s): ${algorithms.join(", ")}`;

            return {
                success: true,
                message,
                data: {
                    algorithms,
                    count: algorithms.length,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to list algorithms: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    },
};
