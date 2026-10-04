/**
 * @file Reading the graph: the session's data surface, over one snapshot.
 *
 * Three of these verbs -- attributes, statistics and the fingerprint -- have to walk the graph
 * to answer. They are still synchronous, and they are still safe to call from a render loop,
 * because each answer is cached against the snapshot it was computed from and a snapshot is
 * replaced only when the graph actually changes. The first reader after a change pays; everyone
 * else in the same revision reads a field.
 */

// The built-in readers, so `import` reads every format the element does with no renderer loaded.
import "../data/index";

import { type DerivedGraph, fromBytes, type GraphSnapshot, INVALID_INDEX, type NodeId } from "@graphty/graph-format";

import { detectFormat, undetectedFormat } from "../catalog/detect";
import type { AttributeDescriptor, EdgeId, MeasurementDeclaration, RunId, ScopeInput } from "../catalog/types";
import { edgeCounterOf, edgeIdOf } from "../data/edgeIdentity";
import type { GraphStore } from "../data/GraphStore";
import { readonlyPositions } from "../data/lane";
import type { ImportReport } from "../data/report";
import { DETECTION_SAMPLE, fetchBytes, isSourceData, sampleOf, toSourceInput, urlTail } from "../data/source-bytes";
import { GraphtyError } from "../errors";
import { describeAttributes } from "./attributes";
import { resolveColumn } from "./columns";
import {
    type DataImportCommand,
    type DataMutation,
    type DataService,
    declarationKey,
    type ImportSource,
    SOURCE_VALUE,
} from "./commands/data";
import type { Dispatcher } from "./project/Dispatcher";
import { frozenRecord } from "./project/draft";
import { Ingest } from "./project/ingest";
import type { GraphSlice } from "./project/state";
import type { SearchAnswer, SearchRequest } from "./query";
import { type ResolvedResult, resolveResult, resultCell, resultSortValue } from "./results/pageColumns";
import { RevisionCache } from "./revision";
import type { ResolvedScope, Run } from "./runs/types";
import { edgeSpaceOf } from "./scope/ScopeApi";
import type { ColumnRef } from "./shared";
import { computeFingerprint, computeStatistics } from "./statistics";
import type {
    DataSourceDescriptor,
    DataSourceInput,
    EdgePageOptions,
    EdgeRecord,
    EdgeRecordInput,
    FindKind,
    FindOptions,
    FindResult,
    GraphStatistics,
    ImportOptions,
    NodeRecord,
    NodeRecordInput,
    PageColumn,
    RecordPage,
    RecordPageOptions,
    RecordSort,
    ResultColumn,
    RowUpdate,
    SessionAttributes,
    SessionDataApi,
    SessionDataConfig,
    SessionGraphStore,
    SessionRecordSource,
} from "./types";

/** What the data surface writes through, and where it reads what the graph holds beside rows. */
interface DataWrites {
    /** Dispatch `data.apply`. */
    dispatch(mutation: DataMutation): Promise<unknown>;
    /**
     * Where a `data.import` made now would go -- the session, or the transaction a routed verb
     * runs in -- held for a verb that dispatches it after an await.
     */
    importer(): (command: DataImportCommand) => Promise<unknown>;
    /** The `graph` slice now. */
    slice(): GraphSlice;
    /** Dispatch `data.declare`. */
    declare(column: ColumnRef, declaration: MeasurementDeclaration): Promise<unknown>;
    /** The `attributes` slice now: what each column was declared to measure, by `<kind>:<name>`. */
    declarations(): ReadonlyMap<string, MeasurementDeclaration>;
}

/** What a page of records reads beside the snapshot. */
interface PageSources {
    /** The session's input tick: it moves whenever anything a page could show moves. */
    revision(): number;
    /**
     * A scope's members now.
     * @param spec - the scope
     * @returns its members
     */
    resolve(spec: ScopeInput): ResolvedScope;
    /**
     * The find box's search, over the session's query engine.
     * @param text - what was typed
     * @param request - the checked window, kinds and scope
     * @returns the hits
     */
    search(text: string, request: SearchRequest): SearchAnswer;
    /**
     * One run, for a page's result columns and result sort.
     * @param id - the run id
     * @returns the run, or undefined when the session holds none with that id
     */
    run(id: RunId): Run | undefined;
    /**
     * Every run id, for the candidates of an unknown one.
     * @returns the ids
     */
    runIds(): readonly RunId[];
}

/** How many hits a find returns when the caller does not say. */
const DEFAULT_FIND_LIMIT = 20;

/** What a find lists when the caller does not say. */
const FIND_KINDS: readonly FindKind[] = ["node", "edge"];

/** How many records a page holds when the caller does not say. */
const DEFAULT_PAGE_LIMIT = 100;

/** Natural order for text: "2" before "10". */
const NATURAL = new Intl.Collator("en", { numeric: true });

/**
 * Where a value sorts among values of other kinds: numbers, then text, then booleans, then the rest.
 * @param value - a present value
 * @returns its rank
 */
function kindRank(value: unknown): number {
    switch (typeof value) {
        case "number":
        case "bigint":
            return 0;
        case "string":
            return 1;
        case "boolean":
            return 2;
        default:
            return 3;
    }
}

/**
 * Compare two present sort values, ascending.
 * @param a - one value
 * @param b - the other
 * @returns negative, zero or positive
 */
