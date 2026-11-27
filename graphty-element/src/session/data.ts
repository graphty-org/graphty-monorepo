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

import {
    coordinateSystemOf,
    type DerivedGraph,
    fromBytes,
    type GraphSnapshot,
    INVALID_INDEX,
    makeMask,
    maskSet,
    maskTest,
    type NodeId,
    type U32,
} from "@graphty/graph-format";
import { sha256Hex, type SourceListing, type SourceListQuery, type SourceProbe } from "@graphty/graph-io";
import {
    DATASET_NAMES,
    DatasetError,
    DATASETS,
    fetchDataset,
    GENERATOR_CATALOG,
    type SampleGraph,
    toElementData,
} from "@graphty/graph-samples";
import { generateGraph, type GeneratorParams } from "@graphty/graph-samples/generators";

import { designatedWeight } from "../algorithms/input/weight";
import { detectFormat, undetectedFormat } from "../catalog/detect";
import { sourceDescriptors } from "../catalog/sources";
import type {
    AttributeDescriptor,
    AttributeRole,
    AttributeType,
    AttributeUse,
    EdgeId,
    LayerId,
    Measurement,
    MeasurementDeclaration,
    Path,
    Query,
    ReadableValue,
    RunId,
    ScopeInput,
    SourceKey,
    StructureValue,
} from "../catalog/types";
import { isPairConfig } from "../data/CSVDataSource";
import { fixedIdsOf } from "../data/declaredPins";
import { edgeCounterOf, edgeIdOf, pairKey as pairKeyOf, recordType, type RepeatGroup } from "../data/edgeIdentity";
import type { GraphStore } from "../data/GraphStore";
import { readonlyPositions } from "../data/lane";
import { rowOfEitherSpelling } from "../data/nodeIdSpelling";
import type { ImportReport, LoadReport } from "../data/report";
import { readAxes } from "../data/seedPosition";
import {
    DETECTION_SAMPLE,
    fetchBytes,
    isSourceData,
    peekFetched,
    sampleOf,
    takeFetched,
    toSourceInput,
    urlTail,
    validatorsOf,
} from "../data/source-bytes";
import { GraphtyError, isGraphtyError } from "../errors";
import { featureOff } from "../features/resolve";
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
import { describeAttributes, describeShownFigures } from "./attributes";
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
    checkMutation,
    COLUMNS_VALUE,
    type ColumnSettings,
    type DataImportCommand,
    type DataMutation,
    type DataService,
    declarationKey,
    describeSource,
    factOf as mutationFact,
    type HeldRows,
    importCommand,
    importFact,
    type ImportSource,
    labelOf as mutationLabel,
    mergeNodesCommand,
    NO_COLUMN_SETTINGS,
    SOURCE_VALUE,
    SOURCES_VALUE,
} from "./commands/data";
import {
    type DataDeriveCommand,
    derivedColumnsOf,
    derivedRows,
    derivedValues,
    isTerms,
    scoreExpression,
    type ValuesWhere,
} from "./commands/derive";
import type { DataStepsSetCommand } from "./commands/source-steps";
import {
    byTableId,
    Draft,
    draftStyles,
    fileName,
    type JoinedTable,
    keyExpression,
    LABEL_COLUMNS,
    LOAD_ROLES,
    type ReadSource,
    readSource,
    weightAmong,
} from "./draft";
import type { LaneStore } from "./GraphSession";
import { RESTORE as GROUP_RESTORE } from "./groups";
import { columnMutations } from "./importColumns";
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
import {
    frozen,
    type JoinGraph,
    joinMappingColumns,
    type JoinPlan,
    joinReport,
    type JoinTable,
    planJoin,
} from "./join";
import type { RenderLimits } from "./limits";
import { historyMark, type LoadLine, type LoadTurn, supersededError } from "./loadLine";
import { overRepresentedValues } from "./overRepresented";
import type { SessionCommand } from "./planning";
import type { Dispatcher } from "./project/Dispatcher";
import { frozenRecord } from "./project/draft";
import { columnsEligible, failedEnd, HELD_KINDS, Ingest, progressSource } from "./project/ingest";
import { recordsSource, rowsView } from "./project/recordMap";
import type { GraphRecord, GraphSlice, RunEntry, VisibilityState } from "./project/state";
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
import { arrayColumn, buildHistogram, computeColumnStatistics, resolveBinCount } from "./results/statistics";
import type { HistogramOptions } from "./results/types";
import { RevisionCache } from "./revision";
import type { ResolvedScope, Run, WeightMeaning } from "./runs/types";
import type { ElementMask } from "./scope/ElementMask";
import { edgeSpaceOf } from "./scope/ScopeApi";
import type { SelectionTextMode } from "./selection";
import { searchOf } from "./selection/targets";
import type { CodedFact, ColumnRef, ProgressChange } from "./shared";
import { draftOpenError, SourceDraftHandle } from "./sourceDraft";
import { type SavedSourceDraft, setSourceDraftHooks } from "./sourceDraftHooks";
import { ExpansionState, type HostEdge, type LoadStamp, type SourceHost } from "./sources/host";
import {
    isSourceFactKey,
    SOURCE_ATTR,
    SOURCE_RECORD_MEMBER,
    sourceFactsOf,
    sourceLoadsOf,
    SOURCES_MEMBER_VERSION,
} from "./sources/ids";
import { SourceLedger } from "./sources/ledger";
import {
    type LoadFacts,
    paramsOf,
    redactedParams,
    redactUrl,
    type ReferenceEntry,
    sampleAddress,
    type SourcesRead,
    type SourcesWrite,
    withKeptSecrets,
    writeSourcesMember,
} from "./sources/member";
import { pendingSourceLoads, targetOf } from "./sources/pending";
import {
    heldCounts,
    type Provenance,
    PROVENANCE_VALUE,
    provenanceIndex,
    withoutSource,
    withSupplied,
} from "./sources/provenance";
import { type LoadHow, type NetworkRecord, refusalOf } from "./sources/references";
import { refreshReport } from "./sources/refreshReport";
import { rowsCopies, type StepsAct } from "./sources/steps/acts";
import { copyKey, resolveNode } from "./sources/steps/build";
import {
    compileCommand,
    compileImport,
    compileJoin,
    readerOps,
    withDigest,
    withoutJoin,
} from "./sources/steps/compile";
import type { DraftMark, DraftMarks } from "./sources/steps/draft";
import { matchCounts, matchValues } from "./sources/steps/match";
import { RECORD_PATHS } from "./sources/steps/paths";
import { spaceProfile, tableHandle } from "./sources/steps/profile";
import {
    applyEdit,
    buildOf,
    checkSpace,
    type Copies,
    copyOrigin,
    diffGraph,
    editRows,
    EMPTY_STEPS,
    type GraphDiff,
    mintCopyId,
    mintEditId,
    mintSourceId,
    nodeIdsOf,
    nodeOfId,
    projectBuild,
    type ProjectedGraph,
    refOf,
    SOURCE_COPIES_VALUE,
    SOURCE_EDGE_IDS_VALUE,
    SOURCE_STEPS_VALUE,
    sourceState,
    type SourceSteps,
    spaceRows,
    stepRows,
    type StepsEdit,
    type StepsSource,
} from "./sources/steps/project";
import {
    cell as stepsCell,
    conflicts as stepsConflicts,
    lineage as stepsLineage,
    READABLE_PATHS,
    readPath,
    values as stepsValues,
} from "./sources/steps/provenance";
import {
    type ChangeCounts,
    changeCounts,
    refreshIssues,
    removedSteps,
    sameRows,
    takenNames,
} from "./sources/steps/refresh";
import { stepsMemberFields } from "./sources/steps/saved";
import type { BuildResult, BuiltEdge, BuiltNode, CopyTables, Row } from "./sources/steps/types";
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
    SourceRead,
    SourceRefreshReport,
    SourceSettings,
} from "./sources/types";
import { computeFingerprint, computeStatistics } from "./statistics";
import { asksFileStyles } from "./styles/fileStyles/apply";
import type { CompiledLayer } from "./styles/Layer";
import { expressionPaths } from "./styles/predicate";
import { STRUCTURE_VALUES, structureValuesOf } from "./styles/sources";
import { columnsOf, layersReadingOnly } from "./styles/staleLayers";
import type {
    ByTableMapping,
    ColumnHistogram,
    ColumnRole,
    DatasetLoadOptions,
    DataSourceDescriptor,
    DataSourceInput,
    DerivedColumn,
    DeriveOptions,
    EdgeName,
    EdgePageOptions,
    EdgeRecord,
    EdgeRecordInput,
    ElementKinds,
    FindKind,
    FindOptions,
    FindResult,
    GraphKinds,
    GraphStatistics,
    GroupSummary,
    GroupTable,
    GroupTableOptions,
    GroupTableRow,
    ImportColumnsInput,
    ImportOptions,
    JoinChoices,
    JoinRecord,
    JoinReport,
    JoinShape,
    LoadChoices,
    LoadedChoices,
    LoadedSource,
    LoadedSourceKind,
    LoadedWeight,
    LoadMappingRead,
    MergeNodesOptions,
    Neighbor,
    NeighborOptions,
    NeighborPage,
    NodeName,
    NodeRecord,
    NodeRecordInput,
    OverRepresentedOptions,
    OverRepresentedValues,
    PageColumn,
    PreparePageControl,
    ReaderEditRow,
    RecordMatch,
    RecordPage,
    RecordPageOptions,
    RecordSort,
    RemapOptions,
    RemoveSourceResult,
    ReplaceReport,
    ReplaceUnboundCode,
    ResultColumn,
    ResultColumnDescriptor,
    RowUpdate,
    ScoreTerm,
    SessionAttributes,
    SessionDataApi,
    SessionDataConfig,
    SessionEventMap,
    SessionGraphStore,
    SessionRecordSource,
    SourceCellState,
    SourceCellValue,
    SourceCellValues,
    SourceColumnProfile,
    SourceConflict,
    SourceConflictQuery,
    SourceConnectOptions,
    SourceCopy,
    SourceCopyChoice,
    SourceDraft,
    SourceDraftOptions,
    SourceEditChoice,
    SourceElementRef,
    SourceElementsFilter,
    SourceExtractOptions,
    SourceLineage,
    SourceLoaded,
    SourceMappingPatch,
    SourceMatchCounts,
    SourceMatchOptions,
    SourceMatchPair,
    SourceMatchValues,
    SourceMatchValuesOptions,
    SourceMergeOptions,
    SourceMoveColumnsOptions,
    SourceNodeRef,
    SourceRefreshIssue,
    SourceRoleOptions,
    SourceSpaceRow,
    SourceStepResolution,
    SourceStepRow,
    SourceTable,
    SourceTypeEntry,
    StageOptions,
    TableMapping,
    TypeChangePreview,
    ValueCounts,
    ValueType,
} from "./types";
import { typedValueLabelsAt, valueLabelsAt } from "./valueLabels";
import { type FilterValueSource, valuePaths } from "./visibility/filter";
import { wholeGraph } from "./working/graphs";
import type { WorkingGraph, WorkingScope, WorkingView } from "./working/view";

/** A node or an edge of a source-steps build. */
type BuiltElementOf = BuiltNode | BuiltEdge;

/** The attribute a load's kind mapping (`TableMapping.kind` and the like) writes each row's kind to. */
const LOADED_KIND = "kind";

/** The column names a node or edge kind is most often kept under, as `roleCandidate("kind")` offers them. */
const KIND_COLUMNS: readonly string[] = ["type", "Type", "kind", "Kind", "category", "Category"];

/** A value a column holds that can be given a name (`data.label`) or counted. */
type ColumnScalar = string | number | boolean;

/**
 * Whether a value is a {@link ColumnScalar}.
 * @param value - The value.
 * @returns True for a string, number or boolean.
 */
function isColumnScalar(value: unknown): value is ColumnScalar {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/** Every summary `groupTable` writes. */
const GROUP_SUMMARIES: readonly GroupSummary[] = ["count", "sum", "min", "max", "mean", "median"];

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
     * @param options - The load's signal, and the caller's key its journal entries carry.
     * @param options.signal - Withdraws the load.
     * @param options.callerKey - Echoed on the load's journal entries.
     * @param options.trigger - `"load"` for a load door: stamped on the load's journal entries.
     */
    importer(options?: {
        readonly signal?: AbortSignal;
        readonly callerKey?: string;
        readonly trigger?: "load";
    }): (command: DataImportCommand | BatchCommand | DataStepsSetCommand) => Promise<unknown>;
    /**
     * Where a write that is no undo step of its own goes: into the newest applied step, as part
     * of it. With no step to join, or inside a routed verb, it goes where `importer` sends it.
     */
    folder?(): (command: DataStepsSetCommand) => Promise<unknown>;
    /** The ceilings in force, which a read-first load is refused above. */
    readonly ceilings?: RenderLimits;
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
    /** The weight meaning an edge was stored under, from the ingest that stored it. */
    edgeMeaning?(counter: number): string | null | undefined;
    /** Dispatch any command: the network-source loads and expansions dispatch their own ops. */
    send?(command: SessionCommand, stamp?: LoadStamp): Promise<unknown>;
    /** Publish a session event: the network-source expansions publish theirs. */
    emit?<K extends keyof SessionEventMap>(event: K, detail: SessionEventMap[K]): void;
    /** The style stack and the finished runs now: what reads a column. */
    readers(): {
        readonly styles: readonly CompiledLayer[];
        readonly runs: ReadonlyMap<RunId, RunEntry>;
        readonly visibility: VisibilityState;
    };
    /**
     * The nodes pins and notes name, and the edges notes name (undefined for one the graph does
     * not hold): what a rebuild under the source-steps experiment may leave unbound.
     */
    references?(): { readonly nodes: readonly NodeId[]; readonly edges: readonly (EdgeId | undefined)[] };
    /** A drawn source draft's After on the graph: taken off and put back around what must not see it. */
    readonly drawing?: {
        /** Settles once the graph draws what the open draft shows now. */
        drawn(): Promise<void>;
        /** Take After off the graph now, synchronously. */
        stop(): void;
        /** Draw what the open draft shows again. */
        resume(): void;
    };
}

/** What a page of records reads beside the snapshot. */
interface PageSources {
    /** The session's input tick: it moves whenever anything a page could show moves. */
    revision(): number;
    /** The data's own revision: it moves on a freeze or an attribute write, never on a mask. */
    dataRevision(): unknown;
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
    textTest(
        text: string,
        mode: SelectionTextMode,
        target: "node" | "edge",
        only?: readonly Path[],
    ): (index: number) => boolean;
    /**
     * Which field of one record a text matches best, by row: a ranked page's `matching`.
     * @param text - What was typed, its mode prefix already read
     * @param mode - How to match it
     * @param target - Nodes or edges
     * @returns The best match of each row, or undefined for one that does not match
     */
    textMatch(
        text: string,
        mode: SelectionTextMode,
        target: "node" | "edge",
        only?: readonly Path[],
    ): (index: number) => RecordMatch | undefined;
    /**
     * The ids an expression matches: a page's `where`, over the query engine.
     * @param where - The expression
     * @param target - Nodes or edges
     * @returns The matching ids
     */
    matchWhere(where: Query, target: "node" | "edge"): ReadonlySet<NodeId | EdgeId>;
    /** What an expression reads for every element, over the query engine: a computed column's values. */
    readonly valuesWhere: ValuesWhere;
    /**
     * The paths an expression names that nothing in the session answers, over the query engine.
     * @param where - The expression
     * @returns The unresolved paths
     */
    unresolvedWhere(where: Query): readonly Path[];
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
     * The columns whose values read as time, most read first (`session.time.candidates()`).
     * @returns the candidates
     */
    timeCandidates?(): readonly { readonly kind: "node" | "edge"; readonly column: string }[];
    /**
     * Whether the file styles experiment is on; absent reads on.
     * @returns true when it is
     */
    fileStyles?(): boolean;
    /**
     * Whether the source-steps experiment is on; absent reads off.
     * @returns true when it is
     */
    sourceSteps?(): boolean;
    /**
     * Whether the source references experiment is on; absent reads off.
     * @returns true when it is
     */
    sourceReferences?(): boolean;
    /**
     * Whether the element draws on the `"batched"` render path; absent reads false.
     * @returns true when it does
     */
    batched?(): boolean;
    /**
     * The visible masks, for statistics over the visible graph: the same objects until what is
     * visible changes.
     * @returns The node and edge masks.
     */
    visibleMasks?(): VisibleMasks;
    /**
     * The working graph, which a reader naming no scope reads while it is on.
     * @returns It.
     */
    working?(): WorkingGraph;
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

/**
 * The ops a reader may dispatch while a draft's After is drawn, by prefix: they read and name no
 * node or edge of the graph. Anything not listed is refused then, so a new op is safe until it is.
 */
const AFTER_ALLOWS = [
    "batch",
    "style.",
    "config.",
    "shader.",
    "view.camera",
    "view.save",
    "view.remove",
    "view.immersive",
    "visibility.set",
    "visibility.window",
    "visibility.context",
    "visibility.steps",
    "visibility.conditions",
    "visibility.playback",
    "layout.transport",
    "algo.move",
    "algo.rename",
    "algo.remove",
] as const;

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
 * Whether an edge has the node at either end.
 * @param snapshot - the current snapshot
 * @param index - the edge's row
 * @param end - the node's row, or INVALID_INDEX when the graph does not hold it
 * @returns true when one end is the node
 */
function edgeTouches(snapshot: GraphSnapshot, index: number, end: number): boolean {
    return end !== INVALID_INDEX && (snapshot.edgeSource(index) === end || snapshot.edgeTarget(index) === end);
}

/**
 * Whether a row is in a scope.
 * @param snapshot - the current snapshot
 * @param space - the snapshot's edge id space
 * @param members - the scope's nodes and edges
 * @param target - nodes or edges
 * @param index - the row
 * @returns true when the row's element is in the scope
 */
function rowInScope(
    snapshot: GraphSnapshot,
    space: ReturnType<typeof edgeSpaceOf>,
    members: ResolvedScope,
    target: "node" | "edge",
    index: number,
): boolean {
    return target === "node" ? members.nodes.has(snapshot.ids.idOf(index)) : members.edges.has(space.idOf(index));
}

/** How long `data.preparePage` works before it hands the thread back, in ms. */
const PREPARE_SLICE_MS = 12;

/** The share of a sorted order's progress its scan of the rows is counted as. */
const SCAN_SHARE = 0.1;

/** How many rows of work an order does between two of its steps. */
const ORDER_STEP = 4096;

/** The rows a sort leaves in place before it merges them: short runs sort fastest by insertion. */
const SORT_RUN = 32;

/** Counts a sort's work and says when it has done enough since its last pause. */
class SortWork {
    #done = 0;
    #pause = ORDER_STEP;
    readonly #total: number;

    /**
     * Start counting.
     * @param total - the units of work in all
     */
    constructor(total: number) {
        this.#total = Math.max(1, total);
    }

    /**
     * Count some work.
     * @param units - how many units were just done
     * @returns how far the work has got when it is time to pause, else null
     */
    add(units: number): number | null {
        this.#done += units;
        if (this.#done < this.#pause) {
            return null;
        }
        this.#pause = this.#done + ORDER_STEP;
        return this.#done / this.#total;
    }
}

/**
 * The comparison a sort uses: absent values last, then by value, then by graph order.
 * @param values - each position's value
 * @param descending - true for largest first
 * @returns compares two positions
 */
function positionOrder(values: readonly unknown[], descending: boolean): (x: number, y: number) => number {
    const direction = descending ? -1 : 1;
    return (x, y) => {
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
    };
}

/**
 * Sort each short run of positions in place, by insertion.
 * @param positions - the positions
 * @param compare - the comparison
 * @param work - the work count
 * @yields how far the work has got, from 0 to 1
 */
function* sortRuns(
    positions: Uint32Array,
    compare: (x: number, y: number) => number,
    work: SortWork,
): Generator<number, void, void> {
    for (let start = 0; start < positions.length; start += SORT_RUN) {
        const end = Math.min(start + SORT_RUN, positions.length);
        for (let at = start + 1; at < end; at++) {
            const moving = positions[at] ?? 0;
            let before = at - 1;
            while (before >= start && compare(positions[before] ?? 0, moving) > 0) {
                positions[before + 1] = positions[before] ?? 0;
                before--;
            }
            positions[before + 1] = moving;
        }
        const fraction = work.add(end - start);
        if (fraction !== null) {
            yield fraction;
        }
    }
}

/**
 * Merge two sorted neighboring runs of `from` into the same place in `to`.
 * @param from - the positions, sorted in runs
 * @param to - where the merged run goes
 * @param range - where the left run starts, where the right run starts, and where it ends
 * @param range.start - the left run's first place
 * @param range.middle - the right run's first place
 * @param range.end - one past the right run's last place
 * @param compare - the comparison
 * @param work - the work count
 * @yields how far the work has got, from 0 to 1
 */
function* mergeRuns(
    from: Uint32Array,
    to: Uint32Array,
    range: { readonly start: number; readonly middle: number; readonly end: number },
    compare: (x: number, y: number) => number,
    work: SortWork,
): Generator<number, void, void> {
    const { start, middle, end } = range;
    let left = start;
    let right = middle;
    for (let out = start; out < end; out++) {
        const takeLeft = right >= end || (left < middle && compare(from[left] ?? 0, from[right] ?? 0) <= 0);
        to[out] = (takeLeft ? from[left++] : from[right++]) ?? 0;
        const fraction = work.add(1);
        if (fraction !== null) {
            yield fraction;
        }
    }
}

/**
 * Sort rows by a value, absent values last, keeping graph order among equals.
 *
 * A merge sort that pauses every few thousand rows, yielding how far it has got from 0 to 1, so
 * `data.preparePage` can spread a long sort over many tasks; drained at once, it is the sort a page
 * reads. The comparison breaks every tie by graph order, so the order is the same however it is run.
 * @param rows - the rows, in graph order
 * @param sort - the direction and what a row sorts by
 * @param sort.descending - true to sort largest first
 * @param sort.value - what a row sorts by
 * @yields how far the sort has got, from 0 to 1
 * @returns the sorted rows
 */
function* sortRows(
    rows: readonly number[],
    sort: { readonly descending: boolean; value(index: number): unknown },
): Generator<number, Uint32Array, void> {
    const count = rows.length;
    const passes = count <= SORT_RUN ? 0 : Math.ceil(Math.log2(count / SORT_RUN));
    // Reading the values, sorting the runs, then one unit per row per merge pass.
    const work = new SortWork(count * (2 + passes));
    const values: unknown[] = Array.from({ length: count });
    for (let position = 0; position < count; position++) {
        values[position] = sort.value(rows[position] ?? 0);
        const fraction = work.add(1);
        if (fraction !== null) {
            yield fraction;
        }
    }

    const compare = positionOrder(values, sort.descending);
    let from = Uint32Array.from(rows, (_row, position) => position);
    yield* sortRuns(from, compare, work);
    let to = new Uint32Array(count);
    for (let width = SORT_RUN; width < count; width *= 2) {
        for (let start = 0; start < count; start += 2 * width) {
            const range = { start, middle: Math.min(start + width, count), end: Math.min(start + 2 * width, count) };
            yield* mergeRuns(from, to, range, compare, work);
        }
        [from, to] = [to, from];
    }

    return Uint32Array.from(from, (position) => rows[position] ?? 0);
}

/**
 * Run an order's steps to the end at once.
 * @param steps - the order's steps
 * @returns the order
 */
function drain<T>(steps: Generator<number, T, void>): T {
    for (;;) {
        const step = steps.next();
        if (step.done === true) {
            return step.value;
        }
    }
}

/**
 * An order with its rows ranked by how well they match, keeping the order within a rank (the
 * sort is stable).
 * @param steps - the order's steps
 * @param ranked - the best match of each row
 * @yields the progress of the order underneath
 * @returns the ranked order
 */
function* rankFirst(
    steps: Generator<number, Uint32Array, void>,
    ranked: (index: number) => RecordMatch | undefined,
): Generator<number, Uint32Array, void> {
    const rows = yield* steps;
    const place = { exact: 0, "starts-with": 1, contains: 2 } as const;
    const rankOf = (row: number): number => place[ranked(row)?.rank ?? "contains"];
    return Uint32Array.from(Array.from(rows).sort((a, b) => rankOf(a) - rankOf(b)));
}

/**
 * Hand the thread back to the host for one task, so input and drawing run between two slices.
 * @returns settles on the next task
 */
function nextTask(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
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
    /** The visible graph's shape, with the masks it was measured under. */
    visible?: { readonly masks: VisibleMasks; readonly statistics: GraphStatistics };
}

/** The visible masks, one read-only copy per membership, so identity says nothing moved. */
interface VisibleMasks {
    readonly nodes: ElementMask<NodeId>;
    readonly edges: ElementMask<EdgeId>;
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
        kind: "nodeKindPath",
        ...LOCATION_KIND_FIELDS,
        x: "nodeXPath",
        y: "nodeYPath",
        z: "nodeZPath",
    },
    edge: {
        source: "edgeSrcIdPath",
        target: "edgeDstIdPath",
        weight: "edgeWeightPath",
        time: "edgeTimePath",
        edgeId: "edgeIdPath",
        kind: "edgeKindPath",
    },
};

/**
 * The roles a column of each kind can take, facts only, in no particular order (an application
 * orders and names them): `inPlace`, the roles `data.setRole` gives a column of rows already
 * loaded; `atLoad`, the roles the rows are made from, which take effect only when the rows are
 * read again with the column in that role (`data.reloadSource` with a mapping).
 */
export const COLUMN_ROLES: Readonly<
    Record<
        "node" | "edge",
        {
            /** The roles `data.setRole` gives a column of rows already loaded, taking effect at once. */
            readonly inPlace: readonly ColumnRole[];
            /** The roles that take effect only when the rows are read again (`data.reloadSource` with a mapping). */
            readonly atLoad: readonly ColumnRole[];
        }
    >
> = Object.freeze({
    node: rolesOf("node", "nodes"),
    edge: rolesOf("edge", "edges"),
});

/**
 * One kind's `COLUMN_ROLES`.
 * @param kind - The kind of column.
 * @param table - The kind's table, as `LOAD_ROLES` names it.
 * @returns The roles it takes in place and at load.
 */
function rolesOf(
    kind: "node" | "edge",
    table: "nodes" | "edges",
): { readonly inPlace: readonly ColumnRole[]; readonly atLoad: readonly ColumnRole[] } {
    const structural = (role: ColumnRole): boolean => role === "key" || STRUCTURAL_EDGE_ROLES.has(role);
    const inPlace = (Object.keys(ROLE_FIELDS[kind]) as ColumnRole[]).filter((role) => !structural(role));
    const atLoad = LOAD_ROLES[table].takes.filter((role) => !inPlace.includes(role));
    return Object.freeze({ inPlace: Object.freeze(inPlace), atLoad: Object.freeze(atLoad) });
}

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
 * A query source's params with the `mode` it read in, when they leave it out: graph-io's Cypher and
 * SPARQL sources read the query when one is given and everything otherwise.
 * @param source - The source id.
 * @param config - The params.
 * @returns The params, with `mode` when the source declares one.
 */
function withStartMode(source: string, config: Record<string, unknown>): Record<string, unknown> {
    const declared = sourceDescriptors()
        .find((entry) => entry.id === source)
        ?.descriptor.params.find((param) => param.name === "mode");
    if (declared === undefined || typeof config.mode === "string") {
        return config;
    }

    const asked = typeof config.query === "string" && config.query.trim() !== "" ? "query" : "all";
    return declared.values?.some((each) => each.value === asked) === true ? { ...config, mode: asked } : config;
}

/** The session edge ids of a graph no step built an edge of. */
const NO_EDGE_IDS: Readonly<Record<string, EdgeId>> = Object.freeze({});
/** Refreshes a source a version 2 open held, or gives undefined for a key it does not hold. */
type HeldRefresh = (load: string, options: SourceLoadOptions) => Promise<SourceRefreshReport | undefined>;

/**
 * The session's view of the graph data.
 *
 * It reads a store it does not own the lifetime of, so every answer starts from
 * `wholeGraph(store)` rather than from a snapshot held here: the store is free to replace the
 * snapshot, and a data surface holding the old one would answer confidently about a graph that
 * no longer exists.
 */
export class SessionData implements SessionDataApi {
    /** The store, read-only: its snapshot is a consumer's, and its coordinates cannot be written. */
    readonly store: SessionGraphStore;

