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
import { sha256Hex, type SourceListing, type SourceListQuery, type SourceProbe } from "@graphty/graph-io";
import {
    DATASET_NAMES,
    fetchDataset,
    GENERATOR_CATALOG,
    type SampleGraph,
    toElementData,
} from "@graphty/graph-samples";
import { generateGraph, type GeneratorParams } from "@graphty/graph-samples/generators";

import { detectFormat, undetectedFormat } from "../catalog/detect";
import { sourceDescriptors } from "../catalog/sources";
import type {
    AttributeDescriptor,
    AttributeRole,
    AttributeType,
    AttributeUse,
    EdgeId,
    Measurement,
    MeasurementDeclaration,
    Path,
    ReadableValue,
    RunId,
    ScopeInput,
    SourceKey,
    StructureValue,
} from "../catalog/types";
import { isPairConfig } from "../data/CSVDataSource";
import { edgeCounterOf, edgeIdOf, pairKey as pairKeyOf } from "../data/edgeIdentity";
import type { GraphStore } from "../data/GraphStore";
import { readonlyPositions } from "../data/lane";
import { rowOfEitherSpelling } from "../data/nodeIdSpelling";
import type { ImportReport, LoadReport } from "../data/report";
import { DETECTION_SAMPLE, fetchBytes, isSourceData, sampleOf, toSourceInput, urlTail } from "../data/source-bytes";
import { GraphtyError } from "../errors";
import { bestRole, cachedGazetteer, gazetteerGeneration } from "../layout/locationMap/gazetteer";
import {
    chosenLocation,
    isLocationRefusal,
    listLocation,
    LOCATION_KIND_FIELDS,
    LOCATION_KINDS,
    type LocationKind,
    type LocationListing,
    readPlaceSource,
    resolveLocation,
} from "../layout/locationMap/source";
import { eachAdjacentArc } from "./adjacency";
import { describeAttributes } from "./attributes";
import {
    convertValue,
    isValueType,
    previewConversion,
    renameColumnIn,
    resolveColumn,
    ruleScope,
    VALUE_TYPES,
} from "./columns";
import type { BatchCommand } from "./commands";
import {
    COLUMNS_VALUE,
    type ColumnSettings,
    type DataImportCommand,
    type DataMutation,
    type DataService,
    declarationKey,
    describeSource,
    type HeldRows,
    importCommand,
    importFact,
    type ImportSource,
    NO_COLUMN_SETTINGS,
    SOURCE_VALUE,
    SOURCES_VALUE,
} from "./commands/data";
import { Draft, draftStyles, fileName, type JoinedTable, keyExpression, LABEL_COLUMNS, readSource } from "./draft";
import {
    type DataIssue,
    findIssues,
    type FixCode,
    type FixResult,
    type FoundIssue,
    type IssueId,
    ISSUES_VALUE,
    type IssueState,
    NO_ISSUE_STATE,
} from "./issues";
import { frozen, type JoinGraph, type JoinPlan, joinReport, planJoin } from "./join";
import { historyMark, type LoadLine, type LoadTurn, supersededError } from "./loadLine";
import type { SessionCommand } from "./planning";
import type { Dispatcher } from "./project/Dispatcher";
import { frozenRecord } from "./project/draft";
import { failedEnd, HELD_KINDS, Ingest, progressSource } from "./project/ingest";
import type { GraphSlice, RunEntry, VisibilityState } from "./project/state";
import type { SearchAnswer, SearchRequest } from "./query";
import { readableValues } from "./readable";
import { pairKey, planReplace, rejoined } from "./replace";
import {
    primaryResultColumn,
    type ResolvedResult,
    resolveResult,
    resultCell,
    resultCellRanks,
    resultSortValue,
} from "./results/pageColumns";
import { buildHistogram, resolveBinCount } from "./results/statistics";
import type { HistogramOptions } from "./results/types";
import { RevisionCache } from "./revision";
import type { ResolvedScope, Run, WeightMeaning } from "./runs/types";
import { edgeSpaceOf } from "./scope/ScopeApi";
import type { SelectionTextMode } from "./selection";
import { searchOf } from "./selection/targets";
import type { CodedFact, ColumnRef, ProgressChange } from "./shared";
import { ExpansionState, type HostEdge, type SourceHost } from "./sources/host";
import { isSourceFactKey, sourceFactsOf, sourceLoadsOf } from "./sources/ids";
import { SourceLedger } from "./sources/ledger";
import { type LoadFacts, type SourcesRead, type SourcesWrite, writeSourcesMember } from "./sources/member";
import { pendingSourceLoads } from "./sources/pending";
import { type Provenance, PROVENANCE_VALUE, provenanceIndex, withoutSource, withSupplied } from "./sources/provenance";
import type {
    CollapseResult,
    ExpandOptions,
    NodeSource,
    PendingSourceLoad,
    SourceCheck,
    SourceExpandResult,
    SourceFeatures,
    SourceInput,
    SourceLoadOptions,
    SourceLoadRecord,
    SourceMoreOptions,
    SourcePreview,
    SourcePreviewOptions,
    SourceRefreshReport,
} from "./sources/types";
import { computeFingerprint, computeStatistics } from "./statistics";
import type { CompiledLayer } from "./styles/Layer";
import { STRUCTURE_VALUES } from "./styles/sources";
import type {
    ColumnHistogram,
    ColumnRole,
    DatasetLoadOptions,
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
    JoinChoices,
    JoinRecord,
    JoinReport,
    JoinShape,
    LoadChoices,
    LoadedSource,
    LoadedSourceKind,
    LoadedWeight,
    LoadMapping,
    Neighbor,
    NeighborOptions,
    NeighborPage,
    NodeRecord,
    NodeRecordInput,
    PageColumn,
    RecordPage,
    RecordPageOptions,
    RecordSort,
    RemoveSourceResult,
    ReplaceReport,
    ReplaceUnboundCode,
    ResultColumn,
    ResultColumnDescriptor,
    RowUpdate,
    SessionAttributes,
    SessionDataApi,
    SessionDataConfig,
    SessionEventMap,
    SessionGraphStore,
    SessionRecordSource,
    TableMapping,
    TypeChangePreview,
    ValueCounts,
    ValueType,
} from "./types";
import { valueLabelsAt } from "./valueLabels";

/** A value a column holds that can be given a name (`data.label`) or counted. */
type ColumnScalar = string | number | boolean;

/** What the data surface writes through, and where it reads what the graph holds beside rows. */
interface DataWrites {
    /**
     * Where a `data.apply` made now would go -- the session, or the transaction a routed verb
     * runs in -- held for an edit that dispatches once the loads ahead of it have.
     */
    applier(): (mutation: DataMutation) => Promise<unknown>;
    /**
     * Where a `data.import` made now would go -- the session, or the transaction a routed verb
     * runs in -- held for a verb that dispatches it after an await.
     */
    importer(): (command: DataImportCommand | BatchCommand) => Promise<unknown>;
    /** The `graph` slice now. */
    slice(): GraphSlice;
    /** Runs an import in a scratch session with this data configuration and returns its report. */
    measure(command: DataImportCommand, config: SessionDataConfig): Promise<LoadReport>;
    /** Dispatch `data.declare`. */
    declare(column: ColumnRef, declaration: MeasurementDeclaration): Promise<unknown>;
    /** Dispatch `data.setSource`. */
    setSource(source: DataSourceDescriptor, sources?: readonly LoadedSource[]): Promise<unknown>;
    /** The `attributes` slice now: what each column was declared to measure, by `<kind>:<name>`. */
    declarations(): ReadonlyMap<string, MeasurementDeclaration>;
    /** Dispatch `data.label`. */
    label(path: Path, value: ColumnScalar, label: string | null): Promise<unknown>;
    /** The `valueLabels` slice now: the names given to values, by `valueLabelKey`. */
    valueLabels(): ReadonlyMap<string, string>;
    /** Publish a progress change as the session's `progress:changed`. */
    progress?(change: ProgressChange): void;
    /** The session's load line, shared with the graph's own loads, so loads land in call order. */
    readonly loadLine: LoadLine;
    /** Dispatch any command: the network-source loads and expansions dispatch their own ops. */
    send?(command: SessionCommand): Promise<unknown>;
    /** Publish a session event: the network-source expansions publish theirs. */
    emit?<K extends keyof SessionEventMap>(event: K, detail: SessionEventMap[K]): void;
    /** The style stack and the finished runs now: what reads a column. */
    readers(): {
        readonly styles: readonly CompiledLayer[];
        readonly runs: ReadonlyMap<RunId, RunEntry>;
        readonly visibility: VisibilityState;
    };
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
     * Whether one record matches a text, by row: a page's `matching`, over the query engine.
     * @param text - What was typed, its mode prefix already read
     * @param mode - How to match it
     * @param target - Nodes or edges
     * @returns The test
     */
    textTest(text: string, mode: SelectionTextMode, target: "node" | "edge"): (index: number) => boolean;
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
    /**
     * What one element carries for a value path, through the source rules and bindings read.
     * @param kind - Nodes or edges.
     * @param index - The element's dense index.
     * @param path - The value path.
     * @returns The value, or undefined for none.
     */
    valueAt(kind: "node" | "edge", index: number, path: Path): unknown;
    /**
     * How many of the designated time column's values read as time, so its completeness counts
     * times rather than values present; undefined for any other column.
     * @param kind - Nodes or edges.
     * @param column - The column.
     * @returns The count, or undefined.
     */
    timeParsed?(kind: "node" | "edge", column: string): number | undefined;
    /**
     * The visible masks, for statistics over the visible graph.
     * @returns The node and edge masks, 1 for visible.
     */
    visibleMasks?(): { readonly nodes: Uint8Array; readonly edges: Uint8Array };
}

/** One neighbor while its list is built: its row, and its name once a name sort read it. */
interface NeighborListRow {
    readonly other: number;
    weight: number;
    edgeCount: number;
    name?: string;
}

/** A node's neighbors in order, before a window is cut from them. */
interface NeighborList {
    readonly rows: readonly NeighborListRow[];
    readonly measuredBy: WeightMeaning | null;
    readonly missing: number;
}

/** How many neighbor lists are kept per revision: an inspector re-reads the last few. */
const NEIGHBOR_LISTS_KEPT = 8;

/** The mark on a neighbor the session's visibility hides. */
const FILTERED: Neighbor["excludedBy"] = Object.freeze({ kind: "filter" });
/** How many hits a find returns when the caller does not say. */
const DEFAULT_FIND_LIMIT = 20;

/** What a find lists when the caller does not say. */
const FIND_KINDS: readonly FindKind[] = ["node", "edge"];

/** How many records a page holds when the caller does not say. */
const DEFAULT_PAGE_LIMIT = 100;