function compareSortValues(a: unknown, b: unknown): number {
    const rank = kindRank(a) - kindRank(b);
    if (rank !== 0) {
        return rank;
    }

    if (rank === 0 && kindRank(a) === 0) {
        // `<` compares a number with a bigint exactly, where `-` would throw.
        const x = a as number | bigint;
        const y = b as number | bigint;
        return Number(x > y) - Number(x < y);
    }

    if (typeof a === "string" && typeof b === "string") {
        return NATURAL.compare(a, b);
    }

    if (typeof a === "boolean" && typeof b === "boolean") {
        return Number(a) - Number(b);
    }

    return NATURAL.compare(textOf(a), textOf(b));
}

/**
 * A value of no simpler kind as text to sort by.
 * @param value - an object, an array, or anything else
 * @returns its JSON, or its string form when JSON cannot write it (a bigint inside it)
 */
function textOf(value: unknown): string {
    try {
        return JSON.stringify(value) ?? String(value);
    } catch {
        return String(value);
    }
}

/**
 * Whether a sort value counts as absent: it sorts last in either direction.
 * @param value - the value
 * @returns true for undefined, null and NaN
 */
function isAbsent(value: unknown): boolean {
    return value === undefined || value === null || Number.isNaN(value);
}

/**
 * Check a page's window.
 * @param options - what the caller asked for
 * @param verb - the verb, for the message
 * @returns the offset and the limit
 * @throws A `GraphtyError` with `E_OPTION_RANGE` for a negative or fractional value.
 */
function pageWindow(options: RecordPageOptions, verb: string): { offset: number; limit: number } {
    const offset = options.offset ?? 0;
    const limit = options.limit ?? DEFAULT_PAGE_LIMIT;
    for (const [name, value] of [
        ["offset", offset],
        ["limit", limit],
    ] as const) {
        const whole = Number.isInteger(value) || (name === "limit" && value === Infinity);
        if (!whole || value < 0) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `${verb}() takes a ${name} that is a whole number of zero or more, not ${String(value)}`,
                source: "data",
                details: { option: name, value, min: 0 },
            });
        }
    }

    return { offset, limit };
}

/**
 * A reader by record id, read by row.
 * @param byId - reads one record by its id
 * @param snapshot - the current snapshot
 * @param target - nodes or edges
 * @returns the reader by row
 */
function rowReader(
    byId: (id: NodeId | EdgeId) => unknown,
    snapshot: GraphSnapshot,
    target: "node" | "edge",
): (index: number) => unknown {
    if (target === "node") {
        return (index) => byId(snapshot.ids.idOf(index));
    }

    const space = edgeSpaceOf(snapshot);
    return (index) => byId(space.idOf(index));
}

/**
 * One result column of a page, its cells aligned with the page's records.
 * @param column - the resolved column
 * @param target - nodes or edges
 * @param records - the page's records
 * @returns the column
 */
function pageColumn(
    column: ResolvedResult,
    target: "node" | "edge",
    records: readonly { readonly id: NodeId | EdgeId }[],
): PageColumn {
    return Object.freeze({
        run: column.run,
        field: column.field,
        path: column.path,
        type: column.type,
        pending: column.result === undefined,
        values: Object.freeze(records.map((record) => resultCell(column, target, record.id))),
    });
}

/** Everything derived from one snapshot, computed on demand and thrown away with it. */
interface Derived {
    /** The snapshot the rest of this belongs to. */
    readonly snapshot: GraphSnapshot;
    /** The graph's shape, once something asked for it. */
    statistics: GraphStatistics | null;
    /** The topology fingerprint, once something asked for it. */
    fingerprint: string | null;
}

/**
 * The session's view of the graph data.
 *
 * It reads a store it does not own the lifetime of, so every answer starts from
 * `store.getSnapshot()` rather than from a snapshot held here: the store is free to replace the
 * snapshot, and a data surface holding the old one would answer confidently about a graph that
 * no longer exists.
 */
export class SessionData implements SessionDataApi {
    /** The store, read-only: its snapshot is a consumer's, and its coordinates cannot be written. */
    readonly store: SessionGraphStore;

    /** The store itself, which the session's own readers read. */
    private readonly graphStore: SessionGraphStore;
    private readonly records: SessionRecordSource | null;
    private readonly readConfig: () => SessionDataConfig;
    private readonly writes: DataWrites;
    private readonly pages: PageSources;
    private derived: Derived | null = null;
    /** Row orders computed for pages, by what they were asked with, for the current revision. */
    private readonly orders: RevisionCache<Uint32Array>;
    /** The attribute walk, for the current revision. */
    private readonly attributeCache: RevisionCache<readonly AttributeDescriptor[]>;
    private disposed = false;

    /**
     * Build the data surface.
     * @param store - the store to read
     * @param records - where to read the attributes a record arrived with, or null when the
     *     element holds none
     * @param readConfig - reads the data configuration, live: the element replaces that object
     *     when a style template is applied, so it is read on demand rather than captured
     * @param writes - the dispatcher to write through, and the slice beside the rows
     * @param pages - the revision and the scope resolver a page reads
     */
    constructor(
        store: SessionGraphStore,
        records: SessionRecordSource | null,
        readConfig: () => SessionDataConfig,
        writes: DataWrites,
        pages: PageSources,
    ) {
        this.graphStore = store;
        this.store = readonlyStore(store);
        this.records = records;
        this.readConfig = readConfig;
        this.writes = writes;
        this.pages = pages;
        this.orders = new RevisionCache(() => pages.revision());
        this.attributeCache = new RevisionCache(() => pages.revision());
    }