    /** The store itself, which the session's own readers read. */
    private readonly graphStore: LaneStore;
    private readonly records: SessionRecordSource | null;
    private readonly readConfig: () => SessionDataConfig;
    private readonly writes: DataWrites;
    private readonly pages: PageSources;
    private derived: Derived | null = null;
    /** The statistics of each working graph view read, kept while the view is. */
    private readonly viewStatistics = new WeakMap<WorkingView, GraphStatistics>();
    /** The columns' figures over what one view shows, and the whole graph's columns they were laid on. */
    private readonly viewColumns = new WeakMap<
        WorkingView,
        { readonly whole: readonly AttributeDescriptor[]; readonly shown: readonly AttributeDescriptor[] }
    >();
    /** The draft `prepare` returned last, until it is loaded or disposed: one is held at a time. */
    private heldDraft: Draft | null = null;
    /** The draft of the sources and steps open now, under the source-steps experiment. */
    private sourceDraft: SourceDraftHandle | null = null;
    /**
     * While a drawn draft's After is on the graph: the session id of every edge its build makes, by
     * built id, the ones only the draft makes included. Null otherwise.
     */
    private afterEdgeIds: Readonly<Record<string, EdgeId>> | null = null;
    /** While After is drawn, the report its commit would leave, as {@link drawnReport} reads it. */
    private afterReport: LoadReport | null = null;
    /** The drawn draft's edge marks by session id, kept for the marks and edge ids they came from. */
    private shownMarks: {
        readonly marks: DraftMarks;
        readonly ids: Readonly<Record<string, EdgeId>>;
        readonly edges: ReadonlyMap<string, DraftMark>;
    } | null = null;
    /** Row orders computed for pages, by what they were asked with, for the current revision. */
    private readonly orders: RevisionCache<Uint32Array>;
    /** The last few neighbor lists, by node and options, for the current revision. */
    private readonly neighborLists: RevisionCache<NeighborList>;
    /** The attribute walk, for the current data revision. */
    private readonly attributeCache: RevisionCache<{
        readonly columns: readonly AttributeDescriptor[];
        /** Under source-steps, the readable paths the build writes on each record. */
        readonly readable: readonly AttributeDescriptor[];
    }>;
    /** Whether an edge column of a name exists, for the current data revision. */
    private readonly edgeColumns: RevisionCache<boolean>;
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
    /** `sources()` without the staged sources, and the full list it was filtered from. */
    private inGraphMemo: { readonly all: readonly LoadedSource[]; readonly result: readonly LoadedSource[] } | null =
        null;
    /** `staged()`, and the full list it was filtered from. */
    private stagedMemo: { readonly all: readonly LoadedSource[]; readonly result: readonly LoadedSource[] } | null =
        null;
    /** `sources()` with its counts, and what they were counted from. */
    private sourcesMemo: {
        readonly stored: readonly LoadedSource[];
        readonly provenance: Provenance | undefined;
        readonly snapshot: GraphSnapshot;
        readonly ledger: object;
        readonly copyTick: number;
        readonly result: readonly LoadedSource[];
    } | null = null;
    /** Moves whenever a load's copy choice does, so `sources()` lists it again. */
    private copyTick = 0;
    /**
     * What each file load this session read was read from, by the token its `data.import`
     * command and its `sources()` entry carry (`input`), for `reloadSource`. Memory only: a file is
     * never saved in a project, so an opened project's token resolves to nothing.
     */
    private readonly kept = new Map<string, DataSourceInput>();
    private keptSerial = 0;
    /** What the last open read each reference from again, by load key: those loads are reloadable. */
    private openedInputs: ReadonlyMap<string, DataSourceInput> = new Map();
    /**
     * The bytes of each kept file, by its `kept` token, once read: what autosave keeps so the
     * reader's own work, restored, can still read each load again (issue #9848).
     */
    private readonly keptBytes = new Map<string, Uint8Array>();
    /** Each kept input as autosave writes it, by `kept` token, built once. */
    private readonly keptSaved = new Map<string, SavedInput>();
    /**
     * The rows a draft read from each source, so `remap` and `reloadSource` read a load again
     * without opening its file or fetching its URL. ponytail: held as long as the source is,
     * which `kept` never lets go of; drop rows of loads no longer listed if memory shows up.
     */
    private readonly reads = new WeakMap<DataSourceInput, ReadSource>();
    /** The loads whose rows carry each column, and what they were read from. */
    private columnSourcesMemo: {
        readonly described: readonly AttributeDescriptor[];
        readonly provenance: Provenance | undefined;
        readonly result: ReadonlyMap<string, readonly SourceKey[]>;
    } | null = null;
    private disposed = false;
    private heldRefresh: HeldRefresh | undefined;
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
        store: LaneStore,
        records: SessionRecordSource | null,
        readConfig: () => SessionDataConfig,
        writes: DataWrites,
        pages: PageSources,
    ) {
        this.graphStore = store;
        this.store = readonlyStore(store);
        this.records = records;
        this.readConfig = readConfig;
        // Under the source-steps experiment every load that holds its rows is dispatched as a
        // source plus `join.add` (`data.steps-set`), whichever door sent it.
        const compiled = <C extends SessionCommand>(command: C): C =>
            pages.sourceSteps?.() === true ? (compileCommand(command, {}, readConfig().knownFields) as C) : command;
        this.writes = {
            ...writes,
            importer: (options) => {
                const send = writes.importer(options);
                return (command) => send(compiled(command));
            },
            ...(writes.send === undefined
                ? {}
                : {
                      send: (command: SessionCommand, stamp?: LoadStamp) =>
                          (writes.send as NonNullable<DataWrites["send"]>)(compiled(command), stamp),
                  }),
        };
        this.loadLine = writes.loadLine;
        this.pages = pages;
        this.orders = new RevisionCache(() => pages.revision());
        this.neighborLists = new RevisionCache(() => pages.revision(), NEIGHBOR_LISTS_KEPT);
        this.attributeCache = new RevisionCache(() => pages.dataRevision());
        this.edgeColumns = new RevisionCache(() => pages.dataRevision());
        // Autosave keeps an open source draft with the work and opens it again after a restore.
        setSourceDraftHooks(this, {
            saved: () => this.sourceDraft?.saved() ?? null,
            reopen: (saved) => this.reopenDraft(saved),
        });
    }

    /**
     * Open again a source draft autosave kept, drawn as it was.
     * @param saved - The draft as autosave kept it.
     * @returns False when it could not be: the experiment is off, a draft is open, or the rows it
     *   read are gone.
     */
    private async reopenDraft(saved: SavedSourceDraft): Promise<boolean> {
        if (!this.stepsOn() || this.sourceDraft !== null) {
            return false;
        }
        this.draft({ askOverlap: saved.askOverlap });
        const draft = this.sourceDraft as SourceDraftHandle | null;
        if (draft === null) {
            return false;
        }
        if (!draft.restore(saved)) {
            draft.dispose();
            return false;
        }
        if (saved.shown.on) {
            await draft.display(true);
            await draft.show(saved.shown.side);
        }
        return true;
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
     * Load a graph from column arrays, as one undoable step: the nodes, then the edges.
     * @param columns - The columns.
     * @returns The load's report, once the rows are in the graph and drawn.
     */
    async importColumns(columns: ImportColumnsInput): Promise<LoadReport> {
        this.requireLive("importColumns");
        if (this.stepsOn()) {
            await this.importColumnsAsSource(columns);
            return this.lastImport() as LoadReport;
        }
        // A batched graph keeps the records it builds, so the slice keeps them as they are, not a copy.
        const [nodes, edges] = columnMutations(columns, this.pages.batched?.() === true);
        const send = this.writes.importer();
        await this.loadLine.edit(
            () =>
                send({
                    op: "batch",
                    label: "Set the graph data",
                    fact: { code: "data.set", params: {} },
                    steps: [
                        { op: "data.apply", mutation: nodes },
                        { op: "data.apply", mutation: edges },
                    ],
                }),
            undefined,
        );
        // The edge add seals a report even for no edges, so a report is always there.
        return this.lastImport() as LoadReport;
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
     * Merge nodes into one, as one undoable step: every edge of a merged node moves to the kept
     * node, the kept node takes `options.values`, and the other nodes are removed.
     * @param ids - the nodes to merge; an integer id may be written either way
     * @param options - which node is kept, and the values it takes
     * @returns settles once the merge is drawn
     * @throws A `GraphtyError` with `E_BAD_COMMAND` when an id is not a node the graph holds.
     */
    async mergeNodes(ids: readonly NodeId[], options: MergeNodesOptions = {}): Promise<void> {
        this.requireLive("mergeNodes");
        // Section 11: merging two nodes by hand under the source-steps experiment comes later.
        this.refuseUnderSteps("mergeNodes");
        if (!Array.isArray(ids)) {
            throw mergeRefusal("ids is not an array");
        }

        const send = this.writes.importer();
        await this.loadLine.edit(() => {
            const command = this.mergeCommand(ids, options);
            return command === null ? Promise.resolve() : send(command);
        }, undefined);
    }

    /**
     * The step `mergeNodes` dispatches, read from the graph as it is when its turn comes.
     * @param ids - the nodes to merge
     * @param options - which node is kept, and the values it takes
     * @returns the command, or null when fewer than two nodes are named
     */
    private mergeCommand(ids: readonly NodeId[], options: MergeNodesOptions): BatchCommand | null {
        const snapshot = this.current();
        const rowOf = (id: NodeId): number => {
            const row = rowOfEitherSpelling(snapshot.ids, id);
            if (row === INVALID_INDEX) {
                throw mergeRefusal(`${JSON.stringify(id)} is not a node the graph holds`);
            }

            return row;
        };
        const rows = new Set(ids.map(rowOf));
        const keptRow = rowOf(options.into ?? ids[0]);
        rows.delete(keptRow);
        if (rows.size === 0) {
            return null;
        }

        const kept = snapshot.ids.idOf(keptRow);
        const endOf = (row: number): NodeId => (rows.has(row) ? kept : snapshot.ids.idOf(row));
        const touching: { attributes: Readonly<Record<string, unknown>>; source: NodeId; target: NodeId }[] = [];
        for (let edge = 0; edge < snapshot.edgeCount; edge++) {
            const from = snapshot.edgeSource(edge);
            const to = snapshot.edgeTarget(edge);
            if (rows.has(from) || rows.has(to)) {
                touching.push({
                    attributes: this.records?.edgeAttributes(edge) ?? {},
                    source: endOf(from),
                    target: endOf(to),
                });
            }
        }

        // A record is read without the keys naming its ends, so the moved one is written back with
        // them under the keys the last load read ends from: that load's report keeps reading every
        // other edge's record the same way. Ends read through a nested path are written as
        // `source` and `target`.
        const spelling = this.lastImport()?.endpoints ?? { source: "source", target: "target" };
        const endpoints = {
            source: BARE_KEY.test(spelling.source) ? spelling.source : "source",
            target: BARE_KEY.test(spelling.target) ? spelling.target : "target",
        };
        const moved = touching.map((each) => ({
            ...each.attributes,
            [endpoints.source]: each.source,
            [endpoints.target]: each.target,
        }));
        const merged = [...rows].map((row) => snapshot.ids.idOf(row));
        return mergeNodesCommand(kept, options.values, merged, moved, endpoints);
    }

    /**
     * Remove every node, edge, record and graph-level value, as one undoable step.
     * @returns settles once the graph and the picture are empty
     */
    async clear(): Promise<void> {
        this.requireLive("clear");
        this.discardDraft();
        // A load still reading when the clear is asked for is canceled: it rejects with
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
     * @returns Settles once it is applied, or canceled by a clear.
     */
    private edit(mutation: DataMutation): Promise<unknown> {
        checkMutation(mutation);
        if (this.stepsOn()) {
            const send = this.writes.importer();
            return this.loadLine.edit(() => {
                const { knownFields } = this.readConfig();
                // The configured end columns, as the off path's ingest reads them.
                const ops = readerOps(mutation, this.stepsValue(), this.stepsCopies(), this.stepsEdgeIds(), {
                    nodeIdPath: knownFields.nodeIdPath,
                    ...(knownFields.edgeSrcIdPath === null ? {} : { source: knownFields.edgeSrcIdPath }),
                    ...(knownFields.edgeDstIdPath === null ? {} : { target: knownFields.edgeDstIdPath }),
                });
                // Under the off path's label and fact, so the history reads the same edit the same way.
                return ops.length === 0
                    ? Promise.resolve()
                    : send({
                          op: "data.steps-set",
                          edit: { kind: "reader", ops },
                          as: { label: mutationLabel(mutation), fact: mutationFact(mutation) },
                      });
            }, undefined);
        }
        const send = this.writes.applier();
        const routed = this.throughColumns(mutation);
        return this.loadLine.edit(() => send(routed), undefined);
    }

    /**
     * Under `"batched"`, read an eligible add of records into columns, so the graph keeps no record
     * object per row (row-renderer.md 4.6, stage 29); anything else goes as it came.
     * @param mutation - The checked mutation.
     * @returns The mutation to dispatch.
     */
    private throughColumns(mutation: DataMutation): DataMutation {
        if ((mutation.kind !== "add-nodes" && mutation.kind !== "add-edges") || this.pages.batched?.() !== true) {
            return mutation;
        }

        const { knownFields } = this.readConfig();
        const edges =
            mutation.kind === "add-edges"
                ? {
                      repeated: mutation.repeated ?? knownFields.repeatedEdges,
                      weight: mutation.weight ?? knownFields.edgeWeightPath,
                  }
                : undefined;
        const path = columnsEligible({ batched: true, records: mutation.records, edges });
        return path.code === "PATH_COLUMNS"
            ? { ...mutation, records: rowsView(recordsSource(mutation.records)) }
            : mutation;
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

        // Refused before anything is read, a network source's fetch included.
        if (asksFileStyles({ ...options, source }) && this.pages.fileStyles?.() === false) {
            throw featureOff("file-styles", "styles");
        }

        // An abort stops the load wherever it is -- waiting for its turn, reading the file or the
        // URL, or between two chunks -- and the import rejects with the caller's own reason; the
        // dispatcher reverts what it wrote, so the graph and the history are as they were.
        const { signal } = options;
        signal?.throwIfAborted();
        const turn = this.loadLine.join(signal);
        try {
            if (source.source !== undefined) {
                await (
                    await import("./sources/load")
                ).importSource(this.hostInTurn(turn), { ...source, source: source.source }, options);
                return;
            }

            // Taken before the first await: a transaction routes only what a verb dispatches
            // synchronously, and detecting the format may have to read the file or fetch the URL.
            await this.importVia(
                this.keeping(
                    this.writes.importer({ ...(signal === undefined ? {} : { signal }), ...loadStampOf(options) }),
                    source,
                ),
                source,
                options,
                turn,
            );
        } catch (error) {
            // The dispatcher rejects a withdrawn command with its own AbortError.
            throw signal?.aborted === true ? signal.reason : error;
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
        const blob = fileOf(source.config.file);
        if (blob !== null) {
            blob.slice(0, blob.size)
                .arrayBuffer()
                .then((buffer) => {
                    this.keptBytes.set(token, new Uint8Array(buffer));
                    // The autosave writes the data part again, now with this file in it.
                    for (const listener of this.ledger.changed) {
                        listener();
                    }
                })
                .catch(() => undefined);
        }
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
     * Load a generated graph from the catalog, as one undoable step.
     * @param name - The generator's name.
     * @param params - Its parameters; each one left out takes its catalog default.
     * @param options - Whether to replace the graph (the default) or add to it.
     * @returns Settles once the graph is loaded.
     */
    async generate(name: string, params: GeneratorParams = {}, options: ImportOptions = {}): Promise<void> {
        this.requireLive("generate");
        const send = this.writes.importer(loadStampOf(options));
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
            const load = this.sampleLoad(graph, name, options);
            await this.importVia(send, load.source, options, turn, {
                ...load,
                facts: { generator: name, params: { ...params } },
                catalog: { generatorId: name },
            });
        } finally {
            turn.leave();
        }
    }

    /**
     * Download a sample dataset from the catalog and load it, as one undoable step.
     * @param name - The dataset's name.
     * @param options - The import mode, a mirror to download from, and a signal.
     * @returns Settles once the graph is loaded.
     */
    async loadDataset(name: string, options: DatasetLoadOptions = {}): Promise<void> {
        this.requireLive("loadDataset");
        const send = this.writes.importer(loadStampOf(options));
        const { baseUrl, signal, ...load } = options;
        // The element names no host of its own: the caller says where the files are published
        // (graph-samples exports its own default as `DEFAULT_DATASET_BASE_URL`).
        if (baseUrl === undefined || baseUrl === "") {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: "loadDataset needs a baseUrl.",
                source: "data",
                details: {
                    option: "baseUrl",
                    name,
                    suggestion: { package: "@graphty/graph-samples", export: "DEFAULT_DATASET_BASE_URL" },
                },
            });
        }
        // Its place in line is taken now, so a load asked for later waits for this download; an
        // abort while it waits for its turn stops it there and lets the next load through.
        const turn = this.loadLine.join(signal);
        try {
            let snapshot: GraphSnapshot;
            // The status of the answer, kept here so a failure can say whether a retry could help.
            let status: number | undefined;
            // Every body read, in order, so the dataset's copy id is the digest of its bytes.
            const bodies: Promise<ArrayBuffer>[] = [];
            const watched: typeof fetch = async (input, init) => {
                const response = await fetch(input, init);
                ({ status } = response);
                if (response.ok) {
                    bodies.push(response.clone().arrayBuffer());
                }

                return response;
            };
            try {
                snapshot = await fetchDataset(name, { baseUrl, signal, fetch: watched });
            } catch (error) {
                throw datasetError(name, baseUrl, signal, status, error);
            }
            // Named as the catalog names it ("Doubtful Sound dolphins", not "dolphins"); a dataset the catalog does not
            // list (a mirror's own) by its name.
            const title = DATASETS.find((each) => each.name === name)?.title ?? name;
            const sample = this.sampleLoad(snapshot, title, load);
            await this.importVia(send, sample.source, load, turn, {
                ...sample,
                facts: { dataset: name, baseUrl },
                catalog: { datasetId: name },
                url: {
                    sha256: await sha256Hex(joined(await Promise.all(bodies))),
                    fetchedAt: new Date().toISOString(),
                },
            });
        } finally {
            turn.leave();
        }
    }

    /**
     * What a generated graph or a dataset loads as: a JSON source of graph-samples' records for it.
     * Under the "batched" render path the records are handed to the import as held rows instead,
     * so no JSON text of the graph is written and read back (row-renderer.md 4.6, "The typed door"),
     * unless a choice that reads the source through a draft is given.
     * @param graph - The graph.
     * @param name - What the source is called.
     * @param options - The load's choices.
     * @returns The source, the column that names its nodes, and the held rows when handed over.
     */
    private sampleLoad(graph: SampleGraph | GraphSnapshot, name: string, options: LoadChoices): SampleLoad {
        const data = toElementData(graph) as {
            nodes: readonly Record<string, unknown>[];
            edges: readonly Record<string, unknown>[];
        };
        // Left off a command whose dataset marks none, so its step reads as before.
        const marked = "src" in graph ? [] : fixedIdsOf(graph);
        const fixed = marked.length === 0 ? undefined : marked;
        if (!("src" in graph)) {
            placeFromDrawing(graph, data.nodes);
        }
        const label = LABEL_COLUMNS.find((column) => data.nodes.some((node) => typeof node[column] === "string"));
        if (this.pages.batched?.() !== true || readsThroughDraft(options)) {
            const json = JSON.stringify({ directed: graph.directed, ...data });
            return { source: { type: "json", name, config: { data: json } }, label, fixed };
        }

        const held: HeldRows = {
            ...data,
            // What the JSON source declares for the `directed` key the records' document carries.
            declaredDirection: {
                directed: graph.directed,
                statedBy: `"directed": ${String(graph.directed)}`,
                conflictingEdges: 0,
            },
            errors: [],
            errorLimit: SAMPLE_ERROR_LIMIT,
        };
        return { source: { type: "json", name, config: {} }, label, held, fixed };
    }

    /**
     * The body of `import`, dispatching through an importer taken before any await.
     * @param dispatch - The importer, taken when the verb was called.
     * @param source - What `import` takes.
     * @param options - What `import` takes.
     * @param turn - The load's place in line, taken when the verb was called: it dispatches only
     *   once every load asked for before it has.
     * @param sample - For a generated graph or a dataset: what it was, the column that names its
     *   nodes, and its rows when they are handed over instead of read from the source.
     * @returns Settles once the last chunk is in the graph.
     */
    private async importVia(
        dispatch: (command: DataImportCommand | BatchCommand) => Promise<unknown>,
        source: DataSourceInput,
        options: LoadChoices & Pick<SourceLoadOptions, "existing" | "signal">,
        turn: LoadTurn,
        sample?: SampleLoad & {
            readonly facts: LoadFacts["sample"];
            readonly catalog: NonNullable<SourceLoaded["sample"]>;
            readonly url?: LoadFacts["url"];
        },
    ): Promise<void> {
        let resolvedConfig: Readonly<Record<string, unknown>> = source.config;
        const origin: LoadedSourceKind | undefined = sample === undefined ? undefined : "sample";
        const chosenOrigin = origin ?? options.origin;
        const noted = this.noting(
            dispatch,
            () =>
                sample === undefined
                    ? bytesFacts(resolvedConfig)
                    : Promise.resolve({
                          sample: sample.facts,
                          ...(sample.url === undefined ? {} : { url: sample.url }),
                      }),
            choiceOptions(options),
            {
                ...(sample === undefined ? {} : { sample: sample.catalog }),
                ...callerKeyOf(options),
            },
        );
        const mark = historyMark(options);
        const send = (command: DataImportCommand | BatchCommand): ReturnType<typeof noted> =>
            noted({ ...command, ...mark });
        // Refused here, before the waiting loads are let go: the dispatch would refuse it only after.
        const refusal = this.draftRefusal();
        if (refusal !== null) {
            throw refusal;
        }
        if ((options.mode ?? "replace") === "replace") {
            // A file, a URL, a generated graph or a dataset replacing the graph replaces what its source loads brought too; their
            // records stay in the ledger, unlisted, so undoing the replacement lists them again.
            this.pendingLoads.clear();
        }
        this.heldDraft?.dispose();
        if (readsThroughDraft(options) || (this.stepsOn() && sample?.held === undefined)) {
            const draft = await this.prepare(source, options.signal === undefined ? {} : { signal: options.signal });
            try {
                // The bytes the rows were read from name their copy (a dataset's are its download).
                const bytes = sample === undefined ? await copyDigest(source.config) : sample.url?.sha256;
                const digest = this.stepsOn() ? bytes : undefined;
                await turn.wait();
                const read = this.stepsOn() ? withStepsMapping(options) : options;
                await draft.loadVia((command) => turn.issue(() => send(withDigest(command, digest))), read);
            } finally {
                draft.dispose();
            }

            return;
        }

        // Dispatched at once whenever nothing has to be read to settle the format, so the load
        // takes its turn in the order it was asked for.
        const resolving = resolveImportSource(source, options.signal);
        const resolved = resolving instanceof Promise ? await resolving : resolving;
        resolvedConfig = resolved.config ?? source.config;
        // Waited for only when a load asked for earlier is still reading, so one with nothing
        // ahead of it dispatches before this call returns, as it did before the line existed.
        await turn.take(() => {
            const step: DataImportCommand = {
                ...importCommand(resolved, options, sample?.held),
                ...(sample?.fixed === undefined ? {} : { fixed: sample.fixed }),
                ...(chosenOrigin === undefined ? {} : { origin: chosenOrigin }),
                ...(this.stepsOn() ? { choices: stepsChoices(options) } : {}),
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
            const label = sample === undefined ? fileLabel : sample.label;
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
     * @param loaded - What the load door knows beside the source list, for `source:loaded`.
     * @returns The dispatch.
     */
    private noting(
        send: (command: DataImportCommand | BatchCommand) => Promise<unknown>,
        read: () => Promise<Partial<LoadFacts>>,
        options: Readonly<Record<string, unknown>> | undefined,
        loaded: DoorFacts,
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
                this.publishAdded(before, facts.mode, loaded);
            }

            return result;
        };
    }

    /**
     * Run a load the renderer dispatches itself -- `Graph.addDataFromSource`, `loadFromFile` and
     * `loadFromUrl`, and so the `data-source` attribute -- and publish `source:loaded` for every
     * source it added, as this surface's own load doors do.
     * @param mode - Whether the load replaces the graph or merges into it.
     * @param load - The load; it dispatches before it returns its promise.
     * @returns What the load settled with.
     */
    async announcing<T>(mode: "replace" | "merge", load: () => Promise<T>): Promise<T> {
        const before = new Set(this.storedSources().map((each) => each.key));
        const result = await load();
        this.publishAdded(before, mode, {});
        return result;
    }

    /**
     * Publish `source:loaded` for one source a load door added (or `replaceSource` and
     * `reloadSource` replaced in place), once its load committed. Only the doors (and the
     * renderer's loads, through `announcing`) call it: a project open, undo, redo, restore and `runPendingSourceLoad` never do.
     * @param record - The source as `sources()` lists it, so the event never disagrees with it.
     * @param mode - Whether the load replaced the graph or merged into it.
     * @param facts - What the door knows beside the source list.
     */
    private publishLoaded(record: LoadedSource, mode: "replace" | "merge", facts: DoorFacts): void {
        const { kind, type } = record;
        const format = (kind === "file" || kind === "url") && type !== undefined && type !== "" ? type : undefined;
        const loaded: SourceLoaded = {
            source: record.key,
            kind,
            mode,
            ...(format === undefined ? {} : { format }),
            ...(facts.sourceId === undefined ? {} : { sourceId: facts.sourceId }),
            ...(facts.sample === undefined ? {} : { sample: Object.freeze({ ...facts.sample }) }),
            ...(facts.callerKey === undefined ? {} : { callerKey: facts.callerKey }),
            ...(facts.replaced === undefined ? {} : { replaced: facts.replaced }),
        };
        this.writes.emit?.("source:loaded", Object.freeze(loaded));
    }

    /**
     * Publish `source:loaded` for every source the graph lists now and did not list before.
     * @param before - The keys listed before the load dispatched.
     * @param mode - Whether the load replaced the graph or merged into it.
     * @param facts - What the door knows beside the source list.
     */
    private publishAdded(before: ReadonlySet<SourceKey>, mode: "replace" | "merge", facts: DoorFacts): void {
        const listed = this.sources();
        for (const each of this.storedSources()) {
            const record = before.has(each.key) ? undefined : listed.find((entry) => entry.key === each.key);
            if (record !== undefined) {
                this.publishLoaded(record, mode, facts);
            }
        }
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
        const several = this.severalStepsSources("expand");
        if (several !== null) {
            return Promise.reject(several);
        }

        // In line, as a load: its rows are dispatched after every load asked for before it, and a
        // load asked for after it waits for all of them, so it never adds to the graph that load
        // replaced (issue #3382).
        return this.inLine(
            options.signal,
            (host) => import("./sources/expand").then((module) => module.expandNodes(host, ids, options)),
            true,
        );
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
            source: this.listed().find((each) => each.loadKey === load.key)?.key ?? null,
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
        const several = this.severalStepsSources("collapse");
        if (several !== null) {
            return Promise.reject(several);
        }

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
        const several = this.severalStepsSources("more");
        if (several !== null) {
            return Promise.reject(several);
        }

        return this.inLine(options.signal, (host) =>
            import("./sources/load").then((module) => module.more(host, options)),
        );
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
     * Read one of a source's examples and change nothing: nothing is drawn, recorded or added to
     * history. Pass the result to `import`, on this session or another, and
     * it loads without reading the service again. Refuses what the renderer could not draw
     * (`E_TOO_LARGE`) here, before anything is opened for it.
     * @param source - The source id.
     * @param example - The example's id within that source.
     * @param options - Anything `import` takes; the import that takes the read keeps them.
     * @returns The read and how many nodes and edges it holds.
     */
    readExample(source: string, example: string, options: SourceLoadOptions = {}): Promise<SourceRead> {
        this.requireLive("readExample");

        const host = this.sourceHost();
        return import("./sources/load").then((module) => module.readExample(host, source, example, options));
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
    async refresh(load: string, options: SourceLoadOptions = {}): Promise<SourceRefreshReport> {
        this.requireLive("refresh");

        // A source a version 2 open held is read again from its bytes; any other is a network load.
        const held = await this.heldRefresh?.(load, options);
        if (held !== undefined) {
            return held;
        }

        const host = this.sourceHost();
        return (await import("./sources/load")).refreshSource(host, load, options);
    }

    /**
     * Let `refresh` read a source a version 2 open held (the session lends what it needs).
     * @param refresh - Refreshes a held source, or gives undefined for a key it does not hold.
     */
    setHeldRefresh(refresh: HeldRefresh): void {
        this.heldRefresh = refresh;
    }

    /**
     * Load one of a source's examples (its descriptor's `examples`), as one undoable step.
     * @param source - The source id.
     * @param example - The example's id within that source.
     * @param options - Anything `import` takes.
     * @returns Settles once the example is in the graph.
     */
    async loadExample(source: string, example: string, options: LoadChoices & SourceLoadOptions = {}): Promise<void> {
        this.requireLive("loadExample");
        const turn = this.loadLine.join(options.signal);
        try {
            await (await import("./sources/load")).loadExample(this.hostInTurn(turn), source, example, options);
        } finally {
            turn.leave();
        }
    }

    /**
     * What a network load connects to and fetches, for showing it or filling a form to edit it.
     * The params are redacted as a saved file has them; no credential is in it.
     * @param key - the `sources()` entry's key
     * @returns the settings, or undefined for a source that is not a network load.
     */
    sourceSettings(key: SourceKey): SourceSettings | undefined {
        const load = this.listed().find((each) => each.key === key)?.loadKey;
        const record = this.ledger.loads().find((each) => each.key === load);
        if (record === undefined) {
            return undefined;
        }

        const { limits } = record.options as Pick<SourceSettings, "limits">;
        return frozen({
            source: record.source,
            endpoint: targetOf(record),
            config: withStartMode(record.source, redactedParams(record.config)),
            ...(record.expand === undefined ? {} : { expand: record.expand }),
            ...(limits === undefined ? {} : { limits }),
        });
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

        return this.inLine(options.signal, (host) =>
            import("./sources/load").then((module) => module.runPendingSourceLoad(host, id, options)),
        );
    }

    /**
     * What a load read: its bytes' digest, size and media type, a URL's validators, a sample's
     * dataset. Internal: the version 2 data section writes a source's origin and copy id from it.
     * @param key - The load's key.
     * @returns The facts, or undefined for a load with none recorded.
     */
    loadFactsOf(key: SourceKey): LoadFacts | undefined {
        return this.loadFacts.get(key);
    }

    /**
     * What a project file writes about the loads: the `graphty-sources` member (null when the graph
     * holds no load), what the save left out, and how each record's `_source.loads` is written.
     * Internal: the project file writes it.
     * @param references - What the entries of the referenced loads whose rows the save leaves out say.
     * @returns the member and its ids
     */
    sourceFile(references?: ReadonlyMap<SourceKey, ReferenceEntry>): SourcesWrite {
        // With references off every load is written as a copy, so the writer reads the facts without
        // `copy`. The facts it gives a load that had none go back into the session, so the next save
        // writes the same loadedAt.
        const facts = this.referencesOn()
            ? this.loadFacts
            : new Map([...this.loadFacts].map(([key, { copy: _copy, ...rest }]) => [key, rest]));
        const write = writeSourcesMember({
            sources: this.listed(),
            loads: this.loads(),
            facts,
            waiting: [...this.pendingLoads],
            provenance: this.provenance(),
            ...(references === undefined || references.size === 0 ? {} : { references }),
        });
        for (const [key, given] of facts) {
            if (!this.loadFacts.has(key)) {
                this.loadFacts.set(key, given);
            }
        }

        const skipped = this.skippedMember;
        // A member the file held and this release skipped goes back in place while the loads are
        // the ones the file opened with.
        if (skipped !== null && skipped.stored === this.writes.slice().values.get(SOURCES_VALUE)) {
            return { ...write, member: { ...skipped.member } };
        }

        // Under the source-steps experiment the member also carries the sources and steps (section 10).
        const steps = this.stepsOn() ? stepsMemberFields(this.stepsValue(), this.stepsCopies()) : null;
        if (steps !== null) {
            const member = write.member ?? { kind: SOURCE_RECORD_MEMBER, version: SOURCES_MEMBER_VERSION, loads: [] };
            const { nodes, edges } = elementsById(this.stepsBuild().result, this.stepsEdgeIds());
            const typeOf = (kind: "node" | "edge", id: NodeId | EdgeId): string | null =>
                (kind === "node" ? nodes.get(String(id)) : edges.get(id as EdgeId))?.type ?? null;
            return { ...write, member: { ...member, ...steps }, typeOf };
        }

        return write;
    }

    /**
     * Take what an opened project's `graphty-sources` member held: its network loads are recorded
     * and wait, fetching nothing, until `runPendingSourceLoad`. A project file cannot approve its
     * own fetches, so every load of an opened file waits. The reader's own work coming back (an
     * autosave, `project.open`'s `ownWork`): only the loads still waiting when it was written wait again.
     * Internal: the project file calls it once the project's graph is in.
     * @param read - what the member held, or undefined when the file holds none
     * @param autosave - whether the file is the reader's own work (`ProjectOpenOptions.ownWork`)
     */
    restoreSourceMember(read: SourcesRead | undefined, autosave = false): void {
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

        // The open published its graph before these choices came back: tell readers of `sources()`.
        this.copyTick++;
        for (const [key, facts] of read?.facts ?? []) {
            if (facts.copy === "reference" && this.referencesOn()) {
                this.writes.emit?.("source:copy", { source: key, copy: "reference" });
            }
        }

        // A member with no `waiting` list was written before the list existed: everything waits.
        const waiting = read?.waiting === undefined ? null : new Set(read.waiting);
        for (const record of this.ledger.loads()) {
            if (!autosave || waiting === null || waiting.has(record.key)) {
                this.pendingLoads.add(record.key);
            }
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
            dispatch: (command, stamp) =>
                hold
                    ? (turn.wait()?.then(() => host.dispatch(command, stamp)) ?? host.dispatch(command, stamp))
                    : turn.take(() => host.dispatch(command, stamp)),
        };
    }

    /**
     * Run a door that works out its change from the graph in the session's load line, as an
     * edit: it takes its place when called and reads the graph once every load asked for before
     * it has landed, so it changes what they loaded instead of what was there before them. A
     * clear asked for while it waits cancels it: it resolves with `skipped`, or by default
     * rejects with `E_SUPERSEDED`, since what it names is gone.
     * @param run - The door's work.
     * @param skipped - What a canceled door resolves with; rejects when not given.
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
            ceilings: () => writes.ceilings?.overrides,
            loads: () => this.loads(),
            sourceKeyOf: (load) => this.listed().find((each) => each.loadKey === load)?.key,
            ...(this.stepsOn()
                ? { refreshSteps: (load: string, tables: CopyTables) => this.refreshStepsSource(load, tables) }
                : {}),
            labelPath: () => this.readConfig().knownFields.nodeLabelPath,
            credentialSlotOf: (load) => {
                const key = this.listed().find((each) => each.loadKey === load)?.key;
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
            dispatch: (command, stamp) =>
                writes.send === undefined
                    ? Promise.reject(
                          new GraphtyError({
                              code: "E_INTERNAL",
                              source: "data",
                              message: "This session cannot dispatch a source command.",
                          }),
                      )
                    : writes.send(command, stamp),
            emit: (event, detail) => writes.emit?.(event, detail),
            sourceKeys: () => new Set(this.storedSources().map((each) => each.key)),
            loaded: (before, mode, facts) => {
                this.publishAdded(before, mode, facts);
            },
        };
    }

    /**
     * Read a source once and hold its rows, loading nothing until `draft.load()`.
     * @param source - What `import` takes.
     * @param options - How to read it.
     * @param options.signal - Abandons the read.
     * @param options.onto - `"graph"` holds the rows as a table to join onto the graph.
     * @param options.guess - `"values"` also reads the values when no header names the roles.
     * @param options.onProgress - Called with each change the read publishes.
     * @returns The draft.
     * @throws What `import` would reject with while reading, with the same code.
     */
    async prepare(
        source: DataSourceInput,
        options: {
            readonly signal?: AbortSignal;
            readonly onto?: "graph";
            readonly guess?: "names" | "values";
            readonly onProgress?: (change: ProgressChange) => void;
        } = {},
    ): Promise<Draft> {
        this.requireLive("prepare");
        this.heldDraft?.dispose();
        const read = await readWithProgress(source, options.signal, (change) => {
            this.writes.progress?.(change);
            options.onProgress?.(change);
        });
        this.reads.set(source, read);
        return this.draftOf(source, read, options);
    }

    /**
     * A draft over rows already read: what `prepare` hands back once it has read them.
     * @param source - What the rows were read from.
     * @param read - The rows.
     * @param options - As `prepare` takes them.
     * @param options.signal - Abandons reading the file's styles.
     * @param options.onto - `"graph"` holds the rows as a table to join onto the graph.
     * @param options.guess - How the roles are guessed.
     * @returns The draft.
     */
    private async draftOf(
        source: DataSourceInput,
        read: ReadSource,
        options: { readonly signal?: AbortSignal; readonly onto?: "graph"; readonly guess?: "names" | "values" } = {},
    ): Promise<Draft> {
        this.heldDraft?.dispose();
        // With the file styles experiment off a draft does not say what styles the file carries.
        const styles = this.pages.fileStyles?.() === false ? null : await draftStyles(read, options.signal);
        const draft = new Draft(
            read,
            {
                config: () => this.readConfig(),
                graph: () => {
                    const slice = this.writes.slice();
                    const snapshot = this.current();
                    const pairs = new Map<string, RepeatGroup[]>();
                    const note = (key: string, group: RepeatGroup): void => {
                        const held = pairs.get(key) ?? [];
                        held.push(group);
                        pairs.set(key, held);
                    };
                    for (let edge = 0; edge < snapshot.edgeCount; edge++) {
                        const source = snapshot.ids.idOf(snapshot.edgeSource(edge));
                        const target = snapshot.ids.idOf(snapshot.edgeTarget(edge));
                        // Its type and meaning, so the report reduces repeats as the load will.
                        const counter = snapshot.edges.value(EDGE_ID_COLUMN, edge);
                        const group: RepeatGroup =
                            typeof counter === "number"
                                ? {
                                      type: recordType(slice.edges.get(edgeIdOf(counter))),
                                      meaning: this.writes.edgeMeaning?.(counter),
                                  }
                                : { type: undefined, meaning: undefined };
                        note(pairKeyOf(source, target), group);
                        if (!snapshot.directed) {
                            note(pairKeyOf(target, source), group); // eslint-disable-line sonarjs/arguments-order -- the reverse pair, so an undirected edge matches either way
                        }
                    }
                    return { nodes: new Set(slice.nodes.keys()), edges: slice.edges.size, pairs };
                },
                inLine: async (run, choices) => {
                    const send = this.noting(
                        this.keeping(this.writes.importer(loadStampOf(choices ?? {})), source),
                        () => bytesFacts(source.config),
                        undefined,
                        callerKeyOf(choices ?? {}),
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
                    if (this.heldDraft === released) {
                        this.heldDraft = null;
                    }
                },
                ...(options.onto === "graph"
                    ? {
                          joinGraph: () => this.joinGraph(),
                          joinsAsSteps: () => this.stepsOn(),
                          joiner: () => {
                              const send = this.sender("join a table");
                              return async (table, choices, shape, callerKey) => {
                                  const before = new Set(this.storedSources().map((each) => each.key));
                                  await this.applyJoin(send, table, choices, shape);
                                  this.publishAdded(before, "merge", callerKeyOf({ callerKey }));
                              };
                          },
                      }
                    : {}),
            },
            styles,
            options.guess,
        );
        this.heldDraft = draft;
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
        return consumerSnapshot(this.graphStore);
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
        return wholeGraph(this.graphStore);
    }

    /**
     * The NodeId of the node a key names in one id space, under the source-steps experiment.
     * @param key - The key.
     * @param space - The space.
     * @returns The NodeId, or null when no node of the space holds the key.
     */
    private nodeIdIn(key: string, space: string): NodeId | null {
        const { result } = this.stepsBuild();
        const ref = refOf(result, key, space);
        const n = ref === null ? null : resolveNode(result, ref.space, ref.key);
        return n === null ? null : (nodeIdsOf(result).get(n.id) ?? null);
    }

    /**
     * One node, by id.
     * @param id - the node id; an integer id may be written either way, `34` or `"34"`
     * @param options - Under the source-steps experiment, how to read `id` (experimental).
     * @param options.space - Read `id` as a key in this id space.
     * @returns the record, carrying the id as the graph holds it, or undefined when the graph has
     *     no such node
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    node(id: NodeId, options: { readonly space?: string } = {}): NodeRecord | undefined {
        if (options.space !== undefined) {
            const named = this.nodeIdIn(String(id), options.space);
            return named === null ? undefined : this.node(named);
        }
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
     * What a node is called, never undefined: `SessionDataApi.nodeName`, which documents it.
     * @param id - the node id; an integer id may be written either way, `34` or `"34"`
     * @returns the name and the id; for a node the graph does not hold, the id as the name
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    nodeName(id: NodeId): NodeName {
        const { ids } = this.current();
        const index = rowOfEitherSpelling(ids, id);
        if (index === INVALID_INDEX) {
            return { id, name: String(id), labeled: false };
        }
        const held = ids.idOf(index);
        const name = this.nameOf(index, held);
        return { id: held, name, labeled: name !== String(held) };
    }

    /**
     * What an edge is called, by its two ends.
     * @param edge - the two ends' node ids
     * @param edge.source - the end the edge leaves
     * @param edge.target - the end the edge enters
     * @returns the two ends' names
     */
    edgeName(edge: { readonly source: NodeId; readonly target: NodeId }): EdgeName;
    /**
     * What an edge is called, by its id.
     * @param edge - the edge id
     * @returns the two ends' names, or undefined when the graph has no such edge
     */
    edgeName(edge: EdgeId): EdgeName | undefined;
    /**
     * What an edge is called: `SessionDataApi.edgeName`, which documents it.
     * @param edge - the edge id, or the two ends' node ids
     * @returns the two ends' names, or undefined for an edge id the graph has no edge for
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    edgeName(edge: EdgeId | { readonly source: NodeId; readonly target: NodeId }): EdgeName | undefined {
        const ends = typeof edge === "string" ? this.edge(edge) : edge;
        return ends === undefined
            ? undefined
            : { source: this.nodeName(ends.source), target: this.nodeName(ends.target) };
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
        return frozenRecord({ ...this.ownAttributes(this.records?.nodeAttributes(index, id)), id });
    }

    /**
     * A record's own keys: under the source-steps experiment, without the readable paths the
     * build writes on it for the rule and style readers (`graphty.type`, ...), which
     * `readableValues()` lists and a record does not carry.
     * @param record - The record as the graph holds it.
     * @returns The record, or a copy without those keys.
     */
    private ownAttributes(
        record: Readonly<Record<string, unknown>> | undefined,
    ): Readonly<Record<string, unknown>> | undefined {
        if (record === undefined || !this.stepsOn()) {
            return record;
        }
        return Object.fromEntries(Object.entries(record).filter(([key]) => !RECORD_PATHS.includes(key)));
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
            ...this.ownAttributes(this.records?.edgeAttributes(index)),
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
     * @param options - Which nodes.
     * @param options.scope - What is shown, or the whole graph; absent, what the working graph
     *     says: what is shown while it is on, the whole graph while it is off.
     * @returns the records, deep-frozen
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    nodes(options: { readonly scope?: WorkingScope } = {}): readonly NodeRecord[] {
        const snapshot = this.current();
        const shown = this.shownOf("node", options.scope);
        const records: NodeRecord[] = [];
        for (let index = 0; index < snapshot.nodeCount; index++) {
            if (shown === null || maskTest(shown, index)) {
                records.push(this.nodeAt(index, snapshot.ids.idOf(index)));
            }
        }

        return records;
    }

    /**
     * Every edge, in the graph's order.
     * @param options - Which edges.
     * @param options.scope - What is shown, or the whole graph; absent, what the working graph
     *     says: what is shown while it is on, the whole graph while it is off.
     * @returns the records, deep-frozen
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    edges(options: { readonly scope?: WorkingScope } = {}): readonly EdgeRecord[] {
        const snapshot = this.current();
        const space = edgeSpaceOf(snapshot);
        const shown = this.shownOf("edge", options.scope);
        const records: EdgeRecord[] = [];
        for (let index = 0; index < snapshot.edgeCount; index++) {
            if (shown === null || maskTest(shown, index)) {
                records.push(this.edgeAt(snapshot, index, space.idOf(index)));
            }
        }

        return records;
    }

    /**
     * How many nodes and edges the graph holds, read without building a record.
     * @param options - What to count.
     * @param options.scope - `"visible"` or `"graph"`; absent, what the working graph says.
     * @returns the node count and the edge count
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    count(options: { readonly scope?: WorkingScope } & SourceElementsFilter = {}): {
        readonly nodes: number;
        readonly edges: number;
    } {
        if (options.source !== undefined || options.type !== undefined) {
            return this.countOf(options);
        }
        const snapshot = this.current();
        const view = this.viewOf(options.scope);
        return view === null
            ? { nodes: snapshot.nodeCount, edges: snapshot.edgeCount }
            : { nodes: view.nodeCount, edges: view.edgeCount };
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
        return this.page(snapshot, "node", this.scoped(options), "nodePage", (index) =>
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
        return this.page(snapshot, "edge", this.scoped(options), "edgePage", (index) =>
            this.edgeAt(snapshot, index, space.idOf(index)),
        );
    }

    /**
     * Compute a page's order in slices, so a later page read with the same options returns at once.
     * @param kind - nodes or edges
     * @param options - the scope, the order and the node, as the page read will pass them
     * @param control - a signal that stops the work, and a callback told how far it has got
     * @returns settles once the order is ready
     * @throws The signal's reason once it aborts; `E_UNKNOWN_RUN`, `E_UNKNOWN_ATTRIBUTE` or
     *     `E_BAD_COMMAND` as the page read would; `E_DISPOSED` once disposed.
     */
    async preparePage(
        kind: "node" | "edge",
        options: EdgePageOptions = {},
        control: PreparePageControl = {},
    ): Promise<void> {
        const { signal, onProgress } = control;
        // An edit while it waited makes the rows it read stale: it starts again on the new graph.
        // ponytail: restarts on every revision move; a graph edited faster than one sort never
        // settles, so bound the restarts if a host streams edits while a table sorts.
        while (!(await this.prepareOnce(kind, options, signal, onProgress))) {
            // Started again.
        }
    }

    /**
     * One attempt at {@link preparePage} on the graph as it is now.
     * @param kind - nodes or edges
     * @param options - the scope, the order and the node
     * @param signal - stops the work
     * @param onProgress - told how far the work has got
     * @returns true once the order is kept, false when the graph moved under it
     */
    private async prepareOnce(
        kind: "node" | "edge",
        options: EdgePageOptions,
        signal: AbortSignal | undefined,
        onProgress: ((fraction: number) => void) | undefined,
    ): Promise<boolean> {
        signal?.throwIfAborted();
        const snapshot = this.current();
        const at = this.orders.now();
        const request = this.orderRequest(snapshot, kind, this.scoped(options), "preparePage");
        if (request === null || this.orders.has(request.key)) {
            onProgress?.(1);
            return true;
        }

        const steps = request.steps();
        let sliceEnd = performance.now() + PREPARE_SLICE_MS;
        let step = steps.next();
        while (step.done !== true) {
            if (performance.now() >= sliceEnd) {
                onProgress?.(step.value);
                await nextTask();
                signal?.throwIfAborted();
                if (!this.orders.isCurrent(at)) {
                    return false;
                }
                sliceEnd = performance.now() + PREPARE_SLICE_MS;
            }
            step = steps.next();
        }

        if (!this.orders.put(request.key, step.value, at)) {
            return false;
        }
        onProgress?.(1);
        return true;
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
     * @param asked - the direction, the weight, the scope, the order and the window
     * @returns the page
     * @throws A `GraphtyError` with `E_UNKNOWN_ELEMENT` for an id the graph does not hold,
     *     `E_UNKNOWN_ATTRIBUTE` for a weight column no edge carries, `E_OPTION_RANGE` for a bad
     *     window, `E_DISPOSED` once disposed.
     */
    neighbors(id: NodeId, asked: NeighborOptions = {}): NeighborPage {
        const snapshot = this.current();
        const options = this.scoped(asked);
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
            resolveColumn(this.columns(), { kind: "edge", name: asked.attribute });
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
        const carried = this.columns().some((column) => column.kind === "edge" && column.name === attribute);
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
        const ranked = this.rankedMatch(target, options);
        const matches: RecordMatch[] = [];
        for (let position = offset; position < Math.min(total, offset + limit); position++) {
            const row = rows === null ? position : (rows[position] ?? position);
            records.push(recordAt(row));
            const match = ranked?.(row);
            if (match !== undefined) {
                matches.push(Object.freeze(match));
            }
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
            ...(ranked === undefined ? {} : { matches: Object.freeze(matches) }),
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
        const request = this.orderRequest(snapshot, target, options, verb);
        return request === null ? null : this.orders.get(request.key, () => drain(request.steps()));
    }

    /**
     * What a page's order is cached under, and the steps that compute it.
     * @param snapshot - the current snapshot
     * @param target - nodes or edges
     * @param options - the scope, the order and the node
     * @param verb - the verb, for an error
     * @returns the key and the steps, or null for every row in graph order
     */
    private orderRequest(
        snapshot: GraphSnapshot,
        target: "node" | "edge",
        options: EdgePageOptions,
        verb: string,
    ): { readonly key: string; steps(): Generator<number, Uint32Array, void> } | null {
        const scope = options.scope === "graph" ? undefined : options.scope;
        const touching = target === "edge" ? options.touching : undefined;
        const { sort } = options;
        const matching = matchingOf(options.matching);
        // By name only: the id, and for a node the label column data.name reads.
        const names = this.namesOf(target, options);
        const { where, issue } = options;
        if (
            scope === undefined &&
            touching === undefined &&
            sort === undefined &&
            matching === undefined &&
            where === undefined &&
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
        const ranked = this.rankedMatch(target, options);
        const key = JSON.stringify([target, scope, sortKey, touching, matching, where, issueKey, names, !!ranked]);
        const steps = (): Generator<number, Uint32Array, void> => {
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
            const matches = this.rowFilter(snapshot, target, matching, issue, where, names);
            const rows = this.computeOrder(snapshot, target, scope, touching, order, matches);
            return ranked === undefined ? rows : rankFirst(rows, ranked);
        };
        return { key, steps };
    }

    /**
     * The best match of each row for a page asked with `matching.rank`, reading what its text
     * match reads.
     * @param target - nodes or edges
     * @param options - what the caller asked for
     * @returns the match by row, or undefined when the page is not ranked
     */
    private rankedMatch(
        target: "node" | "edge",
        options: EdgePageOptions,
    ): ((index: number) => RecordMatch | undefined) | undefined {
        const matching = matchingOf(options.matching);
        if (matching === undefined || options.matching?.rank !== true) {
            return undefined;
        }

        return this.pages.textMatch(matching.text, matching.mode, target, this.namesOf(target, options));
    }

    /**
     * The columns a page's text match reads when it searches names only: the id, and for a node
     * the label column `data.name` reads.
     * @param target - nodes or edges
     * @param options - what the caller asked for
     * @returns the paths, or undefined to read every searchable value
     */
    private namesOf(target: "node" | "edge", options: EdgePageOptions): readonly Path[] | undefined {
        if (options.matching?.names !== true) {
            return undefined;
        }
        // A node's name is its label column; a graph with none names its nodes in its other
        // columns (a "name" column the table shows), so every searchable value is read, as
        // without `names`. An edge is named by its id and its ends' ids.
        if (target === "edge") {
            return [];
        }
        const labelPath = this.readConfig().knownFields.nodeLabelPath;
        return labelPath === null ? undefined : [labelPath];
    }

    /**
     * Filter the rows by scope and node, then sort them, keeping graph order among equals.
     * @param snapshot - the current snapshot
     * @param target - nodes or edges
     * @param scope - the scope, or undefined for the whole graph
     * @param touching - for edges, the node one end must be
     * @param sort - the direction and what a row sorts by, or undefined for graph order
     * @param matches - keeps only the rows matching a page's text, or null for every row
     * @yields how far the work has got, from 0 to 1
     * @returns the rows
     */
    private *computeOrder(
        snapshot: GraphSnapshot,
        target: "node" | "edge",
        scope: ScopeInput | undefined,
        touching: NodeId | undefined,
        sort: { readonly descending: boolean; value(index: number): unknown } | undefined,
        matches: ((index: number) => boolean) | null,
    ): Generator<number, Uint32Array, void> {
        const space = edgeSpaceOf(snapshot);
        const members = scope === undefined ? null : this.pages.resolve(scope);
        const count = target === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const end = touching === undefined ? INVALID_INDEX : rowOfEitherSpelling(snapshot.ids, touching);
        const keeps = (index: number): boolean =>
            (touching === undefined || edgeTouches(snapshot, index, end)) &&
            (matches === null || matches(index)) &&
            (members === null || rowInScope(snapshot, space, members, target, index));
        const rows: number[] = [];
        // The share of the work the scan is counted as: all of it with no sort to follow.
        const share = sort === undefined ? 1 : SCAN_SHARE;
        // ponytail: `touching` scans every edge once per revision; read the undirected CSR if a
        // host pages the edges of many nodes per revision.
        for (let index = 0; index < count; index++) {
            if (index % ORDER_STEP === ORDER_STEP - 1) {
                yield (index / count) * share;
            }

            if (keeps(index)) {
                rows.push(index);
            }
        }

        if (sort === undefined) {
            return Uint32Array.from(rows);
        }

        const sorting = sortRows(rows, sort);
        for (;;) {
            const step = sorting.next();
            if (step.done === true) {
                return step.value;
            }
            yield share + step.value * (1 - share);
        }
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
            if (key === "id") {
                return id;
            }
            // A structure path (`graphty.degree`) sorts by the snapshot's own value.
            return structureValuesOf(snapshot, key)?.[index] ?? this.records?.nodeAttributes(index, id)?.[key];
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
            throw this.unknownLoad(key);
        }

        const newest = at === sources.length - 1;
        const stepsKey = sources[at]?.key;
        if (this.stepsOn() && stepsKey !== undefined && this.stepsValue().sources[stepsKey] !== undefined) {
            // Under the source-steps experiment the name is the steps source's label, so a rebuild, a
            // save and a reopen all keep it; one step, labeled as the off path labels it.
            const send = this.writes.importer();
            await this.loadLine.edit(() => {
                const value = this.stepsValue();
                const src = value.sources[stepsKey];
                const edit: StepsEdit = {
                    kind: "set",
                    value:
                        src === undefined
                            ? value
                            : { ...value, sources: { ...value.sources, [stepsKey]: { ...src, label: name } } },
                };
                return send({
                    op: "batch",
                    label: `Name the source ${name}`,
                    fact: { code: "data.set-source", params: { name } },
                    steps: [
                        { op: "data.steps-set", edit },
                        { op: "data.setSource", source: newest ? { ...current, name } : current },
                    ],
                });
            }, undefined);
            return;
        }

        await this.writes.setSource(
            newest ? { ...current, name } : current,
            sources.length === 0 ? undefined : sources.map((each, index) => (index === at ? { ...each, name } : each)),
        );
    }

    /**
     * Every load still in the graph, oldest first. While the source-steps experiment is on, a
     * staged source is left out unless `staged` asks for it: it is no part of the graph yet.
     * @param options - `staged: true` lists staged sources too, in their place.
     * @param options.staged - Whether staged sources are listed.
     * @returns the loads, or an empty list when no import loaded the graph
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    sources(options?: { readonly staged?: boolean }): readonly LoadedSource[] {
        this.requireLive("sources");
        const all = this.listed();
        if (options?.staged === true || !this.stepsOn()) {
            return all;
        }

        if (this.inGraphMemo?.all !== all) {
            this.inGraphMemo = { all, result: Object.freeze(all.filter((each) => each.state !== "staged")) };
        }

        return this.inGraphMemo.result;
    }

    /**
     * The staged sources, oldest first: held, read by no step, and no part of the graph.
     * @returns The staged sources; empty while the source-steps experiment is off.
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    staged(): readonly LoadedSource[] {
        this.requireLive("staged");
        const all = this.listed();
        if (this.stagedMemo?.all !== all) {
            this.stagedMemo = {
                all,
                result: Object.freeze(this.stepsOn() ? all.filter((each) => each.state === "staged") : []),
            };
        }

        return this.stagedMemo.result;
    }

    /**
     * Every load the `graph` slice keeps, staged ones included, oldest first.
     * @returns the loads, or an empty list when no import loaded the graph
     */
    private listed(): readonly LoadedSource[] {
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
            memo.ledger === ledger &&
            memo.copyTick === this.copyTick
        ) {
            return memo.result;
        }

        const records = new Map(this.ledger.loads().map((record) => [record.key, record]));
        const catalog = new Map(sourceDescriptors().map((entry) => [entry.id, entry.features]));

        // Each load belongs to one entry: a node two loads share names both, or only the first.
        const taken = new Set<string>();
        // An entry saved before loads had keys gets one by its place in the list.
        const result = Object.freeze(
            stored.map((each, at) => {
                const key = (each as Partial<LoadedSource>).key ?? `s${String(at + 1)}`;
                const supplied = provenance?.[key];
                const kind = (each as Partial<LoadedSource>).kind ?? "file";
                // An opened project's network load keeps its entry's key; one loaded here is found by its rows.
                // The rows say which load they are now (after an edit, a newer record than the entry's key).
                let found: string | undefined;
                if (kind === "server") {
                    found = this.networkLoadOf(supplied?.nodes ?? [], [...records.keys()], taken);
                    found ??= records.has(key) && !taken.has(key) ? key : undefined;
                }
                const loadKey = kind === "server" && found !== undefined && records.has(found) ? found : undefined;
                if (loadKey !== undefined) {
                    taken.add(loadKey);
                }
                const {
                    input,
                    drawn: _drawn,
                    readBy: _readBy,
                    ...entry
                } = each as LoadedSource & {
                    readonly input?: string;
                    readonly drawn?: unknown;
                    readonly readBy?: unknown;
                };
                return Object.freeze({
                    ...entry,
                    key,
                    kind,
                    ...((input !== undefined && this.kept.has(input)) || this.openedInputs.has(key)
                        ? { reloadable: true as const }
                        : {}),
                    ...(this.referenced(key) ? { copy: "reference" as const } : {}),
                    ...(loadKey === undefined ? {} : { loadKey }),
                    ...loadFacts(records.get(loadKey ?? ""), catalog),
                    ...addressOf(kind, each.config, records.get(loadKey ?? "")),
                    counts: Object.freeze(supplied === undefined ? { ...each.added } : heldCounts(supplied, snapshot)),
                });
            }),
        );
        this.sourcesMemo = { stored, provenance, snapshot, ledger, copyTick: this.copyTick, result };
        return result;
    }

    /**
     * Whether the source-steps experiment is on.
     * @returns True when it is.
     */
    private stepsOn(): boolean {
        return this.pages.sourceSteps?.() === true;
    }

    /**
     * Whether a key names a source the steps read. A source a file saved without the experiment
     * brought in is listed by `sources()` but has no steps entry, so remove, replace and reload
     * take it the way they do with the experiment off.
     * @param key - The source's key.
     * @returns True when the experiment is on and the steps hold the key.
     */
    private stepsHold(key: SourceKey): boolean {
        return this.stepsOn() && this.stepsValue().sources[key] !== undefined;
    }

    /**
     * Refuse a call the source-steps experiment does not compile to steps yet, while it is on, so
     * the old path never runs over a graph the steps built.
     * @param verb - The call.
     * @throws A `GraphtyError` with `E_UNSUPPORTED`, reason `later`.
     */
    private refuseUnderSteps(verb: string): void {
        if (this.stepsOn()) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: `${verb} is not available under the source-steps experiment yet.`,
                source: "data",
                details: { reason: "later", verb },
            });
        }
    }

    /**
     * Under the source-steps experiment, expand, More and Collapse write the graph as they do today
     * only while the network source is the graph's only source (section 11).
     * @param verb - The door.
     * @returns `E_UNSUPPORTED` (reason `several-sources`) while other sources are loaded, else null.
     */
    private severalStepsSources(verb: string): GraphtyError | null {
        if (!this.stepsOn() || Object.keys(this.stepsValue().sources).length <= 1) {
            return null;
        }
        return new GraphtyError({
            code: "E_UNSUPPORTED",
            message: `${verb} is available under the source-steps experiment only while one source is loaded.`,
            source: "data",
            details: { reason: "several-sources", verb },
        });
    }

    /**
     * Refuse a source-steps call while the experiment is off.
     * @param verb - The call.
     * @throws A `GraphtyError` with `E_FEATURE_OFF`.
     */
    private requireSteps(verb: string): void {
        this.requireLive(verb);
        if (!this.stepsOn()) {
            throw featureOff("source-steps", "data");
        }
    }

    /**
     * The sources and steps the graph holds.
     * @returns The value; empty before the first load.
     */
    private stepsValue(): SourceSteps {
        return (this.writes.slice().values.get(SOURCE_STEPS_VALUE) as SourceSteps | undefined) ?? EMPTY_STEPS;
    }

    /**
     * The rows as read of every source, by copy id.
     * @returns The copies.
     */
    private stepsCopies(): Copies {
        return (this.writes.slice().values.get(SOURCE_COPIES_VALUE) as Copies | undefined) ?? EMPTY_COPIES;
    }

    /**
     * The session edge id of each built edge.
     * @returns The ids by built edge id.
     */
    private stepsEdgeIds(): Readonly<Record<string, EdgeId>> {
        // One empty object, so a reader keyed on its identity (shownDraft) is not rebuilt per read.
        return (
            (this.writes.slice().values.get(SOURCE_EDGE_IDS_VALUE) as Record<string, EdgeId> | undefined) ?? NO_EDGE_IDS
        );
    }

    /**
     * Dispatch one edit of the sources and steps in the load line.
     * @param edit - The edit, built when its turn comes.
     * @param copies - The rows as read of a source it adds.
     * @param fold - Join the newest step instead of recording one.
     * @returns Settles once it is recorded and drawn.
     */
    private stepsEdit(edit: () => StepsEdit, copies?: Copies, fold = false): Promise<unknown> {
        const send = (fold ? this.writes.folder?.() : undefined) ?? this.writes.importer();
        return this.loadLine.edit(
            () => send({ op: "data.steps-set", edit: edit(), ...(copies === undefined ? {} : { copies }) }),
            undefined,
        );
    }

    /**
     * `importColumns` under the source-steps experiment: the columns as one added source.
     * @param columns - The columns.
     * @returns Settles once the source is built and drawn.
     */
    private importColumnsAsSource(columns: ImportColumnsInput): Promise<unknown> {
        const [nodes, edges] = columnMutations(columns, false);
        const records = (m: DataMutation): readonly Record<string, unknown>[] => ("records" in m ? m.records : []);
        const send = this.writes.importer();
        return this.loadLine.edit(() => {
            const command = compileImport(
                {
                    op: "data.import",
                    source: { name: "columns" },
                    mode: "merge",
                    held: {
                        nodes: records(nodes),
                        edges: records(edges),
                        declaredDirection: null,
                        errors: [],
                        errorLimit: 0,
                        idPath: "id",
                        source: "source",
                        target: "target",
                        ...(columns.weights === undefined ? {} : { weight: "weight" }),
                    },
                },
                {},
                this.readConfig().knownFields,
            );
            return command === null ? Promise.resolve() : send(command);
        }, undefined);
    }

    /**
     * Hold a source's rows as a staged source: saved and listed, read by no step.
     * @param source - What `import` takes.
     * @param options - Its key, type, space and edge ends, and how to guess the ones left out.
     * @returns The new source's id.
     * @throws A `GraphtyError` with `E_EMPTY_LOAD` when the source holds no rows.
     */
    async stage(source: DataSourceInput, options: StageOptions = {}): Promise<string> {
        this.requireSteps("stage");
        const read = await this.readStaged(source, options);
        if (read === null) {
            return "";
        }
        // Staging is no undo step (8.9): it joins the step before it.
        await this.stepsEdit(() => ({ kind: "add", source: read.source, staged: true }), read.copies, true);
        return read.source.id;
    }

    /**
     * Read a source as a staged source, dispatching nothing.
     * @param source - What `import` takes.
     * @param options - Its key, type, space and edge ends.
     * @param options.guess - How the roles it leaves out are guessed.
     * @returns The source and its rows as read, or null when the read made no import.
     * @throws A `GraphtyError` with `E_EMPTY_LOAD` when the source holds no rows.
     */
    private async readStaged(
        source: DataSourceInput,
        { guess, ...options }: StageOptions,
    ): Promise<{ source: StepsSource; copies: Copies } | null> {
        checkSpace(options.space);
        const draft = await this.prepare(source, guess === undefined ? {} : { guess });
        const { sha256: digest, size } = await copyFacts(source.config);
        const delimiter = draft.tables.find((table) => table.delimiter !== undefined)?.delimiter;
        const facts = {
            ...(size === undefined ? {} : { size }),
            at: new Date().toISOString(),
            ...(delimiter === undefined ? {} : { delimiter: { ...delimiter } }),
        };
        let read: { source: StepsSource; copies: Copies } | null = null;
        const choices = withStepsMapping({ ...options, mode: "merge" as const });
        // One table the guess reads as edges without finding their ends stages as node rows: nothing
        // names its ends yet, and the staged section's Rows are changes it (5.1).
        const endless =
            options.key === undefined &&
            options.edges === undefined &&
            draft.tables.length === 1 &&
            Object.values(draft.missing()).some((roles) => roles.length > 0);
        try {
            await draft.loadVia(
                (command) => {
                    const load = (command.op === "batch" ? command.steps.at(-1) : command) as DataImportCommand;
                    const compiled = compileImport(withDigest(load, digest), options, this.readConfig().knownFields);
                    if (compiled !== null) {
                        const copies = compiled.copies ?? EMPTY_COPIES;
                        if (!Object.values(copies).some((tables) => hasRows(tables))) {
                            throw emptyCopy(load.source.type ?? source.type);
                        }
                        read = { source: { ...compiled.edit.source, read: facts }, copies };
                    }
                    return Promise.resolve();
                },
                endless ? { ...choices, mapping: { rowsAre: "nodes" } } : choices,
            );
        } finally {
            draft.dispose();
        }
        return read;
    }

    /**
     * Open a draft of the sources and steps (design 5.6).
     * @param options - Whether its adds ask the key-overlap question.
     * @returns The draft.
     * @throws A `GraphtyError` with `E_DRAFT_OPEN` while one is open, or `E_FEATURE_OFF` while the
     *   source-steps experiment is off.
     */
    draft(options: SourceDraftOptions = {}): SourceDraft {
        this.requireSteps("draft");
        if (this.sourceDraft !== null) {
            throw draftOpenError(this.sourceDraft.id);
        }
        const draft = new SourceDraftHandle(
            {
                read: (source, options) => this.readStaged(source, options),
                send: (edit, copies, removed) => this.draftCommit(edit, copies, removed),
                committedCopies: () => this.stepsCopies(),
                previewContext: () => ({
                    refs: this.boundNow().refs,
                    filters: this.writes
                        .readers()
                        .visibility.conditions.filter((each) => each.on && each.effect !== "select")
                        .map((each) => ({
                            filter: each.id,
                            paths: valuePaths(each.rule),
                            ...(each.source === undefined ? {} : { source: each.source }),
                        })),
                    derive: (valuesWhere) => derivedValues(this.derivedColumns(), valuesWhere),
                }),
                release: () => {
                    // A draft discarded while its commit was landing never releases one opened since.
                    if (this.sourceDraft === draft) {
                        this.sourceDraft = null;
                    }
                },
                emit: (change) => this.writes.emit?.("data:draft-changed", change),
                drawn: () => this.writes.drawing?.drawn() ?? Promise.resolve(),
                redraw: () => this.writes.drawing?.resume(),
                edgeIds: (side) => (side === "after" ? this.afterEdgeIds : null) ?? this.stepsEdgeIds(),
            },
            { value: this.stepsValue(), copies: this.stepsCopies() },
            { ...(options.askOverlap === undefined ? {} : { askOverlap: options.askOverlap }) },
        );
        this.sourceDraft = draft;
        this.writes.emit?.("data:draft-changed", { draft: draft.id, reason: "opened" });
        return draft;
    }

    /**
     * Dispatch a draft's commit: its `data.steps-set`, and the filters of the sources it removes
     * taken out in the same step, so one Undo gives both back (7.12), as `removeSource` does.
     * @param edit - The whole value.
     * @param copies - The rows as read of the sources the draft staged.
     * @param removed - The committed sources the draft removes.
     * @returns Settles once it is recorded and drawn.
     */
    private draftCommit(edit: StepsEdit, copies: Copies, removed: readonly string[]): Promise<unknown> {
        const send = this.writes.importer();
        // The commit writes over the committed graph, so a drawn After comes off it first.
        this.writes.drawing?.stop();
        return this.loadLine.edit(() => {
            const step = { op: "data.steps-set", edit, copies } as const;
            const { conditions } = this.writes.readers().visibility;
            const kept = conditions.filter((each) => each.source === undefined || !removed.includes(each.source));
            return send(
                kept.length === conditions.length
                    ? step
                    : {
                          op: "batch",
                          label: "Set the sources",
                          fact: { code: "data.steps-set", params: { kind: "set", source: null, name: null } },
                          steps: [step, { op: "visibility.conditions", conditions: kept }],
                      },
            );
        }, undefined);
    }

    /**
     * Run a read of the project (a save) on the committed graph: a drawn draft's After is taken off
     * the graph while it runs, until a promise it returns settles, and drawn again after, so the
     * read never holds what the draft adds.
     * @param read - The read.
     * @returns What it returned.
     */
    withoutDrawnDraft<T>(read: () => T): T {
        const { drawing } = this.writes;
        if (drawing === undefined) {
            return read();
        }
        drawing.stop();
        let result: T;
        try {
            result = read();
        } catch (error) {
            drawing.resume();
            throw error;
        }
        if (result instanceof Promise) {
            // An asynchronous read keeps the committed graph until it settles.
            return result.finally(() => {
                drawing.resume();
            }) as T;
        }
        drawing.resume();
        return result;
    }

    /**
     * The draft open now.
     * @returns It, or null.
     * @throws A `GraphtyError` with `E_FEATURE_OFF` while the source-steps experiment is off.
     */
    currentDraft(): SourceDraft | null {
        this.requireSteps("currentDraft");
        return this.sourceDraft;
    }

    /**
     * Live match counts of two fields in the committed sources, building nothing (design 5.2).
     * @param pair - The two fields.
     * @param options - Whether case and spaces count.
     * @returns The counts.
     * @throws A `GraphtyError` with `E_FEATURE_OFF` while the source-steps experiment is off,
     *   `E_LOAD_UNKNOWN` or `E_AMBIGUOUS_ID`.
     */
    matchCounts(pair: SourceMatchPair, options: SourceMatchOptions = {}): SourceMatchCounts {
        this.requireSteps("matchCounts");
        return matchCounts(this.stepsValue(), this.stepsCopies(), pair, options);
    }

    /**
     * The value-overlap list of two fields in the committed sources, building nothing (design 5.2).
     * @param pair - The two fields.
     * @param options - Which values, which page, and whether case and spaces count.
     * @returns The page and the total.
     * @throws As {@link matchCounts}.
     */
    matchValues(pair: SourceMatchPair, options: SourceMatchValuesOptions = {}): SourceMatchValues {
        this.requireSteps("matchValues");
        return matchValues(this.stepsValue(), this.stepsCopies(), pair, options);
    }

    /**
     * One source's rows as read, staged or built, building nothing (design 5.1, 5.2).
     * @param source - The source.
     * @returns The table.
     * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` or `E_FEATURE_OFF`.
     */
    sourceTable(source: SourceKey): SourceTable {
        this.requireSteps("sourceTable");
        return tableHandle(() => ({ value: this.stepsValue(), copies: this.stepsCopies() }), source);
    }

    /**
     * The profile of the keys of the nodes one id space holds.
     * @param options - The space.
     * @param options.space - The space.
     * @returns The profile.
     * @throws A `GraphtyError` with `E_FEATURE_OFF`.
     */
    profile(options: { readonly space: string }): SourceColumnProfile {
        this.requireSteps("profile");
        return spaceProfile(this.stepsValue(), this.stepsCopies(), options.space);
    }

    /**
     * The refusal for a load key no source still in the graph has.
     * @param key - The key asked for.
     * @returns `E_SOURCE_UNKNOWN`, with the keys there are.
     */
    private unknownLoad(key: string): GraphtyError {
        return new GraphtyError({
            code: "E_SOURCE_UNKNOWN",
            message: `No load still in the graph has key ${JSON.stringify(key)}.`,
            source: "data",
            details: { key, known: this.listed().map((each) => each.key) },
        });
    }

    /**
     * Change what a staged source's rows are for, outside a draft. Like staging, it joins the step
     * before it.
     * @param source - The staged source.
     * @param patch - The change.
     * @returns Settles once it is recorded.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` (reason `not-staged`) or `E_FEATURE_OFF`.
     */
    async setMapping(source: SourceKey, patch: SourceMappingPatch): Promise<void> {
        this.requireSteps("setMapping");
        const copies = rowsCopies(this.stepsValue(), this.stepsCopies(), source, patch);
        await this.stepsEdit(() => ({ kind: "act", act: { act: "set-mapping", source, patch } }), copies, true);
    }

    /**
     * The refusal a data write or an undo meets while a draft is open, its own commit aside.
     * @param command - The data command, or undefined for an undo or redo.
     * @param command.op - Its op.
     * @returns `E_DRAFT_OPEN`, or null when no draft is open or the command is the draft's commit.
     */
    draftRefusal(command?: { readonly op: string }): GraphtyError | null {
        if (this.sourceDraft === null) {
            return null;
        }
        // A value's name in the legend and a column hidden or shown are presentation, not the data
        // the draft holds: they go ahead (design 5.6).
        if (command?.op === "data.label" || (command?.op === "data.columns" && this.onlyHides(command))) {
            return null;
        }
        // The draft's own commit: the one data write it lets through while it holds the data.
        const edit = command?.op === "data.steps-set" ? (command as DataStepsSetCommand).edit : null;
        if (edit?.kind === "set" && edit.draftBase?.draft === this.sourceDraft.id) {
            return null;
        }
        return draftOpenError(this.sourceDraft.id);
    }

    /**
     * Why a reader's command is refused while the open draft's After is drawn: the graph then is the
     * draft's, not the project's, so a run would measure it and a pin, a note, a set or a hidden
     * element could name an element the committed graph lacks. What reads neither goes ahead:
     * styles, settings, views, filters, the run list's order and names, and moving a node the
     * committed graph has. Data writes are left to {@link SessionData.draftRefusal}.
     * @param command - The command.
     * @param command.op - Its op.
     * @returns `E_DRAFT_OPEN { draft, side: "after" }`, or null.
     */
    afterRefusal(command: { readonly op: string }): GraphtyError | null {
        const draft = this.sourceDraft;
        const { op } = command;
        if (draft === null || op.startsWith("data.") || AFTER_ALLOWS.some((allowed) => op.startsWith(allowed))) {
            return null;
        }
        if (op === "positions.set") {
            const added = draft.marks()?.nodes;
            const { entries } = command as unknown as { readonly entries: readonly { readonly id: NodeId }[] };
            if (entries.every(({ id }) => added?.get(String(id)) !== "new")) {
                return null;
            }
        }
        return draftOpenError(draft.id, "after");
    }

    /**
     * Whether a column settings write changes only which columns are hidden.
     * @param command - The `data.columns` command.
     * @param command.op - Its op.
     * @param command.settings - The settings it writes.
     * @param command.move - The column it moves, if any.
     * @returns True when its types and renames are today's and it moves no column.
     */
    private onlyHides(command: {
        readonly op: string;
        readonly settings?: ColumnSettings;
        readonly move?: unknown;
    }): boolean {
        const { settings, move } = command;
        if (settings === undefined) {
            return false;
        }
        const now = this.columnSettings();
        const same = (a: Readonly<Record<string, unknown>>, b: Readonly<Record<string, unknown>>): boolean =>
            Object.keys(a).length === Object.keys(b).length &&
            Object.entries(a).every(([key, value]) => b[key] === value);
        return move === undefined && same(settings.types, now.types) && same(settings.renamed, now.renamed);
    }

    /**
     * The draft drawn now (`draft.display(true)`): what its commit does to each element, by session
     * id, and the side it draws. The marks are never written anywhere, so a save and the history
     * read none of them.
     * @returns The marks and the side, or null while no draft is drawn or the experiment is off.
     */
    shownDraft(): {
        readonly nodes: ReadonlyMap<string, DraftMark>;
        readonly edges: ReadonlyMap<string, DraftMark>;
        readonly side: "before" | "after";
    } | null {
        const draft = this.sourceDraft;
        const marks = this.stepsOn() ? (draft?.marks() ?? null) : null;
        if (draft === null || marks === null) {
            return null;
        }
        const ids = (draft.side === "after" ? this.afterEdgeIds : null) ?? this.stepsEdgeIds();
        if (this.shownMarks?.marks !== marks || this.shownMarks.ids !== ids) {
            // A drawn edge goes by its session id; one not drawn on this side keeps its built id.
            const edges = new Map([...marks.edges].map(([built, mark]) => [ids[built] ?? built, mark]));
            this.shownMarks = { marks, ids, edges };
        }
        return { nodes: marks.nodes, edges: this.shownMarks.edges, side: draft.side };
    }

    /**
     * The session ids of some elements of the drawn draft, on the side it draws.
     * @param query - Element references, some counts of one step, or the untouched nodes.
     * @returns The ids, or null while no draft is drawn or the experiment is off.
     */
    drawnDraftIds(query: Parameters<SourceDraftHandle["drawnIds"]>[0]): ReturnType<SourceDraftHandle["drawnIds"]> {
        return this.stepsOn() ? (this.sourceDraft?.drawnIds(query) ?? null) : null;
    }

    /**
     * The writes that turn the committed graph into the drawn draft's After: what the commit would
     * remove, patch and add, as `data.steps-set` would write them, but none of the sources and steps.
     * @returns The writes and the node id path, or null while no draft is drawn.
     */
    draftAfterDiff(): { readonly diff: GraphDiff; readonly idPath: string; readonly after: ProjectedGraph } | null {
        const drawn = this.stepsOn() ? (this.sourceDraft?.drawnValue() ?? null) : null;
        if (drawn === null) {
            return null;
        }
        const value = this.stepsValue();
        const idPath = this.readConfig().knownFields.nodeIdPath;
        const after = projectBuild(buildOf(drawn.value, drawn.copies), drawn.value, idPath);
        const diff = diffGraph(
            projectBuild(buildOf(value, this.stepsCopies()), value, idPath),
            after,
            this.stepsEdgeIds(),
        );
        return { diff, idPath, after };
    }

    /**
     * Say which session id each of the draft's edges has while its After is drawn, or that it is not.
     * @param ids - The ids by built id, or null once After is taken off the graph.
     * @param report - The load report the draft's commit would leave, or null when it leaves the one
     *     the graph holds.
     */
    drawnAfter(ids: Readonly<Record<string, EdgeId>> | null, report: LoadReport | null = null): void {
        this.afterEdgeIds = ids;
        this.afterReport = ids === null ? null : report;
    }

    /**
     * The load report the drawn draft's commit would leave, when it differs from the one the graph
     * holds: After's writes seal a report for the edges they add, and the commit then names the ends
     * of its whole build, so a record read while After shows hides the same end columns.
     * @returns The report, or null.
     */
    drawnReport(): LoadReport | null {
        return this.afterReport;
    }

    /** Discard the open draft, if any: a project opened or the graph cleared replaces what it drafted. */
    discardDraft(): void {
        const draft = this.sourceDraft;
        // A draft whose commit is landing is closed already, so it lets go of the data here.
        this.sourceDraft = null;
        draft?.dispose();
    }

    /**
     * Under the source-steps experiment, one source's own values as a filter reads them (design
     * 3.8): a column's value from that source, or the reader's edit where one sets the cell.
     * @param source - The source's id.
     * @returns The values, or undefined with the experiment off.
     */
    ownValues(source: string): FilterValueSource | undefined {
        if (!this.stepsOn()) {
            return undefined;
        }
        const { result } = this.stepsBuild();
        const { nodes, edges } = elementsById(result, this.stepsEdgeIds());
        const snapshot = this.current();
        const space = edgeSpaceOf(snapshot);
        const readable: ReadonlySet<string> = new Set(READABLE_PATHS);
        const read = (el: BuiltElementOf | undefined, path: string): unknown => {
            if (el === undefined) {
                return undefined;
            }
            const column = path.startsWith("data.") ? path.slice("data.".length) : path;
            // A readable path is on the element itself, carried by every element the source supplied.
            if (readable.has(column)) {
                return el.loads.includes(source) ? (readPath(el, column) ?? undefined) : undefined;
            }
            return el.edited?.[column] === undefined ? el.own[source]?.[column]?.v : el.values[column];
        };
        const carried = (els: Iterable<BuiltElementOf>, path: string): boolean => {
            for (const el of els) {
                if (read(el, path) !== undefined) {
                    return true;
                }
            }
            return false;
        };
        return {
            nodeValue: (index, path) => read(nodes.get(String(snapshot.ids.idOf(index))), path),
            edgeValue: (index, path) => read(edges.get(space.idOf(index)), path),
            halvesOf: (path) => ({
                node: carried(result.nodes.values(), path),
                edge: carried(result.edges.values(), path),
            }),
        };
    }

    /**
     * Which halves of the source-steps build carry a value at a readable path, for the rule and
     * filter readers; none with the experiment off.
     * @param path - A readable path, such as `graphty.type`.
     * @returns `"node"`, `"edge"`, both or neither.
     */
    readableKinds(path: string): readonly ("node" | "edge")[] {
        if (!this.stepsOn()) {
            return [];
        }
        const { result } = this.stepsBuild();
        const carries = (els: Iterable<BuiltElementOf>): boolean => {
            for (const el of els) {
                if (readPath(el, path) !== null && readPath(el, path) !== undefined) {
                    return true;
                }
            }
            return false;
        };
        return [
            ...(carries(result.nodes.values()) ? (["node"] as const) : []),
            ...(carries(result.edges.values()) ? (["edge"] as const) : []),
        ];
    }

    /**
     * The sources and steps, built from the committed value.
     * @returns The value and its build.
     */
    private stepsBuild(): { value: SourceSteps; result: ReturnType<typeof buildOf> } {
        const value = this.stepsValue();
        return { value, result: buildOf(value, this.stepsCopies()) };
    }

    /**
     * Every step, with its counts in the committed build.
     * @returns The steps.
     */
    steps(): readonly SourceStepRow[] {
        this.requireLive("steps");
        const { value, result } = this.stepsBuild();
        return stepRows(value, result, this.stepsCopies());
    }

    /**
     * Every id space the graph holds nodes in.
     * @returns The spaces.
     */
    spaces(): readonly SourceSpaceRow[] {
        this.requireLive("spaces");
        return spaceRows(this.stepsBuild().result);
    }

    /**
     * The type registry.
     * @returns The declared types.
     */
    types(): readonly SourceTypeEntry[] {
        this.requireLive("types");
        return this.stepsValue().types;
    }

    /**
     * Declare a type, or add rules to one, as one undoable step.
     * @param entry - The type and its rules.
     * @returns Settles once the graph is rebuilt.
     */
    async declareType(entry: SourceTypeEntry): Promise<void> {
        this.requireSteps("declareType");
        await this.stepsEdit(() => ({ kind: "declare-type", entry }));
    }

    /**
     * The reader's own edits, in the order made.
     * @returns The edits.
     */
    edits(): readonly ReaderEditRow[] {
        this.requireLive("edits");
        return editRows(this.stepsValue(), this.stepsCopies());
    }

    /**
     * Take back one of the reader's edits, as one undoable step.
     * @param id - The edit's id.
     * @returns Settles once the graph is rebuilt.
     */
    async removeEdit(id: string): Promise<void> {
        this.requireSteps("removeEdit");
        await this.stepsEdit(() => ({ kind: "remove-edit", id }));
    }

    /**
     * The node a key names, as `{ space, key }`.
     * @param key - The key.
     * @param options - The space to look in.
     * @param options.space - The space.
     * @returns The reference, or null.
     */
    ref(key: string, options: { readonly space?: string } = {}): SourceNodeRef | null {
        this.requireLive("ref");
        return refOf(this.stepsBuild().result, key, options.space);
    }

    /**
     * The id space and key of a node in the graph, by its id.
     * @param id - The node's id.
     * @returns The reference, or null for an id no node holds.
     */
    nodeRef(id: NodeId): SourceNodeRef | null {
        this.requireSteps("nodeRef");
        const node = nodeOfId(this.stepsBuild().result, id);
        return node === null ? null : Object.freeze({ space: node.space, key: node.key });
    }

    /**
     * Dispatch one act on the sources and steps, as one undoable step.
     * @param verb - The door, for a refusal.
     * @param act - The act.
     * @returns Settles once the graph is rebuilt.
     */
    private async stepsAct(verb: string, act: StepsAct): Promise<void> {
        this.requireSteps(verb);
        await this.stepsEdit(() => ({ kind: "act", act }));
    }

    /**
     * Merge: fold each node of a source into the node its field names, as one undoable step.
     * @param options - The source and field, the nodes they fold into, and the choices.
     * @returns Settles once the graph is rebuilt.
     */
    async merge(options: SourceMergeOptions): Promise<void> {
        await this.stepsAct("merge", { act: "merge", options });
    }

    /**
     * Make an edge: each node row of a source an edge to the node its field names.
     * @param options - The source and field, the nodes they name, the direction and edge type.
     * @returns The part the new edges are keyed by.
     */
    async connect(options: SourceConnectOptions): Promise<number> {
        await this.stepsAct("connect", { act: "connect", options });
        return this.lastPart(options.from.source);
    }

    /**
     * Extract: one column of an edge source becomes nodes, joined to one end by new edges.
     * @param source - The edge source.
     * @param options - The column, its space and types, and columns to move.
     * @returns The part the new edges are keyed by.
     */
    async extract(source: SourceKey, options: SourceExtractOptions): Promise<number> {
        await this.stepsAct("extract", { act: "extract", source, options });
        return this.lastPart(source);
    }

    /**
     * The part of a source's newest `join.edges` step: minted above every other, so the highest.
     * @param source - The source.
     * @returns The part, or 0 when the source has no such step.
     */
    private lastPart(source: SourceKey): number {
        const parts = this.stepsValue().steps.flatMap((s) =>
            s.op === "join.edges" && s.source === source ? [s.part] : [],
        );
        return Math.max(0, ...parts);
    }

    /**
     * Move columns of an edge source onto the nodes at one end.
     * @param source - The edge source.
     * @param options - The columns and where they go.
     * @returns Settles once the graph is rebuilt.
     */
    async moveColumns(source: SourceKey, options: SourceMoveColumnsOptions): Promise<void> {
        await this.stepsAct("moveColumns", { act: "move-columns", source, options });
    }

    /**
     * Take one source's value for a cell, as a reader edit naming the source.
     * @param ref - The element.
     * @param column - The column.
     * @param source - The source whose value to take.
     * @returns Settles once the graph is rebuilt.
     */
    async pick(ref: SourceElementRef, column: string, source: SourceKey): Promise<void> {
        await this.stepsAct("pick", { act: "pick", id: mintEditId(), ref, column, source });
    }

    /**
     * Use one source's value for a cell: the same reader edit as `pick`.
     * @param ref - The element.
     * @param column - The column.
     * @param source - The source whose value to use.
     * @returns Settles once the graph is rebuilt.
     */
    async use(ref: SourceElementRef, column: string, source: SourceKey): Promise<void> {
        await this.stepsAct("use", { act: "pick", id: mintEditId(), ref, column, source });
    }

    /**
     * Add a staged source with its own `join.add`.
     * @param source - The staged source.
     * @param options - What a key overlap does.
     * @param options.overlap - `"separate"` (default) or `"merge"`.
     * @returns Settles once the graph is rebuilt.
     */
    async add(source: SourceKey, options: { readonly overlap?: "separate" | "merge" } = {}): Promise<void> {
        await this.stepsAct("add", { act: "add-staged", source, ...options });
    }

    /**
     * Delete one step.
     * @param index - The step's place.
     * @returns Settles once the graph is rebuilt.
     */
    async removeStep(index: number): Promise<void> {
        await this.stepsAct("removeStep", { act: "remove-step", index });
    }

    /**
     * Turn one step off or back on, as one undoable step (7.13).
     * @param index - The step's place, as `steps()` lists it.
     * @param off - True to turn it off, false to turn it on.
     * @returns Settles once the graph is rebuilt.
     */
    async setStepOff(index: number, off: boolean): Promise<void> {
        await this.stepsAct("setStepOff", { act: "set-step-off", index, off });
    }

    /**
     * Where one node or edge came from.
     * @param ref - The element.
     * @returns Its lineage, or null.
     */
    lineage(ref: SourceElementRef): SourceLineage | null {
        this.requireLive("lineage");
        return stepsLineage(this.stepsBuild().result, ref);
    }

    /**
     * Every source's value for one cell.
     * @param ref - The element.
     * @param column - The column.
     * @returns The values, or null.
     */
    values(ref: SourceElementRef, column: string): SourceCellValues | null {
        this.requireLive("values");
        return stepsValues(this.stepsBuild().result, ref, column);
    }

    /**
     * What one cell holds.
     * @param ref - The element.
     * @param column - The column.
     * @returns Its state, or null.
     */
    cell(ref: SourceElementRef, column: string): SourceCellState | null {
        this.requireLive("cell");
        return stepsCell(this.stepsBuild().result, ref, column);
    }

    /**
     * The cells where supplying sources hold different values.
     * @param query - Which cells.
     * @returns The conflicts.
     */
    conflicts(query: SourceConflictQuery = {}): readonly SourceConflict[] {
        this.requireLive("conflicts");
        return stepsConflicts(this.stepsBuild().result, query);
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
     * The test a page's rows must pass: its text match, its issue and its expression, each only when asked.
     * @param snapshot - the current snapshot
     * @param target - nodes or edges
     * @param matching - the text match, if any
     * @param issue - the issue filter, if any
     * @param where - the expression, if any
     * @param names - the columns a text match reads, when only names are searched
     * @returns The test, or null when the page asks none of them
     */
    private rowFilter(
        snapshot: GraphSnapshot,
        target: "node" | "edge",
        matching: ReturnType<typeof matchingOf>,
        issue: IssueId | undefined,
        where: Query | undefined,
        names: readonly Path[] | undefined,
    ): ((index: number) => boolean) | null {
        const tests: ((index: number) => boolean)[] = [];
        if (issue !== undefined) {
            tests.push(this.issueRows(snapshot, target, issue));
        }

        if (matching !== undefined) {
            tests.push(this.pages.textTest(matching.text, matching.mode, target, names));
        }

        if (where !== undefined) {
            const wanted = this.pages.matchWhere(where, target);
            const space = edgeSpaceOf(snapshot);
            const idOf = (index: number): unknown => (target === "node" ? snapshot.ids.idOf(index) : space.idOf(index));
            tests.push((index) => wanted.has(idOf(index) as NodeId | EdgeId));
        }

        if (tests.length === 0) {
            return null;
        }

        return tests.length === 1 ? tests[0] : (index) => tests.every((test) => test(index));
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
        const columns = this.columns();
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

        // The whole graph: an issue is a fact about the original, which a fix edits, so what a
        // filter hides is still checked (and the memo, keyed by the snapshot, stays right).
        const nodes = this.nodes({ scope: "graph" });
        const found = findIssues({
            columns,
            nodes,
            edges: this.edges({ scope: "graph" }),
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
     * @param options.source - list only this load's issues
     * @returns the issues, load issues first; never one with a zero count
     */
    issues(
        options: {
            readonly includeIgnored?: boolean;
            readonly includeFixed?: boolean;
            readonly source?: SourceKey;
        } = {},
    ): readonly DataIssue[] {
        this.requireLive("issues");
        const found = this.foundIssues();
        const state = this.issueState();
        const ignored = new Set(state.ignored);
        const listed: DataIssue[] = found
            .map(({ issue }): DataIssue => {
                const isIgnored = ignored.has(issue.id);
                return Object.freeze({ ...issue, ignored: isIgnored, status: isIgnored ? "ignored" : "open" });
            })
            .filter((issue) => options.includeIgnored === true || !issue.ignored)
            .filter((issue) => options.source === undefined || issue.source === options.source);
        if (options.includeFixed === true) {
            const open = new Set(found.map(({ issue }) => issue.id));
            for (const record of state.fixed ?? []) {
                if (!open.has(record.id) && (options.source === undefined || record.source === options.source)) {
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
        if (this.stepsHold(key)) {
            return this.removeStepsSource(key);
        }
        const sources = this.listed();
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
        const snapshot = this.current();
        const space = edgeSpaceOf(snapshot);
        const going = withJoinsResting(sources, key);
        const left = sources.filter((each) => !going.includes(each));
        const staying = broughtBy(left, provenance, false);
        const brought = broughtBy(going, provenance, true);
        const nodes = [...brought.nodes].filter((id) => snapshot.ids.has(id));
        const edges = [...brought.edges].filter((id) => space.indexOf(id) !== INVALID_INDEX);
        const goingNodes = nodes.filter((id) => !staying.nodes.has(id));
        const goingEdges = edges.filter((id) => !staying.edges.has(id));
        // Each join's values back, newest join first, so the oldest join's "before" is what remains.
        const restored = new Map<string, Readonly<Record<string, unknown>>>();
        const valuesBack = going.flatMap((each) => this.restoreValues(each, restored).steps);
        const last = left.at(-1);
        if (this.writes.send === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "This session cannot dispatch commands, so it cannot remove a load.",
                source: "data",
            });
        }

        const before = { nodes: snapshot.nodeCount, edges: snapshot.edgeCount };
        const stale = this.staleLayers(goingNodes, goingEdges);
        await this.writes.send({
            op: "batch",
            label: `Removed ${entry.name ?? key}`,
            fact: { code: "data.remove-source", params: { key, name: entry.name ?? null } },
            steps: [
                ...valuesBack,
                { op: "data.apply", mutation: { kind: "remove-edges", ids: goingEdges } },
                { op: "data.apply", mutation: { kind: "remove-nodes", ids: goingNodes } },
                {
                    op: "data.setSource",
                    source: last === undefined ? (this.source() ?? {}) : describeLoaded(last),
                    sources: left,
                    provenance: going.reduce((held, each) => withoutSource(held, each.key), provenance),
                },
                ...stale.map((id) => ({ op: "style.patch" as const, action: "remove" as const, id })),
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
            alsoRemoved: Object.freeze(going.map((each) => each.key).filter((each) => each !== key)),
        });
    }

    /**
     * removeSource under the source-steps experiment: the source and every step reading it taken
     * out, and the graph rebuilt without them.
     * @param key - The source's id.
     * @returns How many of its nodes and edges went and stayed.
     * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for a source the steps do not hold.
     */
    private async removeStepsSource(key: SourceKey): Promise<RemoveSourceResult> {
        const entry = this.listed().find((each) => each.key === key);
        const value = this.stepsValue();
        if (entry === undefined || value.sources[key] === undefined) {
            throw new GraphtyError({
                code: "E_LOAD_UNKNOWN",
                message: `No load still in the graph has key ${JSON.stringify(key)}.`,
                source: "data",
                details: { key, known: Object.keys(value.sources) },
            });
        }
        const issues = removedSteps(value, key);
        const supplied = this.provenance()?.[key] ?? { nodes: [], edges: [] };
        const before = this.current();
        const bound = this.boundNow();
        const removal = { op: "data.steps-set", edit: { kind: "remove-source", id: key } } as const;
        // The source's own filters go with it, in the same step, so one Undo gives both back (7.12).
        const { conditions } = this.writes.readers().visibility;
        const kept = conditions.filter((each) => each.source !== key);
        await this.sender("remove a load")(
            kept.length === conditions.length
                ? removal
                : {
                      op: "batch",
                      label: "Removed a source",
                      fact: { code: "data.steps-set", params: { kind: "remove-source", source: key, name: null } },
                      steps: [removal, { op: "visibility.conditions", conditions: kept }],
                  },
        );
        const after = this.current();
        issues.push(...this.unboundSince(bound).issues);
        const space = edgeSpaceOf(after);
        const beforeSpace = edgeSpaceOf(before);
        // Counted from the ids that went, never from the totals: removing a source can bring nodes back
        // (a merge it took part in is undone), and those must not cancel the ones that went.
        let nodesGone = 0;
        for (let i = 0; i < before.nodeCount; i++) {
            nodesGone += after.ids.has(before.ids.idOf(i)) ? 0 : 1;
        }
        let edgesGone = 0;
        for (let i = 0; i < before.edgeCount; i++) {
            edgesGone += space.indexOf(beforeSpace.idOf(i)) === INVALID_INDEX ? 1 : 0;
        }
        return Object.freeze({
            removed: Object.freeze({ nodes: nodesGone, edges: edgesGone }),
            // What the source supplied that the graph without it still holds: another source supplied it too.
            kept: Object.freeze({
                nodes: supplied.nodes.filter((id) => after.ids.has(id)).length,
                edges: supplied.edges.filter((id) => space.indexOf(id) !== INVALID_INDEX).length,
            }),
            alsoRemoved: Object.freeze([]),
            issues: Object.freeze(issues),
        });
    }

    /**
     * reloadSource under the source-steps experiment: the source read again from what it was read from.
     * @param key - The source's id.
     * @param choices - Changed choices; none are taken yet.
     * @returns What replaceSource returns.
     * @throws A `GraphtyError` with `E_SOURCE_UNKNOWN`, or `E_UNSUPPORTED` for a source this
     *   session cannot read again or changed choices.
     */
    private async reloadStepsSource(key: SourceKey, choices: LoadChoices): Promise<ReplaceReport> {
        const src = this.stepsValue().sources[key] as StepsSource | undefined;
        const input = src?.input === undefined ? undefined : this.kept.get(src.input);
        if (src === undefined) {
            throw this.unknownSource(key);
        }
        if (input === undefined || Object.keys(choices).length > 0) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: `Load ${JSON.stringify(key)} cannot be read again here.`,
                source: "data",
                details: { reason: input === undefined ? "not-reloadable" : "later", key },
            });
        }
        return this.replaceStepsSource(key, input);
    }

    /**
     * Refuse a replace under the source-steps experiment that asks to read the newer copy another
     * way than the source's mapping reads it: a new mapping, or a key, ends, type or id space
     * other than the source's own. Changing how a source is read is not taken yet.
     * @param key - The source's id.
     * @param choices - The replace's choices.
     * @throws A `GraphtyError` with `E_UNSUPPORTED` (reason `later`) for a new reading, or
     *   `E_SOURCE_UNKNOWN` for a key the sources do not hold.
     */
    private refuseNewReading(key: SourceKey, choices: LoadChoices): void {
        const src = this.stepsValue().sources[key] as StepsSource | undefined;
        if (src === undefined) {
            throw this.unknownSource(key);
        }
        const own: LoadChoices = readChoicesOf(src);
        const changed = (["mapping", "key", "edges", "type", "space"] as const).filter(
            (name) => choices[name] !== undefined && JSON.stringify(choices[name]) !== JSON.stringify(own[name]),
        );
        if (changed.length > 0) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: `Load ${JSON.stringify(key)} cannot be read another way by a replace here.`,
                source: "data",
                details: { reason: "later", key, choices: changed },
            });
        }
    }

    /**
     * `E_SOURCE_UNKNOWN` for a key the sources do not hold.
     * @param key - The key.
     * @returns The error.
     */
    private unknownSource(key: SourceKey): GraphtyError {
        return new GraphtyError({
            code: "E_SOURCE_UNKNOWN",
            message: `No load still in the graph has key ${JSON.stringify(key)}.`,
            source: "data",
            details: { key, known: Object.keys(this.stepsValue().sources) },
        });
    }

    /**
     * replaceSource under the source-steps experiment: the newer copy's rows read as the source's
     * mapping reads them, then swapped in under the same source id (7.12).
     * @param key - The source's id.
     * @param source - The newer copy.
     * @returns What changed, and the held steps, new columns and moved edits.
     */
    private async replaceStepsSource(key: SourceKey, source: DataSourceInput): Promise<ReplaceReport> {
        const src = this.stepsValue().sources[key] as StepsSource | undefined;
        if (src === undefined) {
            throw this.unknownSource(key);
        }
        if (source.source !== undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message:
                    "Replacing a load with a network source is not available under the source-steps experiment yet.",
                source: "data",
                details: { reason: "later", key },
            });
        }
        const options = readChoicesOf(src);
        let captured: DataImportCommand | undefined;
        const digest = (): Promise<string | undefined> => copyDigest(source.config);
        try {
            captured = await this.captureLoad(source, options);
        } catch (error) {
            // The newer copy lacks a column the mapping reads its rows by: its rows are read as they
            // are, and the steps reading that column are held (7.12).
            if (!isGraphtyError(error) || Object.keys(options).length === 0) {
                throw error;
            }
            const raw = await readWithProgress(source, undefined, () => undefined);
            const rows = raw.tables.flatMap((held) => held.rows) as readonly Row[];
            if (rows.length === 0) {
                throw emptyCopy(source.type);
            }
            const tables: CopyTables = src.mapping.edges === undefined ? { nodes: rows } : { edges: rows };
            const counts = await this.swapStepsCopy(key, tables, {
                label: source.name ?? src.label,
                input: this.keep(source),
                digest: await digest(),
            });
            return Object.freeze({
                nodes: counts.nodes,
                edges: counts.edges,
                unbound: counts.unbound,
                issues: counts.issues,
            });
        }
        const compiled =
            captured === undefined ? null : compileImport(captured, options, this.readConfig().knownFields);
        const tables = compiled?.copies?.[copyKey(compiled.edit.source)];
        if (compiled === null || !hasRows(tables)) {
            throw emptyCopy(captured?.source.type ?? source.type);
        }
        const counts = await this.swapStepsCopy(key, tables, {
            label: compiled.edit.source.label ?? src.label,
            input: this.keep(source),
            tables: compiled.edit.source.tables,
            digest: await digest(),
        });
        return Object.freeze({
            nodes: counts.nodes,
            edges: counts.edges,
            unbound: counts.unbound,
            issues: counts.issues,
        });
    }

    /**
     * The import a draft of a source would dispatch, read with the given choices and held back.
     * @param source - The source.
     * @param options - How to read its rows.
     * @returns The import, or undefined when the draft dispatches none.
     */
    private async captureLoad(source: DataSourceInput, options: ImportOptions): Promise<DataImportCommand | undefined> {
        const read = this.reads.get(source);
        const draft = read === undefined ? await this.prepare(source) : await this.draftOf(source, read);
        let captured: DataImportCommand | undefined;
        try {
            await draft.loadVia(
                (command) => {
                    const steps = command.op === "batch" ? command.steps : [command];
                    captured = steps.find((step): step is DataImportCommand => step.op === "data.import");
                    return Promise.resolve();
                },
                withStepsMapping({ ...options, mode: "merge" }),
            );
        } finally {
            draft.dispose();
        }
        return captured;
    }

    /**
     * Swap a source's copy for newer rows, as one undoable step; identical rows change nothing and
     * record no step.
     * @param key - The source's id.
     * @param tables - The new rows.
     * @param about - The new copy's name, input token and table names.
     * @param about.label - Its name.
     * @param about.input - Its input token.
     * @param about.tables - Its tables.
     * @param about.digest - The SHA-256 of the bytes the rows were read from, which names the copy.
     * @returns What changed and the issues.
     */
    private async swapStepsCopy(
        key: SourceKey,
        tables: CopyTables,
        about: {
            readonly label?: string | null;
            readonly input?: string;
            readonly tables?: readonly string[];
            readonly digest?: string;
        },
    ): Promise<
        ChangeCounts & {
            readonly issues: readonly SourceRefreshIssue[];
            readonly unbound: readonly CodedFact<ReplaceUnboundCode>[];
        }
    > {
        const value = this.stepsValue();
        const copies = this.stepsCopies();
        const src = value.sources[key];
        const [taken] = takenNames(src, tables);
        if (taken !== undefined) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `The newer copy brings a column ${JSON.stringify(taken.column)}, a name the source gives a renamed column: rename one first.`,
                source: "data",
                details: { reason: "name-taken", source: key, ...taken },
            });
        }
        if (sameRows(tables, copies[copyKey(src)])) {
            const zero = Object.freeze({ added: 0, removed: 0, changed: 0 });
            const issues = Object.freeze(refreshIssues(value, value, copies, key));
            return { nodes: zero, edges: zero, issues, unbound: Object.freeze([]) };
        }
        const { digest, ...named } = about;
        const { origin, key: copy } = copyOrigin(src.kind, digest);
        const edit: StepsEdit = { kind: "replace-copy", id: key, ...origin, ...named };
        const all = { ...copies, [copy]: tables };
        // ponytail: the report builds the next value once more than the command does; share the
        // command's build if a large source's refresh shows up in a profile.
        const next = applyEdit(value, edit, all);
        const counts = changeCounts(buildOf(value, copies), buildOf(next, all));
        const issues = refreshIssues(value, next, all, key);
        const bound = this.boundNow();
        await this.sender("replace a load")({ op: "data.steps-set", edit, copies: { [copy]: tables } });
        const lost = this.unboundSince(bound);
        return { ...counts, issues: Object.freeze([...issues, ...lost.issues]), unbound: lost.unbound };
    }

    /**
     * What a rebuild may leave unbound, read before it runs: each pin, note target and reader edit
     * that binds now, by what holds it, with its reference as the build names it; and the columns
     * the nodes and edges carry.
     * @returns The references and the columns.
     */
    private boundNow(): {
        readonly refs: ReadonlyMap<string, SourceElementRef>;
        readonly columns: { readonly node: ReadonlySet<string>; readonly edge: ReadonlySet<string> };
    } {
        const { value, result } = this.stepsBuild();
        const refs = new Map<string, SourceElementRef>();
        const applied = new Set(result.readerResults.filter((each) => each.applied).map((each) => each.id));
        for (const op of value.reader) {
            if (op.op === "edit" && applied.has(op.id)) {
                refs.set(`edit:${op.id}`, op.node ?? op.edge);
            }
        }
        const nodes = new Map([...nodeIdsOf(result)].map(([internal, id]) => [id, result.nodes.get(internal)]));
        const edges = new Map(Object.entries(this.stepsEdgeIds()).map(([built, id]) => [id, result.edges.get(built)]));
        const held = this.writes.references?.() ?? { nodes: [], edges: [] };
        for (const id of held.nodes) {
            const n = nodes.get(id);
            if (n !== undefined) {
                refs.set(`node:${String(id)}`, { space: n.space, key: n.key });
            }
        }
        for (const id of held.edges) {
            const e = id === undefined ? undefined : edges.get(id);
            if (e !== undefined) {
                refs.set(`edge:${String(id)}`, { load: e.load, key: e.key });
            }
        }
        const keysOf = (rows: readonly Readonly<Record<string, unknown>>[]): Set<string> =>
            new Set(rows.flatMap((row) => Object.keys(row)));
        const columns = { node: keysOf(this.nodes({ scope: "graph" })), edge: keysOf(this.edges({ scope: "graph" })) };
        return { refs, columns };
    }

    /**
     * What a rebuild left unbound: each reference {@link boundNow} found that no longer binds, as
     * `W_REFERENCE_UNBOUND` (one per element), and the style layers, the filter and joins that read
     * a column no node or edge carries any more.
     * @param before - What bound before the rebuild.
     * @returns The issues and the facts.
     */
    private unboundSince(before: ReturnType<SessionData["boundNow"]>): {
        readonly issues: readonly SourceRefreshIssue[];
        readonly unbound: readonly CodedFact<ReplaceUnboundCode>[];
    } {
        const now = this.boundNow();
        const lost = new Map<string, SourceElementRef>();
        for (const [holder, ref] of before.refs) {
            if (!now.refs.has(holder)) {
                lost.set("space" in ref ? `n:${ref.space}:${ref.key}` : `e:${ref.load}:${ref.key}`, ref);
            }
        }
        const issues = [...lost.values()].map((ref) => ({ code: "W_REFERENCE_UNBOUND" as const, params: { ref } }));
        const facts: CodedFact<ReplaceUnboundCode>[] = [];
        const { styles, visibility } = this.writes.readers();
        for (const kind of ["node", "edge"] as const) {
            for (const name of before.columns[kind]) {
                if (!now.columns[kind].has(name)) {
                    unboundFactsOf(kind, name, { styles, visibility, joins: this.joins() }, facts);
                }
            }
        }
        return { issues: Object.freeze(issues), unbound: Object.freeze(facts) };
    }

    /**
     * A network refresh under the source-steps experiment: the rows read again swapped in as the
     * source's new copy.
     * @param load - The load's key, from `loads()`.
     * @param tables - The rows read, stamped with the load.
     * @returns What changed, or `undefined` when no step reads the load (a file saved without the
     *   experiment, or one whose steps were set aside on open), so the caller merges it as before.
     */
    private async refreshStepsSource(load: string, tables: CopyTables): Promise<SourceRefreshReport | undefined> {
        const key = this.listed().find((each) => each.loadKey === load)?.key;
        if (key === undefined || this.stepsValue().sources[key] === undefined) {
            return undefined;
        }
        const { nodes, edges, issues } = await this.swapStepsCopy(key, tables, {});
        return refreshReport(
            {
                added: { nodes: nodes.added, edges: edges.added },
                removed: { nodes: nodes.removed, edges: edges.removed },
                updated: { nodes: nodes.changed, edges: edges.changed },
            },
            { issues },
        );
    }

    /**
     * Settle a reader edit whose source moved under it (7.12, 3.10), as one undoable step.
     * @param id - The edit's id, from `edits()`.
     * @param choice - `"follow"` takes the picked source's new value (a pick only), `"keep"` keeps
     *   the edit as the reader's own, `"drop"` takes it back.
     * @returns Settles once the graph is rebuilt.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` for an unknown edit or Follow on a typed edit.
     */
    async settleEdit(id: string, choice: SourceEditChoice): Promise<void> {
        this.requireSteps("settleEdit");
        const op = this.stepsValue().reader.find((o) => o.id === id);
        if (op?.op !== "edit" || (choice === "follow" && op.picked === undefined)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `Edit ${JSON.stringify(id)} cannot be settled with ${choice}.`,
                source: "data",
                details: { reason: op?.op === "edit" ? "not-a-pick" : "unknown-edit", id, choice },
            });
        }
        await this.stepsEdit(() => ({ kind: "settle-edit", id, choice }));
    }

    /**
     * Resolve a step held because a column it reads is gone (7.12), as one undoable step: a column
     * of the new rows takes the vanished name, or a vanished role is cleared. The step is built
     * again once it misses nothing.
     * @param index - The step's place, from `steps()`.
     * @param resolution - `{ column }` or `{ none: true }`.
     * @returns Settles once the graph is rebuilt.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` for a step that misses nothing, or `none` for a
     *   column that is not a role.
     */
    async resolveStep(index: number, resolution: SourceStepResolution): Promise<void> {
        this.requireSteps("resolveStep");
        const [first] = this.steps()[index]?.missing ?? [];
        const none = "none" in resolution;
        if (first === undefined || (none && first.code !== "E_READ_ROLE_MISSING")) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `Step ${String(index)} cannot be resolved that way.`,
                source: "data",
                details: { reason: first === undefined ? "not-held" : "not-a-role", index },
            });
        }
        await this.stepsEdit(() => ({
            kind: "resolve-step",
            index,
            ...(none ? { none: true as const } : { column: resolution.column }),
        }));
    }

    /**
     * The layers that read only columns the removed nodes and edges held and no element left holds.
     * @param nodes - The nodes going.
     * @param edges - The edges going.
     * @returns The layers to remove with them.
     */
    private staleLayers(nodes: readonly NodeId[], edges: readonly EdgeId[]): LayerId[] {
        const { nodes: nodeRecords, edges: edgeRecords } = this.writes.slice();
        const goneOf = <K>(records: ReadonlyMap<K, GraphRecord>, going: readonly K[]): Set<string> => {
            const leaving = new Set(going);
            const gone = columnsOf(
                going.flatMap((id): GraphRecord[] => {
                    const record = records.get(id);
                    return record === undefined ? [] : [record];
                }),
            );
            const staying = columnsOf([...records].filter(([id]) => !leaving.has(id)).map(([, record]) => record));
            return new Set([...gone].filter((column) => !staying.has(column)));
        };
        return layersReadingOnly(this.writes.readers().styles, {
            node: goneOf(nodeRecords, nodes),
            edge: goneOf(edgeRecords, edges),
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
    async replaceSource(
        key: SourceKey,
        source: DataSourceInput,
        choices: LoadChoices & SourceLoadOptions = {},
    ): Promise<ReplaceReport> {
        this.requireLive("replaceSource");
        if (this.stepsOn()) {
            choices.signal?.throwIfAborted();
        }
        return this.afterLoads(() =>
            this.replacing(key, "replaceSource", source, choices, () => {
                if (!this.stepsHold(key)) {
                    return this.replaceSourceNow(key, source, choices);
                }
                this.refuseNewReading(key, choices);
                return this.replaceStepsSource(key, source);
            }),
        );
    }

    /**
     * Run a replacement of one load in place and publish `source:loaded` for it once it is in,
     * under its key, with `mode: "merge"` and how it was replaced.
     * @param key - the load's key
     * @param replaced - which verb replaced it
     * @param input - what it is read from now, for a network source's id
     * @param choices - the caller's choices
     * @param choices.callerKey - the caller's key, echoed on the event
     * @param run - the replacement
     * @returns what the replacement returns
     */
    private async replacing(
        key: SourceKey,
        replaced: NonNullable<SourceLoaded["replaced"]>,
        input: DataSourceInput | undefined,
        choices: { readonly callerKey?: string },
        run: () => Promise<ReplaceReport>,
    ): Promise<ReplaceReport> {
        const report = await run();
        const record = this.sources().find((each) => each.key === key);
        if (record !== undefined) {
            this.publishLoaded(record, "merge", {
                ...(input?.source === undefined ? {} : { sourceId: input.source }),
                ...callerKeyOf(choices),
                replaced,
            });
        }

        return report;
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
        choices: LoadChoices & SourceLoadOptions = {},
    ): Promise<ReplaceReport> {
        this.requireLive("replaceSource");
        const send = this.sender("replace a load", loadStampOf(choices));
        const stored = this.storedSources();
        const at = this.listed().findIndex((each) => each.key === key);
        const entry = stored[at] as LoadedSource | undefined;
        if (entry === undefined) {
            throw this.unknownLoad(key);
        }

        if (source.source !== undefined) {
            return this.replaceWithNetwork(key, entry, { ...source, source: source.source }, choices);
        }

        // The command a draft of the copy would load, held back here: its rows are the copy's rows.
        let captured: DataImportCommand | undefined;
        let config: SessionCommand | undefined;
        // Rows a draft already read from this very source are read as they are, with no I/O.
        const read = this.reads.get(source);
        const draft = read === undefined ? await this.prepare(source) : await this.draftOf(source, read);
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
        // Only a pair the graph held before this load stays that edge; a pair this load makes first
        // (ids split by a kind, new rows) keeps its repeats as an ordinary load would.
        const merged: HeldRows = { ...held, repeated: "first", repeatedScope: "held" };
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
        // A join's ends the graph held before it stay, as removing the join keeps them.
        const added = new Set(nodesJoinAdded(entry, provenance).map(String));
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
                nodes: new Set(
                    nodes
                        .filter((each) => others(index.nodes.get(each.id)) || !added.has(String(each.id)))
                        .map((each) => each.id),
                ),
                edges: new Set(edges.filter((each) => others(index.edges.get(each.id))).map((each) => each.id)),
            },
            graphPairs: new Set(
                this.edges({ scope: "graph" }).map((each) => pairKey(each.source, each.target, snapshot.directed)),
            ),
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
     * replaceSource with a network source: read outside any command, then one batch that takes
     * away what the new read lacks and merges the rest under the same key. Every row the load kept
     * is stamped with the new load, so a refresh goes on recognizing it.
     * @param key - the load's key
     * @param entry - its entry
     * @param source - the network source and its params
     * @param choices - as replaceSource takes it
     * @returns what replaceSource returns
     */
    private async replaceWithNetwork(
        key: SourceKey,
        entry: LoadedSource,
        source: SourceInput,
        choices: LoadChoices & SourceLoadOptions,
    ): Promise<ReplaceReport> {
        const send = this.sender("replace a load", loadStampOf(choices));
        const old = this.listed().find((each) => each.key === key)?.loadKey;
        const record = this.ledger.loads().find((each) => each.key === old);
        const mode = record?.options.mode as SourceLoadOptions["mode"] | undefined;
        // The settings were shown redacted (sourceSettings): a key the load was read with stays.
        const config =
            record?.source === source.source
                ? (withKeptSecrets(source.config, record.config) as Record<string, unknown>)
                : source.config;
        const { networkDraft } = await import("./sources/load");
        const draft = await networkDraft(
            this.sourceHost(),
            // A name the caller gives is the edited load's own (its read changed); else it keeps its name.
            {
                ...source,
                config,
                ...(source.name === undefined && entry.name !== undefined ? { name: entry.name } : {}),
            },
            choices,
            key,
            mode ?? "merge",
        );
        const snapshot = this.current();
        const space = edgeSpaceOf(snapshot);
        const provenance = this.provenance();
        const index = provenanceIndex(provenance);
        const supplied = provenance?.[key] ?? { nodes: [], edges: [] };
        const isOld = (load: string): boolean => load === old || load.startsWith(`${old ?? ""}/`);
        const others = (keys: readonly SourceKey[] | undefined): boolean => keys?.some((k) => k !== key) === true;
        // A load's own rows: those it supplied and those its expansions brought, which carry no provenance.
        const ownNodes = new Set(supplied.nodes.filter((id) => snapshot.ids.has(id)));
        for (let row = 0; row < snapshot.nodeCount; row++) {
            const id = snapshot.ids.idOf(row);
            if (sourceLoadsOf(this.records?.nodeAttributes(row, id)).some(isOld)) {
                ownNodes.add(id);
            }
        }

        const ownEdges = new Set(supplied.edges);
        for (const { id } of this.edges()) {
            if (sourceLoadsOf(this.records?.edgeAttributes(space.indexOf(id))).some(isOld)) {
                ownEdges.add(id);
            }
        }

        const nodes = [...ownNodes].map((id) => ({
            id,
            data: this.records?.nodeAttributes(snapshot.ids.indexOf(id), id) ?? {},
        }));
        const edges = [...ownEdges].flatMap((id) => {
            const record = this.edge(id);
            return record === undefined
                ? []
                : [
                      {
                          id,
                          source: record.source,
                          target: record.target,
                          data: this.records?.edgeAttributes(space.indexOf(id)) ?? {},
                      },
                  ];
        });
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
            held: draft.held,
            paths: { nodeId: "id", source: "source", target: "target" },
        });
        const unbound = this.unboundBy(key, nodes, edges, draft.held);
        const readIds = new Set(draft.held.nodes.map((row) => String(row.id)));
        const pair = (from: unknown, to: unknown): string => pairKey(String(from), String(to), snapshot.directed);
        const readPairs = new Set(draft.held.edges.map((row) => pair(row.source, row.target)));
        const loadsAfter = (data: Readonly<Record<string, unknown>>, read: boolean): readonly string[] => [
            ...(read ? [draft.key] : []),
            ...sourceLoadsOf(data).filter((load) => !isOld(load)),
        ];
        const stampNodes = nodes
            .filter((each) => !plan.removeNodes.includes(each.id))
            .map((each) => ({
                id: each.id,
                values: {
                    [SOURCE_ATTR.loads]: loadsAfter(each.data, readIds.has(String(each.id))),
                    [SOURCE_ATTR.expansion]: "none",
                },
            }));
        const stampEdges = edges
            .filter((each) => !plan.removeEdges.includes(each.id))
            .map((each) => ({
                id: each.id,
                values: { [SOURCE_ATTR.loads]: loadsAfter(each.data, readPairs.has(pair(each.source, each.target))) },
            }));
        const update = <Id extends NodeId | EdgeId>(
            target: "node" | "edge",
            rows: readonly RowUpdate<Id>[],
        ): SessionCommand[] =>
            rows.length === 0 ? [] : [{ op: "data.apply", mutation: { kind: "update-rows", target, rows: [...rows] } }];
        try {
            await send({
                op: "batch",
                label: `Replaced ${entry.name ?? key}`,
                fact: {
                    code: "data.replace-source",
                    params: {
                        key,
                        name: entry.name ?? null,
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
                    ...update("edge", stampEdges),
                    ...update("node", stampNodes),
                    {
                        op: "data.setSource",
                        source: this.source() ?? describeLoaded(entry),
                        sources: this.storedSources().filter((each) => each.key !== key),
                        provenance: withoutSource(provenance, key),
                    },
                    {
                        ...draft.command,
                        // A pair the graph holds is that edge again: the merge keeps it and notes it supplied.
                        held: { ...draft.command.held, repeated: "first", repeatedScope: "held" },
                        origin: entry.kind,
                    },
                ],
            });
        } catch (error) {
            draft.rollback();
            throw error;
        }

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
        const gone = this.goneColumns(key, nodes, edges, held);
        const facts: CodedFact<ReplaceUnboundCode>[] = [];
        const { styles, visibility } = this.writes.readers();
        for (const { kind, name } of gone) {
            unboundFactsOf(kind, name, { styles, visibility, joins: this.joins() }, facts);
        }

        return Object.freeze(facts);
    }

    /**
     * The columns a replacement takes away: those the load's rows carried and the copy's rows do
     * not, and no other load's rows carry.
     * @param key - the load
     * @param nodes - the load's nodes now
     * @param edges - the load's edges now
     * @param held - the copy's rows
     * @returns the columns
     */
    private goneColumns(
        key: SourceKey,
        nodes: readonly { readonly data: Readonly<Record<string, unknown>> }[],
        edges: readonly { readonly data: Readonly<Record<string, unknown>> }[],
        held: HeldRows,
    ): { kind: "node" | "edge"; name: string }[] {
        const keysOf = (rows: readonly Readonly<Record<string, unknown>>[]): Set<string> =>
            new Set(rows.flatMap((row) => Object.keys(row)));
        const elsewhere = this.columnSources(this.columns());
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

        return gone;
    }

    /**
     * The network load a load's nodes came from: of the loads no earlier entry took, the one most
     * of the nodes it supplied carry; on a tie, the one most of them name first (a merge appends
     * its key, an edit puts its new key first), then the newest. A node two loads share names
     * both, so the first key a node carries can be another entry's.
     * @param nodes - The nodes the load supplied.
     * @param order - Every load's key, oldest first.
     * @param taken - The loads earlier entries took.
     * @returns The key in `loads()`, or undefined when none of them is in the graph.
     */
    private networkLoadOf(
        nodes: readonly NodeId[],
        order: readonly string[],
        taken: ReadonlySet<string>,
    ): string | undefined {
        const snapshot = this.current();
        const counts = new Map<string, number>();
        const leads = new Map<string, number>();
        for (const id of nodes) {
            const index = snapshot.ids.indexOf(id);
            if (index !== INVALID_INDEX) {
                // An expansion's key is `<load>/x<n>`: the load is the part before the slash.
                const loads = [
                    ...new Set(sourceLoadsOf(this.records?.nodeAttributes(index, id)).map((k) => k.split("/")[0])),
                ].filter((load) => !taken.has(load));
                loads.forEach((load) => counts.set(load, (counts.get(load) ?? 0) + 1));
                if (loads.length > 0) {
                    leads.set(loads[0], (leads.get(loads[0]) ?? 0) + 1);
                }
            }
        }

        const rank = (load: string): readonly number[] => [
            counts.get(load) ?? 0,
            leads.get(load) ?? 0,
            order.indexOf(load),
        ];
        const outranks = (load: string, other: string | undefined): boolean => {
            const mine = rank(load);
            const theirs = other === undefined ? [-1, -1, -1] : rank(other);
            const at = mine.findIndex((value, i) => value !== theirs[i]);
            return at !== -1 && mine[at] > theirs[at];
        };
        let best: string | undefined;
        for (const load of counts.keys()) {
            if (outranks(load, best)) {
                best = load;
            }
        }

        return best;
    }

    /**
     * Read one load again from what it was read from, with changed choices, as one undoable step.
     * @param key - The load's key.
     * @param choices - What to change, laid over the choices it was read with.
     * @returns What was added, removed and changed.
     */
    async reloadSource(key: SourceKey, choices: LoadChoices): Promise<ReplaceReport> {
        this.requireLive("reloadSource");
        if (this.stepsHold(key)) {
            return this.afterLoads(() =>
                this.replacing(key, "reloadSource", this.sourceInput(key), choices, () =>
                    this.reloadStepsSource(key, choices),
                ),
            );
        }
        return this.afterLoads(() => this.reloading(key, choices));
    }

    /**
     * Change the column roles of a load, as one undoable step, reading its rows again from what
     * the session already holds.
     * @param options - The mapping, and the load (the only one when absent).
     * @returns What was added, removed and changed.
     */
    async remap(options: RemapOptions): Promise<ReplaceReport> {
        this.requireLive("remap");
        this.refuseUnderSteps("remap");
        const mapping = (options as Partial<RemapOptions> | undefined)?.mapping;
        if (typeof mapping !== "object" || mapping === null) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "remap needs a mapping, as a load takes one.",
                source: "data",
                details: { reason: "no-mapping" },
            });
        }

        return this.afterLoads(async () => {
            const known = this.listed().map((each) => each.key);
            const key = options.source ?? (known.length === 1 ? known[0] : undefined);
            if (key === undefined) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: "The graph holds more than one load (or none): name the one to re-map.",
                    source: "data",
                    details: { reason: "which-source", known },
                });
            }

            return await this.reloading(key, { mapping });
        });
    }

    /**
     * The loads a save keeps as references, and how to read each again. Internal: the project
     * file reads it.
     * @returns One entry per referenced load that can be one and is not kept as a file held it.
     */
    referenceLoads(): readonly { readonly key: SourceKey; readonly how: LoadHow; readonly ask: boolean }[] {
        return this.sources().flatMap((load) => {
            const facts = this.loadFacts.get(load.key);
            const record = this.networkRecordOf(load);
            if (
                facts?.copy !== "reference" ||
                !this.referencesOn() ||
                facts.kept !== undefined ||
                refusalOf(load, facts, record) !== undefined
            ) {
                return [];
            }

            if (record !== undefined) {
                const { mode: _mode, ...options } = record.options;
                const how: LoadHow = {
                    kind: load.kind,
                    config: record.config,
                    ...(load.choices === undefined ? {} : { choices: load.choices }),
                    network: { source: record.source, endpoint: record.endpoint, options },
                };
                return [{ key: load.key, how, ask: facts.opened === true }];
            }

            // A sample read by URL reads its address again, resolved against the page.
            const address = sampleAddress(load, facts);
            const how: LoadHow = {
                kind: load.kind,
                ...(load.type === undefined ? {} : { type: load.type }),
                ...(load.name === undefined ? {} : { name: load.name }),
                config: address === undefined ? (load.config ?? {}) : { ...load.config, url: address },
                ...(load.choices === undefined ? {} : { choices: load.choices }),
                ...(facts.sample === undefined ? {} : { sample: facts.sample }),
            };
            return [{ key: load.key, how, ask: facts.opened === true }];
        });
    }

    /**
     * A network load's record: the ledger's, or the listed source and params when it has none.
     * @param load - The listed load.
     * @returns The record, or undefined for a load that is no network load.
     */
    private networkRecordOf(load: LoadedSource): NetworkRecord | undefined {
        if (load.kind !== "server") {
            return undefined;
        }

        return (
            this.ledger.loads().find((record) => record.key === load.loadKey) ?? {
                source: (load.type ?? "").replace(/^source:/, ""),
                config: load.config ?? {},
                endpoint: null,
                credential: null,
                options: {},
            }
        );
    }

    /**
     * Whether the source references experiment is on. With it off every load is saved as a copy,
     * as before the experiment, even one an opened file kept as a reference: its choice is held,
     * unused, and comes back if the experiment is switched on again.
     * @returns True when it is on.
     */
    private referencesOn(): boolean {
        return this.pages.sourceReferences?.() === true;
    }

    /**
     * Whether a save keeps a load as a reference: chosen, and the experiment on.
     * @param key - The load's key.
     * @returns True when it does.
     */
    private referenced(key: SourceKey): boolean {
        return this.referencesOn() && this.loadFacts.get(key)?.copy === "reference";
    }

    /**
     * How a project save keeps each load: a copy or a reference.
     * @returns One entry per load, in `sources()` order.
     */
    copies(): readonly SourceCopy[] {
        this.requireLive("copies");
        return Object.freeze(
            this.sources().map((load) => {
                const facts = this.loadFacts.get(load.key);
                const reason = refusalOf(load, facts, this.networkRecordOf(load));
                return Object.freeze({
                    source: load.key,
                    copy:
                        this.referenced(load.key) && reason === undefined ? ("reference" as const) : ("copy" as const),
                    ...(reason === undefined
                        ? {}
                        : { refused: { code: "W_SOURCE_NO_PATH" as const, params: { source: load.key, reason } } }),
                });
            }),
        );
    }

    /**
     * Choose how a project save keeps one load.
     * @param source - The load's key.
     * @param copy - `"copy"` or `"reference"`.
     * @returns The load's entry after the choice.
     */
    setCopy(source: SourceKey, copy: SourceCopyChoice): SourceCopy {
        this.requireLive("setCopy");
        if (!this.referencesOn()) {
            throw featureOff("source-references", "setCopy");
        }

        const at = this.sources().findIndex((each) => each.key === source);
        if (at < 0) {
            throw new GraphtyError({
                code: "E_SOURCE_UNKNOWN",
                message: `No load still in the graph has key ${JSON.stringify(source)}.`,
                source: "data",
                details: { key: source, known: this.sources().map((each) => each.key) },
            });
        }

        const before = this.copies()[at];
        const wanted = copy === "reference" && before.refused === undefined ? "reference" : "copy";
        if (wanted !== before.copy) {
            // A save choice, as `save({ assets })` is: kept with the load's facts, never a step.
            // A network load's facts start from its record, as the writer's would.
            const record = this.ledger.loads().find((each) => each.key === this.sources()[at].loadKey);
            const recorded = record?.options.mode;
            const listed = at === 0 ? ("replace" as const) : ("merge" as const);
            const { copy: _was, ...facts } = this.loadFacts.get(source) ?? {
                loadedAt: record?.loadedAt ?? new Date().toISOString(),
                mode: recorded === "replace" || recorded === "merge" ? recorded : listed,
            };
            this.loadFacts.set(source, wanted === "reference" ? { ...facts, copy: "reference" } : facts);
            this.copyTick++;
            this.writes.emit?.("source:copy", { source, copy: wanted });
            // The autosave writes the sources part again, and the project is unsaved.
            for (const listener of this.ledger.changed) {
                listener();
            }
        }

        return this.copies()[at];
    }

    /**
     * What this session read a load from, when it read it itself.
     * @param key - The load's key.
     * @returns What `import` or `prepare` was given, or undefined.
     */
    sourceInput(key: SourceKey): DataSourceInput | undefined {
        const token = (this.storedSources().find((each) => each.key === key) as { readonly input?: string } | undefined)
            ?.input;
        return (token === undefined ? undefined : this.kept.get(token)) ?? this.openedInputs.get(key);
    }

    /**
     * Keep the loads an opened version 2 file saved by reference as references, as
     * {@link SessionData.setCopy} would, so `copies()` and `sources()` list them so and a save keeps
     * them so. Internal: the version 2 data section calls it as it builds the open data.
     * @param keys - The loads' keys (their source ids).
     */
    keepReferences(keys: Iterable<SourceKey>): void {
        for (const key of keys) {
            const facts = this.loadFacts.get(key) ?? { loadedAt: new Date().toISOString(), mode: "merge" as const };
            // Read from a file, as a version 1 open's facts are: a fetch of it asks the network gate.
            this.loadFacts.set(key, { ...facts, copy: "reference", opened: true });
        }

        this.copyTick++;
    }

    /**
     * Keep what an open read each reference from again, so those loads are reloadable. Internal:
     * the project file calls it once an open is done; each open replaces the last one's.
     * @param inputs - What each reference was read from, by load key.
     */
    keepOpenedInputs(inputs: ReadonlyMap<string, DataSourceInput>): void {
        this.openedInputs = inputs;
        this.copyTick++;
    }

    /**
     * What each load this session can read again was read from, as plain JSON, by load key: what
     * autosave keeps beside the work (never a project file), so a restore can read the loads
     * again. Internal. A file whose bytes are not read yet is left out until they are.
     * @returns The inputs.
     */
    savedInputs(): Record<SourceKey, SavedInput> {
        const saved: Record<SourceKey, SavedInput> = {};
        for (const { key, input: token } of this.storedSources() as readonly (LoadedSource & {
            readonly input?: string;
        })[]) {
            const input = token === undefined ? undefined : this.kept.get(token);
            let written: SavedInput | undefined;
            if (token !== undefined && input !== undefined) {
                written = this.keptSaved.get(token) ?? savedInput(input, this.keptBytes.get(token));
                if (written !== undefined) {
                    this.keptSaved.set(token, written);
                }
            } else {
                const opened = this.openedInputs.get(key);
                written = opened === undefined ? undefined : savedInput(opened, undefined);
            }
            if (written !== undefined) {
                saved[key] = written;
            }
        }
        return saved;
    }

    /**
     * Read again from what autosave kept (`savedInputs`) the loads of the reader's own work it
     * restored, so they stay reloadable. Internal: autosave calls it once its restore is done.
     * @param saved - What `savedInputs` returned, by load key.
     */
    keepSavedInputs(saved: Readonly<Record<SourceKey, SavedInput>>): void {
        const inputs = new Map(this.openedInputs);
        for (const [key, each] of Object.entries(saved)) {
            inputs.set(key, inputOfSaved(each));
        }
        this.keepOpenedInputs(inputs);
    }

    /**
     * reloadSource, publishing `source:loaded` once it is in.
     * @param key - as reloadSource takes it
     * @param choices - as reloadSource takes it
     * @returns what reloadSource returns
     */
    private reloading(key: SourceKey, choices: LoadChoices): Promise<ReplaceReport> {
        return this.replacing(key, "reloadSource", this.sourceInput(key), choices, () =>
            this.reloadSourceNow(key, choices),
        );
    }

    /**
     * reloadSource, once the loads asked for before it have landed.
     * @param key - as reloadSource takes it
     * @param choices - as reloadSource takes it
     * @returns what reloadSource returns
     */
    private async reloadSourceNow(key: SourceKey, choices: LoadChoices): Promise<ReplaceReport> {
        this.requireLive("reloadSource");
        const entry = this.listed().find((each) => each.key === key);
        const input = this.sourceInput(key);
        if (entry === undefined) {
            throw this.unknownLoad(key);
        }

        if (input === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: `This session did not read load ${JSON.stringify(key)} itself, so it cannot read it again.`,
                source: "data",
                details: { reason: "not-reloadable", key },
            });
        }

        return this.replaceSourceNow(key, input, overChoices(withReadRoles(entry), choices, entry.mapping));
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
                if (sameColumns(entry.join.table.columns, header)) {
                    return entry.key;
                }

                continue;
            }

            const supplied = provenance?.[entry.key];
            if (supplied === undefined || entry.kind === "join") {
                continue;
            }

            if (coversHeader(this.suppliedColumns(entry, supplied, snapshot, space), header)) {
                return entry.key;
            }
        }

        return null;
    }

    /**
     * The columns the rows a load supplied carry.
     * ponytail: reads every row the load supplied; sample when loads get large.
     * @param entry - the load
     * @param supplied - what it supplied
     * @param snapshot - the current snapshot
     * @param space - the snapshot's edge id space
     * @returns the column names
     */
    private suppliedColumns(
        entry: LoadedSource,
        supplied: Provenance[SourceKey],
        snapshot: GraphSnapshot,
        space: ReturnType<typeof edgeSpaceOf>,
    ): Set<string> {
        // The id and end columns are read into the graph's structure, not its records.
        const columns = new Set<string>(roleColumns(entry));
        const nodeRows = (entry.tableRows ?? []).includes("nodes");
        for (const id of supplied.nodes) {
            const row = snapshot.ids.indexOf(id);
            if (row !== INVALID_INDEX && nodeRows) {
                Object.keys(this.records?.nodeAttributes(row, id) ?? {}).forEach((name) => columns.add(name));
            }
        }

        for (const id of supplied.edges) {
            const row = space.indexOf(id);
            if (row !== INVALID_INDEX) {
                Object.keys(this.records?.edgeAttributes(row) ?? {}).forEach((name) => columns.add(name));
            }
        }

        return columns;
    }

    /**
     * Every table joined onto the graph and still loaded, oldest first.
     * @returns the joins
     */
    joins(): readonly JoinRecord[] {
        this.requireLive("joins");
        return Object.freeze(this.listed().flatMap((each) => (each.join === undefined ? [] : [each.join])));
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
        const { restored, gone } = this.stepsOn() ? this.stepsUnjoin(previous.key) : this.unjoin(previous);
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
     * @param stamp - for a load door: what its journal entries carry
     * @returns the dispatch
     */
    private sender(verb: string, stamp?: LoadStamp): (command: SessionCommand) => Promise<unknown> {
        const send = this.writes.send?.bind(this.writes);
        if (send === undefined) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: `This session cannot dispatch commands, so it cannot ${verb}.`,
                source: "data",
            });
        }

        return (command) => send(command, stamp);
    }

    /**
     * Every node or edge with its attributes as they arrived, in the graph's order.
     * @param kind - nodes or edges
     * @returns the rows
     */
    private joinRows(kind: "node" | "edge"): {
        readonly id: NodeId | EdgeId;
        readonly data: SessionAttributes;
        readonly source?: NodeId;
        readonly target?: NodeId;
    }[] {
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
            source: snapshot.ids.idOf(snapshot.edgeSource(index)),
            target: snapshot.ids.idOf(snapshot.edgeTarget(index)),
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
                .map((row) => ({ ...row, data: restored.get(`${kind}:${String(row.id)}`) ?? row.data }));
        return {
            nodes: read("node"),
            edges: read("edge"),
            table: (key) => this.loadTable(key),
            directed: this.current().directed,
        };
    }

    /**
     * A load read as a table, for a join's mapping table: a joined table's rows; any other load's
     * records, its edges when it read a table of edges, otherwise its nodes.
     * @param key - the load's key
     * @returns the table, or undefined for a load no longer in the graph
     */
    private loadTable(key: SourceKey): JoinTable | undefined {
        const entry = this.storedSources().find((each) => each.key === key);
        if (entry?.join !== undefined) {
            return entry.join.table;
        }

        if (entry === undefined) {
            return undefined;
        }

        const supplied = this.provenance()?.[key];
        const asEdges = entry.tableRows?.includes("edges") === true && !entry.tableRows.includes("nodes");
        let rows: Readonly<Record<string, unknown>>[];
        if (asEdges) {
            const ids = new Set(supplied?.edges ?? []);
            rows = this.edges().filter((edge) => ids.has(edge.id));
        } else {
            rows = (supplied?.nodes ?? []).flatMap((id) => this.node(id) ?? []);
        }

        const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].filter(
            (column) => !asEdges || column !== "id",
        );
        return { name: entry.name ?? key, columns, rows };
    }

    /**
     * What taking a join back takes: its edges and the nodes only it made removed, the values it
     * wrote put back as they were.
     * @param previous - the joined table's load
     * @param restored - the values a newer join's taking back has put back already, added to
     * @returns the steps, and the restored values and the elements that go, for planning anew
     */
    private unjoin(
        previous: LoadedSource,
        restored = new Map<string, Readonly<Record<string, unknown>>>(),
    ): {
        steps: SessionCommand[];
        restored: Map<string, Readonly<Record<string, unknown>>>;
        gone: Set<string>;
    } {
        const values = this.restoreValues(previous, restored);
        const gone = new Set<string>();
        const provenance = this.provenance();
        const index = provenanceIndex(provenance);
        const only = (keys: readonly SourceKey[] | undefined): boolean =>
            keys?.every((each) => each === previous.key) !== false;
        if (addsElements(previous.join)) {
            // What only this join added: its edges and the nodes it made that no other load supplied.
            const edges = (provenance?.[previous.key]?.edges ?? []).filter((id) => only(index.edges.get(id)));
            const nodes = nodesJoinAdded(previous, provenance).filter((id) => only(index.nodes.get(id)));
            edges.forEach((id) => gone.add(`edge:${id}`));
            nodes.forEach((id) => gone.add(`node:${String(id)}`));
            return {
                steps: [
                    ...values.steps,
                    { op: "data.apply", mutation: { kind: "remove-edges", ids: edges } },
                    { op: "data.apply", mutation: { kind: "remove-nodes", ids: nodes } },
                ],
                restored: values.restored,
                gone,
            };
        }

        // The nodes `unmatchedRows: "add"` made, which the rest of the graph did not supply.
        const made = nodesJoinMade(previous, provenance).filter((id) => only(index.nodes.get(id)));
        made.forEach((id) => gone.add(`node:${String(id)}`));
        return {
            steps: [
                ...values.steps,
                ...(made.length === 0
                    ? []
                    : [{ op: "data.apply" as const, mutation: { kind: "remove-nodes" as const, ids: made } }]),
            ],
            restored: values.restored,
            gone,
        };
    }

    /**
     * The values a join wrote over, put back as they were: what its record's `before` holds.
     * @param previous - the joined table's load
     * @param restored - the values a newer join's taking back has put back already, added to
     * @returns the step, and the restored values by `<kind>:<id>`
     */
    private restoreValues(
        previous: LoadedSource,
        restored = new Map<string, Readonly<Record<string, unknown>>>(),
    ): {
        steps: SessionCommand[];
        restored: Map<string, Readonly<Record<string, unknown>>>;
    } {
        const { join } = previous;
        const kind: "node" | "edge" = join?.shape === "edge-values" ? "edge" : "node";
        const held = new Map(
            join?.before === undefined ? [] : this.joinRows(kind).map((row) => [String(row.id), row] as const),
        );
        const rows: RowUpdate<NodeId | EdgeId>[] = [];
        for (const [id, values] of Object.entries(join?.before ?? {})) {
            const row = held.get(id);
            if (row === undefined) {
                continue;
            }

            const record = Object.fromEntries(
                Object.entries({ ...(restored.get(`${kind}:${id}`) ?? row.data), ...values }).filter(
                    ([name]) => values[name] !== null,
                ),
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
        if (this.stepsOn()) {
            await this.joinAsSteps(send, table, choices, shape, previous);
            return;
        }
        const undo = previous === undefined ? undefined : this.unjoin(previous);
        const graph = this.joinGraph(undo?.restored, undo?.gone);
        const planned = planTableJoin(table, graph, choices, shape);
        const { plan } = planned;

        const stored = this.storedSources();
        if (previous === undefined) {
            refuseJoinedAlready(stored, table);
        }

        const provenance = this.provenance();
        const key = previous?.key ?? nextSourceKey(stored, provenance);
        const onto = previous === undefined ? this.ontoOf(plan, graph) : (previous.join?.onto ?? null);
        const record: JoinRecord = frozen({
            source: key,
            onto,
            ...joinRecordFields(planned, choices, table),
            ...(plan.kind === "values" || Object.keys(plan.before).length > 0 ? { before: plan.before } : {}),
            ...(plan.kind === "edges" ? { made: nodesEdgesMake(plan, graph) } : {}),
        });
        const left = stored.filter((each) => each.key !== key);
        const leftProvenance = withoutSource(provenance, key);
        const described = describeSource(table.source);
        const steps: SessionCommand[] = [...(undo?.steps ?? [])];
        const context: JoinSteps = { table, record, key, onto, left, leftProvenance, described, previous };
        if (plan.kind === "edges") {
            this.pushEdgeJoin(steps, plan, context);
        } else {
            this.pushValueJoin(steps, plan, context);
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
     * The graph a join's records read with one joined table taken back, under the source-steps
     * experiment: the build without its source, as values put back and elements gone.
     * @param key - The joined table's source.
     * @returns The records put back and the elements gone, keyed `<kind>:<id>`.
     */
    private stepsUnjoin(key: SourceKey): {
        restored: Map<string, Readonly<Record<string, unknown>>>;
        gone: Set<string>;
    } {
        const value = this.stepsValue();
        const copies = this.stepsCopies();
        const idPath = this.readConfig().knownFields.nodeIdPath;
        const without = withoutJoin(value, key);
        const diff = diffGraph(
            projectBuild(buildOf(value, copies), value, idPath),
            projectBuild(buildOf(without, copies), without, idPath),
            this.stepsEdgeIds(),
        );
        const kept = new Set(Object.values(diff.kept));
        const gone = new Set([
            ...diff.removeNodes.map((id) => `node:${String(id)}`),
            ...Object.values(this.stepsEdgeIds())
                .filter((id) => !kept.has(id))
                .map((id) => `edge:${id}`),
        ]);
        const restored = new Map([
            ...diff.updateNodes.map((u) => [`node:${String(u.id)}`, u.values] as const),
            ...diff.updateEdges.map((u) => [`edge:${u.id}`, u.values] as const),
        ]);
        return { restored, gone };
    }

    /**
     * A join under the source-steps experiment: the table becomes a source and the steps its shape
     * names (a values join, a merge, or edges), as one undoable step with the join's label and
     * fact; editing a join replaces its steps and keeps its source id.
     * @param send - The dispatch.
     * @param table - The table and its source.
     * @param choices - The join.
     * @param shape - The shape when the choices give none.
     * @param previous - The joined table's load, when the join is being edited.
     */
    private async joinAsSteps(
        send: (command: SessionCommand) => Promise<unknown>,
        table: JoinedTable,
        choices: JoinChoices,
        shape: JoinShape,
        previous?: LoadedSource,
    ): Promise<void> {
        const unjoined = previous === undefined ? undefined : this.stepsUnjoin(previous.key);
        const graph = this.joinGraph(unjoined?.restored, unjoined?.gone);
        const planned = planTableJoin(table, graph, choices, shape);
        const { plan } = planned;
        if (previous === undefined) {
            refuseJoinedAlready(this.storedSources(), table);
        }
        const id = previous?.key ?? mintSourceId();
        const copy = mintCopyId();
        const record: JoinRecord = frozen({
            source: id,
            onto: previous === undefined ? this.ontoOf(plan, graph) : (previous.join?.onto ?? null),
            ...joinRecordFields(planned, choices, table),
        });
        const rows = table.rows as readonly Readonly<Record<string, SourceCellValue>>[];
        const tables = { [planned.shape === "edges" ? "edges" : "nodes"]: rows };
        const copies = { [copy]: tables };
        const base = previous === undefined ? this.stepsValue() : withoutJoin(this.stepsValue(), previous.key);
        const value = compileJoin(
            base,
            { ...this.stepsCopies(), ...copies },
            {
                id,
                copy,
                rows,
                choices,
                shape: planned.shape,
                record,
                mapping: planned.shape === "edges" ? undefined : joinMappingColumns(table, graph, choices),
            },
        );
        await send({
            op: "data.steps-set",
            edit: { kind: "set", value },
            copies,
            as: {
                label: `${previous === undefined ? "Joined" : "Joined again"} ${table.name}`,
                fact: {
                    code: previous === undefined ? "data.join" : "data.edit-join",
                    params: { key: id, name: table.name, shape: planned.shape, matched: planned.matched },
                },
            },
        });
    }

    /**
     * The steps that join a table's rows as edges: the earlier join's load taken off when the join
     * is being edited, then the edges loaded as a merge.
     * @param steps - the steps so far, added to
     * @param plan - the join's plan
     * @param context - the join's record, key and loads
     */
    private pushEdgeJoin(
        steps: SessionCommand[],
        plan: Extract<JoinPlan, { kind: "edges" }>,
        context: JoinSteps,
    ): void {
        const { table, record, key, onto, left, leftProvenance, described, previous } = context;
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
                nodes: plan.nodes,
                edges: plan.edges,
                declaredDirection: null,
                errors: [],
                errorLimit: 100,
                idPath: "id",
                source: keyExpression(plan.source),
                target: keyExpression(plan.target),
            },
            // A merge's records carry the values fused into the nodes they name.
            ...(plan.nodes.length === 0 ? {} : { existing: "update" as const }),
            origin: "join",
            ...(onto === null ? {} : { joinedOnto: onto }),
            join: record,
            key,
            tables: [table.name],
            tableRows: ["edges"],
        });
    }

    /**
     * The steps that join a table's rows as values: the values written, then the join's load
     * recorded with what it matched.
     * @param steps - the steps so far, added to
     * @param plan - the join's plan
     * @param context - the join's record, key and loads
     */
    private pushValueJoin(
        steps: SessionCommand[],
        plan: Extract<JoinPlan, { kind: "values" }>,
        context: JoinSteps,
    ): void {
        const { table, record, key, onto, left, leftProvenance, described } = context;
        if (plan.rows.length > 0) {
            steps.push({
                op: "data.apply",
                mutation: { kind: "update-rows", target: plan.target, rows: plan.rows },
            });
        }

        if (plan.newNodes.length > 0) {
            steps.push({
                op: "data.apply",
                mutation: {
                    kind: "add-nodes",
                    idPath: "id",
                    records: plan.newNodes.map((row) => ({ ...row.values, id: row.id })),
                },
            });
        }

        const nodes =
            plan.target === "node" ? [...(plan.matchedIds as NodeId[]), ...plan.newNodes.map((row) => row.id)] : [];
        const edges = plan.target === "edge" ? plan.matchedIds.map(String) : [];
        const entry: LoadedSource = frozen({
            ...described,
            key,
            kind: "join" as const,
            ...(onto === null ? {} : { joinedOnto: onto }),
            join: record,
            tables: [table.name],
            tableRows: [plan.target === "node" ? ("nodes" as const) : ("edges" as const)],
            added: { nodes: plan.newNodes.length, edges: 0 },
            loadedAt: new Date().toISOString(),
            counts: { nodes: nodes.length, edges: edges.length },
        });
        steps.push({
            op: "data.setSource",
            source: this.source() ?? described,
            sources: [...left, entry],
            provenance: withSupplied(leftProvenance, key, { nodes, edges }),
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
            countHeldEnds(plan, graph, (end) => {
                count(index.nodes.get(end));
            });
            for (const id of plan.matchedIds) {
                count(index.nodes.get(id));
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
        const recorded = this.afterReport ?? (this.writes.slice().values.get("importReport") as LoadReport | undefined);
        return recorded ?? this.graphStore.lastImport ?? null;
    }

    /**
     * The weight runs read, and its meaning: the edge column given the weight role (in the load's
     * mapping or later with {@link setRole}), else the one the last load read weights from.
     * @returns the weight, or null when no column has the weight role
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    loadedWeight(): LoadedWeight | null {
        const { edgeWeightPath, edgeWeightMeaning } = this.readConfig().knownFields;
        // Whether the designated column is an edge column: the first edge holding it answers, with
        // no description of every record (a run asks on every start).
        const attribute = designatedWeight(edgeWeightPath, this.lastImport()?.weights.attribute ?? null, (name) =>
            this.edgeColumns.get(name, () => {
                const { edgeCount } = this.current();
                for (let index = 0; index < edgeCount; index++) {
                    const record = this.records?.edgeAttributes(index);
                    if (record !== undefined && Object.hasOwn(record, name)) {
                        return true;
                    }
                }
                return false;
            }),
        );
        if (attribute === null) {
            return null;
        }
        const loaded: LoadedWeight = Object.freeze({ attribute, meaning: edgeWeightMeaning });
        return this.stepsOn() ? this.stepsWeight(loaded) : loaded;
    }

    /**
     * The weight runs read under source-steps (design 3.9 and 8.6): the setting is a view of the
     * weight roles, so it reads only while every built source that makes edges and reads a weight
     * reads it from one column, else null; and when the edges' weights mix meanings (or some edges'
     * sources read none) it says so, with the sources, so runs and layouts read none.
     * @param loaded - The weight the setting names.
     * @returns The weight, or null.
     */
    private stepsWeight(loaded: LoadedWeight): LoadedWeight | null {
        return this.stepsWeightColumns().size > 1 ? null : this.withMixed(loaded);
    }

    /**
     * The columns the built sources that make edges read the weight role from.
     * @returns The column names.
     */
    private stepsWeightColumns(): Set<string> {
        const value = this.stepsValue();
        return new Set(
            Object.keys(value.sources)
                .filter((id) => sourceState(value, id) === "built")
                .map((id) => value.sources[id].mapping.edges?.weight)
                .filter((column) => column !== undefined),
        );
    }

    /**
     * A weight with the build's mixed meanings, when they mix (design 8.6).
     * @param loaded - The weight.
     * @returns The weight, with `mixed` when the edges' weights do not share one meaning.
     */
    private withMixed(loaded: LoadedWeight): LoadedWeight {
        const mixed = mixedWeight(this.stepsBuild().result);
        return mixed === null ? loaded : Object.freeze({ ...loaded, mixed: Object.freeze({ sources: mixed }) });
    }

    /**
     * The weight a run over every edge reads. It is {@link loadedWeight}, except under source-steps
     * when built sources read the weight role from differently named columns: the setting then names
     * none, but every edge still holds its weight in `graphty.weight`, so a run reads that, and the
     * one weight rule decides by meanings alone (design 3.9, 8.6).
     * @returns The weight, or null.
     */
    private runWeight(): LoadedWeight | null {
        const loaded = this.loadedWeight();
        if (loaded !== null || !this.stepsOn() || this.stepsWeightColumns().size <= 1) {
            return loaded;
        }
        const { edgeWeightMeaning } = this.readConfig().knownFields;
        return this.withMixed(Object.freeze({ attribute: "graphty.weight", meaning: edgeWeightMeaning }));
    }

    /**
     * Under source-steps, which kinds of element a built source gives a time role (design 3.9): the
     * timeline reads `graphty.time` there, never a role setting.
     * @returns Whether node rows and edge rows of a built source carry a time role.
     */
    stepsTimed(): { readonly node: boolean; readonly edge: boolean } {
        let node = false;
        let edge = false;
        if (this.stepsOn()) {
            const value = this.stepsValue();
            for (const id of Object.keys(value.sources)) {
                if (sourceState(value, id) === "built") {
                    node ||= value.sources[id].mapping.nodes?.time !== undefined;
                    edge ||= value.sources[id].mapping.edges?.time !== undefined;
                }
            }
        }
        return { node, edge };
    }

    /**
     * The weight a run over some edges reads (design 8.6): {@link loadedWeight}, with the one weight
     * rule judged over those edges alone, so a run on one source's edges is weighted when they share
     * one meaning, whatever other sources' edges mix. Under source-steps it reads `graphty.weight`
     * when built sources weight from differently named columns (see {@link runWeight}).
     * @param inScope - Whether the run reads an edge; null for every edge.
     * @returns The weight, or null.
     */
    loadedWeightOver(inScope: ((edge: EdgeId) => boolean) | null): LoadedWeight | null {
        const loaded = this.runWeight();
        if (inScope === null || loaded?.mixed === undefined) {
            return loaded;
        }
        const read: BuiltEdge[] = [];
        for (const [id, edge] of elementsById(this.stepsBuild().result, this.stepsEdgeIds()).edges) {
            if (inScope(id)) {
                read.push(edge);
            }
        }
        const mixed = mixedAmong(read);
        const unmixed: LoadedWeight = Object.freeze({ attribute: loaded.attribute, meaning: loaded.meaning });
        return mixed === null ? unmixed : Object.freeze({ ...unmixed, mixed: Object.freeze({ sources: mixed }) });
    }

    /**
     * What {@link loadedWeight} answers from, as a key: it moves when the weight runs read does, and
     * reads no record to say so, so comparing it around a run costs nothing on a large graph.
     * @returns the key
     */
    weightKey(): string {
        const { edgeWeightPath, edgeWeightMeaning } = this.readConfig().knownFields;
        return JSON.stringify([edgeWeightPath, edgeWeightMeaning, this.lastImport()?.weights.attribute ?? null]);
    }

    /**
     * Every attribute the graph's records carry.
     * @param options - Under source-steps, only the columns one source or one type's elements carry.
     * @returns the descriptors, node attributes first
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    attributes(options?: SourceElementsFilter): readonly AttributeDescriptor[] {
        // While the working graph is on, a column's figures are what is shown (design decision
        // 78); the columns themselves, and what each is, stay the whole graph's.
        const all = this.shownColumns(this.columns());
        if (options?.source === undefined && options?.type === undefined) {
            return all;
        }
        this.requireSteps("attributes");
        const carried = new Set<string>();
        for (const el of this.stepsElements(options)) {
            const kind = "space" in el ? "node" : "edge";
            const names =
                options.source === undefined
                    ? Object.keys(el.values)
                    : [
                          ...Object.keys(el.own[options.source] ?? {}),
                          ...Object.entries(el.clashColumns ?? {})
                              .filter(([, c]) => c.source === options.source)
                              .map(([name]) => name),
                      ];
            for (const name of names) {
                carried.add(`${kind}:${name}`);
            }
        }
        return all.filter((a) => carried.has(`${a.kind}:${a.name}`));
    }

    /**
     * How many of one source's or one type's elements are in a scope, under source-steps.
     * @param options - The scope, the source and the type.
     * @returns The node and edge counts.
     */
    private countOf(options: { readonly scope?: WorkingScope } & SourceElementsFilter): {
        readonly nodes: number;
        readonly edges: number;
    } {
        const snapshot = this.current();
        const counted = (kind: "node" | "edge", total: number): number => {
            const { shown } = this.narrowedTo(kind, this.shownOf(kind, options.scope), options, "count");
            let count = 0;
            for (let index = 0; index < total; index++) {
                if (maskTest(shown, index)) {
                    count++;
                }
            }
            return count;
        };
        return { nodes: counted("node", snapshot.nodeCount), edges: counted("edge", snapshot.edgeCount) };
    }

    /**
     * Under source-steps, the rows of one kind that are shown and that one source supplied or are
     * of one type, and how a data column reads on them: the source's own value when a source is
     * named (design 3.8), so another source's value for the same column is not counted.
     * @param kind - Nodes or edges.
     * @param shown - The rows shown, or null for every row.
     * @param filter - The source and the type; absent members do not narrow.
     * @param verb - The calling verb, for the refusal while the experiment is off.
     * @returns The rows, and the source's own values when a source is named.
     * @throws A `GraphtyError` with `E_FEATURE_OFF` while the source-steps experiment is off.
     */
    private narrowedTo(
        kind: "node" | "edge",
        shown: U32 | null,
        filter: SourceElementsFilter,
        verb: string,
    ): { readonly shown: U32; readonly own: FilterValueSource | undefined } {
        this.requireSteps(verb);
        const { result } = this.stepsBuild();
        const { nodes, edges } = elementsById(result, this.stepsEdgeIds());
        const snapshot = this.current();
        const space = edgeSpaceOf(snapshot);
        const rows = kind === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const mask = makeMask(rows);
        for (let index = 0; index < rows; index++) {
            const el = kind === "node" ? nodes.get(String(snapshot.ids.idOf(index))) : edges.get(space.idOf(index));
            if (
                el !== undefined &&
                (shown === null || maskTest(shown, index)) &&
                (filter.source === undefined || el.loads.includes(filter.source)) &&
                (filter.type === undefined || el.type === filter.type)
            ) {
                maskSet(mask, index, true);
            }
        }
        return { shown: mask, own: filter.source === undefined ? undefined : this.ownValues(filter.source) };
    }

    /**
     * The built elements one source supplied and of one type, under the source-steps experiment.
     * @param filter - The source and the type; absent members do not narrow.
     * @returns The nodes, then the edges.
     */
    private stepsElements(filter: SourceElementsFilter): BuiltElementOf[] {
        const { result } = this.stepsBuild();
        return [...result.nodes.values(), ...result.edges.values()].filter(
            (el) =>
                (filter.source === undefined || el.loads.includes(filter.source)) &&
                (filter.type === undefined || el.type === filter.type),
        );
    }

    /**
     * Every attribute the graph's records carry, each measured over the whole graph: what the
     * session's own readers resolve a column with, so naming a column never builds the view.
     * @returns the descriptors, node attributes first
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    columns(): readonly AttributeDescriptor[] {
        // Keyed on the data revision, which moves on a freeze AND on an attribute write (keyed on the
        // snapshot alone, an edited value never reached the descriptors), and not on a mask change,
        // which moves the input tick but no column, type or value (issue #4386).
        const snapshot = this.current();
        const { columns: described } = this.describedColumns();
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

        const overlay: AttributeOverlay = {
            declarations,
            roles,
            uses,
            fed,
            settings,
            hidden,
            joined,
            parsed,
            snapshot,
        };
        const result =
            declarations.size === 0 &&
            roles.size === 0 &&
            uses.size === 0 &&
            fed.size === 0 &&
            joined.size === 0 &&
            parsed.size === 0 &&
            settings === NO_COLUMN_SETTINGS
                ? described
                : Object.freeze(described.map((each) => overlaidAttribute(each, overlay)));
        this.attributeOverlay = { described, key, result };
        return result;
    }

    /**
     * Every column the records carry, described once per data revision: the data's columns, and
     * apart from them the readable paths the source-steps build writes on each record.
     * @returns The two lists.
     */
    private describedColumns(): {
        readonly columns: readonly AttributeDescriptor[];
        readonly readable: readonly AttributeDescriptor[];
    } {
        const snapshot = this.current();
        return this.attributeCache.get("", () => {
            // The `_source.` facts are the element's bookkeeping of network loads, not the data's
            // columns, and so is what a collapsed group keeps for its expand.
            const all = describeAttributes(snapshot, this.records).filter(
                (each) => !isSourceFactKey(each.name) && each.name !== GROUP_RESTORE,
            );
            const isReadable = (each: AttributeDescriptor): boolean =>
                this.stepsOn() && RECORD_PATHS.includes(each.name);
            return {
                columns: Object.freeze(all.filter((each) => !isReadable(each))),
                readable: Object.freeze(
                    all.filter((each) => isReadable(each)).map((each) => ({ ...each, path: each.name })),
                ),
            };
        });
    }

    /**
     * The columns with their figures (completeness, distinct values, range, samples) measured over
     * what the working graph shows, built once per view.
     * @param whole - The whole graph's columns.
     * @returns The columns, the whole graph's when nothing is hidden.
     */
    private shownColumns(whole: readonly AttributeDescriptor[]): readonly AttributeDescriptor[] {
        const view = this.records === null ? null : this.viewOf(undefined);
        if (view === null || this.records === null) {
            return whole;
        }

        const held = this.viewColumns.get(view);
        if (held?.whole === whole) {
            return held.shown;
        }

        const shown = describeShownFigures(whole, this.current(), this.records, view);
        this.viewColumns.set(view, { whole, shown });
        return shown;
    }

    /**
     * The values every node carries from the graph's structure, with their catalog names.
     * @returns degree, and on a directed graph in-degree and out-degree
     */
    structureValues(): readonly StructureValue[] {
        // In and out degree only when some edge is directed, where they differ from degree.
        const { directedness } = this.statistics({ scope: "all" });
        return directedness === "directed" || directedness === "mixed"
            ? STRUCTURE_VALUES
            : STRUCTURE_VALUES.filter((each) => each.path === "graphty.degree");
    }

    /**
     * One node's structure value, as a column of a table reads it.
     * @param id - The node.
     * @param path - A path {@link structureValues} lists (`graphty.degree`).
     * @param options - Where to measure.
     * @param options.scope - Among what is shown, or the whole graph; absent, what the working
     *     graph says.
     * @returns The value, or undefined for an unknown node or a path that is no structure value.
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    structureValue(id: NodeId, path: Path, options: { readonly scope?: WorkingScope } = {}): number | undefined {
        const snapshot = this.current();
        if (!snapshot.ids.has(id)) {
            return undefined;
        }

        const row = snapshot.ids.indexOf(id);
        const view = this.viewOf(options.scope);
        if (view === null) {
            return structureValuesOf(snapshot, path)?.[row];
        }

        // Measured among what is shown: a hidden node has no value there.
        const at = view.nodeRows?.[row] ?? INVALID_INDEX;
        return at === INVALID_INDEX ? undefined : structureValuesOf(view.snapshot, path)?.[at];
    }

    /**
     * Options with the working graph's scope filled in: what is shown while it is on and the
     * options name no scope.
     * @param options - The options as given.
     * @returns The options to read with.
     */
    private scoped<TOptions extends { readonly scope?: ScopeInput }>(options: TOptions): TOptions {
        return options.scope === undefined && this.pages.working?.().enabled === true
            ? { ...options, scope: "visible" }
            : options;
    }

    /**
     * Which rows of one kind a scope-taking reader counts.
     * @param kind - Nodes or edges.
     * @param scope - The scope it was asked for; absent, what the working graph says.
     * @returns The shown rows as a bitmap, or null for every row.
     */
    private shownOf(kind: "node" | "edge", scope: WorkingScope | undefined): U32 | null {
        const view = this.viewOf(scope);
        if (view === null) {
            return null;
        }

        return kind === "node" ? view.nodes : view.edges;
    }

    /**
     * The rows of one kind the working graph shows, in row order, or null when it shows them all.
     * @param kind - Nodes or edges.
     * @param rows - How many rows the kind has.
     * @returns The shown rows, or null.
     */
    private shownRows(kind: "node" | "edge", rows: number): number[] | null {
        const shown = this.shownOf(kind, undefined);
        if (shown === null) {
            return null;
        }

        const kept: number[] = [];
        for (let row = 0; row < rows; row++) {
            if (maskTest(shown, row)) {
                kept.push(row);
            }
        }

        return kept;
    }

    /**
     * The view a scope-taking reader reads, or null for the whole graph.
     * @param scope - The scope it was asked for; absent, what the working graph says.
     * @returns The view, or null when it is the whole graph.
     */
    private viewOf(scope: WorkingScope | undefined): WorkingView | null {
        const working = this.pages.working?.();
        if (working === undefined) {
            return null;
        }

        const view = working.view(scope);
        return view.whole ? null : view;
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
            directed: ["directed", "mixed"].includes(this.statistics({ scope: "all" }).directedness),
            attributes: this.columns(),
            element: this.describedColumns().readable,
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
     * less a column it wrote over, kept or computed (any clash rule but `"both"`), which was the
     * graph's before the join.
     * @returns the columns
     */
    private joinedColumns(): ReadonlySet<string> {
        const out = new Set<string>();
        for (const { join } of this.storedSources()) {
            if (join === undefined) {
                continue;
            }

            const kind = join.shape === "node-values" || join.shape === "merge" ? "node" : "edge";
            for (const name of join.columns) {
                // ponytail: a record keeps no list of the columns that clashed, so only a column with
                // a rule of its own, or under "*", counts as the graph's; record clashes to tell them apart.
                const rule = join.choices.clash?.[name] ?? join.choices.clash?.["*"];
                if (rule === undefined || rule === "both") {
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
        addLayerUses(out, styles, described);
        const { renamed } = this.columnSettings();
        for (const [id, entry] of runs) {
            const attribute = renamedNow(entry.record.caveats.weight?.attribute, renamed);
            if (attribute !== undefined) {
                addUse(out, `edge:${attribute}`, { kind: "run", id });
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
        add("node", "x", knownFields.nodeXPath);
        add("node", "y", knownFields.nodeYPath);
        add("node", "z", knownFields.nodeZPath);

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
        const kinds = this.kindColumns();
        put("node", "kind", kinds.node);
        put("edge", "kind", kinds.edge);
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
        const { kind, name } = resolveColumn(this.columns(), column);
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
        // Records written straight onto the graph are not in any source, so the next build would undo
        // them for some elements and not others: a column-wide write waits for its steps form.
        if (writesRecords(command)) {
            this.refuseUnderSteps(verb);
        }
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
     * The column the element would read a role from, when one is obvious; see the public docs.
     * @param kind - nodes or edges
     * @param role - the role
     * @returns the column's name, or null
     */
    roleCandidate(kind: "node" | "edge", role: ColumnRole): string | null {
        // A column that already plays a role, or that a run or a formula made, is never offered.
        const free = this.attributes().filter(
            (a) =>
                a.kind === kind &&
                a.roles === undefined &&
                a.hidden !== true &&
                (a.origin === "imported" || a.origin === "joined"),
        );
        const has = (name: string): boolean => free.some((a) => a.name === name);
        const times = (this.pages.timeCandidates?.() ?? []).filter((each) => each.kind === kind);
        if (role === "time") {
            return times.find((each) => has(each.column))?.column ?? null;
        }

        if (role === "label") {
            const text = free.filter((a) => a.type === "string" || a.type === "category");
            return LABEL_COLUMNS.find((name) => text.some((a) => a.name === name)) ?? null;
        }

        if (role === "kind") {
            const groups = free.filter((a) => a.type === "category" || a.type === "string");
            return KIND_COLUMNS.find((name) => groups.some((a) => a.name === name)) ?? null;
        }

        if (role === "weight" && kind === "edge") {
            // As a load reads one, and a load reads a weight for edges only.
            return weightAmong(
                free
                    .filter(
                        (a) =>
                            (a.type === "number" || a.type === "integer") &&
                            !times.some((each) => each.column === a.name),
                    )
                    .map((a) => a.name),
            );
        }

        return null;
    }

    /**
     * Give a column a role, or take its roles away, as one undoable step.
     * @param column - the column
     * @param role - the role, or null for none
     * @param options - Under source-steps, the source whose role it is.
     * @returns settles once the step is recorded
     */
    async setRole(column: ColumnRef, role: ColumnRole | null, options: SourceRoleOptions = {}): Promise<void> {
        this.requireLive("setRole");
        const { kind, name } = resolveColumn(this.columns(), column);
        const target = this.stepsRole(name, role, options);
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

            if (Object.keys(patch).length === 0 && !this.listsLocation(kind, name) && target === null) {
                return;
            }
        } else {
            patch[roleField({ kind, name, role, fields, snapshot, knownFields })] = name;
        }

        if (kind === "node") {
            Object.assign(patch, this.locationPatch(name, role));
        }

        // Under source-steps the setting is a view of the role (design 3.9): the role is written to
        // the source's mapping, and the setting beside it as today.
        const steps: SessionCommand[] = [
            ...(target === null ? [] : [{ op: "data.steps-set" as const, edit: target }]),
            { op: "config.set", values: { data: { knownFields: patch } } },
            ...this.placedBy(kind, { ...knownFields, ...patch }, role),
        ];
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
     * The step placing every node at the position its x, y and z columns give, when a role change
     * on a node column gives one of those roles, so the rows already loaded are placed as a load
     * places them (`readSeedPosition`): scene units, the file's scaled by `positionScale`.
     * @param kind - The column's kind.
     * @param known - `data.knownFields` as the role change leaves it.
     * @param role - The role given.
     * @returns The `positions.set` step, or none.
     */
    private placedBy(
        kind: "node" | "edge",
        known: Readonly<Record<string, unknown>>,
        role: ColumnRole | null,
    ): SessionCommand[] {
        if (kind !== "node" || (role !== "x" && role !== "y" && role !== "z")) {
            return [];
        }
        const axes = known as { nodeXPath?: string | null; nodeYPath?: string | null; nodeZPath?: string | null };
        const scale = typeof known.positionScale === "number" ? known.positionScale : 1;
        const entries = this.nodes({ scope: "graph" }).flatMap((row) => {
            const at = readAxes(row, axes);
            return at === null ? [] : [{ id: row.id, x: at[0] * scale, y: at[1] * scale, z: at[2] * scale }];
        });
        return entries.length === 0 ? [] : [{ op: "positions.set", entries }];
    }

    /**
     * The edit a role setter makes to the sources and steps, under source-steps.
     * @param column - The column.
     * @param role - The role, or null.
     * @param options - The source the caller named.
     * @returns The edit, or null when it writes only the setting.
     * @throws A `GraphtyError` with `E_FEATURE_OFF` for a source named while the experiment is off.
     */
    private stepsRole(column: string, role: ColumnRole | null, options: SourceRoleOptions): StepsEdit | null {
        if (options.source !== undefined) {
            this.requireSteps("setRole");
        }
        if (!this.stepsOn()) {
            return null;
        }
        if (role === "weight" || role === "time") {
            return this.roleTarget(column, role, options);
        }
        // Any other role, or none, takes the column's weight and time roles away (design 3.9).
        return this.rolesCleared((member, value) => value === column && (member === "weight" || member === "time"));
    }

    /**
     * Under source-steps, the role edits a settings write makes (design 3.9): the settings are views
     * of the roles, so naming a weight or time column gives that role to the one built source that
     * can take it, and a null weight takes every weight role away.
     * @param knownFields - The `data.knownFields` the write sets.
     * @returns The edit, or null when it writes only the setting.
     * @throws A `GraphtyError` with `E_ROLE_TARGET_AMBIGUOUS` when several sources could take a role.
     */
    settingRoles(knownFields: Readonly<Record<string, unknown>> | undefined): StepsEdit | null {
        if (!this.stepsOn() || knownFields === undefined) {
            return null;
        }
        let edit: StepsEdit | null = null;
        const base = (): SourceSteps => (edit?.kind === "set" ? edit.value : this.stepsValue());
        const { edgeWeightPath, edgeTimePath, nodeTimePath } = knownFields;
        if (edgeWeightPath === null) {
            edit = this.rolesCleared((member) => member === "weight");
        } else if (typeof edgeWeightPath === "string") {
            edit = this.roleTarget(edgeWeightPath, "weight", {}, base()) ?? edit;
        }
        for (const [path, table] of [
            [edgeTimePath, "edges"],
            [nodeTimePath, "nodes"],
        ] as const) {
            if (path === null) {
                // A null time setting turns that table's timeline off: its time roles go too.
                const cleared = this.rolesCleared((member) => member === "time", table, base());
                edit = cleared ?? edit;
                continue;
            }
            // A readable path such as graphty.time is the build's own, never a source's column.
            if (typeof path === "string" && !(READABLE_PATHS as readonly string[]).includes(path)) {
                edit = this.roleTarget(path, "time", {}, base()) ?? edit;
            }
        }
        return edit;
    }

    /**
     * Under source-steps, the edit that takes some roles out of every source's mapping.
     * @param drops - Whether a mapping member, with its value, goes.
     * @param only - The one mapping table to strip; both by default.
     * @param value - The sources and steps to strip; the graph's own by default.
     * @returns The edit, or null when no mapping holds one.
     */
    private rolesCleared(
        drops: (member: string, value: unknown) => boolean,
        only?: "nodes" | "edges",
        value: SourceSteps = this.stepsValue(),
    ): StepsEdit | null {
        let changed = false;
        const strip = <T extends object>(table: T | undefined, name: "nodes" | "edges"): T | undefined => {
            if (table === undefined || (only !== undefined && only !== name)) {
                return undefined;
            }
            const kept = Object.entries(table).filter(([member, v]) => !drops(member, v));
            changed ||= kept.length !== Object.keys(table).length;
            return Object.fromEntries(kept) as T;
        };
        const sources = Object.fromEntries(
            Object.entries(value.sources).map(([id, source]) => {
                const nodes = strip(source.mapping.nodes, "nodes");
                const edges = strip(source.mapping.edges, "edges");
                const mapping = {
                    ...source.mapping,
                    ...(nodes === undefined ? {} : { nodes }),
                    ...(edges === undefined ? {} : { edges }),
                };
                return [id, { ...source, mapping }];
            }),
        );
        return changed ? { kind: "set", value: { ...value, sources } } : null;
    }

    /**
     * The source a weight or time role goes to under source-steps (design 3.9), as the edit that
     * writes it to that source's mapping. Only built sources carrying the column count, and of those
     * the ones that can carry the role: those making edges for weight, those whose mapping has a time
     * for time (all of them, if none has).
     * @param column - The column.
     * @param role - The role.
     * @param options - The source the caller named.
     * @param value - The sources and steps to write it into; the graph's own by default.
     * @returns The edit, or null while no source is built (the setting is kept for the next one).
     * @throws A `GraphtyError` with `E_ROLE_TARGET_AMBIGUOUS` when several sources could take it.
     */
    private roleTarget(
        column: string,
        role: "weight" | "time",
        options: SourceRoleOptions,
        value: SourceSteps = this.stepsValue(),
    ): StepsEdit | null {
        const copies = this.stepsCopies();
        const built = Object.keys(value.sources).filter((id) => sourceState(value, id) === "built");
        if (options.source === undefined && built.length === 0) {
            return null;
        }
        const tableOf = (id: string): "nodes" | "edges" | null => {
            const tables = copies[copyKey(value.sources[id])] ?? {};
            if (column in (tables.edges?.[0] ?? {})) {
                return "edges";
            }
            return column in (tables.nodes?.[0] ?? {}) ? "nodes" : null;
        };
        const can = built.filter((id) => {
            const { mapping } = value.sources[id];
            return role === "weight"
                ? mapping.edges !== undefined
                : mapping.nodes?.time !== undefined || mapping.edges?.time !== undefined;
        });
        const carrying = (ids: readonly string[]): string[] => ids.filter((id) => tableOf(id) !== null);
        let pool = carrying(can);
        if (pool.length === 0) {
            pool = carrying(built).length > 0 ? carrying(built) : built;
        }
        if (options.source === undefined && pool.length > 1) {
            throw new GraphtyError({
                code: "E_ROLE_TARGET_AMBIGUOUS",
                message: `Several sources could give ${column} the ${role} role; name one with the source option.`,
                source: "data",
                details: { sources: pool, column, role },
            });
        }
        const id = options.source ?? pool[0];
        const source = value.sources[id] as StepsSource | undefined;
        if (source === undefined) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `No source has the key ${id}.`,
                source: "data",
                details: { source: id },
            });
        }
        const table = role === "weight" ? "edges" : (tableOf(id) ?? (source.mapping.edges ? "edges" : "nodes"));
        const prior = source.mapping[table];
        if (prior === undefined) {
            return null;
        }
        const mapping = { ...source.mapping, [table]: { ...prior, [role]: column } };
        return {
            kind: "set",
            value: { ...value, sources: { ...value.sources, [id]: { ...source, mapping } } },
        };
    }

    /**
     * The node location kinds listed now: designated one column per kind, else what is read.
     * @returns the listing
     */
    private locationListing(): LocationListing {
        const known = this.readConfig().knownFields;
        const nodes = this.nodes();
        const columns = this.columns().flatMap((c) =>
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
        const { kind, name } = resolveColumn(this.columns(), column);
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
        const { kind, name } = resolveColumn(this.columns(), column);
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
     * @param options - with the source-steps experiment, the one source to rename it in
     * @param options.source - the source
     * @returns settles once the step is recorded
     */
    async renameColumn(column: ColumnRef, name: string, options: { readonly source?: SourceKey } = {}): Promise<void> {
        this.requireLive("renameColumn");
        if (options.source !== undefined) {
            const rename = {
                source: options.source,
                table: column.kind === "node" ? ("nodes" as const) : ("edges" as const),
                from: column.name,
                to: name,
            };
            return this.stepsAct("renameColumn", { act: "rename", rename });
        }
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
        const attributes = this.columns();
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
        const rows = renamedRows(this.rawRows(kind), from, name);
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

        const rename: ColumnRename = { kind, from, name };
        const { styles, visibility } = this.writes.readers();
        pushLayerRenames(steps, styles, rename);
        pushVisibilityRenames(steps, visibility, rename);
        // The names given to its values.
        for (const { value, label } of typedValueLabelsAt(this.writes.valueLabels(), `data.${from}`)) {
            steps.push(
                { op: "data.label", path: `data.${name}`, value, label },
                { op: "data.label", path: `data.${from}`, value, label: null },
            );
        }

        // The settings, and the declaration.
        steps.push({
            op: "data.columns",
            settings: renamedSettings(this.columnSettings(), rename),
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
     * Add a computed column, or give one a new expression, as one undoable step.
     * @param name - the column's name
     * @param expression - what each value is
     * @param options - nodes or edges
     * @returns settles once the step is recorded
     */
    async derive(name: string, expression: Query, options: DeriveOptions = {}): Promise<void> {
        this.requireLive("derive");
        // Computed over the committed graph: a drawn draft's After comes off while it is written.
        return this.withoutDrawnDraft(() =>
            this.afterLoads(
                () => this.deriveNow(name, expression, options.kind ?? "node"),
                () => undefined,
            ),
        );
    }

    /**
     * Add a score: a computed column whose values are its terms' rescaled values, weighted and summed.
     * @param name - the column's name
     * @param terms - the columns and their weights
     * @param options - nodes or edges
     * @returns settles once the step is recorded
     */
    async deriveScore(name: string, terms: readonly ScoreTerm[], options: DeriveOptions = {}): Promise<void> {
        this.requireLive("deriveScore");
        // Checked as unknown: a caller's terms may break their type, and narrowing `terms` itself
        // would leave it an any[].
        const given: unknown = terms;
        if (!Array.isArray(given) || given.length === 0) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "A score has at least one term.",
                source: "data",
                details: { reason: "no-terms", column: name },
            });
        }

        if (!isTerms(terms)) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: "Each term of a score is a path with a finite weight, or none.",
                source: "data",
                details: { reason: "bad-weight", column: name, terms },
            });
        }

        const score = terms.map((term) => Object.freeze({ path: term.path, weight: term.weight ?? 1 }));
        return this.afterLoads(
            () => this.deriveNow(name, scoreExpression(score), options.kind ?? "node", score),
            () => undefined,
        );
    }

    /**
     * Every computed column.
     * @returns the columns, in the order they were added
     */
    derivedColumns(): readonly DerivedColumn[] {
        this.requireLive("derivedColumns");
        return derivedColumnsOf(this.writes.slice().values);
    }

    /**
     * The command that brings the computed columns up to date, for the dispatcher's `derive`
     * service: what a data edit, a load or a run starts once it is recorded.
     * @returns the command, or null when no value changes
     */
    derivedRefresh(): DataDeriveCommand | null {
        const columns = this.derivedColumns();
        if (columns.length === 0) {
            return null;
        }

        const { nodes, edges } = derivedRows(columns, this.current(), this.pages.valuesWhere);
        return nodes.length === 0 && edges.length === 0 ? null : { op: "data.derive", columns, nodes, edges };
    }

    /**
     * derive, once the loads asked for before it have landed.
     * @param name - as derive takes it
     * @param expression - as derive takes it
     * @param kind - nodes or edges
     * @param score - a score's terms, for deriveScore; absent for derive
     * @returns what derive returns
     */
    private async deriveNow(
        name: string,
        expression: Query,
        kind: "node" | "edge",
        score?: readonly ScoreTerm[],
    ): Promise<void> {
        this.requireLive("derive");
        const refuse = (reason: string, message: string): GraphtyError =>
            new GraphtyError({
                code: "E_BAD_COMMAND",
                message,
                source: "data",
                details: { reason, kind, column: name, expression },
            });
        if (typeof name !== "string" || name.trim() === "") {
            throw refuse("empty-name", "A computed column's name is a string with something in it.");
        }

        if (kind !== "node" && kind !== "edge") {
            throw refuse("bad-kind", 'A computed column is carried by "node" or "edge".');
        }

        const existing = this.derivedColumns();
        const replacing = existing.some((each) => each.kind === kind && each.name === name);
        if (!replacing && this.columns().some((each) => each.kind === kind && each.name === name)) {
            throw refuse("name-taken", `A ${kind} column is already named ${JSON.stringify(name)}.`);
        }

        if (typeof expression !== "string") {
            throw refuse("not-an-expression", "A computed column's expression is a string.");
        }

        // Parsed here, so a bad expression is refused with its own reason and position.
        if (expressionPaths(expression).includes(`data.${name}`)) {
            throw refuse("reads-itself", `The expression of ${JSON.stringify(name)} reads ${JSON.stringify(name)}.`);
        }

        const unknown = this.pages.unresolvedWhere(expression);
        if (unknown.length > 0) {
            throw new GraphtyError({
                code: "E_UNKNOWN_ATTRIBUTE",
                message: `The expression reads ${unknown.join(", ")}, which nothing in the graph answers.`,
                source: "data",
                details: { paths: unknown, expression },
            });
        }

        const column: DerivedColumn =
            score === undefined ? { kind, name, expression } : { kind, name, expression, score };
        const columns = replacing
            ? existing.map((each) => (each.kind === kind && each.name === name ? column : each))
            : [...existing, column];
        const { nodes, edges } = derivedRows(columns, this.current(), this.pages.valuesWhere);
        await this.send({ op: "data.derive", columns, nodes, edges, column: { kind, name } }, "compute a column");
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
        const attributes = this.columns();
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

        // A drawn draft's After holds the graph's settings while it is on: it comes off while this is written.
        await this.withoutDrawnDraft(() =>
            this.send(
                {
                    op: "batch",
                    label: hidden
                        ? `Hid ${String(changing.length)} columns`
                        : `Showed ${String(changing.length)} columns`,
                    fact: {
                        code: hidden ? "data.hide-columns" : "data.show-columns",
                        params: { count: changing.length },
                    },
                    steps: [{ op: "data.columns", settings: { ...settings, hidden: [...now] } }],
                },
                "hide columns",
            ),
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
    histogram(
        column: ColumnRef,
        options: HistogramOptions & { readonly scope?: WorkingScope } & SourceElementsFilter = {},
    ): ColumnHistogram {
        const snapshot = this.current();
        const descriptor = resolveColumn(this.columns(), column);
        const { name } = descriptor;
        const count = descriptor.kind === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const narrowed = narrows(options)
            ? this.narrowedTo(descriptor.kind, this.shownOf(descriptor.kind, options.scope), options, "histogram")
            : null;
        const shown = narrowed?.shown ?? this.shownOf(descriptor.kind, options.scope);
        const read = this.cellReader(descriptor.kind, name, narrowed?.own);
        // A hidden element carries nothing here, so it is counted with neither values nor bins.
        const valueAt =
            shown === null ? read : (index: number): unknown => (maskTest(shown, index) ? read(index) : undefined);

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
        const { counts, present } = tallyScalars(count, valueAt);
        const values = [...counts]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([value, n]) => Object.freeze({ value, count: n }));
        const listed = values.reduce((sum, each) => sum + each.count, 0);
        return Object.freeze({ kind: "categorical", values: Object.freeze(values), otherCount: present - listed });
    }

    /**
     * How one data column's cell is read per row: from the record, or a source's own value.
     * @param kind - Nodes or edges.
     * @param name - The column.
     * @param own - A source's own values, under source-steps; absent reads the record.
     * @returns The reader.
     */
    private cellReader(
        kind: "node" | "edge",
        name: string,
        own: FilterValueSource | undefined,
    ): (index: number) => unknown {
        if (own !== undefined) {
            return kind === "node" ? (index) => own.nodeValue(index, name) : (index) => own.edgeValue(index, name);
        }
        const snapshot = this.current();
        return kind === "node"
            ? (index) => this.records?.nodeAttributes(index, snapshot.ids.idOf(index))?.[name]
            : (index) => this.records?.edgeAttributes(index)?.[name];
    }

    /**
     * How many elements carry each value of a readable path.
     * @param path - the value path, or `"id"`
     * @param options - which kind to count
     * @param options.kind - nodes or edges; by default the kind the path is listed on
     * @param options.scope - among what is shown, or the whole graph; absent, what the working
     *     graph says
     * @returns the counts, most elements first
     */
    valueCounts(
        path: Path,
        options: { readonly kind?: "node" | "edge"; readonly scope?: WorkingScope } & SourceElementsFilter = {},
    ): ValueCounts {
        const snapshot = this.current();
        const kind =
            options.kind ??
            (this.readableValues().find((value) => value.path === path)?.on === "edge" ? "edge" : "node");
        const rows = kind === "node" ? snapshot.nodeCount : snapshot.edgeCount;
        const narrowed = narrows(options)
            ? this.narrowedTo(kind, this.shownOf(kind, options.scope), options, "valueCounts")
            : null;
        const shown = narrowed?.shown ?? this.shownOf(kind, options.scope);
        const own = path.startsWith("data.") ? narrowed?.own : undefined;
        let read = this.valueReader(kind, path);
        if (own !== undefined) {
            read = kind === "node" ? (index) => own.nodeValue(index, path) : (index) => own.edgeValue(index, path);
        }
        const { counts, present, total } = tallyScalars(rows, read, shown);
        const missing = total - present;

        const values = [...counts].sort((a, b) => b[1] - a[1]).map(([value, count]) => Object.freeze({ value, count }));
        return Object.freeze({ values: Object.freeze(values), missing, total });
    }

    /**
     * The column each kind of element reads its kind from: the one the data configuration names
     * (`data.setRole`, or a file that declares kinds), else the `kind` attribute a load's mapping
     * wrote (`TableMapping.kind`, `kindName`, `sourceKind`, `targetKind`).
     * @returns the node and edge columns, each null when none plays the role
     */
    private kindColumns(): { readonly node: string | null; readonly edge: string | null } {
        const { knownFields } = this.readConfig();
        const set = (value: unknown): boolean => value !== undefined && value !== null;
        const tables = this.storedSources().flatMap(({ mapping }) => Object.values(mapping?.tables ?? {}));
        const nodeKinds = tables.some((table) =>
            table.rowsAre === "nodes"
                ? set(table.kind) || set(table.kindName)
                : set(table.sourceKind) || set(table.targetKind),
        );
        const edgeKinds = tables.some((table) => table.rowsAre !== "nodes" && set(table.kind));
        const node = knownFields.nodeKindPath ?? (nodeKinds ? LOADED_KIND : null);
        const edge = knownFields.edgeKindPath ?? (edgeKinds ? LOADED_KIND : null);
        return { node, edge };
    }

    /**
     * How many nodes and edges there are of each kind, read from the column with the `kind` role.
     * @returns the counts of each kind of element, null for one with no kind column
     */
    kinds(): GraphKinds {
        const columns = this.kindColumns();
        const count = (kind: "node" | "edge"): ElementKinds | null => {
            const column = columns[kind];
            if (column === null) {
                return null;
            }

            const snapshot = this.current();
            const rows = kind === "node" ? snapshot.nodeCount : snapshot.edgeCount;
            const { counts, present, total } = tallyScalars(
                rows,
                this.valueReader(kind, `data.${column}`),
                this.shownOf(kind, undefined),
                true,
            );
            const values = [...counts]
                .sort((a, b) => b[1] - a[1])
                .map(([value, n]) => Object.freeze({ value, count: n }));
            return Object.freeze({ column, values: Object.freeze(values), missing: total - present, total });
        };

        return Object.freeze({ nodes: count("node"), edges: count("edge") });
    }

    /**
     * How a path's value is read per element, as `valueCounts` counts it.
     * @param kind - nodes or edges
     * @param path - the value path, or `"id"` for the node id
     * @returns the value of the element at a row
     */
    private valueReader(kind: "node" | "edge", path: Path): (index: number) => unknown {
        const snapshot = this.current();
        // Degree, in-degree and out-degree are read from the snapshot, not a column.
        const structure = kind === "node" ? structureValuesOf(snapshot, path) : undefined;
        if (structure !== undefined) {
            return (index) => structure[index];
        }
        if (path === "id" && kind === "node") {
            return (index) => snapshot.ids.idOf(index);
        }
        return (index) => this.pages.valueAt(kind, index, path);
    }

    /**
     * Per group, the node values that occur in the group more often than chance.
     * @param groupBy - the path holding each node's group
     * @param options - which columns to test and how to correct
     * @returns every group, largest first, with its over-represented values
     */
    overRepresented(groupBy: Path, options: OverRepresentedOptions = {}): OverRepresentedValues {
        const snapshot = this.current();
        const paths =
            options.columns ??
            this.columns()
                .filter(
                    (each) =>
                        each.kind === "node" &&
                        each.path !== groupBy &&
                        each.holdsNodeIds !== true &&
                        (each.measurement === "categorical" || each.measurement === "ordinal"),
                )
                .map((each) => each.path);
        // Over what is shown while the working graph is on: a hidden node is in no group.
        const rows = this.shownRows("node", snapshot.nodeCount);
        const rowOf = rows === null ? (index: number) => index : (index: number) => rows[index];
        // ponytail: walked on every call; cache by data revision when a profile is read per frame.
        return overRepresentedValues(
            groupBy,
            (index) => this.pages.valueAt("node", rowOf(index), groupBy),
            rows?.length ?? snapshot.nodeCount,
            paths.map((path) => ({
                path,
                valueAt: (index: number) => this.pages.valueAt("node", rowOf(index), path),
            })),
            options.correction,
        );
    }

    /**
     * One row per group of the nodes, with its size and the summaries asked for.
     * @param groupBy - the path holding each node's group
     * @param options - the summaries, by the node path they read
     * @returns the table, largest group first
     * @throws A `GraphtyError` with `E_OPTION_RANGE` for an unknown summary.
     */
    groupTable(groupBy: Path, options: GroupTableOptions = {}): GroupTable {
        const summaries = Object.entries(options.summaries ?? {});
        for (const [path, asked] of summaries) {
            const given: unknown = asked;
            const list: readonly unknown[] = Array.isArray(given) ? given : [given];
            const unknown = list.find((each) => !GROUP_SUMMARIES.includes(each as GroupSummary));
            if (!Array.isArray(given) || unknown !== undefined) {
                throw new GraphtyError({
                    code: "E_OPTION_RANGE",
                    message: `summaries of ${path} must be a list of ${GROUP_SUMMARIES.join(", ")}`,
                    source: "data",
                    details: { option: "summaries", path, value: unknown, available: GROUP_SUMMARIES },
                });
            }
        }

        // The groups and their sizes are the value counts of the path, largest first.
        const groups = this.valueCounts(groupBy, { kind: "node" }).values;
        const labels = this.valueLabels(groupBy);
        const members = new Map<ColumnScalar, number[]>(groups.map((each) => [each.value, []]));
        const groupAt = this.valueReader("node", groupBy);
        // Over what is shown while the working graph is on, as the group sizes are.
        const shown = this.shownOf("node", undefined);
        const count = this.current().nodeCount;
        for (let index = 0; summaries.length > 0 && index < count; index++) {
            if (shown === null || maskTest(shown, index)) {
                members.get(groupAt(index) as ColumnScalar)?.push(index);
            }
        }

        const columns = ["group", ...(labels.size > 0 ? ["label"] : []), "size"];
        for (const [path, asked] of summaries) {
            columns.push(...asked.map((summary) => `${path}.${summary}`));
        }

        const rows = groups.map(({ value, count: size }) => {
            const row: Record<string, string | number | boolean | null> = { group: value };
            if (labels.size > 0) {
                row.label = labels.get(String(value)) ?? null;
            }
            row.size = size;
            const indices = members.get(value) ?? [];
            for (const [path, asked] of summaries) {
                const read = this.valueReader("node", path);
                const numbers = indices.map((index) => {
                    const cell = read(index);
                    return typeof cell === "number" ? cell : Number.NaN;
                });
                const statistics = computeColumnStatistics(arrayColumn(numbers));
                for (const summary of asked) {
                    const figure = summary === "count" ? statistics.measured : statistics[summary];
                    row[`${path}.${summary}`] = summary === "count" || statistics.measured > 0 ? figure : null;
                }
            }
            return Object.freeze<GroupTableRow>(row);
        });

        return Object.freeze({ groupBy, columns: Object.freeze(columns), rows: Object.freeze(rows) });
    }

    /**
     * The graph's shape.
     * @param options - What to measure.
     * @param options.scope - `"visible"` for only what is showing; default the whole graph.
     * @returns the statistics
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    statistics(options: { readonly scope?: "all" | "visible" } & SourceElementsFilter = {}): GraphStatistics {
        if (narrows(options)) {
            return this.narrowedStatistics(options);
        }
        const derived = this.derivedFor(this.current());
        derived.statistics ??= computeStatistics(
            derived.snapshot,
            this.readConfig().directed,
            this.graphStore.directionSettledBy,
        );
        const working = this.pages.working?.();
        // Naming no scope reads the working graph (the filters, the window aside); "visible" names
        // what is visible now, the window included.
        const read = options.scope === undefined ? working?.enabled === true : options.scope === "visible";
        if (working !== undefined && read) {
            // Read over the view, built once per filter state and shared.
            const view = working.view(options.scope === "visible" ? "visible" : undefined);
            if (view.whole) {
                return derived.statistics;
            }

            let held = this.viewStatistics.get(view);
            if (held === undefined) {
                held = computeStatistics(view.snapshot, this.readConfig().directed, this.graphStore.directionSettledBy);
                this.viewStatistics.set(view, held);
            }

            return held;
        }

        const masks = options.scope === "visible" ? this.pages.visibleMasks?.() : undefined;
        const graph = derived.snapshot;
        if (masks === undefined || (masks.nodes.count >= graph.nodeCount && masks.edges.count >= graph.edgeCount)) {
            return derived.statistics;
        }

        // Kept until what is visible changes: a panel reads it many times per change (#7966).
        if (derived.visible?.masks.nodes !== masks.nodes || derived.visible.masks.edges !== masks.edges) {
            const visible = graph
                .filterEdges(masks.edges.pack(graph.edgeCount))
                .snapshot.inducedSubgraph({ mask: masks.nodes.pack(graph.nodeCount) }).snapshot;
            derived.visible = {
                masks,
                statistics: computeStatistics(visible, this.readConfig().directed, this.graphStore.directionSettledBy),
            };
        }

        return derived.visible.statistics;
    }

    /**
     * Under source-steps, the shape of one source's or one type's elements, with the ends of their
     * edges, as a Source scope on edges holds them (design 8.6).
     * @param options - The scope, the source and the type.
     * @returns The statistics.
     */
    private narrowedStatistics(
        options: { readonly scope?: "all" | "visible" } & SourceElementsFilter,
    ): GraphStatistics {
        const scope = options.scope === undefined ? undefined : SCOPE_OF_STATISTICS[options.scope];
        const graph = this.current();
        const nodes = this.narrowedTo("node", this.shownOf("node", scope), options, "statistics").shown;
        const edges = this.narrowedTo("edge", this.shownOf("edge", scope), options, "statistics").shown;
        const { src, dst } = graph.edgeList();
        for (let edge = 0; edge < graph.edgeCount; edge++) {
            if (maskTest(edges, edge)) {
                maskSet(nodes, src[edge], true);
                maskSet(nodes, dst[edge], true);
            }
        }
        // ponytail: computed on every call; cache by the masks if a panel reads it per frame.
        const sub = graph.filterEdges(edges).snapshot.inducedSubgraph({ mask: nodes }).snapshot;
        return computeStatistics(sub, this.readConfig().directed, this.graphStore.directionSettledBy);
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
        this.discardDraft();
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

/** What the steps of a join are built from. */
interface JoinSteps {
    readonly table: JoinedTable;
    readonly record: JoinRecord;
    readonly key: SourceKey;
    readonly onto: SourceKey | null;
    readonly left: readonly LoadedSource[];
    readonly leftProvenance: Provenance;
    readonly described: ImportSource;
    readonly previous: LoadedSource | undefined;
}

/** A planned join that writes onto the graph: not rows read as a load. */
interface TableJoin {
    readonly shape: JoinShape;
    readonly plan: Exclude<JoinPlan, { kind: "rows" }>;
    readonly matched: number;
}

/**
 * Plan a join, refusing rows that read as a load rather than a join.
 * @param table - The table.
 * @param graph - The graph the join reads.
 * @param choices - The join.
 * @param shape - The shape when the choices give none.
 * @returns The plan, its shape and how many rows matched.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when the rows read as a load.
 */
function planTableJoin(table: JoinedTable, graph: JoinGraph, choices: JoinChoices, shape: JoinShape): TableJoin {
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
    return { ...planned, plan };
}

/**
 * The fields of a join's record that its plan and table give.
 * @param planned - The planned join.
 * @param choices - The join.
 * @param table - The table.
 * @returns The record's shape, choices, counts, columns and table copy.
 */
function joinRecordFields(
    planned: TableJoin,
    choices: JoinChoices,
    table: JoinedTable,
): Omit<JoinRecord, "source" | "onto" | "before" | "made"> {
    const { plan } = planned;
    return {
        shape: planned.shape,
        choices: { ...choices, shape: planned.shape },
        rows: table.rows.length,
        matched: planned.matched,
        columns: plan.columns,
        table: {
            name: table.name,
            columns: [...table.columns],
            rows: [...table.rows],
            ...(table.unreadRows ? { unreadRows: table.unreadRows } : {}),
        },
    };
}

/**
 * Refuse a table already joined: one whose columns and rows a stored join holds.
 * @param stored - The stored loads.
 * @param table - The table.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` when a join holds the same table.
 */
function refuseJoinedAlready(stored: readonly LoadedSource[], table: JoinedTable): void {
    const same = (join: JoinRecord): boolean =>
        JSON.stringify([join.table.columns, join.table.rows]) === JSON.stringify([table.columns, table.rows]);
    const twin = stored.find((each) => each.join !== undefined && same(each.join));
    if (twin !== undefined) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message: `The table ${table.name} is joined already, as ${twin.key}: replace or edit that join instead.`,
            source: "data",
            details: { reason: "joined-already", key: twin.key },
        });
    }
}

/**
 * Count each end of a joined edge the graph holds as a node.
 * @param plan - The join's plan.
 * @param graph - The graph it was planned against.
 * @param count - Called with each such end.
 */
function countHeldEnds(
    plan: Extract<JoinPlan, { kind: "edges" }>,
    graph: JoinGraph,
    count: (end: NodeId) => void,
): void {
    const nodes = new Set(graph.nodes.map((node) => String(node.id)));
    for (const edge of plan.edges) {
        for (const end of [edge[plan.source], edge[plan.target]]) {
            if (nodes.has(String(end))) {
                count(end as NodeId);
            }
        }
    }
}

/**
 * Whether a table's columns are exactly a header's.
 * @param columns - The table's columns.
 * @param header - The header.
 * @returns True when they are the same names.
 */
function sameColumns(columns: readonly string[], header: ReadonlySet<string>): boolean {
    return columns.length === header.size && columns.every((name) => header.has(name));
}

/**
 * The columns a load read as node ids or edge ends.
 * @param entry - The load.
 * @returns The column names; none when the load kept no mapping (a graph file, a plain `import`).
 */
function roleColumns(entry: LoadedSource): string[] {
    return Object.values(entry.mapping?.tables ?? {}).flatMap((table) =>
        [table.key, table.source, table.target].flatMap((role) =>
            role === undefined || role === null ? [] : [typeof role === "string" ? role : role.column],
        ),
    );
}

/**
 * Whether a header covers a load's columns.
 * ponytail: the graph keeps the last load's edge ends apart from the records, so the header may
 * name up to two columns more; read the draft's ends if that misleads.
 * @param columns - The columns the load's rows carry.
 * @param header - The header.
 * @returns True when the header names every column and at most two more.
 */
function coversHeader(columns: ReadonlySet<string>, header: ReadonlySet<string>): boolean {
    return columns.size > 0 && header.size - columns.size <= 2 && [...columns].every((name) => header.has(name));
}

/**
 * Whether a value reads a column's path.
 * ponytail: a text search for the column's path; it can name a column of the other kind too.
 * @param value - The value: a selector, bindings, a filter.
 * @param name - The column.
 * @returns True when the value names `data.<name>`.
 */
function columnRead(value: unknown, name: string): boolean {
    return value !== undefined && value !== null && JSON.stringify(value).includes(`data.${name}`);
}

/**
 * Add what a replacement leaves matching nothing because it takes a column away.
 * @param kind - The column's kind.
 * @param name - The column.
 * @param readers - What reads columns.
 * @param readers.styles - The style stack.
 * @param readers.visibility - The filter, its conditions and the time window.
 * @param readers.joins - The joins.
 * @param facts - The facts, added to.
 */
function unboundFactsOf(
    kind: "node" | "edge",
    name: string,
    readers: {
        readonly styles: readonly CompiledLayer[];
        readonly visibility: VisibilityState;
        readonly joins: readonly JoinRecord[];
    },
    facts: CodedFact<ReplaceUnboundCode>[],
): void {
    for (const { layer } of readers.styles) {
        if (layer.target === kind && [layer.selector, layer.set, layer.encode].some((part) => columnRead(part, name))) {
            facts.push({ code: "style-layer", params: { layer: layer.id, kind, column: name } });
        }
    }

    const { visibility } = readers;
    if (
        columnRead(visibility.filter, name) ||
        columnRead(visibility.conditions, name) ||
        columnRead(visibility.window, name)
    ) {
        facts.push({ code: "filter", params: { kind, column: name } });
    }

    for (const join of readers.joins) {
        if (join.choices.keys.some((each) => each.graph === `data.${name}`)) {
            facts.push({ code: "join", params: { join: join.source, kind, column: name } });
        }
    }
}

/** What `attributes()` lays over the described columns. */
interface AttributeOverlay {
    readonly declarations: ReadonlyMap<string, MeasurementDeclaration>;
    readonly roles: ReadonlyMap<string, AttributeRole[]>;
    readonly uses: ReadonlyMap<string, AttributeUse[]>;
    readonly fed: ReadonlyMap<string, readonly SourceKey[]>;
    readonly settings: ColumnSettings;
    readonly hidden: ReadonlySet<string>;
    readonly joined: ReadonlySet<string>;
    readonly parsed: ReadonlyMap<AttributeDescriptor, number>;
    readonly snapshot: GraphSnapshot;
}

/** One column's overlay facts. */
interface ColumnOverlay {
    readonly declared: MeasurementDeclaration | undefined;
    readonly played: AttributeRole[] | undefined;
    readonly used: AttributeUse[] | undefined;
    readonly from: readonly SourceKey[] | undefined;
    readonly typed: ValueType | undefined;
    readonly isHidden: boolean;
    readonly isJoined: boolean;
    readonly times: number | undefined;
    readonly rows: number;
}

/**
 * A described column with what the session knows of it laid over it.
 * @param each - The column as described.
 * @param overlay - What is laid over the columns.
 * @returns The column, the same object when nothing is laid over it.
 */
function overlaidAttribute(each: AttributeDescriptor, overlay: AttributeOverlay): AttributeDescriptor {
    const key = declarationKey(each);
    const facts: ColumnOverlay = {
        declared: overlay.declarations.get(key),
        played: overlay.roles.get(key),
        used: overlay.uses.get(key),
        from: overlay.fed.get(key),
        typed: overlay.settings.types[key],
        isHidden: overlay.hidden.has(key),
        isJoined: overlay.joined.has(key),
        times: overlay.parsed.get(each),
        rows: each.kind === "node" ? overlay.snapshot.nodeCount : overlay.snapshot.edgeCount,
    };
    return facts.declared === undefined &&
        facts.played === undefined &&
        facts.used === undefined &&
        facts.from === undefined &&
        facts.typed === undefined &&
        facts.times === undefined &&
        !facts.isHidden &&
        !facts.isJoined
        ? each
        : Object.freeze({ ...each, ...overlayFields(each, facts) });
}

/**
 * The fields one column's overlay sets.
 * @param each - The column as described.
 * @param facts - The column's overlay facts.
 * @returns The fields.
 */
function overlayFields(each: AttributeDescriptor, facts: ColumnOverlay): Partial<AttributeDescriptor> {
    const { declared, played, used, from, typed, isHidden, isJoined, times, rows } = facts;
    return {
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
            ? { measurement: "time" as const, measurementSource: "declared" as const }
            : {}),
        ...(played === undefined ? {} : { roles: Object.freeze(played) }),
        ...(used === undefined ? {} : { usedBy: Object.freeze(used) }),
        ...(from === undefined ? {} : { sources: Object.freeze([...from]) }),
        ...(isHidden ? { hidden: true } : {}),
    };
}

/**
 * Add a reader of a column, once.
 * @param out - The readers by column, added to.
 * @param at - The column, as `<kind>:<name>`.
 * @param use - The reader.
 */
function addUse(out: Map<string, AttributeUse[]>, at: string, use: AttributeUse): void {
    const list = out.get(at) ?? [];
    if (!list.some((each) => each.kind === use.kind && each.id === use.id)) {
        list.push(use);
        out.set(at, list);
    }
}

/**
 * Whether a path reads a column: a column `address` is read by `data.address` and by
 * `data.address.city`; matched against the column itself, because a column's own name may hold a dot.
 * @param path - The path a layer reads.
 * @param column - The column's path.
 * @returns True when the path is the column or under it.
 */
function pathReadsColumn(path: string, column: string): boolean {
    return path === column || path.startsWith(`${column}.`);
}

/**
 * Add the layers whose selector or bindings read each column, in stack order.
 * ponytail: columns x paths per call; index the paths by first segment if a file has thousands of
 * columns and dozens of layers.
 * @param out - The readers by column, added to.
 * @param styles - The style stack.
 * @param described - The columns.
 */
function addLayerUses(
    out: Map<string, AttributeUse[]>,
    styles: readonly CompiledLayer[],
    described: readonly AttributeDescriptor[],
): void {
    for (const { layer, reads } of styles) {
        for (const path of reads) {
            for (const column of described) {
                if (column.kind === layer.target && pathReadsColumn(path, column.path)) {
                    addUse(out, declarationKey(column), { kind: "layer", id: layer.id });
                }
            }
        }
    }
}

/**
 * The name an edge column has now: a run weighed by a column renamed since is listed under the name
 * the column has now.
 * @param attribute - The name the run read.
 * @param renamed - Each renamed column's new name, by its old key.
 * @returns The name now, or undefined when the run read none.
 */
function renamedNow(attribute: string | undefined, renamed: Readonly<Record<string, string>>): string | undefined {
    let now = attribute;
    const seen = new Set<string>();
    while (now !== undefined && renamed[`edge:${now}`] !== undefined && !seen.has(now)) {
        seen.add(now);
        now = renamed[`edge:${now}`];
    }

    return now;
}

/**
 * The configuration field a role writes, refusing a role the column's kind has not, or one read
 * when rows load that would move on loaded rows.
 * @param input - The column, the role and what it is checked against.
 * @param input.kind - The column's kind.
 * @param input.name - The column.
 * @param input.role - The role.
 * @param input.fields - The field each role of the kind writes.
 * @param input.snapshot - The current snapshot.
 * @param input.knownFields - The data configuration's known fields.
 * @returns The field.
 * @throws A `GraphtyError` with `E_BAD_COMMAND` or `E_UNSUPPORTED`.
 */
function roleField(input: {
    readonly kind: "node" | "edge";
    readonly name: string;
    readonly role: ColumnRole;
    readonly fields: Partial<Readonly<Record<ColumnRole, string>>>;
    readonly snapshot: GraphSnapshot;
    readonly knownFields: unknown;
}): string {
    const { kind, name, role, fields, snapshot, knownFields } = input;
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

    if (loaded > 0 && (knownFields as Record<string, unknown>)[field] !== name) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message: `The ${role} column is read when rows load: load the data again with ${JSON.stringify(name)} as the ${role}.`,
            source: "data",
            details: { reason: "reload", kind, role, column: name },
        });
    }

    return field;
}

/** A column rename. */
interface ColumnRename {
    readonly kind: "node" | "edge";
    readonly from: string;
    readonly name: string;
}

/**
 * Each record that carries a column, whole, with the key renamed in place.
 * @param rows - The records.
 * @param from - The column's name.
 * @param name - Its new name.
 * @returns The updates.
 */
function renamedRows(
    rows: readonly { readonly id: NodeId | EdgeId; readonly data: Readonly<Record<string, unknown>> | undefined }[],
    from: string,
    name: string,
): RowUpdate<NodeId | EdgeId>[] {
    const out: RowUpdate<NodeId | EdgeId>[] = [];
    for (const row of rows) {
        if (row.data !== undefined && Object.hasOwn(row.data, from)) {
            out.push({
                id: row.id,
                values: Object.fromEntries(
                    Object.entries(row.data).map(([key, value]) => [key === from ? name : key, value]),
                ),
            });
        }
    }

    return out;
}

/**
 * Add the steps that rename a column in the style layers that select or paint by it.
 * @param steps - The steps, added to.
 * @param styles - The style stack.
 * @param rename - The rename.
 */
function pushLayerRenames(steps: SessionCommand[], styles: readonly CompiledLayer[], rename: ColumnRename): void {
    const { kind, from, name } = rename;
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
}

/**
 * Add the steps that rename a column in the filter, the filter steps and the time window.
 * @param steps - The steps, added to.
 * @param visibility - The visibility state.
 * @param rename - The rename.
 */
function pushVisibilityRenames(steps: SessionCommand[], visibility: VisibilityState, rename: ColumnRename): void {
    const { kind, from, name } = rename;
    const filter = renameColumnIn(visibility.filter, from, name, ruleScope(kind), kind === "node");
    if (filter !== visibility.filter) {
        steps.push({ op: "visibility.set", filter });
    }

    // Every condition, whatever its effect, keeps its effect through the rename.
    const conditions = renameColumnIn(visibility.conditions, from, name, ruleScope(kind), kind === "node");
    if (conditions !== visibility.conditions) {
        steps.push({ op: "visibility.conditions", conditions });
    }

    const window = renameColumnIn(visibility.window, from, name);
    if (window !== visibility.window) {
        steps.push({ op: "visibility.window", window });
    }
}

/**
 * The column settings with a column renamed: its hidden flag, type and declaration follow it.
 * @param settings - The settings now.
 * @param rename - The rename.
 * @returns The settings.
 */
function renamedSettings(settings: ColumnSettings, rename: ColumnRename): ColumnSettings {
    const { kind, from, name } = rename;
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
    return {
        hidden: settings.hidden.map((key) => (key === oldKey ? newKey : key)),
        types,
        renamed,
    };
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
 * The choices a load is read again with: its own, or, for a load given no mapping (a file added as
 * rows), what its one table's rows were read as, so a role laid over them does not read them anew.
 * @param entry - The load.
 * @returns The choices.
 */
function withReadRoles(entry: LoadedSource): LoadChoices {
    const choices = entry.choices ?? {};
    const tables = Object.values(entry.mapping?.tables ?? {});
    const [read] = tables;
    if (choices.mapping !== undefined || read === undefined || tables.length !== 1) {
        return choices;
    }

    const { rowsAre, key, source, target } = read;
    return {
        ...choices,
        mapping: {
            rowsAre,
            ...(key === undefined || key === null ? {} : { key }),
            ...(source === undefined ? {} : { source }),
            ...(target === undefined ? {} : { target }),
        },
    };
}

/**
 * Choices laid over the ones a load was read with: each choice given wins, and a mapping's roles
 * are laid over the earlier mapping's role by role (per table when either names tables).
 * @param earlier - What the load was read with.
 * @param later - What changes.
 * @param reading - What each table's rows were read as, so a mapping named by side finds its table.
 * @returns The choices to read it with now.
 */
function overChoices(earlier: LoadChoices, later: LoadChoices, reading: LoadMappingRead | undefined): LoadChoices {
    const { mode: _mode, join: _join, ...rest } = later;
    const a = earlier.mapping;
    const b = rest.mapping;
    if (a === undefined || b === undefined) {
        return { ...earlier, ...rest, ...(a === undefined && b === undefined ? {} : { mapping: b ?? a }) };
    }

    return { ...earlier, ...rest, mapping: overMapping(byTableId(a, reading), byTableId(b, reading)) };
}

/**
 * A mapping laid over an earlier one, role by role (per table when either names tables).
 * @param a - The earlier mapping.
 * @param b - The later mapping.
 * @returns The mapping to read with now.
 */
function overMapping(a: ByTableMapping, b: ByTableMapping): ByTableMapping {
    const lone = "tables" in a && !("tables" in b) ? Object.keys(a.tables) : [];
    if (lone.length === 1) {
        // A bare mapping names a load of one table, so it is laid over that table's roles.
        const [id] = lone;
        const roles = (a as { tables: Record<string, TableMapping> }).tables[id];
        const bare = b as TableMapping;
        return { tables: { [id]: movesRows(roles, bare) ? bare : { ...roles, ...bare } } };
    }

    const named = "tables" in b && !("tables" in a) ? Object.entries(b.tables) : [];
    if (named.length === 1) {
        // A bare earlier mapping read the load's one table, so the table named now is that one.
        const [[id, roles]] = named;
        const earlier = a as TableMapping;
        return { tables: { [id]: movesRows(earlier, roles) ? roles : { ...earlier, ...roles } } };
    }

    if ("tables" in a || "tables" in b) {
        return overTables(a, b);
    }

    // Rows read as the other kind take none of the roles the earlier kind had.
    return movesRows(a, b) ? b : { ...a, ...b };
}

/**
 * A mapping laid over an earlier one when either names tables: a bare mapping cannot be placed
 * among named tables, so the later one wins whole.
 * @param a - The earlier mapping.
 * @param b - The later mapping.
 * @returns The mapping to read with now.
 */
function overTables(a: ByTableMapping, b: ByTableMapping): ByTableMapping {
    const tables: Record<string, TableMapping> = "tables" in a && "tables" in b ? { ...a.tables } : {};
    for (const [id, roles] of Object.entries("tables" in b ? b.tables : {})) {
        tables[id] = { ...(movesRows(tables[id], roles) ? {} : tables[id]), ...roles };
    }

    return "tables" in b ? { tables } : b;
}

/** The error limit the JSON source reads a sample's records with, by default. */
const SAMPLE_ERROR_LIMIT = 100;

/** What a load door knows of its load beside what `sources()` records: for `source:loaded`. */
type DoorFacts = Pick<SourceLoaded, "sourceId" | "sample" | "callerKey" | "replaced">;

/** What a generated graph or a dataset loads as; see `SessionData.sampleLoad`. */
interface SampleLoad {
    readonly source: DataSourceInput;
    /** The first of {@link LABEL_COLUMNS} some node holds text in. */
    readonly label: string | undefined;
    /** The records, handed to the import instead of a JSON text of them. */
    readonly held?: HeldRows;
    /** The nodes a dataset's `fixed` column marks, which a `pins: "data"` load pins. */
    readonly fixed?: readonly NodeId[];
}

/**
 * A load's source-steps key or edge ends as the draft's roles for its one table, so the draft reads
 * the rows the way the source maps them; a load naming its own mapping keeps it.
 * @param options - The load's choices.
 * @returns The choices, with a mapping when the source-steps options name one.
 */
function withStepsMapping<O extends LoadChoices>(options: O): O {
    if (options.mapping !== undefined || (options.key === undefined && options.edges === undefined)) {
        return options;
    }
    const mapping: TableMapping =
        options.edges === undefined
            ? { rowsAre: "nodes", key: options.key ?? null }
            : { rowsAre: "edges", source: options.edges.from.column, target: options.edges.to.column };
    return { ...options, mapping };
}

/**
 * The load choices that read a newer copy of a source the way its mapping reads it: its key, or
 * its edge ends, under the names the rows spell them (before a rename).
 * @param src - The source.
 * @returns The choices; none for a source holding both nodes and edges, which the file says.
 */
function readChoicesOf(src: StepsSource): ImportOptions {
    const { nodes, edges } = src.mapping;
    const asRead = (column: string, renamed: Readonly<Record<string, string>> | undefined): string =>
        Object.entries(renamed ?? {}).find(([, working]) => working === column)?.[0] ?? column;
    if (edges !== undefined && nodes === undefined) {
        return {
            edges: {
                from: { column: asRead(edges.source, edges.renamed) },
                to: { column: asRead(edges.target, edges.renamed) },
            },
        };
    }
    if (nodes?.key !== undefined && edges === undefined) {
        return { key: asRead(nodes.key, nodes.renamed) };
    }
    return {};
}

/** No copies: before the first load under the source-steps experiment. */
const EMPTY_COPIES: Copies = Object.freeze({});

/**
 * Whether a copy holds any rows.
 * @param tables - The copy's rows.
 * @returns True when it holds a node row or an edge row.
 */
function hasRows(tables: CopyTables | undefined): tables is CopyTables {
    return (tables?.nodes?.length ?? 0) + (tables?.edges?.length ?? 0) > 0;
}

/**
 * The refusal of a source that holds no rows, as a load with the source-steps experiment off
 * refuses it.
 * @param format - The format the source was read as.
 * @returns A `GraphtyError` with `E_EMPTY_LOAD`.
 */
function emptyCopy(format: string | undefined): GraphtyError {
    return new GraphtyError({
        code: "E_EMPTY_LOAD",
        message: `The ${String(format)} source held no nodes and no edges, so there was nothing to load.`,
        source: "data",
        details: { format, rowErrors: 0 },
    });
}

/**
 * The source-steps choices of a load, for the command that carries them to the compile.
 * @param options - The load's choices.
 * @returns The ones the compile reads.
 */
function stepsChoices(options: ImportOptions): LoadedChoices {
    return Object.freeze(
        Object.fromEntries(
            (["key", "type", "space", "edges", "overlap"] as const)
                .filter((name) => options[name] !== undefined)
                .map((name) => [name, options[name]]),
        ),
    );
}

/**
 * Whether a load's choices read its source through a draft.
 * @param options - The choices.
 * @returns True when one of them does.
 */
function readsThroughDraft(options: LoadChoices): boolean {
    return (
        options.mapping !== undefined ||
        options.unmatched !== undefined ||
        options.directed !== undefined ||
        options.duplicateIds !== undefined
    );
}

/**
 * A load and every join resting on it (joined onto it, through it as a mapping table, or keyed on
 * a column it wrote), newest first. A join has nothing to stand on without them, so it goes with them.
 * @param sources - the loads, oldest first
 * @param key - the load being removed
 * @returns the loads that go
 */
function withJoinsResting(sources: readonly LoadedSource[], key: SourceKey): LoadedSource[] {
    const going = new Set([key]);
    const columns = new Set<string>();
    for (const { join, key: each } of sources) {
        const keyed = join?.choices.keys.some(({ graph }) => columns.has(graph.replace(/^data\./, ""))) === true;
        if (each === key || going.has(join?.onto ?? "") || going.has(join?.choices.via ?? "") || keyed) {
            going.add(each);
            join?.columns.forEach((column) => columns.add(column));
        }
    }

    return sources.filter((each) => going.has(each.key)).reverse();
}

/**
 * Whether a join adds nodes and edges of its own (edges, a merge's new nodes, a link's edges and
 * value nodes), rather than only writing values onto what the graph holds.
 * @param join - the join's record
 * @returns true when it does
 */
function addsElements(join: JoinRecord | undefined): boolean {
    return join?.shape === "edges" || join?.shape === "merge" || join?.shape === "link";
}

/**
 * The nodes a values join made with `unmatchedRows: "add"`: what it supplied that it wrote no
 * value over.
 * @param load - the joined table's load
 * @param provenance - what each load supplied
 * @returns the node ids
 */
function nodesJoinMade(load: LoadedSource, provenance: Provenance | undefined): NodeId[] {
    const { join } = load;
    return join?.choices.unmatchedRows === "add"
        ? (provenance?.[load.key]?.nodes ?? []).filter((id) => join.before?.[String(id)] === undefined)
        : [];
}

/**
 * The nodes a load added: for a join that adds elements, the nodes it made (its record's
 * `made`); for any other load, every node it supplied but those the graph held before it that
 * no load supplied (its provenance's `held`, issue #7708).
 * @param load - the load
 * @param provenance - what each load supplied
 * @returns the node ids, as provenance holds them
 */
function nodesJoinAdded(load: LoadedSource, provenance: Provenance | undefined): readonly NodeId[] {
    const entry = provenance?.[load.key];
    const supplied = entry?.nodes ?? [];
    const made = load.join?.made;
    if (made !== undefined) {
        const ids = new Set(made.map(String));
        return supplied.filter((id) => ids.has(String(id)));
    }

    const held = new Set((entry?.held ?? []).map(String));
    return held.size === 0 ? supplied : supplied.filter((id) => !held.has(String(id)));
}

/**
 * The nodes a join of edges makes: the ends and node records it names that the graph does not hold.
 * @param plan - the join's plan
 * @param graph - the graph it was planned against
 * @returns the node ids
 */
function nodesEdgesMake(plan: Extract<JoinPlan, { kind: "edges" }>, graph: JoinGraph): NodeId[] {
    const held = new Set(graph.nodes.map((node) => String(node.id)));
    const named = [
        ...plan.nodes.map((node) => node.id),
        ...plan.edges.flatMap((edge) => [edge[plan.source], edge[plan.target]]),
    ];
    return [...new Set(named.map(String))].filter((id) => !held.has(id));
}

/**
 * What some loads brought into the graph. A values join only wrote onto what it matched, so of
 * that it brought just the nodes it made.
 * @param loads - the loads
 * @param provenance - what each load supplied
 * @param leaving - true for loads being taken out, which take of a join's ends only the ones it
 *     made; false for loads that stay, which hold every end they name
 * @returns the node ids and the edge ids
 */
function broughtBy(
    loads: readonly LoadedSource[],
    provenance: Provenance | undefined,
    leaving: boolean,
): { readonly nodes: Set<NodeId>; readonly edges: Set<EdgeId> } {
    const nodes = new Set<NodeId>();
    const edges = new Set<EdgeId>();
    for (const load of loads) {
        const supplied = provenance?.[load.key];
        const values = load.join !== undefined && !addsElements(load.join);
        const named = leaving ? nodesJoinAdded(load, provenance) : (supplied?.nodes ?? []);
        (values ? nodesJoinMade(load, provenance) : named).forEach((id) => nodes.add(id));
        if (!values) {
            supplied?.edges.forEach((id) => edges.add(id));
        }
    }

    return { nodes, edges };
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
): ColumnRecords {
    return {
        nodeAttributes: (index, id) => slice().nodes.get(id) ?? fallback?.nodeAttributes(index, id),
        edgeAttributes: (index) => {
            const column = snapshot().edges.value(EDGE_ID_COLUMN, index);
            const record = typeof column === "number" ? slice().edges.get(edgeIdOf(column)) : undefined;
            return record === undefined ? fallback?.edgeAttributes(index) : withoutEndpointKeys(record, lastImport());
        },
        column: (kind, key) => {
            const graph = snapshot();
            const { nodes, edges } = slice();
            if (kind === "node") {
                const { ids } = graph;
                return (row) => {
                    const id = ids.idOf(row);
                    return (nodes.get(id) ?? fallback?.nodeAttributes(row, id))?.[key];
                };
            }

            const endpoints = lastImport()?.endpoints;
            const counters = graph.edges.typed(EDGE_ID_COLUMN, "u32")?.data;
            const endpoint =
                key === "source" || key === "target" || key === endpoints?.source || key === endpoints?.target;
            if (counters === undefined || endpoint) {
                return null;
            }

            if (edges.size === 0) {
                return (row) => fallback?.edgeAttributes(row)?.[key];
            }

            // A walk of the map as the rows ask: rows and records run in the same order almost
            // always, and printing a counter and hashing it for each row costs more than the sort.
            // Only a pass from the first row walks: reaching an appended row's record that way
            // would step over every record before it, so a read starting later looks each one up.
            let walk: MapIterator<[EdgeId, GraphRecord]> | undefined;
            let walkRow = 0;
            const byCounter: (GraphRecord | undefined)[] = [];
            const recordOf = (row: number): GraphRecord | undefined => {
                const counter = counters[row];
                if (row !== walkRow) {
                    return edges.get(edgeIdOf(counter));
                }

                walkRow++;
                walk ??= edges.entries();
                while (byCounter[counter] === undefined) {
                    const next = walk.next();
                    if (next.done === true) {
                        return undefined;
                    }

                    byCounter[Number(next.value[0])] = next.value[1];
                }

                return byCounter[counter];
            };

            return (row) => (recordOf(row) ?? fallback?.edgeAttributes(row))?.[key];
        },
    };
}

/** The records, and a way to read one column of them row after row. */
export interface ColumnRecords extends SessionRecordSource {
    /**
     * A reader of one column over the graph as it stands, for a pass over every row: what each
     * read would look up again is looked up once.
     * @param kind - Nodes or edges.
     * @param key - The record's key.
     * @returns The reader, or null for a column only the per-row reads answer: an edge's ends.
     */
    column(kind: "node" | "edge", key: string): ((row: number) => unknown) | null;
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
    const out = target === "node" ? nodeRecordsInRowOrder(slice, snapshot) : edgeRecordsInRowOrder(slice, snapshot);
    return Object.freeze(out);
}

/**
 * The node records in row order, then those with no row.
 * @param slice - The `graph` slice.
 * @param snapshot - The snapshot of the same graph.
 * @returns The records.
 */
function nodeRecordsInRowOrder(slice: GraphSlice, snapshot: GraphSnapshot): SessionAttributes[] {
    const out: SessionAttributes[] = [];
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

    return out;
}

/**
 * The edge records in row order.
 * @param slice - The `graph` slice.
 * @param snapshot - The snapshot of the same graph.
 * @returns The records.
 */
function edgeRecordsInRowOrder(slice: GraphSlice, snapshot: GraphSnapshot): SessionAttributes[] {
    const out: SessionAttributes[] = [];
    for (let row = 0; row < snapshot.edgeCount; row++) {
        const counter = snapshot.edges.value(EDGE_ID_COLUMN, row);
        const record = typeof counter === "number" ? slice.edges.get(edgeIdOf(counter)) : undefined;
        if (record !== undefined) {
            out.push(record);
        }
    }

    return out;
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
 * @param ceilings - The ceilings a load is refused above.
 * @returns The service.
 */
export function headlessDataService(
    store: GraphStore,
    dispatcher: Dispatcher,
    readConfig: () => SessionDataConfig,
    ceilings?: RenderLimits,
): DataService {
    const ingest = new Ingest<{ readonly edgeIndex: number }>({
        store: () => store,
        ceilings: () => ceilings?.overrides,
        dataConfig: readConfig,
        hasNode: (id) => dispatcher.graph.slice.nodes.has(id),
        nodeCount: () => store.reads.nodeCount,
        edgesBetween: (source, target) => {
            const { builder } = store;
            if (!builder.hasNode(source) || !builder.hasNode(target)) {
                return [];
            }

            return [...builder.findEdges(builder.indexOf(source), builder.indexOf(target))].map((edgeIndex) => ({
                edgeIndex,
            }));
        },
        edgeAt: (edgeIndex) => (store.reads.hasEdge(edgeIndex) ? { edgeIndex } : null),
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
        batched: () => dispatcher.services.batched?.() === true,
    });

    return {
        loading: () => ingest.settling,
        apply: (mutation, draft) => {
            ingest.apply(mutation, dispatcher.graph.writer(draft, store));
        },
        import: (command, draft, signal) =>
            ingest.oneAtATime(() => ingest.importSource(command, dispatcher.graph.writer(draft, store), signal)),
        edgeMeaning: (counter) => ingest.meaningAt(counter),
        values: (values, draft) => {
            dispatcher.graph.writer(draft, store).setGraphValues(values);
        },
        direct: (directed, statedBy, draft) => {
            dispatcher.graph.writer(draft, store).setDirected(directed, statedBy);
        },
    };
}

/**
 * A store as a consumer reads it: its snapshot is {@link consumerSnapshot}'s, and its coordinates
 * are read-only.
 * @param store - The store.
 * @returns The read-only store.
 */
function readonlyStore(store: LaneStore): SessionGraphStore {
    const positions = readonlyPositions(() => store.positions);
    return {
        getSnapshot: () => consumerSnapshot(store),
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
 *
 * The resident snapshot lends the lane by reference and is handed back cached without touching the
 * lane, so a layout's owed publish (design/rendering/row-renderer.md 4.5) is written first: the copy
 * carries the latest landing, not the coordinates of the last settle.
 * @param store - The store.
 * @returns The consumer's snapshot.
 */
function consumerSnapshot(store: LaneStore): GraphSnapshot {
    store.positions.settle();
    const resident = wholeGraph(store);
    // ponytail: copies the whole snapshot per call (O(nodes + edges)); cache a copy per freeze and
    // lane generation, handed out as read-only views, if a consumer calls this every frame.
    const copy = fromBytes(resident.toBytes(), { validate: "none" });
    copy.seal();
    return copy;
}

/**
 * A load's input as autosave keeps it: the options as JSON, with a file's or inline data's bytes
 * as `text` (valid UTF-8) or `base64`.
 */
export interface SavedInput {
    readonly type?: string;
    readonly name?: string;
    readonly config: Readonly<Record<string, unknown>>;
    /** Inline text, read again as text. */
    readonly text?: string;
    /** Bytes that are valid UTF-8, read again as those bytes. */
    readonly utf8?: string;
    /** Any other bytes. */
    readonly base64?: string;
}

/**
 * Bytes as autosave keeps them.
 * @param bytes - The bytes.
 * @returns Them as UTF-8 text when they are valid UTF-8, else as base64.
 */
function savedBytes(bytes: Uint8Array): { readonly utf8: string } | { readonly base64: string } {
    try {
        return { utf8: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes) };
    } catch {
        let binary = "";
        for (let at = 0; at < bytes.length; at += 0x8000) {
            binary += String.fromCodePoint(...bytes.subarray(at, at + 0x8000));
        }
        return { base64: btoa(binary) };
    }
}

/**
 * An input as autosave keeps it.
 * @param input - What the load was read from.
 * @param bytes - The file's bytes, when it names a file.
 * @returns It, or undefined when it is not kept (a network source, a URL, a file not read yet,
 *     or options that carry a credential).
 */
function savedInput(input: DataSourceInput, bytes: Uint8Array | undefined): SavedInput | undefined {
    const { file, data, ...config } = input.config;
    const blob = fileOf(file);
    let held: string | Uint8Array | undefined = bytes;
    if (blob === null) {
        held = isSourceData(data) ? toSourceInput(data) : undefined;
    }
    // Only bytes the session holds, and never an option that marks a credential (a URL's included):
    // autosave writes no secret, as a save writes none.
    const dropped = new Set<string>();
    const options = paramsOf(config, dropped);
    if (input.source !== undefined || held === undefined || typeof config.url === "string" || dropped.size > 0) {
        return undefined;
    }
    let body = {};
    if (typeof held === "string") {
        body = { text: held };
    } else if (held !== undefined) {
        body = savedBytes(held);
    }
    return { type: input.type, name: input.name ?? blob?.name, config: options, ...body };
}

/**
 * An input autosave kept, as `import` takes it again.
 * @param saved - What {@link savedInput} wrote.
 * @returns The input, its text or bytes inline.
 */
function inputOfSaved(saved: SavedInput): DataSourceInput {
    const { text, utf8, base64, config, ...rest } = saved;
    let data: string | Uint8Array | undefined = text;
    if (utf8 !== undefined) {
        data = new TextEncoder().encode(utf8);
    } else if (base64 !== undefined) {
        data = Uint8Array.from(atob(base64), (char) => char.codePointAt(0) ?? 0);
    }
    return { ...rest, config: data === undefined ? config : { ...config, data } };
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

/** What `statistics` names each scope, in the working graph's words. */
const SCOPE_OF_STATISTICS = { all: "graph", visible: "visible" } as const satisfies Record<string, WorkingScope>;

/**
 * Whether a reading names a source or a type.
 * @param filter - The reading's options.
 * @returns True when it narrows to one source's or one type's elements.
 */
function narrows(filter: SourceElementsFilter): boolean {
    return filter.source !== undefined || filter.type !== undefined;
}

/**
 * Settle what an import will read: the format, detected when it was not named, and the name and
 * size the graph keeps beside it. A URL whose name says nothing is fetched once here and its text
 * handed on, so the data source does not fetch it again.
 * @param source - The source as the caller named it.
 * @param signal - Cancels reading the file's head or fetching the URL.
 * @returns The source the `data.import` command carries.
 * @throws A `GraphtyError` with `E_UNKNOWN_FORMAT` when nothing recognizes the data, and
 *     `E_FETCH_FAILED` when the URL cannot be read.
 */
/**
 * How many rows carry each scalar value, in first-seen order.
 * @param rows - How many rows to read.
 * @param valueAt - A row's value.
 * @param shown - The rows to count, or null for every row.
 * @param items - Whether a list value counts once under each distinct scalar item it holds.
 * @returns The counts (a Map keeps first-seen order, so a stable sort keeps a tie in it), how many
 *     rows carried a scalar, and how many rows were counted.
 */
function tallyScalars(
    rows: number,
    valueAt: (index: number) => unknown,
    shown: U32 | null = null,
    items = false,
): { counts: Map<ColumnScalar, number>; present: number; total: number } {
    const counts = new Map<ColumnScalar, number>();
    let present = 0;
    let total = 0;
    for (let index = 0; index < rows; index++) {
        if (shown !== null && !maskTest(shown, index)) {
            continue;
        }

        total++;
        const value = valueAt(index);
        if (isColumnScalar(value)) {
            present++;
            counts.set(value, (counts.get(value) ?? 0) + 1);
        } else if (items && Array.isArray(value)) {
            const scalars = new Set(value.filter(isColumnScalar));
            present += scalars.size > 0 ? 1 : 0;
            for (const each of scalars) {
                counts.set(each, (counts.get(each) ?? 0) + 1);
            }
        }
    }

    return { counts, present, total };
}

function resolveImportSource(source: DataSourceInput, signal?: AbortSignal): ImportSource | Promise<ImportSource> {
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
            .then((bytes) => {
                signal?.throwIfAborted();
                return detect(sampleOf(new Uint8Array(bytes)));
            });
    }

    if (url !== undefined) {
        // Read once, as bytes, and handed on: the reader does not fetch it again, and the importer
        // decodes it.
        return fetchBytes(url, signal).then((bytes) => detect(sampleOf(bytes), bytes));
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
 * SHA-256, inline data's size and SHA-256, a URL body's SHA-256, size and the validators its
 * response carried. Nothing for anything else (a pair of files).
 * @param config - The source's options as the load read them.
 * @returns The facts.
 */
async function bytesFacts(config: Readonly<Record<string, unknown>>): Promise<Partial<LoadFacts>> {
    const { data, file, url } = config;
    if (typeof url === "string") {
        const fetchedAt = new Date().toISOString();
        if (data instanceof Uint8Array) {
            const sha256 = await sha256Hex(data);
            return { url: { sha256, size: data.byteLength, ...validatorsOf(data), fetchedAt } };
        }

        // A URL whose type was named is fetched by its reader, which kept what it read.
        const read = takeFetched(url);
        return read === undefined ? { url: { fetchedAt } } : { url: { ...read, sha256: await read.sha256, fetchedAt } };
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
 * The SHA-256 of the bytes a source's rows are read from, which names its copy under the
 * source-steps experiment (version 2, 4.1.2 rule 1): inline data, a file, or what a reader fetched
 * for a URL. Nothing for anything else (a pair of files).
 * @param config - The source's options.
 * @returns The lower-case hex digest, or undefined.
 */
async function copyDigest(config: Readonly<Record<string, unknown>> | undefined): Promise<string | undefined> {
    return (await copyFacts(config)).sha256;
}

/**
 * The digest and size of what a source reads, when the session holds its bytes.
 * @param config - The source's options.
 * @returns The hex SHA-256 and the size in bytes, each absent when not known.
 */
async function copyFacts(
    config: Readonly<Record<string, unknown>> | undefined,
): Promise<{ readonly sha256?: string; readonly size?: number }> {
    const { data, file, url } = config ?? {};
    const blob = fileOf(file);
    if (typeof url === "string" && !(data instanceof Uint8Array)) {
        const fetched = peekFetched(url);
        return fetched === undefined ? {} : { sha256: await fetched.sha256, size: fetched.size };
    }
    if (blob !== null) {
        return {
            sha256: await sha256Hex(new Uint8Array(await blob.slice(0, blob.size).arrayBuffer())),
            size: blob.size,
        };
    }
    if (!isSourceData(data)) {
        return {};
    }
    const input = toSourceInput(data);
    const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
    return { sha256: await sha256Hex(bytes), size: bytes.byteLength };
}

/**
 * A caller's `callerKey`, as `{ callerKey }`, or nothing when it gave none.
 * @param options - The load's options.
 * @param options.callerKey - The caller's key.
 * @returns `{ callerKey }` or `{}`.
 */
function callerKeyOf(options: { readonly callerKey?: string }): { callerKey?: string } {
    return options.callerKey === undefined ? {} : { callerKey: options.callerKey };
}

/**
 * A load door's journal stamp, so a consumer can tell the commands a load ran (the configuration
 * it settled as well as the import) from the ones a reader asked for.
 * @param options - The load's options.
 * @param options.callerKey - The caller's key.
 * @returns `{ trigger: "load" }`, with the caller's key when it gave one.
 */
function loadStampOf(options: { readonly callerKey?: string }): LoadStamp {
    return { trigger: "load", ...callerKeyOf(options) };
}

/**
 * Bodies as one run of bytes, in order.
 * @param bodies - The bodies.
 * @returns Their bytes, joined.
 */
function joined(bodies: readonly ArrayBuffer[]): Uint8Array {
    const bytes = new Uint8Array(bodies.reduce((size, body) => size + body.byteLength, 0));
    let at = 0;
    for (const body of bodies) {
        bytes.set(new Uint8Array(body), at);
        at += body.byteLength;
    }

    return bytes;
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
 * Where a load was read from, without credentials.
 * @param kind - the load's kind
 * @param config - its options
 * @param record - its network record, when it has one
 * @returns the address, or nothing for a load read from neither
 */
function addressOf(
    kind: LoadedSource["kind"],
    config: LoadedSource["config"],
    record: SourceLoadRecord | undefined,
): Pick<LoadedSource, "url"> {
    const url = config?.url;
    if (kind === "url" && typeof url === "string") {
        return { url: redactUrl(url).address };
    }

    return record?.endpoint === undefined || record.endpoint === null ? {} : { url: record.endpoint };
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
): Pick<LoadedSource, "features" | "total" | "totalEdges" | "loadedAt"> {
    if (record === undefined) {
        return {};
    }

    const declared = catalog.get(record.source);
    return {
        loadedAt: record.loadedAt,
        features: Object.freeze({
            expand: declared?.expand === true,
            more: declared?.more === true && record.next !== null,
            refresh: declared?.refresh === true,
        }),
        ...(record.total === undefined ? {} : { total: record.total }),
        ...(record.totalEdges === undefined ? {} : { totalEdges: record.totalEdges }),
    };
}

/**
 * What a failed dataset download rejects with: an abort as it was thrown, a bad name as
 * `E_UNKNOWN_DATASET`, a file past graph-samples' size cap as `E_TOO_LARGE`, a file that came back
 * but would not decode or is not the published one as `E_PARSE_FAILED` (graph-samples' code in
 * `details.issue` for the checksum), and an answer that never came or was not ok as
 * `E_FETCH_FAILED`, which is not recoverable for a client error other than 408 and 429.
 * @param name - The dataset's name.
 * @param baseUrl - The mirror, when one was given.
 * @param signal - The load's signal.
 * @param status - The status of the answer, or undefined when none came.
 * @param error - What the download threw.
 * @returns The error to throw.
 */
function datasetError(
    name: string,
    baseUrl: string | undefined,
    signal: AbortSignal | undefined,
    status: number | undefined,
    error: unknown,
): unknown {
    if (signal?.aborted === true) {
        return error;
    }
    const mirror = baseUrl === undefined ? {} : { baseUrl };
    const dataset = error instanceof DatasetError ? error : undefined;
    const code = dataset?.code;
    if (code === "E_DATASET_NAME") {
        return new GraphtyError({
            code: "E_UNKNOWN_DATASET",
            message: `"${name}" is not a dataset name.`,
            source: "data",
            details: { name, available: DATASET_NAMES },
            cause: error,
        });
    }
    if (code === "E_DATASET_TOO_LARGE") {
        return new GraphtyError({
            code: "E_TOO_LARGE",
            message: `The dataset "${name}" is larger than the download limit.`,
            source: "data",
            recoverable: false,
            details: { limit: Number(dataset?.details.maxBytes), of: "bytes" },
            cause: error,
        });
    }
    if (status !== undefined && status >= 200 && status < 300) {
        return new GraphtyError({
            code: "E_PARSE_FAILED",
            message: `The dataset "${name}" was downloaded but could not be read.`,
            source: "data",
            recoverable: false,
            details: {
                name,
                format: "graph-format",
                ...mirror,
                ...(code === "E_DATASET_CHECKSUM" ? { issue: code } : {}),
            },
            cause: error,
        });
    }
    const clientError = status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429;
    return new GraphtyError({
        code: "E_FETCH_FAILED",
        message: `The dataset "${name}" could not be downloaded.`,
        source: "data",
        recoverable: !clientError,
        details: { name, ...mirror, ...(status === undefined ? {} : { status }) },
        cause: error,
    });
}

/** An endpoint expression that is one top-level key, which a moved edge's record is rewritten under. */
const BARE_KEY = /^[A-Za-z_]\w*$/;

/**
 * The refusal of a malformed `mergeNodes` call.
 * @param field - What is wrong.
 * @returns An `E_BAD_COMMAND` error.
 */
function mergeRefusal(field: string): GraphtyError {
    return new GraphtyError({
        code: "E_BAD_COMMAND",
        source: "data",
        message: `The mergeNodes argument is malformed: ${field}.`,
        details: { door: "mergeNodes", field },
    });
}

/**
 * Whether a command, or a step of a batch, writes records straight onto the graph.
 * @param command - The command.
 * @returns True for a `data.apply` anywhere in it.
 */
function writesRecords(command: SessionCommand): boolean {
    return command.op === "data.apply" || (command.op === "batch" && command.steps.some((step) => writesRecords(step)));
}

/** Each build's elements by the session id that draws them. */
const elementIndex = new WeakMap<
    BuildResult,
    { edgeIds: Readonly<Record<string, EdgeId>>; nodes: Map<string, BuiltNode>; edges: Map<EdgeId, BuiltEdge> }
>();

/**
 * A build's nodes by NodeId (as text) and edges by session edge id, kept per build.
 * @param result - The build.
 * @param edgeIds - The session edge id of each built edge.
 * @returns The two maps.
 */
function elementsById(
    result: BuildResult,
    edgeIds: Readonly<Record<string, EdgeId>>,
): { nodes: ReadonlyMap<string, BuiltNode>; edges: ReadonlyMap<EdgeId, BuiltEdge> } {
    const held = elementIndex.get(result);
    if (held?.edgeIds === edgeIds) {
        return held;
    }
    const ids = nodeIdsOf(result);
    const nodes = new Map<string, BuiltNode>();
    for (const n of result.nodes.values()) {
        nodes.set(String(ids.get(n.id)), n);
    }
    const edges = new Map<EdgeId, BuiltEdge>();
    for (const e of result.edges.values()) {
        const id = edgeIds[e.id];
        if (id !== undefined) {
            edges.set(id, e);
        }
    }
    const index = { edgeIds, nodes, edges };
    elementIndex.set(result, index);
    return index;
}

/** Each build's mixed-weight sources, or null, kept per build. */
const mixedWeights = new WeakMap<BuildResult, readonly string[] | null>();

/**
 * The one weight rule (design 8.6): the sources of a build's edges when their weights do not share
 * one meaning. An edge whose own source reads a weight but has none for it reads 1 and is no
 * meaning of its own; edges of a source that reads no weight are, and an unstated meaning is mixed
 * against a stated one.
 * @param result - The build.
 * @returns The edges' sources, or null when they share one meaning or none has a weight.
 */
function mixedWeight(result: BuildResult): readonly string[] | null {
    if (mixedWeights.has(result)) {
        return mixedWeights.get(result) ?? null;
    }
    const mixed = mixedAmong(result.edges.values());
    mixedWeights.set(result, mixed);
    return mixed;
}

/**
 * The one weight rule over some built edges, as {@link mixedWeight} judges a whole build.
 * @param edges - The edges.
 * @returns Their sources, or null when they share one meaning or none has a weight.
 */
function mixedAmong(edges: Iterable<BuiltEdge>): readonly string[] | null {
    const meanings = new Set<string>();
    const sources = new Set<string>();
    let weighted = false;
    for (const e of edges) {
        for (const load of e.loads) {
            sources.add(load);
        }
        if (e.weightDefault) {
            continue;
        }
        weighted ||= e.weight !== null;
        meanings.add(e.weight === null ? "\u0000none" : (e.weightMeaning ?? "\u0000unstated"));
    }
    return weighted && (meanings.size > 1 || meanings.has("\u0000none")) ? Object.freeze([...sources]) : null;
}

/**
 * Gives each node record the saved drawing a dataset's position column holds, as the `position`
 * every reader seeds the layout from (center, y up), so a dataset graph-samples gives a drawing
 * (BioPlex 3.0, WikiPathways WP615) is placed like a file with stored positions (issue #9281).
 * A geographic position column is a place on the Earth, not a drawing, and is left to the map.
 * @param snapshot - the dataset
 * @param nodes - its node records, one per row in row order; changed in place
 */
function placeFromDrawing(snapshot: GraphSnapshot, nodes: readonly Record<string, unknown>[]): void {
    const column = snapshot.nodes.byRole("position");
    if (column === null) {
        return;
    }
    const system = coordinateSystemOf(column.meta);
    if (system.kind !== "cartesian") {
        return;
    }
    const flip = system.yAxis === "down" ? -1 : 1;
    for (let row = 0; row < nodes.length; row++) {
        const xyz = column.isSet(row) ? (column.value(row) as ArrayLike<number>) : null;
        if (xyz !== null && Number.isFinite(xyz[0]) && Number.isFinite(xyz[1]) && !("position" in nodes[row])) {
            nodes[row].position = [xyz[0], flip * xyz[1], Number.isFinite(xyz[2]) ? xyz[2] : 0];
        }
    }
}
