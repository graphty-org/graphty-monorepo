import type { Column, GraphSnapshot } from "@graphty/graph-format";
import { jsonImporter, jsonShapeOf, sniffJsonDialectHead } from "@graphty/graph-io";
import jmespath from "jmespath";
import { z } from "zod/v4";
import * as z4 from "zod/v4/core";

// import {JSONParser} from "@streamparser/json";
import type { AdHocData } from "../config/common";
import { GraphtyError } from "../errors";
import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource";
import { resolveEndpoints } from "./endpoints";
import { type DataLoadingError, ErrorAggregator } from "./ErrorAggregator";
import {
    aggregateErrors,
    columnsMapping,
    components,
    copiedPath,
    copyColumns,
    type ImportedGraph,
    importRecords,
    importWhole,
    type ReaderImport,
    type RecordMapping,
    rememberImport,
    toRecords,
} from "./graph-io-import";
import type { SourceInput } from "./source-bytes";

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
    data: z
        .union([
            z.string(),
            z.custom<Uint8Array | ArrayBuffer>((value) => value instanceof Uint8Array || value instanceof ArrayBuffer),
        ])
        .optional(),
    file: z.instanceof(File).optional(),
    url: z.string().optional(),
    chunkSize: z.number().optional(),
    errorLimit: z.number().optional(),
    // Kept unchecked here so that DataSource.graphChoice checks them, as it does for every reader.
    graphIndex: z.unknown().optional(),
    graphName: z.unknown().optional(),
    nodeIdPath: z.string().optional(),
    // An OBO Graphs document's ids: short prefixed ids (the default) or the IRIs the file holds.
    oboIds: z.enum(["curie", "iri"]).optional(),
    edgeSrcIdPath: z.string().optional(),
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

/** The attribute a record's position in the file is carried to graph-io and back under. */
const ROW_KEY = "graphty.row";

/** How much of a document's head is enough to tell its JSON dialect. */
const DIALECT_HEAD = 65536;

/** The JSON dialects whose documents are read whole by graph-io rather than as plain node and edge arrays. */
type ReadDialect = "cytoscape" | "graphology" | "vis";

/** The suffix graph-io gives a Cytoscape `data` key or a graphology attribute named like one of its own columns. */
const DATA_SUFFIX = "#data";

/**
 * The record mapping for a Cytoscape.js document: each `data` key under its own name, `position`
 * as graph-io reads it (`{x, y}`, with y pointing up where Cytoscape.js's points down), and
 * `parent` as the id of the parent node.
 * @param snapshot - the imported graph
 * @returns the mapping
 */
function cytoscapeMapping(snapshot: GraphSnapshot): RecordMapping {
    const position = snapshot.nodes.byRole("position");
    const parent = snapshot.nodes.byRole("parent");
    return {
        node(row, record): void {
            copyColumns(snapshot.nodes, row, record);
            if (position?.isSet(row)) {
                const [x, y, z] = components(position, row);
                record[position.meta.name] = position.meta.extra.sourceDims === 3 ? { x, y, z } : { x, y };
            }

            if (parent?.isSet(row)) {
                record[parent.meta.name] = snapshot.ids.idOf(parent.value(row) as number);
            }
        },
        edge(row, record): void {
            copyColumns(snapshot.edges, row, record);
        },
        path: (kind, column) =>
            kind === "node" && (column === position || column === parent) ? null : copiedPath(kind, column),
    };
}

/** The suffix graph-io gives a key a dialect does not define, read from the element itself. */
const ELEMENT_SUFFIX = "#element";

/**
 * Where a graphology or vis.js record holds the value graph-io read into a column: a graphology
 * attribute under `attributes`, any other key at the top of the record. graph-io names a column
 * after its key, with `#data` for an attribute and `#element` for a top-level key that took a name
 * already used.
 * @param record - one record that holds a value of the column
 * @param name - the column's name
 * @returns the keys down to the value, or null when the record holds it under neither
 */
