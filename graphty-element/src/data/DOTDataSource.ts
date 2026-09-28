import { dotImporter } from "@graphty/graph-io/dot";

import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";
import { importRecords } from "./graphIoImport.js";

// DOT has no additional config currently, so just use the base config
type DOTDataSourceConfig = BaseDataSourceConfig;

/** graph-io marks a cluster subgraph's container node with this node column. */
const CLUSTER_COLUMN = "graphty.cluster";
/** graph-io gives a cluster member the row of its container in this node column. */
const PARENT_COLUMN = "graphty.parent";

/**
 * Data source for loading graph data from DOT (Graphviz) format files, read by `@graphty/graph-io`'s
 * DOT importer.
 *
 * Node records carry `id` and the node's attributes, including those a `node [ ... ]` default
 * statement gives it; edge records carry `source`, `target` and the edge's attributes. A port on an
 * edge endpoint (`a:p1 -> b`) names a place on the node, not another node, so it is not part of
 * the id. A cluster subgraph is not drawn as a node unless an edge names it as an endpoint; each of
 * its members carries the cluster's name as `parent`. `pos` stays the text the file wrote.
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
        const clusters = new Set<unknown>();
        const { nodes, edges, direction } = await importRecords(
            dotImporter,
            await this.getContent(),
            this.errorAggregator,
            // Ids stay the strings DOT writes, `weight` stays an attribute (the element reads its
            // weight from the record), and `pos` stays the text the file wrote.
            { ids: "keep", weightFrom: null, positions: false },
            {
                node: (record, row, snapshot) => {
                    if (snapshot.nodes.get(CLUSTER_COLUMN)?.value(row) === true) {
                        clusters.add(record.id);
                    }

                    const parent = snapshot.nodes.get(PARENT_COLUMN)?.value(row);
                    return typeof parent === "number" ? { ...record, parent: snapshot.ids.idOf(parent) } : record;
                },
                statedBy: (snapshot) => (snapshot.directed ? "digraph" : "graph"),
            },
        );

        // An edge to a cluster needs the cluster as its endpoint; any other cluster only groups.
        const endpoints = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
        const drawn = nodes.filter((node) => !clusters.has(node.id) || endpoints.has(node.id));

        if (direction !== null) {
            this.declareDirection(direction.directed, direction.statedBy, direction.conflictingEdges);
        }

        yield* this.chunkData(drawn, edges);
    }
}
