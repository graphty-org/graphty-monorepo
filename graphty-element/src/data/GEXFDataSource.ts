import type { Column, GraphSnapshot } from "@graphty/graph-format";
import { GEXF_ISSUE, gexfImporter } from "@graphty/graph-io/gexf";

import { BaseDataSourceConfig, DataSource, DataSourceChunk } from "./DataSource.js";
import {
    aggregateErrors,
    attributeTitle,
    cell,
    components,
    importDocument,
    type ImportedGraph,
    type RecordMapping,
    toRecords,
} from "./graph-io-import.js";

// GEXF has no additional config currently, so just use the base config
type GEXFDataSourceConfig = BaseDataSourceConfig;

/** The bits of graph-io's `open` column: which bound of an interval is open. */
const OPEN_START = 1;
const OPEN_END = 2;

/**
 * Whether a GEXF edge type keyword means a directed edge, or null when it is not one of the three
 * the format defines.
 *
 * The keywords are `directed`, `undirected` and `mutual`; `mutual` is an edge that exists in both
 * directions, which in a graph that carries ONE direction flag is the undirected reading -- and is
 * the reading every other GEXF consumer takes, NetworkX included.
 * @param type - the value of a `defaultedgetype` attribute
 * @returns true for directed, false for undirected or mutual, null for anything else
 */
function edgeTypeIsDirected(type: string): boolean | null {
    switch (type.trim().toLowerCase()) {
        case "directed":
            return true;
        case "undirected":
        case "mutual":
            return false;
        default:
            return null;
    }
}

/**
 * How many edges said each direction of their own, one count per logical edge.
 *
 * graph-io writes an edge's own direction into the `directed` and `mutual` role columns only when
 * the file mixes directions; a file whose edges all agree has neither column, and nothing to count.
 * A `mutual` edge is counted as undirected, as {@link edgeTypeIsDirected} reads it.
 * @param snapshot - the imported graph
 * @returns the number of edges read as directed and as undirected
 */
function countEdgeDirections(snapshot: GraphSnapshot): { directed: number; undirected: number } {
    const directed = snapshot.edges.byRole("directed");
    const mutual = snapshot.edges.byRole("mutual");
    const pair = snapshot.edges.byRole("pair");
    const counts = { directed: 0, undirected: 0 };
    if (directed === null) {
        return counts;
    }

    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (pair?.isSet(e) && (pair.value(e) as number) < e) {
            continue;
        }

        if (directed.value(e) === true && mutual?.value(e) !== true) {
            counts.directed++;
        } else {
            counts.undirected++;
        }
    }

    return counts;
}

/**
 * The `defaultedgetype` the `<graph>` element wrote, as graph-io recorded it, or undefined.
 * @param snapshot - the imported graph
 * @returns the attribute's text, or undefined when the file did not write one
 */
function writtenDefaultEdgeType(snapshot: GraphSnapshot): string | undefined {
    const gexf = snapshot.meta.extra.gexf as Record<string, unknown> | undefined;
    const value = gexf?.defaultedgetype;
    return typeof value === "string" ? value : undefined;
}

/**
 * A time bound as the file wrote it: graph-io's companion text when it kept one, else the number
 * in the graph's `timeformat` (a year or a double as its shortest text, a date or dateTime in ISO
 * form).
 * @param value - the stored number
 * @param text - the companion text, when there is one
 * @param timeFormat - the graph's timeformat
 * @returns the text
 */
function timeText(value: number, text: string | null, timeFormat: string | null): string {
    if (text !== null) {
        return text;
    }

    switch (timeFormat) {
        case "date":
            return new Date(value).toISOString().slice(0, 10);
        case "dateTime":
            return new Date(value).toISOString();
        default:
            return String(value);
    }
}

/**
 * The record mapping for GEXF: the keys the element has always given a GEXF node and edge.
 *
 * - `label`; `position` `{x, y, z}`, `color` `{r, g, b, a}` with 0-255 channels, and `size` from
 *   the viz namespace (nodes only);
 * - each declared attribute under its title, typed by its declared type;
 * - on an edge, its GEXF id under `gexfId` (never `id`, which on an edge record means the
 *   element's own identifier), and its own `type` when that differs from the graph's direction
 *   (a `mutual` edge always says so);
 * - the lifetime (`start` / `end` / `timestamp`, with `startOpen` / `endOpen` for an open bound),
 *   `spells` as a list of the same intervals, and a time-sliced attribute as the list of its
 *   slices `{ value, start, end }`.
 * @param snapshot - the imported graph
 * @param graphDirected - the direction declared for the whole graph
 * @returns the mapping
 */
