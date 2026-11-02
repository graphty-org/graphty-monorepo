/**
 * Query Commands Module - Commands for querying graph structure and data.
 * @module ai/commands/QueryCommands
 */

import { z } from "zod";

import type { Graph } from "../../Graph";
import { SchemaExtractor } from "../schema/SchemaExtractor";
import type { PropertySummary, SchemaSummary } from "../schema/types";
import { CONNECTED_BY_SYNTAX, isMatchAllSelector, matchingNodeIds, noMatchMessage, SELECTOR_SYNTAX } from "./selectors";
import type { CommandResult, GraphCommand } from "./types";

/**
 * Query types supported by the queryGraph command.
 */
const QueryTypeSchema = z
    .enum(["nodeCount", "edgeCount", "currentLayout", "all", "summary"])
    .describe("Type of information to query about the graph");

/**
 * Command to query graph information.
 * Returns statistics and metadata about the current graph state.
 */
export const queryGraph: GraphCommand = {
    name: "queryGraph",
    description:
        "Query information about the graph structure, including node count, edge count, current layout, and overall statistics.",
    parameters: z.object({
        query: QueryTypeSchema,
    }),
    examples: [
        { input: "How many nodes are there?", params: { query: "nodeCount" } },
        { input: "How many edges?", params: { query: "edgeCount" } },
        { input: "What layout is being used?", params: { query: "currentLayout" } },
        { input: "Show me the graph summary", params: { query: "summary" } },
        { input: "Give me all the graph stats", params: { query: "all" } },
    ],

    execute(graph: Graph, params: Record<string, unknown>): Promise<CommandResult> {
        const { query } = params as { query: z.infer<typeof QueryTypeSchema> };

        try {
            switch (query) {
                case "nodeCount": {
                    const nodeCount = graph.getNodeCount();
                    return Promise.resolve({
                        success: true,
                        message: `The graph has ${nodeCount} node${nodeCount !== 1 ? "s" : ""}.`,
                        data: { nodeCount },
                    });
                }

                case "edgeCount": {
                    const edgeCount = graph.getEdgeCount();
                    return Promise.resolve({
                        success: true,
                        message: `The graph has ${edgeCount} edge${edgeCount !== 1 ? "s" : ""}.`,
                        data: { edgeCount },
                    });
                }

                case "currentLayout": {
                    const layoutManager = graph.getLayoutManager();
                    const layout = layoutManager.layoutEngine?.type ?? "unknown";
                    return Promise.resolve({
                        success: true,
                        message: `The current layout is "${layout}".`,
                        data: { layout },
                    });
                }

                case "all":
                case "summary": {
                    const nodeCount = graph.getNodeCount();
                    const edgeCount = graph.getEdgeCount();
                    const layoutManager = graph.getLayoutManager();
                    const layout = layoutManager.layoutEngine?.type ?? "unknown";
                    const is2D = graph.getViewMode() === "2d";

                    return Promise.resolve({
                        success: true,
                        message: `Graph Summary:
- Nodes: ${nodeCount}
- Edges: ${edgeCount}
- Layout: ${layout}
- Mode: ${is2D ? "2D" : "3D"}`,
                        data: {
                            nodeCount,
                            edgeCount,
                            layout,
                            is2D,
                        },
                    });
                }

                default: {
                    // Handle unknown query type
                    const nodeCount = graph.getNodeCount();
                    const edgeCount = graph.getEdgeCount();
                    return Promise.resolve({
                        success: true,
                        message: `Unknown query type "${String(query)}". The graph has ${nodeCount} nodes and ${edgeCount} edges.`,
                        data: { nodeCount, edgeCount },
                    });
                }
            }
        } catch (error) {
            return Promise.resolve({
                success: false,
                message: `Failed to query graph: ${(error as Error).message}`,
            });
        }
    },
};

/** How many node ids findNodes returns when the caller passes no limit. */
const DEFAULT_FIND_NODES_LIMIT = 50;

/**
 * Command to find nodes matching criteria.
 * Searches nodes by data properties using simple selectors.
 */