    /**
     * Add node records, as one undoable step.
     * @param records - the records; each id is read through `data.knownFields.nodeIdPath`
     * @returns settles once they are in the graph and drawn
     */
    async addNodes(records: readonly NodeRecordInput[]): Promise<void> {
        this.requireLive("addNodes");
        await this.writes.dispatch({ kind: "add-nodes", records });
    }

    /**
     * Add edge records, as one undoable step.
     * @param records - the records; endpoints are read through the configured edge id paths
     * @returns settles once they are in the graph and drawn
     */
    async addEdges(records: readonly EdgeRecordInput[]): Promise<void> {
        this.requireLive("addEdges");
        await this.writes.dispatch({ kind: "add-edges", records });
    }

    /**
     * Change attributes of existing nodes, as one undoable step.
     * @param rows - the new values per node
     * @returns settles once the change is drawn
     */
    async updateNodes(rows: readonly RowUpdate<NodeId>[]): Promise<void> {
        this.requireLive("updateNodes");
        await this.writes.dispatch({ kind: "update-rows", target: "node", rows });
    }

    /**
     * Change attributes of existing edges, as one undoable step.
     * @param rows - the new values per edge id
     * @returns settles once the change is drawn
     */
    async updateEdges(rows: readonly RowUpdate<EdgeId>[]): Promise<void> {
        this.requireLive("updateEdges");
        await this.writes.dispatch({ kind: "update-rows", target: "edge", rows });
    }

    /**
     * Remove nodes, and every edge attached to one, as one undoable step.
     * @param ids - the node ids; one the graph does not hold is skipped
     * @returns settles once they are gone from the graph and the picture
     */
    async removeNodes(ids: readonly NodeId[]): Promise<void> {
        this.requireLive("removeNodes");
        await this.writes.dispatch({ kind: "remove-nodes", ids });
    }

    /**
     * Remove edges, as one undoable step.
     * @param ids - the element-assigned edge ids; one the graph does not hold is skipped
     * @returns settles once they are gone from the graph and the picture
     */
    async removeEdges(ids: readonly EdgeId[]): Promise<void> {
        this.requireLive("removeEdges");
        await this.writes.dispatch({ kind: "remove-edges", ids });
    }

    /**
     * Remove every node, edge, record and graph-level value, as one undoable step.
     * @returns settles once the graph and the picture are empty
     */
    async clear(): Promise<void> {
        this.requireLive("clear");
        await this.writes.dispatch({ kind: "clear" });
    }

    /**
     * Load a file, a URL or inline text through a registered data source, as one undoable step.
     * @param source - The data source's name and its options.
     * @param options - Whether to replace the graph (the default) or add to it.
     * @returns Settles once the last chunk is in the graph; rejects, recording nothing, when the
     *     load fails.
     */
    async import(source: DataSourceInput, options: ImportOptions = {}): Promise<void> {
        this.requireLive("import");
        // Taken before the first await: a transaction routes only what a verb dispatches
        // synchronously, and detecting the format may have to read the file or fetch the URL.
        const send = this.writes.importer();
        const command = (resolved: ImportSource): DataImportCommand => ({
            op: "data.import",
            source: resolved,
            mode: options.mode ?? "replace",
            ...(options.layout === undefined ? {} : { layout: options.layout }),
        });
        // Dispatched at once whenever nothing has to be read to settle the format, so the load
        // takes its turn in the order it was asked for.
        const resolved = resolveImportSource(source);
        await send(command(resolved instanceof Promise ? await resolved : resolved));
    }

    /**
     * The current snapshot, freezing first when records have arrived since the last freeze, with
     * copies of its coordinate and pin columns.
     * @returns the sealed snapshot
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    snapshot(): GraphSnapshot {
        this.requireLive("snapshot");
        return consumerSnapshot(this.graphStore.getSnapshot());
    }

    /**
     * The undirected view of a snapshot.
     * @param snapshot - the snapshot to derive from; the current one by default
     * @returns the derived graph
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    undirected(snapshot?: GraphSnapshot): DerivedGraph {
        this.requireLive("undirected");
        // Derived from the consumer's snapshot, because a derived graph shares the node table of
        // the one it came from, and the store's own holds the live coordinates.
        return this.graphStore.undirected(snapshot ?? this.snapshot());
    }

    /**
     * The store's own snapshot, for the readers here that never hand it out.
     * @returns the resident snapshot
     */
    private current(): GraphSnapshot {
        this.requireLive("snapshot");
        return this.graphStore.getSnapshot();
    }