/** A page record's issues when an issue-marked page has none on it. */
const NO_ISSUES: readonly IssueId[] = Object.freeze([]);

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
function pageWindow(
    options: Pick<RecordPageOptions, "offset" | "limit">,
    verb: string,
): { offset: number; limit: number } {
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
 * A page's `matching`, its mode settled: the text's prefix read when no mode was given.
 * @param matching - the option
 * @returns the text and the mode, or undefined when the page is not narrowed
 */
function matchingOf(
    matching: RecordPageOptions["matching"],
): { readonly text: string; readonly mode: SelectionTextMode } | undefined {
    if (matching === undefined) {
        return undefined;
    }

    return matching.mode === undefined ? searchOf(matching.text) : { text: matching.text, mode: matching.mode };
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
    const ranks = resultCellRanks(
        column,
        target,
        records.map((record) => record.id),
    );
    return Object.freeze({
        run: column.run,
        field: column.field,
        path: column.path,
        type: column.type,
        pending: column.result === undefined,
        values: Object.freeze(records.map((record) => resultCell(column, target, record.id))),
        ...(ranks === undefined ? {} : { ranks: Object.freeze(ranks) }),
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

/** The edge roles read only when edges load: what the edges are. */
const STRUCTURAL_EDGE_ROLES: ReadonlySet<ColumnRole> = new Set(["source", "target", "edgeId"]);

/**
 * The node location column of place names and the rows the gazetteer could not place, once the
 * location map has loaded the layers it needs; null before then, or when the location is not
 * place names.
 * @param columns - The attributes.
 * @param nodes - The node records.
 * @param known - `data.knownFields`.
 * @returns The rows, or null.
 */
function placeRows(
    columns: readonly AttributeDescriptor[],
    nodes: readonly NodeRecord[],
    known: Parameters<typeof chosenLocation>[1],
): { column: string; unmatched: readonly number[]; ambiguous: readonly number[] } | null {
    const places = cachedGazetteer();
    if (Object.keys(places).length === 0) {
        return null;
    }

    const values = columns.flatMap((c) =>
        c.kind === "node" ? [{ name: c.name, values: nodes.map((row) => row[c.name]) }] : [],
    );
    const answer = resolveLocation(
        chosenLocation({ location: null, latitude: null, longitude: null }, known),
        values,
        (name) => values.find((c) => c.name === name)?.values ?? null,
        places,
    );
    if (isLocationRefusal(answer) || answer.source.kind !== "place") {
        return null;
    }

    const reading = readPlaceSource(answer.source, places);
    return reading === null
        ? null
        : { column: answer.source.column, unmatched: reading.unmatched, ambiguous: reading.ambiguous };
}

/** The `data.knownFields` key each role of each kind is written to. */
const ROLE_FIELDS: Readonly<Record<"node" | "edge", Partial<Readonly<Record<ColumnRole, string>>>>> = {
    node: {
        key: "nodeIdPath",
        label: "nodeLabelPath",
        weight: "nodeWeightPath",
        time: "nodeTimePath",
        ...LOCATION_KIND_FIELDS,
    },
    edge: {
        source: "edgeSrcIdPath",
        target: "edgeDstIdPath",
        weight: "edgeWeightPath",
        time: "edgeTimePath",
        edgeId: "edgeIdPath",
    },
};

/** The attribute type each value type reports. */
const TYPE_OF: Readonly<Record<ValueType, AttributeType>> = {
    text: "string",
    number: "number",
    boolean: "boolean",
    date: "time",
    category: "category",
};

/**
 * The attribute type and inferred measurement a converted column reports.
 * @param each - The column as its values describe it.
 * @param type - The type it was converted to.
 * @returns The fields to lay over it.
 */
function typedFields(each: AttributeDescriptor, type: ValueType): Partial<AttributeDescriptor> {
    const attributeType = TYPE_OF[type] === "number" && each.type === "integer" ? "integer" : TYPE_OF[type];
    let measurement: Measurement = "categorical";
    if (attributeType === "time") {
        measurement = "time";
    } else if (attributeType === "number" || attributeType === "integer") {
        measurement = "quantitative";
    }

    return {
        type: attributeType,
        ...(each.measurement === undefined ? {} : { measurement, measurementSource: "inferred" as const }),
    };
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
    /** The draft `prepare` returned last, until it is loaded or disposed: one is held at a time. */
    private draft: Draft | null = null;
    /** Row orders computed for pages, by what they were asked with, for the current revision. */
    private readonly orders: RevisionCache<Uint32Array>;
    /** The last few neighbor lists, by node and options, for the current revision. */
    private readonly neighborLists: RevisionCache<NeighborList>;
    /** The attribute walk, for the current revision. */
    private readonly attributeCache: RevisionCache<readonly AttributeDescriptor[]>;
    /** The descriptors with their declarations and roles laid over, and what they were laid from. */
    private attributeOverlay: {
        readonly described: readonly AttributeDescriptor[];
        readonly key: string;
        readonly result: readonly AttributeDescriptor[];
    } | null = null;
    /** The issues found, and what they were read from. */
    private issuesMemo: {
        readonly state: IssueState;
        readonly snapshot: GraphSnapshot;
        readonly columns: readonly AttributeDescriptor[];
        readonly known: object;
        readonly gazetteer: number;
        readonly found: readonly FoundIssue[];
    } | null = null;
    /** The open issues on each record, by kind, and what they were read from. */
    private openIssuesMemo: {
        readonly found: readonly FoundIssue[];
        readonly state: IssueState;
        readonly byRecord: Readonly<Record<"node" | "edge", ReadonlyMap<NodeId | EdgeId, readonly IssueId[]>>>;
    } | null = null;
    /** `sources()` with its counts, and what they were counted from. */
    private sourcesMemo: {
        readonly stored: readonly LoadedSource[];
        readonly provenance: Provenance | undefined;
        readonly snapshot: GraphSnapshot;
        readonly ledger: object;
        readonly result: readonly LoadedSource[];
    } | null = null;
    /**
     * What each file load this session read was read from, by the token its `data.import`
     * command and its `sources()` entry carry (`input`), for `reloadSource`. Memory only: a file is
     * never saved in a project, so an opened project's token resolves to nothing.
     */
    private readonly kept = new Map<string, DataSourceInput>();
    private keptSerial = 0;
    /** The loads whose rows carry each column, and what they were read from. */
    private columnSourcesMemo: {
        readonly described: readonly AttributeDescriptor[];
        readonly provenance: Provenance | undefined;
        readonly result: ReadonlyMap<string, readonly SourceKey[]>;
    } | null = null;
    private disposed = false;
    /** The records of the loads from network sources; see `loads()`. Internal: the type is not published. */
    readonly ledger = new SourceLedger();
    /** The keys of the loads an opened project holds that have not run since it opened. */
    private readonly pendingLoads = new Set<string>();
    /** What each load left that `sources()` does not list, by its key: what a project file's entry records. */
    private readonly loadFacts = new Map<SourceKey, LoadFacts>();
    /**
     * An opened project's `graphty-sources` member that was skipped, written back in place while
     * the loads are the ones the file opened with.
     */
    private skippedMember: { readonly member: Readonly<Record<string, unknown>>; readonly stored: unknown } | null =
        null;
    /** What click-to-expand keeps beside the graph. */
    private readonly expansions = new ExpansionState();
    /** The loads asked for and not yet dispatched, so they land in the order they were asked for. */
    private readonly loadLine: LoadLine;

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
        this.loadLine = writes.loadLine;
        this.pages = pages;
        this.orders = new RevisionCache(() => pages.revision());
        this.neighborLists = new RevisionCache(() => pages.revision(), NEIGHBOR_LISTS_KEPT);
        this.attributeCache = new RevisionCache(() => pages.revision());
    }

    /**
     * Add node records, as one undoable step.
     * @param records - the records; each id is read through `data.knownFields.nodeIdPath`
     * @returns settles once they are in the graph and drawn
     */
    async addNodes(records: readonly NodeRecordInput[]): Promise<void> {
        this.requireLive("addNodes");
        await this.edit({ kind: "add-nodes", records });
    }

    /**
     * Add edge records, as one undoable step.
     * @param records - the records; endpoints are read through the configured edge id paths
     * @returns settles once they are in the graph and drawn
     */
    async addEdges(records: readonly EdgeRecordInput[]): Promise<void> {
        this.requireLive("addEdges");
        await this.edit({ kind: "add-edges", records });
    }

    /**
     * Change attributes of existing nodes, as one undoable step.
     * @param rows - the new values per node
     * @returns settles once the change is drawn
     */
    async updateNodes(rows: readonly RowUpdate<NodeId>[]): Promise<void> {
        this.requireLive("updateNodes");
        await this.edit({ kind: "update-rows", target: "node", rows });
    }

    /**
     * Change attributes of existing edges, as one undoable step.
     * @param rows - the new values per edge id
     * @returns settles once the change is drawn
     */
    async updateEdges(rows: readonly RowUpdate<EdgeId>[]): Promise<void> {
        this.requireLive("updateEdges");
        await this.edit({ kind: "update-rows", target: "edge", rows });
    }

    /**
     * Remove nodes, and every edge attached to one, as one undoable step.
     * @param ids - the node ids; one the graph does not hold is skipped
     * @returns settles once they are gone from the graph and the picture
     */
    async removeNodes(ids: readonly NodeId[]): Promise<void> {
        this.requireLive("removeNodes");
        await this.edit({ kind: "remove-nodes", ids });
    }

    /**
     * Remove edges, as one undoable step.
     * @param ids - the element-assigned edge ids; one the graph does not hold is skipped
     * @returns settles once they are gone from the graph and the picture
     */
    async removeEdges(ids: readonly EdgeId[]): Promise<void> {
        this.requireLive("removeEdges");
        await this.edit({ kind: "remove-edges", ids });
    }

    /**
     * Remove every node, edge, record and graph-level value, as one undoable step.
     * @returns settles once the graph and the picture are empty
     */
    async clear(): Promise<void> {
        this.requireLive("clear");
        // A load still reading when the clear is asked for is cancelled: it rejects with
        // E_SUPERSEDED and adds nothing, so the cleared graph does not come back (issue #3524). An
        // edit still waiting resolves and adds nothing either.
        const send = this.writes.applier();
        await this.loadLine.clear(() => send({ kind: "clear" }));
        // Nothing a source load brought is left, so `loads()` lists none of them and a saved
        // project does not offer to fetch them again; undo brings the rows and the records back.
        this.pendingLoads.clear();
    }

    /**
     * Dispatch an edit in the session's load line, behind every load asked for before it, so it
     * lands on what they load instead of under them (issue #3526).
     * A clear asked for while it waits cancels it: it resolves without applying.
     * @param mutation - The edit.
     * @returns Settles once it is applied, or cancelled by a clear.
     */
    private edit(mutation: DataMutation): Promise<unknown> {
        const send = this.writes.applier();
        return this.loadLine.edit(() => send(mutation), undefined);
    }

    /**
     * Load a file, a URL or inline text through a registered data source, as one undoable step.
     * The first import into a new session (no history, never saved or opened) leaves
     * `project.dirty` false: it is where the project starts. Every other import sets it.
     * @param source - The data source's name and its options.
     * @param options - Whether to replace the graph (the default) or add to it.
     * @returns Settles once the last chunk is in the graph; rejects, recording nothing, when the
     *     load fails.
     */
    async import(source: DataSourceInput, options: LoadChoices & SourceLoadOptions = {}): Promise<void> {
        this.requireLive("import");
        // A network source's read honours the signal, so its wait for its turn does too.
        const turn = this.loadLine.join(source.source === undefined ? undefined : options.signal);
        try {
            if (source.source !== undefined) {
                await (await import("./sources/load")).importSource(this.hostInTurn(turn), { ...source, source: source.source }, options);
                return;
            }

            // Taken before the first await: a transaction routes only what a verb dispatches
            // synchronously, and detecting the format may have to read the file or fetch the URL.
            await this.importVia(this.keeping(this.writes.importer(), source), source, options, turn);
        } finally {
            turn.leave();
        }
    }

    /**
     * Remember what a load is read from, under a new token.
     * @param source - What it is read from.
     * @returns The token, for the load's `data.import` command.
     */
    private keep(source: DataSourceInput): string {
        const token = `i${String(++this.keptSerial)}`;
        this.kept.set(token, source);
        return token;
    }

    /**
     * A dispatch that tags each `data.import` it sends, alone or in a batch, with the token of what
     * the rows were read from, so the load's `sources()` entry says it can be read again.
     * @param send - The dispatch.
     * @param source - What the rows are read from.
     * @returns The tagging dispatch.
     */
    private keeping<C extends DataImportCommand | BatchCommand>(
        send: (command: C) => Promise<unknown>,
        source: DataSourceInput,
    ): (command: C) => Promise<unknown> {
        const tag = (command: SessionCommand): SessionCommand =>
            command.op === "data.import" ? { ...command, input: this.keep(source) } : command;
        return (command) =>
            send((command.op === "batch" ? { ...command, steps: command.steps.map(tag) } : tag(command)) as C);
    }

    /**
     * Load a generated graph from the catalogue, as one undoable step.
     * @param name - The generator's name.
     * @param params - Its parameters; each one left out takes its catalogue default.
     * @param options - Whether to replace the graph (the default) or add to it.
     * @returns Settles once the graph is loaded.
     */
    async generate(name: string, params: GeneratorParams = {}, options: ImportOptions = {}): Promise<void> {
        this.requireLive("generate");
        const send = this.writes.importer();
        const descriptor = GENERATOR_CATALOG.find((each) => each.name === name);
        if (descriptor === undefined) {
            throw new GraphtyError({
                code: "E_UNKNOWN_GENERATOR",
                message: `There is no generator named "${name}".`,
                source: "data",
                details: { name, available: GENERATOR_CATALOG.map((each) => each.name) },
            });
        }
        const available = descriptor.params.map((each) => each.name);
        const unknown = Object.keys(params).find((key) => !available.includes(key));
        if (unknown !== undefined) {
            throw new GraphtyError({
                code: "E_UNKNOWN_OPTION",
                message: `The ${name} generator takes no parameter "${unknown}".`,
                source: "data",
                details: { option: unknown, available },
            });
        }
        let graph: SampleGraph;
        try {
            graph = generateGraph(name, params);
        } catch (error) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: error instanceof Error ? error.message : String(error),
                source: "data",
                details: { generator: name, params },
                cause: error,
            });
        }
        const turn = this.loadLine.join();
        try {
            await this.importVia(
                send,
                recordsSource(graph, name),
                options,
                turn,
                "sample",
                { generator: name, params: { ...params } },
                sampleLabelOf(graph),
            );
        } finally {
            turn.leave();
        }
    }

    /**
     * Download a sample dataset from the catalogue and load it, as one undoable step.
     * @param name - The dataset's name.
     * @param options - The import mode, a mirror to download from, and a signal.
     * @returns Settles once the graph is loaded.
     */
    async loadDataset(name: string, options: DatasetLoadOptions = {}): Promise<void> {
        this.requireLive("loadDataset");
        const send = this.writes.importer();
        const { baseUrl, signal, ...load } = options;
        // A mirror may serve any name; only graphty.app's own list is checked.
        if (baseUrl === undefined && !DATASET_NAMES.includes(name)) {
            throw new GraphtyError({
                code: "E_UNKNOWN_DATASET",
                message: `There is no dataset named "${name}".`,
                source: "data",
                details: { name, available: DATASET_NAMES },
            });
        }
        // Its place in line is taken now, so a load asked for later waits for this download; an
        // abort while it waits for its turn stops it there and lets the next load through.
        const turn = this.loadLine.join(signal);
        try {
            let snapshot: GraphSnapshot;
            try {
                snapshot = await fetchDataset(name, { baseUrl, signal });
            } catch (error) {
                throw new GraphtyError({
                    code: "E_FETCH_FAILED",
                    message: `The dataset "${name}" could not be downloaded.`,
                    source: "data",
                    recoverable: true,
                    details: { name, ...(baseUrl === undefined ? {} : { baseUrl }) },
                    cause: error,
                });
            }
            await this.importVia(
                send,
                recordsSource(snapshot, name),
                load,
                turn,
                "sample",
                { dataset: name, ...(baseUrl === undefined ? {} : { baseUrl }) },
                sampleLabelOf(snapshot),
            );
        } finally {
            turn.leave();
        }
    }

    /**
     * The body of `import`, dispatching through an importer taken before any await.
     * @param dispatch - The importer, taken when the verb was called.
     * @param source - What `import` takes.
     * @param options - What `import` takes.
     * @param turn - The load's place in line, taken when the verb was called: it dispatches only
     *   once every load asked for before it has.
     * @param origin - What `data.sources()` says the load came from; read from the source's type when absent.
     * @param sample - For a generated graph or a dataset: what it was, for the project file.
     * @param sampleLabel - For a generated graph or a dataset: the column that names its nodes.
     * @returns Settles once the last chunk is in the graph.
     */
    private async importVia(
        dispatch: (command: DataImportCommand | BatchCommand) => Promise<unknown>,
        source: DataSourceInput,
        options: LoadChoices & Pick<SourceLoadOptions, "existing">,
        turn: LoadTurn,
        origin?: LoadedSourceKind,
        sample?: LoadFacts["sample"],
        sampleLabel?: string,
    ): Promise<void> {
        let resolvedConfig: Readonly<Record<string, unknown>> = source.config;
        const noted = this.noting(
            dispatch,
            () => (sample === undefined ? bytesFacts(resolvedConfig) : Promise.resolve({ sample })),
            choiceOptions(options),
        );
        const mark = historyMark(options);
        const send = (command: DataImportCommand | BatchCommand): ReturnType<typeof noted> =>
            noted({ ...command, ...mark });
        if ((options.mode ?? "replace") === "replace") {
            // A file, a URL, a generated graph or a dataset replacing the graph replaces what its source loads brought too; their
            // records stay in the ledger, unlisted, so undoing the replacement lists them again.
            this.pendingLoads.clear();
        }
        this.draft?.dispose();
        if (
            options.mapping !== undefined ||
            options.unmatched !== undefined ||
            options.directed !== undefined ||
            options.duplicateIds !== undefined
        ) {
            const draft = await this.prepare(source);
            try {
                await turn.wait();
                await draft.loadVia((command) => turn.issue(() => send(command)), options);
            } finally {
                draft.dispose();
            }

            return;
        }

        // Dispatched at once whenever nothing has to be read to settle the format, so the load
        // takes its turn in the order it was asked for.
        const resolving = resolveImportSource(source);
        const resolved = resolving instanceof Promise ? await resolving : resolving;
        resolvedConfig = resolved.config ?? source.config;
        // Waited for only when a load asked for earlier is still reading, so one with nothing
        // ahead of it dispatches before this call returns, as it did before the line existed.
        await turn.take(() => {
            const step: DataImportCommand = {
                ...importCommand(resolved, options),
                ...(origin === undefined ? {} : { origin }),
            };
            // A new graph does not inherit the last one's weight meaning (as `Draft.plan` does).
            // ponytail: only this door and the draft reset it; another replace route keeps the old one.
            const { knownFields } = this.readConfig();
            const resets = step.mode !== "merge" && knownFields.edgeWeightMeaning !== null;
            // A new graph from a graph file names its nodes by the file's label column, as a draft's
            // load of it does, and a dataset by the label, name or title its nodes carry, unless a
            // label path is configured already. A node without one is still named by its id. A merge
            // keeps how the graph it joins names its nodes.
            const graphFile = step.source.type !== undefined && step.source.type !== "csv";
            const fileLabel = graphFile ? "label" : undefined;
            const label = origin === "sample" ? sampleLabel : fileLabel;
            const names = step.mode !== "merge" && knownFields.nodeLabelPath === null && label !== undefined;
            const before: BatchCommand["steps"] = [
                ...(resets
                    ? [{ op: "config.set", values: { data: { knownFields: { edgeWeightMeaning: null } } } } as const]
                    : []),
                ...(names
                    ? [{ op: "config.set", values: { data: { knownFields: { nodeLabelPath: label } } } } as const]
                    : []),
            ];
            // The batch is the import in the history, so it carries the import's fact: a page load's
            // own step reads as a load, not as the reader's work (the autosaver tells them apart so).
            return send(before.length === 0 ? step : { op: "batch", fact: importFact(step), steps: [...before, step] });
        });
    }

    /**
     * A dispatch that records, for each load it adds to `sources()`, when it finished, whether it
     * replaced the graph, and what was read: what a project file's entry for it records.
     * @param send - The dispatch, taken when the verb was called.
     * @param read - What the load's bytes were, read once it is in the graph.
     * @param options - The import choices given beside the source's own configuration.
     * @returns The dispatch.
     */
    private noting(
        send: (command: DataImportCommand | BatchCommand) => Promise<unknown>,
        read: () => Promise<Partial<LoadFacts>>,
        options?: Readonly<Record<string, unknown>>,
    ): (command: DataImportCommand | BatchCommand) => Promise<unknown> {
        return async (command) => {
            // Read before the dispatch, which takes its turn as soon as it is called.
            const before = new Set(this.storedSources().map((each) => each.key));
            const result = await send(command);
            const added = this.storedSources().filter((each) => !before.has(each.key));
            if (added.length > 0) {
                const facts: LoadFacts = {
                    ...(await read()),
                    loadedAt: new Date().toISOString(),
                    mode: modeOf(command),
                    ...(options === undefined ? {} : { options }),
                };
                for (const each of added) {
                    this.loadFacts.set(each.key, facts);
                }
            }

            return result;
        };
    }

    /**
     * The loads the `graph` slice lists, as stored: not recounted.
     * @returns The loads.
     */
    private storedSources(): readonly LoadedSource[] {
        return (this.writes.slice().values.get(SOURCES_VALUE) as readonly LoadedSource[] | undefined) ?? [];
    }

    /**
     * Check a network source's params and credential without loading anything.
     * @param source - The source id and its params.
     * @param options - The credential and the endpoint.
     * @returns What the service said.
     */
    testSource(source: SourceInput, options: SourceLoadOptions = {}): Promise<SourceProbe> {
        this.requireLive("testSource");
        const host = this.sourceHost();
        return import("./sources/load").then((module) => module.testSource(host, source, options));
    }

    /**
     * Search what a network source holds.
     * @param source - The source id and the params narrowing the search.
     * @param query - The search text, cursor and page size.
     * @param options - The credential and the endpoint.
     * @returns One page of rows.
     */
    listSource(
        source: SourceInput,
        query: Omit<SourceListQuery<Record<string, unknown>>, "params"> = {},
        options: SourceLoadOptions = {},
    ): Promise<SourceListing> {
        this.requireLive("listSource");
        const host = this.sourceHost();
        return import("./sources/load").then((module) => module.listSource(host, source, query, options));
    }

    /**
     * Fetch the neighborhood of nodes from the source that loaded them, as one undoable step.
     * @param ids - The seeds.
     * @param options - Depth, direction, limit and the credential.
     * @returns What it brought, as a coded fact.
     */
    expand(ids: readonly NodeId[], options: ExpandOptions = {}): Promise<SourceExpandResult> {
        this.requireLive("expand");
        // In line, as a load: its rows are dispatched after every load asked for before it, and a
        // load asked for after it waits for all of them, so it never adds to the graph that load
        // replaced (issue #3382).
        return this.inLine(options.signal, (host) => import("./sources/expand").then((module) => module.expandNodes(host, ids, options)), true);
    }

    /**
     * Where a node came from, when a network source's load brought it.
     * @param id - The node.
     * @returns Its load, entry, whether it can expand or collapse, and its hidden neighbors; null
     *     for a node no network source brought, or one the graph does not hold.
     */
    nodeSource(id: NodeId): NodeSource | null {
        this.requireLive("nodeSource");
        const record = this.node(id);
        const load = this.ledger.loadOf(sourceLoadsOf(record));
        if (record === undefined || load === undefined) {
            return null;
        }

        const facts = sourceFactsOf(record);
        const hidden = typeof facts.hidden === "number" ? facts.hidden : null;
        const expanded = facts.expansion === "partial" || facts.expansion === "complete";
        const canFetch = sourceDescriptors().find((entry) => entry.id === load.source)?.features.expand === true;
        return Object.freeze({
            loadKey: load.key,
            source: this.sources().find((each) => each.loadKey === load.key)?.key ?? null,
            // A node is worth expanding until an expansion found all of it, or the source says
            // every neighbor is already here.
            canExpand: canFetch && facts.expansion !== "complete" && hidden !== 0,
            hiddenNeighbors: hidden,
            expanded,
        });
    }

    /**
     * Remove what a node's expansions alone brought, as one undoable step.
     * @param id - The node.
     * @returns What was removed and kept.
     */
    collapse(id: NodeId): Promise<CollapseResult> {
        this.requireLive("collapse");
        // In line, as an edit: it removes what the graph holds once the loads ahead of it landed.
        // A clear asked for while it waits cancels it: it removes nothing, and the clear removes all.
        return this.inLine(
            undefined,
            (host) => import("./sources/expand").then((module) => module.collapseNode(host, id)),
            false,
            () => ({
                removedNodes: [],
                removedEdges: 0,
                kept: [],
            }),
        );
    }

    /**
     * Load the next page after a capped load from a source.
     * @param options - The load options, and the load to page (`load`, a key from `loads()`).
     * @returns Settles once the page is in the graph.
     */
    more(options: SourceMoreOptions = {}): Promise<void> {
        this.requireLive("more");
        return this.inLine(options.signal, (host) => import("./sources/load").then((module) => module.more(host, options)));
    }

    /**
     * Read a few rows of a network source, changing nothing.
     * @param source - The source id and its params.
     * @param options - The cap (`maxNodes`, 25 by default), the credential and the endpoint.
     * @returns The rows, their columns, whether there is more, the server's facts and the issues.
     */
    previewSource(source: SourceInput, options: SourcePreviewOptions = {}): Promise<SourcePreview> {
        this.requireLive("previewSource");
        const host = this.sourceHost();
        return import("./sources/load").then((module) => module.previewSource(host, source, options));
    }

    /**
     * Ask a load's source whether its data changed, loading nothing.
     * @param load - The load's key, from `loads()`.
     * @param options - The credential and the endpoint.
     * @returns Whether it changed; null when the source cannot tell.
     */
    checkSource(load: string, options: SourceLoadOptions = {}): Promise<SourceCheck> {
        this.requireLive("checkSource");
        const host = this.sourceHost();
        return import("./sources/load").then((module) => module.checkSource(host, load, options));
    }

    /**
     * Read a load from its source again and apply only the difference, as one undoable step.
     * @param load - The load's key, from `loads()`.
     * @param options - The credential and the endpoint.
     * @returns What was added, removed and updated.
     */
    refresh(load: string, options: SourceLoadOptions = {}): Promise<SourceRefreshReport> {
        this.requireLive("refresh");
        const host = this.sourceHost();
        return import("./sources/load").then((module) => module.refreshSource(host, load, options));
    }

    /**
     * Load a public sample a registered source lists, as one undoable step.
     * @param id - The sample's id.
     * @param options - Anything `import` takes.
     * @returns Settles once the sample is in the graph.
     */
    async loadSample(id: string, options: LoadChoices & SourceLoadOptions = {}): Promise<void> {
        this.requireLive("loadSample");
        const turn = this.loadLine.join(options.signal);
        try {
            await (await import("./sources/load")).loadSample(this.hostInTurn(turn), id, options);
        } finally {
            turn.leave();
        }
    }

    /**
     * The loads from network sources this graph holds: a load or an expansion is listed while a
     * node it brought is in the graph, so undo and redo take its record away and back with it.
     * @returns The records, in load order.
     */
    loads(): readonly SourceLoadRecord[] {
        return this.ledger.loads(this.liveLoadKeys());
    }

    /**
     * Every load and expansion key a node of the graph carries in `_source.loads`.
     * ponytail: walks every node on each call; cache it by revision if `loads()` gets hot.
     * @returns the keys
     */
    private liveLoadKeys(): ReadonlySet<string> {
        const keys = new Set<string>();
        const snapshot = this.current();
        for (let index = 0; index < snapshot.nodeCount; index++) {
            for (const key of sourceLoadsOf(this.records?.nodeAttributes(index, snapshot.ids.idOf(index)))) {
                keys.add(key);
            }
        }

        return keys;
    }

    /**
     * The source loads an opened project holds but has not run.
     * @returns One entry per waiting load.
     */
    pendingSourceLoads(): readonly PendingSourceLoad[] {
        return pendingSourceLoads(this.sourceHost());
    }

    /**
     * Run one waiting source load of an opened project.
     * @param id - The load's key.
     * @param options - The credential.
     * @returns Settles once it is loaded.
     */
    runPendingSourceLoad(id: string, options: SourceLoadOptions = {}): Promise<void> {
        this.requireLive("runPendingSourceLoad");
        return this.inLine(options.signal, (host) => import("./sources/load").then((module) => module.runPendingSourceLoad(host, id, options)));
    }

    /**
     * What a project file writes about the loads: the `graphty-sources` member (null when the graph
     * holds no load), what the save left out, and how each record's `_source.loads` is written.
     * Internal: the project file writes it.
     * @returns the member and its ids
     */
    sourceFile(): SourcesWrite {
        const write = writeSourcesMember({ sources: this.sources(), loads: this.loads(), facts: this.loadFacts });
        const skipped = this.skippedMember;
        // A member the file held and this release skipped goes back in place while the loads are
        // the ones the file opened with.
        if (skipped !== null && skipped.stored === this.writes.slice().values.get(SOURCES_VALUE)) {
            return { ...write, member: { ...skipped.member } };
        }

        return write;
    }

    /**
     * Take what an opened project's `graphty-sources` member held: its network loads are recorded
     * and wait, fetching nothing, until `runPendingSourceLoad`. Internal: the project file calls it
     * once the project's graph is in.
     * @param read - what the member held, or undefined when the file holds none
     */
    restoreSourceMember(read: SourcesRead | undefined): void {
        this.pendingLoads.clear();
        this.loadFacts.clear();
        this.skippedMember =
            read?.skipped === undefined
                ? null
                : { member: read.skipped, stored: this.writes.slice().values.get(SOURCES_VALUE) };
        this.ledger.fromMember({ version: 1, loads: read?.records ?? [] });
        for (const [key, facts] of read?.facts ?? []) {
            this.loadFacts.set(key, facts);
        }

        for (const record of this.ledger.loads()) {
            this.pendingLoads.add(record.key);
        }
    }

    /**
     * What a source load works through when it holds a place in line: it waits its turn once
     * it has read, and gives the place up as it dispatches.
     * @param turn - The load's place.
     * @param hold - Keep the place past the first dispatch, for a verb that dispatches more than
     *   once and gives it up when it settles.
     * @returns The host.
     */
    private hostInTurn(turn: LoadTurn, hold = false): SourceHost {
        const host = this.sourceHost();
        return {
            ...host,
            waitTurn: () => turn.wait(),
            dispatch: (command) =>
                hold
                    ? (turn.wait()?.then(() => host.dispatch(command)) ?? host.dispatch(command))
                    : turn.take(() => host.dispatch(command)),
        };
    }

    /**
     * Run a door that works out its change from the graph in the session's load line, as an
     * edit: it takes its place when called and reads the graph once every load asked for before
     * it has landed, so it changes what they loaded instead of what was there before them. A
     * clear asked for while it waits cancels it: it resolves with `skipped`, or by default
     * rejects with `E_SUPERSEDED`, since what it names is gone.
     * @param run - The door's work.
     * @param skipped - What a cancelled door resolves with; rejects when not given.
     * @returns What `run` returned.
     */
    private afterLoads<T>(run: () => Promise<T>, skipped?: () => T): Promise<T> {
        return this.inLine(
            undefined,
            run,
            false,
            skipped ??
                ((): T => {
                    throw supersededError();
                }),
        );
    }

    /**
     * Run a network-source verb in the session's load line: its place taken now, its dispatch
     * made once every load asked for before it has dispatched.
     * @param signal - Aborting it while the verb waits for its turn gives up its place.
     * @param run - The verb, given a host whose dispatch waits for the turn.
     * @param hold - Keep the place until the verb settles, for a verb that dispatches more than
     *   once; otherwise it is given up at the first dispatch.
     * @param skipped - Given for an edit: it takes an edit's place in line, reads the graph only
     *   once the loads ahead of it have landed, and a clear asked for while it waits cancels it,
     *   so it resolves with this instead of rejecting.
     * @returns What the verb returned.
     */
    private async inLine<T>(
        signal: AbortSignal | undefined,
        run: (host: SourceHost) => Promise<T>,
        hold = false,
        skipped?: () => T,
    ): Promise<T> {
        const turn = this.loadLine.join(signal, skipped === undefined ? "load" : "edit");
        try {
            if (skipped !== undefined) {
                // An edit works out what to change from the graph: it reads it once the loads
                // ahead of it have landed. With none ahead it goes on at once, so a transaction
                // still routes its dispatch.
                const ahead = turn.wait();
                if (ahead !== undefined) {
                    await ahead;
                }
            }
            return await run(this.hostInTurn(turn, hold));
        } catch (error) {
            if (skipped !== undefined && turn.superseded) {
                return skipped();
            }
            throw error;
        } finally {
            turn.leave();
        }
    }

    /**
     * What the network-source code works through.
     * @returns the ledger, the dispatcher and the events
     */
    private sourceHost(): SourceHost {
        const { writes } = this;
        return {
            ledger: this.ledger,
            pending: this.pendingLoads,
            owner: this,
            expansions: this.expansions,
            loads: () => this.loads(),
            sourceKeyOf: (load) => this.sources().find((each) => each.loadKey === load)?.key,
            labelPath: () => this.readConfig().knownFields.nodeLabelPath,
            credentialSlotOf: (load) => {
                const key = this.sources().find((each) => each.loadKey === load)?.key;
                return key === undefined ? undefined : this.loadFacts.get(key)?.credentialSlot;
            },
            node: (id) => this.node(id),
            nodeIds: () => [...this.current().ids],
            edges: () => {
                const snapshot = this.current();
                const space = edgeSpaceOf(snapshot);
                const out: HostEdge[] = [];
                for (let row = 0; row < snapshot.edgeCount; row++) {
                    out.push({
                        id: space.idOf(row),
                        source: snapshot.ids.idOf(snapshot.edgeSource(row)),
                        target: snapshot.ids.idOf(snapshot.edgeTarget(row)),
                        record: this.records?.edgeAttributes(row) ?? {},
                    });
                }

                return out;
            },
            neighborIds: (id) => {
                const snapshot = this.current();
                const index = rowOfEitherSpelling(snapshot.ids, id);
                const out = new Set<NodeId>();
                if (index !== INVALID_INDEX) {
                    eachAdjacentArc(snapshot, index, "all", (other) => out.add(snapshot.ids.idOf(other)));
                }

                return out;
            },
            placement: (id) => {
                const snapshot = this.current();
                const index = rowOfEitherSpelling(snapshot.ids, id);
                const { positions } = this.graphStore;
                if (index === INVALID_INDEX) {
                    return { at: null, pinned: false };
                }

                const at = { x: Number.NaN, y: Number.NaN, z: Number.NaN };
                positions.read(index, at);
                return { at: positions.isPlaced(index) ? at : null, pinned: positions.isPinned(index) };
            },
            positionScale: () => this.readConfig().knownFields.positionScale,
            directed: () => this.current().directed,
            dispatch: (command) =>
                writes.send === undefined
                    ? Promise.reject(
                          new GraphtyError({
                              code: "E_INTERNAL",
                              source: "data",
                              message: "This session cannot dispatch a source command.",
                          }),
                      )
                    : writes.send(command),
            emit: (event, detail) => writes.emit?.(event, detail),
        };
    }

    /**
     * Read a source once and hold its rows, loading nothing until `draft.load()`.
     * @param source - What `import` takes.
     * @param options - How to read it.
     * @param options.signal - Abandons the read.
     * @param options.onto - `"graph"` holds the rows as a table to join onto the graph.
     * @param options.guess - `"values"` also reads the values when no header names the roles.
     * @returns The draft.
     * @throws What `import` would reject with while reading, with the same code.
     */
    async prepare(
        source: DataSourceInput,
        options: { readonly signal?: AbortSignal; readonly onto?: "graph"; readonly guess?: "names" | "values" } = {},
    ): Promise<Draft> {
        this.requireLive("prepare");
        this.draft?.dispose();
        const read = await readWithProgress(source, options.signal, (change) => this.writes.progress?.(change));
        const styles = await draftStyles(read, options.signal);
        const draft = new Draft(
            read,
            {
                config: () => this.readConfig(),
                graph: () => {
                    const slice = this.writes.slice();
                    const snapshot = this.current();
                    const pairs = new Set<string>();
                    for (let edge = 0; edge < snapshot.edgeCount; edge++) {
                        const source = snapshot.ids.idOf(snapshot.edgeSource(edge));
                        const target = snapshot.ids.idOf(snapshot.edgeTarget(edge));
                        pairs.add(pairKeyOf(source, target));
                        if (!snapshot.directed) {
                            pairs.add(pairKeyOf(target, source)); // NOSONAR(S2234): the reverse pair, so an undirected edge matches either way
                        }
                    }
                    return { nodes: new Set(slice.nodes.keys()), edges: slice.edges.size, pairs };
                },
                inLine: async (run) => {
                    const send = this.noting(this.keeping(this.writes.importer(), source), () =>
                        bytesFacts(source.config),
                    );
                    const turn = this.loadLine.join();
                    try {
                        await run((command) => turn.take(() => send(command)));
                    } finally {
                        turn.leave();
                    }
                },
                measure: (command, config) => this.writes.measure(command, config),
                released: (released) => {
                    if (this.draft === released) {
                        this.draft = null;
                    }
                },
                ...(options.onto === "graph"
                    ? {
                          joinGraph: () => this.joinGraph(),
                          joiner: () => {
                              const send = this.sender("join a table");
                              return (table, choices, shape) => this.applyJoin(send, table, choices, shape);
                          },
                      }
                    : {}),
            },
            styles,
            options.guess,
        );
        this.draft = draft;
        return draft;
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
     * @param id - the node id; an integer id may be written either way, `34` or `"34"`
     * @returns the record, carrying the id as the graph holds it, or undefined when the graph has
     *     no such node
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    node(id: NodeId): NodeRecord | undefined {
        const snapshot = this.current();
        const index = rowOfEitherSpelling(snapshot.ids, id);
        if (index === INVALID_INDEX) {
            return undefined;
        }

        return this.nodeAt(index, snapshot.ids.idOf(index));
    }

    /**
     * What a node is called: the name {@link SessionData.neighbors} gives it.
     * @param id - the node id; an integer id may be written either way, `34` or `"34"`
     * @returns the name, or undefined when the graph has no such node
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    name(id: NodeId): string | undefined {
        const { ids } = this.current();
        const index = rowOfEitherSpelling(ids, id);
        return index === INVALID_INDEX ? undefined : this.nameOf(index, ids.idOf(index));
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
     * @param id - the edge id; the number it spells finds it too, `17` for `"17"`
     * @returns the record, carrying the id as the graph holds it, or undefined when the graph has
     *     no such edge
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

        return this.edgeAt(snapshot, index, edgeIdOf(counter));
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
     * The runs a page of one kind can show as a column.
     * @param kind - nodes or edges
     * @returns one entry per run, in the session's order
     * @throws A `GraphtyError` with `E_DISPOSED` once disposed.
     */
    resultColumns(kind: "node" | "edge"): readonly ResultColumnDescriptor[] {
        this.current();
        const columns: ResultColumnDescriptor[] = [];
        for (const id of this.pages.runIds()) {
            const run = this.pages.run(id);
            const column = run === undefined ? undefined : primaryResultColumn(run, kind);
            if (column !== undefined) {
                columns.push(column);
            }
        }

        return Object.freeze(columns);
    }

    /**
     * Each distinct neighbor of a node once, with the combined weight of the edges between them.
     * @param id - the node
     * @param options - the direction, the weight, the scope, the order and the window
     * @returns the page
     * @throws A `GraphtyError` with `E_UNKNOWN_ELEMENT` for an id the graph does not hold,
     *     `E_UNKNOWN_ATTRIBUTE` for a weight column no edge carries, `E_OPTION_RANGE` for a bad
     *     window, `E_DISPOSED` once disposed.
     */
    neighbors(id: NodeId, options: NeighborOptions = {}): NeighborPage {
        const snapshot = this.current();
        const { offset, limit } = pageWindow(options, "neighbors");
        // Before the revision: the first read of the visible scope brings its masks up to date,
        // which moves the tick.
        const visible = this.pages.resolve("visible").nodes;
        const revision = this.pages.revision();
        const node = rowOfEitherSpelling(snapshot.ids, id);
        if (node === INVALID_INDEX) {
            throw new GraphtyError({
                code: "E_UNKNOWN_ELEMENT",
                source: "data",
                message: `The graph holds no node ${JSON.stringify(id)}.`,
                details: { kind: "node", id },
            });
        }

        // JSON keeps 1 and "1" apart, which the ids need.
        const key = JSON.stringify([id, options.direction, options.weight, options.scope, options.sort]);
        const list = this.neighborLists.get(key, () => this.computeNeighbors(snapshot, node, options));
        const records = list.rows.slice(offset, offset + limit).map((row) => {
            const neighborId = snapshot.ids.idOf(row.other);
            return Object.freeze({
                node: this.nodeAt(row.other, neighborId),
                name: row.name ?? this.nameOf(row.other, neighborId),
                weight: row.weight,
                edgeCount: row.edgeCount,
                ...(visible.has(neighborId) ? {} : { excludedBy: FILTERED }),
            });
        });

        return Object.freeze({
            records: Object.freeze(records),
            offset,
            total: list.rows.length,
            revision: String(revision),
            measuredBy: list.measuredBy,
            missing: list.missing,
        });
    }

    /**
     * Walk one node's adjacency once, combine each neighbor's edges, then order the neighbors.
     * @param snapshot - the current snapshot
     * @param node - the node's row
     * @param options - what the caller asked for
     * @returns the ordered rows, the weight they were combined by and the missing count
     */
    private computeNeighbors(snapshot: GraphSnapshot, node: number, options: NeighborOptions): NeighborList {
        const { measuredBy, read } = this.neighborWeight(snapshot, options.weight);
        const scope =
            options.scope === undefined || options.scope === "graph" ? null : this.pages.resolve(options.scope);
        const distance = measuredBy?.meaning === "distance";
        // Keyed by the neighbor's row, never by its id: ids 1 and "1" stay apart.
        const byRow = new Map<number, NeighborListRow>();
        let missing = 0;
        eachAdjacentArc(snapshot, node, options.direction ?? "all", (other, edge) => {
            if (other === node || (scope !== null && !scope.nodes.has(snapshot.ids.idOf(other)))) {
                return;
            }

            let value = 1;
            if (read !== null) {
                const got = read(edge);
                if (got === undefined) {
                    missing++;
                } else {
                    value = got;
                }
            }

            const row = byRow.get(other);
            if (row === undefined) {
                byRow.set(other, { other, weight: read === null ? 1 : value, edgeCount: 1 });
                return;
            }

            row.edgeCount++;
            if (read === null) {
                row.weight = row.edgeCount;
            } else {
                row.weight = distance ? Math.min(row.weight, value) : row.weight + value;
            }
        });

        // Graph order first, so a stable sort keeps it among equals.
        const rows = [...byRow.values()].sort((a, b) => a.other - b.other);
        const sort = options.sort ?? (measuredBy === null ? { by: "name" } : { by: "weight", descending: !distance });
        const direction = sort.descending === true ? -1 : 1;
        if (sort.by === "name") {
            for (const row of rows) {
                row.name = this.nameOf(row.other, snapshot.ids.idOf(row.other));
            }

            // ponytail: a collator sort per (node, options) per revision; share item 3's per-revision
            // name rank if a host clicks through many 40,000-degree hubs.
            rows.sort((a, b) => direction * NATURAL.compare(a.name ?? "", b.name ?? ""));
        } else if (sort.by === "degree") {
            const degree = new Map<number, number>();
            for (const row of rows) {
                let count = 0;
                eachAdjacentArc(snapshot, row.other, "all", () => {
                    count++;
                });
                degree.set(row.other, count);
            }

            rows.sort((a, b) => direction * ((degree.get(a.other) ?? 0) - (degree.get(b.other) ?? 0)));
        } else {
            rows.sort((a, b) => direction * (a.weight - b.weight));
        }

        return { rows, measuredBy, missing };
    }

    /**
     * Which weight a neighbor page combines its edges by, and how one edge's weight is read.
     * @param snapshot - the current snapshot
     * @param asked - the `weight` option
     * @returns the weight, or null to count edges; and the reader, which answers undefined for an
     *     edge with no number there
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` for a column no edge carries.
     */
    private neighborWeight(
        snapshot: GraphSnapshot,
        asked: WeightMeaning | null | undefined,
    ): { measuredBy: WeightMeaning | null; read: ((edge: number) => number | undefined) | null } {
        if (asked === null) {
            return { measuredBy: null, read: null };
        }

        const fromRecords = (attribute: string) => (edge: number) => {
            const value = this.records?.edgeAttributes(edge)?.[attribute];
            return typeof value === "number" && Number.isFinite(value) ? value : undefined;
        };
        if (asked !== undefined) {
            resolveColumn(this.attributes(), { kind: "edge", name: asked.attribute });
            return { measuredBy: asked, read: fromRecords(asked.attribute) };
        }

        // The weight the graph was loaded with.
        const attribute = this.lastImport()?.weights.attribute ?? null;
        const { weights } = snapshot;
        if (attribute === null || weights === null) {
            return { measuredBy: null, read: null };
        }

        const meaning = this.readConfig().knownFields.edgeWeightMeaning === "distance" ? "distance" : "strength";
        const measuredBy: WeightMeaning = { attribute, meaning };
        const carried = this.attributes().some((column) => column.kind === "edge" && column.name === attribute);
        // A session with no view holds no record attributes, only the store's weights, where a
        // missing number already weighs 1.
        return {
            measuredBy,
            read: carried ? fromRecords(attribute) : (edge) => weights[snapshot.edgeToArc[edge]],
        };
    }

    /**
     * A node's name: the value at `data.knownFields.nodeLabelPath`, as text, else its id. An empty
     * label names nothing, so it falls back to the id too.
     * @param index - the node's row
     * @param id - the node's id
     * @returns the name
     */
    private nameOf(index: number, id: NodeId): string {
        const key = this.readConfig().knownFields.nodeLabelPath;
        const value = key === null ? undefined : this.records?.nodeAttributes(index, id)?.[key];
        switch (typeof value) {
            case "string":
                return value === "" ? String(id) : value;
            case "number":
            case "bigint":
            case "boolean":
                return String(value);
            default:
                return String(id);
        }
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
        const found = this.pages.search(text, {
            offset,
            limit,
            kinds: new Set(kinds),
            scope,
            edgeNameJoiner: options.edgeNameJoiner,
            scopeInput: options.scope,
            ...(options.booleanWords === undefined ? {} : { booleanWords: options.booleanWords }),
        });
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

        // Finding the issues reads every record once per revision, so only a page that asks does.
        const asks = options.issue !== undefined || options.markIssues === true;
        const marks = records.length === 0 || !asks ? undefined : this.openIssuesByRecord(target);
        const marked = marks !== undefined && records.some((record) => marks.has(record.id));
        const page = {
            records: Object.freeze(records),
            offset,
            total,
            revision: String(revision),
            ...(marked ? { issues: Object.freeze(records.map((record) => marks.get(record.id) ?? NO_ISSUES)) } : {}),
        };
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
        const matching = matchingOf(options.matching);
        const { issue } = options;
        if (
            scope === undefined &&
            touching === undefined &&
            sort === undefined &&
            matching === undefined &&
            issue === undefined
        ) {
            return null;
        }

        // Ignoring an issue moves no revision, so the key names what the issue filter read.
        const issueKey = issue === undefined ? undefined : [issue, this.issueState().ignored];

        const result = sort !== undefined && "run" in sort ? resolveResult(sort, target, this.pages, verb) : undefined;
        // JSON keeps 1 and "1" apart, which the ids need. A result sort is keyed by what it
        // resolved to, never by the run handle it was given.
        const sortKey =
            result === undefined ? sort : { run: result.run, field: result.field, descending: sort?.descending };
        const key = JSON.stringify([target, scope, sortKey, touching, matching, issueKey]);
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
            const text = matching === undefined ? null : this.pages.textTest(matching.text, matching.mode, target);
            const flagged = issue === undefined ? null : this.issueRows(snapshot, target, issue);
            const matches =
                flagged === null ? text : (index: number): boolean => flagged(index) && (text === null || text(index));
            return this.computeOrder(snapshot, target, scope, touching, order, matches);
        });
    }

    /**
     * Filter the rows by scope and node, then sort them, keeping graph order among equals.
     * @param snapshot - the current snapshot
     * @param target - nodes or edges
     * @param scope - the scope, or undefined for the whole graph
     * @param touching - for edges, the node one end must be
     * @param sort - the direction and what a row sorts by, or undefined for graph order
     * @param matches - keeps only the rows matching a page's text, or null for every row
     * @returns the rows
     */
    private computeOrder(
        snapshot: GraphSnapshot,
        target: "node" | "edge",
        scope: ScopeInput | undefined,
        touching: NodeId | undefined,
        sort: { readonly descending: boolean; value(index: number): unknown } | undefined,
        matches: ((index: number) => boolean) | null,
    ): Uint32Array {
        const space = edgeSpaceOf(snapshot);
        const members = scope === undefined ? null : this.pages.resolve(scope);
        const count = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const end = touching === undefined ? INVALID_INDEX : rowOfEitherSpelling(snapshot.ids, touching);
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

            if (matches !== null && !matches(index)) {
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
     * Give the loaded source a new name, as one undoable step.
     * @param name - the new name
     * @param key - the load to rename; the newest when absent
     * @returns settles once the step is recorded
     * @throws A `GraphtyError` with `E_BAD_COMMAND` when no source is loaded or the name is empty.
     */
    async renameSource(name: string, key?: SourceKey): Promise<void> {
        this.requireLive("renameSource");
        const current = this.source();
        if (current === null) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "No data source is loaded, so there is none to rename.",
                source: "data",
                details: { reason: "no-source", name },
            });
        }

        if (typeof name !== "string" || name.trim() === "") {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "A data source's new name is a string with something in it.",
                source: "data",
                details: { reason: "empty-name", name },
            });
        }

        // The last load is the one `source()` describes, so it takes the new name too. Read as
        // stored, not recounted: a rename costs the same however big the graph is.
        const sources = (this.writes.slice().values.get(SOURCES_VALUE) as readonly LoadedSource[] | undefined) ?? [];
        // An entry saved before loads had keys has its place in the list as its key, as `sources()` reads it.
        const at =
            key === undefined
                ? sources.length - 1
                : sources.findIndex((each, index) => (each.key ?? `s${String(index + 1)}`) === key);
        if (key !== undefined && at < 0) {
            throw new GraphtyError({
                code: "E_SOURCE_UNKNOWN",
                message: `No load still in the graph has key ${JSON.stringify(key)}.`,
                source: "data",
                details: { key, known: this.sources().map((each) => each.key) },
            });
        }

        const newest = at === sources.length - 1;
        await this.writes.setSource(
            newest ? { ...current, name } : current,
            sources.length === 0 ? undefined : sources.map((each, index) => (index === at ? { ...each, name } : each)),
        );
    }

    /**
     * Every load still in the graph, oldest first, as the `graph` slice keeps them.
     * @returns the loads, or an empty list when no import loaded the graph
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    sources(): readonly LoadedSource[] {
        this.requireLive("sources");
        const stored = (this.writes.slice().values.get(SOURCES_VALUE) as readonly LoadedSource[] | undefined) ?? [];
        const provenance = this.provenance();
        const snapshot = this.current();
        const memo = this.sourcesMemo;
        const ledger = this.ledger.version();
        if (
            memo?.stored === stored &&
            memo.provenance === provenance &&
            memo.snapshot === snapshot &&
            memo.ledger === ledger
        ) {
            return memo.result;
        }

        const records = new Map(this.ledger.loads().map((record) => [record.key, record]));
        const catalog = new Map(sourceDescriptors().map((entry) => [entry.id, entry.features]));

        const space = edgeSpaceOf(snapshot);
        // An entry saved before loads had keys gets one by its place in the list.
        const result = Object.freeze(
            stored.map((each, at) => {
                const key = (each as Partial<LoadedSource>).key ?? `s${String(at + 1)}`;
                const supplied = provenance?.[key];
                const kind = (each as Partial<LoadedSource>).kind ?? "file";
                // An opened project's network load keeps its entry's key; one loaded here is found by its rows.
                const found = records.has(key) ? key : this.networkLoadOf(supplied?.nodes ?? []);
                const loadKey = kind === "server" && found !== undefined && records.has(found) ? found : undefined;
                const { input, ...entry } = each as LoadedSource & { readonly input?: string };
                return Object.freeze({
                    ...entry,
                    key,
                    kind,
                    ...(input !== undefined && this.kept.has(input) ? { reloadable: true as const } : {}),
                    ...(loadKey === undefined ? {} : { loadKey }),
                    ...loadFacts(records.get(loadKey ?? ""), catalog),
                    counts: Object.freeze(
                        supplied === undefined
                            ? { ...each.added }
                            : {
                                  nodes: supplied.nodes.filter((id) => snapshot.ids.has(id)).length,
                                  edges: supplied.edges.filter((id) => space.indexOf(id) !== INVALID_INDEX).length,
                              },
                    ),
                });
            }),
        );
        this.sourcesMemo = { stored, provenance, snapshot, ledger, result };
        return result;
    }

    /**
     * The loads that supplied one node or edge.
     * @param id - the node id, or the edge id with `kind: "edge"`
     * @param options - which kind of element the id names
     * @param options.kind - `"node"` (the default) or `"edge"`
     * @returns the keys, oldest load first
     */
    sourcesOf(id: NodeId | EdgeId, options: { readonly kind?: "node" | "edge" } = {}): readonly SourceKey[] {
        this.requireLive("sourcesOf");
        const snapshot = this.current();
        const index = provenanceIndex(this.provenance());
        if (options.kind === "edge") {
            return edgeSpaceOf(snapshot).indexOf(String(id)) === INVALID_INDEX
                ? []
                : (index.edges.get(String(id)) ?? []);
        }

        return snapshot.ids.has(id) ? (index.nodes.get(id) ?? []) : [];
    }

    /**
     * The issue state now: what each load saw, the ignored issues and the kept pairs.
     * @returns the state
     */
    private issueState(): IssueState {
        return (this.writes.slice().values.get(ISSUES_VALUE) as IssueState | undefined) ?? NO_ISSUE_STATE;
    }

    /**
     * The open issues each record of one kind is affected by, read once per issues and state.
     * @param target - nodes or edges
     * @returns the issue ids by record id; a record with none is absent
     */
    private openIssuesByRecord(target: "node" | "edge"): ReadonlyMap<NodeId | EdgeId, readonly IssueId[]> {
        const found = this.foundIssues();
        const state = this.issueState();
        const memo = this.openIssuesMemo;
        if (memo?.found === found && memo.state === state) {
            return memo.byRecord[target];
        }

        const ignored = new Set(state.ignored);
        const byRecord = { node: new Map<NodeId | EdgeId, IssueId[]>(), edge: new Map<NodeId | EdgeId, IssueId[]>() };
        for (const { issue, affected } of found) {
            if (affected === undefined || ignored.has(issue.id)) {
                continue;
            }

            const map = byRecord[affected.kind];
            for (const id of affected.ids) {
                const list = map.get(id);
                if (list === undefined) {
                    map.set(id, [issue.id]);
                } else if (!list.includes(issue.id)) {
                    list.push(issue.id);
                }
            }
        }

        for (const map of Object.values(byRecord)) {
            for (const list of map.values()) {
                Object.freeze(list);
            }
        }

        this.openIssuesMemo = { found, state, byRecord };
        return byRecord[target];
    }

    /**
     * Whether each row of one kind is affected by an open issue: one, or any.
     * @param snapshot - the current snapshot
     * @param target - nodes or edges
     * @param issue - the issue's id, or `"any"`
     * @returns a test by row
     */
    private issueRows(snapshot: GraphSnapshot, target: "node" | "edge", issue: IssueId): (index: number) => boolean {
        const byRecord = this.openIssuesByRecord(target);
        const space = edgeSpaceOf(snapshot);
        const idOf = (index: number): NodeId | EdgeId =>
            target === "node" ? snapshot.ids.idOf(index) : space.idOf(index);
        return issue === "any"
            ? (index) => byRecord.has(idOf(index))
            : (index) => byRecord.get(idOf(index))?.includes(issue) === true;
    }

    /**
     * Every issue found in the data now, with the plans that fix it, read once per graph and state.
     * @returns the issues, ignored ones included
     */
    private foundIssues(): readonly FoundIssue[] {
        const state = this.issueState();
        const snapshot = this.current();
        const columns = this.attributes();
        const known = this.readConfig().knownFields;
        const gazetteer = gazetteerGeneration();
        const memo = this.issuesMemo;
        if (
            memo?.state === state &&
            memo.snapshot === snapshot &&
            memo.columns === columns &&
            memo.known === known &&
            memo.gazetteer === gazetteer
        ) {
            return memo.found;
        }

        const nodes = this.nodes();
        const found = findIssues({
            columns,
            nodes,
            edges: this.edges(),
            directed: snapshot.directed,
            state,
            places: placeRows(columns, nodes, known),
        });
        this.issuesMemo = { state, snapshot, columns, known, gazetteer, found };
        return found;
    }

    /**
     * What is wrong with the data now: neutral facts, each with the fixes it takes and the fix the
     * data already shows (`current`).
     * @param options - which issues
     * @param options.includeIgnored - list the ignored issues too (default false)
     * @param options.includeFixed - list the issues `data.fix` settled too, after the rest, as they
     *     stood then (default false); one the data has again is listed open instead
     * @returns the issues, load issues first; never one with a zero count
     */
    issues(options: { readonly includeIgnored?: boolean; readonly includeFixed?: boolean } = {}): readonly DataIssue[] {
        this.requireLive("issues");
        const found = this.foundIssues();
        const state = this.issueState();
        const ignored = new Set(state.ignored);
        const listed: DataIssue[] = found
            .map(({ issue }): DataIssue => {
                const isIgnored = ignored.has(issue.id);
                return Object.freeze({ ...issue, ignored: isIgnored, status: isIgnored ? "ignored" : "open" });
            })
            .filter((issue) => options.includeIgnored === true || !issue.ignored);
        if (options.includeFixed === true) {
            const open = new Set(found.map(({ issue }) => issue.id));
            for (const record of state.fixed ?? []) {
                if (!open.has(record.id)) {
                    listed.push(Object.freeze({ ...record, fixes: [], ignored: false, status: "fixed" }));
                }
            }
        }

        return Object.freeze(listed);
    }

    /**
     * One issue by id, or a refusal naming the ones there are.
     * @param issue - the issue or its id
     * @returns the issue as found
     */
    private issueNamed(issue: IssueId | Pick<DataIssue, "id">): FoundIssue {
        const id = typeof issue === "string" ? issue : issue.id;
        const found = this.foundIssues();
        const match = found.find((each) => each.issue.id === id);
        if (match === undefined) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `The data has no issue ${JSON.stringify(id)}.`,
                source: "data",
                details: { reason: "unknown-issue", issue: id, known: found.map((each) => each.issue.id) },
            });
        }

        return match;
    }

    /**
     * Apply one of an issue's fixes, as one undoable step.
     * @param issue - the issue or its id
     * @param fix - one of the issue's `fixes`
     * @returns how many nodes and edges it changed, kept or removed
     */
    async fix(issue: IssueId | Pick<DataIssue, "id">, fix: FixCode): Promise<FixResult> {
        this.requireLive("fix");
        return this.afterLoads(() => this.fixNow(issue, fix));
    }

    /**
     * fix, once the loads asked for before it have landed.
     * @param issue - as fix takes it
     * @param fix - as fix takes it
     * @returns what fix returns
     */
    private async fixNow(issue: IssueId | Pick<DataIssue, "id">, fix: FixCode): Promise<FixResult> {
        this.requireLive("fix");
        const { issue: found, plan } = this.issueNamed(issue);
        if (!found.fixes.includes(fix) && found.current !== fix) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `The issue ${JSON.stringify(found.id)} takes ${found.fixes.length === 0 ? "no fix" : found.fixes.join(", ")}.`,
                source: "data",
                details: { reason: "unknown-fix", issue: found.id, fix, fixes: [...found.fixes] },
            });
        }

        const { steps, state: planned, result } = plan(fix);
        // The fixed issue stays listable (`includeFixed`) as it stood, replacing an earlier record.
        const { fixes: _fixes, current: _current, ...facts } = found;
        const state: IssueState = {
            ...planned,
            fixed: [...(planned.fixed ?? []).filter((each) => each.id !== found.id), { ...facts, fixedBy: fix }],
        };
        await this.send(
            {
                op: "batch",
                label: `Fixed ${found.code}`,
                fact: {
                    code: "data.fix-issue",
                    params: { issue: found.id, code: found.code, fix, count: found.count },
                },
                steps: [...steps, { op: "data.issues" as const, state }],
            },
            "fix an issue",
        );
        return Object.freeze(result);
    }

    /**
     * Ignore an issue, or stop ignoring it, as one undoable step saved with the project.
     * @param issue - the issue or its id
     * @param ignored - true (the default) to ignore, false to list it again
     * @returns settles once the step is recorded; nothing is recorded when nothing changes
     */
    async ignoreIssue(issue: IssueId | Pick<DataIssue, "id">, ignored = true): Promise<void> {
        this.requireLive("ignoreIssue");
        const id = typeof issue === "string" ? issue : issue.id;
        const state = this.issueState();
        if (state.ignored.includes(id) === ignored) {
            return;
        }

        if (ignored) {
            // Only an issue the data has now can be ignored; any ignored id can be listed again.
            this.issueNamed(id);
        }

        await this.send(
            {
                op: "batch",
                label: ignored ? `Ignored ${id}` : `Stopped ignoring ${id}`,
                fact: { code: "data.ignore-issue", params: { issue: id, ignored } },
                steps: [
                    {
                        op: "data.issues",
                        state: {
                            ...state,
                            ignored: ignored ? [...state.ignored, id] : state.ignored.filter((each) => each !== id),
                        },
                    },
                ],
            },
            "ignore an issue",
        );
    }

    /**
     * Ignore several issues, or list them again with `false`, as one undoable step.
     * @param issues - the issues or their ids
     * @param ignored - true (the default) to ignore, false to list them again
     * @returns settles once the step is recorded; nothing is recorded when nothing changes
     */
    async ignoreIssues(issues: readonly (IssueId | Pick<DataIssue, "id">)[], ignored = true): Promise<void> {
        this.requireLive("ignoreIssues");
        const state = this.issueState();
        const ids = [...new Set(issues.map((issue) => (typeof issue === "string" ? issue : issue.id)))].filter(
            (id) => state.ignored.includes(id) !== ignored,
        );
        if (ids.length === 0) {
            return;
        }

        if (ignored) {
            // Only an issue the data has now can be ignored; any ignored id can be listed again.
            ids.forEach((id) => this.issueNamed(id));
        }

        const changed = new Set(ids);
        await this.send(
            {
                op: "batch",
                label: ignored ? `Ignored ${ids.join(", ")}` : `Stopped ignoring ${ids.join(", ")}`,
                fact: { code: "data.ignore-issues", params: { issues: ids, ignored } },
                steps: [
                    {
                        op: "data.issues",
                        state: {
                            ...state,
                            ignored: ignored
                                ? [...state.ignored, ...ids]
                                : state.ignored.filter((each) => !changed.has(each)),
                        },
                    },
                ],
            },
            "ignore issues",
        );
    }

    /**
     * Take one load out of the graph, keeping what another load also supplied. One undoable step.
     * @param key - the load's key
     * @returns how many nodes and edges went and stayed
     * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for a key `sources()` does not list.
     */
    async removeSource(key: SourceKey): Promise<RemoveSourceResult> {
        this.requireLive("removeSource");
        return this.afterLoads(() => this.removeSourceNow(key));
    }

    /**
     * removeSource, once the loads asked for before it have landed.
     * @param key - as removeSource takes it
     * @returns what removeSource returns
     */
    private async removeSourceNow(key: SourceKey): Promise<RemoveSourceResult> {
        this.requireLive("removeSource");
        const sources = this.sources();
        const entry = sources.find((each) => each.key === key);
        if (entry === undefined) {
            throw new GraphtyError({
                code: "E_LOAD_UNKNOWN",
                message: `No load still in the graph has key ${JSON.stringify(key)}.`,
                source: "data",
                details: { key, known: sources.map((each) => each.key) },
            });
        }

        const provenance = this.provenance();
        const index = provenanceIndex(provenance);
        const snapshot = this.current();
        const space = edgeSpaceOf(snapshot);
        const shared = (keys: readonly SourceKey[] | undefined): boolean => keys?.some((k) => k !== key) === true;
        const nodes = (provenance?.[key]?.nodes ?? []).filter((id) => snapshot.ids.has(id));
        const edges = (provenance?.[key]?.edges ?? []).filter((id) => space.indexOf(id) !== INVALID_INDEX);
        const goingNodes = nodes.filter((id) => !shared(index.nodes.get(id)));
        const goingEdges = edges.filter((id) => !shared(index.edges.get(id)));
        const left = sources.filter((each) => each.key !== key);
        const last = left.at(-1);
        if (this.writes.send === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This session cannot dispatch commands, so it cannot remove a load.",
                source: "data",
            });
        }

        const before = { nodes: snapshot.nodeCount, edges: snapshot.edgeCount };
        await this.writes.send({
            op: "batch",
            label: `Removed ${entry.name ?? key}`,
            fact: { code: "data.remove-source", params: { key, name: entry.name ?? null } },
            steps: [
                { op: "data.apply", mutation: { kind: "remove-edges", ids: goingEdges } },
                { op: "data.apply", mutation: { kind: "remove-nodes", ids: goingNodes } },
                {
                    op: "data.setSource",
                    source: last === undefined ? (this.source() ?? {}) : describeLoaded(last),
                    sources: left,
                    provenance: withoutSource(provenance, key),
                },
            ],
        });
        const after = this.current();
        const removed = { nodes: before.nodes - after.nodeCount, edges: before.edges - after.edgeCount };
        return Object.freeze({
            removed: Object.freeze(removed),
            kept: Object.freeze({
                nodes: nodes.length - goingNodes.length,
                edges: edges.filter((id) => edgeSpaceOf(after).indexOf(id) !== INVALID_INDEX).length,
            }),
        });
    }

    /**
     * Replace one load with a newer copy of it, as one undoable step, keeping styles, runs,
     * filters, joins and the mapping.
     * @param key - the load's key
     * @param source - the newer copy
     * @param choices - how to read it; `mode` is ignored
     * @returns what was added, removed and changed, and what no longer matches anything
     * @throws A `GraphtyError` with `E_SOURCE_UNKNOWN` for a key `sources()` does not list.
     */
    async replaceSource(key: SourceKey, source: DataSourceInput, choices: LoadChoices = {}): Promise<ReplaceReport> {
        this.requireLive("replaceSource");
        return this.afterLoads(() => this.replaceSourceNow(key, source, choices));
    }

    /**
     * replaceSource, once the loads asked for before it have landed.
     * @param key - as replaceSource takes it
     * @param source - as replaceSource takes it
     * @param choices - as replaceSource takes it
     * @returns what replaceSource returns
     */
    private async replaceSourceNow(
        key: SourceKey,
        source: DataSourceInput,
        choices: LoadChoices = {},
    ): Promise<ReplaceReport> {
        this.requireLive("replaceSource");
        const send = this.sender("replace a load");
        const stored = this.storedSources();
        const at = this.sources().findIndex((each) => each.key === key);
        const entry = stored[at] as LoadedSource | undefined;
        if (entry === undefined) {
            throw new GraphtyError({
                code: "E_SOURCE_UNKNOWN",
                message: `No load still in the graph has key ${JSON.stringify(key)}.`,
                source: "data",
                details: { key, known: this.sources().map((each) => each.key) },
            });
        }

        // The command a draft of the copy would load, held back here: its rows are the copy's rows.
        let captured: DataImportCommand | undefined;
        let config: SessionCommand | undefined;
        const draft = await this.prepare(source);
        await draft.loadVia((command) => {
            const steps = command.op === "batch" ? command.steps : [command];
            config = steps.find((step) => step.op === "config.set");
            captured = steps.find((step): step is DataImportCommand => step.op === "data.import");
            return Promise.resolve();
        }, choices);
        if (captured?.held === undefined) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "The newer copy holds no rows to replace the load with.",
                source: "data",
                details: { reason: "no-rows", key },
            });
        }

        const { held } = captured;
        const merged: HeldRows = { ...held, repeated: "first" };
        // The kinds the draft gave the rows travel with them, so the load's report counts them.
        const kinds = HELD_KINDS.get(held);
        if (kinds !== undefined) {
            HELD_KINDS.set(merged, kinds);
        }

        const snapshot = this.current();
        const space = edgeSpaceOf(snapshot);
        const provenance = this.provenance();
        const index = provenanceIndex(provenance);
        const supplied = provenance?.[key] ?? { nodes: [], edges: [] };
        const others = (keys: readonly SourceKey[] | undefined): boolean => keys?.some((k) => k !== key) === true;
        const nodes = supplied.nodes
            .filter((id) => snapshot.ids.has(id))
            .map((id) => ({ id, data: this.records?.nodeAttributes(snapshot.ids.indexOf(id), id) ?? {} }));
        const edges = supplied.edges.flatMap((id) => {
            const record = this.edge(id);
            const row = space.indexOf(id);
            return record === undefined
                ? []
                : [{ id, source: record.source, target: record.target, data: this.records?.edgeAttributes(row) ?? {} }];
        });
        const known = this.readConfig().knownFields;
        const plan = planReplace({
            nodes,
            edges,
            shared: {
                nodes: new Set(nodes.filter((each) => others(index.nodes.get(each.id))).map((each) => each.id)),
                edges: new Set(edges.filter((each) => others(index.edges.get(each.id))).map((each) => each.id)),
            },
            graphPairs: new Set(this.edges().map((each) => pairKey(each.source, each.target, snapshot.directed))),
            hasNode: (id) => rowOfEitherSpelling(snapshot.ids, id) !== INVALID_INDEX,
            directed: snapshot.directed,
            held,
            paths: {
                nodeId: known.nodeIdPath ?? "id",
                source: known.edgeSrcIdPath ?? "source",
                target: known.edgeDstIdPath ?? "target",
            },
        });
        const unbound = this.unboundBy(key, nodes, edges, held);
        const update = <Id extends NodeId | EdgeId>(
            target: "node" | "edge",
            rows: readonly RowUpdate<Id>[],
        ): SessionCommand[] =>
            rows.length === 0 ? [] : [{ op: "data.apply", mutation: { kind: "update-rows", target, rows: [...rows] } }];
        await send({
            op: "batch",
            label: `Replaced ${entry.name ?? key}`,
            fact: {
                code: "data.replace-source",
                params: {
                    key,
                    name: describeSource(captured.source).name ?? null,
                    added: plan.nodes.added + plan.edges.added,
                    removed: plan.nodes.removed + plan.edges.removed,
                    changed: plan.nodes.changed + plan.edges.changed,
                },
            },
            steps: [
                { op: "data.apply", mutation: { kind: "remove-edges", ids: [...plan.removeEdges] } },
                { op: "data.apply", mutation: { kind: "remove-nodes", ids: [...plan.removeNodes] } },
                ...update("edge", plan.edgeRows),
                ...update("node", plan.nodeRows),
                // The load leaves the list, so the merge below lists it again, last, under the same key
                // with what the copy supplied. ponytail: the merge runs after every other step of
                // the batch, so the load cannot be put back in its old place in the list.
                {
                    op: "data.setSource",
                    source: this.source() ?? describeLoaded(entry),
                    sources: stored.filter((each) => each.key !== key),
                    provenance: withoutSource(provenance, key),
                },
                ...(config === undefined ? [] : [config]),
                {
                    ...captured,
                    // The copy is what the load is read from now.
                    input: this.keep(source),
                    mode: "merge",
                    // A pair the graph holds is that edge again: the merge keeps it and notes it supplied.
                    held: merged,
                    key,
                    origin: entry.kind,
                    ...(entry.joinedOnto === undefined ? {} : { joinedOnto: entry.joinedOnto }),
                    ...(entry.join === undefined
                        ? {}
                        : {
                              join: rejoined(
                                  entry.join,
                                  held,
                                  (id) => rowOfEitherSpelling(snapshot.ids, id) !== INVALID_INDEX,
                                  {
                                      source: known.edgeSrcIdPath ?? "source",
                                      target: known.edgeDstIdPath ?? "target",
                                  },
                              ),
                          }),
                },
            ],
        });
        return frozen({ nodes: plan.nodes, edges: plan.edges, unbound });
    }

    /**
     * What a replacement leaves matching nothing: style layers, the filter and joins that read a
     * column the load's rows carried and the copy's rows do not, and no other load's rows carry.
     * @param key - the load
     * @param nodes - the load's nodes now
     * @param edges - the load's edges now
     * @param held - the copy's rows
     * @returns the facts
     */
    private unboundBy(
        key: SourceKey,
        nodes: readonly { readonly data: Readonly<Record<string, unknown>> }[],
        edges: readonly { readonly data: Readonly<Record<string, unknown>> }[],
        held: HeldRows,
    ): readonly CodedFact<ReplaceUnboundCode>[] {
        const keysOf = (rows: readonly Readonly<Record<string, unknown>>[]): Set<string> =>
            new Set(rows.flatMap((row) => Object.keys(row)));
        const elsewhere = this.columnSources(this.attributes());
        const gone: { kind: "node" | "edge"; name: string }[] = [];
        for (const [kind, before, after] of [
            ["node", keysOf(nodes.map((each) => each.data)), keysOf(held.nodes)],
            ["edge", keysOf(edges.map((each) => each.data)), keysOf(held.edges)],
        ] as const) {
            for (const name of before) {
                const carriers = elsewhere.get(declarationKey({ kind, name })) ?? [];
                if (!after.has(name) && carriers.every((each) => each === key)) {
                    gone.push({ kind, name });
                }
            }
        }

        const facts: CodedFact<ReplaceUnboundCode>[] = [];
        // ponytail: a text search for the column's path; it can name a column of the other kind too.
        const reads = (value: unknown, name: string): boolean =>
            value !== undefined && value !== null && JSON.stringify(value).includes(`data.${name}`);
        const { styles, visibility } = this.writes.readers();
        for (const { kind, name } of gone) {
            for (const { layer } of styles) {
                if (
                    layer.target === kind &&
                    [layer.selector, layer.set, layer.encode].some((part) => reads(part, name))
                ) {
                    facts.push({ code: "style-layer", params: { layer: layer.id, kind, column: name } });
                }
            }

            if (reads(visibility.filter, name) || reads(visibility.steps, name) || reads(visibility.window, name)) {
                facts.push({ code: "filter", params: { kind, column: name } });
            }

            for (const join of this.joins()) {
                if (join.choices.keys.some((each) => each.graph === `data.${name}`)) {
                    facts.push({ code: "join", params: { join: join.source, kind, column: name } });
                }
            }
        }

        return Object.freeze(facts);
    }

    /**
     * The network load a load's nodes came from: the first load key a node it supplied carries.
     * @param nodes - The nodes the load supplied.
     * @returns The key in `loads()`, or undefined when none of them is in the graph.
     */
    private networkLoadOf(nodes: readonly NodeId[]): string | undefined {
        const snapshot = this.current();
        for (const id of nodes) {
            const index = snapshot.ids.indexOf(id);
            if (index !== INVALID_INDEX) {
                // An expansion's key is `<load>/x<n>`: the load is the part before the slash.
                const [first] = sourceLoadsOf(this.records?.nodeAttributes(index, id));
                if (first !== undefined) {
                    return first.split("/")[0];
                }
            }
        }

        return undefined;
    }

    /**
     * Read one load again from what it was read from, with changed choices, as one undoable step.
     * @param key - The load's key.
     * @param choices - What to change, laid over the choices it was read with.
     * @returns What was added, removed and changed.
     */
    async reloadSource(key: SourceKey, choices: LoadChoices): Promise<ReplaceReport> {
        this.requireLive("reloadSource");
        return this.afterLoads(() => this.reloadSourceNow(key, choices));
    }

    /**
     * reloadSource, once the loads asked for before it have landed.
     * @param key - as reloadSource takes it
     * @param choices - as reloadSource takes it
     * @returns what reloadSource returns
     */
    private async reloadSourceNow(key: SourceKey, choices: LoadChoices): Promise<ReplaceReport> {
        this.requireLive("reloadSource");
        const entry = this.sources().find((each) => each.key === key);
        const token = (this.storedSources().find((each) => each.key === key) as { readonly input?: string } | undefined)
            ?.input;
        const input = token === undefined ? undefined : this.kept.get(token);
        if (entry === undefined) {
            throw new GraphtyError({
                code: "E_SOURCE_UNKNOWN",
                message: `No load still in the graph has key ${JSON.stringify(key)}.`,
                source: "data",
                details: { key, known: this.sources().map((each) => each.key) },
            });
        }

        if (input === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: `This session did not read load ${JSON.stringify(key)} itself, so it cannot read it again.`,
                source: "data",
                details: { reason: "not-reloadable", key },
            });
        }

        return this.replaceSourceNow(key, input, overChoices(entry.choices ?? {}, choices));
    }

    /**
     * The loaded source whose rows have the same columns as a file's header, newest first.
     * @param source - the file
     * @returns the load's key, or null when none matches or the file is a graph file
     */
    async matchesSource(source: DataSourceInput): Promise<SourceKey | null> {
        this.requireLive("matchesSource");
        const read = await readWithProgress(source, undefined, () => undefined);
        if (read.tables.every((held) => held.table.fixed)) {
            return null;
        }

        const header = new Set(read.tables.flatMap((held) => held.order));
        const snapshot = this.current();
        const space = edgeSpaceOf(snapshot);
        const provenance = this.provenance();
        for (const entry of [...this.storedSources()].reverse()) {
            // A joined table keeps its own columns: the same header is a newer copy of it.
            if (entry.join !== undefined) {
                const { columns } = entry.join.table;
                if (columns.length === header.size && columns.every((name) => header.has(name))) {
                    return entry.key;
                }

                continue;
            }

            const supplied = provenance?.[entry.key];
            if (supplied === undefined || entry.kind === "join") {
                continue;
            }

            // ponytail: reads every row the load supplied; sample when loads get large.
            const columns = new Set<string>();
            for (const id of supplied.nodes) {
                const row = snapshot.ids.indexOf(id);
                if (row !== INVALID_INDEX && (entry.tableRows ?? []).includes("nodes")) {
                    Object.keys(this.records?.nodeAttributes(row, id) ?? {}).forEach((name) => columns.add(name));
                }
            }

            for (const id of supplied.edges) {
                const row = space.indexOf(id);
                if (row !== INVALID_INDEX) {
                    Object.keys(this.records?.edgeAttributes(row) ?? {}).forEach((name) => columns.add(name));
                }
            }

            // ponytail: the graph keeps the last load's edge ends apart from the records, so the
            // header may name up to two columns more; read the draft's ends if that misleads.
            if (columns.size > 0 && header.size - columns.size <= 2 && [...columns].every((name) => header.has(name))) {
                return entry.key;
            }
        }

        return null;
    }

    /**
     * Every table joined onto the graph and still loaded, oldest first.
     * @returns the joins
     */
    joins(): readonly JoinRecord[] {
        this.requireLive("joins");
        return Object.freeze(this.sources().flatMap((each) => (each.join === undefined ? [] : [each.join])));
    }

    /**
     * Join a joined table again with other choices, as one undoable step.
     * @param source - the joined table's load
     * @param choices - the join
     * @returns settles once the step is recorded
     */
    async editJoin(source: SourceKey, choices: JoinChoices): Promise<void> {
        this.requireLive("editJoin");
        return this.afterLoads(
            () => this.editJoinNow(source, choices),
            () => undefined,
        );
    }

    /**
     * editJoin, once the loads asked for before it have landed.
     * @param source - as editJoin takes it
     * @param choices - as editJoin takes it
     * @returns what editJoin returns
     */
    private async editJoinNow(source: SourceKey, choices: JoinChoices): Promise<void> {
        this.requireLive("editJoin");
        const send = this.sender("edit a join");
        const previous = this.joinedSource(source);
        const { table, shape } = previous.join;
        await this.applyJoin(
            send,
            { ...table, source: describeSource(previous) },
            choices,
            choices.shape ?? shape,
            previous,
        );
    }

    /**
     * What editing a join would do, counted against the graph with the join taken back.
     * @param source - the joined table's load
     * @param choices - the join
     * @returns the counts
     */
    editJoinReport(source: SourceKey, choices: JoinChoices): JoinReport {
        this.requireLive("editJoinReport");
        const previous = this.joinedSource(source);
        const { restored, gone } = this.unjoin(previous);
        const { table, shape } = previous.join;
        return joinReport(table, this.joinGraph(restored, gone), choices, choices.shape ?? shape);
    }

    /**
     * A joined table still in the graph, or a refusal.
     * @param source - its load's key
     * @returns the load, with its join
     */
    private joinedSource(source: SourceKey): LoadedSource & { readonly join: JoinRecord } {
        const previous = this.storedSources().find((each) => each.key === source && each.join !== undefined);
        if (previous?.join === undefined) {
            throw new GraphtyError({
                code: "E_SOURCE_UNKNOWN",
                message: `No joined table still in the graph has key ${JSON.stringify(source)}.`,
                source: "data",
                details: { key: source, known: this.joins().map((each) => each.source) },
            });
        }

        return previous as LoadedSource & { readonly join: JoinRecord };
    }

    /**
     * The session's dispatch, taken now, or a refusal for a session that cannot dispatch.
     * @param verb - the verb asking, for the error
     * @returns the dispatch
     */
    private sender(verb: string): (command: SessionCommand) => Promise<unknown> {
        const send = this.writes.send?.bind(this.writes);
        if (send === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: `This session cannot dispatch commands, so it cannot ${verb}.`,
                source: "data",
            });
        }

        return send;
    }

    /**
     * Every node or edge with its attributes as they arrived, in the graph's order.
     * @param kind - nodes or edges
     * @returns the rows
     */
    private joinRows(kind: "node" | "edge"): { readonly id: NodeId | EdgeId; readonly data: SessionAttributes }[] {
        const snapshot = this.current();
        if (kind === "node") {
            return Array.from({ length: snapshot.nodeCount }, (_unused, index) => {
                const id = snapshot.ids.idOf(index);
                return { id, data: this.records?.nodeAttributes(index, id) ?? {} };
            });
        }

        const space = edgeSpaceOf(snapshot);
        return Array.from({ length: snapshot.edgeCount }, (_unused, index) => ({
            id: space.idOf(index),
            data: this.records?.edgeAttributes(index) ?? {},
        }));
    }

    /**
     * The graph as a join reads it, with some elements' values replaced and some left out.
     * @param restored - values to read in place of an element's own, by `<kind>:<id>`
     * @param gone - elements to leave out, by `<kind>:<id>`
     * @returns the graph
     */
    private joinGraph(
        restored: ReadonlyMap<string, Readonly<Record<string, unknown>>> = new Map(),
        gone: ReadonlySet<string> = new Set(),
    ): JoinGraph {
        const read = (kind: "node" | "edge"): JoinGraph["nodes"] =>
            this.joinRows(kind)
                .filter((row) => !gone.has(`${kind}:${String(row.id)}`))
                .map((row) => ({ id: row.id, data: restored.get(`${kind}:${String(row.id)}`) ?? row.data }));
        const joins = new Map<SourceKey, JoinRecord>();
        for (const each of this.storedSources()) {
            if (each.join !== undefined) {
                joins.set(each.key, each.join);
            }
        }

        return { nodes: read("node"), edges: read("edge"), joins };
    }

    /**
     * What taking a join back takes: its edges and the nodes only it made removed, the values it
     * wrote put back as they were.
     * @param previous - the joined table's load
     * @returns the steps, and the restored values and the elements that go, for planning anew
     */
    private unjoin(previous: LoadedSource): {
        steps: SessionCommand[];
        restored: Map<string, Readonly<Record<string, unknown>>>;
        gone: Set<string>;
    } {
        const { join } = previous;
        const restored = new Map<string, Readonly<Record<string, unknown>>>();
        const gone = new Set<string>();
        if (join?.shape === "edges") {
            const provenance = this.provenance();
            const index = provenanceIndex(provenance);
            const only = (keys: readonly SourceKey[] | undefined): boolean =>
                keys?.every((each) => each === previous.key) !== false;
            const edges = (provenance?.[previous.key]?.edges ?? []).filter((id) => only(index.edges.get(id)));
            const nodes = (provenance?.[previous.key]?.nodes ?? []).filter((id) => only(index.nodes.get(id)));
            edges.forEach((id) => gone.add(`edge:${id}`));
            nodes.forEach((id) => gone.add(`node:${String(id)}`));
            return {
                steps: [
                    { op: "data.apply", mutation: { kind: "remove-edges", ids: edges } },
                    { op: "data.apply", mutation: { kind: "remove-nodes", ids: nodes } },
                ],
                restored,
                gone,
            };
        }

        const kind = join?.shape === "edge-values" ? "edge" : "node";
        const held = new Map(this.joinRows(kind).map((row) => [String(row.id), row]));
        const rows: RowUpdate<NodeId | EdgeId>[] = [];
        for (const [id, values] of Object.entries(join?.before ?? {})) {
            const row = held.get(id);
            if (row === undefined) {
                continue;
            }

            const record = Object.fromEntries(
                Object.entries({ ...row.data, ...values }).filter(([name]) => values[name] !== null),
            );

            rows.push({ id: row.id, values: record });
            restored.set(`${kind}:${id}`, record);
        }

        return {
            steps:
                rows.length === 0
                    ? []
                    : [{ op: "data.apply", mutation: { kind: "update-rows", target: kind, rows, replace: true } }],
            restored,
            gone,
        };
    }

    /**
     * Join a table onto the graph as one undoable step, taking an earlier join of it back first.
     * @param send - the dispatch, taken when the verb was called
     * @param table - the table and its source
     * @param choices - the join
     * @param shape - the shape when the choices give none
     * @param previous - the joined table's load, when the join is being edited
     * @returns settles once the step is recorded
     */
    private async applyJoin(
        send: (command: SessionCommand) => Promise<unknown>,
        table: JoinedTable,
        choices: JoinChoices,
        shape: JoinShape,
        previous?: LoadedSource,
    ): Promise<void> {
        const undo = previous === undefined ? undefined : this.unjoin(previous);
        const graph = this.joinGraph(undo?.restored, undo?.gone);
        const planned = planJoin(table, graph, choices, shape);
        const { plan } = planned;
        if (plan.kind === "rows") {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `Rows read as ${planned.shape} are a load, not a join: load the draft with a mode instead.`,
                source: "data",
                details: { reason: "not-a-join", shape: planned.shape },
            });
        }

        const stored = this.storedSources();
        const same = (join: JoinRecord): boolean =>
            JSON.stringify([join.table.columns, join.table.rows]) === JSON.stringify([table.columns, table.rows]);
        const twin =
            previous === undefined ? stored.find((each) => each.join !== undefined && same(each.join)) : undefined;
        if (twin !== undefined) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `The table ${table.name} is joined already, as ${twin.key}: replace or edit that join instead.`,
                source: "data",
                details: { reason: "joined-already", key: twin.key },
            });
        }

        const provenance = this.provenance();
        const key = previous?.key ?? nextSourceKey(stored, provenance);
        const onto = previous === undefined ? this.ontoOf(plan, graph) : (previous.join?.onto ?? null);
        const record: JoinRecord = frozen({
            source: key,
            onto,
            shape: planned.shape,
            choices: { ...choices, shape: planned.shape },
            rows: table.rows.length,
            matched: planned.matched,
            columns: plan.columns,
            table: { name: table.name, columns: [...table.columns], rows: [...table.rows] },
            ...(plan.kind === "values" ? { before: plan.before } : {}),
        });
        const left = stored.filter((each) => each.key !== key);
        const leftProvenance = withoutSource(provenance, key);
        const described = describeSource(table.source);
        const steps: SessionCommand[] = [...(undo?.steps ?? [])];
        if (plan.kind === "edges") {
            if (previous !== undefined) {
                steps.push({
                    op: "data.setSource",
                    source: this.source() ?? described,
                    sources: left,
                    provenance: leftProvenance,
                });
            }

            steps.push({
                op: "data.import",
                source: described,
                mode: "merge",
                held: {
                    nodes: [],
                    edges: plan.edges,
                    declaredDirection: null,
                    errors: [],
                    errorLimit: 100,
                    source: keyExpression(plan.source),
                    target: keyExpression(plan.target),
                },
                origin: "join",
                ...(onto === null ? {} : { joinedOnto: onto }),
                join: record,
                key,
                tables: [table.name],
                tableRows: ["edges"],
            });
        } else {
            if (plan.rows.length > 0) {
                steps.push({
                    op: "data.apply",
                    mutation: { kind: "update-rows", target: plan.target, rows: plan.rows },
                });
            }

            const nodes = plan.target === "node" ? (plan.matchedIds as NodeId[]) : [];
            const edges = plan.target === "edge" ? plan.matchedIds.map(String) : [];
            const entry: LoadedSource = frozen({
                ...described,
                key,
                kind: "join" as const,
                ...(onto === null ? {} : { joinedOnto: onto }),
                join: record,
                tables: [table.name],
                tableRows: [plan.target === "node" ? ("nodes" as const) : ("edges" as const)],
                added: { nodes: 0, edges: 0 },
                counts: { nodes: nodes.length, edges: edges.length },
            });
            steps.push({
                op: "data.setSource",
                source: this.source() ?? described,
                sources: [...left, entry],
                provenance: withSupplied(leftProvenance, key, { nodes, edges }),
            });
        }

        await send({
            op: "batch",
            label: `${previous === undefined ? "Joined" : "Joined again"} ${table.name}`,
            fact: {
                code: previous === undefined ? "data.join" : "data.edit-join",
                params: { key, name: table.name, shape: planned.shape, matched: planned.matched },
            },
            steps,
        });
    }

    /**
     * The load a join is joined onto: the one that supplied most of what it matched.
     * @param plan - the join's plan
     * @param graph - the graph it was planned against
     * @returns the load's key, or null when no load supplied any of it
     */
    private ontoOf(plan: Exclude<JoinPlan, { kind: "rows" }>, graph: JoinGraph): SourceKey | null {
        const index = provenanceIndex(this.provenance());
        const counts = new Map<SourceKey, number>();
        const count = (keys: readonly SourceKey[] | undefined): void =>
            keys?.forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1));
        if (plan.kind === "edges") {
            const nodes = new Set(graph.nodes.map((node) => String(node.id)));
            for (const edge of plan.edges) {
                for (const end of [edge[plan.source], edge[plan.target]]) {
                    if (nodes.has(String(end))) {
                        count(index.nodes.get(end as NodeId));
                    }
                }
            }
        } else {
            for (const id of plan.matchedIds) {
                count(plan.target === "edge" ? index.edges.get(String(id)) : index.nodes.get(id));
            }
        }

        const best = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
        return best ?? this.storedSources().at(-1)?.key ?? null;
    }

    /**
     * The `provenance` graph value: what each load supplied.
     * @returns the value, or undefined when no load recorded one
     */
    private provenance(): Provenance | undefined {
        return this.writes.slice().values.get(PROVENANCE_VALUE) as Provenance | undefined;
    }

    /**
     * The loads whose rows carry each column, by `<kind>:<name>`.
     * ponytail: walks every row a load supplied once per revision; index columns per load at
     * ingest if many large loads make it slow.
     * @param described - the columns, which key the memo with the revision
     * @returns the keys, oldest load first
     */
    private columnSources(described: readonly AttributeDescriptor[]): ReadonlyMap<string, readonly SourceKey[]> {
        const provenance = this.provenance();
        const memo = this.columnSourcesMemo;
        if (memo?.described === described && memo.provenance === provenance) {
            return memo.result;
        }

        const result = new Map<string, SourceKey[]>();
        const add = (
            kind: "node" | "edge",
            record: Readonly<Record<string, unknown>> | undefined,
            key: SourceKey,
        ): void => {
            for (const name of Object.keys(record ?? {})) {
                const at = declarationKey({ kind, name });
                const list = result.get(at) ?? [];
                if (!list.includes(key)) {
                    list.push(key);
                    result.set(at, list);
                }
            }
        };
        const snapshot = this.current();
        const space = edgeSpaceOf(snapshot);
        for (const [key, supplied] of Object.entries(provenance ?? {})) {
            for (const id of supplied.nodes) {
                const at = snapshot.ids.indexOf(id);
                if (at !== INVALID_INDEX) {
                    add("node", this.records?.nodeAttributes(at, id), key);
                }
            }

            for (const id of supplied.edges) {
                const at = space.indexOf(id);
                if (at !== INVALID_INDEX) {
                    add("edge", this.records?.edgeAttributes(at), key);
                }
            }
        }

        this.columnSourcesMemo = { described, provenance, result };
        return result;
    }

    /**
     * What the last load did.
     * @returns the report, or null when nothing has been loaded into this graph
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    lastImport(): LoadReport | null {
        this.requireLive("lastImport");
        const recorded = this.writes.slice().values.get("importReport") as LoadReport | undefined;
        return recorded ?? this.graphStore.lastImport ?? null;
    }

    /**
     * The weight the graph was loaded with, and the meaning chosen for it at load.
     * @returns the weight, or null when the last load read none
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    loadedWeight(): LoadedWeight | null {
        const attribute = this.lastImport()?.weights.attribute ?? null;
        return attribute === null
            ? null
            : Object.freeze({ attribute, meaning: this.readConfig().knownFields.edgeWeightMeaning });
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
        // The `_source.` facts are the element's bookkeeping of network loads, not the data's columns.
        const described = this.attributeCache.get("", () =>
            Object.freeze(describeAttributes(snapshot, this.records).filter((each) => !isSourceFactKey(each.name))),
        );
        const declarations = this.writes.declarations();
        const roles = this.columnRoles();
        const uses = this.columnUses(described);
        const fed = this.columnSources(described);
        const settings = this.columnSettings();
        const hidden = new Set(settings.hidden);
        const joined = this.joinedColumns();
        // The designated time column counts the values that read as time, not those present.
        const parsed = new Map<AttributeDescriptor, number>();
        for (const each of described) {
            const times = this.pages.timeParsed?.(each.kind, each.name);
            if (times !== undefined) {
                parsed.set(each, times);
            }
        }

        // The same array back while nothing it was laid from moved, so a consumer can memo on it.
        const key = JSON.stringify([
            [...declarations],
            [...roles],
            [...uses],
            [...fed],
            settings,
            [...joined],
            [...parsed.values()],
        ]);
        const memo = this.attributeOverlay;
        if (memo?.described === described && memo.key === key) {
            return memo.result;
        }

        const result =
            declarations.size === 0 &&
            roles.size === 0 &&
            uses.size === 0 &&
            fed.size === 0 &&
            joined.size === 0 &&
            parsed.size === 0 &&
            settings === NO_COLUMN_SETTINGS
                ? described
                : Object.freeze(
                      described.map((each) => {
                          const declared = declarations.get(declarationKey(each));
                          const played = roles.get(declarationKey(each));
                          const used = uses.get(declarationKey(each));
                          const from = fed.get(declarationKey(each));
                          const typed = settings.types[declarationKey(each)];
                          const isHidden = hidden.has(declarationKey(each));
                          const isJoined = joined.has(declarationKey(each));
                          const times = parsed.get(each);
                          const rows = each.kind === "node" ? snapshot.nodeCount : snapshot.edgeCount;
                          return declared === undefined &&
                              played === undefined &&
                              used === undefined &&
                              from === undefined &&
                              typed === undefined &&
                              times === undefined &&
                              !isHidden &&
                              !isJoined
                              ? each
                              : Object.freeze({
                                    ...each,
                                    ...(isJoined ? { origin: "joined" as const } : {}),
                                    ...(typed === undefined ? {} : typedFields(each, typed)),
                                    ...(times === undefined ? {} : { completeness: rows === 0 ? 0 : times / rows }),
                                    ...(declared === undefined
                                        ? {}
                                        : {
                                              measurement: declared.measurement,
                                              measurementSource: "declared" as const,
                                          }),
                                    // Designating a column as the time field makes it time.
                                    ...(declared === undefined && played?.includes("time") === true
                                        ? { measurement: "time", measurementSource: "declared" as const }
                                        : {}),
                                    ...(played === undefined ? {} : { roles: Object.freeze(played) }),
                                    ...(used === undefined ? {} : { usedBy: Object.freeze(used) }),
                                    ...(from === undefined ? {} : { sources: Object.freeze([...from]) }),
                                    ...(isHidden ? { hidden: true } : {}),
                                });
                      }),
                  );
        this.attributeOverlay = { described, key, result };
        return result;
    }

    /**
     * The values every node carries from the graph's structure, with their catalog names.
     * @returns degree, and on a directed graph in-degree and out-degree
     */
    structureValues(): readonly StructureValue[] {
        // In and out degree only on a directed graph, where they differ from degree.
        return this.statistics().directedness === "directed"
            ? STRUCTURE_VALUES
            : STRUCTURE_VALUES.filter((each) => each.path === "graphty.degree");
    }

    /**
     * Every value a rule or a binding can read: the node id, the data columns and the fields
     * finished runs published per element.
     * @returns the values, the node id first, then the data columns, then each run's fields
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    readableValues(): readonly ReadableValue[] {
        const snapshot = this.current();
        const declarations = this.writes.declarations();
        const runs: Run[] = [];
        for (const id of this.pages.runIds()) {
            const run = this.pages.run(id);
            if (run !== undefined) {
                runs.push(run);
            }
        }

        return readableValues({
            snapshot,
            directed: this.statistics().directedness === "directed",
            attributes: this.attributes(),
            declarationOf: (column) => declarations.get(declarationKey(column)),
            runs,
            layersReading: (path, on) =>
                this.writes
                    .readers()
                    .styles.filter(
                        ({ layer, reads }) =>
                            layer.target === on && reads.some((read) => read === path || read.startsWith(`${path}.`)),
                    )
                    .map(({ layer }) => ({ kind: "layer" as const, id: layer.id })),
        });
    }

    /**
     * The columns a join brought, by `<kind>:<name>`: the names each join still in the graph wrote,
     * less a column it wrote over or kept (a clash set to `"overwrite"` or `"keep"`), which was the
     * graph's before the join.
     * @returns the columns
     */
    private joinedColumns(): ReadonlySet<string> {
        const out = new Set<string>();
        for (const { join } of this.storedSources()) {
            if (join === undefined) {
                continue;
            }

            const kind = join.shape === "node-values" ? "node" : "edge";
            for (const name of join.columns) {
                const rule = join.choices.clash?.[name];
                if (rule !== "overwrite" && rule !== "keep") {
                    out.add(`${kind}:${name}`);
                }
            }
        }

        return out;
    }

    /**
     * What reads each column, by `<kind>:<name>`: the layers whose selector or bindings read a
     * `data.` path under it, in stack order, then the runs that weighed their edges by it.
     * @param described - the columns
     * @returns the readers
     */
    private columnUses(described: readonly AttributeDescriptor[]): Map<string, AttributeUse[]> {
        const { styles, runs } = this.writes.readers();
        const out = new Map<string, AttributeUse[]>();
        const add = (at: string, use: AttributeUse): void => {
            const list = out.get(at) ?? [];
            if (!list.some((each) => each.kind === use.kind && each.id === use.id)) {
                list.push(use);
                out.set(at, list);
            }
        };

        // A column `address` is read by `data.address` and by `data.address.city`; matched against
        // the columns themselves, because a column's own name may hold a dot.
        // ponytail: columns x paths per call; index the paths by first segment if a file has
        // thousands of columns and dozens of layers.
        for (const { layer, reads } of styles) {
            for (const path of reads) {
                for (const column of described) {
                    if (column.kind === layer.target && (path === column.path || path.startsWith(`${column.path}.`))) {
                        add(declarationKey(column), { kind: "layer", id: layer.id });
                    }
                }
            }
        }

        const { renamed } = this.columnSettings();
        for (const [id, entry] of runs) {
            let attribute = entry.record.caveats.weight?.attribute;
            // A run weighed by a column renamed since is listed under the name the column has now.
            const seen = new Set<string>();
            while (attribute !== undefined && renamed[`edge:${attribute}`] !== undefined && !seen.has(attribute)) {
                seen.add(attribute);
                attribute = renamed[`edge:${attribute}`];
            }

            if (attribute !== undefined) {
                add(`edge:${attribute}`, { kind: "run", id });
            }
        }

        return out;
    }

    /**
     * The roles columns play, by `<kind>:<name>`: from the data configuration and the last load.
     * A path the element reads as an expression names the column it is a plain or quoted key of;
     * one it reads as a literal key names that column.
     * @returns the roles, each column's in a fixed order
     */
    private columnRoles(): Map<string, AttributeRole[]> {
        const { knownFields } = this.readConfig();
        const report = this.lastImport();
        const out = new Map<string, AttributeRole[]>();
        const put = (kind: "node" | "edge", role: AttributeRole, name: string | null | undefined): void => {
            const at = `${kind}:${String(name)}`;
            if (name !== null && name !== undefined && out.get(at)?.includes(role) !== true) {
                out.set(at, [...(out.get(at) ?? []), role]);
            }
        };
        const add = (kind: "node" | "edge", role: AttributeRole, path: string | null | undefined): void => {
            if (path === null || path === undefined) {
                return;
            }

            for (const name of new Set([path, keyOfExpression(path)])) {
                put(kind, role, name);
            }
        };

        add("node", "key", knownFields.nodeIdPath);
        add("node", "label", knownFields.nodeLabelPath);
        add("node", "weight", knownFields.nodeWeightPath);
        add("node", "time", knownFields.nodeTimePath);
        for (const kind of LOCATION_KINDS) {
            add("node", kind, knownFields[LOCATION_KIND_FIELDS[kind]]);
        }

        // A field the configuration names outright (a `setRole`) wins over what the last load
        // read; one left at its default reads as the load did.
        add("edge", "source", knownFields.edgeSrcIdPath ?? report?.endpoints.source);
        add("edge", "target", knownFields.edgeDstIdPath ?? report?.endpoints.target);
        add(
            "edge",
            "weight",
            knownFields.edgeWeightPath === "weight"
                ? (report?.weights.attribute ?? knownFields.edgeWeightPath)
                : knownFields.edgeWeightPath,
        );
        add("edge", "time", knownFields.edgeTimePath);
        add("edge", "edgeId", knownFields.edgeIdPath);
        // The columns a load read the node ids and the edge ends from carry them as rows load, so
        // the real column (`account`, `from`) is the key, not only the id the element keeps.
        for (const { mapping } of this.storedSources()) {
            for (const table of Object.values(mapping?.tables ?? {})) {
                if (table.rowsAre === "nodes") {
                    put("node", "key", table.key);
                } else {
                    put("edge", "source", table.source?.column);
                    put("edge", "target", table.target?.column);
                }
            }
        }

        return out;
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
     * Name one value of a path, or take its name away. One undoable step.
     * @param path - The value path.
     * @param value - The value.
     * @param label - The name, or null.
     * @returns Settles once the name is recorded.
     */
    async setValueLabel(path: Path, value: string | number | boolean, label: string | null): Promise<void> {
        this.requireLive("setValueLabel");
        await this.writes.label(path, value, label);
    }

    /**
     * The names given to a path's values.
     * @param path - The value path.
     * @returns The names, by the value as the legend spells it.
     */
    valueLabels(path: Path): ReadonlyMap<string, string> {
        return valueLabelsAt(this.writes.valueLabels(), path);
    }

    /**
     * The column settings: hidden columns, value types and renames.
     * @returns the `columns` graph value, or the empty settings
     */
    private columnSettings(): ColumnSettings {
        return (this.writes.slice().values.get(COLUMNS_VALUE) as ColumnSettings | undefined) ?? NO_COLUMN_SETTINGS;
    }

    /**
     * Dispatch a command through the session.
     * @param command - the command
     * @param verb - the verb asking, for the error
     * @returns settles once it is recorded
     */
    private async send(command: SessionCommand, verb: string): Promise<void> {
        if (this.writes.send === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: `This session cannot dispatch commands, so it cannot ${verb}.`,
                source: "data",
            });
        }

        await this.writes.send(command);
    }

    /**
     * Every record of a kind, with its id and its attributes as they arrived.
     * @param kind - nodes or edges
     * @returns the rows, in the graph's order
     */
    private rawRows(
        kind: "node" | "edge",
    ): { readonly id: NodeId | EdgeId; readonly data: Readonly<Record<string, unknown>> | undefined }[] {
        const snapshot = this.current();
        if (kind === "node") {
            return Array.from({ length: snapshot.nodeCount }, (_unused, index) => {
                const id = snapshot.ids.idOf(index);
                return { id, data: this.records?.nodeAttributes(index, id) };
            });
        }

        const space = edgeSpaceOf(snapshot);
        return Array.from({ length: snapshot.edgeCount }, (_unused, index) => ({
            id: space.idOf(index),
            data: this.records?.edgeAttributes(index),
        }));
    }

    /**
     * Refuse a type that is not one.
     * @param type - what was given
     */
    private static checkType(type: unknown): asserts type is ValueType {
        if (!isValueType(type)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `A column's type is one of ${VALUE_TYPES.join(", ")}.`,
                source: "data",
                details: { type, types: [...VALUE_TYPES] },
            });
        }
    }

    /**
     * Give a column a role, or take its roles away, as one undoable step.
     * @param column - the column
     * @param role - the role, or null for none
     * @returns settles once the step is recorded
     */
    async setRole(column: ColumnRef, role: ColumnRole | null): Promise<void> {
        this.requireLive("setRole");
        const { kind, name } = resolveColumn(this.attributes(), column);
        const fields = ROLE_FIELDS[kind];
        const snapshot = this.current();
        const { knownFields } = this.readConfig();
        const patch: Record<string, string | null> = {};
        if (role === null) {
            // Every node has an id, so `key` is never taken away.
            for (const played of this.columnRoles().get(declarationKey({ kind, name })) ?? []) {
                const field = fields[played];
                if (played !== "key" && field !== undefined) {
                    patch[field] = null;
                }
            }

            if (Object.keys(patch).length === 0 && !this.listsLocation(kind, name)) {
                return;
            }
        } else {
            const field = fields[role];
            if (field === undefined) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: `A ${kind} column cannot have the ${JSON.stringify(role)} role.`,
                    source: "data",
                    details: { reason: "role-kind", kind, role, roles: Object.keys(fields) },
                });
            }

            // The roles that make the rows themselves are read when they load. ponytail: moving one
            // on loaded rows means reading them again (the endpoint columns are not kept as
            // attributes); do that here if the load flow cannot.
            let loaded = 0;
            if (role === "key") {
                loaded = snapshot.nodeCount;
            } else if (STRUCTURAL_EDGE_ROLES.has(role)) {
                loaded = snapshot.edgeCount;
            }

            if (loaded > 0 && (knownFields as unknown as Record<string, unknown>)[field] !== name) {
                throw new GraphtyError({
                    code: "E_UNSUPPORTED",
                    message: `The ${role} column is read when rows load: load the data again with ${JSON.stringify(name)} as the ${role}.`,
                    source: "data",
                    details: { reason: "reload", kind, role, column: name },
                });
            }

            patch[field] = name;
        }

        if (kind === "node") {
            Object.assign(patch, this.locationPatch(name, role));
        }

        const steps: SessionCommand[] = [{ op: "config.set", values: { data: { knownFields: patch } } }];
        await this.send(
            {
                op: "batch",
                label: role === null ? `Took the roles of ${name} away` : `Made ${name} the ${role}`,
                fact: { code: "data.set-role", params: { kind, column: name, role } },
                steps,
            },
            "give a column a role",
        );
    }

    /**
     * The node location kinds listed now: designated one column per kind, else what is read.
     * @returns the listing
     */
    private locationListing(): LocationListing {
        const known = this.readConfig().knownFields;
        const nodes = this.nodes();
        const columns = this.attributes().flatMap((c) =>
            c.kind === "node" ? [{ name: c.name, values: nodes.map((row) => row[c.name]) }] : [],
        );
        const places = cachedGazetteer();
        const answer = resolveLocation(
            chosenLocation({ location: null, latitude: null, longitude: null }, known),
            columns,
            (path) => columns.find((c) => c.name === path)?.values ?? null,
            places,
        );
        return listLocation(known, answer, (source) =>
            source.role === "auto" ? (bestRole(source.values, places) ?? "city") : source.role,
        );
    }

    /**
     * Whether a column is listed as a kind of node location.
     * @param kind - the column's kind
     * @param name - the column
     * @returns true when it is
     */
    private listsLocation(kind: "node" | "edge", name: string): boolean {
        return kind === "node" && Object.values(this.locationListing().kinds).includes(name);
    }

    /**
     * The location fields a role change on a node column also writes, so the kinds listed stay
     * listed: every kind listed now is designated one column per kind (a detected city keeps its
     * entry beside a country picked next), the single-entry form is cleared, and removing the last
     * kind writes `nodeLocationRole: "none"`, so the element stops finding one.
     * @param name - the column
     * @param role - its new role, or null for none
     * @returns the fields, or nothing when no location kind is involved
     */
    private locationPatch(name: string, role: ColumnRole | null): Record<string, string | null> {
        const isKind = (each: ColumnRole | null): each is LocationKind =>
            each !== null && (LOCATION_KINDS as readonly string[]).includes(each);
        if (role !== null && !isKind(role)) {
            return {};
        }

        const listing = this.locationListing();
        if (role === null && !Object.values(listing.kinds).includes(name)) {
            return {};
        }

        const kinds: Partial<Record<LocationKind, string>> = {};
        for (const each of LOCATION_KINDS) {
            const column = listing.kinds[each];
            if (column !== undefined && !(role === null ? column === name : each === role)) {
                kinds[each] = column;
            }
        }

        if (isKind(role)) {
            kinds[role] = name;
        }

        const patch: Record<string, string | null> = {
            nodeLocationPath: null,
            nodeLocationWithinPath: null,
            nodeLocationRole: Object.keys(kinds).length === 0 ? "none" : null,
        };
        for (const each of LOCATION_KINDS) {
            patch[LOCATION_KIND_FIELDS[each]] = kinds[each] ?? null;
        }

        return patch;
    }

    /**
     * What converting a column to a type would do. Changes nothing.
     * @param column - the column
     * @param type - the type
     * @returns how many values convert and fail, with examples
     */
    previewType(column: ColumnRef, type: ValueType): TypeChangePreview {
        this.requireLive("previewType");
        const { kind, name } = resolveColumn(this.attributes(), column);
        SessionData.checkType(type);
        return previewConversion(
            this.rawRows(kind).map((row) => row.data?.[name]),
            type,
        );
    }

    /**
     * Convert a column's values to a type, the ones that do not convert made blank, as one
     * undoable step.
     * @param column - the column
     * @param type - the type
     * @returns settles once the step is recorded
     */
    async setType(column: ColumnRef, type: ValueType): Promise<void> {
        this.requireLive("setType");
        return this.afterLoads(
            () => this.setTypeNow(column, type),
            () => undefined,
        );
    }

    /**
     * setType, once the loads asked for before it have landed.
     * @param column - as setType takes it
     * @param type - as setType takes it
     * @returns what setType returns
     */
    private async setTypeNow(column: ColumnRef, type: ValueType): Promise<void> {
        this.requireLive("setType");
        const { kind, name } = resolveColumn(this.attributes(), column);
        SessionData.checkType(type);
        const rows: RowUpdate<NodeId | EdgeId>[] = [];
        let fails = 0;
        for (const row of this.rawRows(kind)) {
            const value = row.data?.[name];
            const converted = convertValue(value, type);
            if (converted.kind === "fail") {
                fails++;
            }

            const next = converted.kind === "value" ? converted.value : null;
            // A value that is already nothing stays as it is; blank text becomes nothing.
            if (value !== undefined && value !== null && !Object.is(next, value)) {
                rows.push({ id: row.id, values: { [name]: next } });
            }
        }

        const settings = this.columnSettings();
        await this.send(
            {
                op: "batch",
                label: `Made ${name} ${type}`,
                fact: { code: "data.set-type", params: { kind, column: name, type, fails } },
                steps: [
                    ...(rows.length === 0
                        ? []
                        : [
                              {
                                  op: "data.apply" as const,
                                  mutation: { kind: "update-rows" as const, target: kind, rows },
                              },
                          ]),
                    {
                        op: "data.columns",
                        settings: { ...settings, types: { ...settings.types, [declarationKey({ kind, name })]: type } },
                    },
                ],
            },
            "convert a column",
        );
    }

    /**
     * Give a column a new name, and what reads it with it, as one undoable step.
     * @param column - the column
     * @param name - its new name
     * @returns settles once the step is recorded
     */
    async renameColumn(column: ColumnRef, name: string): Promise<void> {
        this.requireLive("renameColumn");
        return this.afterLoads(
            () => this.renameColumnNow(column, name),
            () => undefined,
        );
    }

    /**
     * renameColumn, once the loads asked for before it have landed.
     * @param column - as renameColumn takes it
     * @param name - as renameColumn takes it
     * @returns what renameColumn returns
     */
    private async renameColumnNow(column: ColumnRef, name: string): Promise<void> {
        this.requireLive("renameColumn");
        const attributes = this.attributes();
        const { kind, name: from } = resolveColumn(attributes, column);
        if (typeof name !== "string" || name.trim() === "") {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "A column's new name is a string with something in it.",
                source: "data",
                details: { reason: "empty-name", kind, column: from, name },
            });
        }

        if (name === from) {
            return;
        }

        if (attributes.some((each) => each.kind === kind && each.name === name)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `A ${kind} column is already named ${JSON.stringify(name)}.`,
                source: "data",
                details: { reason: "name-taken", kind, column: from, name },
            });
        }

        const steps: SessionCommand[] = [];
        // The rows: each record that carries the column, whole, with the key renamed in place.
        const rows: RowUpdate<NodeId | EdgeId>[] = [];
        for (const row of this.rawRows(kind)) {
            if (row.data !== undefined && Object.hasOwn(row.data, from)) {
                rows.push({
                    id: row.id,
                    values: Object.fromEntries(
                        Object.entries(row.data).map(([key, value]) => [key === from ? name : key, value]),
                    ),
                });
            }
        }

        if (rows.length > 0) {
            steps.push({ op: "data.apply", mutation: { kind: "update-rows", target: kind, rows, replace: true } });
        }

        // The roles it plays move with it.
        const fields = ROLE_FIELDS[kind];
        const roles: Record<string, string> = {};
        for (const played of this.columnRoles().get(declarationKey({ kind, name: from })) ?? []) {
            const field = fields[played];
            if (field !== undefined) {
                roles[field] = name;
            }
        }

        if (Object.keys(roles).length > 0) {
            steps.push({ op: "config.set", values: { data: { knownFields: roles } } });
        }

        // The style layers that select or paint by it.
        const { styles, visibility } = this.writes.readers();
        for (const { layer } of styles) {
            if (layer.locked || layer.target !== kind) {
                continue;
            }

            const patch: Record<string, unknown> = {};
            for (const part of ["selector", "set", "encode"] as const) {
                const before = layer[part];
                const after = before === undefined ? before : renameColumnIn(before, from, name);
                if (after !== before) {
                    patch[part] = after;
                }
            }

            if (Object.keys(patch).length > 0) {
                steps.push({ op: "style.patch", action: "update", id: layer.id, patch });
            }
        }

        // The filter, the filter steps and the time window.
        const filter = renameColumnIn(visibility.filter, from, name, ruleScope(kind), kind === "node");
        if (filter !== visibility.filter) {
            steps.push({ op: "visibility.set", filter });
        }

        const filterSteps = renameColumnIn(visibility.steps, from, name, ruleScope(kind), kind === "node");
        if (filterSteps !== visibility.steps) {
            steps.push({ op: "visibility.steps", steps: filterSteps });
        }

        const window = renameColumnIn(visibility.window, from, name);
        if (window !== visibility.window) {
            steps.push({ op: "visibility.window", window });
        }

        // The names given to its values.
        for (const [value, label] of valueLabelsAt(this.writes.valueLabels(), `data.${from}`)) {
            steps.push(
                { op: "data.label", path: `data.${name}`, value, label },
                { op: "data.label", path: `data.${from}`, value, label: null },
            );
        }

        // The settings, and the declaration.
        const settings = this.columnSettings();
        const oldKey = declarationKey({ kind, name: from });
        const newKey = declarationKey({ kind, name });
        const renamed = Object.fromEntries(
            Object.entries(settings.renamed).map(([key, to]) => [
                key,
                key.startsWith(`${kind}:`) && to === from ? name : to,
            ]),
        );
        renamed[oldKey] = name;
        const types = Object.fromEntries(
            Object.entries(settings.types).map(([key, type]) => [key === oldKey ? newKey : key, type]),
        );

        steps.push({
            op: "data.columns",
            settings: {
                hidden: settings.hidden.map((key) => (key === oldKey ? newKey : key)),
                types,
                renamed,
            },
            move: { kind, from, to: name },
        });

        await this.send(
            {
                op: "batch",
                label: `Renamed ${from} to ${name}`,
                fact: { code: "data.rename-column", params: { kind, column: from, name } },
                steps,
            },
            "rename a column",
        );
    }

    /**
     * Every hidden column.
     * @returns the columns, in the order they were hidden
     */
    hiddenColumns(): readonly ColumnRef[] {
        this.requireLive("hiddenColumns");
        return Object.freeze(
            this.columnSettings().hidden.map((key) => {
                const at = key.indexOf(":");
                return Object.freeze({ kind: key.slice(0, at) as "node" | "edge", name: key.slice(at + 1) });
            }),
        );
    }

    /**
     * Hide columns or show them again, as one undoable step.
     * @param columns - the columns
     * @param hidden - true to hide
     * @returns settles once the step is recorded, or at once when nothing changes
     */
    async setHidden(columns: readonly ColumnRef[], hidden: boolean): Promise<void> {
        this.requireLive("setHidden");
        const attributes = this.attributes();
        // The id and the ends every record has, even when no column carries them (a graph file).
        const keyField = (column: ColumnRef): boolean =>
            (column.kind === "node" ? column.name === "id" : column.name === "source" || column.name === "target") &&
            !attributes.some((each) => each.kind === column.kind && each.name === column.name);
        const keys = new Set(
            columns.map((column) => declarationKey(keyField(column) ? column : resolveColumn(attributes, column))),
        );
        const settings = this.columnSettings();
        const now = new Set(settings.hidden);
        const changing = [...keys].filter((key) => now.has(key) !== hidden);
        if (changing.length === 0) {
            return;
        }

        for (const key of changing) {
            if (hidden) {
                now.add(key);
            } else {
                now.delete(key);
            }
        }

        await this.send(
            {
                op: "batch",
                label: hidden ? `Hid ${String(changing.length)} columns` : `Showed ${String(changing.length)} columns`,
                fact: { code: hidden ? "data.hide-columns" : "data.show-columns", params: { count: changing.length } },
                steps: [{ op: "data.columns", settings: { ...settings, hidden: [...now] } }],
            },
            "hide columns",
        );
    }

    /**
     * How one data column's values are distributed.
     * @param column - the column
     * @param options - the bin count and, for a numeric column, the scale
     * @returns the distribution
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` for a column no record carries, and
     *     `E_OPTION_RANGE` for a bad bin count.
     */
    histogram(column: ColumnRef, options: HistogramOptions = {}): ColumnHistogram {
        const snapshot = this.current();
        const descriptor = resolveColumn(this.attributes(), column);
        const { name } = descriptor;
        const count = descriptor.kind === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const valueAt =
            descriptor.kind === "node"
                ? (index: number): unknown => this.records?.nodeAttributes(index, snapshot.ids.idOf(index))?.[name]
                : (index: number): unknown => this.records?.edgeAttributes(index)?.[name];

        if (descriptor.measurement === "quantitative") {
            const column = {
                length: count,
                get: (index: number): number => {
                    const value = valueAt(index);
                    return typeof value === "number" ? value : Number.NaN;
                },
            };
            const histogram = buildHistogram(column, { ...options, integerValued: descriptor.type === "integer" });
            return Object.freeze({ kind: "numeric", ...histogram });
        }

        const limit = resolveBinCount(options.bins);
        // Map keeps first-seen order, and the sort below is stable, so a tie keeps it too.
        const counts = new Map<ColumnScalar, number>();
        let present = 0;
        for (let index = 0; index < count; index++) {
            const value = valueAt(index);
            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                present++;
                counts.set(value, (counts.get(value) ?? 0) + 1);
            }
        }

        const values = [...counts]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([value, n]) => Object.freeze({ value, count: n }));
        const listed = values.reduce((sum, each) => sum + each.count, 0);
        return Object.freeze({ kind: "categorical", values: Object.freeze(values), otherCount: present - listed });
    }

    /**
     * How many elements carry each value of a readable path.
     * @param path - the value path, or `"id"`
     * @param options - which kind to count
     * @param options.kind - nodes or edges; by default the kind the path is listed on
     * @returns the counts, most elements first
     */
    valueCounts(path: Path, options: { readonly kind?: "node" | "edge" } = {}): ValueCounts {
        const snapshot = this.current();
        const kind =
            options.kind ??
            (this.readableValues().find((value) => value.path === path)?.on === "edge" ? "edge" : "node");
        const total = kind === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        // Map keeps first-seen order, and the sort below is stable, so a tie keeps it too.
        const counts = new Map<ColumnScalar, number>();
        let missing = 0;
        for (let index = 0; index < total; index++) {
            const value =
                path === "id" && kind === "node" ? snapshot.ids.idOf(index) : this.pages.valueAt(kind, index, path);
            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                counts.set(value, (counts.get(value) ?? 0) + 1);
            } else {
                missing++;
            }
        }

        const values = [...counts].sort((a, b) => b[1] - a[1]).map(([value, count]) => Object.freeze({ value, count }));
        return Object.freeze({ values: Object.freeze(values), missing, total });
    }

    /**
     * The graph's shape.
     * @param options - What to measure.
     * @param options.scope - `"visible"` for only what is showing; default the whole graph.
     * @returns the statistics
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    statistics(options: { readonly scope?: "all" | "visible" } = {}): GraphStatistics {
        const derived = this.derivedFor(this.current());
        derived.statistics ??= computeStatistics(
            derived.snapshot,
            this.readConfig().directed,
            this.graphStore.directionSettledBy,
        );
        const masks = options.scope === "visible" ? this.pages.visibleMasks?.() : undefined;
        if (masks === undefined || (!masks.nodes.includes(0) && !masks.edges.includes(0))) {
            return derived.statistics;
        }

        // ponytail: recomputed on every call over the visible subgraph; cache by mask version when
        // a large graph reads it per frame.
        const pack = (bytes: Uint8Array, length: number): Uint32Array<ArrayBuffer> => {
            const words = new Uint32Array(Math.ceil(length / 32));
            for (let at = 0; at < length; at++) {
                if (bytes[at] === 1) {
                    words[at >>> 5] |= 1 << (at & 31);
                }
            }

            return words;
        };
        const graph = derived.snapshot;
        const visible = graph
            .filterEdges(pack(masks.edges, graph.edgeCount))
            .snapshot.inducedSubgraph({ mask: pack(masks.nodes, graph.nodeCount) }).snapshot;

        return computeStatistics(visible, this.readConfig().directed, this.graphStore.directionSettledBy);
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
        if (this.derived?.snapshot !== snapshot) {
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
 * Whether later roles read a table's rows as the other kind than the earlier ones did.
 * @param earlier - The roles it was read with.
 * @param later - The roles laid over them.
 * @param later.rowsAre - What the later roles read the rows as.
 * @returns True when both name a `rowsAre` and the two differ.
 */
