import { XMLParser } from "fast-xml-parser";

import type { AdHocData } from "../config/common.js";
import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";

// GEXF has no additional config currently, so just use the base config
type GEXFDataSourceConfig = BaseDataSourceConfig;

interface GEXFAttribute {
    id: string;
    title: string;
    type: string;
}

/**
 * Whether a GEXF edge type keyword means a directed edge, or null when it is not one of the three
 * the format defines.
 *
 * The keywords are `directed`, `undirected` and `mutual`; `mutual` is an edge that exists in both
 * directions, which in a graph that carries ONE direction flag is the undirected reading -- and is
 * the reading every other GEXF consumer takes, NetworkX included.
 * @param type - the value of a `type` or `defaultedgetype` attribute
 * @returns true for directed, false for undirected or mutual, null for anything else
 */
function edgeTypeIsDirected(type: string): boolean | null {
    switch (type.trim().toLowerCase()) {
        case "directed":
            return true;
        case "undirected":
        case "mutual":
            return false;
        default:
            return null;
    }
}

/**
 * Settle the graph's direction from what the `<graph>` element said and what the edges said.
 *
 * GEXF can state direction in two places, and they can disagree. Which one wins depends on whether
 * the graph element actually WROTE its direction:
 *
 * - It wrote one. That is the file's statement about the graph as a whole, and it stands. One
 *   `type` attribute must not decide how the other quarter-million edges are read. Every edge that
 *   says otherwise is counted and reported, so the element can say out loud what it overrode.
 * - It wrote none, and some edges did. Then those edges are the only direction statement in the
 *   file, and a directed one among them decides it. Reading such a file as undirected would invent
 *   a reverse path for every edge the author explicitly marked directed -- the same harm that makes
 *   a mixed Pajek or Gephi file resolve to directed rather than away from it. Losing one direction
 *   of an undirected edge is countable, and counted; inventing an edge is not.
 * - Nobody wrote one. The GEXF schema's own default stands, which is undirected.
 * @param declared - what the `<graph>` element said, and whether it actually said it
 * @param declared.directed - the direction that statement or default carries
 * @param declared.written - true only when the file itself wrote `defaultedgetype`
 * @param declared.statedBy - the text to report as having settled it
 * @param statedDirected - how many edges carried a `type` meaning directed
 * @param statedUndirected - how many edges carried a `type` meaning undirected or mutual
 * @returns the direction to adopt, the text that settled it, and how many edges it overrode
 */
function resolveDirection(
    declared: { directed: boolean; written: boolean; statedBy: string },
    statedDirected: number,
    statedUndirected: number,
): { directed: boolean; statedBy: string; conflicts: number } {
    if (!declared.written && statedDirected > 0) {
        return {
            directed: true,
            statedBy: `type="directed" on ${statedDirected} edge(s), with no defaultedgetype on <graph>`,
            conflicts: statedUndirected,
        };
    }

    return {
        directed: declared.directed,
        statedBy: declared.statedBy,
        conflicts: declared.directed ? statedUndirected : statedDirected,
    };
}

/**
 * Data source for loading graph data from GEXF (Graph Exchange XML Format) files.
 * Supports node and edge attributes, attribute types, and dynamic graphs.
 */
export class GEXFDataSource extends DataSource {
    static readonly type = "gexf";

    private config: GEXFDataSourceConfig;