function gexfMapping(snapshot: GraphSnapshot, graphDirected: boolean): RecordMapping {
    const { timeFormat } = snapshot.meta;

    /**
     * Read one interval's time keys from a row of a table's start / end / timestamp / open roles.
     * @param table - the node or edge table, or an extension table of attribute slices
     * @param row - the row
     * @returns only the keys the row carries
     */
    const interval = (table: Iterable<Column>, row: number): Record<string, unknown> => {
        const out: Record<string, unknown> = {};
        const texts = new Map<string, Column>();
        const bounds: Column[] = [];
        let open = 0;
        for (const column of table) {
            if (!column.isSet(row)) {
                continue;
            }

            const { role, extra } = column.meta;
            if (role === "start" || role === "end" || role === "timestamp") {
                bounds.push(column);
            } else if (role === "open") {
                open = column.value(row) as number;
            } else if (typeof extra.for === "string" && column.dtype === "string") {
                texts.set(extra.for, column);
            }
        }

        for (const column of bounds) {
            const text = texts.get(column.meta.name);
            out[column.meta.role as string] = timeText(
                column.value(row) as number,
                text === undefined ? null : (text.value(row) as string),
                timeFormat,
            );
        }

        if ((open & OPEN_START) !== 0 && "start" in out) {
            out.startOpen = true;
        }

        if ((open & OPEN_END) !== 0 && "end" in out) {
            out.endOpen = true;
        }

        return out;
    };

    /**
     * The slices of each time-sliced attribute, by the row of the element they belong to.
     * @param domain - "node" or "edge"
     * @param column - the attribute's column
     * @returns the slices per row, empty when the attribute was never time-sliced
     */
    const slicesOf = (domain: "node" | "edge", column: Column): Map<number, Record<string, unknown>[]> => {
        const bySlice = new Map<number, Record<string, unknown>[]>();
        const table = snapshot.extensions.get(`temporal:${domain}:${column.meta.name}`);
        const element = table?.get("element") ?? null;
        const value = table?.get("value") ?? null;
        if (table === undefined || element === null || value === null) {
            return bySlice;
        }

        for (let row = 0; row < table.rowCount; row++) {
            const owner = element.value(row) as number;
            const list = bySlice.get(owner) ?? [];
            list.push({ value: cell(value, row), ...interval(table, row) });
            bySlice.set(owner, list);
        }

        return bySlice;
    };

    const dynamic = new Map<Column, Map<number, Record<string, unknown>[]>>();
    for (const [domain, table] of [
        ["node", snapshot.nodes],
        ["edge", snapshot.edges],
    ] as const) {
        for (const column of table) {
            if (column.meta.dynamic) {
                dynamic.set(column, slicesOf(domain, column));
            }
        }
    }

    const spellsOpen = new Map<Iterable<Column>, Column | null>([
        [snapshot.nodes, snapshot.nodes.byRole("spellsOpen")],
        [snapshot.edges, snapshot.edges.byRole("spellsOpen")],
    ]);

    /**
     * Copy the lifetime, spells and declared attributes shared by nodes and edges.
     * @param table - the node or edge table
     * @param row - the row
     * @param record - the record being built
     */
    const common = (table: Iterable<Column>, row: number, record: Record<string, unknown>): void => {
        Object.assign(record, interval(table, row));
        for (const column of table) {
            const slices = dynamic.get(column)?.get(row);
            if (slices !== undefined) {
                // A static value next to timed slices was an untimed attvalue; it leads the list.
                const title = attributeTitle(column.meta.name, column.meta.origin?.id ?? "");
                record[title] = column.isSet(row) ? [{ value: cell(column, row) }, ...slices] : slices;
                continue;
            }

            if (!column.isSet(row)) {
                continue;
            }

            if (column.meta.role === "spells") {
                const openColumn = spellsOpen.get(table);
                const open = openColumn?.isSet(row) ? (openColumn.value(row) as number[]) : [];
                record.spells = (column.value(row) as ArrayLike<number>[]).map((pair, i) => ({
                    ...(Number.isFinite(pair[0]) ? { start: timeText(pair[0], null, timeFormat) } : {}),
                    ...(Number.isFinite(pair[1]) ? { end: timeText(pair[1], null, timeFormat) } : {}),
                    ...((open[i] & OPEN_START) === 0 ? {} : { startOpen: true }),
                    ...((open[i] & OPEN_END) === 0 ? {} : { endOpen: true }),
                }));
            } else if (typeof column.meta.origin?.id === "string") {
                const { id, type } = column.meta.origin;
                const value = cell(column, row);
                // A date attribute is stored as epoch milliseconds; the record keeps it as text.
                record[attributeTitle(column.meta.name, id)] =
                    (type === "date" || type === "dateTime") && typeof value === "number"
                        ? timeText(value, null, type)
                        : value;
            }
        }
    };

    const { nodes, edges } = snapshot;
    const directed = edges.byRole("directed");
    const mutual = edges.byRole("mutual");

    return {
        node(row, record): void {
            // The order the keys are written in is the order they win in: an attribute titled
            // `label` overrides the label= attribute, and the viz values override an attribute
            // titled `position`, `color` or `size`.
            const label = nodes.byRole("label");
            if (label?.isSet(row)) {
                record.label = label.value(row);
            }

            common(nodes, row, record);
            for (const column of nodes) {
                if (!column.isSet(row)) {
                    continue;
                }

                switch (column.meta.role) {
                    case "position": {
                        const [x, y, z] = components(column, row);
                        record.position = { x, y, z };
                        break;
                    }
                    case "color": {
                        const [r, g, b, a] = components(column, row);
                        record.color = { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a };
                        break;
                    }
                    case "size":
                        record.size = cell(column, row);
                        break;
                    default:
                        break;
                }
            }
        },
        edge(row, record): void {
            const id = edges.byRole("id");
            if (id?.isSet(row)) {
                record.gexfId = id.value(row);
            }

            const label = edges.byRole("label");
            if (label?.isSet(row)) {
                record.label = label.value(row);
            }

            if (mutual?.value(row) === true) {
                record.type = "mutual";
            } else if (directed !== null && directed.value(row) !== graphDirected) {
                record.type = graphDirected ? "undirected" : "directed";
            }

            // Last, so an attribute titled `label` or `type` overrides the edge's own.
            common(edges, row, record);
        },
    };
}

