import {
    type CommonImportOptions,
    csvImporter,
    type CsvImportOptions,
    headBytes,
    neo4jImporter,
} from "@graphty/graph-io";

import type { AdHocData } from "../config";
import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";
import { type ImportedRecord, type ImportedRecords, importRecords, recordIssues } from "./graph-io-records.js";

/** The CSV shapes the reader can be told to read, or recognises when it is not told. */
export type CSVVariant = "neo4j" | "gephi" | "cytoscape" | "adjacency-list" | "edge-list" | "node-list" | "generic";

/**
 * The direction a Gephi edge CSV declares in its `Type` column, or null when it declares none.
 *
 * CSV has no header that speaks for the graph, and most CSV dialects say nothing about direction
 * at all -- an edge list of `source,target` pairs is exactly as compatible with a digraph as with
 * an undirected graph, so those importers stay silent and leave the element's own configuration
 * standing. Gephi's dialect is the exception: it writes a `Type` column holding `Directed` or
 * `Undirected`, per row.
 *
 * Per row means a Gephi CSV can describe a mixed graph, which the element's snapshot cannot hold.
 * A file whose rows disagree is read as DIRECTED, for the same reason a mixed Pajek file is:
 * storing a directed row in an undirected graph invents a reverse path the file denies, while
 * storing an undirected row in a directed graph drops one -- a loss that is countable, and counted
 * here. Rows that leave `Type` empty are not counted against either reading; they say nothing.
 * @param rows - every edge record of the file
 * @returns the declaration, or null when no row carried a usable `Type`
 */
function readGephiTypeColumn(
    rows: readonly Record<string, unknown>[],
): { directed: boolean; statedBy: string; conflictingEdges: number } | null {
    let directedRows = 0;
    let undirectedRows = 0;
    for (const row of rows) {
        const value = row.Type;
        if (typeof value !== "string") {
            continue;
        }

        const type = value.trim().toLowerCase();
        if (type === "directed") {
            directedRows++;
        } else if (type === "undirected") {
            undirectedRows++;
        }
    }

    if (directedRows > 0) {
        return { directed: true, statedBy: "Type=Directed", conflictingEdges: undirectedRows };
    }

    if (undirectedRows > 0) {
        return { directed: false, statedBy: "Type=Undirected", conflictingEdges: 0 };
    }

    return null;
}

/**
 * The graph-io table options each CSV variant is read with.
 *
 * `typeColumn: null` keeps a Gephi `Type` column as an attribute, as it always was: the element
 * declares the direction from it ({@link readGephiTypeColumn}) instead of letting the importer
 * fold undirected rows into pairs of arcs. `weightFrom: null` keeps a weight column under its own
 * name (`weight`, `Weight`), which is where the element's data bags have always carried it.
 */
const VARIANT_TABLES: Readonly<Record<Exclude<CSVVariant, "neo4j">, CsvImportOptions>> = {
    "edge-list": { table: "edges" },
    gephi: { table: "edges", sourceColumn: "Source", targetColumn: "Target" },
    cytoscape: { table: "edges" },
    "adjacency-list": { table: "adjacency" },
    "node-list": { table: "nodes", rowNumberIds: true },
    generic: { table: "auto" },
};

/** The graph-io issue a header naming no endpoint and no id column aborts with. */
const NO_ENDPOINT_COLUMNS = "E_CSV_NO_ENDPOINT_COLUMNS";

interface CSVDataSourceConfig extends BaseDataSourceConfig {
    /** The column separator. Worked out from the first rows (comma, tab, semicolon or pipe) when unset. */
    delimiter?: string;
    variant?: CSVVariant; // Allow explicit variant override
    /**
     * The column holding the node an edge starts at.
     *
     * Named `edgeSource` rather than `sourceColumn` so that ONE pair of option names describes the
     * endpoints for every format the element reads. The catalogue used to advertise
     * `edgeSrcIdPath`/`edgeDstIdPath` for JSON, `sourceColumn`/`targetColumn` for CSV and nothing
     * at all for the other five, which is three names for one fact.
     */
    edgeSource?: string;
    /** The column holding the node an edge ends at. See {@link CSVDataSourceConfig.edgeSource}. */
    edgeTarget?: string;
    idColumn?: string;
    // For paired files
    nodeFile?: File;
    edgeFile?: File;
    nodeURL?: string;
    edgeURL?: string;
}