    /**
     * Creates a new GEXFDataSource instance.
     * @param config - Configuration options for GEXF parsing and data loading
     */
    constructor(config: GEXFDataSourceConfig) {
        super(config.errorLimit ?? 100, config.chunkSize);
        this.config = config;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    /**
     * Fetches and parses GEXF format data into graph chunks.
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
            isArray: (name) => {
                // These elements should always be treated as arrays
                return ["node", "edge", "attribute", "attvalue"].includes(name);
            },
        });

        let parsed;
        try {
            parsed = parser.parse(xmlContent);
        } catch (error) {
            throw new Error(`Failed to parse GEXF XML: ${error instanceof Error ? error.message : String(error)}`);
        }

        const { gexf } = parsed;
        if (!gexf) {
            throw new Error("Invalid GEXF: missing <gexf> root element");
        }

        // Get graph element
        const { graph } = gexf;
        if (!graph) {
            throw new Error("Invalid GEXF: missing <graph> element");
        }

        // Parse attribute definitions
        const nodeAttributes = this.parseAttributeDefinitions(graph.attributes, "node");
        const edgeAttributes = this.parseAttributeDefinitions(graph.attributes, "edge");

        // Parse and yield nodes in chunks
        const nodes = this.parseNodes(graph.nodes?.node, nodeAttributes);
        const declared = this.readDefaultEdgeType(graph as { "@_defaultedgetype"?: unknown });
        const { edges, statedDirected, statedUndirected } = this.parseEdges(graph.edges?.edge, edgeAttributes);
        const resolved = resolveDirection(declared, statedDirected, statedUndirected);

        // The resolved direction is declared BEFORE the first chunk is yielded, so that it reaches
        // the builder while it is still empty -- which is the only moment the builder accepts one.
        this.declareDirection(resolved.directed, resolved.statedBy, resolved.conflicts);

        // Use shared chunking helper
        yield* this.chunkData(nodes, edges);
    }

    /**
     * The direction the `<graph>` element declares.
     *
     * `defaultedgetype` is optional in GEXF and its schema gives it the default `undirected`, so a
     * GEXF file that omits it is NOT silent about its direction: it has said undirected, the same
     * way it would have by writing the attribute out, and that is how every other GEXF reader
     * takes it, NetworkX included.
     *
     * WHY THE CALLER IS TOLD WHETHER THE ATTRIBUTE WAS WRITTEN. A direction the file's author typed
     * out and a direction the schema supplied for them are not equally strong, and the difference
     * decides what happens when the edges say something else. An author who wrote
     * `defaultedgetype="undirected"` and then marked one edge `type="directed"` described a mixed
     * graph, and the graph-level statement is the one to keep. An author who wrote no
     * `defaultedgetype` at all and marked every edge `type="directed"` stated direction in exactly
     * one place, and reading that file as undirected would invent a reverse path for every edge in
     * it. Both cases arrive here as `directed: false`; only `written` separates them.
     *
     * An unreadable value is reported as unwritten, because a keyword GEXF does not define is not a
     * statement the element can act on -- but the text says the attribute was there and could not
     * be read, rather than claiming the file omitted it.
     * @param graph - the parsed `<graph>` element
     * @returns the direction, whether the file actually wrote it, and the text that stated it
     */
    private readDefaultEdgeType(graph: { "@_defaultedgetype"?: unknown }): {
        directed: boolean;
        written: boolean;
        statedBy: string;
    } {
        const attribute = graph["@_defaultedgetype"];
        if (typeof attribute === "string") {
            const directed = edgeTypeIsDirected(attribute);
            if (directed !== null) {
                return { directed, written: true, statedBy: `defaultedgetype="${attribute}"` };
            }

            return {
                directed: false,
                written: false,
                statedBy: `an unreadable defaultedgetype="${attribute}", leaving the GEXF default (undirected)`,
            };
        }

        return { directed: false, written: false, statedBy: "the GEXF default for an absent defaultedgetype (undirected)" };
    }

    private parseAttributeDefinitions(attributesData: unknown, forClass: "node" | "edge"): Map<string, GEXFAttribute> {
        const attributes = new Map<string, GEXFAttribute>();

        if (!attributesData) {
            return attributes;
        }

        // Handle single or multiple <attributes> elements
        const attrGroups = Array.isArray(attributesData) ? attributesData : [attributesData];

        for (const group of attrGroups) {
            const groupClass = (group as { "@_class"?: string })["@_class"];
            if (groupClass !== forClass) {
                continue;
            }

            const attrList = (group as { attribute?: unknown[] }).attribute;
            if (!attrList) {
                continue;
            }

            const attrArray = Array.isArray(attrList) ? attrList : [attrList];

            for (const attr of attrArray) {
                const attrObj = attr as {
                    "@_id": string;
                    "@_title": string;
                    "@_type": string;
                };
                const id = attrObj["@_id"];
                const title = attrObj["@_title"] || id;
                const type = attrObj["@_type"] || "string";

                attributes.set(id, { id, title, type });
            }
        }

        return attributes;
    }

    private parseNodes(nodeData: unknown, attributes: Map<string, GEXFAttribute>): AdHocData[] {
        if (!nodeData) {
            return [] as AdHocData[];
        }

        const nodeArray = Array.isArray(nodeData) ? nodeData : [nodeData];
        const nodes: Record<string, unknown>[] = [];

        for (const node of nodeArray) {
            try {
                const nodeObj = node as {
                    "@_id": string;
                    "@_label"?: string;
                    attvalues?: { attvalue?: unknown[] };
                    "viz:position"?: {
                        "@_x"?: string;
                        "@_y"?: string;
                        "@_z"?: string;
                    };
                    "viz:color"?: {
                        "@_r"?: string;
                        "@_g"?: string;
                        "@_b"?: string;
                        "@_a"?: string;
                    };
                    "viz:size"?: {
                        "@_value"?: string;
                    };
                };

                const id = nodeObj["@_id"];
                if (!id) {
                    this.errorAggregator.addError({
                        message: "Node missing id attribute",
                        category: "missing-value",
                        field: "id",
                    });
                    continue;
                }

                const nodeData: Record<string, unknown> = { id };

                // Add label if present
                if (nodeObj["@_label"]) {
                    nodeData.label = nodeObj["@_label"];
                }

                // Parse attribute values
                if (nodeObj.attvalues?.attvalue) {
                    const attvalues = Array.isArray(nodeObj.attvalues.attvalue)
                        ? nodeObj.attvalues.attvalue
                        : [nodeObj.attvalues.attvalue];

                    for (const attvalue of attvalues) {
                        const attObj = attvalue as { "@_for": string; "@_value": string };
                        const attrId = attObj["@_for"];
                        const value = attObj["@_value"];

                        const attrDef = attributes.get(attrId);
                        if (attrDef) {
                            nodeData[attrDef.title] = this.parseValue(value, attrDef.type);
                        }
                    }
                }

                // Parse viz namespace elements
                if (nodeObj["viz:position"]) {
                    const pos = nodeObj["viz:position"];
                    nodeData.position = {
                        x: pos["@_x"] ? parseFloat(pos["@_x"]) : 0,
                        y: pos["@_y"] ? parseFloat(pos["@_y"]) : 0,
                        z: pos["@_z"] ? parseFloat(pos["@_z"]) : 0,
                    };
                }

                if (nodeObj["viz:color"]) {
                    const color = nodeObj["viz:color"];
                    nodeData.color = {
                        r: color["@_r"] ? parseInt(color["@_r"], 10) : 0,
                        g: color["@_g"] ? parseInt(color["@_g"], 10) : 0,
                        b: color["@_b"] ? parseInt(color["@_b"], 10) : 0,
                        a: color["@_a"] ? parseFloat(color["@_a"]) : 1.0,
                    };
                }

                if (nodeObj["viz:size"]) {
                    const size = nodeObj["viz:size"];
                    nodeData.size = size["@_value"] ? parseFloat(size["@_value"]) : 1.0;
                }

                nodes.push(nodeData);
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

        return nodes as AdHocData[];
    }

    /**
     * Parse the `<edges>` children, and tally what each one said about its own direction.
     *
     * A GEXF edge may carry its own `type`, which makes a MIXED graph expressible in the file and
     * not in the element: the snapshot holds one direction flag for the whole graph. So the two
     * tallies returned here are raw counts rather than a count of disagreements -- which edges
     * disagree cannot be known until the graph's direction is settled, and on a file that never
     * wrote `defaultedgetype` these tallies are what settles it. {@link resolveDirection} decides.
     *
     * Nothing is thrown away either way: each edge keeps its own `type` on its record, so a style
     * layer can still draw that one edge differently.
     * @param edgeData - the parsed `<edge>` elements
     * @param attributes - the edge attribute definitions
     * @returns the edge records, and how many edges stated each direction
     */
    private parseEdges(
        edgeData: unknown,
        attributes: Map<string, GEXFAttribute>,
    ): { edges: AdHocData[]; statedDirected: number; statedUndirected: number } {
        if (!edgeData) {
            return { edges: [] as AdHocData[], statedDirected: 0, statedUndirected: 0 };
        }

        const edgeArray = Array.isArray(edgeData) ? edgeData : [edgeData];
        const edges: Record<string, unknown>[] = [];
        let statedDirected = 0;
        let statedUndirected = 0;

        for (const edge of edgeArray) {
            try {
                const edgeObj = edge as {
                    "@_id"?: string;
                    "@_source": string;
                    "@_target": string;
                    "@_weight"?: string;
                    "@_type"?: string;
                    "@_label"?: string;
                    attvalues?: { attvalue?: unknown[] };
                };

                const src = edgeObj["@_source"];
                const dst = edgeObj["@_target"];

                if (!src || !dst) {
                    this.errorAggregator.addError({
                        message: "Edge missing source or target attribute",
                        category: "missing-value",
                        field: !src ? "source" : "target",
                    });
                    continue;
                }

                const edgeData: Record<string, unknown> = { source: src, target: dst };

                // Add optional attributes
                if (edgeObj["@_id"]) {
                    // Under `gexfId`, never `id`. `id` on an edge record means the element's own
                    // counter, and a record that carries its own `id` wins the collision in any
                    // consumer that spreads the record after the element's id -- which is exactly
                    // what the application's edge table did, so a GEXF file's identifiers silently
                    // replaced the element's everywhere a reader could see them.
                    edgeData.gexfId = edgeObj["@_id"];
                }

                if (edgeObj["@_label"]) {
                    edgeData.label = edgeObj["@_label"];
                }

                if (edgeObj["@_weight"]) {
                    edgeData.weight = parseFloat(edgeObj["@_weight"]);
                }

                if (edgeObj["@_type"]) {
                    edgeData.type = edgeObj["@_type"];

                    // Counted rather than compared, because which of these disagrees with the graph
                    // is not known until the graph's own direction is settled -- and on a file that
                    // never wrote `defaultedgetype`, these tallies are what settles it.
                    const edgeDirected = edgeTypeIsDirected(edgeObj["@_type"]);
                    if (edgeDirected === true) {
                        statedDirected++;
                    } else if (edgeDirected === false) {
                        statedUndirected++;
                    }
                }

                // Parse attribute values
                if (edgeObj.attvalues?.attvalue) {
                    const attvalues = Array.isArray(edgeObj.attvalues.attvalue)
                        ? edgeObj.attvalues.attvalue
                        : [edgeObj.attvalues.attvalue];

                    for (const attvalue of attvalues) {
                        const attObj = attvalue as { "@_for": string; "@_value": string };
                        const attrId = attObj["@_for"];
                        const value = attObj["@_value"];

                        const attrDef = attributes.get(attrId);
                        if (attrDef) {
                            edgeData[attrDef.title] = this.parseValue(value, attrDef.type);
                        }
                    }
                }

                edges.push(edgeData);
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

        return { edges: edges as AdHocData[], statedDirected, statedUndirected };
    }

    private parseValue(value: string, type: string): string | number | boolean {
        switch (type) {
            case "integer":
            case "long":
                return parseInt(value, 10);
            case "float":
            case "double":
                return parseFloat(value);
            case "boolean":
                return value === "true" || value === "1";
            default:
                return value;
        }
    }
}
