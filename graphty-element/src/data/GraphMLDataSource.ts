import type { Column, GraphSnapshot } from "@graphty/graph-format";
import { GRAPHML_ISSUE, graphmlImporter } from "@graphty/graph-io/graphml";

import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";
import {
    aggregateErrors,
    attributeKey,
    attributeTitle,
    cell,
    importDocument,
    type RecordMapping,
    toRecords,
} from "./graph-io-import.js";

// GraphML has no additional config currently, so just use the base config
type GraphMLDataSourceConfig = BaseDataSourceConfig;

/**
 * The record key a column lands under unchanged, or null when the records leave it out.
 *
 * A key the file declared lands under its `attr.name`. A column graph-io derived from an extension's
 * markup (its origin names a namespace and the column is named `<namespace>.<field>`) lands under
 * its field, as `label`, `width` or `color`; the extension's markup tree itself is left out. The stored
 * position is written by `toRecords`, as for every format.
 * @param kind - node or edge
 * @param column - the column
 * @returns the key, or null
 */
function keyOf(kind: "node" | "edge", column: Column): string | null {
    const { name, origin, role } = column.meta;
    if (role === "id" || role === "position" || typeof origin?.id !== "string") {
        return null;
    }

    // An extension's own markup tree, kept whole, is not a field: its readable parts are columns of their own.
    if (typeof origin.namespace === "string") {
        const prefix = `${origin.namespace}.`;
        return name.startsWith(prefix) ? name.slice(prefix.length) : null;
    }

    return attributeKey(kind, attributeTitle(name, origin.id), origin.id);
}

/**
 * Copy a row's columns onto its record, each under {@link keyOf}'s key.
 * @param kind - node or edge
 * @param table - the node or edge table
 * @param row - the row
 * @param record - the record being built
 */
function writeRow(kind: "node" | "edge", table: Iterable<Column>, row: number, record: Record<string, unknown>): void {
    for (const column of table) {
        const key = column.isSet(row) ? keyOf(kind, column) : null;
        if (key !== null) {
            record[key] = cell(column, row);
        }
    }
}

/**
 * The record mapping for GraphML: each key under its name, and an edge's own `directed` when it
 * differs from the graph's `edgedefault`.
 * @param snapshot - the imported graph
 * @param graphDirected - the direction the graph declared, or null when it declared none
 * @returns the mapping
 */
function graphmlMapping(snapshot: GraphSnapshot, graphDirected: boolean | null): RecordMapping {
    const directed = snapshot.edges.byRole("directed");
    return {
        node(row, record): void {
            writeRow("node", snapshot.nodes, row, record);
        },
        edge(row, record): void {
            if (directed?.isSet(row) && directed.value(row) !== graphDirected) {
                record.directed = directed.value(row);
            }

            writeRow("edge", snapshot.edges, row, record);
        },
        path: keyOf,
    };
}

/**
 * The direction the `<graph>` element declared, or null when it declared none it could read.
 *
 * `edgedefault` is required by GraphML, so a file without it -- or with a value that is neither
 * `directed` nor `undirected` -- is malformed rather than silent, and the element reads no
 * direction out of it. Every edge whose own `directed` attribute disagrees is counted.
 * @param snapshot - the imported graph
 * @param codes - the issue codes the import recorded
 * @returns the declaration, or null
 */
function readDirection(
    snapshot: GraphSnapshot,
    codes: ReadonlySet<string>,
): { directed: boolean; statedBy: string; conflicts: number } | null {
    const graphml = snapshot.meta.extra.graphml as { edgedefault?: unknown } | undefined;
    const edgedefault = graphml?.edgedefault;
    if (
        typeof edgedefault !== "string" ||
        codes.has(GRAPHML_ISSUE.EDGEDEFAULT_MISSING) ||
        codes.has(GRAPHML_ISSUE.INVALID_EDGEDEFAULT)
    ) {
        return null;
    }

    const isDirected = edgedefault === "directed";
    const perEdge = snapshot.edges.byRole("directed");
    const pair = snapshot.edges.byRole("pair");
    let conflicts = 0;
    if (perEdge !== null) {
        for (let e = 0; e < snapshot.edgeCount; e++) {
            const mirror = pair?.isSet(e) && (pair.value(e) as number) < e;
            if (!mirror && perEdge.isSet(e) && perEdge.value(e) !== isDirected) {
                conflicts++;
            }
        }
    }

    return { directed: isDirected, statedBy: `edgedefault="${edgedefault}"`, conflicts };
}

/**
 * Data source for loading graph data from GraphML files, read by `@graphty/graph-io`'s GraphML
 * importer. Supports key definitions and data elements, and the graphics of an extension graph-io
 * reads (the yFiles `ShapeNode` and `PolyLineEdge`).
 *
 * Each record holds the keys the file declared under their names, a node's `position` and `label`,
 * an edge's `directed`, and each field an extension's graphics give (a yFiles `width`, `color`,
 * `borderColor`, `shape` and so on) under its field name, as the file has it. A load with
 * `styles: "file"` draws the file's look with style layers instead, over the data columns the load
 * writes for them, as every format's load does.
 */
export class GraphMLDataSource extends DataSource {
    static readonly type = "graphml";

    private readonly config: GraphMLDataSourceConfig;

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
        const imported = await importDocument(graphmlImporter, await this.getInput(), {
            errorLimit: this.config.errorLimit ?? 100,
        });
        aggregateErrors(imported.report, this.errorAggregator);

        const direction = readDirection(imported.snapshot, new Set(imported.report.issues.map((issue) => issue.code)));
        if (direction !== null) {
            this.declareDirection(direction.directed, direction.statedBy, direction.conflicts);
        }

        const { nodes, edges } = toRecords(
            imported,
            graphmlMapping(imported.snapshot, direction?.directed ?? null),
            this,
            this.config.styles,
        );
        yield* this.chunkData(nodes, edges);
    }
}
