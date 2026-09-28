import type { NodeId } from "@graphty/graph-format";
import { headBytes } from "@graphty/graph-io";
import { dotImporter } from "@graphty/graph-io/dot";

import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";
import { columnsMapping, importWhole, toRecords } from "./graph-io-import.js";

// DOT has no additional config currently, so just use the base config
type DOTDataSourceConfig = BaseDataSourceConfig;

/** graph-io marks a cluster subgraph's container node with this node column. */
const CLUSTER_COLUMN = "graphty.cluster";

/**
 * Data source for loading graph data from DOT (Graphviz) format files, read by `@graphty/graph-io`'s
 * DOT importer.
 *
 * Node records carry `id` and the node's attributes, including those a `node [ ... ]` default
 * statement gives it; edge records carry `source`, `target` and the edge's attributes. A port on an
 * edge endpoint (`a:p1 -> b`) names a place on the node, not another node, so it is not part of
 * the id. A cluster subgraph is not drawn as a node unless an edge names it as an endpoint. `pos`
 * stays the text the file wrote. A node written in several statements has the attributes of all
 * of them, the later ones winning, as Graphviz draws it.
 *
 * DOT states direction once, in the keyword that opens the file. A body with no keyword
 * (`{ a -> b }`) is read as its edge operators say and declares no direction.
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
        const text = await this.getContent();
        const headerless = (dotImporter.sniff?.(headBytes(text)) ?? 0) === 0 && /^\s*\{/.test(text);
        const imported = await importWhole(
            dotImporter,
            headerless ? `digraph ${text}` : text,
            // Ids stay the strings DOT writes, `weight` stays an attribute (the element reads its
            // weight from the record), and `pos` stays the text the file wrote. A body with no
            // keyword takes each edge's direction from its own operator.
            {
                ids: "keep",
                weightFrom: null,
                positions: false,
                ...(headerless ? { mismatchedEdgeOperator: "operator" as const } : {}),
            },
            this.errorAggregator,
        );
        const { snapshot, report } = imported;
        if (!headerless) {
            this.declareDirection(
                snapshot.directed,
                snapshot.directed ? "digraph" : "graph",
                report.counts.expandedMixed,
            );
        }

        const { nodes, edges } = toRecords(imported, columnsMapping(snapshot));

        // An edge to a cluster needs the cluster as its endpoint; any other cluster only groups.
        const cluster = snapshot.nodes.get(CLUSTER_COLUMN);
        const endpoints = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
        const drawn = nodes.filter(
            (node) => cluster?.value(snapshot.ids.indexOf(node.id as NodeId)) !== true || endpoints.has(node.id),
        );

        yield* this.chunkData(drawn, edges);
    }
}