function rawPath(record: Record<string, unknown>, name: string): string[] | null {
    if (name.endsWith(ELEMENT_SUFFIX)) {
        return [name.slice(0, -ELEMENT_SUFFIX.length)];
    }

    const attributes = isObject(record.attributes) ? record.attributes : null;
    const key = name.endsWith(DATA_SUFFIX) ? name.slice(0, -DATA_SUFFIX.length) : name;
    if (attributes !== null && Object.hasOwn(attributes, key)) {
        return ["attributes", key];
    }

    return key === name && Object.hasOwn(record, name) ? [name] : null;
}

/**
 * The import a graphology or vis.js document's records came from, with each column's place on
 * the file's own records, found on the first record that holds a value of it.
 * @param imported - graph-io's import of the document
 * @param nodes - the node records handed to the element
 * @param edges - the edge records handed to the element, one per edge graph-io kept, in order
 * @returns the reader import
 */
function dialectImport(
    imported: ImportedGraph,
    nodes: readonly Record<string, unknown>[],
    edges: readonly Record<string, unknown>[],
): ReaderImport {
    const { snapshot } = imported;
    const byId = new Map<unknown, Record<string, unknown>>();
    for (const node of nodes) {
        if (!byId.has(node.id)) {
            byId.set(node.id, node);
        }
    }

    const pair = snapshot.edges.byRole("pair");
    const edgeRecords = new Map<number, Record<string, unknown>>();
    for (let row = 0, logical = 0; row < snapshot.edgeCount; row++) {
        if (!(pair?.isSet(row) && (pair.value(row) as number) < row) && logical < edges.length) {
            edgeRecords.set(row, edges[logical++]);
        }
    }

    const paths = new Map<Column, string[] | null>();
    const find = (kind: "node" | "edge", column: Column): string[] | null => {
        if (column.meta.role !== null || copiedPath(kind, column) === null) {
            return null;
        }

        const rows = kind === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        for (let row = 0; row < rows; row++) {
            const record = kind === "node" ? byId.get(snapshot.ids.idOf(row)) : edgeRecords.get(row);
            if (record !== undefined && column.isSet(row)) {
                return rawPath(record, column.meta.name);
            }
        }

        return null;
    };

    return {
        imported,
        path: (kind, name) => {
            const column = (kind === "node" ? snapshot.nodes : snapshot.edges).get(name);
            if (column === null || column === undefined) {
                return null;
            }

            if (!paths.has(column)) {
                paths.set(column, find(kind, column));
            }

            return paths.get(column) ?? null;
        },
    };
}

/** The keys a node record may carry its id under when no `nodeIdPath` is configured, in the order they are tried. */
const ID_KEYS = ["id", "name", "key", "label"] as const;

/**
 * A JMESPath expression that is a single object key, which is all graph-io reads a key as.
 * @param expression - the configured expression
 * @returns the key, or null when the expression is anything more
 */
