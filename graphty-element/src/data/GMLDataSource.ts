import type { ImportIssue } from "@graphty/graph-io";
import { GML_ISSUE, gmlImporter } from "@graphty/graph-io/gml";

import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";
import { importRecords } from "./graphIoImport.js";

// GML has no additional config currently, so just use the base config
type GMLDataSourceConfig = BaseDataSourceConfig;

/**
 * The words that set a GML graph's direction, for the log and for `directednessSource`.
 *
 * GML states direction with the graph's `directed` key, and the specification gives an omitted key
 * the value 0, so every GML file has declared a direction -- but a file that omits the key must not
 * be quoted as though it wrote `directed 0`: a reader would go looking for a key that is not there.
 * @param header - what the importer recorded under `meta.extra.gml`
 * @param issues - the importer's issues, which say whether the key was unreadable
 * @returns the statement
 */
function statedBy(header: unknown, issues: readonly ImportIssue[]): string {
    const written = (header as { directed?: unknown } | undefined)?.directed;
    if (typeof written !== "string") {
        return "the GML default for an absent directed key (undirected)";
    }

    const unreadable = issues.some((issue) => issue.code === GML_ISSUE.FLAG_TYPE && issue.element === "directed");
    return unreadable
        ? `an unreadable directed ${written}, leaving the GML default (undirected)`
        : `directed ${written}`;
}

/**
 * Data source for loading graph data from GML (Graph Modeling Language) files, read by
 * `@graphty/graph-io`'s GML importer.
 *
 * Each record carries the keys the file wrote: a node's `id` and its attributes (a nested
 * `graphics [ ... ]` block stays one nested object), an edge's `source`, `target` and attributes.
 * Only nodes the file declares become node records; an edge endpoint with no `node` block is left
 * to the element, as it always was.
 *
 * A file that cannot be read -- no `graph` block, or a list still open when the text ends -- fails
 * with `E_PARSE_FAILED` naming the line, instead of loading whatever parsed before the break.
 */
export class GMLDataSource extends DataSource {
    static readonly type = "gml";

    private config: GMLDataSourceConfig;

    /**
     * Creates a new GMLDataSource instance.
     * @param config - Configuration options for GML parsing and data loading
     */
    constructor(config: GMLDataSourceConfig) {
        super(config.errorLimit ?? 100, config.chunkSize);
        this.config = config;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    /**
     * Fetches and parses GML format data into graph chunks.
     * @yields DataSourceChunk objects containing parsed nodes and edges
     */
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        const { nodes, edges, direction } = await importRecords(
            gmlImporter,
            await this.getContent(),
            this.errorAggregator,
            // The graphics block stays whole in the record, and `value` stays an attribute: the
            // element reads its weight from the record, not from the importer.
            { positions: false, weightFrom: null },
            { statedBy: (snapshot, report) => statedBy(snapshot.meta.extra.gml, report.issues) },
        );

        if (direction !== null) {
            this.declareDirection(direction.directed, direction.statedBy, direction.conflictingEdges);
        }

        yield* this.chunkData(nodes, edges);
    }
}
