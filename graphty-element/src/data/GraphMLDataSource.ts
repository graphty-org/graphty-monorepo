import { XMLParser } from "fast-xml-parser";

import type { AdHocData } from "../config/common.js";
import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";

// GraphML has no additional config currently, so just use the base config
type GraphMLDataSourceConfig = BaseDataSourceConfig;

interface GraphMLKey {
    name: string;
    type: string;
    for: "node" | "edge" | "graph";
    yfilesType?: string;
}

interface YFilesShapeNode {
    "y:Geometry"?: {
        "@_x"?: string;
        "@_y"?: string;
        "@_width"?: string;
        "@_height"?: string;
    };
    "y:Fill"?: {
        "@_color"?: string;
        "@_transparent"?: string;
    };
    "y:BorderStyle"?: {
        "@_color"?: string;
        "@_type"?: string;
        "@_width"?: string;
    };
    "y:NodeLabel"?: string | { "#text"?: string };
    "y:Shape"?: {
        "@_type"?: string;
    };
}

interface YFilesPolyLineEdge {
    "y:LineStyle"?: {
        "@_color"?: string;
        "@_type"?: string;
        "@_width"?: string;
    };
    "y:Arrows"?: {
        "@_source"?: string;
        "@_target"?: string;
    };
}

/**
 * The direction the `<graph>` element declares, or null when it declares none.
 *
 * GraphML states direction in one place, `edgedefault`, and the specification makes the attribute
 * REQUIRED -- so unlike GEXF or GML there is no format-assigned default to fall back on, and a
 * file that omits it has not said anything the element may act on.
 * @param graph - the parsed `<graph>` element
 * @returns the direction and the text that stated it, or null when the attribute is absent or
 *     carries a value GraphML does not define
 */
function readEdgeDefault(graph: { "@_edgedefault"?: unknown }): { directed: boolean; statedBy: string } | null {
    const attribute = graph["@_edgedefault"];
    if (typeof attribute !== "string") {
        return null;
    }

    const value = attribute.trim().toLowerCase();
    if (value !== "directed" && value !== "undirected") {
        return null;
    }

    return { directed: value === "directed", statedBy: `edgedefault="${attribute}"` };
}

/**
 * Whether an edge's own `directed` attribute says directed, or null when it says nothing usable.
 *
 * GraphML spells this one as the XML boolean `true` / `false`, not as the `directed` /
 * `undirected` keywords `edgedefault` uses.
 * @param edge - the parsed `<edge>` element
 * @returns true, false, or null when the attribute is absent or unreadable
 */
function readEdgeDirected(edge: { "@_directed"?: unknown }): boolean | null {
    const attribute = edge["@_directed"];
    if (typeof attribute !== "string") {
        return null;
    }

    const value = attribute.trim().toLowerCase();
    if (value === "true") {
        return true;
    }

    return value === "false" ? false : null;
}

/**
 * Data source for loading graph data from GraphML files.
 * Supports GraphML format with yFiles extensions for node shapes and edge styles.
 */
export class GraphMLDataSource extends DataSource {
    static readonly type = "graphml";

    private config: GraphMLDataSourceConfig;

