import { ImportError, jsonImporter } from "@graphty/graph-io";
import jmespath from "jmespath";
import { z } from "zod/v4";
import * as z4 from "zod/v4/core";

// import {JSONParser} from "@streamparser/json";
import type { AdHocData } from "../config/common";
import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource";
import { resolveEndpoints } from "./endpoints";
import type { DataLoadingError } from "./ErrorAggregator";
import { aggregateErrors, copyColumns, importDocument, type ImportedGraph, toRecords } from "./graph-io-import";

const JsonNodeConfig = z
    .strictObject({
        path: z.string().default("nodes"),
        schema: z.custom<z4.$ZodObject>().or(z.null()).default(null),
    })
    .prefault({});

const JsonEdgeConfig = z
    .strictObject({
        path: z.string().default("edges"),
        schema: z.custom<z4.$ZodObject>().or(z.null()).default(null),
    })
    .prefault({});

export const JsonDataSourceConfig = z.object({
    data: z.string().optional(),
    file: z.instanceof(File).optional(),
    url: z.string().optional(),
    chunkSize: z.number().optional(),
    errorLimit: z.number().optional(),
    nodeIdPath: z.string().optional(),
    /** The key an edge's source is read from; the element's option name for every format. */
    edgeSource: z.string().optional(),
    /** The key an edge's target is read from. See `edgeSource`. */
    edgeTarget: z.string().optional(),
    /** The older name of `edgeSource`, still read when `edgeSource` is not given. */
    edgeSrcIdPath: z.string().optional(),
    /** The older name of `edgeTarget`, still read when `edgeTarget` is not given. */
    edgeDstIdPath: z.string().optional(),
    node: JsonNodeConfig,
    edge: JsonEdgeConfig,
});

type JsonDataSourceConfigType = z.infer<typeof JsonDataSourceConfig>;

/**
 * The direction a JSON document declares at its root, or null when it declares none.
 *
 * There is no JSON graph format, only conventions, and this reads the one that is nearly
 * universal: the top-level `directed` boolean of node-link JSON, which is what NetworkX's
 * `node_link_data` writes and what D3, sigma and vis.js documents inherit from it when they carry
 * the key at all. A document without it -- a Cytoscape `elements` document, a bare
 * `{nodes, links}` pair -- has said nothing, and nothing is what this reports: JSON is the format
 * where a guess would be most tempting and least founded, because the shape of the document says
 * nothing about whether its links point.
 *
 * The key is read from the document ROOT, independently of the JMESPath expressions that find the
 * nodes and edges, because it is the root that the convention puts it at. Anything other than a
 * boolean there is not the convention and is ignored.
 * @param document - the parsed JSON document
 * @returns the direction and the text that stated it, or null when the root carries no boolean
 *     `directed` key
 */
function readDirectedKey(document: unknown): { directed: boolean; statedBy: string } | null {
    if (document === null || typeof document !== "object" || Array.isArray(document)) {
        return null;
    }

    const value = (document as { directed?: unknown }).directed;
    if (typeof value !== "boolean") {
        return null;
    }

    return { directed: value, statedBy: `"directed": ${String(value)}` };
}

/** The keys a node record may carry its id under when no `nodeIdPath` is configured, in the order they are tried. */
const ID_KEYS = ["id", "name", "key", "label"] as const;

/**
 * A JMESPath expression that is a single object key, which is all graph-io reads a key as.
 * @param expression - the configured expression
 * @returns the key, or null when the expression is anything more
 */
function plainKey(expression: string): string | null {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(expression) ? expression : null;
}

/**
 * Whether a value can be a node id: a string or a finite number.
 * @param value - the value
 * @returns true for an id graph-io reads as it is
 */