/**
 * Data source for loading graph data from GEXF (Graph Exchange XML Format) files, read by
 * `@graphty/graph-io`'s GEXF importer. Supports node and edge attributes, attribute types, the viz
 * namespace and dynamic graphs.
 *
 * Dynamic graphs keep their time data on each record rather than acting on it:
 * - a node's or edge's `start` / `end` / `timestamp` go onto its data under those names, with
 *   `startOpen` / `endOpen` set for an open bound, and its `<spells>` go onto `spells` as a list of
 *   `{ start, end }` intervals;
 * - an attribute with time-sliced `attvalue`s becomes a list of `{ value, start, end }` slices
 *   instead of a single value. An attribute with no timed `attvalue` keeps its plain value.
 *
 * An edge that names a node the file never declared is kept, and the node is created for it.
 */
export class GEXFDataSource extends DataSource {
    static readonly type = "gexf";

    private config: GEXFDataSourceConfig;

    /**
     * Creates a new GEXFDataSource instance.
     * @param config - Configuration options for GEXF parsing and data loading
     */
    constructor(config: GEXFDataSourceConfig) {
        super(config.errorLimit ?? 100, config.chunkSize);
        this.config = config;
    }

    protected getConfig(): BaseDataSourceConfig {
        return this.config;
    }

    /**
     * Fetches and parses GEXF format data into graph chunks.
     * @yields DataSourceChunk objects containing parsed nodes and edges
     */
    async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
        const text = await this.getInput();
        let imported = await this.read(text, false);
        let { snapshot } = imported;
        const written = writtenDefaultEdgeType(snapshot);
        const header = written === undefined ? null : edgeTypeIsDirected(written);

        let direction: { directed: boolean; statedBy: string; conflicts: number };
        if (header !== null && written !== undefined) {
            // The graph element wrote its direction. That is the file's statement about the graph
            // as a whole, and it stands; every edge that said otherwise is counted.
            const counts = countEdgeDirections(snapshot);
            direction = {
                directed: header,
                statedBy: `defaultedgetype="${written}"`,
                conflicts: header ? counts.undirected : counts.directed,
            };
        } else {
            const statedBy =
                written === undefined
                    ? "the GEXF default for an absent defaultedgetype (undirected)"
                    : `an unreadable defaultedgetype="${written}", leaving the GEXF default (undirected)`;
            const statedDirected = countEdgeDirections(snapshot).directed;
            if (statedDirected === 0) {
                direction = { directed: false, statedBy, conflicts: 0 };
            } else {
                // The graph element wrote no direction and some edges did: they are the file's only
                // statement about direction, and a directed one among them decides it. Reading the
                // file again with directed as the default is what separates an edge that SAID
                // undirected (a conflict) from one that said nothing (now directed, like the graph).
                // ponytail: a second parse, only for a headerless file with directed edges
                imported = await this.read(text, true);
                ({ snapshot } = imported);
                direction = {
                    directed: true,
                    statedBy: `type="directed" on ${statedDirected} edge(s), with no defaultedgetype on <graph>`,
                    conflicts: countEdgeDirections(snapshot).undirected,
                };
            }
        }

        aggregateErrors(imported.report, this.errorAggregator);

        // The resolved direction is declared BEFORE the first chunk is yielded, so that it reaches
        // the builder while it is still empty -- which is the only moment the builder accepts one.
        this.declareDirection(direction.directed, direction.statedBy, direction.conflicts);

        const { nodes, edges } = toRecords(imported, gexfMapping(snapshot, direction.directed));
        yield* this.chunkData(nodes, edges);
    }

    /**
     * Import the document through graph-io.
     * @param text - the document: text, or bytes graph-io decodes
     * @param defaultDirected - the direction an edge without a `type` takes when the graph wrote none
     * @returns the import
     */
    private read(text: string | Uint8Array, defaultDirected: boolean): Promise<ImportedGraph> {
        return importDocument(
            gexfImporter,
            text,
            { addMissingNodes: true, defaultDirected, errorLimit: this.config.errorLimit ?? 100 },
            [GEXF_ISSUE.NO_GRAPH],
        );
    }
}