function movesRows(
    earlier: { readonly rowsAre?: unknown } | undefined,
    later: { readonly rowsAre?: unknown },
): boolean {
    return later.rowsAre !== undefined && earlier?.rowsAre !== undefined && later.rowsAre !== earlier.rowsAre;
}

/**
 * Choices laid over the ones a load was read with: each choice given wins, and a mapping's roles
 * are laid over the earlier mapping's role by role (per table when either names tables).
 * @param earlier - What the load was read with.
 * @param later - What changes.
 * @returns The choices to read it with now.
 */
function overChoices(earlier: LoadChoices, later: LoadChoices): LoadChoices {
    const { mode: _mode, join: _join, ...rest } = later;
    const a = earlier.mapping;
    const b = rest.mapping;
    if (a === undefined || b === undefined) {
        return { ...earlier, ...rest, ...(a === undefined && b === undefined ? {} : { mapping: b ?? a }) };
    }

    let mapping: LoadMapping;
    const lone = "tables" in a && !("tables" in b) ? Object.keys(a.tables) : [];
    if (lone.length === 1) {
        // A bare mapping names a load of one table, so it is laid over that table's roles.
        const [id] = lone;
        const roles = (a as { tables: Record<string, TableMapping> }).tables[id];
        mapping = { tables: { [id]: movesRows(roles, b as TableMapping) ? b : { ...roles, ...b } } } as LoadMapping;
    } else if ("tables" in a || "tables" in b) {
        // A bare mapping cannot be placed among named tables, so the later one wins whole.
        const tables: Record<string, TableMapping> = "tables" in a && "tables" in b ? { ...a.tables } : {};
        for (const [id, roles] of Object.entries("tables" in b ? b.tables : {})) {
            tables[id] = { ...(movesRows(tables[id], roles) ? {} : tables[id]), ...roles };
        }

        mapping = "tables" in b ? { tables } : b;
    } else {
        // Rows read as the other kind take none of the roles the earlier kind had.
        mapping = movesRows(a, b) ? b : { ...a, ...b };
    }

    return { ...earlier, ...rest, mapping };
}