function plainKey(expression: string): string | null {
    return /^[A-Za-z_]\w*$/.test(expression) ? expression : null;
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
    /**
     * The graphs of a JGF or OBO Graphs `graphs` array; any other document holds one graph.
     * @param input - the document's text or bytes
     * @returns one listing per graph
     */
    static listGraphs = (input: SourceInput): ReturnType<NonNullable<typeof jsonImporter.listGraphs>> =>
        (jsonImporter.listGraphs as NonNullable<typeof jsonImporter.listGraphs>)(input);
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
        const { data } = this.opts;
        const isUrl =
            typeof data === "string" &&
            (data.startsWith("http://") || data.startsWith("https://") || data.startsWith("data:"));

        return {
            data: isUrl ? undefined : data,
            file: this.opts.file,
            url: isUrl ? data : this.opts.url,
            chunkSize: this.opts.chunkSize,
            errorLimit: this.opts.errorLimit,
            ...({ graphIndex: this.opts.graphIndex, graphName: this.opts.graphName } as Pick<
                BaseDataSourceConfig,
                "graphIndex" | "graphName"
            >),
        };
    }

    /**
     * Fetches and parses JSON data into graph chunks.
     *
     * The node and edge arrays are found with the configured JMESPath expressions and read by
     * graph-io's node-link importer, which checks every node's id and every edge's endpoints. The
     * records the element receives are the ones the file wrote, unchanged, less the edges graph-io
     * refused. Every node record is handed over, so the element counts a node with no usable id and
     * a repeated id, and applies the load's duplicate-id choice.
     *
     * Two things graph-io cannot read are handed to the element as the file wrote them: nodes
     * whose id is a JMESPath expression rather than a key, and edges whose endpoints no key names
     * -- the element resolves the first and refuses the second, naming the keys the records carry.
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

        // A `graphs` array (JGF, OBO Graphs) is read by graph-io, which picks the graph the caller
        // chose; the default paths find nothing at the root of such a document.
        if (isObject(data) && Array.isArray(data.graphs) && this.usesDefaultPaths()) {
            yield* this.readGraphsArray(jsonString, data.graphs);
            return;
        }

        this.refuseOtherGraph();

        // Declared before the first chunk is yielded, so the direction reaches the builder while it
        // still holds no edges.
        const declared = readDirectedKey(data);
        if (declared !== null) {
            this.declareDirection(declared.directed, declared.statedBy);
        }

        const dialect = this.usesDefaultPaths() ? sniffJsonDialectHead(jsonString.slice(0, DIALECT_HEAD)) : null;
        if (dialect === "cytoscape" || dialect === "graphology" || dialect === "vis") {
            yield* this.readDialect(jsonString, data, dialect);
            return;
        }

        const rawNodes = this.locate(data, this.opts.node.path, "nodes");
        const rawEdges = this.locate(data, this.opts.edge.path, "edges");

        const idKey = this.nodeIdKey(rawNodes);
        const endpoints = this.endpointKeys(rawEdges);

        // graph-io is handed only what it checks -- each record's id or endpoints -- plus the
        // record's position, and the records the element receives are the file's own, so every
        // value keeps the type, the key and the digits the file wrote.
        const stub = (record: unknown, row: number, keys: readonly string[]): unknown =>
            isObject(record) ? Object.fromEntries([...keys.map((key) => [key, record[key]]), [ROW_KEY, row]]) : record;
        const imported = await importRecords(
            jsonImporter,
            JSON.stringify({
                nodes: idKey === null ? [] : rawNodes.map((node, row) => stub(node, row, [idKey])),
                edges:
                    endpoints === null
                        ? []
                        : rawEdges.map((edge, row) => stub(edge, row, [endpoints.source, endpoints.target])),
            }),
            {
                dialect: "node-link",
                nodesPath: "nodes",
                edgesPath: "edges",
                nodeIdKey: idKey ?? "id",
                ...(endpoints === null ? {} : { sourceKey: endpoints.source, targetKey: endpoints.target }),
                indexLinks: false,
                weightFrom: null,
                ids: "keep",
                defaultDirected: true,
                errorLimit: this.opts.errorLimit,
            },
        );
        aggregateErrors(imported.report, this.errorAggregator, true);

        // An edge naming a node the file never declared adds that node to the import, with no
        // position; the element materialises such an endpoint itself, and has never been handed a
        // record for it.
        const rowsOf = (records: readonly { data: Record<string, unknown> }[]): number[] =>
            records.flatMap(({ data }) => (typeof data[ROW_KEY] === "number" ? [data[ROW_KEY]] : []));
        // Every node record is handed over, including one with no usable id and one repeating an
        // earlier id: the element counts the first as rejected and the second as a duplicate, and
        // applies its duplicate-id policy, rather than graph-io folding them where nothing counts them.
        const nodes =
            idKey === null
                ? rawNodes.filter((node, index) => this.isValidNode(node, index))
                : rawNodes.filter(isObject);
        const edges =
            endpoints === null
                ? rawEdges.filter((edge, index) => this.isValidEdge(edge, index))
                : rowsOf(imported.edges).map((row) => rawEdges[row]);

        if (idKey !== null && endpoints !== null && this.usesDefaultPaths()) {
            // The file's styles, read on demand from the whole document: its graph attributes hold
            // the block a graphty export writes, which the import above was not handed.
            const options = {
                dialect: "node-link" as const,
                nodeIdKey: idKey,
                sourceKey: endpoints.source,
                targetKey: endpoints.target,
                indexLinks: false,
                weightFrom: null,
                ids: "keep" as const,
                defaultDirected: true,
                errorLimit: Number.POSITIVE_INFINITY,
            };
            rememberImport(this, async () =>
                dialectImport(
                    await importWhole(jsonImporter, jsonString, options, new ErrorAggregator(Number.MAX_SAFE_INTEGER)),
                    nodes as Record<string, unknown>[],
                    edges as Record<string, unknown>[],
                ),
            );
        }

        yield* this.chunkData(nodes as AdHocData[], edges as AdHocData[]);
    }

    /**
     * Whether the caller left every path at its default, so the document's own shape decides.
     * @returns true when no node, edge, id or endpoint path is configured
     */
    private usesDefaultPaths(): boolean {
        const { node, edge, nodeIdPath, edgeSrcIdPath, edgeDstIdPath } = this.opts;
        return (
            node.path === "nodes" &&
            edge.path === "edges" &&
            nodeIdPath === undefined &&
            edgeSrcIdPath === undefined &&
            edgeDstIdPath === undefined
        );
    }

    /**
     * Read the chosen graph of a `graphs` array through graph-io's JSON importer, which knows the
     * JGF and OBO Graphs shapes; every column becomes a key of the record.
     * @param text - the document
     * @param graphs - its `graphs` array
     * @yields DataSourceChunk objects containing the graph's nodes and edges
     */
    private async *readGraphsArray(
        text: string,
        graphs: readonly unknown[],
    ): AsyncGenerator<DataSourceChunk, void, unknown> {
        const choice = this.graphChoice();
        const imported = await importWhole(
            jsonImporter,
            text,
            {
                ...choice,
                ...(this.opts.errorLimit === undefined ? {} : { errorLimit: this.opts.errorLimit }),
                ...(this.opts.oboIds === undefined ? {} : { oboIds: this.opts.oboIds }),
            },
            this.errorAggregator,
            { firstDeclarationWins: true },
        );
        const { snapshot } = imported;
        const nameOf = (graph: unknown): unknown =>
            isObject(graph) ? (graph.id ?? graph.label ?? graph.lbl) : undefined;
        const chosen =
            graphs[
                choice.graphIndex ??
                    Math.max(
                        0,
                        graphs.findIndex((g) => nameOf(g) === choice.graphName),
                    )
            ];
        if ("obographs" in snapshot.meta.extra) {
            this.declareDirection(true, "an OBO Graphs document, whose edges point from sub to obj");
        } else if (isObject(chosen) && typeof chosen.directed === "boolean") {
            this.declareDirection(chosen.directed, `"directed": ${String(chosen.directed)}`);
        }

        const { nodes, edges } = toRecords(imported, columnsMapping(snapshot), this);
        yield* this.chunkData(nodes, edges);
    }

    /**
     * Read a Cytoscape.js, graphology or vis.js document through graph-io's reader for its dialect,
     * which knows where each one keeps its elements, ids and attributes.
     *
     * A Cytoscape.js element becomes a record of its `data` keys, its `position` and its `classes`.
     * A graphology or vis.js record is handed over as the file wrote it, as every node-link record
     * is: a graphology node gains `id`, its key, and keeps its attributes under `attributes`. Every
     * node record is handed over, so the element counts a repeated id; an edge is handed over when
     * graph-io kept it.
     * @param text - the document
     * @param data - the parsed document
     * @param dialect - the dialect graph-io recognised
     * @yields DataSourceChunk objects containing the graph's nodes and edges
     */
    private async *readDialect(
        text: string,
        data: unknown,
        dialect: ReadDialect,
    ): AsyncGenerator<DataSourceChunk, void, unknown> {
        const imported = await importWhole(
            jsonImporter,
            text,
            {
                dialect,
                ids: "keep",
                weightFrom: null,
                ...(this.opts.errorLimit === undefined ? {} : { errorLimit: this.opts.errorLimit }),
            },
            this.errorAggregator,
            { firstDeclarationWins: true },
        );
        if (dialect === "cytoscape") {
            const { nodes, edges } = toRecords(imported, cytoscapeMapping(imported.snapshot), this);
            yield* this.chunkData(nodes, edges);
            return;
        }

        const { snapshot } = imported;
        const root = isObject(data) ? data : {};
        const rawNodes = Array.isArray(root.nodes) ? root.nodes.filter(isObject) : [];
        const nodes =
            dialect === "graphology"
                ? rawNodes.map((node) => ("id" in node || !("key" in node) ? node : { id: node.key, ...node }))
                : rawNodes;
        const edges = this.keptEdges(snapshot, Array.isArray(root.edges) ? root.edges : [], dialect);
        rememberImport(this, () => dialectImport(imported, nodes, edges));
        yield* this.chunkData(nodes as AdHocData[], edges as AdHocData[]);
    }

    /**
     * The edge records graph-io kept, in file order: each of its edges is matched to the next
     * record that names the same two endpoints, which skips the records it refused.
     * @param snapshot - the imported graph
     * @param rawEdges - the document's edge records
     * @param dialect - graphology or vis
     * @returns the kept records
     */
    private keptEdges(
        snapshot: GraphSnapshot,
        rawEdges: readonly unknown[],
        dialect: "graphology" | "vis",
    ): Record<string, unknown>[] {
        const shape = jsonShapeOf(snapshot);
        const sourceKey = shape?.sourceKey ?? (dialect === "vis" ? "from" : "source");
        const targetKey = shape?.targetKey ?? (dialect === "vis" ? "to" : "target");
        const pair = snapshot.edges.byRole("pair");
        const kept: Record<string, unknown>[] = [];
        let next = 0;
        for (let row = 0; row < snapshot.edgeCount; row++) {
            if (pair?.isSet(row) && (pair.value(row) as number) < row) {
                continue;
            }

            const source = String(snapshot.ids.idOf(snapshot.edgeSource(row)));
            const target = String(snapshot.ids.idOf(snapshot.edgeTarget(row)));
            while (next < rawEdges.length) {
                const edge = rawEdges[next++];
                if (isObject(edge) && String(edge[sourceKey]) === source && String(edge[targetKey]) === target) {
                    kept.push(edge);
                    break;
                }
            }
        }

        return kept;
    }

    /**
     * Refuse a choice of any graph but the first of a document that holds one.
     * @throws A `GraphtyError` with `E_OPTION_RANGE` for `graphName`, or a `graphIndex` above 0.
     */
    private refuseOtherGraph(): void {
        const { graphIndex, graphName } = this.graphChoice();
        if (graphName === undefined && (graphIndex ?? 0) === 0) {
            return;
        }

        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: "this JSON document holds one graph, so there is no other graph to choose",
            source: "config",
            details: {
                kind: "format",
                id: this.type,
                option: graphName === undefined ? "graphIndex" : "graphName",
                value: graphName ?? graphIndex,
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
                source: this.opts.edgeSrcIdPath ?? null,
                target: this.opts.edgeDstIdPath ?? null,
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
