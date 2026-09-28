import type { Column, GraphSnapshot } from "@graphty/graph-format";
import { GRAPHML_ISSUE, graphmlImporter } from "@graphty/graph-io/graphml";

import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";
import {
    aggregateErrors,
    attributeTitle,
    cell,
    components,
    importDocument,
    type RecordMapping,
    toRecords,
} from "./graph-io-import.js";

// GraphML has no additional config currently, so just use the base config
type GraphMLDataSourceConfig = BaseDataSourceConfig;

/** The prefix graph-io gives the columns it reads out of yFiles node and edge graphics. */
const YFILES = "yfiles.";

/** yFiles shape names mapped to the element's node shapes; anything unlisted is a box. */
const YFILES_SHAPES: Readonly<Record<string, string>> = {
    ellipse: "sphere",
    circle: "sphere",
};

/**
 * Write one yFiles value onto a record under the element's key for it.
 * @param key - the column name without its `yfiles.` prefix
 * @param column - the column
 * @param row - the row
 * @param record - the record being built
 */
function writeYFiles(key: string, column: Column, row: number, record: Record<string, unknown>): void {
    switch (key) {
        case "position": {
            const [x, y] = components(column, row);
            record.position = { x, y, z: 0 };
            break;
        }
        case "shape":
            record.shape = YFILES_SHAPES[(column.value(row) as string).toLowerCase()] ?? "box";
            break;
        default:
            record[key] = cell(column, row);
    }
}

/**
 * Copy a row's declared keys and yFiles graphics onto its record.
 *
 * A key the file declared lands under its `attr.name`. The raw yFiles graphics tree is left out,
 * because its readable parts (position, size, colours, label, shape, arrows) are written from the
 * `yfiles.*` columns instead.
 * @param table - the node or edge table
 * @param row - the row
 * @param record - the record being built
 */
function writeRow(table: Iterable<Column>, row: number, record: Record<string, unknown>): void {
    for (const column of table) {
        if (!column.isSet(row)) {
            continue;
        }

        const { name, origin } = column.meta;
        if (name.startsWith(YFILES)) {
            writeYFiles(name.slice(YFILES.length), column, row, record);
        } else if (typeof origin?.id === "string" && origin.namespace !== "yfiles" && column.meta.role !== "id") {
            record[attributeTitle(name, origin.id)] = cell(column, row);
        }
    }
}

/**
 * The record mapping for GraphML: each key under its name, the yFiles graphics under the element's
 * keys, and an edge's own `directed` when it differs from the graph's `edgedefault` or when yFiles
 * arrows say it.
 * @param snapshot - the imported graph
 * @param graphDirected - the direction the graph declared, or null when it declared none
 * @returns the mapping
 */
function graphmlMapping(snapshot: GraphSnapshot, graphDirected: boolean | null): RecordMapping {
    const directed = snapshot.edges.byRole("directed");
    return {
        node(row, record): void {
            writeRow(snapshot.nodes, row, record);
        },
        edge(row, record): void {
            if (directed?.isSet(row) && directed.value(row) !== graphDirected) {
                record.directed = directed.value(row);
            }

            writeRow(snapshot.edges, row, record);
        },
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
 * importer. Supports key definitions and data elements, and the yFiles `ShapeNode` and
 * `PolyLineEdge` graphics (position, size, colours, border, label, shape and arrows).
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
        const imported = await importDocument(graphmlImporter, await this.getContent(), {
            errorLimit: this.config.errorLimit ?? 100,
        });
        aggregateErrors(imported.report, this.errorAggregator);

        const direction = readDirection(imported.snapshot, new Set(imported.report.issues.map((issue) => issue.code)));
        if (direction !== null) {
            this.declareDirection(direction.directed, direction.statedBy, direction.conflicts);
        }

        const { nodes, edges } = toRecords(imported, graphmlMapping(imported.snapshot, direction?.directed ?? null));
        yield* this.chunkData(nodes, edges);
    }
}
