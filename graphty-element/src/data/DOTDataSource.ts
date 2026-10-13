import { headBytes } from "@graphty/graph-io";
import { dotImporter } from "@graphty/graph-io/dot";

import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";
import { columnsMapping, importWhole, toRecords } from "./graph-io-import.js";
import { sampleOf } from "./source-bytes.js";

// DOT has no additional config currently, so just use the base config
type DOTDataSourceConfig = BaseDataSourceConfig;

/**
 * Data source for loading graph data from DOT (Graphviz) format files, read by `@graphty/graph-io`'s
 * DOT importer.
 *
 * Node records carry `id` and the node's attributes, including those a `node [ ... ]` default
 * statement gives it; edge records carry `source`, `target` and the edge's attributes. A port on an
 * edge endpoint (`a:p1 -> b`) names a place on the node, not another node, so it is not part of
 * the id. A cluster subgraph is a node of its own, with the cluster's attributes (its `label`,
 * `fillcolor` and so on), as graph-io reads it and as Graphviz draws it. `pos`
 * stays the text the file wrote. A node written in several statements has the attributes of all
 * of them, the later ones winning, as Graphviz draws it.
 *
 * DOT states direction once, in the keyword that opens the file. A body with no keyword
 * (`{ a -> b }`) is read as its edge operators say and declares no direction.
 */
export class DOTDataSource extends DataSource {
    static readonly type = "dot";

    private readonly config: DOTDataSourceConfig;

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
        // Bytes go to the importer undecoded, so it reads a `charset` declaration; only a body
        // with no keyword is decoded here, to give it one.
        const input = await this.getInput();
        const headerless = (dotImporter.sniff?.(headBytes(input)) ?? 0) === 0 && /^\s*\{/.test(sampleOf(input));
        const imported = await importWhole(
            dotImporter,
            headerless ? `digraph ${await this.getContent()}` : input,
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

        const { nodes, edges } = toRecords(imported, columnsMapping(snapshot), this);
        yield* this.chunkData(nodes, edges);
    }
}