/**
 * A generated graph or a downloaded dataset as the JSON source `import` reads: graph-samples' own
 * records for it, with its direction stated.
 * @param graph - The graph.
 * @param name - What the source is called.
 * @returns The source.
 */
function recordsSource(graph: SampleGraph | GraphSnapshot, name: string): DataSourceInput {
    const data = JSON.stringify({ directed: graph.directed, ...toElementData(graph) });
    return { type: "json", name, config: { data } };
}

/**
 * The column that names a generated graph's or a dataset's nodes: the first of
 * {@link LABEL_COLUMNS} some node holds text in.
 * @param graph - The graph.
 * @returns The column, or undefined when no node has one.
 */
function sampleLabelOf(graph: SampleGraph | GraphSnapshot): string | undefined {
    const { nodes } = toElementData(graph) as { nodes: readonly Readonly<Record<string, unknown>>[] };
    return LABEL_COLUMNS.find((column) => nodes.some((node) => typeof node[column] === "string"));
}

/**
 * A load's entry as the plain source descriptor `source()` reports: its type, name, size and options.
 * @param entry - the load
 * @returns the descriptor
 */
function describeLoaded(entry: LoadedSource): DataSourceDescriptor {
    return {
        ...(entry.type === undefined ? {} : { type: entry.type }),
        ...(entry.name === undefined ? {} : { name: entry.name }),
        ...(entry.size === undefined ? {} : { size: entry.size }),
        ...(entry.config === undefined ? {} : { config: entry.config }),
    };
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
    lastImport: () => LoadReport | null,
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
const PLAIN_KEY = /^[A-Za-z_]\w*$/;

/** A JMESPath quoted identifier: a top-level property name written as a JSON string. */
const QUOTED_KEY = /^"(?:[^"\\]|\\.)*"$/;