    /**
     * One node, by id.
     * @param id - the node id, compared without coercion
     * @returns the record, or undefined when the graph has no such node
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    node(id: NodeId): NodeRecord | undefined {
        const snapshot = this.current();
        const index = snapshot.ids.indexOf(id);
        if (index === INVALID_INDEX) {
            return undefined;
        }

        return this.nodeAt(index, id);
    }

    /**
     * The node record at one row.
     * @param index - the row
     * @param id - the node's id
     * @returns the record, deep-frozen
     */
    private nodeAt(index: number, id: NodeId): NodeRecord {
        // The id is written AFTER the attribute bag so that a record carrying its own "id" key --
        // which every record imported through the element's default id path does -- cannot
        // disagree with the id the node is actually stored under.
        // Deep-frozen: a nested value is the graph's own, and writing it would change state
        // no command recorded.
        return frozenRecord({ ...this.records?.nodeAttributes(index, id), id });
    }

    /**
     * The edge record at one row.
     * @param snapshot - the snapshot the row is in
     * @param index - the row
     * @param id - the edge's id
     * @returns the record, deep-frozen
     */
    private edgeAt(snapshot: GraphSnapshot, index: number, id: EdgeId): EdgeRecord {
        return frozenRecord({
            ...this.records?.edgeAttributes(index),
            id,
            source: snapshot.ids.idOf(snapshot.edgeSource(index)),
            target: snapshot.ids.idOf(snapshot.edgeTarget(index)),
        });
    }

    /**
     * One edge, by the element-assigned edge id.
     * @param id - the edge id
     * @returns the record, or undefined when the graph has no such edge
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    edge(id: EdgeId): EdgeRecord | undefined {
        const snapshot = this.current();
        const counter = edgeCounterOf(id);
        // The id column holds the counter as a NUMBER, and `edgeIndexOf` keys its index on
        // SameValueZero, so handing it the string form would miss every edge with no error.
        const index = counter === INVALID_INDEX ? INVALID_INDEX : snapshot.edgeIndexOf(counter);
        if (index === INVALID_INDEX) {
            return undefined;
        }

        return this.edgeAt(snapshot, index, id);
    }

    /**
     * Every node, in the graph's order.
     * @returns the records, deep-frozen
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    nodes(): readonly NodeRecord[] {
        const snapshot = this.current();
        return Array.from({ length: snapshot.nodeCount }, (_unused, index) =>
            this.nodeAt(index, snapshot.ids.idOf(index)),
        );
    }

    /**
     * Every edge, in the graph's order.
     * @returns the records, deep-frozen
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    edges(): readonly EdgeRecord[] {
        const snapshot = this.current();
        const space = edgeSpaceOf(snapshot);
        return Array.from({ length: snapshot.edgeCount }, (_unused, index) =>
            this.edgeAt(snapshot, index, space.idOf(index)),
        );
    }

    /**
     * One page of node records.
     * @param options - the window, the scope and the order
     * @returns the page, with `columns` present
     * @throws A `GraphtyError` with `E_OPTION_RANGE` for a bad window, `E_DISPOSED` once disposed.
     */
    nodePage(
        options: RecordPageOptions & { readonly columns: readonly ResultColumn[] },
    ): RecordPage<NodeRecord> & { readonly columns: readonly PageColumn[] };
    /**
     * One page of node records.
     * @param options - the window, the scope and the order
     * @returns the page
     * @throws A `GraphtyError` with `E_OPTION_RANGE` for a bad window, `E_DISPOSED` once disposed.
     */
    nodePage(options?: RecordPageOptions): RecordPage<NodeRecord>;
    /**
     * One page of node records.
     * @param options - the window, the scope and the order
     * @returns the page
     * @throws A `GraphtyError` with `E_OPTION_RANGE` for a bad window, `E_DISPOSED` once disposed.
     */
    nodePage(options: RecordPageOptions = {}): RecordPage<NodeRecord> {
        const snapshot = this.current();
        return this.page(snapshot, "node", options, "nodePage", (index) =>
            this.nodeAt(index, snapshot.ids.idOf(index)),
        );
    }

    /**
     * One page of edge records.
     * @param options - the window, the scope, the order and the node
     * @returns the page, with `columns` present
     * @throws A `GraphtyError` with `E_OPTION_RANGE` for a bad window, `E_DISPOSED` once disposed.
     */
    edgePage(
        options: EdgePageOptions & { readonly columns: readonly ResultColumn[] },
    ): RecordPage<EdgeRecord> & { readonly columns: readonly PageColumn[] };
    /**
     * One page of edge records.
     * @param options - the window, the scope, the order and the node
     * @returns the page
     * @throws A `GraphtyError` with `E_OPTION_RANGE` for a bad window, `E_DISPOSED` once disposed.
     */
    edgePage(options?: EdgePageOptions): RecordPage<EdgeRecord>;
    /**
     * One page of edge records.
     * @param options - the window, the scope, the order and the node
     * @returns the page
     * @throws A `GraphtyError` with `E_OPTION_RANGE` for a bad window, `E_DISPOSED` once disposed.
     */
    edgePage(options: EdgePageOptions = {}): RecordPage<EdgeRecord> {
        const snapshot = this.current();
        const space = edgeSpaceOf(snapshot);
        return this.page(snapshot, "edge", options, "edgePage", (index) =>
            this.edgeAt(snapshot, index, space.idOf(index)),
        );
    }

