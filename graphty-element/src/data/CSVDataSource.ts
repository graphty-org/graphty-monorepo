import { GraphFormatError } from "@graphty/graph-format";
import {
    type CommonImportOptions,
    csvImporter,
    type CsvImportOptions,
    headBytes,
    neo4jImporter,
    parseTextCell,
} from "@graphty/graph-io";

import type { AdHocData } from "../config";
import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";
import type { DataLoadingError } from "./ErrorAggregator.js";
import {
    aggregateErrors,
    type ImportedEdge,
    type ImportedNode,
    type ImportedRecord,
    type ImportedRecords,
    importRecords,
} from "./graph-io-import.js";

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
 *
 * A file the reader is not told the shape of is read as an edge table, and becomes a node table
 * only when its header has an `id` column ({@link CSVDataSource.readTable}). A node table's id is
 * its `id`, `Id` or `ID` column, else its row number ({@link CSVDataSource.readTable}).
 */
const VARIANT_TABLES: Readonly<Record<Exclude<CSVVariant, "neo4j">, CsvImportOptions>> = {
    "edge-list": { table: "edges" },
    gephi: { table: "edges", sourceColumn: "Source", targetColumn: "Target" },
    cytoscape: { table: "edges" },
    "adjacency-list": { table: "adjacency" },
    "node-list": { table: "nodes" },
    generic: { table: "edges" },
};

/**
 * The endpoint column pairs an edge table may be spelled with, in the order they are tried: the
 * same three pairs, in the same order, that the element's own endpoint resolution probes, so a
 * CSV and a JSON file spelled the same way are read the same way. Both halves must come from one
 * pair: a header with `source` and `dest` names no pair, rather than an edge from one half of each.
 */
const ENDPOINT_PAIRS: readonly (readonly [string, string])[] = [
    ["source", "target"],
    ["src", "dst"],
    ["from", "to"],
];

/** The header names that make a file the reader is not told the shape of a node list. */
const NODE_ID_COLUMNS: readonly string[] = ["id", "Id", "ID"];

/**
 * Type every text cell of the records on its own, as a number, a boolean or text.
 *
 * graph-io types a CSV column as a whole, so one cell that is not a number (`n/a`) turns every
 * number in its column into text. The element has always typed a cell by what it holds, which is
 * what numeric styling and weights read.
 * @param imported - the records, typed in place
 * @returns the records
 */
function typeCells(imported: ImportedRecords): ImportedRecords {
    for (const { data } of [...imported.nodes, ...imported.edges]) {
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === "string") {
                data[key] = parseTextCell(value);
            }
        }
    }

    return imported;
}

/**
 * The header of a file an explicit column option could not be found in, from graph-io's refusal.
 * @param error - what the import threw
 * @returns the file's column names, or null when the error is anything else
 */