/**
 * The top-level key a JMESPath expression reads, when that is all it does.
 * @param expression - The expression, such as `id` or `"shared chapters"`.
 * @returns The key, or null for an expression that reads anything else.
 */
function keyOfExpression(expression: string): string | null {
    if (PLAIN_KEY.test(expression)) {
        return expression;
    }

    return QUOTED_KEY.test(expression) ? (JSON.parse(expression) as string) : null;
}

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
        // No events to raise here: a load's errors reach `lastImport().errors` through its report.
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
        values: (values, draft) => {
            dispatcher.graph.writer(draft, store).setGraphValues(values);
        },
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
 * Settle a source and read it once, publishing the read as `task: "prepare"` progress: a first
 * change before anything is read, the rows read so far, and an end saying how it stopped.
 * @param source - What `prepare` takes.
 * @param signal - Abandons the read.
 * @param publish - Where the progress goes.
 * @returns What was read.
 * @throws What reading throws, after the end is published.
 */
async function readWithProgress(
    source: DataSourceInput,
    signal: AbortSignal | undefined,
    publish: (change: ProgressChange) => void,
): Promise<Awaited<ReturnType<typeof readSource>>> {
    const named = progressSource(source.config, source.name);
    let completed = 0;
    let fraction: number | null = null;
    const change = (phase: ProgressChange["phase"], end?: Pick<ProgressChange, "outcome" | "error">): void => {
        publish({
            task: "prepare",
            phase,
            completed,
            total: null,
            fraction,
            ...(named === undefined ? {} : { source: named }),
            ...end,
        });
    };

    // The first change, sent before anything is read.
    change("progress");
    try {
        const resolved = resolveImportSource(source);
        const read = await readSource(
            resolved instanceof Promise ? await resolved : resolved,
            signal,
            (rows, share) => {
                completed = rows;
                fraction = share ?? null;
                change("progress");
            },
        );
        change("end", { outcome: "succeeded" });
        return read;
    } catch (error) {
        change("end", failedEnd(error, signal));
        throw error;
    }
}