    /**
     * What a find box lists, without selecting anything: `session.find`, which documents it.
     * @param text - what was typed
     * @param options - the window, the kinds and the scope
     * @returns a page of hits and the value rows
     * @throws A `GraphtyError` with `E_OPTION_RANGE` for a bad window or kind, `E_DISPOSED` once disposed.
     */
    find(text: string, options: FindOptions = {}): FindResult {
        this.requireLive("find");
        const { offset, limit } = pageWindow(
            { offset: options.offset, limit: options.limit ?? DEFAULT_FIND_LIMIT },
            "find",
        );
        const kinds = options.kinds ?? FIND_KINDS;
        for (const kind of kinds as readonly unknown[]) {
            if (!FIND_KINDS.includes(kind as FindKind)) {
                throw new GraphtyError({
                    code: "E_OPTION_RANGE",
                    message: `find() lists "node" and "edge", not ${JSON.stringify(kind)}`,
                    source: "data",
                    details: { option: "kinds", value: kind },
                });
            }
        }

        const scope = options.scope === undefined ? null : this.pages.resolve(options.scope);
        const revision = this.pages.revision();
        const found = this.pages.search(text, { offset, limit, kinds: new Set(kinds), scope });
        return { ...found, offset, revision: String(revision) };
    }

    /**
     * A page: the ordered rows, then the records for the window only.
     * @param snapshot - the current snapshot, already frozen
     * @param target - nodes or edges
     * @param options - what the caller asked for
     * @param verb - the verb, for an error
     * @param recordAt - builds the record at one row
     * @returns the page
     */
    private page<TRecord extends { readonly id: NodeId | EdgeId }>(
        snapshot: GraphSnapshot,
        target: "node" | "edge",
        options: EdgePageOptions,
        verb: string,
        recordAt: (index: number) => TRecord,
    ): RecordPage<TRecord> {
        const { offset, limit } = pageWindow(options, `data.${verb}`);
        const columns = options.columns?.map((column) => resolveResult(column, target, this.pages, verb));
        // Read after the snapshot: a freeze moves the tick, so reading it first would name a
        // revision the page was not read at.
        const revision = this.pages.revision();
        const rows = this.orderOf(snapshot, target, options, verb);
        const rowCount = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const total = rows === null ? rowCount : rows.length;
        const records: TRecord[] = [];
        for (let position = offset; position < Math.min(total, offset + limit); position++) {
            records.push(recordAt(rows === null ? position : (rows[position] ?? position)));
        }

        const page = { records: Object.freeze(records), offset, total, revision: String(revision) };
        if (columns === undefined) {
            return Object.freeze(page);
        }

        return Object.freeze({
            ...page,
            columns: Object.freeze(columns.map((column) => pageColumn(column, target, records))),
        });
    }

    /**
     * The rows a page's list holds, in order, computed once per revision and request.
     * @param snapshot - the current snapshot
     * @param target - nodes or edges
     * @param options - the scope, the order and the node
     * @param verb - the verb, for an error
     * @returns the rows, or null for every row in graph order
     */
    private orderOf(
        snapshot: GraphSnapshot,
        target: "node" | "edge",
        options: EdgePageOptions,
        verb: string,
    ): Uint32Array | null {
        const scope = options.scope === "graph" ? undefined : options.scope;
        const touching = target === "edge" ? options.touching : undefined;
        const { sort } = options;
        if (scope === undefined && touching === undefined && sort === undefined) {
            return null;
        }

        const result = sort !== undefined && "run" in sort ? resolveResult(sort, target, this.pages, verb) : undefined;
        // JSON keeps 1 and "1" apart, which the ids need. A result sort is keyed by what it
        // resolved to, never by the run handle it was given.
        const sortKey =
            result === undefined ? sort : { run: result.run, field: result.field, descending: sort?.descending };
        const key = JSON.stringify([target, scope, sortKey, touching]);
        return this.orders.get(key, () => {
            const space = edgeSpaceOf(snapshot);
            const order =
                sort === undefined
                    ? undefined
                    : {
                          descending: sort.descending === true,
                          value:
                              result === undefined
                                  ? (index: number): unknown =>
                                        this.sortValue(snapshot, target, index, (sort as RecordSort).key, (edge) =>
                                            space.idOf(edge),
                                        )
                                  : rowReader(resultSortValue(result, target), snapshot, target),
                      };
            return this.computeOrder(snapshot, target, scope, touching, order);
        });
    }

    /**
     * Filter the rows by scope and node, then sort them, keeping graph order among equals.
     * @param snapshot - the current snapshot
     * @param target - nodes or edges
     * @param scope - the scope, or undefined for the whole graph
     * @param touching - for edges, the node one end must be
     * @param sort - the direction and what a row sorts by, or undefined for graph order
     * @returns the rows
     */
    private computeOrder(
        snapshot: GraphSnapshot,
        target: "node" | "edge",
        scope: ScopeInput | undefined,
        touching: NodeId | undefined,
        sort: { readonly descending: boolean; value(index: number): unknown } | undefined,
    ): Uint32Array {
        const space = edgeSpaceOf(snapshot);
        const members = scope === undefined ? null : this.pages.resolve(scope);
        const count = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const end = touching === undefined ? INVALID_INDEX : snapshot.ids.indexOf(touching);
        const rows: number[] = [];
        // ponytail: `touching` scans every edge once per revision; read the undirected CSR if a
        // host pages the edges of many nodes per revision.
        for (let index = 0; index < count; index++) {
            if (
                touching !== undefined &&
                (end === INVALID_INDEX || (snapshot.edgeSource(index) !== end && snapshot.edgeTarget(index) !== end))
            ) {
                continue;
            }

            if (members !== null) {
                const inScope =
                    target === "node"
                        ? members.nodes.has(snapshot.ids.idOf(index))
                        : members.edges.has(space.idOf(index));
                if (!inScope) {
                    continue;
                }
            }

            rows.push(index);
        }

        if (sort !== undefined) {
            const values = rows.map((index) => sort.value(index));
            const direction = sort.descending ? -1 : 1;
            const positions = rows.map((_row, position) => position);
            positions.sort((x, y) => {
                const a = values[x];
                const b = values[y];
                const absentA = isAbsent(a);
                const absentB = isAbsent(b);
                if (absentA !== absentB) {
                    return absentA ? 1 : -1;
                }

                if (absentA) {
                    return x - y;
                }

                return direction * compareSortValues(a, b) || x - y;
            });
            return Uint32Array.from(positions, (position) => rows[position] ?? 0);
        }

        return Uint32Array.from(rows);
    }