function missingColumnHeader(error: unknown): string[] | null {
    if (!(error instanceof GraphFormatError) || error.code !== "E_UNSUPPORTED") {
        return null;
    }

    const { columns } = error.details;
    return Array.isArray(columns) ? columns.map(String) : null;
}

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
        // An empty file is an empty graph, as it is in every other format the element reads.
        if (content.trim() === "") {
            yield* this.emit([], []);
            return;
        }

        const variant =
            this.config.variant ?? ((neo4jImporter.sniff?.(headBytes(content)) ?? 0) >= 0.5 ? "neo4j" : "generic");

        if (variant === "neo4j") {
            yield* this.parseNeo4j(content);
            return;
        }

        const imported = await this.readTable(content, VARIANT_TABLES[variant], variant === "generic");
        if (imported === null) {
            yield* this.passThroughRows(content);
            return;
        }

        yield* this.emit(imported.nodes, imported.edges);
    }

    /**
     * Read a single table, choosing an edge table's endpoint columns.
     *
     * The endpoint columns are the configured ones, else the variant's, else the first pair of
     * {@link ENDPOINT_PAIRS} the header holds both halves of. A configured column the file does not
     * have is recorded as an error and nothing is read. The import's issues are recorded.
     * @param content - the file's text
     * @param table - the variant's table options
     * @param mayBeNodeList - read a header with no endpoint pair and an `id` column as a node table
     *     (a node table's own id column is looked for the same way, and is the row number without one)
     * @returns the records, or null when the header names no endpoint pair (and, where it may be a
     *     node list, no id column): the rows are then handed to the element unread
     */
    private async readTable(
        content: string,
        table: CsvImportOptions,
        mayBeNodeList: boolean,
    ): Promise<Pick<ImportedRecords, "nodes" | "edges"> | null> {
        const { edgeSource, edgeTarget } = this.config;
        const edgeTable = table.table === "edges";
        const nodeTable = table.table === "nodes";
        const chosen = edgeTable
            ? edgeSource !== undefined || edgeTarget !== undefined || table.sourceColumn !== undefined
            : this.config.idColumn !== undefined;
        let options = table;
        if (edgeTable) {
            options = {
                ...table,
                sourceColumn: edgeSource ?? table.sourceColumn ?? "source",
                targetColumn: edgeTarget ?? table.targetColumn ?? "target",
            };
        } else if (nodeTable) {
            options = { ...table, idColumn: this.config.idColumn ?? "id" };
        }

        let imported: ImportedRecords;
        try {
            imported = await this.importTable(content, options);
        } catch (error) {
            const header = missingColumnHeader(error);
            if (header === null) {
                throw error;
            }

            if (chosen) {
                this.addError({ message: (error as Error).message, category: "validation-error" });
                return { nodes: [], edges: [] };
            }

            const pair = ENDPOINT_PAIRS.find(([source, target]) => header.includes(source) && header.includes(target));
            const idColumn =
                mayBeNodeList || nodeTable ? NODE_ID_COLUMNS.find((name) => header.includes(name)) : undefined;
            if (edgeTable && pair !== undefined) {
                imported = await this.importTable(content, { ...table, sourceColumn: pair[0], targetColumn: pair[1] });
            } else if (idColumn !== undefined) {
                imported = await this.importTable(content, { table: "nodes", idColumn });
            } else if (nodeTable) {
                // No id column: each row's number is its id, and every column stays an attribute --
                // graph-io would otherwise take a `name`, `node` or `key` column as the id.
                const numbered = await this.importTable(content, { table: "nodes", nodeIdFrom: "index" });
                imported = { ...numbered, nodes: numbered.nodes.map(({ id, data }) => ({ id: String(id), data })) };
            } else {
                return null;
            }
        }

        aggregateErrors(imported.report, this.errorAggregator, true);
        return imported;
    }

    /**
     * Read one table with the options every CSV route shares.
     * @param content - the file's text
     * @param table - the variant's table options
     * @param nodes - a node file read before the edges, for a pair of files
     * @returns the records and the report
     */
    private async importTable(
        content: string,
        table: CsvImportOptions & CommonImportOptions,
        nodes?: string,
    ): Promise<ImportedRecords> {
        const { delimiter, idColumn } = this.config;
        // An adjacency table has no columns to name, and graph-io refuses a column option for one;
        // its `neighbour:weight` suffixes are its weight, which `weightFrom: null` would drop.
        const columns: CsvImportOptions & CommonImportOptions =
            table.table === "adjacency"
                ? {}
                : {
                      // Row 1 is always the header: sniffing for one reads a header of plain
                      // words over data rows of plain words as data.
                      header: true,
                      weightFrom: null,
                      typeColumn: null,
                      ...(idColumn === undefined ? {} : { idColumn }),
                  };
        return typeCells(
            await importRecords(csvImporter, content, {
                ids: "string",
                errorLimit: this.config.errorLimit,
                ...columns,
                ...table,
                ...(delimiter === undefined ? {} : { delimiter }),
                ...(nodes === undefined ? {} : { nodes }),
            }),
        );
    }

    /**
     * Hand the rows of a file whose header names no endpoint column to the element unread.
     *
     * Such a row is not a malformed edge, it is a file whose endpoint columns are named something
     * else entirely -- and the reader has no idea what. Dropping it produced a graph with no edges,
     * a pile of "Missing source" errors and a load that reported success. Handing it over unread
     * lets the ELEMENT refuse the batch and name the columns the file does carry, which is the one
     * message a reader can act on. The rows are read as a node table numbered by row, so no column
     * is taken as an id and every column of every row is kept.
     * @param content - the file's text
     * @yields the rows as edge records, and no nodes
     */
    private async *passThroughRows(content: string): AsyncGenerator<DataSourceChunk, void, unknown> {
        const rows = typeCells(
            await importRecords(csvImporter, content, {
                table: "nodes",
                header: true,
                nodeIdFrom: "index",
                weightFrom: null,
                errorLimit: this.config.errorLimit,
                ...(this.config.delimiter === undefined ? {} : { delimiter: this.config.delimiter }),
            }),
        );
        aggregateErrors(rows.report, this.errorAggregator, true);
        yield* this.chunkData([], rows.nodes.map(({ data }) => data) as AdHocData[]);
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
        aggregateErrors(imported.report, this.errorAggregator, true);

        const nodes = imported.nodes.map(({ id, data: { labels, ...data } }) => ({
            id,
            data: Array.isArray(labels) ? { ...data, label: labels.join(";") } : data,
        }));
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
        aggregateErrors(imported.report, this.errorAggregator, true);
        yield* this.emit(imported.nodes, imported.edges);
    }

    /**
     * Declare the direction a Gephi `Type` column states, then yield the records in chunks.
     *
     * The same `Type` column is read on every route -- a single edge file, or the edge file of a
     * pair: an export split into a node file and an edge file is the same export, and must not be
     * read as a different graph because of how it was handed over. It is declared before the first
     * chunk is yielded, and therefore before the first edge reaches the builder.
     * The id and endpoints are written last, so an attribute column that happens to be named
     * `id`, `source` or `target` cannot take their place.
     * @param nodes - the nodes
     * @param edges - the edges
     * @yields the chunks
     */
    private *emit(nodes: ImportedNode[], edges: ImportedEdge[]): Generator<DataSourceChunk, void, unknown> {
        const edgeRecords: ImportedRecord[] = edges.map(({ source, target, data }) => ({ ...data, source, target }));
        const declared = readGephiTypeColumn(edgeRecords);
        if (declared !== null) {
            this.declareDirection(declared.directed, declared.statedBy, declared.conflictingEdges);
        }

        yield* this.chunkData(
            nodes.map(({ id, data }) => ({ ...data, id })) as unknown as AdHocData[],
            edgeRecords as AdHocData[],
        );
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
}