function isIdValue(value: unknown): value is string | number {
    return typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

/**
 * Put graph-io's reading of the records it was handed back among the records it was not, in file
 * order. When graph-io did not hand back one record per record it was given, the ones it was
 * given go through as the file wrote them too.
 * @param all - every record, as the file wrote it
 * @param sent - which of them graph-io read
 * @param read - graph-io's records, in the order they were handed over
 * @returns the records, in file order
 */
function interleave(all: readonly unknown[], sent: readonly boolean[], read: readonly unknown[]): unknown[] {
    const count = sent.filter(Boolean).length;
    let next = 0;
    return all.map((record, index) => (sent[index] && read.length === count ? read[next++] : record));
}

/**
 * Whether a value is a JSON object (not an array, not null).
 * @param value - the value
 * @returns true for an object
 */
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Data source for loading graph data from JSON files.
 * Supports JMESPath queries for extracting nodes and edges from complex JSON structures.
 */
export class JsonDataSource extends DataSource {
    static type = "json";
    opts: JsonDataSourceConfigType;

    /**
     * Creates a new JsonDataSource instance.
     * @param anyOpts - Configuration options for JSON parsing and data extraction
     */
    constructor(anyOpts: object) {
        const opts = JsonDataSourceConfig.parse(anyOpts);

        // Pass errorLimit and chunkSize to base class
        super(opts.errorLimit ?? 100, opts.chunkSize ?? DataSource.DEFAULT_CHUNK_SIZE);

        this.opts = opts;
        if (opts.node.schema) {
            this.nodeSchema = opts.node.schema;
        }

        if (opts.edge.schema) {
            this.edgeSchema = opts.edge.schema;
        }
    }

    protected getConfig(): BaseDataSourceConfig {
        // JsonDataSource has special handling for 'data' field:
        // If data starts with http/https/data:, treat it as URL
        // Otherwise treat it as inline JSON
        const isUrl =
            (this.opts.data?.startsWith("http://") ?? false) ||
            (this.opts.data?.startsWith("https://") ?? false) ||
            (this.opts.data?.startsWith("data:") ?? false);

        return {
            data: isUrl ? undefined : this.opts.data,
            file: this.opts.file,
            url: isUrl ? this.opts.data : this.opts.url,
            chunkSize: this.opts.chunkSize,
            errorLimit: this.opts.errorLimit,
        };
    }

    /**
     * Fetches and parses JSON data into graph chunks.
     *
     * The node and edge arrays are found with the configured JMESPath expressions and read by
     * graph-io's node-link importer, which checks every record and types every value. The records
     * that come back keep the keys the file wrote: a node's id under the key it was read from, an
     * edge's endpoints under the spelling the file uses (`source`/`target`, `src`/`dst` or
     * `from`/`to`), and every other value exactly as the file held it.
     *
     * A record graph-io cannot read under those keys is handed to the element as the file wrote
     * it, in its place: a node whose id is a JMESPath expression, is missing or repeats an earlier
     * id, and an edge whose endpoints are not both under the chosen keys. The element resolves
     * them with its own keys, keeps the first record of a repeated id, and refuses an edge whose
     * endpoints no key names, naming the keys the records carry.
     * @yields DataSourceChunk objects containing parsed nodes and edges
     */
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        let data: unknown;

        // Get JSON content (could be from data, file, or url)
        const jsonString = await this.getContent();

        // Handle empty content gracefully
        if (jsonString.trim() === "") {
            yield* this.chunkData([], []);
            return;
        }

        // Parse JSON
        try {
            data = JSON.parse(jsonString);
        } catch (error) {
            this.addError({
                message: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
                category: "parse-error",
            });

            yield* this.chunkData([], []);
            return;
        }

        // Declared before the first chunk is yielded, so the direction reaches the builder while it
        // still holds no edges.
        const declared = readDirectedKey(data);
        if (declared !== null) {
            this.declareDirection(declared.directed, declared.statedBy);
        }

        const rawNodes = this.locate(data, this.opts.node.path, "nodes");
        const rawEdges = this.locate(data, this.opts.edge.path, "edges");

        const idKey = this.nodeIdKey(rawNodes);
        const endpoints = this.endpointKeys(rawEdges);

        // graph-io reads the records whose id and endpoints sit under the keys chosen here. Every
        // other record reaches the element as the file wrote it, in its place, for the element to
        // resolve with its own keys: a node without the key or repeating an id already read (the
        // element keeps the first record of an id; graph-io would merge the two), an edge without
        // both keys. graph-io is never the one to drop or merge a record the element would read.
        const seenIds = new Set<unknown>();
        const sentNodes = rawNodes.map((node) => {
            if (idKey === null || !isObject(node) || !isIdValue(node[idKey]) || seenIds.has(node[idKey])) {
                return false;
            }

            seenIds.add(node[idKey]);
            return true;
        });
        const sentEdges = rawEdges.map(
            (edge) =>
                endpoints !== null &&
                isObject(edge) &&
                isIdValue(edge[endpoints.source]) &&
                isIdValue(edge[endpoints.target]),
        );

        const read = await this.read(
            rawNodes.filter((_, index) => sentNodes[index]),
            rawEdges.filter((_, index) => sentEdges[index]),
            idKey ?? "id",
            endpoints,
        );

        const nodes = interleave(rawNodes, sentNodes, read.nodes).filter(
            (node, index) => sentNodes[index] || this.isValidNode(node, index),
        );
        const edges = interleave(rawEdges, sentEdges, read.edges).filter(
            (edge, index) => sentEdges[index] || this.isValidEdge(edge, index),
        );

        yield* this.chunkData(nodes as AdHocData[], edges as AdHocData[]);
    }

    /**
     * Read node and edge records through graph-io's node-link importer.
     *
     * The records that come back keep the keys the file wrote: the id under `idKey`, the endpoints
     * under the keys chosen for them, and every other value exactly as the file held it. Written
     * last, so a value the file also carries under another of those keys stays where it was.
     * @param nodes - node records, each with a unique id under `idKey`
     * @param edges - edge records, each with both endpoint keys
     * @param idKey - the key of a node's id
     * @param endpoints - the keys of an edge's endpoints
     * @returns graph-io's records, one per record handed over and in the same order, or none when
     *     graph-io gave up on them
     */
    private async read(
        nodes: unknown[],
        edges: unknown[],
        idKey: string,
        endpoints: { source: string; target: string } | null,
    ): Promise<{ nodes: unknown[]; edges: unknown[] }> {
        let imported: ImportedGraph;
        try {
            imported = await importDocument(
                jsonImporter,
                JSON.stringify({ nodes, edges }),
                {
                    dialect: "node-link",
                    nodesPath: "nodes",
                    edgesPath: "edges",
                    nodeIdKey: idKey,
                    ...(endpoints === null ? {} : { sourceKey: endpoints.source, targetKey: endpoints.target }),
                    indexLinks: false,
                    weightFrom: null,
                    ids: "keep",
                    defaultDirected: true,
                    errorLimit: this.opts.errorLimit,
                },
                "any",
                { verbatim: true },
            );
        } catch (error) {
            if (!(error instanceof ImportError)) {
                throw error;
            }

            aggregateErrors(error.report, this.errorAggregator, true);
            return { nodes: [], edges: [] };
        }

        aggregateErrors(imported.report, this.errorAggregator, true);
        const { snapshot } = imported;
        return toRecords(imported, {
            node: (row, record) => {
                const { id } = record;
                delete record.id;
                copyColumns(snapshot.nodes, row, record);
                record[idKey] = id;
            },
            edge: (row, record) => {
                const { source, target } = record;
                delete record.source;
                delete record.target;
                copyColumns(snapshot.edges, row, record);
                if (endpoints !== null) {
                    record[endpoints.source] = source;
                    record[endpoints.target] = target;
                }
            },
        });
    }

    /**
     * Find one of the two arrays with its JMESPath expression.
     * @param data - the parsed document
     * @param path - the configured expression
     * @param what - "nodes" or "edges", for the messages
     * @returns the array, or an empty one when the expression finds nothing usable
     */
    private locate(data: unknown, path: string, what: "nodes" | "edges"): unknown[] {
        let found: unknown;
        try {
            found = jmespath.search(data, path);
        } catch (error) {
            this.addError({
                message: `Failed to extract ${what} using path '${path}': ${error instanceof Error ? error.message : String(error)}`,
                category: "parse-error",
                field: what,
            });
            return [];
        }

        if (Array.isArray(found)) {
            return found;
        }

        // A path that names nothing is an empty array, as it always was.
        if (found !== null && found !== undefined) {
            this.addError({
                message: `Expected '${what}' at path '${path}' to be an array, got ${typeof found}`,
                category: "validation-error",
                field: what,
            });
        }

        return [];
    }

    /**
     * The key that holds a node's id, when graph-io can read it.
     *
     * The configured `nodeIdPath` when it is a key, else the first of `id`, `name`, `key` and
     * `label` that some record carries -- the identifier keys this reader has always accepted.
     * Null when the configured path is a JMESPath expression rather than a key.
     * @param nodes - the node records
     * @returns the key, or null
     */
    private nodeIdKey(nodes: readonly unknown[]): string | null {
        if (this.opts.nodeIdPath !== undefined) {
            return plainKey(this.opts.nodeIdPath);
        }

        return ID_KEYS.find((key) => nodes.some((node) => isObject(node) && key in node)) ?? "id";
    }

    /**
     * The keys that name an edge's endpoints, when graph-io can read them.
     *
     * The spelling is the one the element itself would resolve (`src/data/endpoints.ts`): the
     * configured keys, else the first of `source`/`target`, `src`/`dst` and `from`/`to` that some
     * record carries. Null when no key names them, or when a configured one is a JMESPath
     * expression rather than a key: the records then reach the element as the file wrote them.
     * @param edges - the edge records
     * @returns the two keys, or null
     */
    private endpointKeys(edges: readonly unknown[]): { source: string; target: string } | null {
        let resolved: { source: string; target: string };
        try {
            resolved = resolveEndpoints(edges.filter(isObject), {
                source: this.opts.edgeSource ?? this.opts.edgeSrcIdPath ?? null,
                target: this.opts.edgeTarget ?? this.opts.edgeDstIdPath ?? null,
            });
        } catch {
            return null;
        }

        const source = plainKey(resolved.source);
        const target = plainKey(resolved.target);
        return source === null || target === null ? null : { source, target };
    }

    /**
     * Record an error, and stop the load at the error limit as every reader does.
     * @param error - the error
     */
    private addError(error: DataLoadingError): void {
        if (!this.errorAggregator.addError(error)) {
            throw new Error(`Too many errors (${this.errorAggregator.getErrorCount()}), aborting parse`);
        }
    }

    /**
     * Validates a node object and logs errors if invalid.
     * Returns true if the node is valid and should be included.
     * @param node - The node object to validate
     * @param index - Index of the node in the array
     * @returns True if valid, false otherwise
     */
    private isValidNode(node: unknown, index: number): boolean {
        if (node === null || node === undefined) {
            const canContinue = this.errorAggregator.addError({
                message: `Node at index ${index} is null or undefined`,
                category: "validation-error",
                field: "nodes",
                line: index,
            });

            if (!canContinue) {
                throw new Error(`Too many errors (${this.errorAggregator.getErrorCount()}), aborting parse`);
            }

            return false;
        }

        if (typeof node !== "object") {
            const canContinue = this.errorAggregator.addError({
                message: `Node at index ${index} is not an object (got ${typeof node})`,
                category: "validation-error",
                field: "nodes",
                line: index,
            });

            if (!canContinue) {
                throw new Error(`Too many errors (${this.errorAggregator.getErrorCount()}), aborting parse`);
            }

            return false;
        }

        // Check for id field (common requirement - accept common identifier field names)
        // If a custom nodeIdPath is specified, also accept that field
        const nodeObj = node as Record<string, unknown>;
        const customIdPath = this.opts.nodeIdPath;
        const hasId =
            "id" in nodeObj ||
            "name" in nodeObj ||
            "key" in nodeObj ||
            "label" in nodeObj ||
            (customIdPath !== undefined && customIdPath in nodeObj);
        if (!hasId) {
            const expectedFields = customIdPath
                ? `'id', 'name', 'key', 'label', or '${customIdPath}'`
                : "'id', 'name', 'key', or 'label'";
            const canContinue = this.errorAggregator.addError({
                message: `Node at index ${index} is missing identifier field (expected ${expectedFields})`,
                category: "missing-value",
                field: "nodes.id",
                line: index,
            });

            if (!canContinue) {
                throw new Error(`Too many errors (${this.errorAggregator.getErrorCount()}), aborting parse`);
            }

            return false;
        }

        return true;
    }

    /**
     * Validates an edge object and logs errors if invalid.
     * Returns true if the edge is valid and should be included.
     * @param edge - The edge object to validate
     * @param index - Index of the edge in the array
     * @returns True if valid, false otherwise
     */
    private isValidEdge(edge: unknown, index: number): boolean {
        if (edge === null || edge === undefined) {
            const canContinue = this.errorAggregator.addError({
                message: `Edge at index ${index} is null or undefined`,
                category: "validation-error",
                field: "edges",
                line: index,
            });

            if (!canContinue) {
                throw new Error(`Too many errors (${this.errorAggregator.getErrorCount()}), aborting parse`);
            }

            return false;
        }

        if (typeof edge !== "object") {
            const canContinue = this.errorAggregator.addError({
                message: `Edge at index ${index} is not an object (got ${typeof edge})`,
                category: "validation-error",
                field: "edges",
                line: index,
            });

            if (!canContinue) {
                throw new Error(`Too many errors (${this.errorAggregator.getErrorCount()}), aborting parse`);
            }

            return false;
        }

        // WHETHER A RECORD NAMES ITS ENDPOINTS IS NOT THIS READER'S QUESTION. It used to be: a
        // record carrying none of the six accepted keys was dropped here, one error per record,
        // and the load then finished "successfully" with a graph of unconnected nodes. The
        // element's own endpoint resolution answers the same question ONCE for the batch and
        // refuses it with `E_EDGE_ENDPOINTS_UNRESOLVED`, naming the keys the records actually
        // carry -- which is the message a reader can act on, and the only one that can name a
        // column the reader chose. This reader checks that an edge is an OBJECT, which is its own
        // question, and passes the record through.
        return true;
    }
}