    /**
     * The value one row sorts by: what its record would hold at the key, without building it.
     * @param snapshot - the current snapshot
     * @param target - nodes or edges
     * @param index - the row
     * @param key - the record key
     * @param nameEdge - names an edge row
     * @returns the value
     */
    private sortValue(
        snapshot: GraphSnapshot,
        target: "node" | "edge",
        index: number,
        key: string,
        nameEdge: (index: number) => EdgeId,
    ): unknown {
        if (target === "node") {
            const id = snapshot.ids.idOf(index);
            return key === "id" ? id : this.records?.nodeAttributes(index, id)?.[key];
        }

        switch (key) {
            case "id":
                return nameEdge(index);
            case "source":
                return snapshot.ids.idOf(snapshot.edgeSource(index));
            case "target":
                return snapshot.ids.idOf(snapshot.edgeTarget(index));
            default:
                return this.records?.edgeAttributes(index)?.[key];
        }
    }

    /**
     * Where the graph was loaded from, as the `graph` slice keeps it, so undo and redo move it.
     * @returns the source, or null when no import loaded the graph
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    source(): DataSourceDescriptor | null {
        this.requireLive("source");
        return (this.writes.slice().values.get(SOURCE_VALUE) as DataSourceDescriptor | undefined) ?? null;
    }

    /**
     * What the last load did.
     * @returns the report, or null when nothing has been loaded into this graph
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    lastImport(): ImportReport | null {
        this.requireLive("lastImport");
        const recorded = this.writes.slice().values.get("importReport") as ImportReport | undefined;
        return recorded ?? this.graphStore.lastImport ?? null;
    }

    /**
     * Every attribute the graph's records carry.
     * @returns the descriptors, node attributes first
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    attributes(): readonly AttributeDescriptor[] {
        // Keyed on the input tick, which moves on a freeze AND on an attribute write: keyed on the
        // snapshot alone, an edited value never reached the descriptors.
        const snapshot = this.current();
        const described = this.attributeCache.get("", () => describeAttributes(snapshot, this.records));
        const declarations = this.writes.declarations();
        if (declarations.size === 0) {
            return described;
        }

        // ponytail: overlaid per call while anything is declared; a few dozen spreads.
        return Object.freeze(
            described.map((each) => {
                const declared = declarations.get(declarationKey(each));
                return declared === undefined
                    ? each
                    : Object.freeze({ ...each, measurement: declared.measurement, measurementSource: "declared" });
            }),
        );
    }

    /**
     * Say what a column measures, as one undoable step.
     * @param column - the column, such as an entry of {@link SessionData.attributes}
     * @param declaration - what it measures, with the order of an ordinal column
     * @returns settles once the step is recorded
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` for a column no record carries, and
     *     `E_BAD_COMMAND` for a declaration that is not one.
     */
    async declare(column: ColumnRef, declaration: MeasurementDeclaration): Promise<void> {
        this.requireLive("declare");
        const { kind, name } = resolveColumn(this.attributes(), column);
        await this.writes.declare({ kind, name }, declaration);
    }

    /**
     * The graph's shape.
     * @returns the statistics
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    statistics(): GraphStatistics {
        const derived = this.derivedFor(this.current());
        derived.statistics ??= computeStatistics(
            derived.snapshot,
            this.readConfig().directed,
            this.graphStore.directionSettledBy,
        );
        return derived.statistics;
    }

    /**
     * A stable identity for the graph's topology.
     * @returns the fingerprint
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    fingerprint(): string {
        const derived = this.derivedFor(this.current());
        derived.fingerprint ??= computeFingerprint(derived.snapshot);
        return derived.fingerprint;
    }

    /**
     * Refuse every verb from here on, and let go of what was derived from the last snapshot.
     *
     * The store is NOT touched: the session decides whose store it is, and this class is handed
     * one either way.
     */
    dispose(): void {
        this.disposed = true;
        this.derived = null;
    }

    /**
     * The derived cache for one snapshot, emptied when the snapshot is not the one it was built
     * for.
     *
     * Identity is the whole test. A store hands back the same frozen object until the graph
     * changes, so `!==` is exactly "the graph changed", and it works the same whether the store
     * belongs to this session or to a data manager that never tells it anything.
     * @param snapshot - the snapshot being read
     * @returns the cache for that snapshot
     */
    private derivedFor(snapshot: GraphSnapshot): Derived {
        if (this.derived === null || this.derived.snapshot !== snapshot) {
            this.derived = { snapshot, statistics: null, fingerprint: null };
        }

        return this.derived;
    }