export const findNodes: GraphCommand = {
    name: "findNodes",
    description:
        "Find nodes in the graph that match a selector. Returns the total number of matches and at most `limit` matching node IDs (50 when no limit is given), with `truncated` true when the list was cut. Takes the same selector and connectedBy as findAndStyleNodes and zoomToNodes.",
    parameters: z.object({
        selector: z.string().describe(`Expression matching nodes. ${SELECTOR_SYNTAX}`),
        connectedBy: z.string().optional().describe(CONNECTED_BY_SYNTAX),
        limit: z.number().optional().describe("Maximum number of node IDs to return (default 50)"),
    }),
    examples: [
        { input: "Find all server nodes", params: { selector: "data.type == 'server'" } },
        { input: "Find nodes older than 30", params: { selector: "data.age > `30`" } },
        { input: "Get first 10 nodes", params: { selector: "", limit: 10 } },
    ],

    async execute(graph: Graph, params: Record<string, unknown>): Promise<CommandResult> {
        const { selector, connectedBy, limit } = params as { selector: string; connectedBy?: string; limit?: number };

        try {
            const matchingNodes = await matchingNodeIds(graph, selector, connectedBy);
            const total = matchingNodes.length;
            const nodeIds = matchingNodes.slice(0, limit !== undefined && limit > 0 ? limit : DEFAULT_FIND_NODES_LIMIT);
            const returned = nodeIds.length;
            const truncated = total > returned;
            const plural = total === 1 ? "" : "s";
            const showing = truncated ? ` (showing ${returned})` : "";
            const found = `Found ${total} matching node${plural}${showing}.`;

            return {
                success: true,
                message:
                    total === 0 && (connectedBy !== undefined || !isMatchAllSelector(selector))
                        ? noMatchMessage(selector)
                        : found,
                data: {
                    total,
                    returned,
                    count: returned,
                    truncated,
                    nodeIds,
                },
                affectedNodes: nodeIds,
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to find nodes: ${(error as Error).message}`,
            };
        }
    },
};

/**
 * Schema query types supported by the getSchema command.
 */
const SchemaQueryTypeSchema = z
    .enum(["nodeTypes", "edgeTypes", "nodeProperties", "edgeProperties", "all"])
    .describe("Type of schema information to retrieve");

/**
 * Collect the unique string values of one property, for when enum detection fails (for
 * example, a sample too small for statistical detection).
 * @param items - The nodes or edges to read.
 * @param propertyName - The property to collect.
 * @param maxUnique - Above this many unique values the property is not categorical.
 * @returns The sorted unique values, or none when there are too many.
 */
function collectUniqueValues(
    items: Iterable<{ data?: Record<string, unknown> }>,
    propertyName: string,
    maxUnique = 20,
): string[] {
    const values = new Set<string>();
    for (const item of items) {
        const value = item.data?.[propertyName];
        if (typeof value === "string") {
            values.add(value);
            if (values.size > maxUnique) {
                return []; // Too many unique values
            }
        }
    }
    return Array.from(values).sort();
}

/**
 * The values of the `type` property: its detected enum values, or, when none were detected
 * (small sample), the unique values collected from the items.
 * @param properties - The node or edge property summaries.
 * @param items - Reads the nodes or edges, called only when the fallback is needed.
 * @returns The type values.
 */
function typeValues(
    properties: PropertySummary[],
    items: () => Iterable<{ data?: Record<string, unknown> }>,
): string[] {
    const typeProperty = properties.find((p) => p.name === "type");
    const types = typeProperty?.enumValues ?? [];
    return types.length === 0 ? collectUniqueValues(items(), "type") : types;
}

/**
 * One property as a line of the property listing: its name and type, then its values and range.
 * @param p - The property summary.
 * @returns The description.
 */
function describeProperty(p: PropertySummary): string {
    let desc = `${p.name}: ${p.type}`;
    if (p.enumValues && p.enumValues.length > 0) {
        desc += ` (values: ${p.enumValues.join(", ")})`;
    }

    if (p.range) {
        desc += ` (range: ${p.range.min}-${p.range.max})`;
    }

    return desc;
}

/**
 * The schema summary message of the `all` query.
 * @param schema - The extracted schema.
 * @param nodeTypes - The node type values.
 * @param edgeTypes - The edge type values.
 * @returns The message.
 */
function schemaSummaryMessage(schema: SchemaSummary, nodeTypes: string[], edgeTypes: string[]): string {
    const nodeProps = schema.nodeProperties.map((p) => p.name);
    const edgeProps = schema.edgeProperties.map((p) => p.name);

    let message = `Graph Schema Summary:
- ${schema.nodeCount} nodes with ${schema.nodeProperties.length} properties
- ${schema.edgeCount} edges with ${schema.edgeProperties.length} properties`;

    if (nodeTypes.length > 0) {
        message += `\n\nNode types: ${nodeTypes.join(", ")}`;
    }

    if (edgeTypes.length > 0) {
        message += `\n\nEdge types: ${edgeTypes.join(", ")}`;
    }

    if (nodeProps.length > 0) {
        message += `\n\nNode properties: ${nodeProps.join(", ")}`;
    }

    if (edgeProps.length > 0) {
        message += `\n\nEdge properties: ${edgeProps.join(", ")}`;
    }

    return message;
}

/**
 * Command to get schema information about the graph data.
 * Returns information about node types, edge types, and available properties.
 */
export const getSchema: GraphCommand = {
    name: "getSchema",
    description:
        "Get schema information about the graph data including node types, edge types, and available properties. Use this to discover what types of nodes exist or what properties are available for filtering.",
    parameters: z.object({
        query: SchemaQueryTypeSchema,
    }),
    examples: [
        { input: "What types of nodes are there?", params: { query: "nodeTypes" } },
        { input: "What node types exist in the graph?", params: { query: "nodeTypes" } },
        { input: "What properties do nodes have?", params: { query: "nodeProperties" } },
        { input: "What edge properties are available?", params: { query: "edgeProperties" } },
        { input: "Show me the data schema", params: { query: "all" } },
    ],

    execute(graph: Graph, params: Record<string, unknown>): Promise<CommandResult> {
        const { query } = params as { query: z.infer<typeof SchemaQueryTypeSchema> };

        try {
            const extractor = new SchemaExtractor(graph);
            const schema = extractor.extract();
            const dataManager = graph.getDataManager();

            switch (query) {
                case "nodeTypes": {
                    const types = typeValues(schema.nodeProperties, () => dataManager.nodes.values());

                    if (types.length === 0) {
                        return Promise.resolve({
                            success: true,
                            message:
                                "No distinct node types found. Nodes may not have a 'type' property, or there are too many unique values to categorize.",
                            data: { nodeTypes: [] },
                        });
                    }

                    return Promise.resolve({
                        success: true,
                        message: `Found ${types.length} node type${types.length !== 1 ? "s" : ""}: ${types.join(", ")}`,
                        data: { nodeTypes: types },
                    });
                }

                case "edgeTypes": {
                    const types = typeValues(schema.edgeProperties, () => dataManager.edges.values());

                    if (types.length === 0) {
                        return Promise.resolve({
                            success: true,
                            message:
                                "No distinct edge types found. Edges may not have a 'type' property, or there are too many unique values to categorize.",
                            data: { edgeTypes: [] },
                        });
                    }

                    return Promise.resolve({
                        success: true,
                        message: `Found ${types.length} edge type${types.length !== 1 ? "s" : ""}: ${types.join(", ")}`,
                        data: { edgeTypes: types },
                    });
                }

                case "nodeProperties": {
                    const props = schema.nodeProperties.map(describeProperty);

                    const lines = props.map((p) => `- ${p}`).join("\n");
                    return Promise.resolve({
                        success: true,
                        message: `Node properties:\n${lines}`,
                        data: { nodeProperties: schema.nodeProperties },
                    });
                }

                case "edgeProperties": {
                    const props = schema.edgeProperties.map(describeProperty);

                    if (props.length === 0) {
                        return Promise.resolve({
                            success: true,
                            message: "No edge properties found.",
                            data: { edgeProperties: [] },
                        });
                    }

                    const lines = props.map((p) => `- ${p}`).join("\n");
                    return Promise.resolve({
                        success: true,
                        message: `Edge properties:\n${lines}`,
                        data: { edgeProperties: schema.edgeProperties },
                    });
                }

                case "all": {
                    const nodeTypes = typeValues(schema.nodeProperties, () => dataManager.nodes.values());
                    const edgeTypes = typeValues(schema.edgeProperties, () => dataManager.edges.values());
                    const message = schemaSummaryMessage(schema, nodeTypes, edgeTypes);

                    return Promise.resolve({
                        success: true,
                        message,
                        data: {
                            nodeCount: schema.nodeCount,
                            edgeCount: schema.edgeCount,
                            nodeTypes,
                            edgeTypes,
                            nodeProperties: schema.nodeProperties,
                            edgeProperties: schema.edgeProperties,
                        },
                    });
                }

                default: {
                    return Promise.resolve({
                        success: false,
                        message: `Unknown schema query type: ${String(query)}`,
                    });
                }
            }
        } catch (error) {
            return Promise.resolve({
                success: false,
                message: `Failed to get schema: ${(error as Error).message}`,
            });
        }
    },
};