/**
 * Data source for loading graph data from CSV files, read by `@graphty/graph-io`.
 * Supports edge lists (plain, Gephi, Cytoscape), adjacency lists, node lists, Neo4j admin-import
 * files and paired node and edge files.
 */
export class CSVDataSource extends DataSource {
    static readonly type = "csv";

    private config: CSVDataSourceConfig;

    /**
     * Creates a new CSVDataSource instance.
     * @param config - Configuration options for CSV parsing and data loading
     */
    constructor(config: CSVDataSourceConfig) {
        super(config.errorLimit ?? 100, config.chunkSize);
        this.config = {
            chunkSize: 1000,
            errorLimit: 100,
            ...config,
        };
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    /**
     * Fetches and parses CSV data into graph chunks.
     * Recognises a Neo4j file from its header; every other file is read as the variant asked for,
     * or as whatever table its header describes.
     * @yields DataSourceChunk objects containing parsed nodes and edges
     */
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        if (this.config.nodeFile || this.config.edgeFile || this.config.nodeURL || this.config.edgeURL) {
            yield* this.parsePairedFiles();
            return;
        }

        const content = await this.getContent();
        const variant =
            this.config.variant ?? ((neo4jImporter.sniff?.(headBytes(content)) ?? 0) >= 0.5 ? "neo4j" : "generic");

        if (variant === "neo4j") {
            yield* this.parseNeo4j(content);
            return;
        }

        const imported = await this.importTable(content, VARIANT_TABLES[variant]);
        if (imported.aborted && imported.report.issues.some((issue) => issue.code === NO_ENDPOINT_COLUMNS)) {
            yield* this.passThroughRows(content);
            return;
        }

        recordIssues(imported.report, this.errorAggregator);
        yield* this.emit(imported.nodes, imported.edges.map(renameAdjacencyWeight));
    }

    /**
     * Read one table with the options every CSV route shares.
     * @param content - the file's text
     * @param table - the variant's table options
     * @param nodes - a node file read before the edges, for a pair of files
     * @returns the records and the report
     */
    private importTable(content: string, table: CsvImportOptions, nodes?: string): Promise<ImportedRecords> {
        const { delimiter, edgeSource, edgeTarget, idColumn } = this.config;
        // An adjacency table has no columns to name, and graph-io refuses a column option for one;
        // its `neighbour:weight` suffixes are its weight, which `weightFrom: null` would drop.
        const columns: CsvImportOptions & CommonImportOptions =
            table.table === "adjacency"
                ? {}
                : {
                      weightFrom: null,
                      typeColumn: null,
                      ...(edgeSource === undefined ? {} : { sourceColumn: edgeSource }),
                      ...(edgeTarget === undefined ? {} : { targetColumn: edgeTarget }),
                      ...(idColumn === undefined ? {} : { idColumn }),
                  };
        return importRecords(csvImporter, content, {
            ids: "string",
            errorLimit: this.config.errorLimit,
            ...columns,
            ...table,
            ...(delimiter === undefined ? {} : { delimiter }),
            ...(nodes === undefined ? {} : { nodes }),
        });
    }

    /**
     * Hand the rows of a file whose header names no endpoint column to the element unread.
     *
     * Such a row is not a malformed edge, it is a file whose endpoint columns are named something
     * else entirely -- and the reader has no idea what. Dropping it produced a graph with no edges,
     * a pile of "Missing source" errors and a load that reported success. Handing it over unread
     * lets the ELEMENT refuse the batch and name the columns the file does carry, which is the one
     * message a reader can act on. The rows are read as a node table numbered by row, which keeps
     * every column of every row.
     * @param content - the file's text
     * @yields the rows as edge records, and no nodes
     */
    private async *passThroughRows(content: string): AsyncGenerator<DataSourceChunk, void, unknown> {
        const rows = await this.importTable(content, { table: "nodes", rowNumberIds: true, header: true });
        recordIssues(rows.report, this.errorAggregator);
        yield* this.emit(
            [],
            rows.nodes.map(({ id: _rowNumber, ...row }) => row),
        );
    }