    /**
     * Refuse a verb on a disposed session, naming it.
     * @param verb - the verb that was called
     * @throws A `GraphtyError` with `E_DISPOSED`.
     */
    private requireLive(verb: string): void {
        if (this.disposed) {
            throw new GraphtyError({
                code: "E_DISPOSED",
                message: `the session has been disposed, so data.${verb}() cannot answer`,
                source: "data",
                details: { verb },
            });
        }
    }
}

/**
 * Where a session reads the attributes a record carries: the `graph` slice, which every write
 * through the graph primitives fills, and then a host's own source for rows it wrote some other way.
 *
 * An edge's record is handed back without the keys the last import read its endpoints from, when
 * those are plain keys, so a consumer deriving columns from the keys does not show `src` beside the
 * canonical `source`.
 * @param slice - Reads the `graph` slice.
 * @param snapshot - Reads the current snapshot, to name an edge row by its id.
 * @param lastImport - Reads the last import report.
 * @param fallback - The host's own source, if it has one.
 * @returns The source.
 */
export function sliceRecords(
    slice: () => GraphSlice,
    snapshot: () => GraphSnapshot,
    lastImport: () => ImportReport | null,
    fallback: SessionRecordSource | null,
): SessionRecordSource {
    return {
        nodeAttributes: (index, id) => slice().nodes.get(id) ?? fallback?.nodeAttributes(index, id),
        edgeAttributes: (index) => {
            const column = snapshot().edges.value(EDGE_ID_COLUMN, index);
            const record = typeof column === "number" ? slice().edges.get(edgeIdOf(column)) : undefined;
            return record === undefined ? fallback?.edgeAttributes(index) : withoutEndpointKeys(record, lastImport());
        },
    };
}

/** The element-assigned edge id column. */
const EDGE_ID_COLUMN = "graphty.edgeId";

/**
 * The graph's records in row order: what the element's `nodeData` and `edgeData` read. A node
 * record whose id the graph could not store, and so has no row, follows the rows.
 * @param slice - The `graph` slice.
 * @param snapshot - The snapshot of the same graph.
 * @param target - Nodes or edges.
 * @returns The records, frozen.
 */
export function recordsInRowOrder(
    slice: GraphSlice,
    snapshot: GraphSnapshot,
    target: "node" | "edge",
): readonly SessionAttributes[] {
    const out: SessionAttributes[] = [];
    if (target === "node") {
        const ids = snapshot.ids.toArray();
        for (const id of ids) {
            const record = slice.nodes.get(id);
            if (record !== undefined) {
                out.push(record);
            }
        }

        const rowed = new Set<unknown>(ids);
        for (const [id, record] of slice.nodes) {
            if (!rowed.has(id)) {
                out.push(record);
            }
        }
    } else {
        for (let row = 0; row < snapshot.edgeCount; row++) {
            const counter = snapshot.edges.value(EDGE_ID_COLUMN, row);
            const record = typeof counter === "number" ? slice.edges.get(edgeIdOf(counter)) : undefined;
            if (record !== undefined) {
                out.push(record);
            }
        }
    }

    return Object.freeze(out);
}

/** A JMESPath expression that is nothing but a top-level property name. */
const PLAIN_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * An edge record without the keys its endpoints were read from.
 * @param record - The record.
 * @param report - The last import report, which names the endpoint expressions.
 * @returns The record, or a copy without those keys.
 */
function withoutEndpointKeys(record: SessionAttributes, report: ImportReport | null): SessionAttributes {
    const endpoints = report?.endpoints;
    if (endpoints === undefined) {
        return record;
    }

    const dropped = new Set([endpoints.source, endpoints.target].filter((name) => PLAIN_KEY.test(name)));
    if (dropped.size === 0 || ![...dropped].some((key) => key in record)) {
        return record;
    }

    return Object.fromEntries(Object.entries(record).filter(([key]) => !dropped.has(key)));
}

/**
 * The data service of a session that owns its store: ingest over that store, with nothing to draw.
 * @param store - The store.
 * @param dispatcher - The session's dispatcher.
 * @param readConfig - Reads the data configuration.
 * @returns The service.
 */
export function headlessDataService(
    store: GraphStore,
    dispatcher: Dispatcher,
    readConfig: () => SessionDataConfig,
): DataService {
    const ingest = new Ingest<{ readonly edgeIndex: number }>({
        store: () => store,
        dataConfig: readConfig,
        hasNode: (id) => dispatcher.graph.slice.nodes.has(id),
        nodeCount: () => store.builder.nodeCount,
        edgesBetween: (source, target) => {
            const { builder } = store;
            if (!builder.hasNode(source) || !builder.hasNode(target)) {
                return [];
            }

            return [...builder.findEdges(builder.indexOf(source), builder.indexOf(target))].map((edgeIndex) => ({
                edgeIndex,
            }));
        },
        edgeAt: (edgeIndex) => (store.builder.hasEdge(edgeIndex) ? { edgeIndex } : null),
        replaceEdgeRecord: () => undefined,
        rowsRemoved: () => undefined,
        cleared: () => undefined,
        nodeStored: () => undefined,
        edgeStored: () => undefined,
        nodesArrived: () => undefined,
        edgesArrived: () => undefined,
        loadProgress: () => undefined,
        loadErrors: () => undefined,
        loadComplete: () => undefined,
        loadFailed: () => undefined,
        progress: (change) => dispatcher.services.progress?.(change),
    });

    return {
        apply: (mutation, draft) => {
            ingest.apply(mutation, dispatcher.graph.writer(draft, store));
        },
        import: (command, draft, signal) => ingest.importSource(command, dispatcher.graph.writer(draft, store), signal),
    };
}