/**
 * A node file and an edge file's name: both files' names, the node file's first.
 * @param config - The source's options.
 * @returns `nodes.csv + edges.csv`, or undefined when the options name no pair.
 */
function pairName(config: Readonly<Record<string, unknown>>): string | undefined {
    const names = [config.nodeFile ?? config.nodeURL, config.edgeFile ?? config.edgeURL]
        .map(fileName)
        .filter((each): each is string => each !== undefined && each !== "");
    return names.length === 0 ? undefined : names.join(" + ");
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
    const name = source.name ?? (filename === "" ? undefined : filename) ?? pairName(config);
    const described = {
        ...(name === undefined ? {} : { name }),
        ...(file === null ? {} : { size: file.size }),
    };

    if (source.type !== undefined) {
        return { type: source.type, config, ...described };
    }

    // A node file and an edge file handed over as a pair are only ever CSV.
    if (isPairConfig(config)) {
        return { type: "csv", config, ...described };
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

/**
 * The key the next load takes: one past the highest a load in the list or the provenance has.
 * @param stored - the loads
 * @param provenance - what each load supplied
 * @returns the key
 */
function nextSourceKey(stored: readonly LoadedSource[], provenance: Provenance | undefined): SourceKey {
    const serials = [...stored.map((each) => each.key), ...Object.keys(provenance ?? {})].map((key) => {
        const match = /^s(\d+)$/.exec(key);
        return match === null ? 0 : Number(match[1]);
    });
    return `s${String(Math.max(0, ...serials) + 1)}`;
}

/**
 * What a load's bytes were, for its project-file entry: a file's name, size, media type and
 * SHA-256, inline data's size and SHA-256, a URL's SHA-256 when its body was read here. Nothing
 * for anything else (a pair of files, a URL its reader fetched itself).
 * ponytail: a URL load that names its type is fetched by its reader, so its body is not hashed;
 * fetch it here, as an undetected one is, if every URL entry must carry its digest.
 * @param config - The source's options as the load read them.
 * @returns The facts.
 */
async function bytesFacts(config: Readonly<Record<string, unknown>>): Promise<Partial<LoadFacts>> {
    const { data, file, url } = config;
    if (typeof url === "string") {
        const sha256 = data instanceof Uint8Array ? await sha256Hex(data) : undefined;
        return { url: { ...(sha256 === undefined ? {} : { sha256 }), fetchedAt: new Date().toISOString() } };
    }

    const blob = fileOf(file);
    if (blob !== null) {
        const bytes = new Uint8Array(await blob.slice(0, blob.size).arrayBuffer());
        const { type } = file as { type?: unknown };
        return {
            file: {
                ...(blob.name === "" ? {} : { name: blob.name }),
                size: blob.size,
                sha256: await sha256Hex(bytes),
                ...(typeof type === "string" && type !== "" ? { mediaType: type } : {}),
            },
        };
    }

    if (isSourceData(data)) {
        const input = toSourceInput(data);
        const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
        return { file: { size: bytes.byteLength, sha256: await sha256Hex(bytes) } };
    }

    return {};
}

/**
 * Whether an import command replaces the graph or adds to it.
 * @param command - The command, or the batch holding it.
 * @returns Its mode.
 */
function modeOf(command: DataImportCommand | BatchCommand): "replace" | "merge" {
    const load = command.op === "batch" ? command.steps.find((step) => step.op === "data.import") : command;
    return load !== undefined && "mode" in load && load.mode === "merge" ? "merge" : "replace";
}

/**
 * The import choices a project file's entry records beside the source's own options.
 * @param options - The choices.
 * @returns The ones given, or undefined when none was.
 */
function choiceOptions(
    options: LoadChoices & Pick<SourceLoadOptions, "existing">,
): Record<string, unknown> | undefined {
    const { mapping, unmatched, directed, duplicateIds, existing } = options;
    const given = Object.fromEntries(
        Object.entries({ mapping, unmatched, directed, duplicateIds, existing }).filter(
            ([, value]) => value !== undefined,
        ),
    );
    return Object.keys(given).length === 0 ? undefined : given;
}

/**
 * What a network load can do now and how big its source says it is, for its `sources()` entry.
 * @param record - the load's record, when the entry has one
 * @param catalog - each source's features, by source id
 * @returns `{ features, total }`, or nothing for an entry that is no network load
 */
function loadFacts(
    record: SourceLoadRecord | undefined,
    catalog: ReadonlyMap<string, SourceFeatures>,
): Pick<LoadedSource, "features" | "total" | "totalEdges"> {
    if (record === undefined) {
        return {};
    }

    const declared = catalog.get(record.source);
    return {
        features: Object.freeze({
            expand: declared?.expand === true,
            more: declared?.more === true && record.next !== null,
            refresh: declared?.refresh === true,
        }),
        ...(record.total === undefined ? {} : { total: record.total }),
        ...(record.totalEdges === undefined ? {} : { totalEdges: record.totalEdges }),
    };
}
