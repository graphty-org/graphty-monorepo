import { PAJEK_ISSUE, pajekImporter } from "@graphty/graph-io/pajek";

import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";
import { copyColumns, importWhole, toRecords } from "./graph-io-import.js";

// Pajek has no additional config currently, so just use the base config
type PajekDataSourceConfig = BaseDataSourceConfig;

/** The graph-io column that says, per edge, which section a line of a mixed file came from. */
const DIRECTED_COLUMN = "graphty.directed";

/**
 * Rebuild the 2.x node record in place: `id`, `label`, and the coordinates as `x`, `y` and `z`.
 * @param record - the record graph-io's columns produced
 * @param threeD - whether the file's vertex lines write a z coordinate
 */
function nodeRecord(record: Record<string, unknown>, threeD: boolean): void {
    const { position } = record;
    delete record.position;
    if (Array.isArray(position)) {
        const [x, y, z] = position as number[];
        // graph-io fills an unwritten z with 0; a file whose vertex lines write two coordinates stays 2D.
        Object.assign(record, threeD ? { x, y, z } : { x, y });
    }
}

/**
 * Data source for loading graph data from Pajek NET format files, read by `@graphty/graph-io`'s
 * Pajek importer.
 *
 * Vertex records carry `id` (the vertex number, as written), `label` and the coordinates as `x`,
 * `y` and `z`. Edge records carry `source`, `target`, `weight` (the line's value) and `directed`:
 * true for a line under `*Arcs`, false for one under `*Edges`.
 *
 * Pajek states direction by section. A file with both sections is read as DIRECTED, because that
 * loses least: an arc stored in an undirected graph gains a path the file denies, while an
 * undirected edge in a directed graph only loses its reverse, which is counted and reported. Each
 * edge keeps its own `directed` flag.
 */
export class PajekDataSource extends DataSource {
    static readonly type = "pajek";

    private config: PajekDataSourceConfig;

    /**
     * Creates a new PajekDataSource instance.
     * @param config - Configuration options for Pajek parsing and data loading
     */
    constructor(config: PajekDataSourceConfig) {
        super(config.errorLimit ?? 100, config.chunkSize);
        this.config = config;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    /**
     * Fetches and parses Pajek NET format data into graph chunks.
     * @yields DataSourceChunk objects containing parsed nodes and edges
     */
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        const imported = await importWhole(
            pajekImporter,
            await this.getInput(),
            // Vertex numbers stay the strings they have always been, and the line's value stays an
            // attribute: the element reads its weight from the record.
            { ids: "keep", weightFrom: null },
            this.errorAggregator,
            // A vertex with two lines keeps its first, as the element keeps a repeated record.
            { firstDeclarationWins: true },
        );
        const { snapshot, report } = imported;
        // Direction is stated by a line section header; a file with none states nothing.
        if (!report.issues.some((issue) => issue.code === PAJEK_ISSUE.NO_LINES)) {
            this.declareDirection(
                snapshot.directed,
                snapshot.directed ? "*Arcs" : "*Edges",
                report.counts.expandedMixed,
            );
        }

        const threeD = snapshot.nodes.byRole("position")?.meta.extra.sourceDims === 3;
        const directed = snapshot.edges.get(DIRECTED_COLUMN);
        const { nodes, edges } = toRecords(imported, {
            node: (row, record) => {
                copyColumns(snapshot.nodes, row, record);
                nodeRecord(record, threeD);
            },
            edge: (row, record) => {
                copyColumns(snapshot.edges, row, record);
                const { value } = record;
                delete record.value;
                record.directed = directed?.value(row) ?? snapshot.directed;
                if (value !== undefined) {
                    record.weight = value;
                }
            },
        });

        yield* this.chunkData(nodes, edges);
    }
}