/**
 * A store as a consumer reads it: its snapshot is {@link consumerSnapshot}'s, and its coordinates
 * are read-only.
 * @param store - The store.
 * @returns The read-only store.
 */
function readonlyStore(store: SessionGraphStore): SessionGraphStore {
    const positions = readonlyPositions(() => store.positions);
    return {
        getSnapshot: () => consumerSnapshot(store.getSnapshot()),
        undirected: (snapshot) => store.undirected(snapshot),
        positions,
        get seededNodeCount() {
            return store.seededNodeCount;
        },
        get directionSettledBy() {
            return store.directionSettledBy;
        },
        get lastImport() {
            return store.lastImport;
        },
    };
}

/**
 * The snapshot a consumer is handed: a copy of the store's own, sealed.
 *
 * Typed arrays cannot be frozen, so anything the resident snapshot shares with a consumer is
 * writable: the topology (`rowPtr`, `colIdx`, `weights`), every attribute column, and the
 * `position` and `graphty.pinned` columns, which are the store's coordinate lane. A write into any
 * of them would change what compute runs over, or place and pin nodes, with no step and nothing
 * for undo to restore. A copy keeps the published type, so an exporter reading
 * `byRole("position").data` works unchanged, and whatever the consumer writes stays theirs.
 * @param resident - The store's snapshot.
 * @returns The consumer's snapshot.
 */
function consumerSnapshot(resident: GraphSnapshot): GraphSnapshot {
    // ponytail: copies the whole snapshot per call (O(nodes + edges)); cache a copy per freeze and
    // lane generation, handed out as read-only views, if a consumer calls this every frame.
    const copy = fromBytes(resident.toBytes(), { validate: "none" });
    copy.seal();
    return copy;
}

/**
 * The file an import names, read structurally: a `File` in a browser, or anything with a name, a
 * size and a way to read its bytes.
 * @param value - The `file` option.
 * @returns The file, or null when the option holds none.
 */
function fileOf(
    value: unknown,
): { name: string; size: number; slice(start: number, end: number): { arrayBuffer(): Promise<ArrayBuffer> } } | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }

    const file = value as { name?: unknown; size?: unknown; slice?: unknown };
    return typeof file.name === "string" && typeof file.size === "number" && typeof file.slice === "function"
        ? (value as ReturnType<typeof fileOf>)
        : null;
}

/**
 * Settle what an import will read: the format, detected when it was not named, and the name and
 * size the graph keeps beside it. A URL whose name says nothing is fetched once here and its text
 * handed on, so the data source does not fetch it again.
 * @param source - The source as the caller named it.
 * @returns The source the `data.import` command carries.
 * @throws A `GraphtyError` with `E_UNKNOWN_FORMAT` when nothing recognises the data, and
 *     `E_FETCH_FAILED` when the URL cannot be read.
 */
function resolveImportSource(source: DataSourceInput): ImportSource | Promise<ImportSource> {
    const { config } = source;
    const file = fileOf(config.file);
    const url = typeof config.url === "string" ? config.url : undefined;
    const filename = file?.name ?? (url === undefined ? undefined : urlTail(url));
    const name = source.name ?? (filename === "" ? undefined : filename);
    const described = {
        ...(name === undefined ? {} : { name }),
        ...(file === null ? {} : { size: file.size }),
    };

    if (source.type !== undefined) {
        return { type: source.type, config, ...described };
    }

    const byName = filename === undefined ? null : detectFormat({ filename });
    if (byName !== null) {
        return { type: byName, config, ...described };
    }

    const detect = (sample: string | undefined, fetched?: Uint8Array): ImportSource => {
        const detected = sample === undefined ? null : detectFormat({ filename, sample });
        if (detected === null) {
            throw undetectedFormat(name ?? url ?? "the data", 'session.data.import({ type: "graphml", config })');
        }

        return { type: detected, config: fetched === undefined ? config : { ...config, data: fetched }, ...described };
    };

    if (isSourceData(config.data)) {
        return detect(sampleOf(toSourceInput(config.data)));
    }

    if (file !== null) {
        // Twice the sample, so a UTF-16 file still yields DETECTION_SAMPLE characters.
        return file
            .slice(0, DETECTION_SAMPLE * 2)
            .arrayBuffer()
            .then((bytes) => detect(sampleOf(new Uint8Array(bytes))));
    }

    if (url !== undefined) {
        // Read once, as bytes, and handed on: the reader does not fetch it again, and the importer
        // decodes it.
        return fetchBytes(url).then((bytes) => detect(sampleOf(bytes), bytes));
    }

    return detect(undefined);
}
