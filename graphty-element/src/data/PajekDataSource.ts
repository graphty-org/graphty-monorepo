import { PAJEK_ISSUE, pajekImporter } from "@graphty/graph-io/pajek";

import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";
import { importRecords } from "./graphIoImport.js";

// Pajek has no additional config currently, so just use the base config
type PajekDataSourceConfig = BaseDataSourceConfig;

/** The graph-io column that says, per edge, which section a line of a mixed file came from. */
const DIRECTED_COLUMN = "graphty.directed";

/**
 * Rebuild the 2.x node record: `id`, `label`, and the coordinates as `x`, `y` and `z`.
 * @param record - the record graph-io's columns produced
 * @param threeD - whether the file's vertex lines write a z coordinate
 * @returns the record the element has always received for a Pajek vertex
 */
function nodeRecord(record: Record<string, unknown>, threeD: boolean): Record<string, unknown> {
    const { position, ...rest } = record;
    if (Array.isArray(position)) {
        const [x, y, z] = position as number[];
        // graph-io fills an unwritten z with 0; a file whose vertex lines write two coordinates stays 2D.
        Object.assign(rest, threeD ? { x, y, z } : { x, y });
    }

    return rest;
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
        const { nodes, edges, direction } = await importRecords(
            pajekImporter,
            await this.getContent(),
            this.errorAggregator,
            // Vertex numbers stay the strings they have always been, and the line's value stays an
            // attribute: the element reads its weight from the record.
            { ids: "keep", weightFrom: null },
            {
                node: (record, _row, snapshot) =>
                    nodeRecord(record, snapshot.nodes.byRole("position")?.meta.extra.sourceDims === 3),
                edge: ({ value, ...rest }, row, snapshot) => ({
                    ...rest,
                    directed: snapshot.edges.get(DIRECTED_COLUMN)?.value(row) ?? snapshot.directed,
                    ...(value === undefined ? {} : { weight: value }),
                }),
                // Direction is stated by a line section header; a file with none states nothing.
                statedBy: (snapshot, report) =>
                    report.issues.some((issue) => issue.code === PAJEK_ISSUE.NO_LINES)
                        ? null
                        : snapshot.directed
                          ? "*Arcs"
                          : "*Edges",
            },
        );

        if (direction !== null) {
            this.declareDirection(direction.directed, direction.statedBy, direction.conflictingEdges);
        }

        yield* this.chunkData(nodes, edges);
    }
}
