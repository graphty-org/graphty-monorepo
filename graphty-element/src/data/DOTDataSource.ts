import { dotImporter } from "@graphty/graph-io/dot";

import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";
import { importRecords } from "./graph-io-import.js";

// DOT has no additional config currently, so just use the base config
type DOTDataSourceConfig = BaseDataSourceConfig;

/** graph-io marks a cluster subgraph's container node with this node column. */
const CLUSTER_COLUMN = "graphty.cluster";
/** graph-io gives a cluster member the index of its container in this node column. */
const PARENT_COLUMN = "graphty.parent";
/** Every column graph-io adds of its own starts with this; the rest are the file's attributes. */
const GRAPH_IO_PREFIX = "graphty.";

/**
 * Keep the attributes the file wrote, and nothing graph-io added to describe the file's structure.
 * @param record - the record graph-io's columns produced
 * @returns the record without graph-io's own keys
 */
function fileAttributes(record: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith(GRAPH_IO_PREFIX)));
}

/**
 * Data source for loading graph data from DOT (Graphviz) format files, read by `@graphty/graph-io`'s
 * DOT importer.
 *
 * Node records carry `id` and the node's attributes, including those a `node [ ... ]` default
 * statement gives it; edge records carry `source`, `target` and the edge's attributes. A port on an
 * edge endpoint (`a:p1 -> b`) names a place on the node, not another node, so it is not part of
 * the id. A cluster subgraph is not drawn as a node: each of its members carries the cluster's
 * name as `parent`.
 *
 * DOT states direction once, in the keyword that opens the file. A file that does not open with
 * `graph` or `digraph` is not DOT, and fails with `E_PARSE_FAILED` rather than loading a guess.
 */
export class DOTDataSource extends DataSource {
    static readonly type = "dot";

    private config: DOTDataSourceConfig;

    /**
     * Creates a new DOTDataSource instance.
     * @param config - Configuration options for DOT parsing and data loading
     */
    constructor(config: DOTDataSourceConfig) {
        super(config.errorLimit ?? 100, config.chunkSize);
        this.config = config;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    /**
     * Fetches and parses DOT format data into graph chunks.
     * @yields DataSourceChunk objects containing parsed nodes and edges
     */
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        const imported = await importRecords(
            dotImporter,
            "dot",
            await this.getContent(),
            // Ids stay the strings DOT writes, and `weight` stays an attribute: the element reads
            // its weight from the record.
            { ids: "keep", weightFrom: null, errorLimit: this.config.errorLimit ?? 100 },
            this.errorAggregator,
        );

        const nodes: Record<string, unknown>[] = [];
        for (const record of imported.nodes) {
            if (record[CLUSTER_COLUMN] === true) {
                continue;
            }

            const parent = record[PARENT_COLUMN];
            nodes.push({
                ...fileAttributes(record),
                ...(typeof parent === "number" ? { parent: imported.nodes[parent]?.id } : {}),
            });
        }

        this.declareDirection(imported.directed, imported.directed ? "digraph" : "graph");

        yield* this.chunkData(DataSource.toRecords(nodes), DataSource.toRecords(imported.edges.map(fileAttributes)));
    }
}
