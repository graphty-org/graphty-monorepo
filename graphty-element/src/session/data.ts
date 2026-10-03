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
import type { AttributeDescriptor, EdgeId, ScopeInput } from "../catalog/types";
import { edgeCounterOf, edgeIdOf } from "../data/edgeIdentity";
import type { GraphStore } from "../data/GraphStore";
import { readonlyPositions } from "../data/lane";
import type { ImportReport } from "../data/report";
import { DETECTION_SAMPLE, fetchBytes, isSourceData, sampleOf, toSourceInput, urlTail } from "../data/source-bytes";
import { GraphtyError } from "../errors";
import { describeAttributes } from "./attributes";
import {
    type DataImportCommand,
    type DataMutation,
    type DataService,
    type ImportSource,
    SOURCE_VALUE,
} from "./commands/data";
import type { Dispatcher } from "./project/Dispatcher";
import { frozenRecord } from "./project/draft";
import { Ingest } from "./project/ingest";
import type { GraphSlice } from "./project/state";
import { RevisionCache } from "./revision";
import type { ResolvedScope } from "./runs/types";
import { edgeSpaceOf } from "./scope/ScopeApi";
import { computeFingerprint, computeStatistics } from "./statistics";
import type {
    DataSourceDescriptor,
    DataSourceInput,
    EdgePageOptions,
    EdgeRecord,
    EdgeRecordInput,
    GraphStatistics,
    ImportOptions,
    NodeRecord,
    NodeRecordInput,
    RecordPage,
    RecordPageOptions,
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
     * One run result field's value at a row: what a `results.<run>.<field>` path reads there.
     * @param target - nodes or edges
     * @param index - the row
     * @param path - the result path
     * @returns the value, or undefined where the run gave the row none
     */
    result(target: "node" | "edge", index: number, path: string): unknown;
}

/** What a result path starts with. */
const RESULT_PREFIX = "results.";

/**
 * Whether a key names a run's result field: exactly `results.<run>.<field>`.
 * @param key - a sort key or a column
 * @returns true for a result path
 */
function isResultPath(key: string): boolean {
    const parts = key.split(".");
    return key.startsWith(RESULT_PREFIX) && parts.length === 3 && parts.every((part) => part !== "");
}

/**
 * Check a page's columns.
 * @param columns - what the caller asked for
 * @param verb - the verb, for the message
 * @returns the columns, or an empty list
 * @throws A `GraphtyError` with `E_OPTION_RANGE` for a column that is not a result path.
 */
function pageColumns(columns: readonly string[] | undefined, verb: string): readonly string[] {
    for (const column of columns ?? []) {
        if (typeof column !== "string" || !isResultPath(column)) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `data.${verb}() takes columns that are run result paths, such as "results.pagerank.value", not ${JSON.stringify(column)}`,
                source: "data",
                details: { option: "columns", value: column },
            });
        }
    }

    return columns ?? [];
}

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
                message: `data.${verb}() takes a ${name} that is a whole number of zero or more, not ${String(value)}`,
                source: "data",
                details: { option: name, value, min: 0 },
            });
        }
    }

    return { offset, limit };
}

/** Everything derived from one snapshot, computed on demand and thrown away with it. */
interface Derived {
    /** The snapshot the rest of this belongs to. */
    readonly snapshot: GraphSnapshot;
    /** The graph's shape, once something asked for it. */
    statistics: GraphStatistics | null;
    /** The attribute descriptors, once something asked for them. */
    attributes: readonly AttributeDescriptor[] | null;
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
     * A page: the ordered rows, then the records for the window only.
     * @param snapshot - the current snapshot, already frozen
     * @param target - nodes or edges
     * @param options - what the caller asked for
     * @param verb - the verb, for an error
     * @param recordAt - builds the record at one row
     * @returns the page
     */
    private page<TRecord>(
        snapshot: GraphSnapshot,
        target: "node" | "edge",
        options: EdgePageOptions,
        verb: string,
        recordAt: (index: number) => TRecord,
    ): RecordPage<TRecord> {
        const { offset, limit } = pageWindow(options, verb);
        const columns = pageColumns(options.columns, verb);
        // Read after the snapshot: a freeze moves the tick, so reading it first would name a
        // revision the page was not read at.
        const revision = this.pages.revision();
        const rows = this.orderOf(snapshot, target, options);
        const rowCount = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const total = rows === null ? rowCount : rows.length;
        const records: TRecord[] = [];
        for (let position = offset; position < Math.min(total, offset + limit); position++) {
            const index = rows === null ? position : (rows[position] ?? position);
            const record = recordAt(index);
            if (columns.length === 0) {
                records.push(record);
                continue;
            }

            const values: Record<string, unknown> = {};
            for (const column of columns) {
                const value = this.pages.result(target, index, column);
                if (value !== undefined) {
                    values[column] = value;
                }
            }

            records.push(frozenRecord({ ...record, ...values }));
        }

        return Object.freeze({ records: Object.freeze(records), offset, total, revision: String(revision) });
    }

    /**
     * The rows a page's list holds, in order, computed once per revision and request.
     * @param snapshot - the current snapshot
     * @param target - nodes or edges
     * @param options - the scope, the order and the node
     * @returns the rows, or null for every row in graph order
     */
    private orderOf(snapshot: GraphSnapshot, target: "node" | "edge", options: EdgePageOptions): Uint32Array | null {
        const scope = options.scope === "graph" ? undefined : options.scope;
        const touching = target === "edge" ? options.touching : undefined;
        if (scope === undefined && touching === undefined && options.sort === undefined) {
            return null;
        }

        // JSON keeps 1 and "1" apart, which the ids need.
        const key = JSON.stringify([target, scope, options.sort, touching]);
        return this.orders.get(key, () => this.computeOrder(snapshot, target, scope, touching, options.sort));
    }

    /**
     * Filter the rows by scope and node, then sort them, keeping graph order among equals.
     * @param snapshot - the current snapshot
     * @param target - nodes or edges
     * @param scope - the scope, or undefined for the whole graph
     * @param touching - for edges, the node one end must be
     * @param sort - the order, or undefined for graph order
     * @returns the rows
     */
    private computeOrder(
        snapshot: GraphSnapshot,
        target: "node" | "edge",
        scope: ScopeInput | undefined,
        touching: NodeId | undefined,
        sort: RecordPageOptions["sort"],
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
            const values = rows.map((index) =>
                this.sortValue(snapshot, target, index, sort.key, (edge) => space.idOf(edge)),
            );
            const direction = sort.descending === true ? -1 : 1;
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
        if (isResultPath(key)) {
            return this.pages.result(target, index, key);
        }

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
        const derived = this.derivedFor(this.current());
        derived.attributes ??= describeAttributes(derived.snapshot, this.records);
        return derived.attributes;
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
            this.derived = { snapshot, statistics: null, attributes: null, fingerprint: null };
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