    /**
     * Creates a new GraphMLDataSource instance.
     * @param config - Configuration options for GraphML parsing and data loading
     */
    constructor(config: GraphMLDataSourceConfig) {
        super(config.errorLimit ?? 100, config.chunkSize);
        this.config = config;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    /**
     * Fetches and parses GraphML format data into graph chunks.
     * @yields DataSourceChunk objects containing parsed nodes and edges
     */
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        // Get XML content
        const xmlContent = await this.getContent();

        // Parse XML
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            parseAttributeValue: false, // Keep as strings, we'll parse by type
            trimValues: true,
        });

        let parsed;
        try {
            parsed = parser.parse(xmlContent);
        } catch (error) {
            throw new Error(`Failed to parse GraphML XML: ${error instanceof Error ? error.message : String(error)}`);
        }

        const { graphml } = parsed;
        if (!graphml) {
            throw new Error("Invalid GraphML: missing <graphml> root element");
        }

        // Parse key definitions
        const keys = this.parseKeyDefinitions(graphml.key);

        // Get graph element
        const { graph } = graphml;
        if (!graph) {
            // Empty graphml file - return empty data
            return;
        }

        // Parse and yield nodes in chunks
        const nodes = this.parseNodes(graph.node, keys);
        const declared = readEdgeDefault(graph as { "@_edgedefault"?: unknown });
        const { edges, conflicts } = this.parseEdges(graph.edge, keys, declared?.directed ?? null);

        // Declared BEFORE the first chunk is yielded, so the direction reaches the builder while it
        // still holds no edges. A file with no `edgedefault` declares nothing: the attribute is
        // REQUIRED by the GraphML specification, so its absence is a malformed document rather
        // than a statement, and a malformed document is not something to read a direction out of.
        if (declared !== null) {
            this.declareDirection(declared.directed, declared.statedBy, conflicts);
        }

        // Use shared chunking helper
        yield* this.chunkData(nodes as AdHocData[], edges as AdHocData[]);
    }

    private parseKeyDefinitions(keyData: unknown): Map<string, GraphMLKey> {
        const keys = new Map<string, GraphMLKey>();

        if (!keyData) {
            return keys;
        }

        const keyArray = Array.isArray(keyData) ? keyData : [keyData];

        for (const key of keyArray) {
            const id = key["@_id"];
            const name = key["@_attr.name"] ?? key["@_name"] ?? id;
            const type = key["@_attr.type"] ?? key["@_type"] ?? "string";
            const forElement = key["@_for"] ?? "node";
            const yfilesType = key["@_yfiles.type"];

            keys.set(id, {
                name,
                type,
                for: forElement as "node" | "edge" | "graph",
                yfilesType,
            });
        }

        return keys;
    }

    private parseNodes(nodeData: unknown, keys: Map<string, GraphMLKey>): unknown[] {
        if (!nodeData) {
            return [];
        }

        const nodeArray = Array.isArray(nodeData) ? nodeData : [nodeData];
        const nodes: unknown[] = [];

        for (const node of nodeArray) {
            try {
                const id = node["@_id"];
                if (!id) {
                    this.errorAggregator.addError({
                        message: "Node missing id attribute",
                        category: "missing-value",
                        field: "id",
                    });
                    continue;
                }

                const parsedNode: Record<string, unknown> = { id };

                // Parse data elements
                if (node.data) {
                    const dataElements = Array.isArray(node.data) ? node.data : [node.data];

                    for (const data of dataElements) {
                        const keyId = data["@_key"];
                        const keyDef = keys.get(keyId);

                        if (keyDef?.for === "node") {
                            // Check if this is yFiles node graphics data
                            if (keyDef.yfilesType === "nodegraphics" && data["y:ShapeNode"]) {
                                const yFilesProps = this.parseYFilesShapeNode(data["y:ShapeNode"] as YFilesShapeNode);
                                Object.assign(parsedNode, yFilesProps);
                            } else {
                                // Standard GraphML data element
                                const value = data["#text"] ?? data;
                                parsedNode[keyDef.name] = this.parseValue(value, keyDef.type);
                            }
                        }
                    }
                }

                nodes.push(parsedNode);
            } catch (error) {
                const canContinue = this.errorAggregator.addError({
                    message: `Failed to parse node: ${error instanceof Error ? error.message : String(error)}`,
                    category: "parse-error",
                });

                if (!canContinue) {
                    throw new Error(`Too many errors (${this.errorAggregator.getErrorCount()}), aborting parse`);
                }
            }
        }

        return nodes;
    }

    /**
     * Parse the `<edge>` children, and count the ones that contradict the graph's declaration.
     *
     * A GraphML edge may carry `directed="true|false"` of its own, which overrides `edgedefault`
     * for that edge alone and so makes a MIXED graph expressible in the file but not in the
     * element, whose snapshot holds one direction flag for the whole graph. `edgedefault` is what
     * the element adopts, because it is the file's statement about the graph AS A WHOLE. The
     * per-edge value is not discarded: it is kept on the edge record as `directed`, where a style
     * layer can still read it, and the count returned here is what the element logs.
     * @param edgeData - the parsed `<edge>` elements
     * @param keys - the key definitions
     * @param declaredDirected - what `edgedefault` declared, or null when it declared nothing
     * @returns the edge records, and how many carried a `directed` attribute that disagrees
     */
    private parseEdges(
        edgeData: unknown,
        keys: Map<string, GraphMLKey>,
        declaredDirected: boolean | null,
    ): { edges: unknown[]; conflicts: number } {
        if (!edgeData) {
            return { edges: [], conflicts: 0 };
        }

        const edgeArray = Array.isArray(edgeData) ? edgeData : [edgeData];
        const edges: unknown[] = [];
        let conflicts = 0;

        for (const edge of edgeArray) {
            try {
                const src = edge["@_source"];
                const dst = edge["@_target"];

                if (!src || !dst) {
                    this.errorAggregator.addError({
                        message: "Edge missing source or target attribute",
                        category: "missing-value",
                        field: !src ? "source" : "target",
                    });
                    continue;
                }

                const parsedEdge: Record<string, unknown> = { source: src, target: dst };

                const edgeDirected = readEdgeDirected(edge as { "@_directed"?: unknown });
                if (edgeDirected !== null) {
                    parsedEdge.directed = edgeDirected;
                    if (declaredDirected !== null && edgeDirected !== declaredDirected) {
                        conflicts++;
                    }
                }

                // Parse data elements
                if (edge.data) {
                    const dataElements = Array.isArray(edge.data) ? edge.data : [edge.data];

                    for (const data of dataElements) {
                        const keyId = data["@_key"];
                        const keyDef = keys.get(keyId);

                        if (keyDef?.for === "edge") {
                            // Check if this is yFiles edge graphics data
                            if (keyDef.yfilesType === "edgegraphics" && data["y:PolyLineEdge"]) {
                                const yFilesProps = this.parseYFilesPolyLineEdge(
                                    data["y:PolyLineEdge"] as YFilesPolyLineEdge,
                                );
                                Object.assign(parsedEdge, yFilesProps);
                            } else {
                                // Standard GraphML data element
                                const value = data["#text"] ?? data;
                                parsedEdge[keyDef.name] = this.parseValue(value, keyDef.type);
                            }
                        }
                    }
                }

                edges.push(parsedEdge);
            } catch (error) {
                const canContinue = this.errorAggregator.addError({
                    message: `Failed to parse edge: ${error instanceof Error ? error.message : String(error)}`,
                    category: "parse-error",
                });

                if (!canContinue) {
                    throw new Error(`Too many errors (${this.errorAggregator.getErrorCount()}), aborting parse`);
                }
            }
        }

        return { edges, conflicts };
    }

    private parseValue(value: string | object, type: string): unknown {
        // Handle case where value is an object (like #text wrapper)
        const stringValue = typeof value === "string" ? value : JSON.stringify(value);

        switch (type) {
            case "int":
            case "long":
                return Number.parseInt(stringValue, 10);
            case "float":
            case "double":
                return Number.parseFloat(stringValue);
            case "boolean":
                return stringValue.toLowerCase() === "true" || stringValue === "1";
            default:
                return stringValue;
        }
    }

    /**
     * Maps yFiles shape types to Graphty shape types
     * @param yfilesShape - yFiles shape type identifier
     * @returns Corresponding Graphty shape type
     */
    private mapYFilesShape(yfilesShape: string): string {
        const shapeMap: Record<string, string> = {
            rectangle: "box",
            roundrectangle: "box",
            ellipse: "sphere",
            circle: "sphere",
            diamond: "box",
            parallelogram: "box",
            hexagon: "box",
            octagon: "box",
            triangle: "box",
        };

        return shapeMap[yfilesShape.toLowerCase()] ?? "box";
    }

    /**
     * Normalizes color to standard hex format (#RRGGBB)
     * @param color - Color value in any format
     * @returns Normalized hex color string
     */
    private normalizeColor(color: string): string {
        const hexPattern = /^#[0-9A-Fa-f]{6}$/;
        const shortHexPattern = /^#[0-9A-Fa-f]{3}$/;

        // Already in hex format
        if (hexPattern.exec(color)) {
            return color.toUpperCase();
        }

        // Short hex format
        if (shortHexPattern.exec(color)) {
            const r = color[1];
            const g = color[2];
            const b = color[3];

            return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
        }

        // Return as-is if not recognized (could add more formats later)
        return color;
    }

    /**
     * Parses yFiles ShapeNode data and extracts visual properties
     * @param shapeNode - yFiles ShapeNode data structure
     * @returns Object containing extracted node properties
     */
    private parseYFilesShapeNode(shapeNode: YFilesShapeNode): Record<string, unknown> {
        const properties: Record<string, unknown> = {};

        // Extract geometry
        if (shapeNode["y:Geometry"]) {
            const geom = shapeNode["y:Geometry"];
            const position: { x?: number; y?: number; z?: number } = {};

            if (geom["@_x"]) {
                position.x = Number.parseFloat(geom["@_x"]);
            }

            if (geom["@_y"]) {
                position.y = Number.parseFloat(geom["@_y"]);
            }

            // yFiles uses 2D coordinates, set z to 0 for fixed layout
            position.z = 0;

            // Only add position if we have at least x or y
            if (position.x !== undefined || position.y !== undefined) {
                properties.position = position;
            }

            if (geom["@_width"]) {
                properties.width = Number.parseFloat(geom["@_width"]);
            }

            if (geom["@_height"]) {
                properties.height = Number.parseFloat(geom["@_height"]);
            }
        }

        // Extract fill color
        if (shapeNode["y:Fill"]?.["@_color"]) {
            properties.color = this.normalizeColor(shapeNode["y:Fill"]["@_color"]);
        }

        // Extract border style
        if (shapeNode["y:BorderStyle"]) {
            const border = shapeNode["y:BorderStyle"];

            if (border["@_color"]) {
                properties.borderColor = this.normalizeColor(border["@_color"]);
            }

            if (border["@_width"]) {
                properties.borderWidth = Number.parseFloat(border["@_width"]);
            }
        }

        // Extract node label
        if (shapeNode["y:NodeLabel"]) {
            const label = shapeNode["y:NodeLabel"];
            properties.label = typeof label === "string" ? label : (label["#text"] ?? "");
        }

        // Extract and map shape
        if (shapeNode["y:Shape"]?.["@_type"]) {
            properties.shape = this.mapYFilesShape(shapeNode["y:Shape"]["@_type"]);
        }

        return properties;
    }

    /**
     * Parses yFiles PolyLineEdge data and extracts visual properties
     * @param polyLineEdge - yFiles PolyLineEdge data structure
     * @returns Object containing extracted edge properties
     */
    private parseYFilesPolyLineEdge(polyLineEdge: YFilesPolyLineEdge): Record<string, unknown> {
        const properties: Record<string, unknown> = {};

        // Extract line style
        if (polyLineEdge["y:LineStyle"]) {
            const lineStyle = polyLineEdge["y:LineStyle"];

            if (lineStyle["@_color"]) {
                properties.color = this.normalizeColor(lineStyle["@_color"]);
            }

            if (lineStyle["@_width"]) {
                properties.width = Number.parseFloat(lineStyle["@_width"]);
            }
        }

        // Extract arrows (determines if directed and arrow type)
        if (polyLineEdge["y:Arrows"]) {
            const arrows = polyLineEdge["y:Arrows"];
            const targetArrow = arrows["@_target"];
            const sourceArrow = arrows["@_source"];

            // Edge is directed if it has a target arrow (and source is none)
            properties.directed = targetArrow !== "none" && targetArrow !== undefined;

            // Extract arrow types
            if (targetArrow && targetArrow !== "none") {
                properties.targetArrow = targetArrow;
            }

            if (sourceArrow && sourceArrow !== "none") {
                properties.sourceArrow = sourceArrow;
            }
        }

        return properties;
    }
}