    /**
     * Read a Neo4j admin-import file: node sections and relationship sections, each under its own
     * header row.
     *
     * The records keep the keys the element's reader always gave them: a node's `:LABEL` cell
     * arrives as `label` (several labels joined by `;`, as the cell wrote them) and a
     * relationship's `:TYPE` as `type`.
     *
     * This importer declares NO direction, deliberately. A Neo4j relationship is directed as a
     * property of the database, not as something the CSV states -- the file carries :START_ID and
     * :END_ID and no field that could say otherwise -- so there is nothing here to read. The
     * element's own configuration stands, and under "auto" that is already directed.
     * @param content - the file's text
     * @yields the nodes and relationships
     */
    private async *parseNeo4j(content: string): AsyncGenerator<DataSourceChunk, void, unknown> {
        const imported = await importRecords(neo4jImporter, content, {
            ids: "string",
            errorLimit: this.config.errorLimit,
            ...(this.config.delimiter === undefined ? {} : { delimiter: this.config.delimiter }),
        });
        recordIssues(imported.report, this.errorAggregator);

        const nodes = imported.nodes.map(({ labels, ...node }) =>
            Array.isArray(labels) ? { ...node, label: labels.join(";") } : node,
        );
        yield* this.emit(nodes, imported.edges);
    }

    private async *parsePairedFiles(): AsyncGenerator<DataSourceChunk, void, unknown> {
        // Validate that both URLs or both files are provided
        const hasNodeSource = !!(this.config.nodeURL ?? this.config.nodeFile);
        const hasEdgeSource = !!(this.config.edgeURL ?? this.config.edgeFile);

        if (!hasNodeSource || !hasEdgeSource) {
            throw new Error(
                "parsePairedFiles requires both node and edge sources. " +
                    "Provide either (nodeURL + edgeURL) or (nodeFile + edgeFile).",
            );
        }

        const nodeContent = this.config.nodeFile
            ? await this.config.nodeFile.text()
            : await (await this.fetchWithRetry(this.config.nodeURL ?? "")).text();
        const edgeContent = this.config.edgeFile
            ? await this.config.edgeFile.text()
            : await (await this.fetchWithRetry(this.config.edgeURL ?? "")).text();

        // The node file is read first, so its ids come first and its columns become the nodes'
        // attributes; each file's delimiter is worked out on its own.
        const imported = await this.importTable(edgeContent, { table: "edges" }, nodeContent);
        recordIssues(imported.report, this.errorAggregator);
        yield* this.emit(imported.nodes, imported.edges);
    }

    /**
     * Declare the direction a Gephi `Type` column states, then yield the records in chunks.
     *
     * The same `Type` column is read on every route -- a single edge file, or the edge file of a
     * pair: an export split into a node file and an edge file is the same export, and must not be
     * read as a different graph because of how it was handed over. It is declared before the first
     * chunk is yielded, and therefore before the first edge reaches the builder.
     * @param nodes - the node records
     * @param edges - the edge records
     * @yields the chunks
     */
    private *emit(nodes: ImportedRecord[], edges: ImportedRecord[]): Generator<DataSourceChunk, void, unknown> {
        const declared = readGephiTypeColumn(edges);
        if (declared !== null) {
            this.declareDirection(declared.directed, declared.statedBy, declared.conflictingEdges);
        }

        yield* this.chunkData(nodes as AdHocData[], edges as AdHocData[]);
    }
}

/**
 * An adjacency list's `neighbour:weight` suffix arrives in graph-io's exact weight column; the
 * element's data bags have always carried it as `weight`.
 * @param edge - the edge record
 * @returns the record with its weight under `weight`
 */
function renameAdjacencyWeight(edge: ImportedRecord): ImportedRecord {
    if (!("graphty.weight" in edge)) {
        return edge;
    }

    const { "graphty.weight": weight, ...rest } = edge;
    return { ...rest, weight };
}
