/**
 * @file The vocabulary of a graph session: what it holds, what it hands back, and what it needs
 * from the element in order to answer.
 *
 * A session is the graph with no screen attached. Everything declared here is plain data, a
 * typed array, or a function over those, and nothing in this file -- or anything it imports --
 * reaches Babylon.js, Lit or the DOM. That is the whole point of the split: the same object that
 * backs a rendered view backs a Node test with no GPU, and two views of one dataset are one of
 * these and two renderers.
 *
 * The rule that decides whether a thing belongs here or on the view: if two synchronized views
 * of one dataset would DISAGREE about it, it belongs to the view. A camera disagrees. Node
 * count, coordinates and statistics do not.
 */

import type { DerivedGraph, GraphSnapshot, NodeId } from "@graphty/graph-format";
import type { SourceListing, SourceListQuery, SourceProbe } from "@graphty/graph-io";
import type { GeneratorParams } from "@graphty/graph-samples/generators";
import type { z } from "zod";

import type {
    AccelerationCapabilities,
    AccelerationPolicy,
    AccelerationStatus,
    Capabilities,
    GraphAccelerator,
} from "../acceleration";
// EdgeId comes from the ELEMENT's catalog rather than from graph-format, which is the one line
// that makes `const id: EdgeId = record.id` type-check. This entry point used to publish two
// different EdgeId types -- graph-format's `string | number` on EdgeRecord and the catalog's
// `string` everywhere else -- so assigning one to the other was an error on the element's own
// published surface.
import type { Tour } from "../camera/tour";
import type { CameraState } from "../camera/types";
import type { CameraGestureKind } from "../cameras/gestureEnd";
import type {
    AlgorithmKey,
    AttributeDescriptor,
    CatalogApi,
    DeprecatedCatalogMethod,
    EdgeId,
    FilterCondition,
    FormatId,
    LayerId,
    LayoutId,
    MeasurementDeclaration,
    Path,
    Query,
    ReadableValue,
    RuleTree,
    RunId,
    Scope,
    ScopeInput,
    SelectionDirection,
    SetId,
    SourceKey,
    StructureValue,
    StyleDocument,
} from "../catalog/types";
import type { DataConfig } from "../config/DataConfig";
import type {
    GraphBackgroundConfig,
    GraphSelectionStyleConfig,
    GraphSelectionStyleInput,
    LayoutTransitionConfig,
} from "../config/GraphStyle";
import type { LoadReport } from "../data/report";
import type { GraphtyError } from "../errors/GraphtyError";
import type { EnabledFeatures } from "../features/resolve";
import type { DrawnAnnotation } from "./annotations";
import type { AssetId, AssetsApi } from "./assets/AssetsApi";
import type { CostEstimate, CostGateLimits, CostMeasurement, MachineCalibration } from "./cost";
import type { FilesApi } from "./files/kindOf";
import type { SessionGraphs } from "./graphs/GraphsApi";
import type { GroupsApi } from "./groups";
import type { DataIssue, FixCode, FixResult, IssueId } from "./issues";
import type { JournalApi, JournalEntry } from "./journal";
import type { LayoutRecommendation } from "./layout";
import type { DefaultableLimits, LimitsOption } from "./limits";
import type { NetworkApi, NetworkRequest } from "./network";
import type { NoteChange, NoteId, NotesApi } from "./notes/types";
import type { AlgorithmRunCommand, Plan, SessionCommand } from "./planning";
import type { ProjectApi, ProjectStatus } from "./projectFile";
import type { RecipeDocument } from "./recipe";
import type { RecipesApi } from "./recipes/RecipesApi";
import type { ResultsApi, RunRef } from "./results";
import type { Histogram, HistogramOptions } from "./results/types";
import type {
    Caveats,
    EngineVersions,
    Run,
    RunChange,
    RunExecutor,
    RunOptions,
    RunQueue,
    RunRemoval,
    RunsApi,
    WeightMeaning,
} from "./runs";
import type { ScopeApi } from "./scope/index";
import type { SelectionApi, SelectionDelta, SelectionOwner, SelectionTarget, SelectionTextMode } from "./selection";
import type { SetChange, SetsApi } from "./sets/types";
import type { RenderQualityChange, SessionShaders, ShaderStatus } from "./shaders";
import type { CodedFact, ColumnRef, ProgressChange, ResultRef } from "./shared";
import type {
    CollapseResult,
    ExpandOptions,
    NodeSource,
    PendingSourceLoad,
    SourceCheck,
    SourceExpanded,
    SourceExpandFailed,
    SourceExpandResult,
    SourceExpandStart,
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
import type {
    ElementPaint,
    SessionStylesApi,
    StyleBatchChange,
    StyleChange,
    StyleRefusal,
    StyleRepaintFailure,
    StylesApi,
} from "./styles";
import type { FileStyleOptions } from "./styles/fileStyles/translate";
import type { EdgeAgeFade } from "./time/ageFade";
import type { TimeUnit } from "./time/parse";
import type { TimeApi, TimeField, TimeStepEvent } from "./time/TimeApi";
import type { HiddenNotDrawn, SessionVisibilityApi, TimeWindow, VisibilityApi, VisibilityChange } from "./visibility";

/**
 * What `session.capabilities` reports: acceleration and XR, the last calibration of this machine
 * (`calibration`, null until `session.calibrate()` has run on the page), and the limits a load is
 * refused above on this element's render path (`limits`, honored under `render-path="batched"`;
 * the shipped `DEFAULT_LIMITS` otherwise).
 */
export type SessionCapabilities = Pick<Capabilities, "acceleration" | "xr" | "calibration"> & {
    /**
     * The limits in force.
     * @experimental cosmograph
     */
    readonly limits: Readonly<DefaultableLimits>;
};

/**
 * The element's data configuration, parsed: the id and weight paths, the position scale, the
 * direction policy and the id coercion rule.
 *
 * It is the configuration the session's own behavior reads, which is why it is the part of the
 * configuration a session carries. The style layers, the camera defaults and the XR settings are
 * the view's, and they are not here.
 */

export type SessionDataConfig = Readonly<z.output<typeof DataConfig>>;

/** A node as a consumer reads it: its id, and whatever attributes its record arrived with. */
export interface NodeRecord {
    /** The id the record was imported under. */
    readonly id: NodeId;
    /** Every other key the record carried. */
    readonly [attribute: string]: unknown;
}

/**
 * What a node is called, as facts the reader's wording is built from: `session.data.nodeName`.
 * An app chooses the words, such as "Ohio" or "Ohio (71)".
 */
export interface NodeName {
    /** The node's id, as the graph holds it (as passed, for a node the graph does not hold). */
    readonly id: NodeId;
    /**
     * Its label column's value (`data.knownFields.nodeLabelPath`) as text, else its id as text:
     * never empty; the text {@link SessionDataApi.name} gives. Untrusted text from the data: render
     * it as text, never as markup.
     */
    readonly name: string;
    /** Whether `name` came from the label column and differs from the id's text. */
    readonly labeled: boolean;
}

/** What an edge is called: its two ends' names, `session.data.edgeName`. */
export interface EdgeName {
    /** The end the edge leaves. */
    readonly source: NodeName;
    /** The end the edge enters. */
    readonly target: NodeName;
}

/** An edge as a consumer reads it: its endpoints, and whatever attributes its record carried. */
export interface EdgeRecord {
    /** The element-assigned edge id. */
    readonly id: EdgeId;
    /** The id of the node the edge leaves. */
    readonly source: NodeId;
    /** The id of the node the edge enters. */
    readonly target: NodeId;
    /** Every other key the record carried. */
    readonly [attribute: string]: unknown;
}

/** How {@link SessionDataApi.mergeNodes} merges. */
export interface MergeNodesOptions {
    /** The node the others merge into; it may be one of the ids or another node. Default: the first id. */
    readonly into?: NodeId;
    /** Values the kept node takes, patched onto its record. Default: it keeps its record as it is. */
    readonly values?: Readonly<Record<string, unknown>>;
}

/** The attribute bag one record arrived with, as the session reads it. */
export type SessionAttributes = Readonly<Record<string, unknown>>;

/** What a page of records is sorted by: one of the keys its records carry. */
export interface RecordSort {
    /**
     * The record key to sort by: a top-level attribute, or `id` (and `source` or `target` for an
     * edge), read literally; on nodes also a structure path (`graphty.degree`, and on a directed
     * graph `graphty.inDegree` and `graphty.outDegree`). Numbers (bigints among them) come before text, text sorts in natural
     * order ("2" before "10"), and a record without the key comes last in either direction.
     */
    readonly key: string;
    /** Largest first. Default false. */
    readonly descending?: boolean;
}

/**
 * A run's result as a page column: the run itself (its primary field), or `{ run, field? }`.
 *
 * A bare string is a run id, never a path or an expression.
 */
export type ResultColumn = RunRef | ResultRef;

/**
 * A page sorted by a run's result: the run, optionally one of its fields, and the direction.
 *
 * Elements the run measured come first, in value order, and ties keep the graph's order; elements
 * it has no value for come last in either direction. A grouping field (a partition's `group`, a
 * hierarchy's `level`) sorts by group size instead of by the group's id, so `descending` puts the
 * largest group first.
 */
export interface ResultSort extends ResultRef {
    /** Largest first. Default false. */
    readonly descending?: boolean;
}

/** One cell of a {@link PageColumn}: `undefined` when the run has no value for that record. */
export type ResultCell = number | string | boolean | undefined;

/** One result column of a page, in the order `columns` asked for it. */
export interface PageColumn {
    /** The run's id, whichever form (handle, result or id) `columns` named it in. */
    readonly run: RunId;
    /** The field, after the primary-field default was applied. */
    readonly field: string;
    /** The published path of the field, as a style selector or a filter reads it. */
    readonly path: Path;
    /** The field's declared type. */
    readonly type: "number" | "integer" | "boolean" | "string";
    /**
     * The run has no result yet (queued, or running for the first time): every cell is undefined.
     * A rerun keeps showing the previous values until the new ones publish.
     */
    readonly pending: boolean;
    /** One cell per record, aligned with `records`. */
    readonly values: readonly ResultCell[];
    /**
     * For a column of a partition's groups (a community run's `group`): each cell's group rank,
     * aligned with `records` -- its place by size, 1 for the largest. It is the same `rank` the run
     * summary's group and the legend's swatch carry, so a table names a group the way they do
     * ("Group 3") rather than by its raw id. Undefined for a record in no group. Absent on any
     * other column.
     */
    readonly ranks?: readonly (number | undefined)[];
}

/**
 * A run whose result a page of one kind can show as a column: what
 * {@link SessionDataApi.resultColumns} lists.
 */
export interface ResultColumnDescriptor {
    /** The run's id; pass it, or the run, in `columns` or `sort`. */
    readonly run: RunId;
    /** The run's primary field, which a column naming only the run reads. */
    readonly field: string;
    /** The published path of the field, as a style selector or a filter reads it. */
    readonly path: Path;
    /** The field's declared type. */
    readonly type: PageColumn["type"];
    /**
     * The field names groups (a community's `group`, a hierarchy's `level`), so a sort by it orders
     * records by group size, largest group first when descending, rather than by the group's id.
     */
    readonly grouping: boolean;
}

/** Which records a page holds, and from where in their order. */
export interface RecordPageOptions {
    /** The position of the page's first record in the ordered list. Default 0. */
    readonly offset?: number;
    /** The most records the page holds; `Infinity` reads to the end. Default 100. */
    readonly limit?: number;
    /**
     * Which records: any scope, such as `"selection"` or `{ set: id }`. Default `"graph"`, or
     * `"visible"` while the session's `workingGraph` option is on.
     */
    readonly scope?: ScopeInput;
    /**
     * The order. Absent, records come in the graph's own order: the order they were added, which
     * an edit never changes -- a removed record leaves a gap that closes, an added one goes last.
     * Records that sort equal keep that order too.
     */
    readonly sort?: RecordSort | ResultSort;
    /**
     * Run results to read for the page's records, returned as {@link RecordPage.columns} in the
     * same order. The records themselves are unchanged.
     */
    readonly columns?: readonly ResultColumn[];
    /**
     * Only the records that match a text, as `selection.apply({ text, mode })` matches it: a
     * node by its id and its attribute values, an edge by its id, its two endpoints' ids and its
     * attribute values. With no `mode` the text may carry one as a prefix (`exact:`, `regex:`,
     * `<attribute>:`); otherwise it is found anywhere, ignoring case. Combines with `scope`,
     * `sort` and `columns`; `total` counts the matches. Selects nothing.
     *
     * ```ts
     * session.data.nodePage({ matching: { text: "jav" }, limit: 30 }); // Javert, ...
     * ```
     */
    readonly matching?: {
        /** The text to match. */
        readonly text: string;
        /** How the text matches, as `selection.apply` reads `mode`; unset, a prefix in the text may name one. */
        readonly mode?: SelectionTextMode;
        /**
         * Look only at what a record is called: a node's id and its name ({@link SessionDataApi.name}'s
         * label column), an edge's id and its endpoints' ids, never the other columns. What a
         * picker of nodes by name wants on a graph whose columns hold numbers and codes. A graph
         * with no label column names its nodes in its other columns, so there every value is read.
         *
         * ```ts
         * session.data.nodePage({ matching: { text: "1", names: true }, limit: 8 }); // n1, n10, ...
         * ```
         * @beta
         */
        readonly names?: boolean;
        /**
         * Rank the matches: the records whose matched value is the text come first, then those
         * whose value starts with it, then those that hold it elsewhere; within each rank, `sort`
         * (or the graph's order) as without it. The page then carries {@link RecordPage.matches}:
         * for each record, the field it matched and how. `total` counts every match. Default
         * false, which leaves the page as it was.
         *
         * ```ts
         * const page = session.data.nodePage({ matching: { text: "jav", rank: true }, limit: 10 });
         * page.matches?.[0]; // { field: "data.name", rank: "starts-with" }
         * ```
         */
        readonly rank?: boolean;
    };
    /**
     * Only the records an expression matches, read the way a style layer's selector reads it: a
     * node page tests each node, an edge page each edge, so `data.weight > \`0.5\`` pages the
     * heavy edges where `scope: { where }` names nodes only. Combines with every other option;
     * `total` counts the matches. Selects nothing. An expression that does not parse is refused
     * with `E_BAD_SELECTOR`.
     *
     * ```ts
     * session.data.edgePage({ where: "data.weight > `0.5`", limit: 0 }).total; // how many heavy edges
     * ```
     */
    readonly where?: Query;
    /**
     * Only the records an open issue is on: one issue's id, or the word `"any"` for every open
     * issue (no issue id is `"any"`).
     * An ignored issue, an issue the data does not have, and an issue on rows the graph never
     * held (`blank-id`, `refused-row`) leave the page empty. Combines with `scope`, `matching`,
     * `sort` and `columns`; `total` counts the matches.
     *
     * ```ts
     * const rows = session.data.nodePage({ issue: "case-variant:node:city" });
     * ```
     * @since 3.37.0
     */
    readonly issue?: IssueId;
    /**
     * Carry each record's open issues as {@link RecordPage.issues}, without narrowing the page:
     * what marks the affected cells of an unfiltered table. Finding the issues reads every record
     * once per revision, so it is off by default; a page asked with `issue` carries them anyway.
     * @since 3.37.0
     */
    readonly markIssues?: boolean;
}

/**
 * How well a record's value matched a page's text: equal to it (`"exact"`, ignoring case unless
 * the mode reads case), starting with it, or holding it elsewhere. A regular expression's match
 * is always `"contains"`. An open set: later releases may add ranks.
 */
export type RecordMatchRank = "exact" | "starts-with" | "contains";

/** Where and how a page's text matched one record: its best-ranked field. */
export interface RecordMatch {
    /**
     * The field that matched: `"id"`, for an edge also `"source"` or `"target"` (an endpoint's id),
     * or the value path read (`"data.name"`).
     */
    readonly field: Path;
    /** How well it matched. */
    readonly rank: RecordMatchRank;
}

/** Which edges a page holds: {@link RecordPageOptions}, plus the edges at one node. */
export interface EdgePageOptions extends RecordPageOptions {
    /** Only the edges with this node at one end or both. */
    readonly touching?: NodeId;
}

/** How a caller follows and stops {@link SessionDataApi.preparePage}. */
export interface PreparePageControl {
    /** Stops the work: the call rejects with the signal's reason, and no order is kept. */
    readonly signal?: AbortSignal;
    /** Told how far the work has got, from 0 to 1, between two slices and once more at the end. */
    readonly onProgress?: (fraction: number) => void;
}

/** One window onto an ordered list of records. */
export interface RecordPage<TRecord> {
    /** The records, deep-frozen; at most `limit` of them, fewer at the end of the list. */
    readonly records: readonly TRecord[];
    /** The position of `records[0]` in the ordered list: the offset asked for. */
    readonly offset: number;
    /** How many records the whole ordered list holds. */
    readonly total: number;
    /**
     * Changes whenever anything a page could show may have changed: a record added, removed or
     * edited, an undo, a load, the selection or a set's members. A page held under one revision
     * is stale once {@link SessionDataApi.nodePage} answers another. Opaque: compare it, do not
     * parse it. A run publishing or clearing its result, or being removed, moves it too. It is the
     * session's, not the page's: every page read at the same moment carries the same revision,
     * whatever its options, so `nodePage({ limit: 0 })` asks cheaply whether anything changed.
     */
    readonly revision: string;
    /**
     * The result columns, in the order asked for; present exactly when `columns` was given, and
     * typed as present then, so a page read with `columns` needs no `?? []`.
     */
    readonly columns?: readonly PageColumn[];
    /**
     * The open issues each record is on, aligned with `records`: one list of issue ids per
     * record, empty for a record with none. Present only on a page asked with
     * {@link RecordPageOptions.issue} or {@link RecordPageOptions.markIssues}, and then absent
     * when no record on the page is on an open issue. Kept beside the records, not in them,
     * because a record's keys are its attributes.
     * @since 3.37.0
     */
    readonly issues?: readonly (readonly IssueId[])[];
    /**
     * Where the page's text matched each record, aligned with `records`. Present exactly when the
     * page was asked with `matching.rank`.
     */
    readonly matches?: readonly RecordMatch[];
}

/** What {@link GraphSession.find} lists. An open set: later releases add kinds. */
export type FindKind = "node" | "edge";

/** What {@link GraphSession.find} reads beside the text. Every field is optional. */
export interface FindOptions {
    /** The most hits it returns. Default 20; `Infinity` for all. */
    readonly limit?: number;
    /** How many hits to skip, for paging. Default 0. */
    readonly offset?: number;
    /** What to list. Default `["node", "edge"]`. */
    readonly kinds?: readonly FindKind[];
    /**
     * Where to search. Default `"visible"`, what is shown, while the session's `workingGraph`
     * option is on (the default); name `"graph"` to find hidden items too. Over the whole graph a
     * hit the visibility filter hides is still listed, and carries `excludedBy`.
     */
    readonly scope?: ScopeInput;
    /**
     * Also find an edge by its name: its source's name, this text, then its target's name, such
     * as `" -> "` for "Station -> Stadium". The name ranks with node names, so typing either end's
     * name, or the whole name, lists the edge; the hit's `match.path` is then `"ends"`. Absent
     * (the default), an edge is found by its own attribute values only.
     */
    readonly edgeNameJoiner?: string;
    /**
     * Also find a yes-or-no value by the words a reader sees for it, such as
     * `{ true: "Yes", false: "No" }`: typing "yes" then finds every `true`, as typing "true" does.
     * Matched whole, ignoring case, as a boolean is. Absent (the default), a yes-or-no value is
     * found by "true" and "false" only.
     */
    readonly booleanWords?: {
        /** The word a reader sees for `true`. */
        readonly true: string;
        /** The word a reader sees for `false`. */
        readonly false: string;
    };
}

/** One end of an edge hit. */
export interface FindEnd {
    /** The node's id. */
    readonly id: NodeId;
    /** The node's name: its label column's value, else its id as text. */
    readonly name: string;
}

/** A value {@link FindHitBase.match} found the text in: an attribute's value, or a node's id. */
export type FindMatchValue = string | number | boolean;

/** What every {@link FindHit} carries. */
export interface FindHitBase {
    /**
     * Where the text was found. `path` is `"id"` for a node's id, else the attribute's literal
     * column key (`AttributeDescriptor.path`, such as `"data.name"`). When several values match,
     * this is the best-ranked one, ties going to the first in `data.attributes()` order.
     */
    readonly match: {
        /** `"id"` for a node's id, else the attribute's literal column key. */
        readonly path: Path;
        /** The value the text was found in. */
        readonly value: FindMatchValue;
    };
    /**
     * Present when the element is in the graph but `session.visibility` hides it (the time window
     * is part of that filter). Never present under `scope: "visible"`, which leaves hidden
     * elements out.
     */
    readonly excludedBy?: {
        /** Hidden by the visibility filter, the time window included. */
        readonly kind: "filter";
    };
    /**
     * A selection target naming exactly this element, for `selection.apply`. Not the edge's end:
     * that is `ends.target` on an edge hit.
     */
    readonly target: SelectionTarget;
}

/**
 * One element the text found. `kind` narrows the rest.
 *
 * OPEN UNION: later releases add kinds (runs, layers, notes), so switch on `kind` with a default
 * branch. The type lists today's kinds, so the default branch sees `never`: skip the hit there.
 */
export type FindHit =
    | (FindHitBase & {
          /** A node. */
          readonly kind: "node";
          /** Its id. */
          readonly id: NodeId;
          /** Its label column's value (`data.knownFields.nodeLabelPath`), else its id as text. */
          readonly name: string;
      })
    | (FindHitBase & {
          /**
           * An edge, found by its own attribute values, and by its name when
           * `FindOptions.edgeNameJoiner` is set; never by its id.
           */
          readonly kind: "edge";
          /** Its element-assigned id. */
          readonly id: EdgeId;
          /** The nodes it joins: `source` is the one it leaves on a directed graph. */
          readonly ends: {
              /** The end the edge leaves on a directed graph. */
              readonly source: FindEnd;
              /** The end the edge arrives at on a directed graph. */
              readonly target: FindEnd;
          };
      });

/** One attribute value the text matched, with how many elements in scope carry it. */
export interface FindValueRow {
    /** Whether nodes or edges carry it. */
    readonly kind: FindKind;
    /** The attribute's literal column key, such as `"data.group"`. */
    readonly path: Path;
    /** The value. */
    readonly value: FindMatchValue;
    /** How many elements `target` selects: every one in scope carrying exactly this value. */
    readonly count: number;
    /** A selection target naming exactly those elements, for `selection.apply`. */
    readonly target: SelectionTarget;
    /**
     * The rule leaf that holds the elements carrying exactly this value, over the whole graph
     * rather than the find's scope: `{ kind: "text", reads: path, mode: "exact", text, caseSensitive:
     * true }`. Live where `target` is a fixed list: as a layer's `{ match: "rule", where }` or a
     * filter, it follows the data. A row is the same kind's elements; the rule also holds the
     * other kind's elements carrying the value, when that kind has the column too.
     */
    readonly rule: Extract<RuleTree, { kind: "text" }>;
    /**
     * Present only when `value` is a number: the elements in scope whose value in this column is
     * `value` or more. `target` is the typed rule `<column> >= value` (a `{ text: "=..." }`
     * target, narrowed to the find's scope), and `count` is how many elements it selects.
     */
    readonly atLeast?: {
        /** How many elements in scope `target` selects. */
        readonly count: number;
        /** The typed rule `<column> >= value`, narrowed to the find's scope. */
        readonly target: SelectionTarget;
    };
}

/** A column the text was found in, and every element whose value there contains it. */
export interface FindContainsRow {
    /** Whether nodes or edges carry it. */
    readonly kind: FindKind;
    /** `"id"` for the node id, else the attribute's literal column key, such as `"data.name"`. */
    readonly path: Path;
    /** The text, as typed after any prefix. */
    readonly text: string;
    /** How many elements in scope `target` names. */
    readonly count: number;
    /** A selection target naming exactly those elements: a fixed list, for `selection.apply`. */
    readonly target: SelectionTarget;
    /**
     * The rule that holds them, over the whole graph rather than the find's scope: `{ kind:
     * "text", reads: path, mode: "substring", text }`, folded as find folds. Live where `target`
     * is a fixed list: as a layer's `{ match: "rule", where }` it follows the data.
     */
    readonly rule: Extract<RuleTree, { kind: "text" }>;
}

/**
 * A value whose name the text matched, such as Connections for "degree", with an offer for a
 * number: the elements at or above the value the top quarter of them reach ("Connections is 10 or
 * more" on Les Miserables).
 * @since 3.26.0
 */
export interface FindNamedRow {
    /** Whether nodes or edges carry it. */
    readonly kind: FindKind;
    /** What a rule or a binding reads, as `data.readableValues()` names it. */
    readonly path: Path;
    /** Its catalog name, as `data.readableValues()` gives it. */
    readonly plainName: string;
    /** The name a technical reader knows it by. */
    readonly technicalName: string;
    /**
     * Present when every value is a number: the largest value at or above which a quarter or
     * more of the elements carry, how many elements in scope that is, and the typed rule
     * `<path> >= value` for `selection.apply`, as {@link FindValueRow.atLeast} gives it.
     */
    readonly atLeast?: {
        /** The largest value at or above which a quarter or more of the elements carry. */
        readonly value: number;
        /** How many elements in scope carry `value` or more. */
        readonly count: number;
        /** The typed rule `<path> >= value`, for `selection.apply`. */
        readonly target: SelectionTarget;
    };
}

/** A number column the typed number falls inside, and the elements at or above it there. */
export interface FindAtLeastRow {
    /** Whether nodes or edges carry the column. */
    readonly kind: FindKind;
    /** The column's literal key, such as `"data.minutes"`. */
    readonly path: Path;
    /** The typed number. */
    readonly value: number;
    /** How many elements in scope `target` selects. */
    readonly count: number;
    /** The typed rule `<column> >= value`, narrowed to the find's scope, for `selection.apply`. */
    readonly target: SelectionTarget;
}

/** What {@link GraphSession.find} answers: a page of hits, in the `RecordPage` shape, and value rows. */
export interface FindResult {
    /** The hits in this window, best first. */
    readonly records: readonly FindHit[];
    /** Where the window starts. */
    readonly offset: number;
    /** How many hits there are in all. */
    readonly total: number;
    /** How many of those hits are nodes and how many are edges; they add up to `total`. */
    readonly totals: {
        /** How many of the hits are nodes. */
        readonly node: number;
        /** How many of the hits are edges. */
        readonly edge: number;
    };
    /** The input revision the answer was read at; a different one means it is stale. */
    readonly revision: string;
    /** At most three matched attribute values, commonest first. */
    readonly values: readonly FindValueRow[];
    /**
     * Present when the whole text is a number that some number column's values enclose but no
     * value there equals: one row per such column, at most three, in `data.attributes()` order,
     * nodes first. Each row's `count` and `target` read as {@link FindValueRow.atLeast}'s.
     */
    readonly atLeast?: readonly FindAtLeastRow[];
    /**
     * Present when plain text matched: one row per column the text was found in, at most three,
     * most elements first, each holding every element whose value there contains the text ("name
     * contains bob"). Absent for an `exact:` search, and for columns of numbers or yes-or-no
     * values, which find matches only whole.
     */
    readonly contains?: readonly FindContainsRow[];
    /**
     * Present when the text matched the catalog name of a value the elements carry, a run's
     * included: after Degree has run, "degree" or "connections" lists Connections. At most three,
     * in `data.readableValues()` order, nodes first.
     * @since 3.26.0
     */
    readonly named?: readonly FindNamedRow[];
    /**
     * Set when the text is a pattern to run on commit, not text to find: a `regex:` or `=`
     * query. Find does not run it and lists nothing; `selection.apply({ text })` runs it.
     */
    readonly notSearchable?: "regex" | "expression";
}

/**
 * Which neighbors of a node a {@link SessionDataApi.neighbors} page lists, how they are weighed,
 * and in what order. Every field is optional.
 */
export interface NeighborOptions {
    /**
     * Which edges to follow: arriving (`"in"`), leaving (`"out"`) or both (`"all"`), as the
     * Neighborhood selection takes it. On an undirected graph all three are the same. Default
     * `"all"`.
     */
    readonly direction?: SelectionDirection;
    /**
     * The edge weight, as runs take it: the literal name of an edge column, and whether a larger
     * value means a stronger tie (`"strength"`, whose edges add up) or a longer one
     * (`"distance"`, whose shortest edge counts). An edge with no number there weighs 1, as in a
     * run, and is counted in {@link NeighborPage.missing}. `null` counts edges. Absent, the
     * weight the graph was loaded with, read as a strength; counts when it was loaded with none.
     */
    readonly weight?: WeightMeaning | null;
    /**
     * Which neighbors are listed: any scope, such as `"selection"`. Default `"graph"`, or
     * `"visible"` while the session's `workingGraph` option is on.
     */
    readonly scope?: ScopeInput;
    /**
     * The order. Absent: strongest first when the page has a weight (largest first for a
     * strength, smallest first for a distance), else by name. Rows that sort equal keep the
     * graph's own order.
     */
    readonly sort?: NeighborSort;
    /** The position of the page's first row in the ordered list. Default 0. */
    readonly offset?: number;
    /** The most rows the page holds; `Infinity` reads to the end. Default 100. */
    readonly limit?: number;
}

/**
 * What a neighbor page is sorted by: its `weight` or its `name`, smallest first unless
 * `descending`. The direction is absolute, whatever the weight means: the default order is
 * `{ by: "weight", descending: true }` for a strength and `{ by: "weight" }` for a distance.
 */
export interface NeighborSort {
    /**
     * What the neighbors are ordered by: the combined weight of the edges to them, their name, or
     * their own degree (how many edges each neighbor has in the whole graph, in either direction),
     * so `{ by: "degree", descending: true }` lists the best-connected neighbors first.
     */
    readonly by: "weight" | "name" | "degree";
    /** Largest first. Default false. */
    readonly descending?: boolean;
}

/** One neighbor of a node. */
export interface Neighbor {
    /** The neighbor's record, deep-frozen. */
    readonly node: NodeRecord;
    /**
     * The value at `data.knownFields.nodeLabelPath`, as text, else `String(node.id)`. Untrusted
     * text from the data: render it as text, never as markup.
     */
    readonly name: string;
    /**
     * The edges' combined weight. When {@link NeighborPage.measuredBy} is null the page counts
     * edges, and this equals {@link Neighbor.edgeCount}.
     */
    readonly weight: number;
    /** How many edges join the two along the direction followed, each counted once. */
    readonly edgeCount: number;
    /**
     * Present when the neighbor is in the data but the session's visibility filter hides it.
     * `"filter"` covers `visibility.set()` and `visibility.setWindow()` alike: the time window is
     * part of the one visibility filter. Open: more kinds may be added.
     */
    readonly excludedBy?: {
        /** Hidden by the visibility filter, the time window included. */
        readonly kind: "filter";
    };
}

/** The weight a graph was loaded with: `session.data.loadedWeight()`. */
export interface LoadedWeight {
    /** The edge attribute the weights were read from. */
    readonly attribute: string;
    /** What the weight means, or null when the load did not say. */
    readonly meaning: WeightMeaning["meaning"] | null;
    /**
     * Under the `source-steps` experiment: present when the edges' weights do not share one
     * meaning, or some edges come from a source that reads no weight. Runs and layouts then read no
     * weight (`caveats.weightSkipped` `weight.meaning-mixed`, a layout's `W_WEIGHT_MEANING_MIXED`).
     * `sources` lists the sources of the edges.
     * Experimental: may change or be removed in a minor release.
     * @beta
     */
    readonly mixed?: {
        /** The sources whose weights were combined. */
        readonly sources: readonly string[];
    };
}

/** A {@link RecordPage} of neighbors, plus what the numbers measured. */
export interface NeighborPage extends RecordPage<Neighbor> {
    /** The weight the rows were combined by, or null when every row's `weight` is an edge count. */
    readonly measuredBy: WeightMeaning | null;
    /**
     * How many EDGES walked (not neighbors) had no number at the weight column and so weighed 1,
     * as in a run. 0 when {@link measuredBy} is null.
     */
    readonly missing: number;
}

/**
 * The connected-component shape of the graph.
 *
 * `sizes` is the size distribution rather than only the largest, because without it a consumer
 * has to walk `componentOf` over every node to answer "are the small parts mostly single
 * nodes?", and that walk is the sort of graph logic that belongs in the element.
 */
export interface ComponentStatistics {
    /** How many connected components the graph has, counting isolated nodes as components. */
    readonly count: number;
    /** Component sizes, descending, capped at `COMPONENT_SIZE_CAP` entries. */
    readonly sizes: readonly number[];
    /** The size of the largest component; zero for an empty graph. */
    readonly largestSize: number;
    /** How many components hold exactly one node. */
    readonly isolatedCount: number;
    /** True when `sizes` was cut short by the cap, so it is a prefix rather than the whole list. */
    readonly truncatedSizes: boolean;
    /**
     * Which component a node belongs to.
     * @param id - the node id; an integer id may be written either way, `34` or `"34"`
     * @returns the component number, or undefined when the graph has no such node
     */
    componentOf(id: NodeId): number | undefined;
}

/**
 * How the graph's direction came to be what it is.
 *
 * WHY THE SOURCE IS PUBLISHED AND NOT ONLY THE ANSWER. "This graph is directed" and "this file
 * said it is directed" are different claims, and a reader deciding whether to trust the first one
 * needs the second. A properties panel that prints "Directed" on a CSV nobody labeled is stating
 * the element's own default as though it were a fact about the data; the same word on a GEXF file
 * whose header says so is reporting what the author wrote. Without this, a consumer cannot tell
 * those apart, and the only alternative is to re-parse the file they already handed over.
 */
export interface DirectionProvenance {
    /**
     * What settled the direction.
     *
     * `"file"` when an importer read it out of the data -- from a header the file wrote, or from
     * the default its format's own specification assigns to a file that omits that header.
     * `"configuration"` when `data.directed` was set to a boolean, which no file can overrule.
     * `"unsettled"` when nothing has said yet, which is an empty graph under `"auto"`, and a graph
     * loaded entirely from formats that state nothing.
     */
    readonly by: "file" | "configuration" | "unsettled";
    /**
     * The text that said so, ready to show a reader: `defaultedgetype="undirected"`, `digraph`,
     * `*Arcs`, `the GML default for an absent directed key (undirected)`.
     *
     * Null whenever no file settled it, so a consumer can render "Directed" and "Directed (from
     * `digraph`)" from the same two fields without a second lookup.
     */
    readonly statedBy: string | null;
}

/**
 * The facts about the graph's shape that a consumer would otherwise compute for itself.
 *
 * Every field is derived from one snapshot and cached against it, so the first read after a
 * change pays for the walk and every later read in the same revision is free.
 */
export interface GraphStatistics {
    /** Nodes in the snapshot. */
    readonly nodeCount: number;
    /** Edges in the snapshot, self-loops and repeats included. */
    readonly edgeCount: number;
    /**
     * Pairs of nodes joined by an edge as a fraction of the pairs that could be, so never above 1:
     * self-loops are excluded and repeated edges between the same pair count once. Zero for a
     * graph with fewer than two nodes.
     */
    readonly density: number;
    /**
     * Whether the graph is directed, as a fact about the graph rather than a guess per edge.
     *
     * `"unknown"` is the honest answer for an empty graph the element was never told about:
     * under `data.directed: "auto"` nothing has settled the question yet. `"mixed"` is a graph
     * whose edges carry their own direction (graph-format's role-`"directed"` edge column) and
     * do not all agree.
     */
    readonly directedness: "directed" | "undirected" | "mixed" | "unknown";
    /** Where {@link GraphStatistics.directedness} came from, so a reader can qualify the claim. */
    readonly directednessSource: DirectionProvenance;
    /** True when any edge carries a weight other than 1. */
    readonly weighted: boolean;
    /** Edges whose two endpoints are the same node. */
    readonly selfLoopCount: number;
    /** Edges beyond the first between the same pair of endpoints. */
    readonly repeatedEdgeCount: number;
    /** The smallest and the largest total degree in the graph; `[0, 0]` when there are no nodes. */
    readonly degreeRange: readonly [number, number];
    /**
     * The mean total degree, over the same measure {@link GraphStatistics.degreeRange} summarizes:
     * both ends of every edge counted, so a self-loop contributes two. Zero for an empty graph.
     *
     * It is published because the alternative is every consumer deriving it from the edge count,
     * and `2m / n` is the undirected reading: on a directed graph it double-counts, and on any
     * graph it disagrees with the range printed beside it the moment self-loops are involved. One
     * number measured from the same vector as the range cannot drift from it.
     */
    readonly meanDegree: number;
    /**
     * How the total degree is distributed: the same measure {@link GraphStatistics.degreeRange}
     * summarizes, binned the way `RunResult.histogram` bins a count. One bar per degree when there
     * are few distinct degrees, whole-number bands otherwise; the bars' counts add up to
     * {@link GraphStatistics.nodeCount}.
     *
     * `session.data.statistics()` always fills it in. It is optional only so statistics a caller
     * builds by hand, to pass to `recommendLayout` or a cost estimate, need not build one.
     *
     * ```ts
     * const histogram = session.data.statistics().degreeHistogram;
     * // binning "per-value": bins[i].from === bins[i].to, one degree each
     * ```
     */
    readonly degreeHistogram?: Histogram;
    /**
     * How the in-degree (edges arriving at each node) is distributed, binned as
     * {@link GraphStatistics.degreeHistogram} is: present only on a directed snapshot, where in
     * and out differ. A self-loop counts once here and once in the out-degree.
     * @since 3.26.0
     */
    readonly inDegreeHistogram?: Histogram;
    /**
     * How the out-degree (edges leaving each node) is distributed: present only on a directed
     * snapshot, as {@link GraphStatistics.inDegreeHistogram} is.
     * @since 3.26.0
     */
    readonly outDegreeHistogram?: Histogram;
    /**
     * The share of wedges -- two edges meeting at a node -- whose open ends are also joined, so
     * that the three nodes form a triangle: the global clustering coefficient, read with arc
     * direction ignored. 0 on a graph with no triangles (a tree, a grid, a sparse random graph),
     * near 1 on a ring of cliques.
     *
     * ESTIMATED from a fixed sample of 4,000 wedges drawn with a fixed seed, so it is the same for
     * the same graph and within about 0.01 of the exact value. A pair of opposite arcs between two
     * nodes counts as two edges, which reads such a graph slightly low.
     *
     * Optional because the element is not the only thing that builds this struct: a statistics
     * object written by hand has none, and a reader of the field takes its absence as "unknown".
     */
    readonly transitivity?: number;
    /** The connected-component shape. */
    readonly components: ComponentStatistics;
}

/**
 * How many elements carry each value of one readable path: what `session.data.valueCounts(path)`
 * returns. Unlike {@link ColumnHistogram} it reads any path `data.readableValues()` lists -- a data
 * column, a run's field, a node value read at an edge's end -- and it never bins or truncates.
 * @since 3.37.0
 */
export interface ValueCounts {
    /** Every value carried, most elements first; a tie keeps the order the values were first seen in. */
    readonly values: readonly {
        /** The value. */
        readonly value: string | number | boolean;
        /** How many elements carry it. */
        readonly count: number;
    }[];
    /** How many elements of the kind carry no value for the path. */
    readonly missing: number;
    /** How many elements of the kind there are: the values' counts plus `missing`. */
    readonly total: number;
}

/**
 * One value that occurs in a group more often than chance: one row of a group's
 * {@link OverRepresentedGroup.values}.
 */
export interface OverRepresentedValue {
    /** The column tested, such as `data.team`. */
    readonly path: Path;
    /** The value; each item of a list value is tested as a value of its own. */
    readonly value: string | number | boolean;
    /** How many of the group's members carry the value. */
    readonly count: number;
    /** How many would carry it by chance: the group's carriers of the column times the value's share of all carriers. */
    readonly expected: number;
    /** The hypergeometric chance of `count` or more by chance alone, uncorrected. */
    readonly p: number;
    /** `p` corrected for every test performed, by the method {@link OverRepresentedValues.correction} names. */
    readonly adjustedP: number;
}

/** One group's over-represented values. */
export interface OverRepresentedGroup {
    /** The group's value at the path the test grouped by. */
    readonly group: string | number | boolean;
    /** How many nodes the group holds. */
    readonly size: number;
    /** The values more frequent in the group than expected, lowest adjusted p first. */
    readonly values: readonly OverRepresentedValue[];
}

/**
 * The multiple-testing correction applied to an {@link OverRepresentedValues} table.
 *
 * - `"benjamini-hochberg"`: controls the false discovery rate, the share of reported values that
 *   are chance. The default.
 * - `"bonferroni"`: controls the chance of any false finding; each p times the number of tests.
 * - `"holm"`: controls the same as Bonferroni, step-down, never larger than Bonferroni's.
 *
 * OPEN UNION: methods may be added in a minor release; handle unknown ones.
 */
export type MultipleTestingCorrection = "benjamini-hochberg" | "bonferroni" | "holm";

/** What `session.data.overRepresented(groupBy, options)` tests and how it corrects. */
export interface OverRepresentedOptions {
    /**
     * The node columns to test, by path; by default every categorical node column except
     * `groupBy` and a column that holds the node ids.
     */
    readonly columns?: readonly Path[];
    /** How the p values are corrected for the number of tests; `"benjamini-hochberg"` by default. */
    readonly correction?: MultipleTestingCorrection;
}

/**
 * What `session.data.overRepresented(groupBy)` returns: per group, the values of the node's
 * categorical and list columns that occur in the group more often than chance.
 */
export interface OverRepresentedValues {
    /** The path the nodes were grouped by. */
    readonly groupBy: Path;
    /** How every `adjustedP` was corrected. */
    readonly correction: MultipleTestingCorrection;
    /**
     * How many tests the correction covered: one per group and value a member carries, including
     * the values that came out under-represented and are not listed.
     */
    readonly testCount: number;
    /** Every group, largest first. */
    readonly groups: readonly OverRepresentedGroup[];
}

/**
 * One summary of a numeric column over a group's members, as {@link GroupTableOptions.summaries}
 * names it. Every figure but `count` is over the members carrying a finite number; `count` is how
 * many do. `median` is the lower median, a value one member holds.
 *
 * OPEN UNION: summaries may be added in a minor release; handle unknown ones.
 */
export type GroupSummary = "count" | "sum" | "min" | "max" | "mean" | "median";

/** What `session.data.groupTable(groupBy, options)` summarizes per group. */
export interface GroupTableOptions {
    /**
     * The summaries to write per group, by the node path they read: `{ "data.age": ["mean", "max"] }`
     * writes the columns `data.age.mean` and `data.age.max`. Only the group and its size when absent.
     */
    readonly summaries?: Readonly<Record<Path, readonly GroupSummary[]>>;
}

/**
 * One row of a {@link GroupTable}: a cell per {@link GroupTable.columns} key. A summary over a
 * group with no measured member is null.
 */
export type GroupTableRow = Readonly<Record<string, string | number | boolean | null>>;

/**
 * What `session.data.groupTable(groupBy)` returns: one row per group of the nodes, keyed by neutral
 * column keys -- `group` (the group's value), `label` (its name from `setValueLabel`, null when
 * unnamed; present only when the path has a named value), `size` (how many nodes it holds) and one
 * `<path>.<summary>` per summary asked for.
 */
export interface GroupTable {
    /** The path the nodes were grouped by. */
    readonly groupBy: Path;
    /** The column keys, in order. */
    readonly columns: readonly string[];
    /** One row per group, largest first. */
    readonly rows: readonly GroupTableRow[];
}

/**
 * What a column's values are read as: what `session.data.setType(column, type)` converts them to.
 *
 * - `"text"`: strings, free text.
 * - `"number"`: finite numbers; text such as `"12.5"` converts, `"N/A"` does not.
 * - `"boolean"`: `true` and `false`; `yes`, `no`, `y`, `n`, `true`, `false`, `1` and `0` convert.
 * - `"date"`: instants, held as ISO 8601 strings (`"2024-09-01T00:00:00.000Z"`); text `Date.parse`
 *   reads, milliseconds since 1970, and a four-digit year convert. The column's type reads `"time"`.
 * - `"category"`: strings, read as groups (`type: "category"`, measured categorical).
 *
 * OPEN UNION: types may be added in a minor release; handle unknown types.
 * @since 3.30.0
 */
export type ValueType = "text" | "number" | "boolean" | "date" | "category";

/**
 * What converting a column to a type would do, before it is done: what
 * `session.data.previewType(column, type)` returns. A value that does not convert becomes blank.
 * @since 3.30.0
 */
export interface TypeChangePreview {
    /** How many values hold a value of the type afterwards, those that already did among them. */
    readonly converts: number;
    /** How many values do not convert, and become blank. */
    readonly fails: number;
    /**
     * Up to five values and what each becomes, the ones that fail first (`converted: null`).
     */
    readonly examples: readonly {
        /** The value as it is. */
        readonly value: unknown;
        /** What it becomes; null when it does not convert. */
        readonly converted: unknown;
    }[];
}

/**
 * One computed column: a data column whose values an expression reads, what
 * `session.data.derivedColumns()` lists. Its values are read at `data.<name>` like any column's.
 */
export interface DerivedColumn {
    /** Whether nodes or edges carry it. */
    readonly kind: "node" | "edge";
    /** The column's name. */
    readonly name: string;
    /**
     * The expression its values are read with, such as `data.nickname || data.name`. For a score
     * ({@link SessionDataApi.deriveScore}) it is the weighted sum of the raw values, before each
     * is rescaled; the values are worked out from `score`.
     */
    readonly expression: Query;
    /**
     * The terms of a score made by {@link SessionDataApi.deriveScore}; absent for a column made
     * by {@link SessionDataApi.derive}.
     * @since 3.57.0
     */
    readonly score?: readonly ScoreTerm[];
}

/**
 * One term of a score ({@link SessionDataApi.deriveScore}): a numeric column, and how much it counts.
 * @since 3.57.0
 */
export interface ScoreTerm {
    /** The column's path, such as `resultPath(run.id, "value")` or `data.age`. */
    readonly path: Path;
    /** How much the term counts; any finite number, negative to count against. Default 1. */
    readonly weight?: number;
}

/** Options for `session.data.derive`. */
export interface DeriveOptions {
    /** Whether nodes or edges carry the column. Default `"node"`. */
    readonly kind?: "node" | "edge";
}

/**
 * How one data column's values are distributed: what `session.data.histogram(column)` returns.
 *
 * A column that measures amounts (`measurement: "quantitative"`) is binned like a run's field,
 * with `kind: "numeric"` beside the {@link Histogram} fields. Any other column is counted by
 * value, with `kind: "categorical"`.
 *
 * OPEN UNION: kinds may be added in a minor release; handle unknown kinds.
 */
export type ColumnHistogram =
    | (Histogram & {
          /** A column of numbers, binned. */
          readonly kind: "numeric";
      })
    | {
          /** A column counted by value. */
          readonly kind: "categorical";
          /**
           * The commonest values, most elements first; a tie keeps the order the values were first
           * seen in. At most `bins` of them (20 unless asked).
           */
          readonly values: readonly {
              /** The value. */
              readonly value: string | number | boolean;
              /** How many elements carry it. */
              readonly count: number;
          }[];
          /** How many elements carry a value not in `values`; 0 when every value made the list. */
          readonly otherCount: number;
      };

/**
 * The O(1) half of a session: the facts a status chip or a disabled button needs before it can
 * decide how to behave.
 *
 * Nothing here walks the graph. Reading `counts` does freeze the builder when records have
 * arrived since the last freeze, but the freeze is cached, so a burst of a thousand records
 * costs exactly one however many readers ask afterwards.
 */
export interface SessionStatus {
    /** False once {@link GraphSession.dispose} has run; the session answers nothing after that. */
    readonly ready: boolean;
    /** How much graph there is. */
    readonly counts: {
        /** Nodes in the store, which mid-load can exceed the nodes that have been drawn. */
        readonly nodes: number;
        /** Edges in the store, which mid-load can exceed the edges that have been drawn. */
        readonly edges: number;
        /**
         * Nodes the filters and the time window have left showing.
         *
         * This is the DATA scope, and it is the number a status bar means by "showing 1,204 of
         * 50,000". It is NOT the render set: above the renderer's ceiling fewer nodes are drawn
         * than are counted here, and a run over the `"visible"` scope covers these rather than
         * whatever happened to reach a mesh.
         */
        readonly visibleNodes: number;
        /** Edges the filters and the time window have left showing, on the same terms. */
        readonly visibleEdges: number;
    };
    /** The direction the current snapshot is frozen with; false for a disposed session. */
    readonly directed: boolean;
}

/**
 * What the session needs from the one graph-format builder behind it.
 *
 * It is an interface rather than the concrete `GraphStore` because the element's `DataManager`
 * owns the store for a rendered graph and answers exactly these three members, while a headless
 * session builds a `GraphStore` of its own. Both are "the store" as far as the session is
 * concerned, and the session disposes only the one it made.
 */
export interface SessionGraphStore {
    /**
     * The current snapshot, freezing first when records have arrived since the last one.
     * @returns the immutable snapshot
     */
    getSnapshot(): GraphSnapshot;
    /**
     * The undirected view of a snapshot, built once per snapshot and cached.
     * @param snapshot - a snapshot this store produced
     * @returns the derived graph
     */
    undirected(snapshot: GraphSnapshot): DerivedGraph;
    /** The element-owned node coordinates, indexed by dense node index, read-only. */
    readonly positions: ReadonlyElementPositions;
    /**
     * How many nodes the DATA arrived carrying a coordinate for.
     *
     * THE HONEST ANSWER to "did the file that loaded this graph place its nodes", which
     * {@link ReadonlyElementPositions.placedCount} cannot give: the position array is written by the
     * importer AND by every running layout, so a moment after a file with no coordinates loads,
     * every node carries a position because the layout put it there. This counts the importer's
     * own seed column, which nothing but the importer writes.
     * @returns the count, zero for a graph with no data
     */
    readonly seededNodeCount: number;
    /**
     * How the direction of the graph in this store was settled, and by what text.
     *
     * The store is where the answer lives because the snapshot cannot carry it: a snapshot holds
     * one direction FLAG and no record of who set it, and by the time statistics are computed the
     * importer that read the file has been thrown away.
     */
    readonly directionSettledBy: DirectionProvenance;
    /**
     * What the last load into this store did: which endpoint spelling answered, how many repeated
     * edges were seen and what the policy did with them, and how many edges the graph holds.
     *
     * Optional because a store built by a session that nothing ever imported into has never had a
     * load to report on.
     */
    readonly lastImport?: LoadReport | null;
}

/**
 * Where the session reads the attributes a record arrived with.
 *
 * The store carries ids, coordinates and weights; it does not yet carry the arbitrary keys a
 * record was imported with, and those still live on the element's render objects. Until an
 * attribute column lands in the store, a session over a rendered graph reads them through this
 * seam and a session with no view reports a graph with no attributes -- which is true rather
 * than merely convenient.
 *
 * A node is looked up by BOTH its index and its id because the two holders are keyed
 * differently: the element's node render objects are in a map keyed by id, and its edge render
 * objects are in an array keyed by dense store index. Each implementation uses the key it has.
 */
export interface SessionRecordSource {
    /**
     * The attributes the node at this row arrived with.
     * @param index - the dense node index in the current snapshot
     * @param id - the same node's id
     * @returns the attribute bag, or undefined when nothing is held for that node
     */
    nodeAttributes(index: number, id: NodeId): SessionAttributes | undefined;
    /**
     * The attributes the edge at this row arrived with.
     * @param index - the dense edge index in the current snapshot
     * @returns the attribute bag, or undefined when nothing is held for that edge
     */
    edgeAttributes(index: number): SessionAttributes | undefined;
}

/**
 * Reading the graph.
 *
 * Every verb here is synchronous, because every verb here is either an O(1) lookup or a walk
 * whose answer is cached against the snapshot it was computed from, except {@link nodes} and
 * {@link edges}, which list every record and walk the graph to do it, and {@link neighbors}, which
 * walks one node's adjacency. Reads stay synchronous up to the element's load limits; a read that
 * may need more later gets an `...Async` twin.
 * Finding by text is `session.find`, synchronous too: it reads an index built once per revision.
 */
export interface SessionDataApi {
    /** The store this session reads, read-only: its snapshot is the one {@link snapshot} returns. */
    readonly store: SessionGraphStore;
    /**
     * The current snapshot. Its structure, id map and attribute columns are the graph's own,
     * shared rather than copied; its `position` and `graphty.pinned` columns are copies taken
     * now, because the graph's own are written by the layout every frame and a write into them
     * would place nodes without a step. Place and pin through `session.positions`.
     * @returns the sealed graph-format snapshot
     */
    snapshot(): GraphSnapshot;
    /**
     * The undirected view of the current snapshot, or of one handed in.
     * @param snapshot - the snapshot to derive from; the current one by default
     * @returns the derived graph, including the edge remap an edge result needs
     */
    undirected(snapshot?: GraphSnapshot): DerivedGraph;
    /**
     * One node, by id.
     * @param id - the node id. An integer id may be written either way: `"34"` finds node `34` and
     *     `34` finds node `"34"`; a graph that holds both answers each by its own id
     * @param options - Under the source-steps experiment: `space` reads `id` as a key in that id
     *     space, so a key several spaces hold names one node (experimental)
     * @param options.space - The id space.
     * @returns the record, carrying the id as the graph holds it, or undefined when the graph has
     *     no such node
     */
    node(id: NodeId, options?: { readonly space?: string }): NodeRecord | undefined;
    /**
     * What a node is called: the value of its label column (`data.knownFields.nodeLabelPath`) as
     * text, else its id as text. The same name {@link neighbors} gives each neighbor and a result
     * summary gives each element, so a header and a list never disagree. Untrusted text from the
     * data: render it as text, never as markup.
     *
     * ```ts
     * const title = session.data.name(nodeId) ?? String(nodeId); // "Javert"; nodeName never needs the ??
     * ```
     * @param id - the node id; an integer id may be written either way, as {@link node} takes it
     * @returns the name, or undefined when the graph has no such node
     */
    name(id: NodeId): string | undefined;
    /**
     * What a node is called, never undefined: its label (the value {@link name} gives), else its
     * id, with the id beside it so a caller can show both.
     *
     * ```ts
     * const { name, id, labeled } = session.data.nodeName(71); // "Ohio", 71, true
     * const words = labeled ? `${name} (${String(id)})` : name; // "Ohio (71)"
     * ```
     * @param id - the node id; an integer id may be written either way, as {@link node} takes it
     * @returns the name; for a node the graph does not hold, its id as the name
     */
    nodeName(id: NodeId): NodeName;
    /**
     * What an edge is called: its two ends' {@link nodeName}s. The caller joins them with its own
     * words, as `FindOptions.edgeNameJoiner` does for Find ("Ava -> Kofi").
     * @param edge - the two ends' node ids, such as an `EdgeRecord`
     * @param edge.source - the end the edge leaves
     * @param edge.target - the end the edge enters
     * @returns the two names
     */
    edgeName(edge: { readonly source: NodeId; readonly target: NodeId }): EdgeName;
    /**
     * What an edge is called, by its element-assigned id: its two ends' {@link nodeName}s.
     * @param edge - the edge id; the number it spells finds it too, as {@link SessionDataApi.edge} takes it
     * @returns the two names, or undefined when the graph has no such edge
     */
    edgeName(edge: EdgeId): EdgeName | undefined;
    /**
     * One edge, by the element-assigned edge id.
     * @param id - the edge id; the number it spells finds it too, `17` for `"17"`
     * @returns the record, carrying the id as the graph holds it, or undefined when the graph has
     *     no such edge
     */
    edge(id: EdgeId): EdgeRecord | undefined;
    /**
     * Every node, in the graph's order: the records {@link node} reads one at a time. Walks the
     * whole graph on every call, so read it when the graph changes, not every frame.
     * @param options - Which nodes.
     * @param options.scope - `"visible"` for what the filter and the time window show, `"graph"` for
     *     every node; absent, the working graph (what the filters show, the time window aside)
     *     while the session's `workingGraph` is on, every node while it is off.
     * @returns the records, deep-frozen
     */
    nodes(options?: { readonly scope?: "graph" | "visible" }): readonly NodeRecord[];
    /**
     * Every edge, in the graph's order: the records {@link edge} reads one at a time. Walks the
     * whole graph on every call, so read it when the graph changes, not every frame.
     * @param options - Which edges.
     * @param options.scope - `"visible"` for what the filter and the time window show, `"graph"` for
     *     every edge; absent, the working graph (what the filters show, the time window aside)
     *     while the session's `workingGraph` is on, every edge while it is off.
     * @returns the records, deep-frozen
     */
    edges(options?: { readonly scope?: "graph" | "visible" }): readonly EdgeRecord[];
    /**
     * How many nodes and edges the graph holds, read without building a record: what a
     * "1,234 nodes" label reads instead of `nodes().length`.
     *
     * ```ts
     * const { nodes, edges } = session.data.count();
     * ```
     * @param options - What to count.
     * @param options.scope - `"visible"` for what the filter and the time window show, `"graph"`
     *     for the whole graph; absent, the working graph (what the filters show, the time window
     *     aside) while the session's `workingGraph` is on (the default), the whole graph while it is off.
     *     Under the `source-steps` experiment, `source` and `type` count only one source's or one
     *     type's elements (see {@link SourceElementsFilter}); naming either with the experiment off
     *     throws `E_FEATURE_OFF`.
     * @returns the node count and the edge count
     */
    count(options?: { readonly scope?: "graph" | "visible" } & SourceElementsFilter): {
        /** The node count. */
        readonly nodes: number;
        /** The edge count. */
        readonly edges: number;
    };
    /**
     * One page of node records, without reading the rest: what a table showing a few rows of a
     * large graph reads. The order is computed once per revision, scope and sort and then reused,
     * so scrolling through the pages of one order costs only the records on each page.
     * @param options - the window, the scope and the order; every field optional
     * @returns the page, with the total and the revision it was read at
     * @throws A `GraphtyError` with `E_OPTION_RANGE` when `offset` or `limit` is not a whole
     *     number of zero or more; `E_UNKNOWN_RUN` for a column or sort naming a run this session
     *     does not hold; `E_UNKNOWN_ATTRIBUTE` for a field the run does not publish; `E_BAD_COMMAND`
     *     for a field that has no value per record of this kind.
     */
    nodePage(options: RecordPageOptions & { readonly columns: readonly ResultColumn[] }): RecordPage<NodeRecord> & {
        /** The columns the page shows, one per asked-for result column. */
        readonly columns: readonly PageColumn[];
    };
    /**
     * One page of node records, with no result columns.
     * @param options - the window, the scope and the order; every field optional
     * @returns the page, with the total and the revision it was read at
     */
    nodePage(options?: RecordPageOptions): RecordPage<NodeRecord>;
    /**
     * One page of edge records, without reading the rest: {@link nodePage}, for edges, and
     * optionally only the edges at one node.
     * @param options - the window, the scope, the order and the node; every field optional
     * @returns the page, with the total and the revision it was read at
     * @throws A `GraphtyError` with `E_OPTION_RANGE` when `offset` or `limit` is not a whole
     *     number of zero or more; `E_UNKNOWN_RUN` for a column or sort naming a run this session
     *     does not hold; `E_UNKNOWN_ATTRIBUTE` for a field the run does not publish; `E_BAD_COMMAND`
     *     for a field that has no value per record of this kind.
     */
    edgePage(options: EdgePageOptions & { readonly columns: readonly ResultColumn[] }): RecordPage<EdgeRecord> & {
        /** The columns the page shows, one per asked-for result column. */
        readonly columns: readonly PageColumn[];
    };
    /**
     * One page of edge records, with no result columns.
     * @param options - the window, the scope, the order and the node; every field optional
     * @returns the page, with the total and the revision it was read at
     */
    edgePage(options?: EdgePageOptions): RecordPage<EdgeRecord>;
    /**
     * Compute the order a {@link nodePage} or {@link edgePage} read with the same options needs,
     * a slice at a time, handing the thread back between slices so the page stays responsive. Once
     * it settles, that page read returns at once; until then the orders already computed still
     * read at once, so a table can keep showing its old order while the new one is prepared. The
     * order is the one the page read would compute. An edit while it works starts it again.
     *
     * ```ts
     * const stop = new AbortController();
     * await session.data.preparePage("node", { sort: { key: "name" } }, {
     *     signal: stop.signal,
     *     onProgress: (fraction) => console.log(fraction),
     * });
     * const page = session.data.nodePage({ sort: { key: "name" }, limit: 30 }); // at once
     * ```
     * @param kind - `"node"` for {@link nodePage}, `"edge"` for {@link edgePage}
     * @param options - the scope, the order, the filters and the node; the window is ignored
     * @param control - a signal to stop it and a progress callback
     * @returns settles once the order is ready
     * @throws The signal's reason once it aborts; `E_UNKNOWN_RUN`, `E_UNKNOWN_ATTRIBUTE` or
     *     `E_BAD_COMMAND` as the page read would; `E_DISPOSED` once the session is disposed.
     */
    preparePage(kind: "node" | "edge", options?: EdgePageOptions, control?: PreparePageControl): Promise<void>;
    /**
     * The runs whose result a node or an edge page can show as a column with no field named: every
     * run, in the session's order, whose primary field holds one value per record of that kind.
     * Exactly the runs `nodePage({ columns: [run] })` or `edgePage(...)` accepts, so a table
     * offers its result columns without trying each run. A run still computing is listed; its
     * column comes back `pending`.
     * @param kind - `"node"` for {@link nodePage}, `"edge"` for {@link edgePage}
     * @returns one entry per run, in the order `session.runs.list()` returns them
     */
    resultColumns(kind: "node" | "edge"): readonly ResultColumnDescriptor[];
    /**
     * Each distinct neighbor of a node once, with the combined weight of the edges between them.
     *
     * A neighbor is exactly a node `selection.apply({ neighborsOf: [id], direction })` selects,
     * other than `id` itself: a self-loop never makes a node its own neighbor, and A->B with
     * B->A under `"all"` is one neighbor with `edgeCount` 2. `total` counts neighbors, not edges.
     * One walk of the node's adjacency, the order cached per revision.
     * @param id - the node; an integer id may be written either way, as {@link node} takes it
     * @param options - the direction, the weight, the scope, the order and the window
     * @returns the page, with what it measured and the revision it was read at
     * @throws A `GraphtyError` with `E_UNKNOWN_ELEMENT` (`details: { kind: "node", id }`) for an
     *     id the graph does not hold, `E_UNKNOWN_ATTRIBUTE` for a weight column no edge carries,
     *     and `E_OPTION_RANGE` for a bad `offset` or `limit`.
     */
    neighbors(id: NodeId, options?: NeighborOptions): NeighborPage;
    /**
     * What the last load did: which endpoint spelling the element resolved, how many repeated
     * edges it saw and what the policy did with them, and how many edges the graph actually holds.
     *
     * A door as well as the two load events, because those are fire-and-forget: a consumer that
     * subscribed after the load has no other way to ask.
     * @returns the report, or null when nothing has been loaded into this graph
     */
    lastImport(): LoadReport | null;
    /**
     * The weight the graph was loaded with: the edge column the last load read weights from and
     * the meaning chosen for it at load (`TableMapping.weightMeaning`), null when none was chosen.
     * @returns the weight, or null when the last load read no weight
     */
    loadedWeight(): LoadedWeight | null;
    /**
     * Where the graph was loaded from: the format, the name the reader knows the data by, the
     * URL, and the file's size. It follows undo and redo like the graph does, so a top bar that
     * names the dataset reads it again after either.
     * @returns the source, or null when the graph was not loaded by an import, or was cleared
     */
    source(): DataSourceDescriptor | null;
    /**
     * Every load still in the graph, oldest first: a replacing load starts the list again with
     * itself, a merging load adds itself to the end. Saved with the project and moved by undo
     * like the graph. The last entry is what {@link source} describes.
     *
     * ```ts
     * await session.data.import({ type: "csv", config: { data: friends }, name: "friends.csv" });
     * await session.data.import({ type: "csv", config: { data: messages }, name: "messages.csv" }, { mode: "merge" });
     * session.data.sources().map((each) => [each.name, each.added.edges]); // [["friends.csv", 41], ["messages.csv", 23]]
     * ```
     *
     * While the source-steps experiment is on, a staged source ({@link stage}) is no part of the
     * graph and is left out; {@link staged} lists it, and `staged: true` lists it here too.
     * @param options - What to list besides the loads in the graph.
     * @param options.staged - `true` lists staged sources too, in their place. Experimental (source-steps).
     * @returns the loads, or an empty list when no import loaded the graph
     * @since 3.30.0
     */
    sources(options?: { readonly staged?: boolean }): readonly LoadedSource[];
    /**
     * The staged sources ({@link stage}), oldest first: held, read by no step, and no part of the
     * graph until a step adds or joins them.
     *
     * ```ts
     * await session.data.stage({ type: "csv", config: { data: visitors }, name: "visitors.csv" });
     * session.data.staged().map((each) => each.name); // ["visitors.csv"]
     * session.data.sources().some((each) => each.name === "visitors.csv"); // false
     * ```
     * @returns The staged sources; empty while the source-steps experiment is off.
     * @experimental source-steps
     */
    staged(): readonly LoadedSource[];
    /**
     * Hold a source's rows without building anything from them: a staged source, which no step
     * reads, is saved and listed with `state: "staged"`. It is no undo step of its own: it joins the
     * step before it, and with no step before it, it is part of the state history starts from.
     * @param source - What `import` takes.
     * @param options - Its key, type, space and edge ends, and how to guess the ones left out.
     * @param options.guess - `"values"` also reads the values when no header names the key or the
     *   edge ends, as `prepare` does; `"names"` (the default) reads the headers only.
     * @returns The new source's id.
     * @throws A `GraphtyError` with `E_FEATURE_OFF` while the source-steps experiment is off.
     * @experimental source-steps
     */
    stage(source: DataSourceInput, options?: StageOptions): Promise<string>;
    /**
     * Every step the graph is built from, in order, with its counts in the committed build.
     * @returns The steps; empty while the source-steps experiment is off.
     * @experimental source-steps
     */
    steps(): readonly SourceStepRow[];
    /**
     * Every id space the graph holds nodes in.
     * @returns The spaces; empty while the source-steps experiment is off.
     * @experimental source-steps
     */
    spaces(): readonly SourceSpaceRow[];
    /**
     * The type registry.
     * @returns The declared types; empty while the source-steps experiment is off.
     * @experimental source-steps
     */
    types(): readonly SourceTypeEntry[];
    /**
     * Declare a type, or add rules to one already declared, as one undoable step.
     * @param entry - The type and its rules.
     * @returns Settles once the graph is rebuilt.
     * @throws A `GraphtyError` with `E_FEATURE_OFF` while the source-steps experiment is off.
     * @experimental source-steps
     */
    declareType(entry: SourceTypeEntry): Promise<void>;
    /**
     * The reader's own edits (the direct edits, `addNodes` and the rest), in the order made.
     * @returns The edits; empty while the source-steps experiment is off.
     * @experimental source-steps
     */
    edits(): readonly ReaderEditRow[];
    /**
     * Take back one of the reader's edits, as one undoable step.
     * @param id - The edit's id, from {@link edits}.
     * @returns Settles once the graph is rebuilt.
     * @throws A `GraphtyError` with `E_FEATURE_OFF` while the source-steps experiment is off.
     * @experimental source-steps
     */
    removeEdit(id: string): Promise<void>;
    /**
     * Settle a reader edit whose source moved under it after a refresh or replace (its
     * {@link edits} row reads `state: "source-changed"`, reported as `W_EDIT_SOURCE_CHANGED`), as
     * one undoable step: `"follow"` takes the picked source's new value (a pick only), `"keep"`
     * keeps the edit's value as the reader's own, `"drop"` takes the edit back.
     * @param id - The edit's id, from {@link edits}.
     * @param choice - Follow, keep or drop.
     * @returns Settles once the graph is rebuilt.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` for an unknown edit or `"follow"` on a typed
     *   edit, or `E_FEATURE_OFF` while the source-steps experiment is off.
     * @experimental source-steps
     */
    settleEdit(id: string, choice: SourceEditChoice): Promise<void>;
    /**
     * Resolve a step a refresh or replace held because a column it reads is gone (its
     * {@link steps} row lists `missing`), as one undoable step: `{ column }` names a column of the
     * new rows that takes the vanished name, so every step, rule and edit reading it keeps reading
     * it; `{ none: true }` clears a vanished weight, time or location role. The step is built
     * again once it misses nothing.
     * @param index - The step's place, from {@link steps}.
     * @param resolution - A column, or none.
     * @returns Settles once the graph is rebuilt.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` for a step that misses nothing or `none` for a
     *   column that is not a role, or `E_FEATURE_OFF` while the source-steps experiment is off.
     * @experimental source-steps
     */
    resolveStep(index: number, resolution: SourceStepResolution): Promise<void>;
    /**
     * The node a key names, as `{ space, key }`.
     * @param key - The key.
     * @param options - The space to look in; absent looks in every space.
     * @param options.space - The space.
     * @returns The reference, or null when no node holds the key.
     * @throws A `GraphtyError` with `E_AMBIGUOUS_ID` when nodes in several spaces hold it.
     * @experimental source-steps
     */
    ref(key: string, options?: { readonly space?: string }): SourceNodeRef | null;
    /**
     * The id space and key of a node in the graph, by its id: what a join on the node's type, or a
     * reader edit naming it, takes. The inverse of {@link SessionDataApi.ref}.
     *
     * ```ts
     * const at = session.data.nodeRef(session.selection.nodes[0]);
     * // { space: "person", key: "B1" }
     * ```
     * @param id - The node's id, as `nodes()` lists it.
     * @returns The reference, or null for an id no node holds.
     * @throws A `GraphtyError` with `E_FEATURE_OFF` while the source-steps experiment is off.
     * @experimental source-steps
     */
    nodeRef(id: NodeId): SourceNodeRef | null;
    /**
     * Merge: fold each node of a source into the node its field names, as one undoable step. A
     * staged source is added in its own space first. Its values meet the nodes' under `clash`
     * (default `"keep"`).
     * @param options - The source and field, the nodes they fold into, and the choices.
     * @returns Settles once the graph is rebuilt.
     * @throws A `GraphtyError` with `E_STEP_NEEDS_NODES` for a source with no node rows, or
     * `E_AMBIGUOUS_ID` when the field names no one set of nodes.
     * @experimental source-steps
     */
    merge(options: SourceMergeOptions): Promise<void>;
    /**
     * Make an edge: each node row of a source becomes an edge between its node and the node its
     * field names, as one undoable step. A staged source is added first: the source of the rows
     * in its own space, the source named by `into` as `add` adds it.
     * @param options - The source and field, the nodes they name, the direction and edge type.
     * @returns The part the new edges are keyed by (`<part>/<key>`).
     * @throws A `GraphtyError` with `E_STEP_NEEDS_NODES`, `E_AMBIGUOUS_ID`, or `E_JOIN_SPACE_SAME`
     * when the staged source would land in the space it connects to.
     * @experimental source-steps
     */
    connect(options: SourceConnectOptions): Promise<number>;
    /**
     * Extract: one column of an edge source becomes nodes, joined to one end by new edges (one per
     * end pair), as one undoable step.
     * @param source - The edge source.
     * @param options - The column, its space and types, and columns to move onto the new nodes.
     * @returns The part the new edges are keyed by.
     * @experimental source-steps
     */
    extract(source: SourceKey, options: SourceExtractOptions): Promise<number>;
    /**
     * Move columns of an edge source onto the nodes at one end, as one undoable step.
     * @param source - The edge source.
     * @param options - The columns and where they go.
     * @returns Settles once the graph is rebuilt.
     * @experimental source-steps
     */
    moveColumns(source: SourceKey, options: SourceMoveColumnsOptions): Promise<void>;
    /**
     * Take one source's value for a cell where sources disagree: a reader edit that names the
     * source picked, as one undoable step.
     * @param ref - The element.
     * @param column - The column.
     * @param source - The source whose value to take.
     * @returns Settles once the graph is rebuilt.
     * @throws A `GraphtyError` with `E_EDIT_ROLE_COLUMN` for a column a key, role or step reads, or
     * `E_BAD_COMMAND` when the source holds no value there.
     * @experimental source-steps
     */
    pick(ref: SourceElementRef, column: string, source: SourceKey): Promise<void>;
    /**
     * Use one source's value for a cell: the same reader edit as {@link SessionDataApi.pick}.
     * @param ref - The element.
     * @param column - The column.
     * @param source - The source whose value to use.
     * @returns Settles once the graph is rebuilt.
     * @experimental source-steps
     */
    use(ref: SourceElementRef, column: string, source: SourceKey): Promise<void>;
    /**
     * Delete one step, as one undoable step; a source no step reads any more is staged again.
     * @param index - The step's place, as `steps()` lists it.
     * @returns Settles once the graph is rebuilt.
     * @experimental source-steps
     */
    removeStep(index: number): Promise<void>;
    /**
     * Turn one step off or back on, as one undoable step. An off step is kept, listed (`off` on its
     * `steps()` row) and saved, but builds nothing; turning it on builds it again, and a source
     * whose only steps were off is then listed as built. A staged joined table reopens from a saved
     * project as its join's steps, off: turning them on commits the join.
     *
     * ```ts
     * const at = session.data.steps().findIndex((s) => s.off);
     * await session.data.setStepOff(at, false); // build it
     * ```
     * @param index - The step's place, as `steps()` lists it.
     * @param off - True to turn it off, false to turn it on.
     * @returns Settles once the graph is rebuilt.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` when no step is at `index`.
     * @experimental source-steps
     */
    setStepOff(index: number, off: boolean): Promise<void>;
    /**
     * Add a staged source to the graph with its own `join.add`, as one undoable step. Keys that meet
     * nodes another source built in its space are reported on its `data.sources()` entry
     * (`W_SPACE_OVERLAP`) and kept in its own space unless `overlap` is `"merge"`.
     * @param source - The staged source.
     * @param options - What a key overlap does.
     * @param options.overlap - `"separate"` (default) or `"merge"`.
     * @returns Settles once the graph is rebuilt.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` (`details.reason` `"not-staged"`) for a source a step already reads.
     * @experimental source-steps
     */
    add(source: SourceKey, options?: { readonly overlap?: "separate" | "merge" }): Promise<void>;
    /**
     * Open a draft of the sources and steps: the same acts as these doors, applied to a copy until
     * its `commit()`, which records them as one undoable step. See {@link SourceDraft}.
     * @param options - Whether its adds ask the key-overlap question; see {@link SourceDraftOptions}.
     * @returns The draft.
     * @throws A `GraphtyError` with `E_DRAFT_OPEN` while another draft is open, or `E_FEATURE_OFF`
     *   while the source-steps experiment is off.
     * @experimental source-steps
     */
    draft(options?: SourceDraftOptions): SourceDraft;
    /**
     * The draft open now.
     * @returns It, or null when none is open.
     * @throws A `GraphtyError` with `E_FEATURE_OFF` while the source-steps experiment is off.
     * @experimental source-steps
     */
    currentDraft(): SourceDraft | null;
    /**
     * Live match counts of two fields, from hashing both columns, building nothing (design 5.2):
     * what a join card shows before a Merge or Make an edge is chosen. Side 1 is `into` (with
     * `{ space }`, or a source's key, the keys the graph's nodes in that space hold now), side 2
     * the incoming field.
     *
     * ```ts
     * const c = session.data.matchCounts({
     *     from: { source: accounts, field: "account_id" },
     *     into: { space: "account" },
     * });
     * // { matched: 2, only1: 1, only2: 1, repeated1: 0, repeated2: 0, ... }
     * ```
     * @param pair - The two fields.
     * @param options - Whether case and spaces count.
     * @returns The counts.
     * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for an unknown source, `E_AMBIGUOUS_ID` when
     *   `into` names no one end of an edge source, or `E_FEATURE_OFF` while the source-steps
     *   experiment is off.
     * @experimental source-steps
     */
    matchCounts(pair: SourceMatchPair, options?: SourceMatchOptions): SourceMatchCounts;
    /**
     * The value-overlap list of two fields: each value either side holds, with how many rows of
     * each hold it, building nothing (design 5.2).
     * @param pair - The two fields, as `matchCounts` takes them.
     * @param options - Which values, which page, and whether case and spaces count.
     * @returns The page and the total.
     * @throws As `matchCounts`.
     * @experimental source-steps
     */
    matchValues(pair: SourceMatchPair, options?: SourceMatchValuesOptions): SourceMatchValues;
    /**
     * One source's rows as read, staged or built: its tables and one column's profile, building
     * nothing (design 5.1, 5.2).
     * @param source - The source, by the key `sources()` lists it with.
     * @returns The table.
     * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` for an unknown source, or `E_FEATURE_OFF`
     *   while the source-steps experiment is off.
     * @experimental source-steps
     */
    sourceTable(source: SourceKey): SourceTable;
    /**
     * The profile of the keys of the nodes one id space holds: the join card's Key field.
     * @param options - The space.
     * @param options.space - The space, as `spaces()` names it.
     * @returns The profile; every count 0 for a space no node lives in.
     * @throws A `GraphtyError` with `E_FEATURE_OFF` while the source-steps experiment is off.
     * @experimental source-steps
     */
    profile(options: { readonly space: SourceSpaceName }): SourceColumnProfile;
    /**
     * Change what a staged source's rows are and are for -- nodes, edges or both, its key, space,
     * type, edge ends and roles --
     * outside a draft (design 5.1). A type picked writes its whole-source or end rule at once.
     * Like staging, it is no undo step of its own: it joins the step before it.
     *
     * ```ts
     * const visitors = await session.data.stage(visitorsCsv);
     * await session.data.setMapping(visitors, { nodes: { key: "badge" }, type: "person" });
     * ```
     * @param source - The staged source.
     * @param patch - The change.
     * @returns Settles once it is recorded.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` (`details.reason` `"not-staged"`) for a source a
     *   step reads, `"no-nodes"` or `"no-edges"` for roles of a table it does not hold, `"no-ends"`
     *   for edge rows with no column for an end, `"many-tables"` for `rows` on a source that read
     *   more than one table; `E_UNKNOWN_ATTRIBUTE` (`details` `{ source, column, table }`) for a
     *   column its rows do not hold; `E_LOAD_UNKNOWN`, `E_SPACE_RESERVED`, `E_DRAFT_OPEN` while a
     *   draft is open, or `E_FEATURE_OFF` while the source-steps experiment is off.
     * @experimental source-steps
     */
    setMapping(source: SourceKey, patch: SourceMappingPatch): Promise<void>;
    /**
     * Where one node or edge came from.
     * @param ref - The element.
     * @returns Its lineage, or null when no element answers the reference.
     * @experimental source-steps
     */
    lineage(ref: SourceElementRef): SourceLineage | null;
    /**
     * Every source's value for one cell, and the one shown.
     * @param ref - The element.
     * @param column - The column.
     * @returns The values, or null when no element answers the reference.
     * @experimental source-steps
     */
    values(ref: SourceElementRef, column: string): SourceCellValues | null;
    /**
     * What one cell holds.
     * @param ref - The element.
     * @param column - The column.
     * @returns Its state, or null when no element answers the reference.
     * @experimental source-steps
     */
    cell(ref: SourceElementRef, column: string): SourceCellState | null;
    /**
     * The cells where supplying sources hold different values.
     * @param query - Which cells.
     * @returns The conflicts, nodes first, in build order.
     * @experimental source-steps
     */
    conflicts(query?: SourceConflictQuery): readonly SourceConflict[];
    /**
     * What is wrong with the data now: a number column holding "N/A", decimal commas, padded
     * values, two spellings of one value, edges naming a node no node row gave, repeated edges,
     * node rows repeating an id, rows refused for a blank id, rows the reader could not read.
     * Each issue is a neutral fact -- a code, a count, params -- with the fixes
     * {@link SessionDataApi.fix} takes for it. An issue with a zero count is never listed, and an
     * ignored one only with `includeIgnored`.
     *
     * ```ts
     * await session.data.import({ type: "csv", config: { data: transfers } });
     * for (const issue of session.data.issues()) {
     *     console.log(issue.code, issue.column?.name, issue.count, issue.fixes);
     * }
     * // "decimal-comma" "amount" 3 ["read-decimal-comma"]
     * ```
     * @param options - which issues
     * @param options.includeIgnored - list the ignored issues too, each with `ignored: true` and
     *     `status: "ignored"` (default false)
     * @param options.includeFixed - list the issues `data.fix` settled too, after the rest, each with
     *     `status: "fixed"` and `fixedBy`, as they stood then (default false)
     * @param options.source - list only this load's issues
     * @returns the issues, those a load saw first
     * @since 3.30.0
     */
    issues(options?: {
        readonly includeIgnored?: boolean;
        readonly includeFixed?: boolean;
        readonly source?: SourceKey;
    }): readonly DataIssue[];
    /**
     * Apply one of an issue's fixes, as one undoable step: `session.undo()` puts the data back.
     *
     * ```ts
     * const commas = session.data.issues().find((issue) => issue.code === "decimal-comma");
     * if (commas) await session.data.fix(commas, "read-decimal-comma"); // "12,5" becomes 12.5
     * ```
     * @param issue - the issue, or its id
     * @param fix - one of the issue's `fixes`, or its `current` fix, which changes no data and
     *     only marks the issue fixed
     * @returns how many nodes and edges the fix changed, kept or removed
     * @throws A `GraphtyError` with `E_BAD_COMMAND`: `details.reason` `"unknown-issue"` for an
     *     issue the data does not have now (`details.known`), `"unknown-fix"` for a fix the issue
     *     does not take (`details.fixes`).
     * @since 3.30.0
     */
    fix(issue: IssueId | Pick<DataIssue, "id">, fix: FixCode): Promise<FixResult>;
    /**
     * Ignore an issue, or list it again with `false`, as one undoable step saved with the
     * project. An ignored issue keeps its id, so it stays ignored through fixes, undo and a
     * reload; {@link SessionDataApi.issues} lists it only with `includeIgnored`.
     * @param issue - the issue, or its id
     * @param ignored - true (the default) to ignore, false to list it again
     * @returns settles once the step is recorded; nothing is recorded when nothing changes
     * @throws A `GraphtyError` with `E_BAD_COMMAND` (`details.reason: "unknown-issue"`) when
     *     ignoring an issue the data does not have now.
     * @since 3.30.0
     */
    ignoreIssue(issue: IssueId | Pick<DataIssue, "id">, ignored?: boolean): Promise<void>;
    /**
     * Ignore several issues, or list them again with `false`, as ONE undoable step saved with
     * the project: what an "ignore all" reads. Issues already in the state asked for are skipped.
     *
     * ```ts
     * await session.data.ignoreIssues(session.data.issues());
     * ```
     * @param issues - the issues, or their ids
     * @param ignored - true (the default) to ignore, false to list them again
     * @returns settles once the step is recorded; nothing is recorded when nothing changes
     * @throws A `GraphtyError` with `E_BAD_COMMAND` (`details.reason: "unknown-issue"`) when
     *     ignoring an issue the data does not have now; nothing is ignored then.
     * @since 3.37.0
     */
    ignoreIssues(issues: readonly (IssueId | Pick<DataIssue, "id">)[], ignored?: boolean): Promise<void>;
    /**
     * Give the source the graph was loaded from a new name, as one undoable step: what
     * {@link source} reports as `name` from then on. The name is saved with the project, and undo
     * restores the old one.
     *
     * ```ts
     * await session.data.renameSource("Les Miserables characters");
     * session.data.source()?.name; // "Les Miserables characters"
     * ```
     * With a key, it renames that load of {@link SessionDataApi.sources} instead of the newest
     * (`renameSource("ships.csv", "s1")`); {@link source} follows only when it is the newest.
     * @param name - the new name; not empty
     * @param key - the load to rename (since 3.30.0); the newest when absent
     * @returns settles once the step is recorded
     * @throws A `GraphtyError` with `E_BAD_COMMAND` (`details.reason` `"no-source"`) when no
     *     source is loaded, and (`"empty-name"`) for an empty name, and `E_SOURCE_UNKNOWN` for a
     *     key `sources()` does not list.
     */
    renameSource(name: string, key?: SourceKey): Promise<void>;
    /**
     * The loads that supplied one node or edge, oldest first: every load whose rows named it, so
     * a node two files both list answers with both keys. Empty for an element the graph does not
     * hold, or one no load recorded (added with `addNodes`, or saved before loads had keys).
     *
     * ```ts
     * await session.data.import({ type: "csv", config: { data: people }, name: "people.csv" });
     * await session.data.import({ type: "csv", config: { data: more }, name: "more.csv" }, { mode: "merge" });
     * session.data.sourcesOf("alice"); // ["s1", "s2"] when both files list alice
     * ```
     * @param id - The node id, or the edge id with `kind: "edge"`.
     * @param options - Which kind of element the id names.
     * @param options.kind - `"node"` (the default) or `"edge"`.
     * @returns The keys, as {@link LoadedSource.key} has them.
     * @since 3.30.0
     */
    sourcesOf(id: NodeId | EdgeId, options?: { readonly kind?: "node" | "edge" }): readonly SourceKey[];
    /**
     * Take one load out of the graph, as one undoable step: the nodes and edges only it supplied
     * go, with the edges attached to a node that goes, and the load leaves `sources()`. A node or
     * edge another load also supplied stays, as does anything no load recorded. Removing a joined
     * table takes its join back: the values it wrote go and the values it overwrote come back.
     *
     * ```ts
     * const removed = await session.data.removeSource("s2");
     * removed.removed.nodes; // nodes only s2 supplied
     * removed.kept.nodes; // s2's nodes another load also supplied
     * ```
     * @param key - The load's key, from {@link SessionDataApi.sources}.
     * @returns How many nodes and edges went and stayed.
     * @throws A `GraphtyError` (as a rejection) with `E_LOAD_UNKNOWN` for a key `sources()` does not list.
     * @since 3.30.0
     */
    removeSource(key: SourceKey): Promise<RemoveSourceResult>;
    /**
     * Replace one load with a newer copy of it, as one undoable step. Nodes match by id and edges
     * by their two ends; what the copy no longer has goes (unless another load also supplied it),
     * what it changed takes the new values, and what it adds arrives. Style layers, runs, filters,
     * joins, the column settings and the load's key all stay; the load moves to the end of
     * `sources()`, as the newest. One undo brings the earlier data back.
     *
     * Once it is in, it publishes `source:loaded` for the load, under its key, with `mode: "merge"`,
     * `replaced: "replaceSource"` and the `callerKey` given in `choices`; the journal entries of the
     * commands it ran carry `trigger: "load"` and that key, and its returned report says what
     * changed.
     *
     * ```ts
     * const key = await session.data.matchesSource({ config: { file } });
     * if (key !== null) {
     *     const report = await session.data.replaceSource(key, { config: { file } });
     *     report.edges; // { added: 12, removed: 3, changed: 40 }
     * }
     * ```
     * @param key - The load's key, from {@link SessionDataApi.sources}.
     * @param source - The newer copy, as `import` takes it. A network source (`source: "<id>"`) is read with the options below and replaces the load under the
     *     same key and name; with no credential given, the one remembered for the endpoint is used.
     *     See {@link SessionDataApi.sourceSettings} for what such a load holds now.
     * @param choices - How to read it, as `draft.load` takes them; `mode` is ignored. For a network
     *     source, the same load options `import` takes (`endpoint`, `limits`, `credential`, `signal`).
     * @returns What was added, removed and changed, and what no longer matches anything.
     * @throws A `GraphtyError` (as a rejection) with `E_SOURCE_UNKNOWN` for a key `sources()` does not list.
     * @since 3.30.0
     */
    replaceSource(
        key: SourceKey,
        source: DataSourceInput,
        choices?: LoadChoices & SourceLoadOptions,
    ): Promise<ReplaceReport>;
    /**
     * Read one load again from what it was read from, with changed choices -- another id, source
     * or target column, the kinds of its ends, kept or scoped ids -- as one undoable step that
     * keeps everything else, as {@link SessionDataApi.replaceSource} does. The choices are laid
     * over the ones the load was read with (`LoadedSource.choices`); a mapping key set to `null`
     * goes back to the element's own reading. Only a load this session read itself can be read
     * again (`LoadedSource.reloadable`): what a file was is never saved in a project. Once it is
     * in, it publishes `source:loaded` with `replaced: "reloadSource"`, as `remap` does.
     *
     * ```ts
     * const [log] = session.data.sources();
     * if (log.reloadable === true) {
     *     await session.data.reloadSource(log.key, { mapping: { sourceKind: "user", targetKind: "host" } });
     * }
     * ```
     * @param key - The load's key, from {@link SessionDataApi.sources}.
     * @param choices - What to change, as `draft.load` takes it; `mode` and `join` are ignored.
     * @returns What was added, removed and changed, and what no longer matches anything.
     * @throws A `GraphtyError` (as a rejection) with `E_SOURCE_UNKNOWN` for a key `sources()` does
     *     not list, and `E_UNSUPPORTED` (`details.reason: "not-reloadable"`) for a load this session
     *     did not read itself.
     * @since 3.30.0
     */
    reloadSource(key: SourceKey, choices: LoadChoices): Promise<ReplaceReport>;
    /**
     * Change which columns play which role -- the node id, an edge's source or target, the label,
     * the weight -- after a load, as one undoable step. The rows the load read are read again
     * under the new mapping, with no file picked or URL fetched: a new id column makes the nodes
     * anew and the edges find their ends among them, and everything else (style layers, runs,
     * filters, the load's key) stays, as {@link SessionDataApi.reloadSource} keeps it. A run whose
     * numbers came from the old graph reads as stale (`run.stale`); nothing is run again. One undo
     * brings back the old mapping and the old graph.
     *
     * ```ts
     * await session.data.remap({ mapping: { tables: { nodes: { key: "email" } } } });
     * ```
     * @param options - The mapping, as a load takes it, laid over the one the load was read with,
     *     and which load (the only one when absent).
     * @returns What was added, removed and changed, and what no longer matches anything.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` (`details.reason`:
     *     `"no-mapping"`, `"which-source"` with `details.known` when the graph holds more than one
     *     load and none is named, or a role the table's rows cannot have), `E_UNKNOWN_ATTRIBUTE`
     *     for a column the table does not have, `E_EDGE_ENDPOINTS_UNRESOLVED` for an edge table
     *     left without an end, `E_SOURCE_UNKNOWN` for a key `sources()` does not list, and
     *     `E_UNSUPPORTED` (`details.reason: "not-reloadable"`) for a load this session did not
     *     read itself (`LoadedSource.reloadable`), such as one in a project opened from a file.
     * @since 3.54.0
     */
    remap(options: RemapOptions): Promise<ReplaceReport>;
    /**
     * What this session read a load from, as `import` and `prepare` took it (the file itself, or
     * the text), so an application can read the load again into a draft, such as to show its rows
     * and change its roles. Only a load this session read itself has one
     * (`LoadedSource.reloadable`): what a file was is never saved in a project.
     *
     * ```ts
     * const [first] = session.data.sources();
     * const input = session.data.sourceInput(first.key);
     * if (input !== undefined) {
     *     const draft = await session.data.prepare(input);
     *     draft.tables[0].columns; // the load's columns, as it read them
     * }
     * ```
     * @param key - The load's key, from {@link SessionDataApi.sources}.
     * @returns What the load was read from, or undefined for a load this session did not read.
     * @since 3.47.0
     */
    sourceInput(key: SourceKey): DataSourceInput | undefined;
    /**
     * How a project save keeps each load: as a copy (its rows inside the file, the default) or as
     * a reference (where to read it again; an open reads the rows again). One entry per load, in
     * {@link SessionDataApi.sources} order. A load that cannot be a reference carries `refused`.
     * With the `source-references` experiment off every entry is a copy and a save writes every
     * load as a copy, as before the experiment, even in a project opened from a file that held
     * references (the open still reads them again, so the graph is whole); only a reference the
     * open could not read is written back as it was, so nothing is lost.
     * @example
     * ```ts
     * for (const each of session.data.copies()) {
     *     console.log(each.source, each.copy, each.refused?.params.reason);
     * }
     * ```
     * @returns The entries; empty when no load is in the graph.
     * @since 3.58.0
     */
    copies(): readonly SourceCopy[];
    /**
     * Choose how a project save keeps one load. Not a step: like `save({ assets })`, it is a save
     * choice, kept with the project (autosave included), and it marks the project unsaved.
     * Reference on a load that cannot be one keeps it a copy and returns the entry with
     * `refused`; nothing is thrown. Publishes `source:copy` when the choice changes.
     * Experimental: needs the `source-references` experiment.
     * @experimental source-references
     * @example
     * ```ts
     * const session = createGraphSession({ features: ["source-references"] });
     * await session.data.import({ type: "json", config: { url: "https://example.com/graph.json" } });
     * const [load] = session.data.sources();
     * session.data.setCopy(load.key, "reference");
     * const saved = await session.project.save(); // the rows are read again on open
     * ```
     * @param source - The load's key, from {@link SessionDataApi.sources}.
     * @param copy - `"copy"` or `"reference"`.
     * @returns The load's entry after the choice.
     * @throws A `GraphtyError` with `E_SOURCE_UNKNOWN` for a key no load has, and `E_FEATURE_OFF`
     *     (`{ feature: "source-references", key: "setCopy" }`) while the experiment is off.
     * @since 3.58.0
     */
    setCopy(source: SourceKey, copy: SourceCopyChoice): SourceCopy;
    /**
     * The load whose rows carry the same columns as a file's header (in any order), newest
     * first: the load a dropped file is most likely a newer copy of. Reads the file; loads nothing.
     * @param source - The file, as `import` takes it.
     * @returns The load's key, or null when none matches or the file is a graph file with no header.
     * @since 3.30.0
     */
    matchesSource(source: DataSourceInput): Promise<SourceKey | null>;
    /**
     * Every attribute the graph's records carry, with its type, what it measures, how complete
     * it is and a few sample values. Walked once per revision and cached.
     * @param options - Under the `source-steps` experiment, only the columns one source gave a
     *     value for (its clash columns included) or the elements of one type carry; see
     *     {@link SourceElementsFilter}. Absent, every column.
     * @returns the descriptors, node attributes first, each kind in first-seen order
     * @throws A `GraphtyError` with `E_FEATURE_OFF` when `options` names a source or a type while
     *     the experiment is off.
     */
    attributes(options?: SourceElementsFilter): readonly AttributeDescriptor[];
    /**
     * Every value a rule or a binding can read, in one list: the node id, every data column and
     * every field a finished run published per element. Each entry carries its path (what a rule
     * leaf or a binding's `by` names), its catalog name, its kind (number, category, text or
     * yes-no), its range or its value count, and the kinds of channel it can drive. A field that
     * does not exist on this graph is left out: no incoming or outgoing connections on an
     * undirected graph. A partition's group is a category, so a picker never draws a histogram of
     * group ids. Any number in the list can rank a "top N" rule.
     *
     * ```ts
     * const numbers = session.data.readableValues().filter((value) => value.kind === "number");
     * await session.styles.add({
     *     name: "Top 10",
     *     target: "node",
     *     selector: { match: "rule", where: { kind: "threshold", path: numbers[0].path, top: 10 } },
     *     set: { "node.color": "#d62728" },
     * });
     * ```
     * @returns the values, the node id first, then the data columns, then each run's fields in
     *     run order
     * @since 3.26.0
     */
    readableValues(): readonly ReadableValue[];
    /**
     * The values every node carries from the graph's structure, which a rule reads with no run
     * and no column, each with its catalog name: `graphty.degree` ("Degree"), and on a directed
     * graph `graphty.inDegree` ("In-degree") and `graphty.outDegree` ("Out-degree"). A rule
     * written by `selection.checkRule`'s suggestion may read one, so an application can name it
     * as its panels do.
     *
     * ```ts
     * const names = new Map(session.data.structureValues().map((each) => [each.path, each.plainName]));
     * names.get("graphty.degree"); // "Degree"
     * ```
     * @returns the values this graph answers, degree first
     * @since 3.35.0
     */
    structureValues(): readonly StructureValue[];

    /**
     * One node's structure value, as a column of a table reads it.
     * @param id - The node.
     * @param path - A path {@link SessionDataApi.structureValues} lists (`graphty.degree`).
     * @param options - Where to measure.
     * @param options.scope - `"visible"` measures among what the filter and the time window leave
     *     shown, where a hidden node has no value; `"graph"` the whole graph. Default `"graph"`, or the
     *     working graph (what the filters leave shown, the time window aside) while the session's
     *     `workingGraph` option is on (since 3.40.0).
     * @returns The value, or undefined for an unknown node or a path that is no structure value.
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     * @example
     * const degree = session.data.structureValue("Valjean", "graphty.degree");
     */
    structureValue(id: NodeId, path: Path, options?: { readonly scope?: "graph" | "visible" }): number | undefined;
    /**
     * Say what a column measures, as one undoable step in the `"attributes"` project slice.
     *
     * The element infers strings and booleans as categorical and numbers as quantitative, so a
     * column of number codes (department 1 to 14) is drawn as a ramp until it is declared
     * categorical. A declaration affects layers created afterwards: a layer that already exists
     * keeps the binding it stored.
     *
     * ```ts
     * const department = session.data.attributes().find((a) => a.kind === "node" && a.name === "department")!;
     * await session.data.declare(department, { measurement: "categorical" });
     * await session.data.declare({ kind: "node", name: "risk" }, { measurement: "ordinal", order: ["low", "high"] });
     * ```
     * @param column - the column; an attribute descriptor can be passed as it is
     * @param declaration - what it measures; an ordinal column lists its values, lowest first
     * @returns settles once the step is recorded
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` (with `details.candidates`) for a column
     *     no record carries, and `E_BAD_COMMAND` for a declaration that is not one.
     */
    declare(column: ColumnRef, declaration: MeasurementDeclaration): Promise<void>;
    /**
     * Give a column a role -- the node label, the edge weight, an edge's source -- or take every
     * role it plays away with `null`, as one undoable step. A role is written to the data
     * configuration (`data.knownFields`), so a kind has one column per role: giving it to this
     * column takes it from the one that had it. The roles that make the rows -- `key` for nodes,
     * `source`, `target` and `edgeId` for edges -- are read when the rows load, so giving one to
     * another column while rows of that kind are loaded is refused: load them again with the
     * choice (`LoadDraft.load({ mapping })`). `null` never takes `key` away, since every node has
     * an id.
     *
     * ```ts
     * await session.data.setRole({ kind: "node", name: "title" }, "label");
     * await session.data.setRole({ kind: "edge", name: "confidence" }, "weight");
     * ```
     * @param column - the column; an attribute descriptor can be passed as it is
     * @param role - the role, or null for none
     * @param options - Under the `source-steps` experiment, which source's role it is; see
     *     {@link SourceRoleOptions}.
     * @returns settles once the step is recorded
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` for a column no record carries,
     *     `E_BAD_COMMAND` (`details.reason: "role-kind"`, with `details.roles`) for a role the
     *     column's kind has no field for, and `E_UNSUPPORTED` (`details.reason: "reload"`) for
     *     `key`, `source`, `target` or `edgeId` on rows already loaded. Under the `source-steps`
     *     experiment, `E_ROLE_TARGET_AMBIGUOUS` (`details.sources`) for a weight or time role that
     *     names no source while several built sources carry the column and can carry the role.
     * @since 3.30.0
     */
    setRole(column: ColumnRef, role: ColumnRole | null, options?: SourceRoleOptions): Promise<void>;
    /**
     * The column the element would read a role from, when one is obvious: what to offer before
     * a reader picks one for {@link SessionDataApi.setRole}. Changes nothing. Only a column with
     * no role yet, not hidden and not made by a run or a formula is offered.
     *
     * - `time`: the column whose values read as time best (`session.time.candidates()`).
     * - `label`: the first of `label`, `Label`, `name`, `Name`, `title` and `Title` holding text,
     *   as a load names its nodes.
     * - `weight`, for edges: as a load reads one -- a number column named `confidence`, `score`
     *   or `strength`, else the only number column that does not read as time; null when there
     *   are several. Nodes: null, as a load reads no node weight.
     * - Any other role (`key`, `source`, `target`, `edgeId`, `kind` and the location kinds, which
     *   `session.layout.locationColumns()` detects): null.
     *
     * ```ts
     * const column = session.data.roleCandidate("edge", "time"); // "released"
     * if (column !== null) {
     *     await session.data.setRole({ kind: "edge", name: column }, "time");
     * }
     * ```
     * @param kind - nodes or edges
     * @param role - the role
     * @returns the column's name, or null when no column is obvious
     * @since 3.40.0
     */
    roleCandidate(kind: "node" | "edge", role: ColumnRole): string | null;
    /**
     * What converting a column to a type would do: how many values convert and how many become
     * blank, with examples. Changes nothing.
     *
     * ```ts
     * const preview = session.data.previewType({ kind: "node", name: "amount" }, "number");
     * preview.fails; // 1, the "N/A"
     * ```
     * @param column - the column
     * @param type - the type
     * @returns the preview
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` for a column no record carries, and
     *     `E_BAD_COMMAND` for a type that is not one.
     * @since 3.30.0
     */
    previewType(column: ColumnRef, type: ValueType): TypeChangePreview;
    /**
     * Convert a column's values to a type, as one undoable step: what
     * {@link SessionDataApi.previewType} says, with the values that do not convert made blank.
     * The column's descriptor then reports the type (`date` reads `"time"`), saved with the project.
     * @param column - the column
     * @param type - the type
     * @returns settles once the step is recorded
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` for a column no record carries, and
     *     `E_BAD_COMMAND` for a type that is not one.
     * @since 3.30.0
     */
    setType(column: ColumnRef, type: ValueType): Promise<void>;
    /**
     * Give a column a new name, as one undoable step. Every record's value moves to the new key,
     * and what read the old name follows it: style layer selectors and bindings, the filter, the
     * filter steps and the time window, the roles, the declaration, the value names and the
     * hidden flag; a finished run that weighed its edges by it lists under the new name in
     * `usedBy`. Kept sets are not rewritten.
     * @param column - the column
     * @param name - its new name, not one another column of the kind has
     * @returns settles once the step is recorded; the same name changes nothing
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` for a column no record carries, and
     *     `E_BAD_COMMAND` (`details.reason` `"empty-name"` or `"name-taken"`) for a name it cannot take.
     *     With `options.source` (the source-steps experiment): `E_EDIT_ROLE_COLUMN` for a column a
     *     key, role, type rule or step reads.
     * @param options - With the source-steps experiment on, `source` renames the column in that
     *     source only: its rows' working name, its steps' columns, rules and filters, and reader
     *     edits on cells no other source fills (experimental).
     * @param options.source - The source whose column to rename.
     * @since 3.30.0
     */
    renameColumn(column: ColumnRef, name: string, options?: { readonly source?: SourceKey }): Promise<void>;
    /**
     * Add a computed column, as one undoable step: every node (or edge) gets the value an
     * expression reads, in the expression language of selectors and filters, from its other
     * columns and from finished runs' results. The values follow their inputs: an edit, a load, a
     * run finishing or a run removed brings them up to date in that same step. The project saves
     * the expression, not the values, and works them out again on open. Undo takes the column away.
     *
     * ```ts
     * await session.data.derive("display", "data.nickname || data.name");
     * session.data.node("ada")?.display; // the nickname, or the name when there is none
     * ```
     * Deriving a computed column's name again replaces its expression.
     * @param name - the column's name; not a name one of the kind's other columns has
     * @param expression - what each value is, such as `data.age >= \`18\``
     * @param options - nodes or edges; nodes by default
     * @returns settles once the step is recorded
     * @throws A `GraphtyError` with `E_BAD_SELECTOR` for an expression that does not parse,
     *     `E_UNKNOWN_ATTRIBUTE` (`details.paths`) for one that reads a value nothing answers, and
     *     `E_BAD_COMMAND` (`details.reason` `"empty-name"`, `"name-taken"` or `"reads-itself"`) for
     *     a name it cannot take.
     */
    derive(name: string, expression: Query, options?: DeriveOptions): Promise<void>;
    /**
     * Add a score: a computed column that combines numeric columns, such as two runs' results,
     * into one number per node (or edge). Each term's values are rescaled to 0..1 (the smallest
     * value becomes 0, the largest 1; a column whose values are all the same counts 0) and the
     * score is the sum of each rescaled value times its weight. A node missing a number for any
     * term scores `null`. Like {@link SessionDataApi.derive} it is one undoable step, the values
     * follow their inputs (a run run again rescales), and it reads at `data.<name>`, so a style
     * layer, a filter or a table shows it like any column.
     *
     * ```ts
     * const degree = await session.runs.run("degree");
     * const between = await session.runs.run("betweenness");
     * await session.data.deriveScore("importance", [
     *     { path: resultPath(degree.id, "value"), weight: 0.4 },
     *     { path: resultPath(between.id, "value"), weight: 0.6 },
     * ]);
     * ```
     * Deriving a computed column's name again replaces it.
     * @param name - the column's name; not a name one of the kind's other columns has
     * @param terms - the columns and their weights; at least one
     * @param options - nodes or edges; nodes by default
     * @returns settles once the step is recorded
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` (`details.paths`) for a path nothing
     *     answers, and `E_BAD_COMMAND` (`details.reason` `"empty-name"`, `"name-taken"`,
     *     `"reads-itself"`, `"no-terms"` or `"bad-weight"`) for a name or terms it cannot take.
     * @since 3.57.0
     */
    deriveScore(name: string, terms: readonly ScoreTerm[], options?: DeriveOptions): Promise<void>;
    /**
     * Every computed column, in the order {@link SessionDataApi.derive} added them.
     * @returns the columns
     */
    derivedColumns(): readonly DerivedColumn[];
    /**
     * Hide columns, or show them again, as one undoable step saved with the project. A hidden
     * column keeps its values and reads `hidden: true` in {@link SessionDataApi.attributes}; what a
     * consumer leaves out for it (a table, a field list) is the consumer's choice.
     *
     * ```ts
     * const others = session.data.attributes().filter((a) => a.kind === "node" && a.name !== "holder");
     * await session.data.setHidden(others, true); // hide others
     * ```
     * The node id (`{ kind: "node", name: "id" }`) and the edge ends (`"source"`, `"target"`) can
     * be hidden too when no column carries them, as after a graph file; {@link
     * SessionDataApi.hiddenColumns} lists them.
     * @param columns - the columns
     * @param hidden - true to hide, false to show
     * @returns settles once the step is recorded; nothing is recorded when nothing changes
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` for a column no record carries.
     * @since 3.30.0
     */
    setHidden(columns: readonly ColumnRef[], hidden: boolean): Promise<void>;
    /**
     * Every hidden column, the node id and the edge ends included: what `setHidden` hid and has not
     * shown again, saved with the project.
     * @returns the columns, in the order they were hidden
     * @since 3.30.0
     */
    hiddenColumns(): readonly ColumnRef[];
    /**
     * Name one value of a path -- a community the run calls group 3, "Students" -- or take its
     * name away with `null`. One undoable step, saved with the project. A name is not a data edit:
     * rules, bindings and exports still read the value; the legend's swatch for the value carries
     * the name as its `label`. A run's re-run carries each name to the group that shares the most
     * members with the one it was given to.
     *
     * ```ts
     * await session.data.setValueLabel("results.louvain.group", 3, "Students");
     * session.data.valueLabels("results.louvain.group").get("3"); // "Students"
     * ```
     * @param path - The value path: `data.<column>` or `results.<run>.<field>`.
     * @param value - The value, compared as the legend spells it, so `3` and `"3"` are one value.
     * @param label - The name, or null (or empty text) to remove it.
     * @returns Settles once the name is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` for a path that is not a value
     *     path, or a value or name of the wrong kind.
     * @since 3.26.0
     */
    setValueLabel(path: Path, value: string | number | boolean, label: string | null): Promise<void>;
    /**
     * The names given to a path's values with {@link SessionDataApi.setValueLabel}.
     * @param path - The value path.
     * @returns The names, keyed by the value as the legend spells it. Empty when none is named.
     * @since 3.26.0
     */
    valueLabels(path: Path): ReadonlyMap<string, string>;
    /**
     * How a data column's values are distributed, for a chart of one attribute. A quantitative
     * column comes back binned (`kind: "numeric"`, the {@link Histogram} shape a run's field has),
     * any other column counted by value, commonest first (`kind: "categorical"`). Elements with no
     * value in the column are not counted. Walks the column on every call.
     *
     * ```ts
     * const age = session.data.histogram({ kind: "node", name: "age" });
     * if (age.kind === "numeric") drawBars(age.bins);
     * else drawBars(age.values, age.otherCount);
     * ```
     * @param column - the column; an attribute descriptor can be passed as it is
     * @param options - `bins`: how many bars, or how many values a categorical column lists (20
     *     by default, 1 to 100); `scale`: a numeric column's axis, as `RunResult.histogram` takes it;
     *     `scope`: `"visible"` counts only what the filter and the time window leave shown,
     *     `"graph"` every element -- default `"graph"`, or the working graph (what the filters
     *     leave shown, the time window aside) while the session's `workingGraph` option is on
     *     (since 3.40.0). Under the `source-steps` experiment, `source` and `type` count only one
     *     source's or one type's elements (see {@link SourceElementsFilter}); with `source`, each
     *     reads that source's own value, so another source's value for the same column is not
     *     counted. Naming either with the experiment off throws `E_FEATURE_OFF`.
     * @returns the distribution
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` (with `details.candidates`) for a column
     *     no record carries, and `E_OPTION_RANGE` for a bin count outside 1 to 100.
     */
    histogram(
        column: ColumnRef,
        options?: HistogramOptions & { readonly scope?: "graph" | "visible" } & SourceElementsFilter,
    ): ColumnHistogram;
    /**
     * How many elements carry each value of a readable path, for a checklist of values with their
     * counts: a data column, a run's field (`results.<run>.group`) or a node value read at an
     * edge's end, as `data.readableValues()` lists them. Walks the elements on every call.
     *
     * ```ts
     * const groups = session.data.valueCounts("results.louvain.group");
     * groups.values[0]; // { value: 3, count: 14 }, the largest group
     * groups.missing; // nodes with no group
     * ```
     * @param path - The value path, or `"id"` for the node id.
     * @param options - What to count.
     * @param options.kind - Nodes or edges; by default the kind `readableValues()` lists the path
     *     on, nodes first.
     * @param options.scope - `"visible"` counts only what the filter and the time window leave
     *     shown (`total` included), `"graph"` every element. Default `"graph"`, or the working graph
     *     (what the filters leave shown, the time window aside) while the session's `workingGraph`
     *     option is on (since 3.40.0).
     * @param options.source - Under the `source-steps` experiment: count only the elements this
     *     source supplied, reading a data column as that source's own value. Throws `E_FEATURE_OFF`
     *     with the experiment off.
     * @param options.type - Under the `source-steps` experiment: count only the elements of this
     *     type. Throws `E_FEATURE_OFF` with the experiment off.
     * @returns The counts, most elements first.
     * @since 3.37.0
     */
    valueCounts(
        path: Path,
        options?: { readonly kind?: "node" | "edge"; readonly scope?: "graph" | "visible" } & SourceElementsFilter,
    ): ValueCounts;
    /**
     * Per group, the values of the nodes' categorical and list columns that occur in the group
     * more often than chance: count in the group against the expected count, with the
     * hypergeometric p and that p corrected (Benjamini-Hochberg unless `options.correction` names
     * another method) over every group, column and value tested. Group by a community run's `group`
     * field or any node path. Reads what is shown while `workingGraph` is on, the whole graph while
     * it is off. Walks the nodes on every call.
     *
     * ```ts
     * const profile = session.data.overRepresented(session.results.path("louvain", "group"));
     * const strong = profile.groups[0].values.filter((row) => row.adjustedP < 0.05);
     * ```
     * @param groupBy - The path holding each node's group; a node with no value there is left out.
     * @param options - What to test and how to correct; see {@link OverRepresentedOptions}.
     * @returns Every group, largest first, with its over-represented values.
     * @throws {GraphtyError} `E_OPTION_RANGE` when `options.correction` names no method.
     */
    overRepresented(groupBy: Path, options?: OverRepresentedOptions): OverRepresentedValues;
    /**
     * One row per group of the nodes -- a community run's `group`, a component, any node path --
     * with its size and the summaries of numeric columns the caller asks for. Write it as a file
     * with `exportGraph("csv" | "json", { groupTable: { groupBy } })`. Reads what is shown while
     * `workingGraph` is on, the whole graph while it is off. Walks the nodes on every call.
     *
     * ```ts
     * const table = session.data.groupTable("results.louvain.group", {
     *     summaries: { "data.age": ["mean", "max"] },
     * });
     * table.rows[0]; // { group: 3, size: 14, "data.age.mean": 31.5, "data.age.max": 60 }
     * ```
     * @param groupBy - The path holding each node's group; a node with no value there is left out.
     * @param options - The summaries; see {@link GroupTableOptions}.
     * @returns The table, largest group first.
     * @throws A `GraphtyError` with `E_OPTION_RANGE` for a summary not in {@link GroupSummary}.
     */
    groupTable(groupBy: Path, options?: GroupTableOptions): GroupTable;
    /**
     * The graph's shape. Walked once per snapshot and cached.
     * @param options - What to measure.
     * @param options.scope - `"visible"` measures only what the filters and the time window leave
     *     showing (the same as the whole graph while nothing is hidden). Default `"all"`, or the
     *     working graph (what the filters leave shown, the time window aside) while the session's
     *     `workingGraph` option is on.
     * @param options.source - Under the `source-steps` experiment: measure only the nodes and edges
     *     this source supplied, with the ends of those edges. Throws `E_FEATURE_OFF`
     *     with the experiment off.
     * @param options.type - Under the `source-steps` experiment: measure only the elements of this
     *     type, as `source` does. Throws `E_FEATURE_OFF` with the experiment off.
     * @returns the statistics
     */
    statistics(options?: { readonly scope?: "all" | "visible" } & SourceElementsFilter): GraphStatistics;
    /**
     * A stable identity for the graph's topology: equal fingerprints mean the same node ids in
     * the same order with the same arcs between them. Attributes and coordinates are not in it.
     * @returns the fingerprint
     */
    fingerprint(): string;
    /**
     * Add node records, as one undoable step. A record's id is read through
     * `data.knownFields.nodeIdPath`; a record whose id the graph already holds is skipped.
     * @param records - The records.
     * @returns Settles once the nodes are in the graph and drawn.
     */
    addNodes(records: readonly NodeRecordInput[]): Promise<void>;
    /**
     * Add edge records, as one undoable step. Endpoints are read through the configured edge id
     * paths, the repeated-edge policy applies, and each edge is given an id.
     * @param records - The records.
     * @returns Settles once the edges are in the graph and drawn.
     */
    addEdges(records: readonly EdgeRecordInput[]): Promise<void>;
    /**
     * Load a graph from column arrays, as one undoable step: the advanced path beside `addNodes`
     * and `addEdges`, for a graph already held as arrays. Nodes are rows `0` to `nodeCount - 1`;
     * edge `i` runs from row `sources[i]` to row `targets[i]`. The graph made is the one the record
     * doors make from the same rows, under the same ceilings, report and undo.
     *
     * ```ts
     * await session.data.importColumns({
     *     sources: [0, 1, 2],
     *     targets: [1, 2, 0],
     *     nodeCount: 3,
     *     ids: ["a", "b", "c"],
     * });
     * ```
     * @param columns - The columns; see {@link ImportColumnsInput}.
     * @returns The load's report (as `lastImport()` then answers), once the rows are in the graph and drawn.
     * @throws `E_BAD_COMMAND` when the columns do not line up; nothing is added.
     */
    importColumns(columns: ImportColumnsInput): Promise<LoadReport>;
    /**
     * Change some attributes of existing nodes, as one undoable step. Keys not named are kept; an
     * id the graph does not hold is skipped.
     * @param rows - The new values, per node.
     * @returns Settles once the change is drawn.
     */
    updateNodes(rows: readonly RowUpdate<NodeId>[]): Promise<void>;
    /**
     * Change some attributes of existing edges, as one undoable step.
     * @param rows - The new values, per edge id.
     * @returns Settles once the change is drawn.
     */
    updateEdges(rows: readonly RowUpdate<EdgeId>[]): Promise<void>;
    /**
     * Remove nodes, and every edge attached to one, as one undoable step. Undo puts them back at
     * the rows they held, with their records, weights and edge ids.
     * @param ids - The node ids; one the graph does not hold is skipped.
     * @returns Settles once they are gone from the graph and the picture.
     */
    removeNodes(ids: readonly NodeId[]): Promise<void>;
    /**
     * Remove edges, as one undoable step.
     * @param ids - The element-assigned edge ids; one the graph does not hold is skipped.
     * @returns Settles once they are gone from the graph and the picture.
     */
    removeEdges(ids: readonly EdgeId[]): Promise<void>;
    /**
     * Merge nodes into one, as one undoable step. Every edge of a merged node moves to the kept
     * node, with its record and weight (an edge between two merged nodes becomes a loop on the
     * kept node, and the moved edges get new edge ids); the kept node keeps its record, patched by
     * `options.values`; the other nodes are removed. Undo puts back every node and edge as it was.
     * @example
     * ```ts
     * // "Ann" and "Ann B." are one person: keep "ann", give it the full name.
     * await session.data.mergeNodes(["ann", "ann-b"], { into: "ann", values: { name: "Ann Baker" } });
     * ```
     * @param ids - The nodes to merge; an integer id may be written either way, `34` or `"34"`.
     * @param options - Which node is kept, and the values it takes.
     * @returns Settles once the merge is drawn; at once, with no step, when fewer than two nodes are named.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` when an id is not a node the graph holds.
     */
    mergeNodes(ids: readonly NodeId[], options?: MergeNodesOptions): Promise<void>;
    /**
     * Remove every node, edge, record and graph-level value, as one undoable step.
     * @returns Settles once the graph and the picture are empty.
     */
    clear(): Promise<void>;
    /**
     * Load a file, a URL or inline text through a registered data source, as one undoable step.
     * It waits its turn behind loads and layouts already asked for. What was loaded, and from
     * where, is kept: `lastImport()` and `source()` report it, and undo and redo never read the
     * source again.
     *
     * Without a `type`, the format is detected the way `loadFromUrl` and `loadFromFile` detect
     * it: from the file name or the URL's extension, then from the first bytes, fetching the URL
     * once when its name says nothing. A format nothing recognizes rejects with
     * `E_UNKNOWN_FORMAT`, naming the formats this element reads.
     * @param source - The data source's name, or none to detect it, and its options: inline
     *     `data`, a `url` or a `file`.
     * @param options - Whether to replace the graph (the default) or add to it, and the column
     *     roles and other choices `LoadDraft.load` takes. Equal to `prepare`, `load`, `dispose`.
     * @returns Settles once the last chunk is in the graph; rejects, recording nothing, when the
     *     load fails.
     */
    import(source: DataSourceInput, options?: LoadChoices & SourceLoadOptions): Promise<void>;
    /**
     * Check a network source's params and credential without loading anything. Experimental.
     * @param source - The source id and its params.
     * @param options - The credential and the endpoint.
     * @returns What the service said; rejects with the source's code.
     */
    testSource(source: SourceInput, options?: SourceLoadOptions): Promise<SourceProbe>;
    /**
     * Search what a network source holds (the networks of a repository, ...). Experimental.
     * @param source - The source id and the params narrowing the search.
     * @param query - The search text, cursor and page size.
     * @param options - The credential and the endpoint.
     * @returns One page of neutral rows.
     */
    listSource(
        source: SourceInput,
        query?: Omit<SourceListQuery<Record<string, unknown>>, "params">,
        options?: SourceLoadOptions,
    ): Promise<SourceListing>;
    /**
     * Fetch the neighborhood of nodes from the source that loaded them and merge it, as one
     * undoable step. A node not loaded from a source rejects with `E_SOURCE_UNSUPPORTED`. Experimental.
     * @param ids - The seed nodes.
     * @param options - Depth, direction, limit and the credential.
     * @returns `I_SOURCE_EXPANDED` with `{ seeds, added: [nodes, edges], partial }` when it
     *     brought something, `I_SOURCE_NOTHING_NEW` with the same params when it brought nothing.
     */
    expand(ids: readonly NodeId[], options?: ExpandOptions): Promise<SourceExpandResult>;
    /**
     * Where a node came from, when a network source's load brought it: the load and its
     * `sources()` entry, whether expanding it can fetch more, how many neighbors the source holds
     * that the graph does not, and whether it has been expanded (so `collapse` applies).
     * Experimental.
     *
     * ```ts
     * const from = session.data.nodeSource("ana");
     * if (from?.canExpand) await session.data.expand(["ana"]);
     * ```
     * @param id - The node.
     * @returns The facts, or null for a node no network source brought or the graph lacks.
     */
    nodeSource(id: NodeId): NodeSource | null;
    /**
     * Remove what a node's expansions alone brought, as one undoable step. Experimental.
     * @param id - The node.
     * @returns What was removed and what was kept.
     */
    collapse(id: NodeId): Promise<CollapseResult>;
    /**
     * Load the next page after a capped load from a source, merged in. Experimental.
     *
     * ```ts
     * const [load] = session.data.loads();
     * if (load.next !== null) await session.data.more({ load: load.key });
     * ```
     * @param options - The load options; `load` names the load to page (its `sources()` key, or
     *     its key in `loads()`), else the newest load that has more and is not waiting to run. The
     *     load's own caps apply unless `limits` is given.
     * @returns Settles once the page is in the graph, or at once when the load has no more;
     *     rejects with `E_LOAD_UNKNOWN` for a `load` neither lists, and `E_SOURCE_PENDING` for a
     *     load of an opened project that has not run since it opened.
     */
    more(options?: SourceMoreOptions): Promise<void>;
    /**
     * Read a few rows of a network source to confirm a form, changing nothing: no step, no
     * record, no event. The cap is sent to the source, so a database returns no more. Experimental.
     *
     * ```ts
     * const preview = await session.data.previewSource({ source: "neo4j", config: { database: "movies", mode: "all" } });
     * preview.nodes.length; // at most 25
     * ```
     * @param source - The source id and its params.
     * @param options - `maxNodes` (25 by default), the credential and the endpoint.
     * @returns At most `maxNodes` node rows, the edges between them, their columns, `more` when the
     *     source holds more, the server's facts and the read's issues; rejects with the source's code.
     */
    previewSource(source: SourceInput, options?: SourcePreviewOptions): Promise<SourcePreview>;

    /**
     * Read one of a source's examples and change nothing, for what `loadExample` loads, with the
     * example's endpoint, published login and first page. Pass the result to `import`, on this
     * session or another, and it loads without reading the service again.
     * Experimental.
     * @param source - The source id, such as `"neo4j"`.
     * @param example - The example's id within that source, such as `"neo4j-movies"`.
     * @param options - Anything `import` takes; the import that takes the read keeps them.
     * @returns The read and how many nodes and edges it holds; rejects with `E_SOURCE_UNKNOWN`
     *     when the source lists no such example.
     */
    readExample(source: string, example: string, options?: SourceLoadOptions): Promise<SourceRead>;
    /**
     * Ask a load's source whether its data changed since the load, loading nothing. Experimental.
     * @param load - The load's key, from `sources()` or `loads()`.
     * @param options - The credential and the endpoint.
     * @returns `{ changed }`; null when the source cannot tell (it has no cheap check, or the
     *     load recorded nothing to compare). Rejects with `E_LOAD_UNKNOWN` for an unknown key and
     *     `E_SOURCE_PENDING` for a load of an opened project that has not run since it opened.
     */
    checkSource(load: string, options?: SourceLoadOptions): Promise<SourceCheck>;
    /**
     * Read a load from its source again -- as many pages as it read -- and apply only the
     * difference as one undoable step (history fact `data.replace-source`): what the source no
     * longer has goes unless another load also supplied it, what it changed takes the new
     * values, and what it added arrives. A source that has not changed dispatches nothing and
     * reports zeros. Expansions of the load are not fetched again. Experimental.
     *
     * With the `save-files-v2` experiment, it also takes the id of a source a version 2 open held
     * (`W_SOURCE_UNAVAILABLE`: its copy changed, it needed permission, or it was not found): the
     * call is the permission, so it fetches the source from where the open would have, reads its
     * new bytes with its saved roles, and builds it into the graph with the reader's edits on it
     * applied, as one undoable step. The data gets a new build, so runs on the old data go stale
     * (`W_DATA_CHANGED` when saved and reopened). It rejects with `E_FETCH_FAILED`, `E_TOO_LARGE` or
     * `E_PARSE_FAILED` (`details.source`, `details.reason`) and the source stays held.
     *
     * ```ts
     * const { added, removed, updated } = await session.data.refresh(session.data.loads()[0].key);
     * ```
     * @param load - The load's key, from `sources()` or `loads()`, or a held source's id.
     * @param options - The credential and the endpoint.
     * @returns The node and edge counts added, removed and updated; rejects with
     *     `E_LOAD_UNKNOWN` for an unknown key, `E_SOURCE_PENDING` for a load of an opened project
     *     that has not run since it opened, else with the source's code.
     */
    refresh(load: string, options?: SourceLoadOptions): Promise<SourceRefreshReport>;
    /**
     * Load one of a source's examples (`examples` on its descriptor in `sourceDescriptors()`: a
     * public server and the params that load a known graph from it), as one undoable step: the
     * example's params, its endpoint, the login its service publishes and, for one too big to
     * load whole, its first page, so `loadExample("neo4j", "neo4j-movies")` is the whole call.
     * graph-samples' datasets are not examples: load those with `loadDataset`. Experimental.
     * @param source - The source id, such as `"neo4j"`.
     * @param example - The example's id within that source, such as `"neo4j-movies"`.
     * @param options - Anything `import` takes; a `credential` or `endpoint` given here wins.
     * @returns Settles once the example is in the graph; rejects with `E_SOURCE_UNKNOWN`
     *     (`{ source, id, known }`, `known` listing the source's example ids) when the source lists
     *     no such example.
     */
    loadExample(source: string, example: string, options?: LoadChoices & SourceLoadOptions): Promise<void>;
    /**
     * The loads from network sources this graph holds, in order: what a refresh needs, never a
     * secret. Experimental.
     * @returns The records.
     */
    loads(): readonly SourceLoadRecord[];
    /**
     * What a network source connects to and fetches, for showing it or filling a form to edit it:
     * its source id, address, params, limits and expand behavior. The params are redacted as a
     * saved file has them and no credential is in it, so it is safe to display; a query source's
     * params say the `mode` it read in. Experimental.
     * @param key - The entry's key, from {@link SessionDataApi.sources}.
     * @returns The settings, or undefined for a source that is not a network load.
     */
    sourceSettings(key: SourceKey): SourceSettings | undefined;
    /**
     * The source loads an opened project holds but has not run: nothing fetches by itself.
     * Experimental.
     * @returns One entry per waiting load.
     */
    pendingSourceLoads(): readonly PendingSourceLoad[];
    /**
     * Run one waiting source load of an opened project, read-only. Experimental.
     * @param id - The load's key, from `pendingSourceLoads()`.
     * @param options - The credential.
     * @returns Settles once it is loaded.
     */
    runPendingSourceLoad(id: string, options?: SourceLoadOptions): Promise<void>;
    /**
     * Read a source once and hold its rows, so its tables, columns and the counts a load would
     * produce can be read, and the column roles changed, before anything is added to the graph.
     * Nothing is loaded and history is untouched until `draft.load()`. A source `import` would
     * refuse to read is refused here with the same code (`E_UNKNOWN_FORMAT`, `E_PARSE_FAILED`,
     * `E_FETCH_FAILED`). A new `prepare`, and any load, disposes the draft before it.
     * @param source - What `import` takes.
     * @param options - How to read it.
     * @param options.signal - Abandons the read.
     * @param options.onto - `"graph"` reads the source as a table to join onto the graph:
     *     `draft.suggestJoin()`, `draft.joinReport()` and `draft.load({ join })` then work.
     * @param options.guess - How the draft guesses each table's roles. `"names"` (the default)
     *     reads only the header: `source`/`target`, `from`/`to`, `id`. `"values"` also reads the
     *     values when no header names them: two text columns that name the same things are an
     *     edge's ends (`bait` and `prey`), else a single file's nearly unique text column is its
     *     nodes' key (`account`). Pass the draft's `mapping` to `load` to keep the guess when the
     *     load is read again.
     * @param options.onProgress - Called with each change of the read, as `progress:changed`
     *     publishes it (`task: "prepare"`): the rows read so far and, when the size is known, the
     *     share read (`fraction`). @since 3.40.0
     * @returns The draft.
     */
    prepare(
        source: DataSourceInput,
        options?: {
            readonly signal?: AbortSignal;
            readonly onto?: "graph";
            readonly guess?: "names" | "values";
            readonly onProgress?: (change: ProgressChange) => void;
        },
    ): Promise<LoadDraft>;
    /**
     * Every table joined onto the graph and still loaded, oldest first: the join each was made
     * with. Saved with the project.
     * @returns The joins.
     * @since 3.30.0
     */
    joins(): readonly JoinRecord[];
    /**
     * Join a joined table again with other choices, as one undoable step: the values or edges the
     * join made are taken back, the values it wrote over put back, and the table joined anew
     * onto the graph as it is now. With the record's own choices, this applies a join again after
     * the graph changed (a refresh, a replaced source).
     * @param source - The joined table's load, from {@link SessionDataApi.joins}.
     * @param choices - The join.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_SOURCE_UNKNOWN` for a key no join has.
     * @since 3.30.0
     */
    editJoin(source: SourceKey, choices: JoinChoices): Promise<void>;
    /**
     * What {@link SessionDataApi.editJoin} with these choices would do, counted against the graph
     * as it would be with the join taken back, changing nothing: `draft.joinReport` for a table
     * already joined.
     * @param source - The joined table's load, from {@link SessionDataApi.joins}.
     * @param choices - The join.
     * @returns The counts.
     * @throws `E_SOURCE_UNKNOWN` for a key no join has, and `E_BAD_COMMAND` for a key column the
     *     table lacks.
     * @since 3.30.0
     */
    editJoinReport(source: SourceKey, choices: JoinChoices): JoinReport;
    /**
     * Load a generated graph, as one undoable step: one of `catalog.generators()` by name, run
     * with its parameters (each one left out takes its catalog default). The same name and
     * parameters give the same graph on every platform. A random generator's `seed` picks which
     * graph.
     * @param name - The generator's name, e.g. `"barabasi-albert"`.
     * @param params - Its parameters by name, e.g. `{ n: 500, m: 3 }`.
     * @param options - Whether to replace the graph (the default) or add to it.
     * @returns Settles once the graph is loaded. Rejects with `E_UNKNOWN_GENERATOR` for a name the
     *     catalog does not list, `E_UNKNOWN_OPTION` for a parameter the generator does not take,
     *     and `E_OPTION_RANGE` for a value it refuses; nothing is recorded then.
     */
    generate(name: string, params?: GeneratorParams, options?: ImportOptions): Promise<void>;
    /**
     * Download one of `catalog.datasets()` by name and load it, as one undoable step.
     *
     * The element names no download host of its own: `baseUrl` says where graph-samples' dataset
     * files are published. graph-samples exports the address of its own copy:
     *
     * ```ts
     * import { DEFAULT_DATASET_BASE_URL } from "@graphty/graph-samples";
     * await session.data.loadDataset("karate", { baseUrl: DEFAULT_DATASET_BASE_URL });
     * ```
     * @param name - The dataset's name, e.g. `"karate"`.
     * @param options - Where to download from (`baseUrl`, required), whether to replace the graph
     *     (the default) or add to it, and a signal that abandons the download. Loads land in the
     *     order they were asked for, so a load asked for after this one waits until this download
     *     finishes or fails; aborting the signal, even once the download has finished, stops it and
     *     lets the next load through.
     * @returns Settles once the graph is loaded. Rejects with `E_OPTION_RANGE` (`details.option`
     *     `"baseUrl"`) when no `baseUrl` is given, `E_UNKNOWN_DATASET` for a name that is not one,
     *     `E_FETCH_FAILED` when the download fails (`recoverable: false` for a client error other
     *     than 408 and 429, `details.status` when the server answered), `E_PARSE_FAILED` when the
     *     file came back but could not be read (`details.issue` `"E_DATASET_CHECKSUM"` when it is
     *     not the published file), `E_TOO_LARGE` (`details.limit`, `details.of` `"bytes"`) when it
     *     is larger than graph-samples' download limit, and with the signal's own reason when it is
     *     aborted; nothing is recorded then.
     */
    loadDataset(name: string, options?: DatasetLoadOptions): Promise<void>;
}

/** What `data.loadDataset` takes besides the name. */
export interface DatasetLoadOptions extends ImportOptions {
    /**
     * Where the dataset files are published, ending in `/`. Required: without it the load rejects
     * with `E_OPTION_RANGE`. graph-samples' own copy is its `DEFAULT_DATASET_BASE_URL`.
     */
    readonly baseUrl?: string;
    /** Abandons the download. */
    readonly signal?: AbortSignal;
}

/**
 * A column of a {@link LoadDraft} that looks like time.
 * @beta
 */
export interface TimeFound extends CodedFact<"time.found"> {
    /**
     * `table` is the table's id and `column` the column's name, ready for a load's mapping. `from`
     * and `to` are the earliest and latest instant a designation reads from it, as epoch
     * milliseconds.
     */
    readonly params: {
        /** The table's id. */
        readonly table: string;
        /** The column's name. */
        readonly column: string;
        /** The earliest instant, as epoch milliseconds. */
        readonly from: number;
        /** The latest instant, as epoch milliseconds. */
        readonly to: number;
    };
}

/**
 * A source read by `data.prepare`, held until `load()` or `dispose()`. After either, every method
 * rejects with `E_DISPOSED`.
 */
export interface LoadDraft {
    /** The data source that read it: the value `DataSourceInput.type` takes. */
    readonly type: string;
    /** Its tables. */
    readonly tables: readonly DraftTable[];
    /**
     * Set when the source is a graphty document rather than data: `"project"` for a saved project,
     * `"document"` for another graphty document (a saved style or notes), the values
     * `project.open` reports in `opened`. Its tables hold no rows, so `report` and `load` refuse
     * it with `E_EMPTY_LOAD`; `project.open` is what opens it. Absent for a data file.
     */
    readonly graphtyDocument?: "project" | "document";
    /** The element's own reading: every table, with every role it found written out. */
    readonly mapping: LoadMappingRead;
    /**
     * What the element noticed in the file and applied nowhere: one {@link TimeFound} for each
     * column that {@link DraftColumn.looksLike} time.
     * @beta
     */
    readonly findings: readonly TimeFound[];
    /**
     * Every table's roles as a load with these choices reads them: the reader's mapping over the
     * element's own reading, in the full form `mapping` has. After a table's `rowsAre` changes,
     * this is where the key, the endpoints and the rest the element now reads are found.
     * @param choices - The same choices `load` takes.
     * @returns The roles.
     * @throws `E_BAD_COMMAND` or `E_UNKNOWN_ATTRIBUTE` for a mapping the draft cannot carry out.
     */
    resolve(choices?: LoadChoices): LoadMappingRead;
    /**
     * The roles each table needs and does not have under a set of choices, for a per-table
     * "ready" check: `LOAD_ROLES[rowsAre].requires` less the roles the choices and the element's
     * own reading set. An edge table needs `source` and `target`; a node table needs nothing.
     * `report` and `load` refuse a table the reader maps that is not ready with
     * `E_EDGE_ENDPOINTS_UNRESOLVED`, whose `details.table` and `details.missing` say the same.
     * @param choices - The same choices `load` takes.
     * @returns By table id, the required roles left unset; an empty list means the table is ready.
     */
    missing(choices?: LoadChoices): Readonly<Record<string, readonly ColumnRole[]>>;
    /**
     * What `load(choices)` would do to the graph as it is now, computed from the held rows with
     * no I/O. A load past the element's limit is reported in `tooLarge` rather than thrown.
     * @param choices - The same choices `load` takes.
     * @returns The report.
     */
    report(choices?: LoadChoices): Promise<LoadReport>;
    /**
     * The table's rows as the file holds them, a page at a time.
     * @param table - A `DraftTable.id`.
     * @param options - The page, and `only` to read the unmatched or rejected rows.
     * @returns The page.
     */
    rows(table: string, options?: DraftRowOptions): Promise<RecordPage<DraftRow>>;
    /**
     * Load the held rows as one undoable step, without reading the source again. A load with no
     * `mapping` loads what `data.import` of the same source loads: for a graph file (every table
     * `fixed`) it sets `data.knownFields.nodeLabelPath` to `label` when no label path is configured
     * and the load is not a merge, as `data.import` does; a CSV file's id and endpoint cells load
     * as text, as `data.import` reads them.
     * @param choices - The column roles, how to treat the graph already there, and the rest.
     * @returns Settles once the rows are in the graph.
     */
    load(choices?: LoadChoices): Promise<void>;
    /**
     * How the table most likely joins onto the graph: its shape and key pairs. Needs a draft
     * prepared with `{ onto: "graph" }`.
     *
     * ```ts
     * const draft = await session.data.prepare({ config: { file } }, { onto: "graph" });
     * const suggestion = draft.suggestJoin(); // { shape: "node-values", keys: [{ file: "symbol", graph: "id" }], confident: true }
     * const report = draft.joinReport({ keys: suggestion.keys }); // { matched: 52, notInGraph: 10, ... }
     * await draft.load({ join: { keys: suggestion.keys, ignoreCase: true } });
     * ```
     * @returns The suggestion.
     * @throws `E_BAD_COMMAND` (`details.reason: "not-onto-graph"`) for a draft prepared without `onto`.
     * @since 3.30.0
     */
    suggestJoin(): JoinSuggestion;
    /**
     * What `load({ join: choices })` would do, counted, changing nothing.
     * @param choices - The join.
     * @returns The counts.
     * @throws `E_BAD_COMMAND` for a draft prepared without `onto`, or a key column the table lacks.
     * @since 3.30.0
     */
    joinReport(choices: JoinChoices): JoinReport;
    /**
     * The table read as a mapping table for a join's `via`, held apart from the graph: its rows
     * never become nodes or edges. Any draft answers, prepared onto the graph or not.
     * @returns The table: its name, columns and rows.
     * @throws `E_DISPOSED` once the draft has been loaded or disposed.
     * @since 3.38.0
     */
    lookup(): JoinLookup;
    /** Let go of the held rows. */
    dispose(): void;
    /**
     * Whether the file carries styles a load with `styles: "file"` would draw, and how many rules
     * they hold per kind; null when the format cannot carry styles or the file holds none.
     * @experimental file-styles
     */
    readonly styles: {
        /** Whether the file declares styles. */
        readonly declared: boolean;
        /** How many rules they hold per kind. */
        readonly summary: FileStyleSummary;
    } | null;
}

/**
 * How many rules a file's styles hold.
 * @experimental file-styles
 */
export interface FileStyleSummary {
    /** The rules for nodes. */
    readonly nodeRules: number;
    /** The rules for edges. */
    readonly edgeRules: number;
}

/** One table of a draft. */
export interface DraftTable {
    /**
     * Assigned by the element: `"rows"` for a single CSV file, `"nodes"` and `"edges"` for a pair
     * of CSV files or any other format. The same for every source of the same shape.
     */
    readonly id: string;
    /** The file name, or the id when the source has none. */
    readonly name: string;
    /** How many rows it holds. */
    readonly rowCount: number;
    /**
     * True when the format sets the roles (every format but CSV). A mapping for it is refused with
     * `E_BAD_COMMAND`, except one naming only `time` and `timeUnit`.
     */
    readonly fixed: boolean;
    /** Its columns, in the order the file has them, computed over every row. */
    readonly columns: readonly DraftColumn[];
    /**
     * A column that could be the table's edge weight, offered rather than applied: present when
     * the element's own reading of the table as edges finds no weight, naming the first column
     * that holds a number on every row and has no other role. Naming it as the `weight` role in
     * a mapping applies it. Absent for a table whose format sets its roles.
     */
    readonly weightCandidate?: string;
    /**
     * How a CSV table's file was split into columns: the separator (`","`, `";"`, `"\t"` or `"|"`)
     * and whether the element detected it (`true`) or the source's `delimiter` option named it.
     * Absent for any other format.
     */
    readonly delimiter?: {
        /** The separator. */
        readonly value: string;
        /** True when the element detected it; false when the source's `delimiter` option named it. */
        readonly detected: boolean;
    };
}

/** One column of a draft table, described as `data.attributes()` describes it after a load. */
export interface DraftColumn extends Pick<
    AttributeDescriptor,
    "name" | "type" | "completeness" | "uniqueCount" | "sampleValues"
> {
    /** The role the element gives it by itself; absent when it is a plain attribute. */
    readonly suggested?: ColumnRole;
    /**
     * Set when the column has no role and its values look like time: every sampled value is a strict date, or the name speaks of time and every number fits an
     * epoch or a calendar year. It applies nothing: a load designates the column only when the
     * mapping gives it the `time` role. {@link LoadDraft.findings} holds its span.
     * @beta
     */
    readonly looksLike?: "time";
}

/**
 * What a column can be to a load. `kind` is the column whose values name each row's kind: a
 * node's, which loads as its `kind` attribute and keeps ids of different kinds apart under
 * `LoadChoices.kindIds` `"scoped"`, or an edge's, which loads as its `kind` attribute. The
 * {@link LocationKind}s (`latitude`, `longitude`, `coordinates`, `country`, `region`, `city`) are
 * where a node's location is read from, one column per kind (`data.setRole` only). `x`, `y` and
 * `z` are the columns a node's drawn position is read from (`data.setRole` only): with an `x` and a
 * `y` column, every node whose two values are finite numbers is placed there, as a record's
 * `position` places it (`z` is 0 without a `z` column).
 */
export type ColumnRole =
    "key" | "label" | "source" | "target" | "weight" | "time" | "edgeId" | "kind" | LocationKind | PositionAxis;

/** A column role naming one coordinate of a node's drawn position. */
export type PositionAxis = "x" | "y" | "z";

/** One row of a draft table. */
export interface DraftRow {
    /**
     * Where the row is: for a CSV file the line it starts on, the header being line 1; for any
     * other format the record's position in its table, from 1.
     */
    readonly line: number;
    /** The row's values by column name. */
    readonly values: Readonly<Record<string, unknown>>;
    /**
     * Which ends of an edge row name a node no node row (nor, for a merge, the graph) holds.
     * Present only on the rows `only: "unmatched"` reads.
     */
    readonly missingEnds?: readonly EdgeEnd[];
    /**
     * Why the row was rejected or left unmatched, as a code and its facts. Present on the rows
     * `only: "rejected"` and `only: "unmatched"` read, and on every row of `LoadReport.rows`.
     */
    readonly reason?: RowReason;
}

/**
 * Why a row of an import made no node or edge, or named a node no node row held: a neutral fact a
 * reader words from `code` and `params`.
 *
 * - `"refused-row"` (the code `LoadReport.errors` gives the same row): the row's id, or an edge
 *   row's end, cannot be a node id -- absent, null, blank, or not a string or a finite number.
 *   `params.rowsAre` is `"nodes"` or `"edges"`; for an edge row `params.ends` lists the unusable
 *   ends (`"source"`, `"target"`).
 * - `"unknown-end"` (the code `data.issues()` gives these edges): an edge row names a node no node
 *   row (nor, for a merge, the graph) holds. `params.ends` lists those ends and `params.ids` the
 *   ids they name, in the same order.
 * @since 3.40.0
 */
export interface RowReason {
    /** The kind of problem. */
    readonly code: RowReasonCode;
    /** The facts the code names. */
    readonly params: Readonly<Record<string, unknown>>;
}

/**
 * The codes a {@link RowReason} gives.
 *
 * OPEN UNION: codes may be added in a minor release; handle unknown codes.
 * @since 3.40.0
 */
export type RowReasonCode = "refused-row" | "unknown-end";

/** One end of an edge: the node it leaves, or the node it enters. */
export type EdgeEnd = "source" | "target";

/** Which rows `LoadDraft.rows` reads. */
export interface DraftRowOptions {
    /** The position of the first row. Default 0. */
    readonly offset?: number;
    /** The most rows; `Infinity` reads to the end. Default 100. */
    readonly limit?: number;
    /** Which rows to read; every row when absent. */
    readonly only?: DraftRowFilter;
    /**
     * The choices the rows are read under: the same `LoadChoices` `report` and `load` take, so
     * the rows listed are the rows that report counted. Absent reads with the draft's own
     * mapping, replacing the graph -- never with the choices an earlier `report` was given.
     */
    readonly choices?: LoadChoices;
}

/**
 * Which rows of a draft table `LoadDraft.rows` reads, under the choices it is given.
 *
 * - `"unmatched"`: edge rows naming a node no node row (nor, for a merge, the graph) holds.
 * - `"rejected"`: rows whose key or endpoints cannot be a node id.
 * - `"loaded"`: the rows the load makes into nodes or edges: every row not rejected, less the
 *   unmatched edge rows when `unmatched` is `"leave-out"`.
 *
 * OPEN UNION: later releases may add filters.
 */
export type DraftRowFilter = "unmatched" | "rejected" | "loaded";

/**
 * The column roles of one table. Every value is a column name exactly as `DraftColumn.name`
 * spells it, never an expression. Absent means the element's own reading; null means none. A
 * name that is not a column of the table is refused with `E_UNKNOWN_ATTRIBUTE`.
 */
export interface TableMapping {
    /** Whether each row is a node or an edge. */
    readonly rowsAre?: "nodes" | "edges";
    /** A node table's id column; null numbers the rows instead. */
    readonly key?: string | null;
    /** The column that names a node. Written to `data.knownFields.nodeLabelPath`. */
    readonly label?: string | null;
    /** The column holding the node an edge leaves. */
    readonly source?: string | Endpoint;
    /** The column holding the node an edge enters. */
    readonly target?: string | Endpoint;
    /** The edge weight column; null weighs every edge 1, and the legacy `value` column is not read. */
    readonly weight?: string | null;
    /**
     * What the weight means. Written to `data.knownFields.edgeWeightMeaning`, so it is saved with
     * the project and moved by undo; null (and absent, when the table names a weight) says the
     * reader did not choose. `session.data.loadedWeight()` reads it back.
     */
    readonly weightMeaning?: WeightMeaning["meaning"] | null;
    /** The column holding a time. Written to `data.knownFields.nodeTimePath` or `edgeTimePath`. */
    readonly time?: string | null;
    /**
     * How the time column's numbers are read: epoch milliseconds (`"ms"`), epoch seconds (`"s"`),
     * calendar years (`"year"`) or plain ordered numbers (`"ordinal"`, such as steps); left out,
     * the values decide when the column is designated. Written to
     * `data.knownFields.nodeTimeUnit` or `edgeTimeUnit`.
     * @beta
     */
    readonly timeUnit?: TimeUnit | null;
    /** The column holding an edge's own id. Written to `data.knownFields.edgeIdPath`. */
    readonly edgeId?: string | null;
    /** The column naming each row's kind, which loads as the node's or edge's `kind` attribute. */
    readonly kind?: string | null;
    /** A node table's kind: a kind name every row takes, as its `kind` attribute. Wins over `kind`. */
    readonly kindName?: string | null;
    /**
     * An edge table's source nodes' kind: a kind name every source node takes, or `{ column }`
     * whose values name each row's. The node loads with it as its `kind` attribute. Unlike every
     * other key, a bare string here is a kind name, never a column.
     */
    readonly sourceKind?: string | Endpoint | null;
    /** An edge table's target nodes' kind, as {@link TableMapping.sourceKind}. */
    readonly targetKind?: string | Endpoint | null;
}

/** An edge endpoint column. */
export interface Endpoint {
    /** The column's name. */
    readonly column: string;
}

/**
 * A bare `TableMapping` applies to a source with one table; otherwise each table is named by id
 * (`{ tables }`) or by what its rows are (`{ nodes, edges }`, see {@link SideMapping}).
 */
export type LoadMapping = ByTableMapping | SideMapping;

/**
 * A load mapping bare (a source with one table) or naming each table by id: the shape a load
 * keeps its mapping in, never by side.
 * @since 3.40.0
 */
export type ByTableMapping =
    | TableMapping
    | {
          /** Each table's roles, by table id. */
          readonly tables: Readonly<Record<string, TableMapping>>;
      };

/**
 * Each table's roles named by what its rows are, so a caller need not look up table ids: `nodes`
 * applies to the table read as nodes and `edges` to the table read as edges, with one table or
 * two; a side no table is read as is refused (`E_BAD_COMMAND`). The side picks the table and never
 * changes what its rows are: to read the table read as nodes as edges, say so in its roles
 * (`{ nodes: { rowsAre: "edges", source: "from", target: "to" } }`).
 * @since 3.40.0
 */
export interface SideMapping {
    /** The node table's roles. */
    readonly nodes?: TableMapping;
    /** The edge table's roles. */
    readonly edges?: TableMapping;
}

/** One table's roles as the element reads them: `rowsAre` always set, endpoints always objects. */
export interface TableMappingRead extends TableMapping {
    readonly rowsAre: "nodes" | "edges";
    readonly source?: Endpoint;
    readonly target?: Endpoint;
}

/** Every table's roles as the element reads them. */
export interface LoadMappingRead {
    /** Each table's roles, by table id. */
    readonly tables: Readonly<Record<string, TableMappingRead>>;
}

/**
 * The choices a load was read with, as `data.sources()` hands them back: its mapping is bare or by
 * table id, never by side, so it can be read without the source's tables.
 * @since 3.40.0
 */
export interface LoadedChoices extends LoadChoices {
    /** The column roles, bare or by table id. */
    readonly mapping?: ByTableMapping;
}

/** What `import` and `LoadDraft.load` take. */
export interface LoadChoices extends ImportOptions {
    /**
     * Say a load read from a URL is one of the application's own samples, so `data.sources()`
     * lists it as `"sample"` rather than `"url"`. @since 3.38.0
     */
    readonly origin?: "sample";
    /** The column roles; a role left out is the element's own reading. */
    readonly mapping?: LoadMapping;
    /**
     * An edge naming a node no node row holds: `"add"` (the default) makes the node, `"leave-out"`
     * drops the edge.
     */
    readonly unmatched?: "add" | "leave-out";
    /**
     * A node row repeating an id an earlier node row of the same load gave: `"first"` (the
     * default) keeps the first row's node and leaves the later row out; `"merge"` also writes
     * the later row's values onto that node, later rows winning; `"refuse"` refuses the load with
     * `E_DUPLICATE_ID` (`details.id`). Every case is counted in `LoadReport.duplicates`, which a
     * `report()` fills under `"refuse"` instead of refusing. A row with no usable id is never a
     * duplicate: it is rejected and counted in `counts.rejected`.
     *
     * OPEN UNION: later releases may add policies.
     */
    readonly duplicateIds?: "first" | "merge" | "refuse";
    /**
     * An id value that appears under two kinds (`kind`, `sourceKind`, `targetKind`): `"shared"`
     * (the default) makes one node of it, with the first kind it appeared under; `"scoped"` makes
     * one node per kind, each such id becoming `<kind>:<value>`. Ids that appear under one kind
     * keep their value. `LoadReport.kinds.sharedIds` counts them.
     */
    readonly kindIds?: "shared" | "scoped";
    /**
     * For `mode: "merge"`: a node the graph already holds keeps its attributes (`"keep"`, the
     * default) or takes the incoming row's values over them (`"update"`).
     * @since 3.30.0
     */
    readonly existing?: "keep" | "update";
    /**
     * Join the rows onto the graph instead of loading them as they are: needs a draft prepared
     * with `{ onto: "graph" }`. Every other choice is then ignored. One undoable step; the table
     * stays a source and the join is listed by `data.joins()`.
     * @since 3.30.0
     */
    readonly join?: JoinChoices;
    /** Writes `data.directed` in the same step. */
    readonly directed?: boolean | "auto";
    /**
     * `"file"` draws the file's own styles -- its colors, sizes, shapes, labels and the rest --
     * as style layers above the element's base layers, in the same step, so the graph looks as
     * it does in the program that wrote the file. `"none"` (the default) loads the data alone.
     * `lastImport().styles` says which layers the file made and what could not be drawn.
     * `catalog.formats()` says which formats can carry styles (`styles.read`).
     *
     * OPEN UNION: later releases may add choices.
     * @experimental file-styles
     */
    readonly styles?: "file" | "none";
    /**
     * How a file's styles are turned into layers, when `styles` is `"file"`.
     * @experimental file-styles
     */
    readonly styleOptions?: FileStyleOptions;
}

/**
 * A source to import: the pair the element takes as `dataSource` and `dataSourceConfig`. `type`
 * is a registered data source ("json", "csv", "graphml", ...), and `config` its options: inline
 * `data`, a `url` or a `file`, and what the source reads besides.
 */
export interface DataSourceInput {
    /** The data source's name; detected from the file name, the URL or the content when absent. */
    readonly type?: string;
    /**
     * A network source's id (`listSources()` from `./extend` names them), in place of `type`:
     * `config` then holds the source's params. Experimental.
     */
    readonly source?: string;
    /** Its options. */
    readonly config: Readonly<Record<string, unknown>>;
    /**
     * What the reader calls the data, kept with the graph for `data.source()`. The file's name,
     * or the last part of the URL, when absent.
     */
    readonly name?: string;
}

/**
 * Where a graph was loaded from, as the graph keeps it: never the inline text or the file itself,
 * which the loaded rows already hold.
 */
export interface DataSourceDescriptor {
    /** The data source that read it: the format named, or the one detected. */
    readonly type?: string;
    /** What the reader calls the data. */
    readonly name?: string;
    /** The file's size in bytes, when a file was read. */
    readonly size?: number;
    /** The name of the file it was read from; `name` is the reader's and can change. */
    readonly fileName?: string;
    /** The source's options, without `data` and `file`: the `url`, and what the source reads besides. */
    readonly config?: Readonly<Record<string, unknown>>;
}

/** One edge row a load left out because an end names a node no node row held. */
export interface LeftOutEdge {
    /** The source end, as the load read it. */
    readonly source: NodeId;
    /** The target end, as the load read it. */
    readonly target: NodeId;
    /**
     * Where the row was, numbered as `DraftRow.line` numbers it: for a CSV file the line it starts
     * on, the header being line 1; for any other format the record's position in its table, from 1.
     * Present for a load from a draft.
     */
    readonly line?: number;
    /** The row's other values, by column. */
    readonly values: Readonly<Record<string, unknown>>;
    /**
     * Which ends name a node no node row held: one end or both. Absent in a project saved before
     * it was kept.
     */
    readonly missingEnds?: readonly EdgeEnd[];
}

/**
 * One load still in the graph: where it came from, and what it added. What
 * `session.data.sources()` lists.
 * @since 3.30.0
 */
export interface LoadedSource extends DataSourceDescriptor {
    /** Its stable key: what {@link SessionDataApi.sourcesOf} returns and a `source` rule names. Saved with the project. */
    readonly key: SourceKey;
    /** Where it came from: a file, a network source, a generated or sample graph, or a joined table. */
    readonly kind: LoadedSourceKind;
    /** How many nodes and edges it supplied that the graph still holds, counting ones another load also supplied. */
    readonly counts: {
        /** Nodes. */
        readonly nodes: number;
        /** Edges. */
        readonly edges: number;
    };
    /** For a joined table: the load it was joined onto. */
    readonly joinedOnto?: SourceKey;
    /** The names of the tables the load read, as the draft named them; empty when it read none by name. */
    readonly tables: readonly string[];
    /**
     * What each of `tables` held, in the same order: rows of nodes or rows of edges, as the load
     * read them. Absent when the load read a graph file (its one entry holds both) or no table by
     * name, and in a project saved before it was kept.
     */
    readonly tableRows?: readonly ("nodes" | "edges")[];
    /**
     * How a CSV load's file was split into columns, as {@link DraftTable.delimiter} says while
     * drafting: the separator and whether the element detected it. For a pair of files, the node
     * file's. Absent for any other format and in a project reopened from a save.
     * @since 3.40.0
     */
    readonly delimiter?: DraftTable["delimiter"];
    /** How many nodes and edges the load added to the graph. */
    readonly added: {
        /** Nodes added. */
        readonly nodes: number;
        /** Edges added. */
        readonly edges: number;
    };
    /**
     * When this load last read its data, as RFC 3339. Absent in a project saved before it was kept.
     * @since 3.38.0
     */
    readonly loadedAt?: string;
    /**
     * Where it was read from, without credentials: a URL load's address, or a network load's origin
     * and path. Absent for anything else.
     * @since 3.38.0
     */
    readonly url?: string;
    /**
     * Edge rows the load left out because they named a node no node row held (`unmatched:
     * "leave-out"`), and how many distinct such names, as `LoadReport.unmatched` counts them.
     * Present only when the load left at least one row out.
     */
    readonly leftOut?: {
        /** How many edge rows were left out. */
        readonly rows: number;
        /** How many distinct node names those rows named that no node row held. */
        readonly values: number;
        /**
         * The names of the columns the load read each row's two ends from. Absent when an end was
         * read by an expression that is not a plain column name, or in a project saved before it
         * was kept.
         */
        readonly endColumns?: {
            /** The column each row's source end was read from. */
            readonly source: string;
            /** The column each row's target end was read from. */
            readonly target: string;
        };
        /**
         * The left-out rows themselves (the first 100), so they can be shown after the load and
         * after a project is saved and reopened: each row's two ends as the load read them, and
         * its other values. Absent in a project saved before they were kept.
         */
        readonly edges?: readonly LeftOutEdge[];
    };
    /**
     * For a joined table (`kind: "join"`): the join, as {@link SessionDataApi.joins} lists it.
     * @since 3.30.0
     */
    readonly join?: JoinRecord;
    /**
     * The choices its rows were read with (the mapping, kinds, unmatched ends, repeated ids),
     * as `draft.load` was given them; absent when it was given none. A role absent here is the
     * element's own reading.
     * @since 3.30.0
     */
    readonly choices?: LoadedChoices;
    /**
     * The roles each table of the load was read with, by table id: the element's own reading
     * with the choices laid over it (`draft.mapping` as loaded). Absent for a graph file, whose
     * format sets its roles, and for a load that did not go through a draft (`import` with no
     * choices, a network source).
     *
     * ```ts
     * const edges = Object.values(source.mapping?.tables ?? {}).find((t) => t.rowsAre === "edges");
     * edges?.source?.column; // "bait"
     * ```
     * @since 3.30.0
     */
    readonly mapping?: LoadMappingRead;
    /**
     * True when this session holds what the load was read from, so
     * {@link SessionDataApi.reloadSource} can read it again; absent otherwise (a project opened
     * from a file, a network source, a generated graph).
     * @since 3.30.0
     */
    readonly reloadable?: true;
    /**
     * `"reference"` when a project save keeps this load as a reference, read again on open
     * ({@link SessionDataApi.setCopy}); absent when it is kept as a copy, and always absent with
     * the `source-references` experiment off.
     * @since 3.58.0
     */
    readonly copy?: "reference";
    /**
     * For a network source's load: its record's key in {@link SessionDataApi.loads}. `data.more`,
     * `data.refresh` and `data.checkSource` take it or {@link LoadedSource.key}; keep `key`, which a
     * save and reopen never changes.
     * @since 3.30.0
     */
    readonly loadKey?: string;
    /**
     * For a network source's load: what it can do now. `more` is true while the load stopped at a
     * cap and its source pages; `expand` and `refresh` are what its source can do.
     * @since 3.30.0
     */
    readonly features?: SourceFeatures;
    /**
     * For a network source's load: how many nodes the source holds for it, when the source says
     * or a complete read counted them, so a consumer can show what is loaded of the total.
     * @since 3.30.0
     */
    readonly total?: number;
    /**
     * For a network source's load: how many edges the source holds for it, when the source counted
     * them or a complete read did.
     * @since 3.30.0
     */
    readonly totalEdges?: number;
    /**
     * Where the load stands in the build. Present only under the source-steps experiment.
     * @experimental source-steps
     */
    readonly state?: SourceBuildState;
    /**
     * How many nodes its rows only named (an edge end another source supplies). Present only
     * under the source-steps experiment.
     * @experimental source-steps
     */
    readonly named?: number;
    /**
     * Its rows the build left out, by reason. Present only under the source-steps experiment.
     * @experimental source-steps
     */
    readonly rowsLeftOut?: Readonly<
        Partial<
            Record<
                | "left-out:empty-key"
                | "left-out:empty-end"
                | "left-out:unmatched"
                | "left-out:fan-out"
                | "left-out:no-step",
                number
            >
        >
    >;
    /**
     * The key overlaps it met when it was added. Present only under the source-steps experiment.
     * @experimental source-steps
     */
    readonly issues?: readonly SourceSpaceOverlap[];
    /**
     * For a staged source: the committed source it is named like (the same `name`), which a
     * replace of that source would read it as. Absent when none is, and for a source that is not
     * staged. Present only under the source-steps experiment.
     * @experimental source-steps
     */
    readonly sameName?: SourceKey;
}

/**
 * What the rows of a table joined onto the graph are, as `draft.suggestJoin()` reads them:
 *
 * - `"node-values"`: one row per node, matched by a key; its columns become node attributes.
 * - `"edge-values"`: one row per edge, matched by a key on the edges; its columns become edge attributes.
 * - `"edges"`: edges between nodes, a source key and a target key per row; an end the graph
 *   lacks becomes a new node.
 * - `"rows"`: rows of the same kind the graph already holds, added as a plain merge.
 * - `"replace"`: a newer copy of a loaded source (decided by the reader; never suggested here).
 * - `"merge"`: one row per node, merged into the node its key names (on any graph value, not
 *   only the id): its values fused in as for `"node-values"`; a row naming no node becomes a new
 *   node (`JoinChoices.unmatchedFrom`). Removing the join splits them back. Never suggested.
 * - `"link"`: one row per node, matched by a key; nodes whose rows share a value in
 *   `JoinChoices.link.columns` are linked. Never suggested as the shape; a values suggestion
 *   names the columns that fit in `JoinSuggestion.link`.
 *
 * OPEN UNION: shapes may be added in a minor release.
 * @since 3.30.0
 */
export type JoinShape = "node-values" | "edge-values" | "edges" | "rows" | "replace" | "merge" | "link";

/**
 * How many rows become one value ({@link JoinChoices.aggregate}): `"count"` the rows with a value,
 * `"sum"`, `"min"`, `"max"` and `"mean"` of the numbers (`"min"` and `"max"` compare text when a
 * value is not a number), `"first"` and `"last"` value in table order, `"list"` every value in
 * table order. Blank values are skipped.
 *
 * OPEN UNION: reductions may be added in a minor release.
 * @since 3.38.0
 */
export type JoinReduce = "count" | "sum" | "min" | "max" | "mean" | "first" | "last" | "list";

/**
 * Linking nodes whose rows share a value ({@link JoinChoices.link}, shape `"link"`).
 * @since 3.38.0
 */
export interface JoinLink {
    /** The columns whose values link nodes: a phone, a device, an email. */
    readonly columns: readonly string[];
    /**
     * `"edges"` (the default): one edge per linked pair, its `shared` attribute the number of
     * values the pair shares. `"nodes"`: one node per shared value, id `<column>:<value>`, its
     * `kind` the column and the value under the column's name, with an edge from each holder.
     */
    readonly as?: "edges" | "nodes";
    /** A value more nodes than this hold links none of them (a hub). Default 10. */
    readonly maxShared?: number;
    /** For `"edges"`: the values a pair must share to be linked. Default 1. */
    readonly minShared?: number;
    /** The `kind` the new edges, and with `"nodes"` the new nodes, carry. */
    readonly kind?: string;
}

/**
 * How a mapping table is read ({@link JoinChoices.mapping}).
 * @since 3.38.0
 */
export interface JoinMapping {
    /** The mapping table's column holding the incoming keys, then its column holding the graph's. */
    readonly columns?: readonly [from: string, to: string];
    /** What a key mapped to several values matches: the `"first"` (the default), or every one. */
    readonly many?: "first" | "list";
}

/**
 * A node's region when a join compares two graphs ({@link JoinChoices.compare}): the value
 * written to its membership column. `"from"` is the data being joined in and `"onto"` the graph
 * already loaded: `"both"` (a node in both), `"only-from"` (a node only the joined data holds) or
 * `"only-onto"` (a node only the loaded graph holds). These values are saved in projects.
 * @since 3.38.0
 */
export type JoinRegion = "both" | "only-from" | "only-onto";

/**
 * A mapping table held apart from the graph ({@link JoinChoices.lookup}): `LoadDraft.lookup()` reads
 * one from any file, or write the rows yourself. Its rows never become nodes or edges.
 *
 * ```ts
 * const crosswalk = await session.data.prepare({ url: "symbol-to-ensembl.csv" });
 * const via = crosswalk.lookup();
 * crosswalk.dispose();
 * ```
 * @since 3.38.0
 */
export interface JoinLookup {
    /** Its name, as a source's. */
    readonly name?: string;
    /** Its columns; by default every column a row holds. */
    readonly columns?: readonly string[];
    /** Its rows, by column. */
    readonly rows: readonly Readonly<Record<string, unknown>>[];
}

/**
 * One pair of a join's key: a column of the incoming table and the graph value it matches.
 * @since 3.30.0
 */
export interface JoinKey {
    /** The incoming table's column. */
    readonly file: string;
    /**
     * The graph value: `"id"` (the node id, or the edge id), an edge's `"source"` or `"target"`, or
     * `"data.<column>"`.
     */
    readonly graph: Path;
}

/**
 * What `draft.suggestJoin()` reads the incoming table as.
 * @since 3.30.0
 */
export interface JoinSuggestion {
    /** What the rows are. */
    readonly shape: JoinShape;
    /** The key pairs: one for values (more make a compound key), source then target for edges. */
    readonly keys: readonly JoinKey[];
    /** Whether most of the key's values match the graph; ask the reader when false. */
    readonly confident: boolean;
    /**
     * For a values join onto nodes: the columns whose values a few of the matched nodes share (a
     * phone, a device), so a join of `shape: "link"` on them would link those nodes. Absent when no
     * column fits. The shape stays the values join; linking is the reader's choice:
     * `{ ...suggestion, shape: "link" }`.
     * @since 3.38.0
     */
    readonly link?: JoinLink;
    /**
     * For `"edges"`: `"both"` when rows naming the same source and target say different things, so
     * each is its own event. Absent otherwise. @since 3.38.0
     */
    readonly repeated?: "both";
}

/**
 * A clash rule: what a join shows for a column the element already holds a value in. `"keep"`
 * (the default) the held value, `"overwrite"` the incoming one, `"both"` the held one with the
 * incoming one beside it as `<column> (<table name>)`, `"min"` or `"max"` the smaller or larger
 * (numbers, or dates written as ISO 8601 text), `"mean"` their mean (numbers), `"vote"` the value
 * most sources hold, the held one on a tie. A cell a number rule cannot read keeps the held value.
 * OPEN UNION: later releases may add rules.
 * @since 3.40.0
 */
export type JoinClashRule = "keep" | "overwrite" | "both" | "min" | "max" | "mean" | "vote";

/**
 * How a table joins onto the graph: what `draft.joinReport` and `draft.load({ join })` take.
 * @since 3.30.0
 */
export interface JoinChoices {
    /** The key pairs; see {@link JoinSuggestion.keys}. */
    readonly keys: readonly JoinKey[];
    /** What the rows are; the suggestion's shape when absent. */
    readonly shape?: JoinShape;
    /** Match keys whatever their letter case. Default false. */
    readonly ignoreCase?: boolean;
    /** Match keys whatever spaces they hold (leading, trailing, inside). Default false. */
    readonly ignoreSpaces?: boolean;
    /** The incoming columns to bring; every column but the keys when absent. */
    readonly columns?: readonly string[];
    /**
     * What to do with a column the graph already has, by column name, `"*"` for every column not
     * named: see {@link JoinClashRule}. A column with no rule keeps the graph's value (`"keep"`).
     * A number rule (`min`, `max`, `mean`) named for a column holding another value is refused with
     * `E_CLASH_RULE_TYPE` (`details.column`, `details.rule`); under `"*"` such a cell keeps its value.
     *
     * ```ts
     * draft.load({ join: { keys, clash: { "*": "both", amount: "max" } } });
     * ```
     */
    readonly clash?: Readonly<Record<string, JoinClashRule>>;
    /**
     * Several rows with one key: `"first"` (the default) takes the first row, `"last"` the last
     * one; `"both"` keeps every row, as a list of values for values, as one edge each for edges.
     */
    readonly repeated?: "first" | "last" | "both";
    /**
     * The report's warnings the reader chose to leave as they are, by the {@link JoinReport} count
     * that raised them. Recorded with the join (`JoinRecord.choices`), so a consumer can stop
     * flagging them; changes nothing the join does.
     * @since 3.30.0
     */
    readonly ignore?: readonly JoinWarning[];
    /**
     * A mapping table with one column holding the incoming keys and one holding the graph's,
     * through which incoming keys are translated first; an incoming key the table lacks is matched
     * as it is ({@link JoinReport.unmapped} counts them). A load already in the graph (`sources()`
     * key): a joined table is read as its rows; any other load as its records: its edges (`source`,
     * `target` and their values) when it read a table of edges, otherwise its nodes (`id` and
     * their values). For a mapping table held apart from the graph, use {@link JoinChoices.lookup}.
     */
    readonly via?: SourceKey;
    /**
     * A mapping table held apart from the graph (`LoadDraft.lookup()`), read as `via` reads one:
     * its rows never become nodes or edges, and it is saved with the join. Giving both `lookup` and
     * `via` is refused (`E_BAD_COMMAND`, `details.reason` `"via-and-lookup"`).
     * @since 3.38.0
     */
    readonly lookup?: JoinLookup;
    /**
     * How the mapping table (`via` or `lookup`) is read: `columns` its column holding the incoming keys and
     * its column holding the graph's (by default the columns whose values meet the incoming keys
     * and the graph's most); `many` what a key mapped to several values matches: the `"first"`
     * (the default) or every one (`"list"`).
     * @since 3.38.0
     */
    readonly mapping?: JoinMapping;
    /**
     * For `"edges"`: the `kind` the nodes the join makes take, by end. A node the graph holds is
     * left as it is.
     * @since 3.38.0
     */
    readonly endKinds?: {
        /** The `kind` a node made for a source end takes. */
        readonly source?: string;
        /** The `kind` a node made for a target end takes. */
        readonly target?: string;
    };
    /**
     * For `"edges"` with `endKinds`: `"shared"` (the default) matches an end to a node of any kind;
     * `"scoped"` matches it only to a node of its end's kind, and an end it makes whose id a node
     * of another kind holds becomes `<kind>:<value>`, as `LoadChoices.kindIds` does.
     * @since 3.38.0
     */
    readonly kindIds?: "shared" | "scoped";
    /**
     * For `"merge"`: compare the table, read as a second graph's nodes, with the graph, writing
     * each node's region ({@link JoinRegion}) to the `membership` column: `"both"` (a row merged
     * into it), `"only-from"` (a node the table alone holds) or `"only-onto"` (a node no row
     * names). Every node is kept: a filter on the membership column keeps the union, the
     * intersection (`"both"`) or a difference. A clashing column of the table is always written as
     * `<column> (<table name>)`, so the two graphs' values sit side by side.
     * @since 3.38.0
     */
    readonly compare?: boolean;
    /** For `compare`: the column the regions are written to. Default `"membership"`. @since 3.38.0 */
    readonly membership?: string;
    /**
     * For `"edges"`: a row with an end the graph lacks either `"add"`s that end as a new node
     * (the default) or is `"leave-out"`, left out of the join.
     * @since 3.33.0
     */
    readonly unknownEnds?: "add" | "leave-out";
    /**
     * Reduce the rows of one key (for `"edges"`, of one source and target pair) to one value per
     * column instead of keeping one row: the reduction for each column named, written under the
     * column's name, or several, each written as `<column> (<reduction>)`. A column may be a key
     * column (count the rows). A brought column named here takes its first value. When present,
     * `repeated` is ignored and every row of a key counts; for `"edges"`, one edge per pair.
     * @since 3.38.0
     */
    readonly aggregate?: Readonly<Record<string, JoinReduce | readonly JoinReduce[]>>;
    /** For `"link"`: what links nodes. Required for `"link"`. @since 3.38.0 */
    readonly link?: JoinLink;
    /**
     * For `"merge"`: a row naming no node is kept as a new node (`"keep"`, the default), its id
     * the key's value, or `"drop"`ped.
     * @since 3.38.0
     */
    readonly unmatchedFrom?: "keep" | "drop";
    /**
     * The names to write in place of the ones the join derives, by the derived name: a reduction's
     * `<column> (<reduction>)`, a clashing column's `<column> (<table name>)`, a link edge's
     * `shared`. `{ "amount (count)": "orders", shared: "overlap" }`.
     * @since 3.38.0
     */
    readonly names?: Readonly<Record<string, string>>;
    /**
     * For `"node-values"` on one key with no `via` or `lookup`: a row matching no node is `"leave-out"`, left
     * out of the join (the default), or `"add"`ed as a new node named by its key. Undone, edited
     * and removed with the join.
     * @since 3.38.0
     */
    readonly unmatchedRows?: "leave-out" | "add";
}

/**
 * What a join does with one incoming row ({@link JoinReport.rowFates}):
 *
 * - `"joined"`: its values reach the elements it matches, or (for `"edges"`) it becomes an edge
 *   between two nodes the graph holds.
 * - `"new-end"`: (`"edges"`) it becomes an edge, and an end the graph lacks becomes a new node; or
 *   (`"node-values"` with `unmatchedRows: "add"`) it matches no node and becomes a new one.
 * - `"repeat"`: its key repeats another row's and `repeated` keeps the other one.
 * - `"left-out"`: the join leaves it out: its key matches nothing, a key value is blank, (for
 *   `"edges"` with `unknownEnds: "leave-out"`) an end is not in the graph, (for `"merge"` with
 *   `unmatchedFrom: "drop"`) it names no node, or (for `"link"`) no value of it is shared.
 * - `"merged"`: (`"merge"`) it merges into the node its key names; a row naming no node and kept
 *   is `"new-end"`.
 * - `"linked"`: (`"link"`) a value of it links its node to another.
 * - `"over-cap"`: (`"link"`) it links nothing because each value it shares is held by more
 *   nodes than `link.maxShared`.
 *
 * OPEN UNION: fates may be added in a minor release.
 * @since 3.33.0
 */
export type JoinRowFate = "joined" | "new-end" | "repeat" | "left-out" | "merged" | "linked" | "over-cap";

/**
 * A {@link JoinReport} count a reader can choose to ignore (`JoinChoices.ignore`).
 * OPEN UNION: warnings may be added in a minor release.
 * @since 3.30.0
 */
export type JoinWarning = "repeatedKeys" | "notInGraph" | "withoutValue" | "extraIgnoringCase" | "extraIgnoringSpaces";

/**
 * What a join would do, counted: what `draft.joinReport(choices)` returns. For values, matches
 * count nodes (or edges); for `"edges"`, they count rows.
 * @since 3.30.0
 */
export interface JoinReport {
    /** Nodes (edges for `"edge-values"`, rows for `"edges"`) the key matches. */
    readonly matched: number;
    /** Rows whose key matches nothing, even ignoring case and spaces. */
    readonly notInGraph: number;
    /** Nodes (or edges) no row gives a value; for `"edges"`, nodes no new edge touches. */
    readonly withoutValue: number;
    /** Keys (source and target pairs for `"edges"`) that more than one row holds. */
    readonly repeatedKeys: number;
    /** How many more would match with `ignoreCase`; 0 when it is on. */
    readonly extraIgnoringCase: number;
    /** How many more would match with `ignoreSpaces`; 0 when it is on. */
    readonly extraIgnoringSpaces: number;
    /** Nodes the join would make: an edge end the graph lacks. */
    readonly newNodes: number;
    /** Edges the join would make. */
    readonly newEdges: number;
    /** Nodes whose values the join changes: a value written that differs from the one held. 0 for `"edges"`. */
    readonly updatedNodes: number;
    /** The incoming columns the graph already has. */
    readonly clashes: readonly {
        /** The incoming column's name. */
        readonly column: string;
        /** Always `"clash"`: the graph already has a column by that name. */
        readonly code: "clash";
    }[];
    /**
     * For each incoming row, in table order: the nodes (edges for `"edge-values"`) its key matches,
     * or for `"edges"` its source and target nodes when both are in the graph; empty when it
     * matches nothing. Empty for `"rows"` and `"replace"`.
     * @since 3.30.0
     */
    readonly rowMatches: readonly (readonly (NodeId | EdgeId)[])[];
    /** The nodes (or edges) {@link JoinReport.withoutValue} counts. @since 3.30.0 */
    readonly withoutValueIds: readonly (NodeId | EdgeId)[];
    /**
     * For `"edges"`: rows with an end the graph lacks, whether `unknownEnds` adds them or leaves
     * them out. 0 for values.
     * @since 3.33.0
     */
    readonly unknownEndRows: number;
    /**
     * For each incoming row, in table order, what the join does with it, so a preview can show
     * exactly what Join will do. Empty for `"rows"` and `"replace"`.
     * @since 3.33.0
     */
    readonly rowFates: readonly JoinRowFate[];
    /** Rows whose key matches more than one element. @since 3.38.0 */
    readonly fanOut: number;
    /** For `"merge"`: the nodes rows merge into. 0 otherwise. @since 3.38.0 */
    readonly merged: number;
    /** For `"merge"`: the keys only the table holds, kept or dropped. 0 otherwise. @since 3.38.0 */
    readonly onlyFrom: number;
    /** For `"merge"`: the nodes no row merges into. 0 otherwise. @since 3.38.0 */
    readonly onlyOnto: number;
    /** For `"link"`: the node pairs linked. 0 otherwise. @since 3.38.0 */
    readonly pairsLinked: number;
    /** For `"link"`: the shared values left unused because more than `maxShared` nodes hold them. @since 3.38.0 */
    readonly valuesOverCap: number;
    /** For `"link"`: the pairs sharing fewer values than `minShared`, so not linked. @since 3.38.0 */
    readonly pairsBelowMin: number;
    /** With `via`: the distinct incoming keys the mapping table lacks. 0 otherwise. @since 3.38.0 */
    readonly unmapped: number;
    /** With `via`: the distinct incoming keys the mapping table maps to more than one value. @since 3.38.0 */
    readonly mappedToMany: number;
    /**
     * With `compare`: the nodes in each region ({@link JoinRegion}). Absent otherwise.
     * @since 3.38.0
     */
    readonly regions?: {
        /** How many nodes are in each region. */
        readonly nodes: Readonly<Record<JoinRegion, number>>;
    };
    /**
     * Rows of the file its reader could not read (a line with too many or too few fields), so the
     * join never saw them.
     * @since 3.38.0
     */
    readonly unreadRows: number;
}

/**
 * One table joined onto the graph: what `data.joins()` lists. Saved with the project, so the
 * join is listed after a reopen and `data.editJoin` can apply it again.
 * @since 3.30.0
 */
export interface JoinRecord {
    /** The joined table's load. */
    readonly source: SourceKey;
    /** The load it was joined onto, or null when the graph had none. */
    readonly onto: SourceKey | null;
    /** What the rows were read as. */
    readonly shape: JoinShape;
    /** The choices it was made with, its shape filled in. */
    readonly choices: JoinChoices;
    /** How many rows the table holds. */
    readonly rows: number;
    /** How many the join matched, as {@link JoinReport.matched}. */
    readonly matched: number;
    /** The names the join wrote its values under, after any `"both"` clash rename. */
    readonly columns: readonly string[];
    /** The joined table as read: its name, columns and rows. */
    readonly table: {
        /** The table's name. */
        readonly name: string;
        /** The table's column names, in order. */
        readonly columns: readonly string[];
        /** The table's rows, each a value by column name. */
        readonly rows: readonly Readonly<Record<string, unknown>>[];
        /** Rows of the file its reader could not read. Absent when there were none. @since 3.38.0 */
        readonly unreadRows?: number;
    };
    /**
     * For values: each element's values before the join wrote over them, by id, null for a value
     * it did not have, so editing the join can put them back.
     */
    readonly before?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
    /**
     * For a join that adds elements (edges, a merge, a link): the nodes it made, which the graph
     * did not hold when it ran. Removing or editing the join takes only these of its nodes; the
     * nodes it named that the graph already held stay. Absent on a join recorded before 3.40.0,
     * which takes every node it named that no other load supplied.
     * @since 3.40.0
     */
    readonly made?: readonly NodeId[];
}

/**
 * Where a load came from, as {@link LoadedSource.kind} says: a file the reader gave (or inline
 * text), a URL, a network source, a generated or sample graph, or a table joined onto an earlier
 * load. A saved project's `graphty-sources` entry names the same kinds `file`, `url`, `source`
 * (for `server`) and `sample`, and a join as a `file` entry with `joinedOnto`. OPEN UNION: kinds
 * may be added.
 */
export type LoadedSourceKind = "file" | "url" | "server" | "sample" | "join";

/** How a project save keeps a load: its rows in the file, or where to read them again. */
export type SourceCopyChoice = "copy" | "reference";

/**
 * Why a load cannot be saved as a reference: a file the page holds no path to (`file`), rows
 * handed over inline (`inline`), a joined table (`join`), a URL or network source's load whose
 * secret query parameters or credential a save drops (`secret-url`), a URL that is not an absolute http(s) address (`relative-url`), or a generated
 * graph or dataset with nothing recorded to make it again (`no-seed`). OPEN UNION: later releases add values.
 */
export type SourceNoPathReason = "file" | "inline" | "join" | "secret-url" | "relative-url" | "no-seed";

/** How a project save keeps one load: one entry of {@link SessionDataApi.copies}. */
export interface SourceCopy {
    /** The load's key. */
    readonly source: SourceKey;
    /** How a save keeps it. */
    readonly copy: SourceCopyChoice;
    /** Present when the load cannot be a reference: `W_SOURCE_NO_PATH` with `{ source, reason }`. */
    readonly refused?: {
        /** Always `W_SOURCE_NO_PATH`. */
        readonly code: "W_SOURCE_NO_PATH";
        /** The load and why it cannot be a reference. */
        readonly params: {
            /** The load's key. */
            readonly source: SourceKey;
            /** Why the load cannot be a reference. */
            readonly reason: SourceNoPathReason;
        };
    };
}

/**
 * What `session.data.removeSource(key)` did.
 * @since 3.30.0
 */
export interface RemoveSourceResult {
    /** The nodes and edges that went: the load supplied them and no other load did. */
    readonly removed: {
        /** Nodes removed. */
        readonly nodes: number;
        /** Edges removed. */
        readonly edges: number;
    };
    /** The load's nodes and edges that stayed, because another load also supplied them. */
    readonly kept: {
        /** Nodes kept. */
        readonly nodes: number;
        /** Edges kept. */
        readonly edges: number;
    };
    /**
     * The joins that went with it: joined onto it, through it as a mapping table, or keyed on a column it wrote.
     * @since 3.38.0
     */
    readonly alsoRemoved: readonly SourceKey[];
    /**
     * Under the source-steps experiment: each step that went with the source (`W_STEP_REMOVED`).
     * @experimental source-steps
     */
    readonly issues?: readonly SourceRefreshIssue[];
}

/**
 * What a replacement left matching nothing, as a {@link ReplaceReport.unbound} code:
 *
 * - `"style-layer"`: a style layer reads a column the copy dropped (`layer`, `kind`, `column`).
 * - `"filter"`: the filter, a filter step or the time window reads one (`kind`, `column`).
 * - `"join"`: a join matches on one (`join`: the joined table's load, `kind`, `column`).
 *
 * OPEN UNION: codes may be added in a minor release.
 * @since 3.30.0
 */
export type ReplaceUnboundCode = "style-layer" | "filter" | "join";

/**
 * Added, removed and changed, for one kind of element.
 * @since 3.30.0
 */
export interface ReplaceCounts {
    /** How many the copy added. */
    readonly added: number;
    /** How many went: the load supplied them, the copy does not have them, and no other load supplied them. */
    readonly removed: number;
    /** How many stayed with at least one new value. */
    readonly changed: number;
}

/** What `data.remap` takes. @since 3.54.0 */
export interface RemapOptions {
    /** The column roles to change, as `LoadChoices.mapping` names them; a role left out stays as it is. */
    readonly mapping: LoadMapping;
    /** The load to re-map, from {@link SessionDataApi.sources}; the only load when absent. */
    readonly source?: SourceKey;
}

/**
 * What `session.data.replaceSource(key, source)` did.
 * @since 3.30.0
 */
export interface ReplaceReport {
    /** Nodes the copy added, the ones that went, and the ones whose values changed. */
    readonly nodes: ReplaceCounts;
    /** Edges the copy added, the ones that went, and the ones whose values changed. */
    readonly edges: ReplaceCounts;
    /** Styles, filters and joins that read a column the copy no longer has. */
    readonly unbound: readonly CodedFact<ReplaceUnboundCode>[];
    /**
     * Under the source-steps experiment: held steps, new columns and reader edits whose source moved.
     * @experimental source-steps
     */
    readonly issues?: readonly SourceRefreshIssue[];
}

/** How an import treats the graph already there. */
export interface ImportOptions {
    /** `"replace"` (the default) empties the graph first, in the same step; `"merge"` adds to it. */
    readonly mode?: "replace" | "merge";
    /**
     * `"recommended"` also chooses a layout for what was loaded, from its shape and its
     * coordinates, in the same step; `"placed"` (since 3.40.0) draws it where its data placed it
     * (the `fixed` layout) when every node arrived with a position, and otherwise leaves the
     * layout as it is; `"keep"` (the default) leaves the layout as it is.
     */
    readonly layout?: "recommended" | "placed" | "keep";
    /**
     * `"step"` (the default) records the load as one undoable step. `"start"` makes the loaded
     * graph where the history starts, as opening a new project does: the load is never undone or
     * canceled by `undo()` (while it is pending `canUndo` is false unless later work is), the
     * steps recorded before it was called are dropped once it is in, and work dispatched while it
     * was pending is kept as its own steps.
     */
    readonly history?: "step" | "start";
    /**
     * An opaque value the caller chooses. The load does nothing with it but echo it as
     * {@link SourceLoaded.callerKey} on the `source:loaded` event, and as `JournalEntry.callerKey`
     * on the journal entries of the commands the load ran, so a caller can tell its own loads
     * apart. It is never saved with the project. `replaceSource` and `reloadSource` echo it too,
     * on the `source:loaded` they publish with {@link SourceLoaded.replaced} set.
     * @since 3.40.0
     */
    readonly callerKey?: string;
    /**
     * The column the loaded node rows are keyed by; the id column the load read when absent.
     * @experimental source-steps
     */
    readonly key?: string;
    /**
     * The node type the loaded node rows carry, declared as the source's type rule; it also names
     * the id space their keys live in when `space` is absent.
     * @experimental source-steps
     */
    readonly type?: SourceTypeName;
    /**
     * The id space the loaded keys live in; absent, the source's own space (or its `type`'s), so
     * two loads with no options never meet. A `graph:` space is refused with `E_SPACE_RESERVED`.
     * @experimental source-steps
     */
    readonly space?: SourceSpaceName;
    /**
     * The columns the loaded edge rows name their ends by, and the space and type of each end.
     * @experimental source-steps
     */
    readonly edges?: {
        /** The column naming each edge's source end, and that end's space and type. */
        readonly from: SourceEndOption;
        /** The column naming each edge's target end, and that end's space and type. */
        readonly to: SourceEndOption;
        /** The column holding each edge's own key; absent keys each row by its place in the file. */
        readonly id?: string;
    };
    /**
     * What a key overlap does (`W_SPACE_OVERLAP`): `"separate"` (the default) keeps the source's
     * keys in its own space, `"merge"` makes them the nodes already in the space.
     * @experimental source-steps
     */
    readonly overlap?: "separate" | "merge";
}

/**
 * How `data.stage` and a draft's `stage` read a source: an import's choices, and how to guess the
 * key and edge ends they leave out.
 * @experimental source-steps
 */
export interface StageOptions extends ImportOptions {
    /** `"values"` also reads the values when no header names the roles; `"names"` (the default) reads the headers only. */
    readonly guess?: "names" | "values";
}

/**
 * One edge end of a source loaded under the source-steps experiment.
 * @experimental source-steps
 */
export interface SourceEndOption {
    /** The column naming the end. */
    readonly column: string;
    /** The id space the end's keys live in. */
    readonly space?: SourceSpaceName;
    /** The node type the end's nodes carry; names the space when `space` is absent. */
    readonly type?: SourceTypeName;
}

/**
 * The name of an id space loaded keys live in: one the consumer names, or `source:<source id>`.
 * @experimental source-steps
 */
// eslint-disable-next-line sonarjs/redundant-type-aliases -- names an identifier the consumer gives, as the API report reads it
export type SourceSpaceName = string;

/**
 * The name of a node or edge type the consumer declares.
 * @experimental source-steps
 */
// eslint-disable-next-line sonarjs/redundant-type-aliases -- names an identifier the consumer gives, as the API report reads it
export type SourceTypeName = string;

/**
 * A key value many rows of a step share, so it would link or fan out to many elements
 * (`W_VALUE_HUB`).
 * @experimental source-steps
 */
export interface SourceHubValue {
    /** The key value, as the rows spell it. */
    readonly value: string;
    /** How many rows hold it. */
    readonly rows: number;
}

/**
 * What one step did in the committed build: its buckets (design 9.2). A count a step's kind never
 * makes stays 0.
 * @experimental source-steps
 */
export interface SourceStepCounts {
    /** The step's place in the ordered list, from 0. */
    readonly step: number;
    /** The step's kind. */
    readonly op: SourceStepOp;
    /** The source the step reads. */
    readonly source: SourceKey;
    /** For a `join.edges` step: the part its edge keys are minted under. */
    readonly part?: number;
    /** Nodes the step made that no earlier step had made. */
    readonly newNodes: number;
    /** Edges the step made. */
    readonly newEdges: number;
    /** Rows whose key found the element they write to. */
    readonly matched: number;
    /** Rows whose key found no element. */
    readonly unmatched: number;
    /** Rows whose key found more than one element, so they were left out. */
    readonly fanOut: number;
    /** Repeated keys within the source whose rows hold different values. */
    readonly rowsDiffer: number;
    /** Cells that met a different value another source wrote, by column. */
    readonly valuesDiffer: Readonly<Record<string, number>>;
    /** Cells a numeric conflict rule (min, max, mean) met that are not numbers, by column. */
    readonly ruleType: Readonly<Record<string, number>>;
    /** For `join.merge`: nodes folded into the node they matched. */
    readonly merged: number;
    /** Elements this step gave a type other than the one an earlier step gave them. */
    readonly typeDiffers: number;
    /** For `join.merge`: nodes of the space merged into that no row reached. */
    readonly untouched: number;
    /**
     * For `join.merge`: source 2's nodes the step leaves in the graph as nodes of their own (the
     * new nodes the merge brings): those that met no node 1, or more than one. 0 under
     * `unmatchedFrom: "drop"`, which leaves the unmatched out.
     */
    readonly keptNew: number;
    /** For `join.merge`: how many nodes each merged node was made from, largest first. */
    readonly groups: readonly number[];
    /** Edges whose two ends are one node. */
    readonly selfLoops: number;
    /** Rows left out because their key cell is empty (`W_KEY_EMPTY`). */
    readonly emptyKey: number;
    /** Rows kept apart because their key repeats and nothing settles one row for it. */
    readonly repeatedKept: number;
    /** Key values many rows share (`W_VALUE_HUB`). */
    readonly hub: readonly SourceHubValue[];
    /** Repeated keys within the source whose rows hold different values, by column. */
    readonly rowsDifferIn: Readonly<Record<string, number>>;
    /** End pairs the step joined with an edge when an earlier edge already joined them. */
    readonly parallelPairs: number;
    /**
     * Edge ends that found a node already built, by the id space they look in. For `join.add`, its
     * node rows whose key found a node an earlier step built count here too.
     */
    readonly endsMeet: Readonly<Record<SourceSpaceName, number>>;
    /** Edge ends that found no node, so made one or left the row out, by id space. */
    readonly endsMissing: Readonly<Record<SourceSpaceName, number>>;
    /** For `join.add`: nodes of the source's own space its edges name but its node rows lack. */
    readonly namedOnly: number;
    /** Key values reaching more than one node: the keys behind {@link SourceStepCounts.fanOut}. */
    readonly repeated1: number;
    /** Key values the step's own rows hold more than once. */
    readonly repeated2: number;
    /** Nodes the step made that the graph holds, by type; untyped nodes are left out. */
    readonly newNodeTypes: Readonly<Record<SourceTypeName, number>>;
    /** Edges the step made that the graph holds, by type; untyped edges are left out. */
    readonly newEdgeTypes: Readonly<Record<SourceTypeName, number>>;
}

/** The counts of {@link SourceStepCounts} that are numbers, besides the step's place and part. */
export type SourceStepNumber = Exclude<
    {
        [K in keyof SourceStepCounts]-?: SourceStepCounts[K] extends number | undefined ? K : never;
    }[keyof SourceStepCounts],
    "step" | "part"
>;

/** The counts of {@link SourceStepCounts} kept by name (a column, a space or a type). */
export type SourceStepByName =
    "valuesDiffer" | "ruleType" | "rowsDifferIn" | "endsMeet" | "endsMissing" | "newNodeTypes" | "newEdgeTypes";

/**
 * How a step's counts in a draft differ from the same step's counts in the committed build: the
 * draft's count minus the committed one. A count by name lists only the names whose count moved.
 * @experimental source-steps
 */
export type SourceStepCountsChange = { readonly [K in SourceStepNumber]: number } & {
    readonly [K in SourceStepByName]: Readonly<Record<string, number>>;
};

/**
 * How many nodes and edges a build holds, in all and by type (untyped elements are in the totals only).
 * @experimental source-steps
 */
export interface SourceDraftPreviewTotals {
    /** Nodes in all. */
    readonly nodes: number;
    /** Edges in all. */
    readonly edges: number;
    /** Nodes by type. */
    readonly nodeTypes: Readonly<Record<SourceTypeName, number>>;
    /** Edges by type. */
    readonly edgeTypes: Readonly<Record<SourceTypeName, number>>;
}

/**
 * How many elements of one kind a draft adds, removes, and keeps with different values.
 * @experimental source-steps
 */
export interface SourceDraftPreviewChanges {
    /** Elements the draft adds. */
    readonly added: number;
    /** Elements the draft removes. */
    readonly removed: number;
    /** Elements the draft keeps with different values. */
    readonly changed: number;
}

/**
 * One step of a draft, as `draft.preview()` describes it: the step as {@link SourceDraft.steps}
 * lists it, with how it stands against the committed steps.
 * @experimental source-steps
 */
export interface SourceDraftPreviewStep extends SourceStepRow {
    /** `"new"`: the committed steps hold no such step; `"edited"`: its choices changed; `"kept"`: as committed. */
    readonly state: "new" | "edited" | "kept";
    /** The same step's place in the committed list; null for a new step. */
    readonly committed: number | null;
    /** Its counts minus the committed ones; null for a new step. */
    readonly change: SourceStepCountsChange | null;
}

/**
 * One source, as `draft.preview()` describes it: what it supplies and names in the draft, and the
 * change from the committed build.
 * @experimental source-steps
 */
export interface SourceDraftPreviewSource {
    /** The source. */
    readonly source: SourceKey;
    /** Where it stands in the draft; `"removed"` for a committed source the draft takes out. */
    readonly state: "staged" | "built" | "off" | "held" | "removed";
    /** Nodes it supplies. */
    readonly nodes: number;
    /** Edges it supplies. */
    readonly edges: number;
    /** Nodes it only names. */
    readonly named: number;
    /** Its rows no step reads (fate `no-step`). */
    readonly noStep: number;
    /** Each count minus the committed one. */
    readonly change: {
        /** Nodes it supplies, minus the committed count. */
        readonly nodes: number;
        /** Edges it supplies, minus the committed count. */
        readonly edges: number;
        /** Nodes it only names, minus the committed count. */
        readonly named: number;
        /** Rows no step reads, minus the committed count. */
        readonly noStep: number;
    };
}

/**
 * One outcome a draft's preview reports, as a code and its parameters:
 *
 * - `W_STEP_REMOVED`: committed step `step` is gone from the draft, or not built there: `reason`
 *   `"source-removed"` (its source is taken out), `"step-removed"` or `"source-held"`.
 * - `W_REFERENCE_UNBOUND`: a note, a pin or a reader edit names `ref`, which the draft no longer holds.
 * - `W_FILTER_HELD`: filter condition `filter` reads `column`, which no element of the draft carries,
 *   so it would be held off.
 * - `W_EDIT_SOURCE_CHANGED`: the value under reader edit `edit` would move from `was` to `now`.
 * - `W_VALUES_DIFFER`: values from different sources differ in a column of a step.
 * - `W_FAN_OUT`, `W_UNMATCHED`: `rows` of step `step` name several elements, or meet nothing.
 * - `W_UNTOUCHED`: `nodes` of the space a merge folds into that no row reached.
 * - `W_PARALLEL_EDGES`: step `step` joins `pairs` end pairs an earlier edge already joins.
 * - `W_SELF_LOOPS`: step `step` makes `count` edges whose two ends are one node.
 * - `W_ROWS_DIFFER`: `keys` repeated keys of step `step` hold different values in `column`.
 * - `W_NODE_NAMED_ONLY`: `source`'s edges name `nodes` of its own space its node rows lack.
 * - `W_EDGE_END_MISSING`: `ends` edge ends of step `step` found no node in `space`.
 * - `W_KEY_EMPTY`, `W_VALUE_HUB`, `E_EDGE_KEY_COLLISION`: what the build reports.
 *
 * A step's count is reported when the draft makes it: for a new or edited step, or a count that
 * moved. OPEN UNION: codes may be added.
 * @experimental source-steps
 */
export type SourceDraftPreviewIssue =
    | {
          /** The code. */
          readonly code: "W_STEP_REMOVED";
          /** Its parameters. */
          readonly params: {
              /** The step's place. */
              readonly step: number;
              /** Why it went. */
              readonly reason: "source-removed" | "step-removed" | "source-held";
              /** The source. */
              readonly source: SourceKey;
          };
      }
    | {
          /** The code. */
          readonly code: "W_REFERENCE_UNBOUND";
          /** Its parameters. */
          readonly params: {
              /** The element the reference names. */
              readonly ref: SourceElementRef;
          };
      }
    | {
          /** The code. */
          readonly code: "W_FILTER_HELD";
          /** Its parameters. */
          readonly params: {
              /** The filter condition's id. */
              readonly filter: string;
              /** The column. */
              readonly column: Path;
          };
      }
    | Extract<
          SourceRefreshIssue,
          {
              /** The code. */
              readonly code: "W_EDIT_SOURCE_CHANGED";
          }
      >
    | SourceValuesDiffer
    | {
          /** The code. */
          readonly code: "W_FAN_OUT";
          /** Its parameters. */
          readonly params: {
              /** The step's place. */
              readonly step: number;
              /** How many rows. */
              readonly rows: number;
          };
      }
    | {
          /** The code. */
          readonly code: "W_UNMATCHED";
          /** Its parameters. */
          readonly params: {
              /** The step's place. */
              readonly step: number;
              /** How many rows. */
              readonly rows: number;
          };
      }
    | {
          /** The code. */
          readonly code: "W_UNTOUCHED";
          /** Its parameters. */
          readonly params: {
              /** The step's place. */
              readonly step: number;
              /** How many nodes. */
              readonly nodes: number;
          };
      }
    | {
          /** The code. */
          readonly code: "W_PARALLEL_EDGES";
          /** Its parameters. */
          readonly params: {
              /** The step's place. */
              readonly step: number;
              /** How many end pairs. */
              readonly pairs: number;
          };
      }
    | {
          /** The code. */
          readonly code: "W_SELF_LOOPS";
          /** Its parameters. */
          readonly params: {
              /** The step's place. */
              readonly step: number;
              /** How many edges. */
              readonly count: number;
          };
      }
    | {
          /** The code. */
          readonly code: "W_ROWS_DIFFER";
          /** Its parameters. */
          readonly params: {
              /** The step's place. */
              readonly step: number;
              /** The column. */
              readonly column: string;
              /** How many keys. */
              readonly keys: number;
          };
      }
    | {
          /** The code. */
          readonly code: "W_NODE_NAMED_ONLY";
          /** Its parameters. */
          readonly params: {
              /** The step's place. */
              readonly step: number;
              /** The source. */
              readonly source: SourceKey;
              /** How many nodes. */
              readonly nodes: number;
          };
      }
    | {
          /** The code. */
          readonly code: "W_EDGE_END_MISSING";
          /** Its parameters. */
          readonly params: {
              /** The step's place. */
              readonly step: number;
              /** The id space. */
              readonly space: SourceSpaceName;
              /** How many edge ends. */
              readonly ends: number;
          };
      }
    | {
          /** The code. */
          readonly code: "W_KEY_EMPTY";
          /** Its parameters. */
          readonly params: {
              /** The source. */
              readonly source: SourceKey;
              /** The column. */
              readonly column: string;
              /** How many rows. */
              readonly rows: number;
          };
      }
    | {
          /** The code. */
          readonly code: "W_VALUE_HUB";
          /** Its parameters. */
          readonly params: {
              /** The source. */
              readonly source: SourceKey;
              /** The column. */
              readonly column: string;
              /** The key value. */
              readonly value: string;
              /** How many rows. */
              readonly rows: number;
          };
      }
    | {
          /** The code. */
          readonly code: "E_EDGE_KEY_COLLISION";
          /** Its parameters. */
          readonly params: {
              /** The source that made the edges. */
              readonly load: SourceKey;
              /** The edge key. */
              readonly key: string;
              /** The places of the steps that make the key. */
              readonly steps: readonly number[];
          };
      };

/**
 * What a draft would do, as `draft.preview()` returns it (design 5.3, 5.6): the difference between
 * the committed build and the draft's, counted over every row. Its `after` is what the graph holds
 * once the draft is committed.
 *
 * ```ts
 * const p = draft.preview();
 * p.after.nodes - p.before.nodes; // nodes the commit adds
 * p.steps.find((s) => s.op === "join.merge")?.buckets?.merged; // nodes it merges
 * if (!p.issues.some((i) => i.code.startsWith("E_"))) await draft.commit();
 * ```
 * @experimental source-steps
 */
export interface SourceDraftPreview {
    /** The draft it describes. */
    readonly draft: string;
    /** The committed graph. */
    readonly before: SourceDraftPreviewTotals;
    /** The graph once committed. */
    readonly after: SourceDraftPreviewTotals;
    /** How the draft changes the nodes. */
    readonly nodes: SourceDraftPreviewChanges;
    /** How the draft changes the edges. */
    readonly edges: SourceDraftPreviewChanges;
    /** Every step of the draft, with its buckets and their change from the committed counts. */
    readonly steps: readonly SourceDraftPreviewStep[];
    /** Every source of the draft or the committed project. */
    readonly sources: readonly SourceDraftPreviewSource[];
    /** Each reader edit of the draft, with its state. */
    readonly edits: readonly ReaderEditRow[];
    /** The outcomes the draft reports. */
    readonly issues: readonly SourceDraftPreviewIssue[];
    /**
     * The key-overlap questions still open, in a draft opened with `askOverlap`; `commit()` is
     * refused while any is. Always empty otherwise.
     */
    readonly questions: readonly SourceOverlapQuestion[];
    /**
     * The rows behind one count of one step (design 5.4): one entry per thing the count counted, so
     * `total` is the count. Each names the row read, the key it matched by, the element it reached
     * and that element's values in the committed graph (`held`) and in the draft (`shown`).
     * @param query - The step, the count, a name for a count kept by name, and the page.
     * @returns How many in all, and the page.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` for no such step (reason `no-step`) or count
     *   (reason `bucket`).
     */
    rows(query: SourceDraftRowsQuery): SourceDraftRows;
    /**
     * The draft elements behind one count of one step, once each: what an app selects or frames.
     * @param query - The step, the count, and a name for a count kept by name.
     * @returns Their references; an element the commit would remove is left out.
     */
    elements(query: SourceDraftElementsQuery): readonly SourceElementRef[];
    /**
     * The cells of one column where the draft's sources disagree: each source's value, the value
     * shown and whether a reader decision (a pick or an edit) shows it.
     * @param query - The column, a step, which cells and the page.
     * @returns How many cells the filter keeps, and the page.
     */
    cells(query: SourceDraftCellsQuery): SourceDraftCells;
}

/**
 * A count of a step that `preview.rows` lists: a name of {@link SourceStepCounts} that is a number
 * or kept by name.
 * @experimental source-steps
 */
export type SourceDraftBucket = keyof SourceStepCountsChange;

/**
 * Which things `preview.elements` lists.
 * @experimental source-steps
 */
export interface SourceDraftElementsQuery {
    /** The step's place, as `draft.steps()` lists it. */
    readonly step: number;
    /** The count. */
    readonly bucket: SourceDraftBucket;
    /** For a count kept by name: only this column, space or type; absent, every name. */
    readonly name?: string;
}

/**
 * Which rows `preview.rows` lists.
 * @experimental source-steps
 */
export interface SourceDraftRowsQuery extends SourceDraftElementsQuery {
    /** How many to skip; default 0. */
    readonly offset?: number;
    /** How many to return at most; absent returns the rest. */
    readonly limit?: number;
}

/**
 * One thing a step's count counted, as `preview.rows` lists it.
 * @experimental source-steps
 */
export interface SourceDraftRow {
    /** The source whose row it is. */
    readonly source: SourceKey;
    /** The row's table; null for a count of elements or keys. */
    readonly table: "nodes" | "edges" | null;
    /** The row's place in its table; null for a count of elements or keys. */
    readonly row: number | null;
    /**
     * The key it matched by: the row's value in the column `draft.exclude` reads for the step, else
     * the counted key or the element's key.
     */
    readonly key: SourceCellValue | null;
    /** For a count kept by name: its column, space or type. */
    readonly name: string | null;
    /** The element it reached in the draft; null when the draft holds none. */
    readonly element: SourceElementRef | null;
    /** That element's values in the committed graph; null when the committed graph holds none. */
    readonly held: Readonly<Record<string, SourceValue>> | null;
    /** The row as read; null for a count of elements or keys. */
    readonly incoming: Readonly<Record<string, SourceCellValue | undefined>> | null;
    /** The element's values in the draft; null when the draft holds none. */
    readonly shown: Readonly<Record<string, SourceValue>> | null;
    /**
     * `"added"`: the committed graph holds no such element; `"changed"` or `"unchanged"`: its values
     * moved or not; `"removed"`: the commit takes it out; `"left-out"`: the row built nothing.
     */
    readonly effect: "added" | "changed" | "removed" | "unchanged" | "left-out";
    /** The outcomes the count is reported under (`W_FAN_OUT`, `W_UNMATCHED`, `W_VALUES_DIFFER`, ...). */
    readonly codes: readonly SourceDraftPreviewIssue["code"][];
}

/**
 * A page of `preview.rows`.
 * @experimental source-steps
 */
export interface SourceDraftRows {
    /** How many the count counted: the step's count, or its count for `name`. */
    readonly total: number;
    /** The page's rows. */
    readonly rows: readonly SourceDraftRow[];
}

/**
 * Which cells `preview.cells` lists.
 * @experimental source-steps
 */
export interface SourceDraftCellsQuery {
    /** The column. */
    readonly column: string;
    /** Only cells this step counts under its Values differ (see {@link SourceConflict.steps}). */
    readonly step?: number;
    /** `"all"` (default), `"open"`: no reader decision, or `"decided"`. */
    readonly only?: "all" | "open" | "decided";
    /** How many to skip; default 0. */
    readonly offset?: number;
    /** How many to return at most; absent returns the rest. */
    readonly limit?: number;
}

/**
 * One conflicting cell of a draft, as `preview.cells` lists it.
 * @experimental source-steps
 */
export interface SourceDraftCell extends SourceConflict {
    /** A reader decision (a pick or an edit) shows the value. */
    readonly decided: boolean;
}

/**
 * A page of `preview.cells`.
 * @experimental source-steps
 */
export interface SourceDraftCells {
    /** How many cells the filter keeps. */
    readonly total: number;
    /** The page's cells. */
    readonly cells: readonly SourceDraftCell[];
}

/**
 * Which cells `draft.pickAll` takes one source's value for.
 * @experimental source-steps
 */
export interface SourcePickAllOptions {
    /** The column. */
    readonly column: string;
    /** The source whose value to take. Give this or `otherThan`. */
    readonly source?: SourceKey;
    /**
     * Instead of `source`: in each cell, take the value of the first source other than this one, in
     * {@link SourceConflict.values} order. Passing a merge's incoming source takes the value held
     * before it, whichever source holds it in each cell.
     */
    readonly otherThan?: SourceKey;
    /** `"open"` (default): cells no reader decision settles; `"decided"`; `"all"`. */
    readonly only?: "all" | "open" | "decided";
    /** Only cells this step counts under its Values differ (see {@link SourceConflict.steps}). */
    readonly step?: number;
    /** Only these elements' cells, such as the rows selected in a cell list. */
    readonly refs?: readonly SourceElementRef[];
}

/**
 * Which picks `draft.clearPicks` takes back.
 * @experimental source-steps
 */
export interface SourceClearPicksOptions {
    /** The column. */
    readonly column: string;
    /** Only these elements' picks; absent, every pick in the column. */
    readonly refs?: readonly SourceElementRef[];
}

/**
 * The kind of a step: add a source's rows, merge one space into another, write node or edge
 * values, or make edges. OPEN UNION: kinds may be added.
 * @experimental source-steps
 */
export type SourceStepOp = "join.add" | "join.merge" | "join.node-values" | "join.edge-values" | "join.edges";

/**
 * A step as `data.steps()` lists it, with its counts in the committed build.
 * @experimental source-steps
 */
export interface SourceStepRow {
    /** Its place in the ordered list, from 0. */
    readonly index: number;
    /** Its kind. */
    readonly op: SourceStepOp;
    /** The source it reads. */
    readonly source: SourceKey;
    /** The columns it reads its keys, ends and roles from. */
    readonly reads: readonly Path[];
    /** The id spaces it writes nodes in. */
    readonly spaces: readonly SourceSpaceName[];
    /** The types its source's rules give what it builds. */
    readonly types: readonly SourceTypeName[];
    /** The reader turned it off: kept but not built. */
    readonly off: boolean;
    /** A source it depends on is held, or it misses a column (`missing`), so it is not built. */
    readonly held: boolean;
    /** The columns it reads that its sources' rows no longer hold; a step missing one is held. */
    readonly missing: readonly SourceRefreshIssue[];
    /** Its counts in the committed build; null when it was not built. */
    readonly buckets: SourceStepCounts | null;
    /** One `W_VALUES_DIFFER` per column whose values from different sources differ at this step. */
    readonly valuesDiffer: readonly SourceValuesDiffer[];
    /**
     * The rows it leaves out (its excluded list): the column `draft.exclude` reads and the keys
     * listed, which `draft.include` takes off; null when it leaves none out.
     */
    readonly except: SourceRowFilter | null;
    /**
     * For a step a join act made (`draft.merge`, or `draft.connect` on node rows): that act's
     * fields and choices, read back so an application can show the step as it was made and make it
     * again with a field or the act changed (`draft.removeStep`, then the new act, in one draft).
     * Null for any other step. Its Values differ rules are in `valuesDiffer`, its excluded keys in
     * `except`.
     */
    readonly act: SourceStepAct | null;
}

/**
 * A join step read back as the act that makes it (see {@link SourceStepRow.act}).
 * @example
 * ```ts
 * const merge = session.data.steps().find((s) => s.act?.act === "merge");
 * merge?.act?.from; // { source: "hr", field: "badge" }
 * merge?.act?.into; // { space: "person" }
 * ```
 * @experimental source-steps
 */
export interface SourceStepAct {
    /** `"connect"` for Make an edge, `"merge"` for Merge 2 into 1. */
    readonly act: "connect" | "merge";
    /** Field 2: the source the step reads and the column it matches on. */
    readonly from: SourceField;
    /**
     * Node 1: the space it lives in, with the source and column a value translates through when
     * the step matches on a column that is not node 1's key. `connect` and `merge` take it as it is.
     */
    readonly into: SourceJoinInto & {
        /** The id space node 1 lives in. */
        readonly space: SourceSpaceName;
    };
    /** Make an edge: which way the edges run, as `connect` takes it. */
    readonly direction?: "into-from" | "from-into";
    /** Make an edge: the type its edges carry, when one was given. */
    readonly edgeType?: SourceTypeName;
    /** Values that differ only in case match. */
    readonly ignoreCase: boolean;
    /** Values that differ only in spaces match. */
    readonly ignoreSpaces: boolean;
    /** Which row a key the source repeats keeps; null when `aggregate` settles it or nothing was set. */
    readonly repeated: "first" | "last" | "both" | null;
    /** The columns reduced over a repeated key's rows; null for none. */
    readonly aggregate: Readonly<Record<string, JoinReduce>> | null;
    /** Merge: what becomes of source 2's rows that meet no node 1. */
    readonly unmatchedFrom?: "keep" | "drop";
}

/**
 * `W_VALUES_DIFFER`: values from different sources differ in one column of one step.
 * @experimental source-steps
 */
export interface SourceValuesDiffer {
    /** The code. */
    readonly code: "W_VALUES_DIFFER";
    /** Its parameters. */
    readonly params: {
        /** The step's place. */
        readonly step: number;
        /** The column. */
        readonly column: string;
        /** How many cells differ. */
        readonly count: number;
        /** The step's rule for the column. */
        readonly rule: SourceClashRule;
        /** How many of those cells a reader decision (a pick or an edit) settles. */
        readonly decided: number;
        /**
         * The rules the column takes: every rule but `min`, `max` and `mean` always; `min` and
         * `max` when every value that meets is a number or every one a date, `mean` when every one
         * is a number. `draft.editStep` refuses any other with `E_CLASH_RULE_TYPE`.
         */
        readonly rules: readonly SourceClashRule[];
    };
}

/**
 * An id space as `data.spaces()` lists it.
 * @experimental source-steps
 */
export interface SourceSpaceRow {
    /** The space's name. */
    readonly space: SourceSpaceName;
    /** How many nodes the build holds in it. */
    readonly nodes: number;
    /** The sources whose rows built or named its nodes. */
    readonly sources: readonly SourceKey[];
    /**
     * For a source's own space, the one its rows are keyed in when no space is named: that source.
     * Absent for a space a consumer named.
     */
    readonly ownedBy?: SourceKey;
}

/**
 * A reader operation as `data.edits()` lists it.
 * @experimental source-steps
 */
export interface ReaderEditRow {
    /** The operation's id: what `data.removeEdit` takes. */
    readonly id: string;
    /** `"add"` a node, `"add-edge"`, `"remove"` a node or edge, or `"edit"` one cell. */
    readonly op: "add" | "add-edge" | "remove" | "edit";
    /** The node (`{ space, key }`) or edge (`{ load, key }`: the source that made it, and its key there) it names. */
    readonly target:
        | {
              /** The id space the node's key lives in. */
              readonly space: SourceSpaceName;
              /** The node's key. */
              readonly key: string;
          }
        | {
              /** The source that made the edge. */
              readonly load: SourceKey;
              /** The edge's key within that source. */
              readonly key: string;
          };
    /** For an edit: the column it writes. */
    readonly column?: string;
    /** For an edit: the value it writes. */
    readonly value?: SourceCellValue;
    /** For a pick: the source whose value it took. */
    readonly picked?: SourceKey;
    /**
     * For an edit: `"applies"`, `"lost"` (it names no element now) or `"source-changed"` (the value
     * under it moved since it was made; settle it with `data.settleEdit`).
     */
    readonly state?: "applies" | "lost" | "source-changed";
    /** For `"source-changed"`: the value it was made over (for a pick, the value it took). */
    readonly was?: SourceValue | null;
    /** For `"source-changed"`: what the source says now. */
    readonly now?: SourceValue | null;
}

/**
 * One cell of a source's rows as read: text, a number, a truth value or empty.
 * @experimental source-steps
 */
export type SourceCellValue = string | number | boolean | null;

/**
 * Where a source stands in the build: `"staged"` (no step reads it), `"built"`, `"off"` (every
 * step reading it is off) or `"held"` (its rows cannot be read).
 * @experimental source-steps
 */
export type SourceBuildState = "staged" | "built" | "off" | "held";

/**
 * A type declared in the type registry, and the rules that give elements it. A type is declared,
 * never guessed; an element has one type.
 * @experimental source-steps
 */
export interface SourceTypeEntry {
    /** The type's id, read as `graphty.type`. */
    readonly name: SourceTypeName;
    /** Whether nodes or edges carry it. */
    readonly kind: "node" | "edge";
    /** The type's default name for a reader; absent means `name`. An application may show it or replace it. */
    readonly plainName?: string;
    /** Which rows or ends of which source carry the type. */
    readonly rules: readonly SourceTypeRule[];
    /** What the type's elements are expected to carry, by column; kept and saved, not checked by the build. */
    readonly schema?: Readonly<Record<string, unknown>>;
}

/**
 * One rule of a {@link SourceTypeEntry}: every row of a source, or only some of them. A rule naming
 * a column and its values wins over a whole-source rule; otherwise registry order decides.
 * @experimental source-steps
 */
export interface SourceTypeRule {
    /** The id of the source whose rows the rule types. */
    readonly source: SourceKey;
    /** With `values`: only rows whose cell in this column is listed. */
    readonly column?: string;
    /** With `column`: the cell values that give the type. */
    readonly values?: readonly SourceCellValue[];
    /** Only the nodes the source's edges reach at this end. */
    readonly end?: "source" | "target";
    /** Only what the `join.edges` step with this `part` makes. */
    readonly part?: number;
}

/**
 * A node named by its id space and key.
 * @experimental source-steps
 */
export interface SourceNodeRef {
    /** The id space the key lives in. */
    readonly space: SourceSpaceName;
    /** The key, as text. */
    readonly key: string;
}

/**
 * An edge named by the source that made it and its key there.
 * @experimental source-steps
 */
export interface SourceEdgeRef {
    /** The source that made the edge. */
    readonly load: SourceKey;
    /** The edge's key within that source: its edge id, or `<part>/<key>` for an edge a step made. */
    readonly key: string;
}

/**
 * A node (`{ space, key }`) or an edge (`{ load, key }`).
 * @experimental source-steps
 */
export type SourceElementRef = SourceNodeRef | SourceEdgeRef;

/**
 * A built element's value for one cell: a cell as read, or the list an aggregate gathered.
 * @experimental source-steps
 */
export type SourceValue = SourceCellValue | readonly SourceCellValue[];

/**
 * How a step settles a cell another source already filled: `"keep"` (the default) keeps the
 * value shown, `"overwrite"` takes the new one, `"both"` keeps both (the new one under
 * `<column> (<source id>)`), `"min"`, `"max"` and `"mean"` compute over numbers, `"vote"` takes the
 * value most sources hold.
 * @experimental source-steps
 */
export type SourceClashRule = "keep" | "overwrite" | "both" | "min" | "max" | "mean" | "vote";

/**
 * A column of one source.
 * @experimental source-steps
 */
export interface SourceField {
    /** The source. */
    readonly source: SourceKey;
    /** The column. */
    readonly field: string;
}

/**
 * The nodes a merge or Make an edge joins onto ("node 1"): a source's nodes by its key, or by
 * another field of it (translated through its rows); or every node of an id space. For a source
 * that holds only edges, `space` names which end's nodes `field` belongs to.
 * @experimental source-steps
 */
export type SourceJoinInto =
    | {
          /** The source whose nodes are joined onto. */
          readonly source: SourceKey;
          /** The field of the source naming them; absent, its key. */
          readonly field?: string;
          /** For a source that holds only edges: the space of the end whose nodes `field` names. */
          readonly space?: SourceSpaceName;
      }
    | {
          /** The id space whose every node is joined onto. */
          readonly space: SourceSpaceName;
          /** Never set: the space names the nodes. */
          readonly source?: undefined;
          /** Never set: the space names the nodes. */
          readonly field?: undefined;
      };

/**
 * The two fields a Merge or Make an edge would compare, for `data.matchCounts` and
 * `data.matchValues`: field 2 on the incoming source, and node 1 as a merge names it.
 * @experimental source-steps
 */
export interface SourceMatchPair {
    /** The incoming source and the field naming node 1 (side 2). */
    readonly from: SourceField;
    /** The nodes it would join onto (side 1): a space's keys, a source's key, or a field of it. */
    readonly into: SourceJoinInto;
}

/**
 * How the keys of `data.matchCounts` compare. Both default to false.
 * @experimental source-steps
 */
export interface SourceMatchOptions {
    /** Compare keys ignoring case. */
    readonly ignoreCase?: boolean;
    /** Compare keys ignoring spaces. */
    readonly ignoreSpaces?: boolean;
}

/**
 * Live match counts of two fields, counted by hashing both columns with no build (design 5.2).
 * Side 1 is node 1 (`into`), side 2 the incoming field (`from`); a key counts once however many
 * rows hold it.
 * @experimental source-steps
 */
export interface SourceMatchCounts {
    /** Keys both sides hold. */
    readonly matched: number;
    /** Keys only side 1 holds: node 1s no row would reach. */
    readonly only1: number;
    /** Keys only side 2 holds: values naming no node 1. */
    readonly only2: number;
    /** Keys reaching more than one node 1 (rows of one node holding a key count once). */
    readonly repeated1: number;
    /** Keys side 2 holds more than once. */
    readonly repeated2: number;
    /** Rows of side 2 whose key reaches more than one node 1: they name several nodes, so merge nothing. */
    readonly fanOut: number;
    /** Rows of side 2 that match nothing as text but would as numbers, such as `"007"` against `7`. */
    readonly textVersusNumber: number;
    /** How many more keys would match with `ignoreCase` on; null while it is on. */
    readonly moreWithIgnoreCase: number | null;
    /** How many more keys would match with `ignoreSpaces` on; null while it is on. */
    readonly moreWithIgnoreSpaces: number | null;
}

/**
 * Which values `data.matchValues` lists, and which page of them.
 * @experimental source-steps
 */
export interface SourceMatchValuesOptions extends SourceMatchOptions {
    /** Keep only values both sides hold, only side 1's, or only side 2's; absent keeps all. */
    readonly only?: "matched" | "only1" | "only2";
    /** How many values to skip; default 0. */
    readonly offset?: number;
    /** How many values to return at most; absent returns the rest. */
    readonly limit?: number;
}

/**
 * One value of the value-overlap list.
 * @experimental source-steps
 */
export interface SourceMatchValue {
    /** The value as first read, from side 1 when it holds it. */
    readonly value: SourceCellValue;
    /** How many nodes or rows of side 1 hold it. */
    readonly count1: number;
    /** How many rows of side 2 hold it. */
    readonly count2: number;
}

/**
 * A page of the value-overlap list: values most held first, ties in the order first read.
 * @experimental source-steps
 */
export interface SourceMatchValues {
    /** How many values the `only` filter keeps in all. */
    readonly total: number;
    /** The page. */
    readonly values: readonly SourceMatchValue[];
}

/**
 * Rows named by one column's values.
 * @experimental source-steps
 */
export interface SourceRowFilter {
    /** The column. */
    readonly column: string;
    /** The values; a row whose cell is one of them is named. */
    readonly values: readonly SourceCellValue[];
}

/**
 * `data.setRole` under the source-steps experiment (design 3.9): a weight or time role is a member
 * of one source's mapping, read from that source's own rows. A role written while no source is
 * built is kept as the setting, and becomes the role of the next source loaded that carries the
 * column.
 * @experimental source-steps
 */
export interface SourceRoleOptions {
    /**
     * The source whose role it is, by the key `data.sources()` lists it with. Absent, the one
     * built source that carries the column and can carry the role.
     */
    readonly source?: string;
}

/**
 * Which elements a source-steps reading counts: those one source supplied, and those of one type
 * (design 3.8, 8.4). Both narrow together.
 * @experimental source-steps
 */
export interface SourceElementsFilter {
    /** The source, by the key `data.sources()` lists it with. */
    readonly source?: string;
    /** The type, as `data.types()` names it; null for untyped elements. */
    readonly type?: string | null;
}

/**
 * `data.merge`: fold each node of a source into the node its field names.
 * @experimental source-steps
 */
export interface SourceMergeOptions {
    /** The source whose nodes fold in, and the field naming the node each folds into. */
    readonly from: SourceField;
    /** The nodes they fold into. */
    readonly into: SourceJoinInto;
    /** A node of `from` that names no node: `"keep"` (default) keeps it, `"drop"` leaves it out. */
    readonly unmatchedFrom?: "keep" | "drop";
    /** How a cell both sides fill is settled, for every column or per column (`"*"` for the rest). */
    readonly clash?: SourceClashRule | Readonly<Record<string, SourceClashRule>>;
    /** Two rows naming one node: `"first"` (default) or `"last"` wins. */
    readonly repeated?: "first" | "last";
    /** Rows that stay their own nodes. */
    readonly except?: SourceRowFilter;
    /** Match keys ignoring case. */
    readonly ignoreCase?: boolean;
    /** Match keys ignoring spaces. */
    readonly ignoreSpaces?: boolean;
}

/**
 * `data.connect` (Make an edge): each node row of a source becomes an edge between its node and
 * the node its field names.
 * @experimental source-steps
 */
export interface SourceConnectOptions {
    /** The source whose rows become edges, and the field naming the node at the other end. */
    readonly from: SourceField;
    /** The nodes the field names. */
    readonly into: SourceJoinInto;
    /** `"into-from"` (default) runs each edge from the named node to the source's node. */
    readonly direction?: "into-from" | "from-into";
    /** The type the new edges are declared with. */
    readonly edgeType?: SourceTypeName;
    /** Match keys ignoring case. */
    readonly ignoreCase?: boolean;
    /** Match keys ignoring spaces, so `" B1"` meets `B1`. */
    readonly ignoreSpaces?: boolean;
}

/**
 * `data.extract`: one column of an edge source becomes nodes, joined to one end by new edges.
 * @experimental source-steps
 */
export interface SourceExtractOptions {
    /** The column whose values become nodes. */
    readonly column: string;
    /** The id space the new nodes live in; default `type`, else the source's own space. */
    readonly space?: SourceSpaceName;
    /** The type the new nodes are declared with. */
    readonly type?: SourceTypeName;
    /** The type the new edges are declared with. */
    readonly edgeType?: SourceTypeName;
    /** Columns moved onto the new nodes. */
    readonly columns?: readonly string[];
    /** The end the new edges start from; default `"source"`. */
    readonly from?: "source" | "target";
}

/**
 * `data.moveColumns`: an edge source's columns onto the nodes at one end, or onto the nodes a
 * column names in a space.
 * @experimental source-steps
 */
export interface SourceMoveColumnsOptions {
    /** The columns. */
    readonly columns: readonly string[];
    /** Where they go. */
    readonly to:
        | "source"
        | "target"
        | {
              /** The column naming the nodes. */
              readonly column: string;
              /** The id space the column's values live in. */
              readonly space: SourceSpaceName;
          };
}

/**
 * `draft.editStep`: the choices of one step a draft may change. `null` or `false` takes a choice off.
 * @experimental source-steps
 */
export interface SourceStepPatch {
    /**
     * One rule for every column, or rules for some columns (`"*"` for the rest) that keep the
     * step's rules for the other columns.
     */
    readonly clash?: SourceClashRule | Readonly<Record<string, SourceClashRule>>;
    /** The rows the step leaves out, by one column's values. */
    readonly except?: SourceRowFilter | null;
    /** Match keys ignoring case. */
    readonly ignoreCase?: boolean;
    /** Match keys ignoring spaces. */
    readonly ignoreSpaces?: boolean;
    /** Two rows naming one key: `"first"`, `"last"`, or `"both"` (an edge step only); `null` for the default. */
    readonly repeated?: "first" | "last" | "both" | null;
    /** Keep the step but build nothing from it. */
    readonly off?: boolean;
    /**
     * A merge's node 2 that names no node 1: `"keep"` keeps it as its own node, `"drop"` leaves it
     * out. Only a merge step takes it.
     */
    readonly unmatchedFrom?: "keep" | "drop";
    /**
     * Per column, how the rows of one repeated key are reduced into one value (`"first"`, `"last"`,
     * `"count"`, `"sum"`, `"min"`, `"max"`, `"mean"` or `"list"`); other columns follow `repeated`.
     * `null` takes it off. A merge, node-values or edge step takes it.
     */
    readonly aggregate?: Readonly<Record<string, JoinReduce>> | null;
}

/**
 * The columns a source's rows give each role, as `draft.setMapping` changes them.
 * @experimental source-steps
 */
export interface SourceRolePatch {
    /** The column holding each row's time, or its start time when the row spans a period. */
    readonly time?: string;
    /** The column holding each row's end time, for rows that span a period. */
    readonly timeEnd?: string;
    /** The zone a time with no zone of its own is read in, such as `"+02:00"`. */
    readonly timeParseZone?: string;
    /** The column holding each row's latitude, in degrees. */
    readonly latitude?: string;
    /** The column holding each row's longitude, in degrees. */
    readonly longitude?: string;
    /** The column holding each row's latitude and longitude together in one value. */
    readonly coordinates?: string;
    /** The column holding each row's country, to place it on a map. */
    readonly country?: string;
    /** The column holding each row's region (a state or province), to place it on a map. */
    readonly region?: string;
    /** The column holding each row's city, to place it on a map. */
    readonly city?: string;
}

/**
 * `draft.setMapping`: what a source the draft staged, added or acted on may still change while the
 * draft is open.
 * @experimental source-steps
 */
export interface SourceMappingPatch {
    /**
     * What its rows are: `"nodes"`, `"edges"` or `"both"`. Only for a source that read one table,
     * such as a CSV file. Edge rows need a column for each end, named in `edges` or already held.
     */
    readonly rows?: "nodes" | "edges" | "both";
    /** The id space its node keys live in; naming one means Add never asks the key-overlap question. */
    readonly space?: SourceSpaceName;
    /** Its node type, written as its whole-source rule; `null` for none. */
    readonly type?: SourceTypeName | null;
    /** The roles of its node rows. */
    readonly nodes?: SourceRolePatch & {
        /** The column holding each node row's key, its id in the space. */
        readonly key?: string;
    };
    /** The roles of its edge rows. */
    readonly edges?: SourceRolePatch & {
        /** The column holding the key of each edge's source node. */
        readonly source?: string;
        /** The column holding the key of each edge's target node. */
        readonly target?: string;
        /** The id space the source keys are looked up in. */
        readonly sourceSpace?: SourceSpaceName;
        /** The id space the target keys are looked up in. */
        readonly targetSpace?: SourceSpaceName;
        /** The column holding each edge row's own id. */
        readonly edgeId?: string;
        /** The column holding each edge's weight. */
        readonly weight?: string;
        /** What a larger weight means, such as `"strength"` or `"distance"`. */
        readonly weightMeaning?: string;
    };
    /**
     * The node types of its edge ends, each written as its end rule `{ source, end }`; `null` takes
     * an end's type off.
     */
    readonly endTypes?: {
        /** The type of the nodes its source ends name. */
        readonly source?: SourceTypeName | null;
        /** The type of the nodes its target ends name. */
        readonly target?: SourceTypeName | null;
    };
}

/**
 * What most of a column's filled cells read as, in a {@link SourceColumnProfile}.
 * @experimental source-steps
 */
export type SourceProfileKind = "text" | "number" | "date" | "boolean";

/**
 * One column's profile, counted over every row as read, building nothing (design 5.1, 5.2).
 * @experimental source-steps
 */
export interface SourceColumnProfile {
    /** What most of its filled cells read as; a tie reads as `"text"`. */
    readonly kind: SourceProfileKind;
    /** How many rows the table holds. */
    readonly rows: number;
    /** Filled cells that read as `kind`. */
    readonly valid: number;
    /** Empty cells. */
    readonly empty: number;
    /** Distinct filled values, compared as text after Unicode normalization. */
    readonly distinct: number;
    /** Values held by more than one row. */
    readonly repeated: {
        /** How many such values. */
        readonly keys: number;
        /** How many rows hold them. */
        readonly rows: number;
    };
    /** The first five distinct values, in the order first read. */
    readonly samples: readonly SourceCellValue[];
}

/**
 * One table of a source as read.
 * @experimental source-steps
 */
export interface SourceTablePart {
    /** Node rows or edge rows. */
    readonly table: "nodes" | "edges";
    /** How many rows. */
    readonly rows: number;
    /** Its columns, under their working names, in the order its rows hold them. */
    readonly columns: readonly string[];
}

/**
 * What a source's rows are and what reading them recorded, from `sourceTable(id).summary()`.
 * @experimental source-steps
 */
export interface SourceTableFacts {
    /** Each table it holds, node rows first. */
    readonly tables: readonly SourceTablePart[];
    /** Its copy id: `sha256:` and the digest of the bytes as read, or a minted id. */
    readonly origin: string;
    /** The data source that read it (`"csv"`, `"json"`, ...). */
    readonly format?: string;
    /** The size of what was read, in bytes; absent for a URL not fetched by the element and after a reopen. */
    readonly size?: number;
    /** When it was read, as RFC 3339; absent after a reopen. */
    readonly loadedAt?: string;
    /** A CSV file's separator, as `DraftTable.delimiter` says it; absent after a reopen. */
    readonly delimiter?: DraftTable["delimiter"];
    /** What its rows are for now: what a staged section shows and `setMapping` changes. */
    readonly mapping: SourceTableMapping;
}

/**
 * What a source's rows are for, from `sourceTable(id).summary().mapping`: the values a staged
 * section's Rows are, Key, Space, Type and edge end pickers show. A space reads only once one was
 * named (at staging or with `setMapping`); unset, Add proposes the source's type, else its own space.
 * @experimental source-steps
 */
export interface SourceTableMapping {
    /** Whether its rows are nodes, edges, or both. */
    readonly rows: "nodes" | "edges" | "both";
    /** The node key column; absent keys each row by its place. */
    readonly key?: string;
    /** The node id space, once one was named. */
    readonly space?: SourceSpaceName;
    /** The node type it was staged or set with. */
    readonly type?: SourceTypeName;
    /** Its edge rows' ends and their spaces, each space only once one was named. */
    readonly edges?: {
        /** The column naming each edge's source node. */
        readonly source: string;
        /** The column naming each edge's target node. */
        readonly target: string;
        /** The id space its source ends live in, once one was named. */
        readonly sourceSpace?: SourceSpaceName;
        /** The id space its target ends live in, once one was named. */
        readonly targetSpace?: SourceSpaceName;
        /** The edge id column; absent ids each edge by its place. */
        readonly edgeId?: string;
    };
    /** The node types of its edge ends. */
    readonly endTypes?: {
        /** The node type of its source ends. */
        readonly source?: SourceTypeName;
        /** The node type of its target ends. */
        readonly target?: SourceTypeName;
    };
}

/**
 * One source's rows as read, from `session.data.sourceTable(id)`: what a staged section and a join
 * card show before anything is built. Each call reads the rows as they are then.
 *
 * ```ts
 * const table = session.data.sourceTable(entries);
 * table.summary().tables; // [{ table: "nodes", rows: 6, columns: ["badge", "door", "entry"] }]
 * table.profile("badge"); // { kind: "text", distinct: 4, repeated: { keys: 2, rows: 4 }, ... }
 * ```
 * @experimental source-steps
 */
export interface SourceTable {
    /** The source. */
    readonly source: SourceKey;
    /**
     * Rows and columns per table, and what reading it recorded.
     * @returns The facts.
     * @throws A `GraphtyError` with `E_LOAD_UNKNOWN` once the source is gone.
     */
    summary(): SourceTableFacts;
    /**
     * One column's profile.
     * @param column - The column, by its working name.
     * @param options - Which table; absent, the table its node rows live in, else its edge rows.
     * @param options.table - The table.
     * @returns The profile.
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` `{ source, column, table }` for a column the
     *   table does not hold, or `E_LOAD_UNKNOWN` once the source is gone.
     */
    profile(column: string, options?: { readonly table?: "nodes" | "edges" }): SourceColumnProfile;
}

/**
 * How `session.data.draft()` opens a draft.
 * @experimental source-steps
 */
export interface SourceDraftOptions {
    /**
     * Whether adding a source whose keys meet nodes another source's node rows built asks the
     * key-overlap question instead of settling it (design 5.5). Asked, the source is kept separate
     * meanwhile, the question is listed in `preview().questions`, and `commit()` throws
     * `E_OVERLAP_UNANSWERED` until `answerOverlap` answers it. Default false: such an add keeps the
     * source separate and records `W_SPACE_OVERLAP` on it, as `data.add` does. An add given an
     * `overlap` is answered and never asks.
     *
     * ```ts
     * const draft = session.data.draft({ askOverlap: true });
     * draft.add(bankB);
     * for (const q of draft.preview().questions) {
     *     draft.answerOverlap(q.params.source, "merge");
     * }
     * await draft.commit();
     * ```
     */
    readonly askOverlap?: boolean;
}

/**
 * An open key-overlap question in a draft's preview (design 5.5): `source`'s `count` of `of` keys
 * meet nodes in `space` that the node rows of `sources` built (`"reader"` for nodes the reader
 * added).
 * @experimental source-steps
 */
export interface SourceOverlapQuestion {
    /** The code. */
    readonly code: "W_SPACE_OVERLAP";
    /** Its parameters. */
    readonly params: {
        /** The space the keys meet in. */
        readonly space: SourceSpaceName;
        /** How many of the source's keys meet a node there. */
        readonly count: number;
        /** How many keys the source holds. */
        readonly of: number;
        /** The source the question is about. */
        readonly source: SourceKey;
        /** The sources whose node rows built the nodes met; `"reader"` for nodes the reader added. */
        readonly sources: readonly SourceKey[];
    };
}

/**
 * A draft of the sources and steps, from `session.data.draft()`: the same acts as the data doors,
 * applied to a copy of the committed sources and steps only. Nothing changes the graph, the undo
 * history or a saved file until {@link SourceDraft.commit}, which applies everything the draft did
 * as one undoable step. One draft is open at a time; while it is open every data write and
 * `session.undo()` / `redo()` are refused with `E_DRAFT_OPEN { draft }`, and view, style, filter,
 * selection, set and note writes go ahead, as do value labels and hiding or showing columns. A project saved while a draft is open saves the committed
 * project and leaves the draft open; opening a project file or `data.clear()` discards it (opening a data file does not).
 *
 * ```ts
 * await session.data.import(entriesCsv, { key: "entry", type: "entry" });
 * const [entries] = session.data.sources();
 * const draft = session.data.draft();
 * const people = await draft.stage(peopleCsv, { key: "badge", type: "person" });
 * draft.connect({ from: { source: entries.key, field: "badge" }, into: { source: people } });
 * await draft.commit(); // one undo step
 * ```
 *
 * The acts throw what the data door of the same name throws, and leave the draft as it was.
 * `matchCounts`, `matchValues`, `sourceTable` and `profile` read as the data doors of the same
 * name do, over the draft's sources and its build: a source the draft staged can be side 2 or be
 * read.
 * @experimental source-steps
 */
export interface SourceDraft extends Pick<SessionDataApi, "matchCounts" | "matchValues" | "sourceTable" | "profile"> {
    /** The draft's id, as `E_DRAFT_OPEN` and `data:draft-changed` name it. */
    readonly id: string;
    /** Whether the draft is still open: false once committed or discarded. */
    readonly open: boolean;
    /**
     * Read a source and hold it staged in the draft (as `data.stage` does).
     * @param source - What `import` takes.
     * @param options - Its key, type, space and edge ends, and how to guess the ones left out.
     * @returns The new source's id.
     */
    stage(source: DataSourceInput, options?: StageOptions): Promise<string>;
    /**
     * Read a source and add it with its own `join.add`, as one act of the draft.
     * @param source - What `import` takes.
     * @param options - Its key, type, space and edge ends, and what a key overlap does.
     * @returns The new source's id.
     */
    import(
        source: DataSourceInput,
        options?: ImportOptions & { readonly overlap?: "separate" | "merge" },
    ): Promise<string>;
    /**
     * Add a staged source with its own `join.add` (as `data.add` does).
     * @param source - The staged source.
     * @param options - What a key overlap does: `"separate"` (default) or `"merge"`.
     * @param options.overlap - The answer.
     */
    add(source: SourceKey, options?: { readonly overlap?: "separate" | "merge" }): void;
    /**
     * Answer the key-overlap question an add asked in a draft opened with `askOverlap`: `"merge"`
     * puts the source's meeting keys, and its edge ends in that space, on the nodes they meet;
     * `"separate"` keeps them in the source's own space. An answer can be changed until the commit.
     * @param source - The source asked about, as `preview().questions` names it.
     * @param answer - The answer.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` (`details.reason` `"no-question"`) when the
     *   draft asked that source nothing.
     */
    answerOverlap(source: SourceKey, answer: "merge" | "separate"): void;
    /**
     * Merge (as `data.merge` does).
     * @param options - The source and field, the nodes they fold into, and the choices.
     */
    merge(options: SourceMergeOptions): void;
    /**
     * Make an edge (as `data.connect` does).
     * @param options - The source and field, the nodes they name, the direction and edge type.
     * @returns The part the new edges are keyed by.
     */
    connect(options: SourceConnectOptions): number;
    /**
     * Extract (as `data.extract` does).
     * @param source - The edge source.
     * @param options - The column, its space and types, and columns to move.
     * @returns The part the new edges are keyed by.
     */
    extract(source: SourceKey, options: SourceExtractOptions): number;
    /**
     * Move columns (as `data.moveColumns` does).
     * @param source - The edge source.
     * @param options - The columns and where they go.
     */
    moveColumns(source: SourceKey, options: SourceMoveColumnsOptions): void;
    /**
     * Rename a value column of one source (as `data.renameColumn` with a source does).
     * @param column - The column.
     * @param name - Its new name.
     * @param options - The source.
     * @param options.source - The source.
     * @throws A `GraphtyError` with `E_EDIT_ROLE_COLUMN` for a column a role, rule or step reads, or
     *   `E_BAD_COMMAND` (reason `name-taken`) for a name its table already carries.
     */
    renameColumn(column: ColumnRef, name: string, options: { readonly source: SourceKey }): void;
    /**
     * Declare a type, or add rules to one (as `data.declareType` does).
     * @param entry - The type and its rules.
     */
    declareType(entry: SourceTypeEntry): void;
    /**
     * Take one source's value for a cell where sources disagree (as `data.pick` does).
     * @param ref - The element.
     * @param column - The column.
     * @param source - The source whose value to take.
     */
    pick(ref: SourceElementRef, column: string, source: SourceKey): void;
    /**
     * Use one source's value for a cell: the same reader edit as {@link SourceDraft.pick}.
     * @param ref - The element.
     * @param column - The column.
     * @param source - The source whose value to use.
     */
    use(ref: SourceElementRef, column: string, source: SourceKey): void;
    /**
     * Take one source's value for many conflicting cells of a column at once: one reader edit per
     * cell, held in the draft and taken back by one `undo()`.
     * @param options - The column, the source, which cells, a step and the elements.
     * @returns How many cells it picked; 0 records nothing.
     */
    pickAll(options: SourcePickAllOptions): number;
    /**
     * Take back the picks of a column, committed or made in the draft, as one act. Typed edits stay.
     * @param options - The column and the elements.
     * @returns How many picks it took back; 0 records nothing.
     */
    clearPicks(options: SourceClearPicksOptions): number;
    /**
     * Leave rows out of a step by their keys (design 5.4): the keys `preview.rows` gives. They join
     * the step's excluded list (its `except`); an excluded row of a merge stays its own node.
     * @param step - The step's place.
     * @param keys - The keys.
     * @param options - The column the keys are in; absent, the column the step's excluded list
     *   already reads, else the one it matches rows by.
     * @param options.column - The column.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` for no such step (reason `no-step`), a
     *   `join.add` step (reason `no-except`) or a column other than the one its list reads (reason
     *   `except-column`).
     */
    exclude(step: number, keys: readonly SourceCellValue[], options?: { readonly column?: string }): void;
    /**
     * Take keys off a step's excluded list; an empty list is taken off the step.
     * @param step - The step's place.
     * @param keys - The keys.
     */
    include(step: number, keys: readonly SourceCellValue[]): void;
    /**
     * Change one step's choices: clash rules per column, rows left out, matching, repeated rows, off.
     * @param index - The step's place, as {@link SourceDraft.steps} lists it.
     * @param patch - The choices.
     * @throws A `GraphtyError` with `E_CLASH_RULE_TYPE` for a rule that orders values a column does
     *   not hold as numbers, or `E_BAD_COMMAND` for no such step or a `repeated` it cannot take.
     */
    editStep(index: number, patch: SourceStepPatch): void;
    /**
     * Delete one step (as `data.removeStep` does).
     * @param index - The step's place.
     */
    removeStep(index: number): void;
    /**
     * Move one step to another place in the build order; the steps between shift by one. Editing a
     * step's field or act removes it and makes the new act, which lands last: moving it back keeps
     * the step's place.
     *
     * ```ts
     * draft.removeStep(2);
     * draft.connect({ from: { source: entries, field: "badge" }, into: { space: "person" } });
     * draft.moveStep(draft.steps().length - 1, 2);
     * ```
     * @param index - The step's place, as {@link SourceDraft.steps} lists it.
     * @param to - Its new place.
     * @throws A `GraphtyError` with `E_BAD_COMMAND`: `details.reason` `"no-step"` for no such place,
     *   `"order"` when a step would read a source before the step that adds it.
     */
    moveStep(index: number, to: number): void;
    /**
     * Take out one source and every step that reads it.
     * @param source - The source.
     * @throws A `GraphtyError` with `E_BAD_COMMAND`, `details.reason` `"not-in-steps"`, for a
     *   source no step reads, such as one a file saved without the source-steps experiment brought
     *   in: `data.removeSource` takes that one out.
     */
    removeSource(source: SourceKey): void;
    /**
     * Take back one of the reader's edits (as `data.removeEdit` does).
     * @param id - The edit's id.
     */
    removeEdit(id: string): void;
    /**
     * Change the mapping, space or type of a source this draft staged, added or acted on.
     * @param source - The source.
     * @param patch - The change.
     * @throws A `GraphtyError` with `E_DRAFT_OPEN` for any other source.
     */
    setMapping(source: SourceKey, patch: SourceMappingPatch): void;
    /**
     * Take back the draft's newest act.
     * @returns False when there was none.
     */
    undo(): boolean;
    /**
     * Every step of the draft, with its counts in the draft's build.
     * @returns The steps.
     */
    steps(): readonly SourceStepRow[];
    /**
     * The draft's type registry.
     * @returns The declared types.
     */
    types(): readonly SourceTypeEntry[];
    /**
     * The draft's reader edits, picks included, in the order made.
     * @returns The edits.
     */
    edits(): readonly ReaderEditRow[];
    /**
     * What committing the draft would do: totals before and after, each step's buckets counted
     * over every row and their change from the committed counts, each source's counts, reader
     * edits' states and the outcomes. Builds nothing it has not built for the draft's current
     * acts, and returns the same object until the draft changes or a filter, note, pin or reader
     * edit changes what the commit would hold or unbind. Those writes fire no
     * `data:draft-changed`: read the preview again after making one.
     * @returns The preview.
     */
    preview(): SourceDraftPreview;
    /**
     * Apply everything the draft did to the graph as one undoable step, and close the draft. A
     * draft that changed nothing records nothing. Data writes waiting in line ahead of the commit
     * are refused with `E_DRAFT_OPEN`, as they are while the draft is open.
     * @returns Settles once the graph is rebuilt and drawn.
     * @throws A `GraphtyError` with `E_DRAFT_STALE { draft }` when a data write already on its way
     *   when the draft opened landed first; the draft stays open, to be discarded. Or
     *   `E_OVERLAP_UNANSWERED { space, source }` while a key-overlap question is open; the draft
     *   stays open.
     */
    commit(): Promise<void>;
    /** Close the draft, leaving the graph, the history and the saved file as they were. */
    dispose(): void;
    /** Whether the draft is drawn on the graph: set by {@link SourceDraft.display}, off at first. */
    readonly displayed: boolean;
    /** Which side of the commit a displayed draft draws: set by {@link SourceDraft.show}, `"after"` at first. */
    readonly side: "before" | "after";
    /**
     * Draw the draft on the graph, or stop. While it is drawn, every element reads the path
     * `graphty.draft` as what the commit would do to it -- `"merged"` (a node the commit folds
     * more keys into), `"new"`, `"changed"` (other values), `"removed"` or `"unchanged"` -- so a
     * style layer or a rule can show it; while it is not, the path reads nothing. It draws the
     * side {@link SourceDraft.show} picks, `"after"` at first. Nothing is recorded or saved.
     * @example
     * ```ts
     * const draft = session.data.draft();
     * draft.merge({ from: { source: "people", field: "badge" }, into: { space: "person" } });
     * await session.styles.add({
     *     name: "New",
     *     target: "node",
     *     selector: { match: "expression", where: "graphty.draft == 'new'" },
     *     set: { "node.haloColor": "#7048e8", "node.haloScale": 1.4, "node.haloOpacity": 1 },
     * });
     * await draft.display(true); // the graph as the commit would leave it, its new nodes ringed
     * await draft.show("before"); // the graph as it is now
     * ```
     * @param on - True to draw it.
     * @returns Settles once the graph draws it.
     * @throws A `GraphtyError` with `E_BAD_COMMAND` (reason `draft-closed`) once the draft is closed.
     */
    display(on: boolean): Promise<void>;
    /**
     * Choose which side of the commit a displayed draft draws. `"before"` draws the graph as it is,
     * where `graphty.draft` reads `"removed"` on what the commit would remove. `"after"` draws the
     * graph the commit would leave: what it removes is gone, what it adds is drawn and reads
     * `"new"`, and changed elements show their new values. While After is drawn, `statistics()`,
     * `legendOf` and style counts read the draft's graph; after an act on the draft it is drawn
     * afresh (await `display(true)` again to wait for it). View only: nothing is recorded or
     * listed in `session.history.pending`, the history does not move, and a save writes the
     * committed project. The draft's graph is not the project's, so while After is drawn a command
     * that would measure it or name its elements -- a run, a layout change, a pin, a note, a set,
     * hiding elements, moving a node only the draft has -- is refused with
     * `E_DRAFT_OPEN { draft, side: "after" }` until Before shows; styles, settings, views, filters
     * and moving a node the project has go ahead, and a moved node stays where it was moved.
     * Hiding or showing columns and adding a computed column go ahead too, over the committed
     * graph: After comes off while they are written and is drawn again once they are.
     * @param side - The side.
     * @returns Settles once the graph draws it.
     * @throws A `GraphtyError` with `E_BAD_COMMAND`, reason `side` for any other value, or reason
     *   `draft-closed` once the draft is closed.
     */
    show(side: "before" | "after"): Promise<void>;
}

/**
 * `data:draft-changed`: a draft opened, changed, was drawn otherwise, was committed or was discarded.
 * @experimental source-steps
 */
export interface SourceDraftChange {
    /** The draft's id. */
    readonly draft: string;
    /**
     * What happened: `"opened"` by `session.data.draft()`, `"changed"` by an act on it, `"committed"`
     * by its commit, `"discarded"` by `dispose()`, opening a project or clearing the graph, or
     * `"displayed"` by `display` or `show` changing how it is drawn.
     */
    readonly reason: "opened" | "changed" | "committed" | "discarded" | "displayed";
}

/**
 * Where one element came from.
 * @experimental source-steps
 */
export interface SourceLineage {
    /** Its type, or null for none. */
    readonly type: SourceTypeName | null;
    /** The sources that supplied it, in step order; the reader's own edits are `"reader"`. */
    readonly supplied: readonly SourceKey[];
    /** The sources that only named it (an edge end, a key a step looked up). */
    readonly named: readonly SourceKey[];
    /** Every row a step read into it: the step's place, its source and the row. */
    readonly steps: readonly {
        /** The step's place. */
        readonly step: number;
        /** The source the step read. */
        readonly source: SourceKey;
        /** The row it read. */
        readonly row: number;
    }[];
    /** The references that also reach it: merged nodes, a moved node's former place, reduced edges' rows. */
    readonly aliases: readonly SourceElementRef[];
    /** The types other steps would have given it. */
    readonly otherTypes: readonly (SourceTypeName | null)[];
    /** The ids of the reader's edits on it. */
    readonly reader: readonly string[];
}

/**
 * Every source's value for one cell, and the one shown.
 * @experimental source-steps
 */
export interface SourceCellValues {
    /** Each source's value, in step order, then the values a merge kept only in the lineage. */
    readonly list: readonly {
        /** The source that holds the value. */
        readonly source: SourceKey;
        /** The value. */
        readonly value: SourceValue;
        /** The place of the step that read it. */
        readonly step?: number;
        /** The row of the source it was read from. */
        readonly row?: number;
        /** For a value a merge kept only in the lineage: the key of the node it came from. */
        readonly from?: SourceNodeRef["key"];
    }[];
    /** The value shown. */
    readonly shown: SourceValue | null;
    /** The source whose value shows, `"reader"` for a reader edit, or `"rule:mean"` for a computed value. */
    readonly origin: SourceKey | null;
    /** Whether the sources hold different values. */
    readonly disagree: boolean;
}

/**
 * What one cell holds: a value (`edited` when a reader edit set it), empty while a supplying
 * source has the column, or not carried by any.
 * @experimental source-steps
 */
export type SourceCellState =
    | {
          /** The cell holds a value. */
          readonly state: "value";
          /** The value. */
          readonly value: SourceValue;
          /** Set when a reader edit wrote the value. */
          readonly edited?: true;
      }
    | {
          /** A supplying source has the column, but the cell is empty. */
          readonly state: "empty";
      }
    | {
          /** No supplying source has the column. */
          readonly state: "not-carried";
      };

/**
 * One cell where supplying sources hold different values.
 * @experimental source-steps
 */
export interface SourceConflict {
    /** The element. */
    readonly ref: SourceElementRef;
    /** The place of the step whose rule settles the cell. */
    readonly step: number;
    /**
     * The places of the steps that count the cell under their Values differ: each step whose value
     * differed from the one shown before it.
     */
    readonly steps: readonly number[];
    /** The column. */
    readonly column: string;
    /** Each source's value. */
    readonly values: readonly {
        /** The source. */
        readonly source: SourceKey;
        /** Its value. */
        readonly value: SourceValue;
    }[];
    /** The value shown. */
    readonly shown: SourceValue | null;
    /** What shows the value: the rule, or `"reader"` for a reader decision (a pick or an edit). */
    readonly by: SourceClashRule | "reader";
    /** The step's rule for the column, under any reader decision. */
    readonly rule: SourceClashRule;
}

/**
 * Which conflicts `data.conflicts` lists.
 * @experimental source-steps
 */
export interface SourceConflictQuery {
    /** Only cells this step counts (see {@link SourceConflict.steps}). */
    readonly step?: number;
    /** Only this column. */
    readonly column?: string;
    /** Only cells this source holds a value for. */
    readonly source?: SourceKey;
    /** `"open"`: no reader decision; `"decided"`: a reader decision shows the value. */
    readonly only?: "open" | "decided";
}

/**
 * What a removal, refresh or replace reports under the source-steps experiment, as a code and its
 * parameters:
 *
 * - `E_COLUMN_MISSING`: a step (`step`) or a type rule (`type`) of `source` reads `column` of
 *   `table`, which the new rows no longer hold. The step is held (listed `off`, not built) until
 *   `data.resolveStep` names a column for it or a later refresh brings the column back.
 * - `E_READ_ROLE_MISSING`: the same for a weight, time or location `role`; `data.resolveStep`
 *   can also clear the role.
 * - `W_COLUMN_UNUSED`: the new rows bring `column`, which the old ones did not.
 * - `W_STEP_REMOVED`: the step at `step` went with removed `source`.
 * - `W_EDIT_SOURCE_CHANGED`: the value under reader edit `edit` moved from `was` to `now` (for a
 *   pick, `picked` names the source it took from); `data.settleEdit` follows, keeps or drops it.
 * - `W_REFERENCE_UNBOUND`: a note, a pin or a reader edit names `ref`, which the rebuilt graph no
 *   longer holds. The reference is kept, and binds again when Undo brings the element back.
 *
 * OPEN UNION: codes may be added.
 * @experimental source-steps
 */
export type SourceRefreshIssue =
    | {
          /** The code. */
          readonly code: "E_COLUMN_MISSING";
          /** Its parameters. */
          readonly params: {
              /** The source whose rows lost the column. */
              readonly source: SourceKey;
              /** The column. */
              readonly column: string;
              /** The table that held it. */
              readonly table: "nodes" | "edges";
              /** The place of the step that reads it. */
              readonly step?: number;
              /** The type whose rule reads it. */
              readonly type?: SourceTypeName;
          };
      }
    | {
          /** The code. */
          readonly code: "E_READ_ROLE_MISSING";
          /** Its parameters. */
          readonly params: {
              /** The place of the step that reads the role. */
              readonly step: number;
              /** The source whose rows lost the column. */
              readonly source: SourceKey;
              /** The column. */
              readonly column: string;
              /** The role read from it. */
              readonly role: SourceRoleName;
              /** The table that held it. */
              readonly table: "nodes" | "edges";
          };
      }
    | {
          /** The code. */
          readonly code: "W_COLUMN_UNUSED";
          /** Its parameters. */
          readonly params: {
              /** The source whose new rows bring the column. */
              readonly source: SourceKey;
              /** The column. */
              readonly column: string;
          };
      }
    | {
          /** The code. */
          readonly code: "W_STEP_REMOVED";
          /** Its parameters. */
          readonly params: {
              /** The removed step's place. */
              readonly step: number;
              /** Why it went. */
              readonly reason: "source-removed";
              /** The removed source. */
              readonly source: SourceKey;
          };
      }
    | {
          /** The code. */
          readonly code: "W_EDIT_SOURCE_CHANGED";
          /** Its parameters. */
          readonly params: {
              /** The reader edit's id. */
              readonly edit: ReaderEditRow["id"];
              /** The value under the edit before. */
              readonly was: SourceValue | null;
              /** The value under the edit now. */
              readonly now: SourceValue | null;
              /** For a pick: the source it took from. */
              readonly picked?: SourceKey;
          };
      }
    | {
          /** The code. */
          readonly code: "W_REFERENCE_UNBOUND";
          /** Its parameters. */
          readonly params: {
              /** The element the reference names. */
              readonly ref: SourceElementRef;
          };
      };

/**
 * A weight, time or location role a step reads from a column. OPEN UNION: roles may be added.
 * @experimental source-steps
 */
export type SourceRoleName =
    "weight" | "time" | "timeEnd" | "latitude" | "longitude" | "coordinates" | "country" | "region" | "city";

/**
 * How the reader settles an edit whose source moved under it: `"follow"` takes the picked
 * source's new value (a pick only), `"keep"` keeps the edit's value as the reader's own, `"drop"`
 * takes the edit back.
 * @experimental source-steps
 */
export type SourceEditChoice = "follow" | "keep" | "drop";

/**
 * A held step's way out: `column` names a column of the new rows that takes the vanished name;
 * `none` clears a vanished weight, time or location role.
 * @experimental source-steps
 */
export type SourceStepResolution =
    | {
          /** The column of the new rows that takes the vanished name. */
          readonly column: string;
      }
    | {
          /** Clear the vanished role. */
          readonly none: true;
      };

/**
 * A key overlap a source met when it was added: its keys meet nodes another source built in the
 * space it proposed. Unless the load asked for `overlap: "merge"`, its keys stay in its own space.
 * @experimental source-steps
 */
export interface SourceSpaceOverlap {
    /** The code. */
    readonly code: "W_SPACE_OVERLAP";
    /** Its parameters. */
    readonly params: {
        /** The space the keys met in. */
        readonly space: SourceSpaceName;
        /** How many of the source's keys met a node there. */
        readonly count: number;
        /** How many keys the source holds. */
        readonly of: number;
        /** For an untyped source: the other source whose own space holds the same keys. */
        readonly other?: SourceKey;
    };
}

/** A node record to add: its id is read through `data.knownFields.nodeIdPath`. */
export type NodeRecordInput = Readonly<Record<string, unknown>>;

/** An edge record to add: its endpoints are read through the edge id paths; its id is assigned. */
export type EdgeRecordInput = Readonly<Record<string, unknown>>;

/**
 * A graph as column arrays, for `session.data.importColumns`. Every array may be a plain array or
 * a typed array.
 */
export interface ImportColumnsInput {
    /** Each edge's source, as a node row number from 0 to `nodeCount - 1`. */
    readonly sources: ArrayLike<number>;
    /** Each edge's target, as a node row number; as long as `sources`. */
    readonly targets: ArrayLike<number>;
    /** How many nodes there are. */
    readonly nodeCount: number;
    /** Each node's id, one per node. Default: the row number. */
    readonly ids?: ArrayLike<string | number>;
    /**
     * Each edge's weight, one per edge, stored as the record's `weight`. Default: read from the edge
     * attributes as `addEdges` reads it, else 1.
     */
    readonly weights?: ArrayLike<number>;
    /** Each node's starting position as x, y, z, three numbers per node. Default: placed by the layout. */
    readonly positions?: ArrayLike<number>;
    /** Further values by column name: one per node, or one per edge. */
    readonly attributes?: {
        /** Node values by column name, one per node. */
        readonly nodes?: Readonly<Record<string, ArrayLike<unknown>>>;
        /** Edge values by column name, one per edge. */
        readonly edges?: Readonly<Record<string, ArrayLike<unknown>>>;
    };
}

/** New values for some attributes of one existing row; keys not named are left as they are. */
export interface RowUpdate<Id> {
    /** The row's id. */
    readonly id: Id;
    /** The new values. */
    readonly values: Readonly<Record<string, unknown>>;
}

/**
 * The part of the catalog a session can answer today: the seven capability tables, which are
 * plain data and need no graph, plus `metrics()`, which needs one.
 *
 * Six of the seven -- algorithms, cameras, formats, layouts, log destinations and palettes --
 * carry the element's own entries followed by whatever a third party registered, because those
 * are the six supported extension points and an extension a picker cannot find is half an
 * extension. `scales` is the element's own table alone.
 *
 * `metrics()` is the graph-dependent half's first member, and it is here because everything it
 * reads now exists: the catalog declares what each algorithm requires of a graph, the cost model
 * answers what one would take over the scope a run would cover and reports a requirement the graph
 * does not meet as an unavailability rather than a throw, and the runs API holds what has already
 * been run. A consumer wanting only the metrics that CAN run filters on `available`; both lists
 * come off one call rather than two that could disagree.
 *
 * The rest of {@link CatalogApi} -- the methods named in `DeprecatedCatalogMethod` -- is absent
 * rather than stubbed, and deprecated on `CatalogApi` itself. A consumer discovers that gap by
 * autocomplete finding nothing, not by a call that throws. This type is derived from that list,
 * so implementing one of them means deleting its name there and nothing here.
 */
export type SessionCatalogApi = Omit<CatalogApi, DeprecatedCatalogMethod>;

/**
 * The project settings: the ones a project file saves, every one of them undoable.
 *
 * `data` is the element's data configuration in its own shape: the on-load `algorithms`, the
 * `directed` policy, and `knownFields` with every known field (`nodeIdPath`, `nodeLabelPath`,
 * `nodeWeightPath`, `nodeTimePath`, `edgeSrcIdPath`, `edgeDstIdPath`, `edgeIdPath`,
 * `repeatedEdges`, `edgeWeightPath`, `edgeWeightMeaning`, `edgeTimePath`, `positionScale`, `idCoercion`). A setting
 * nobody has set reads as its default.
 */
export interface ProjectConfig {
    /** The data configuration: the on-load `algorithms`, the `directed` policy and `knownFields`. */
    readonly data: SessionDataConfig;
    /** Whether the algorithms in `data.algorithms` run once data has loaded. */
    readonly runAlgorithmsOnLoad: boolean;
    /** What the graph is drawn against: a color or a skybox, and a shader over either. */
    readonly background: GraphBackgroundConfig;
    /** What a selected node's halo looks like. */
    readonly selectionStyle: GraphSelectionStyleConfig;
    /**
     * What a pinned node's halo looks like, in the shape of {@link ProjectConfig.selectionStyle}
     * (only `color`, `scale` and `opacity` are read). Absent by default. Set when
     * {@link ProjectConfig.startingRows} turns on (in the same `config.set` or before), the default
     * rows gain a Pinned row (nodes in the state `"pinned"`, pinned to the top directly below
     * Selected, drawing this halo). The row is ordinary data from then on: changing or clearing
     * this setting later leaves it as it is. The look is the consumer's choice, so nothing is drawn
     * for a pinned node until it is set.
     *
     * ```ts
     * await session.config.set({ startingRows: true, pinnedStyle: { color: "#868e96", scale: 1.12, opacity: 1 } });
     * ```
     * @since 3.37.0
     */
    readonly pinnedStyle?: GraphSelectionStyleConfig;
    /**
     * Whether the project draws with its default rows: Everything (pinned to the bottom, writing
     * nothing), Selected (pinned to the top, drawing a solid node halo and edge band in the selection
     * settings' colors and sizes, a blue ring and band by default) and Hovered (pinned to the
     * top, writing nothing). False by default. Turning it on writes the rows once, in the same step,
     * and the selection settings ({@link ProjectConfig.selectionStyle}) draw nothing themselves.
     * With {@link ProjectConfig.pinnedStyle} set, a Pinned row comes too. A Timeline Hidden row
     * (the elements outside the time window, the state `"outsideWindow"`, hidden or ghosted as
     * {@link ProjectConfig.timelineHiddenLook} says) comes only with the timeline: the first time
     * the project has a time field (`session.time.setField`, or turning this on while it has one),
     * once, recorded in {@link ProjectConfig.timelineHiddenAdded}. The rows
     * are ordinary data: a reader may delete or change any of them, and no later setting adds,
     * removes or rewrites one.
     * @since 3.26.0
     */
    readonly startingRows: boolean;
    /**
     * Whether the element's base look (every node and edge value it draws before any layer says
     * otherwise) is held by the Everything starting row as ordinary values a reader can edit or
     * remove, instead of by the element's two locked base layers. False by default. With it on, the
     * locked base layers paint nothing, the Everything row is written holding the base values when
     * {@link ProjectConfig.startingRows} turns on (in the same `config.set` or after), and an element that no shown layer
     * paints is not drawn: hiding the Everything row hides every element no other shown layer
     * paints, and an element a shown layer paints stays drawn in that layer's look.
     * @since 3.26.0
     */
    readonly editableBase: boolean;
    /**
     * How the Timeline Hidden starting row starts: `"hidden"` (the default) sets `visible: false`,
     * so what lies outside the time window is not drawn at all; `"ghost"` draws it gray at low
     * opacity. Read only when the row is written: the first time a project with
     * {@link ProjectConfig.startingRows} on has a time field. Changing it never rewrites a row
     * already there.
     *
     * ```ts
     * await session.config.set({ startingRows: true, timelineHiddenLook: "ghost" });
     * await session.time.setField({ edges: { start: "year" } }); // adds the Timeline Hidden row
     * ```
     * @since 3.40.0
     */
    readonly timelineHiddenLook: "hidden" | "ghost";
    /**
     * Whether the project has had its Timeline Hidden starting row written: false until the first
     * time a project with {@link ProjectConfig.startingRows} on has a time field, when the row is
     * written and this turns true in the same step. Kept with the project: a version 1 file saves it;
     * a version 2 file does not, and opening one sets it from whether the file carries a style
     * section. So the row is written once: turning the timeline off and on, or deleting the row,
     * never adds it again. Setting it
     * true before the timeline turns on means the row is never written. Setting it false asks for
     * the row again: it is written the next time a project with the starting rows has a time field
     * (at once when it already has one), beside any copy already there, since a row is the reader's
     * and is never looked for by name.
     * @since 3.57.0
     */
    readonly timelineHiddenAdded: boolean;
    /**
     * Whether this project has had the session's starting cameras
     * (`session.views.setStartingCameras`) written into it. False by default. Kept with the project:
     * a version 1 file saves it; a version 2 file does not, and opening one sets it from whether the
     * file carries a view section. The element sets it when it writes them. Setting it true stops
     * them being written into this project; setting it false lets the next writing point write them
     * again.
     * @since 3.58.0
     */
    readonly startingCamerasWritten: boolean;
    /**
     * Where the layer a finished run paints lands: `"beneath"` (the default), under the lowest
     * layer somebody wrote that drives the same property, and not at all when such a layer covers
     * every element; or `"top"`, on top of the unpinned rows, never held back by a layer somebody
     * wrote.
     * @since 3.26.0
     */
    readonly runPlacement: RunPlacement;
    /**
     * The layout-behavior settings a project file saves. The rest of the element's
     * `layoutBehavior` (label declutter, pin on drag, throughput tuning) is a preference of the
     * view and not a project setting.
     */
    readonly layoutBehavior: {
        /** Simulation steps run before the first frame is drawn. */
        readonly preSteps: number;
        /** Simulation steps per frame. */
        readonly stepMultiplier: number;
        /** The movement below which a simulation counts as settled. */
        readonly minDelta: number;
    };
    /**
     * Who is writing: stamped on each note added from now on. Absent when no name is set, never
     * blank. A claim, never a verified identity.
     */
    readonly author?: string;
    /** The project's name, which a project file carries. Absent when none is set, never blank. */
    readonly name?: string;
    /**
     * How nodes travel to a new layout: a transition from `catalog.transitions()`, its duration
     * and parameters. Absent (the default), a new layout's positions are drawn in one frame.
     * @since 3.36.0
     */
    readonly layoutTransition?: LayoutTransitionConfig;
    /**
     * How far the 2D view is turned: the angle the whole drawing (nodes, edges and labels alike) is
     * turned counterclockwise on screen, in degrees, about the view's center. Absent (the default),
     * the drawing is upright. Every fit frames the turned drawing, and the 3D view ignores it. A
     * file's own turn sets it on import, as Graphviz's `rotate=90` and `landscape` do (90).
     *
     * ```ts
     * await session.config.set({ viewRotation: 90 }); // a quarter turn, as Graphviz draws landscape
     * ```
     * @since 3.38.0
     */
    readonly viewRotation?: number;
    /**
     * How the element frames the graph on its own and on `zoomToFit()`: after a load, a layout change and a 2D/3D
     * switch. Absent (the default), every visible node is framed whole with its labels, inside a small margin.
     * `extent: "centers"` frames the nodes' centers alone, so a big node at the edge of the graph may run past the
     * canvas and labels are not counted. `padding`, in CSS pixels, is the room kept clear at each end of the canvas's
     * shorter side (the longer side keeps the same share), in place of the margin. A file's own framing sets it on
     * import when the load asks for it (file style option `framing: "file"`): sigma.js fits node centers 30 px in.
     *
     * ```ts
     * await session.config.set({ framing: { extent: "centers", padding: 30 } }); // as sigma.js frames a graph
     * ```
     * @since 3.38.0
     */
    readonly framing?: GraphFraming;
    /**
     * The smallest a node and an edge are drawn, so no mark vanishes on screen or in print: `node`
     * in the units of the `node.size` channel, `edge` in the units of `edge.width`. A node or edge
     * whose layers paint it smaller, a size or width of 0 included, is drawn at the minimum; what
     * the layers wrote, and every reading of it (`styles.explain()`, the legend), is unchanged.
     * Absent (the default), or 0, every mark is drawn at the size its layers paint, and an edge
     * of width 0 draws no line.
     *
     * ```ts
     * await session.config.set({ minMarkSize: { node: 0.5, edge: 1 } });
     * ```
     * @since 3.40.0
     */
    readonly minMarkSize?: {
        /** The least node size, in the units of the `node.size` channel; absent or 0, no minimum. */
        readonly node?: number;
        /** The least edge width, in the units of `edge.width`; absent or 0, no minimum. */
        readonly edge?: number;
    };
}

/** How the element frames the graph: see {@link ProjectConfig.framing}. */
export interface GraphFraming {
    /** What each node counts as: `"drawn"` the box it is drawn in, with its labels; `"centers"` its center alone. */
    readonly extent: "drawn" | "centers";
    /** CSS pixels kept clear at each end of the canvas's shorter side, 0 or more; absent, a small margin. */
    readonly padding?: number;
    /**
     * A fixed box to frame in place of the nodes, in the units node positions are drawn in (`min` its smallest x and
     * y, `max` its largest): the canvas shows this box whatever the nodes' extent, so a node outside it runs past the
     * edge and `extent` is not read. Read only while the `"fixed"` layout draws stored positions; under any other
     * layout, or absent, the nodes are framed. A replacing load that does not set it from its file drops it. A Pajek file's 0..1 square is framed so on import
     * with file style option `framing: "file"`, as Pajek fits it to its Draw window.
     * @since 3.40.0
     */
    readonly box?: {
        /** The smallest x and y. */
        readonly min: readonly [number, number];
        /** The largest x and y. */
        readonly max: readonly [number, number];
    };
}

/** Where a finished run's layer lands: see {@link ProjectConfig.runPlacement}. */
export type RunPlacement = "beneath" | "top";

/**
 * A partial {@link ProjectConfig}, nested: `{ data: { knownFields: { nodeIdPath: "key" } } }`.
 * Plain objects are merged key by key; `data.algorithms`, `background` and `selectionStyle` are
 * replaced whole. Setting a key to `undefined` returns it to its default.
 */
export interface ProjectConfigPatch {
    /** See {@link ProjectConfig.data}; each part is merged into it. */
    readonly data?: {
        /** The algorithms that run on load; replaced whole. */
        readonly algorithms?: SessionDataConfig["algorithms"];
        /** The `directed` policy. */
        readonly directed?: SessionDataConfig["directed"];
        /** Known fields to set, merged key by key. */
        readonly knownFields?: Partial<SessionDataConfig["knownFields"]>;
    };
    /** See {@link ProjectConfig.runAlgorithmsOnLoad}. */
    readonly runAlgorithmsOnLoad?: boolean;
    /** See {@link ProjectConfig.background}; replaced whole. */
    readonly background?: GraphBackgroundConfig;
    /** See {@link ProjectConfig.selectionStyle}; replaced whole. */
    readonly selectionStyle?: GraphSelectionStyleInput;
    /** See {@link ProjectConfig.pinnedStyle}; `undefined` clears it. */
    readonly pinnedStyle?: GraphSelectionStyleInput;
    /** See {@link ProjectConfig.startingRows}. */
    readonly startingRows?: boolean;
    /** See {@link ProjectConfig.editableBase}. */
    readonly editableBase?: boolean;
    /** See {@link ProjectConfig.timelineHiddenLook}. */
    readonly timelineHiddenLook?: "hidden" | "ghost";
    /** See {@link ProjectConfig.timelineHiddenAdded}. */
    readonly timelineHiddenAdded?: boolean;
    /** See {@link ProjectConfig.startingCamerasWritten}. */
    readonly startingCamerasWritten?: boolean;
    /** See {@link ProjectConfig.runPlacement}. */
    readonly runPlacement?: RunPlacement;
    /** See {@link ProjectConfig.layoutBehavior}; merged key by key. */
    readonly layoutBehavior?: Partial<ProjectConfig["layoutBehavior"]>;
    /** See {@link ProjectConfig.layoutTransition}; `undefined` turns transitions off. */
    readonly layoutTransition?: LayoutTransitionConfig;
    /** See {@link ProjectConfig.viewRotation}; `undefined` turns the view upright. */
    readonly viewRotation?: number;
    /** See {@link ProjectConfig.framing}; `undefined` returns to the element's own framing. */
    readonly framing?: GraphFraming;
    /** See {@link ProjectConfig.minMarkSize}; replaced whole, and `undefined` draws every mark as painted. */
    readonly minMarkSize?: ProjectConfig["minMarkSize"];
    /** At most 256 characters; empty or only white space counts as no name, and `null` clears it. */
    readonly author?: string | null;
    /** At most 256 characters; empty or only white space counts as no name, and `null` clears it. */
    readonly name?: string | null;
}

/**
 * The session's settings as they are now: every project setting, read live, and the
 * acceleration policy, which is a preference about this machine and not saved in a project.
 */
export interface SessionConfig extends ProjectConfig {
    /**
     * Change project settings. One step, which undo takes back.
     * @param values - The settings to change.
     * @returns Settles once the step is recorded and the picture has caught up.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` when a key is not a project
     *     setting or a value is one its setting refuses; nothing is changed then.
     */
    set(values: ProjectConfigPatch): Promise<void>;
    /**
     * The color the element draws the background in, beneath any image or shader, as hex: the
     * background's own `color`, else `DEFAULT_BACKGROUND_COLOR`; under a dark color scheme
     * (`colorScheme` on the element) its `darkColor`, else `DEFAULT_DARK_BACKGROUND_COLOR`. A
     * settings panel shows it when the background sets no color of its own.
     * @since 3.36.0
     */
    readonly backgroundColor: string;
    /** What the consumer asked of the hardware. */
    readonly acceleration: {
        /** Use an accelerator when one is available, never look, or refuse to run without one. */
        readonly policy: AccelerationPolicy;
        /** The node count at or above which accelerated work actually uses the accelerator. */
        readonly minNodes: number;
    };
    /**
     * Whether a graph setting changes the drawing in the view as it is now: lighting and same size
     * at any depth do nothing in the 2D view, which is drawn flat and without depth. A settings
     * panel shows only the settings in effect, without knowing which view ignores what.
     *
     * ```ts
     * session.config.inEffect("lighting"); // { inEffect: false, code: "setting.notIn2d", params: { setting: "lighting" } }
     * ```
     * @param key - The setting.
     * @returns Whether it is in effect, with the reason as a code.
     * @throws A `GraphtyError` with code `E_BAD_COMMAND` for a key that names no graph setting.
     * @since 3.26.0
     */
    inEffect(key: GraphSettingKey): SettingEffect;
}

/**
 * A graph setting {@link SessionConfig.inEffect} answers for: the project's background, and the
 * element's `lighting` and `layoutBehavior` settings by their path.
 * @since 3.26.0
 */
export type GraphSettingKey =
    | "background"
    | "lighting"
    | "node.sizeSpace"
    | "node.outlineWidth"
    | "labels.declutter"
    | "labels.avoidNodesAndEdges";

/**
 * Why a graph setting is or is not in effect. `params.setting` names the setting.
 *
 * - `"setting.inEffect"`: it changes the drawing in this view.
 * - `"setting.notIn2d"`: the 2D view ignores it.
 *
 * More codes may be added in a minor release.
 * @since 3.26.0
 */
export type SettingEffectCode = "setting.inEffect" | "setting.notIn2d";

/** What {@link SessionConfig.inEffect} answers. @since 3.26.0 */
export interface SettingEffect extends CodedFact<SettingEffectCode> {
    /** Whether the setting changes the drawing now. */
    readonly inEffect: boolean;
}

/**
 * A click on a group outline a style layer draws (a use at the place `group` on its
 * `node.shaders`): its layer, its shader, and the group's `groupBy` value (null for a use drawing
 * one outline).
 * @since 3.36.0
 */
export interface GroupOutlineClick {
    /** The layer whose outline was clicked. */
    readonly layer: LayerId;
    /** The outline's shader. */
    readonly shader: string;
    /** The group's `groupBy` value; null for a use drawing one outline. */
    readonly group: string | number | boolean | null;
}

/**
 * Where the hovered node was drawn in the frame the pointer's hover was read from, in CSS pixels
 * from the canvas's top-left corner (the pixels `Graph.worldToScreen` returns and a pointer's
 * `offsetX` / `offsetY` use).
 *
 * Hover can answer a frame or two after the frame it read: on WebGPU the node under the pointer
 * is read back from the GPU. A running layout may have moved the node by then, so where it stands
 * now (`Graph.nodeScreenPosition`) is not where the pointer found it. This is.
 * @since 3.40.0
 */
export interface HoverDrawn {
    /** The node's center, from the left edge. */
    readonly x: number;
    /** The node's center, from the top edge. */
    readonly y: number;
    /**
     * The radius hover picks the node within: the radius it is drawn at, but never under 0.71
     * device pixels (half a pixel's diagonal), so a node drawn smaller than a pixel can still be
     * pointed at. Where nothing else is drawn near it, hover also finds such a node a little
     * farther out, up to 1.5 device pixels from its center.
     */
    readonly radius: number;
}

/**
 * What a session publishes to whoever is watching it.
 *
 * A map rather than a bare handler, so that the events arriving with the layout, the camera and
 * the journal are added without changing a signature. An event that does not fire is not declared
 * here: a consumer discovers the gap by autocomplete finding nothing rather than by subscribing
 * to something silent.
 */
export interface SessionEventMap {
    /** A run reached one of the four watched moments. */
    "run:changed": RunChange;
    /**
     * Elements joined or left the selection.
     *
     * Only a real movement arrives: selecting what is already selected changes nothing a listener
     * could act on, and is not published.
     */
    "selection:changed": SelectionDelta;
    /**
     * A selection call changed `selection.origin` while the members stayed as they were: a rule
     * that selects exactly what is already selected, or clearing a selection a rule left empty.
     *
     * A call that moves members arrives as `selection:changed` instead, and `selection.origin` is
     * current when it does.
     */
    "selection:origin-changed": {
        /** The selection's origin now, or null. */
        readonly origin: SelectionTarget | null;
    };
    /**
     * The node under the pointer changed: the pointer reached a node, moved to another, or left
     * the node or the drawing. `selection.hovered` is `after` when it arrives.
     *
     * A `{ match: "state", state: "hovered" }` layer's `styles.counts` moves with it, so a host
     * showing such a count reads it again here; nothing else publishes the hover.
     *
     * `drawn` says where `after` was drawn in the frame the pointer found it in (see
     * {@link HoverDrawn}); it is present when the pointer moved onto a node in a graph that draws,
     * and absent for `selection.hover(id)` and when no node is hovered.
     * @since 3.34.0
     */
    "selection:hover-changed": {
        /** The node hovered before, or null. */
        readonly before: NodeId | null;
        /** The node hovered now, or null. */
        readonly after: NodeId | null;
        /** Where `after` was drawn in the frame the pointer found it in. */
        readonly drawn?: HoverDrawn;
    };
    /**
     * A click landed on empty canvas: no node and no edge under it.
     *
     * Published for every such click, after it cleared the selection and also when nothing was
     * selected, which `selection:changed` cannot tell: a host showing something else as chosen
     * (a run, a panel's row) learns that the reader let go of it on the drawing. `x` and `y` are
     * where, in CSS pixels from the drawing's top left corner, as `elementAt` takes a point.
     * `secondary` is true for a secondary-button (right) click, which asks for a menu and clears
     * nothing: a host keeps what it shows as chosen.
     */
    "canvas:empty-click": {
        /** CSS pixels from the drawing's left edge. */
        readonly x: number;
        /** CSS pixels from the drawing's top edge. */
        readonly y: number;
        /** True for a secondary-button (right) click. */
        readonly secondary: boolean;
    };
    /**
     * A click landed on a node or an edge in the drawing.
     *
     * Published for every such click, also when the element was already the whole selection,
     * which `selection:changed` cannot tell: a host showing something else as chosen (a run, a
     * panel's row) learns that the reader picked the element again on the drawing.
     * @since 3.33.0
     */
    "canvas:element-click":
        | {
              /** The node clicked. */
              readonly node: NodeId;
          }
        | {
              /** The edge clicked. */
              readonly edge: EdgeId;
          };
    /**
     * A click landed on a group outline a style layer draws (a use at the place `group`), and on
     * no node or edge: the layer, the shader, and the group's `groupBy` value (null for a use
     * drawing one outline). The topmost outline under the pointer is the one reported.
     * @since 3.36.0
     */
    "canvas:group-outline-click": GroupOutlineClick;
    /**
     * The layout's motion changed: it started or restarted (`running`), was paused part-way
     * (`paused`), or came to rest (`settled`). `layout.motion` is `motion` when it arrives. Only a
     * change is published. A session with no renderer publishes it while `layout.play()`,
     * `tick()` or `settle()` runs its layout. The payload also names the layout (`id`, `engine`,
     * `kind`) and the steps its run has taken (`step`, see {@link SessionLayout.step}); those
     * four fields arrived in 3.55.0.
     * @since 3.53.0
     */
    "layout:motion-changed": {
        /** The layout's motion now: `layout.motion`. */
        readonly motion: LayoutMotion;
        /** The layout's id. */
        readonly id: LayoutId;
        /** The engine running it. */
        readonly engine: string;
        /** `"live"` for a layout that moves step by step, `"batch"` for one that places the nodes in one pass. */
        readonly kind: "live" | "batch";
        /** The steps its run has taken (see {@link SessionLayout.step}). */
        readonly step: number;
    };
    /** A filter, the time window or the context flag changed what is showing. */
    "visibility:changed": VisibilityChange;
    /**
     * What `visibility.notDrawn` lists changed: something asked to be drawn outside what is
     * shown is, or is no longer, kept from drawing by the `workingGraph` option (the option
     * toggled, `showContext` set, a branches view's hold started or ended, time ghosts asked for).
     * Experimental: may change or be removed in a minor release.
     * @since 3.40.0
     * @beta
     */
    "visibility:not-drawn-changed": {
        /** What `visibility.notDrawn` lists now. */
        readonly notDrawn: readonly HiddenNotDrawn[];
    };
    /**
     * The time window moved through `session.time`: where it is now and what entered and left.
     * @beta
     */
    "time:step": TimeStepEvent;
    /**
     * Playback started, from this window (null when it opens one).
     * @beta
     */
    "time:play": {
        /** The window playback started from; null when it opens one. */
        readonly window: TimeWindow | null;
    };
    /**
     * Playback stopped at this window.
     * @beta
     */
    "time:pause": {
        /** The window playback stopped at. */
        readonly window: TimeWindow | null;
    };
    /**
     * Playback reached the end of the data; `time:pause` follows.
     * @beta
     */
    "time:end": {
        /** The window at the end of the data. */
        readonly window: TimeWindow | null;
    };
    /**
     * The designated time field changed through `session.time.setField`, or a load designated the
     * time field its file declares (a dynamic GEXF graph, an XGMML graph with `start` and `end`).
     * @beta
     */
    "time:field": {
        /** The designated time field now, or null. */
        readonly field: TimeField | null;
    };
    /**
     * The designated time field was indexed, so `time.extent()` and `time.bins()` answer.
     * @beta
     */
    "time:ready": {
        /** The time field that was indexed. */
        readonly field: TimeField | null;
    };
    /**
     * A run the `results: "rerun"` setting re-ran after a window move failed: which run, and the
     * error's code and details. A re-run canceled while it runs (`run.cancel()`) is not a failure
     * and publishes no event: the run's status reads "canceled".
     * @beta
     */
    "time:rerun-failed": {
        /** The run that failed. */
        readonly run: RunId;
        /** The error's code and details. */
        readonly error: CodedFact;
    };
    /**
     * A layer was added, changed, removed or moved, and how much of the picture it repainted.
     *
     * Published for every verb that changes the stack, including the ones that write several
     * layers at once: one event per EDIT rather than one per layer, because an edit is what a
     * consumer undoes, records and mirrors.
     */
    "style:changed": StyleChange;
    /**
     * A layer was refused for what it says about shaders: published as well as rejected, for a
     * `styles.add()` nobody awaits, whose refusal otherwise leaves no trace.
     * @since 3.46.0
     */
    "style:refused": StyleRefusal;
    /**
     * Once per repaint, after the last `style:changed` it published: how many edits it told and
     * which layers they touched. A consumer that re-reads the stack's picture (`styles.legend()`,
     * `styles.counts()`) after a change listens here, so a pass that tells 51 edits -- a grouping
     * run adds a layer per group -- costs it one read, not 51. An undo, a redo or a restore that
     * passes several steps closes its batch in a microtask after the last step's event.
     * @since 3.36.0
     */
    "style:batch-changed": StyleBatchChange;
    /**
     * A branches view (`styles.showBranches`) started or ended.
     * Experimental: may change or be removed in a minor release.
     * @beta
     */
    "style:branches-shown-changed": {
        /** Whether a branches view is shown now. */
        readonly shown: boolean;
    };
    /**
     * The element tried to paint something of its own and was refused.
     *
     * THE ONLY STYLE FAILURE A CONSUMER CANNOT OTHERWISE SEE. A style edit a consumer asks for
     * rejects the promise it handed back, so the refusal arrives at the call that caused it. The
     * element also paints on its own account -- a run's suggested encoding lands on the run's
     * first completion, without anybody awaiting it -- and a refusal there had nowhere to go:
     * the work is fire-and-forget by design, because the element must not make a consumer await
     * the picture in order to have started the run. So it arrives here instead.
     *
     * A graph that quietly kept the picture it had while the element believed it had painted a
     * new one is the exact defect this whole style system replaces. Subscribe to this and a
     * consumer can say "the degree colouring could not be applied" instead of leaving a reader
     * looking at an old picture that reads as an answer.
     */
    "style:problem": StyleProblem;
    /**
     * A repaint the element started on its own failed -- one following the selection, the
     * pointer, a peek, a set's members or a branches view -- or a pass found a layer it could not
     * paint at all. The picture on screen is stale until the next repaint. Carries a code, never
     * words; a repaint stopped because the session ended is not reported.
     * @since 3.52.0
     */
    "style:repaint-failed": StyleRepaintFailure;
    /**
     * Every acceleration transition, and every change to what VR and AR can do: the probe
     * settling, a WebXR device change, entering or leaving a session (including the headset
     * ending it), an XR configuration change. The document is the one `capabilities` returns.
     */
    "capabilities:changed": {
        /** The document `capabilities` returns now. */
        readonly capabilities: SessionCapabilities;
    };
    /**
     * The history changed: a step was recorded, merged, undone, redone, restored, evicted or
     * cleared, or the pending work (and so what the next undo will do) changed. Fires
     * synchronously after `project:changed`. Read `session.history` for the new state; its
     * `version` has moved.
     */
    "history:changed": {
        /** What changed the history. */
        readonly reason: "record" | "merge" | "undo" | "redo" | "restore" | "evict" | "clear" | "pending" | "size";
    };
    /**
     * Project state changed: the slices written and what wrote them. Fires synchronously, as
     * soon as the state has changed and before the picture has caught up; the per-domain events
     * (`style:changed` and the rest) follow once it has, then `project:derived`.
     */
    "project:changed": {
        /** The slices written. */
        readonly slices: readonly ProjectSlice[];
        /** What wrote them. */
        readonly cause: HistoryCause;
    };
    /**
     * `session.views.setStartingCameras` wrote its views into the project's starting state: no
     * step and no `project:changed`, so a list of saved views re-reads `session.views` on this.
     * @since 3.58.0
     */
    "views:seeded": {
        /** The names of the views written. */
        readonly names: readonly string[];
    };
    /**
     * The picture has caught up with every project change made so far: published once nothing is
     * left to derive or repaint -- after the per-domain events, and after any repaint the element
     * put off or started on its own -- with every slice changed or derived since the last one
     * (changes made in one burst share one event; `cause` is the latest change's). THE event
     * for a consumer that re-reads derived state -- `styles.legend()`, `styles.counts()`,
     * `styles.explain()` -- after any change, including an edit to data alone, which publishes no
     * `style:changed`. Read on `project:changed`, those answer for the previous pass.
     * @since 3.37.0
     */
    "project:derived": {
        /** Every slice changed or derived since the last event. */
        readonly slices: readonly ProjectSlice[];
        /** The latest change's cause. */
        readonly cause: HistoryCause;
    };
    /**
     * A kept set was created, renamed, redefined or removed: one event per set a write touched,
     * after the write committed. A write that was refused publishes nothing.
     *
     * Membership has no event: a set's members follow the data lazily, so a panel showing counts
     * re-reads them on the events it already watches and on this one.
     */
    "set:changed": SetChange;
    /**
     * A note was added, edited or removed: one event per note a write touched, after the write
     * committed. A write that was refused, or that changed nothing, publishes nothing.
     */
    "note:changed": NoteChange;
    /**
     * The graph's data changed: nodes or edges were added or removed, or their attributes were
     * edited -- by a load, an add, a removal, an attribute edit, or an undo, redo or restore of
     * one. One event per change, published synchronously after `project:changed`, so `data.node()`
     * already reads the new values. A change that touched no node or edge publishes nothing.
     *
     * Load progress is `progress:changed` with `task: "load"`, which a session with no view
     * publishes too; the load's `data:changed` follows when it commits.
     * @since 3.40.0
     */
    "data:changed": DataChange;
    /**
     * A draft of the sources and steps opened, changed, was committed or was discarded
     * (`session.data.draft()`), so a view of it can read it again. Experimental: source-steps.
     */
    "data:draft-changed": SourceDraftChange;
    /** A command finished and the journal appended its entry: one event per entry. */
    "journal:appended": {
        /** The entry appended. */
        readonly entry: JournalEntry;
    };
    /**
     * A load or a run moved on, or stopped: one stream for every progress bar, which a session
     * with no view publishes too. See {@link ProgressChange}.
     */
    "progress:changed": ProgressChange;
    /** An expansion from a network source began. Mirrored as `graphty-source-expand-start`. Experimental. */
    "source:expand-start": SourceExpandStart;
    /**
     * An expansion finished: code `I_SOURCE_EXPANDED`, params `{ seeds, added, partial }`.
     * Mirrored as `graphty-source-expanded`. Experimental.
     */
    "source:expanded": SourceExpanded;
    /** An expansion failed: the source's code and params. Mirrored as `graphty-source-expand-failed`. Experimental. */
    "source:expand-failed": SourceExpandFailed;
    /** A network load read its source again (More or Refresh), so its `loadedAt` moved. Experimental. */
    "source:refreshed": {
        /** The key of the load that was read again. */
        readonly load: string;
    };
    /** How a project save keeps a load changed ({@link SessionDataApi.setCopy}). Experimental. */
    "source:copy": {
        /** The load's key. */
        readonly source: SourceKey;
        /** How a save keeps it now. */
        readonly copy: SourceCopyChoice;
    };
    /**
     * A load added a source to the graph: one event per source added, published by every load
     * method (`import`, `LoadDraft.load`, `loadExample`, `loadDataset`, `generate`, and the
     * element's `data-source` attribute, `loadFromFile`, `loadFromUrl` and `addDataFromSource`)
     * once its load commits. Not published by opening a project, by undo, redo or restore, or by
     * `runPendingSourceLoad`, which fills a source a project already listed. It carries no
     * contents: no file name, URL or parameters.
     *
     * Unlike the graph event `data-loaded`, which fires whenever data arrives for any cause
     * (undo and redo included), this fires only for a load a caller asked for.
     * Mirrored on the element as `graphty-source-loaded`.
     * @since 3.40.0
     */
    "source:loaded": SourceLoaded;
    /**
     * A reader's camera gesture on the canvas ended: once per gesture, never per frame. `kind` is
     * what the gesture did: `"orbit"` turned the view, `"pan"` moved it sideways, `"zoom"` moved
     * it nearer or farther (a wheel, a pinch, the zoom keys).
     *
     * A gesture's end is defined by the input, never by a timer: a drag or a pinch ends at the
     * pointer up that ends it; a run of wheel events ends at the first frame in which the camera
     * comes to rest with no new wheel event since the frame before (wheel events dispatched in one
     * task are always one gesture); a key gesture ends once the last camera key held is released
     * and the camera's own inertia has come to rest, and a key pressed before then continues it.
     * Moves the element makes itself (a fit, a glide, `camera.autoRotate`) and calls such as
     * `setCameraState` publish nothing.
     *
     * OPEN UNION: kinds may be added in a minor release; handle one you do not know.
     * @since 3.40.0
     */
    "camera:gesture-end": {
        /** What the gesture did. */
        readonly kind: CameraGestureKind;
    };
    /**
     * The project's name or whether it has unsaved changes (`session.project.name`, `.dirty`)
     * changed. Mirrored on the element as `graphty-project-status`.
     */
    "project:status": ProjectStatus;
    /**
     * A project shader's status changed: it started compiling, became ready, failed, was held,
     * approved, or turned off. Mirrored on the element as `graphty-shader-status`.
     * @since 3.36.0
     */
    "shader:status": {
        /** The shader's id. */
        readonly id: string;
    } & ShaderStatus;
    /**
     * Shaders arrived that wait for approval: a project or style file opened, an AI command, or
     * an undo brought them back. Mirrored as `graphty-shader-held`.
     * @since 3.36.0
     */
    "shader:held": {
        /** The ids of the shaders waiting for approval. */
        readonly ids: readonly string[];
    };
    /**
     * A shader's text was approved to run: the reader added it, or `approve` ran it. An
     * application that remembers approvals stores the hash and passes it back in
     * `shaderSettings.trustedHashes`. Mirrored as `graphty-shader-approved`.
     * @since 3.36.0
     */
    "shader:approved": {
        /** The shader's id. */
        readonly id: string;
        /** The hash of the approved text. */
        readonly hash: string;
    };
    /**
     * The frame guard changed how much shader work the element does: it stepped quality down,
     * paused motion or turned heavy shaders off on a GPU that fell behind, or stepped back up.
     * Mirrored on the element as `graphty-render-quality`; the quality now is
     * `element.renderQuality`.
     * @since 3.36.0
     */
    "render:quality": RenderQualityChange;
    /**
     * A model a style layer names moved on: requested, checked, drawn, refused or failed; or a
     * picture a node draws (`node.image`) failed, `E_IMAGE_LOAD`. One event per model and state,
     * never one per node. Mirrored on the element as
     * `graphty-model-change`.
     */
    "model:changed": ModelChange;
    /**
     * A fetch the page's code did not ask for waits for an answer (`session.network.allow` or
     * `deny`). Once per URL.
     */
    "network:pending": NetworkRequest;
    /**
     * The session was disposed: `dispose()` was called, or its element left the page. Published
     * once, the last event it publishes, with `status.ready` already false; its data verbs throw
     * `E_DISPOSED` once `dispose()` returns. A host that handed the session to readers (a view, a
     * panel) drops it here. Subscribing on a session already disposed calls the handler in a
     * microtask, so a host that asks too late still hears it.
     */
    "session:disposed": Readonly<Record<string, never>>;
}

/**
 * What `source:loaded` carries: which source a load added (or replaced in place, see
 * {@link SourceLoaded.replaced}), where it came from and how it was loaded, never what it holds.
 *
 * ```ts
 * session.on("source:loaded", (loaded) => {
 *     if (loaded.callerKey === "my-sample") console.log("my sample is in", loaded.source);
 * });
 * await session.data.import({ type: "csv", config: { data: text } }, { callerKey: "my-sample" });
 * ```
 * @since 3.40.0
 */
export interface SourceLoaded {
    /** The source's key in `session.data.sources()`. */
    readonly source: SourceKey;
    /** The source's `LoadedSource.kind`, exactly as `session.data.sources()` records it. */
    readonly kind: LoadedSourceKind;
    /** For kinds `"file"` and `"url"`: the format read, named or detected; absent when none was settled. */
    readonly format?: FormatId;
    /** For kind `"server"`, and for a sample read from a network source: the source id. */
    readonly sourceId?: string;
    /** Whether the load replaced the graph or merged into it. */
    readonly mode: "replace" | "merge";
    /**
     * Present when the load was a catalog sample: a dataset (`loadDataset`), a generator
     * (`generate`) or a network source's example (`loadExample`, whose kind stays `"server"`).
     */
    readonly sample?:
        | {
              /** The graph-samples dataset's id, as `loadDataset` took it. */
              readonly datasetId: string;
          }
        | {
              /** The generator's id, as `generate` took it. */
              readonly generatorId: string;
          }
        | {
              /** The network source's example id, as `loadExample` took it. */
              readonly exampleId: string;
          };
    /** The caller's own {@link ImportOptions.callerKey}, echoed unchanged. */
    readonly callerKey?: string;
    /**
     * Present when the source was not added but replaced in place, under the same key, with
     * `mode: "merge"`: `"replaceSource"` for a newer copy (`session.data.replaceSource`),
     * `"reloadSource"` for the same input read again with other choices (`reloadSource`, `remap`).
     */
    readonly replaced?: "replaceSource" | "reloadSource";
}

/**
 * What happened to one model a style layer names (`node.model`), or to a node's picture
 * (`node.image`) that could not be loaded, for `model:changed` and the element's
 * `graphty-model-change`.
 */
export interface ModelChange {
    /** What the layer named: the URL or the asset id, exactly as written. */
    readonly ref: string;
    /** The asset's id, once the session holds it. */
    readonly id?: AssetId;
    /** The layers that name it. */
    readonly layerIds: readonly LayerId[];
    /**
     * `pending` while it is fetched or loaded; `accepted` once its files passed the checks;
     * `drawn` once the scene shows it; `rejected` when its files were refused (or its URL was not
     * fetched); `failed` when it could not be drawn. Nodes keep `node.shape` until `drawn`.
     */
    readonly state: ModelState;
    /** Why it was refused or failed (`E_MODEL_*`, `E_IMAGE_LOAD`), and what is worth knowing (`W_MODEL_*`). */
    readonly problems: readonly CodedFact[];
}

/** Where a model a layer names stands; see {@link ModelChange.state}. */
export type ModelState = "pending" | "accepted" | "drawn" | "rejected" | "failed";

/**
 * The parts of a project. Everything a project file saves lives in one of these, and a change
 * to any of them is undoable; nothing outside them (camera, hover, the selection, a run still
 * computing) is.
 *
 * OPEN UNION: slices may be added in a minor release; handle one you do not know.
 */
export type ProjectSlice =
    | "graph"
    | "config"
    | "layout"
    | "pins"
    | "arrangement"
    | "runs"
    | "styles"
    | "visibility"
    | "sets"
    | "views"
    | "tours"
    | "notes"
    | "attributes"
    | "valueLabels"
    | "shaders"
    | "modelDefaults";

/** What moved project state: a command, a history move, or a failed command being reverted. */
export type HistoryCause = "command" | "undo" | "redo" | "restore" | "rollback";

/** Node and edge ids, by kind. */
export interface DataChangeIds {
    /** Node ids. */
    readonly nodes: readonly NodeId[];
    /** Edge ids, as `data.edges()` gives them. */
    readonly edges: readonly EdgeId[];
}

/**
 * What one change did to the graph's data, published as `data:changed`. Netted over the change: a
 * node added and removed again in one change is in neither list. Frozen.
 * @since 3.40.0
 */
export interface DataChange {
    /** The nodes and edges the change added. */
    readonly added: DataChangeIds;
    /** The nodes and edges it removed (a node's edges go with it). */
    readonly removed: DataChangeIds;
    /** The nodes and edges that were there before and after it whose record or weight it wrote. */
    readonly updated: DataChangeIds;
    /** The attribute keys whose values it changed on the updated nodes and edges. */
    readonly fields: {
        /** Attribute keys changed on nodes. */
        readonly nodes: readonly string[];
        /** Attribute keys changed on edges. */
        readonly edges: readonly string[];
    };
    /** What made the change: a command, an undo, a redo, or a restore (a jump in the history). */
    readonly cause: HistoryCause;
}

/** The id of one step in `session.history.steps`. */
export type HistoryStepId = string & {
    /** Marks the string as a history step id. */
    readonly __brand: "HistoryStepId";
};

/** The id of one item in `session.history.pending`. */
export type PendingId = string & {
    /** Marks the string as a pending item id. */
    readonly __brand: "PendingId";
};

/**
 * What a history step did, as the `code` of its {@link HistoryStep.fact}. The application words
 * it; graphty-element writes no sentence for it. Each code's `params`:
 *
 * | Code | Params |
 * | --- | --- |
 * | `algo.run`, `algo.legacy` | `algorithm`: the algorithm's key |
 * | `algo.remove`, `algo.move` | `run`: the run's id; `algorithm`: its algorithm, or null when unknown |
 * | `algo.rename` | `run`, `algorithm` as above; `name`: the new name, or null when the reader's name was taken away |
 * | `algo.batch` | `label`: the name `runs.batch` was given, or null; `count`: how many runs |
 * | `algo.template` | none: the runs a style template asks for |
 * | `batch` | `label`: the batch's own `label`, or null; `steps`: how many commands |
 * | `data.add-nodes`, `data.add-edges`, `data.remove-nodes`, `data.remove-edges` | `count` |
 * | `data.edit` | `target`: `"node"` or `"edge"`; `count`: how many rows |
 * | `data.fix-issue` | `issue`: the issue's id; `code`: its code; `fix`: the fix; `count`: the issue's count before |
 * | `data.ignore-issue` | `issue`: the issue's id; `ignored`: true when ignored, false when listed again |
 * | `data.ignore-issues` | `issues`: the issues' ids; `ignored`: true when ignored, false when listed again |
 * | `data.issues` | none: the issue state a project file restored |
 * | `data.clear`, `data.set`, `data.replace-nodes`, `data.replace-edges` | none |
 * | `data.merge-nodes` | `count`: how many nodes became one |
 * | `groups.collapse`, `groups.expand` | `groupBy`: the path grouped by; `group`: the group's value; `size`: how many members (experimental) |
 * | `data.import` | `name`: the source's name (given, file or URL), or null; `type`: the data source, or null |
 * | `data.import-source` | `source`: the network source's id; `name`: what the reader called the data, or null |
 * | `data.steps-set` | `kind`: the edit (`set`, `add`, `reader`, `remove-edit`, `remove-source`, `declare-type`) or the act (`merge`, `connect`, `extract`, `move-columns`, `rename`, `pick`, `remove-step`, `add-staged`); `source`: the source it names, else null; `name`: the name of the source an `add` adds, else null (experimental) |
 * | `data.expand` | `node`: the id expanded |
 * | `data.source-expand` | `seeds`: the ids expanded; `nodes`, `edges`: how many rows came (experimental) |
 * | `data.collapse` | `node`: the id collapsed; `nodes`: how many nodes went (experimental) |
 * | `data.declare` | `kind`: `"node"` or `"edge"`; `column`: the column's name |
 * | `data.set-source` | `name`: the source's name, or null |
 * | `data.remove-source` | `key`: the load's key; `name`: its name, or null |
 * | `data.replace-source` | `key`; `name`: the copy's name, or null; `added`, `removed`, `changed`: nodes and edges together |
 * | `data.join` | `key`: the joined table's load; `name`: its name, or null; `shape`; `matched` |
 * | `data.edit-join` | `key`; `name`; `shape`; `matched` |
 * | `data.label` | `path`: the value path; `value`: the value named; `label`: its name, or null when it was removed |
 * | `data.set-role` | `kind`: `"node"` or `"edge"`; `column`: the column's name; `role`: the role, or null |
 * | `data.set-type` | `kind`; `column`; `type`: the value type; `fails`: how many values became blank |
 * | `data.rename-column` | `kind`; `column`: the old name; `name`: the new name |
 * | `data.hide-columns`, `data.show-columns` | `count`: how many columns |
 * | `data.columns` | none: the column settings a project file restored |
 * | `data.derive` | `kind`: `"node"` or `"edge"`, or null; `column`: the computed column added or changed, or null when its values were only brought up to date |
 * | `shader.add`, `shader.replace`, `shader.remove` | `id`: the shader's id; `layer` (`shader.add` only): the layer `add` also wrote it to, or null |
 * | `style.add-layer` | `layer`: its name; `layerId`: the id it gets (a two-part row's id), or null when the step adds none |
 * | `style.remove-layer`, `style.move-layer` | `layer`: its name, or its id; `layerId`: its id |
 * | `style.update-layer` | `layer`: its name, or its id; `layerId`: its id; `channels`: the channels whose set value or binding changed (empty when only another key did) |
 * | `style.remove-layers` | `count` |
 * | `style.highlight` | `run`: the run highlighted |
 * | `style.fix-channel` | `channel`; `layer`: its name, or its id; `layerId`: its id |
 * | `style.encode` | `channel`; `run` |
 * | `style.template` | none |
 * | `style.suggested` | `algorithms`: the algorithms whose suggested styles were applied |
 * | `style.add-folder` | `name`: the folder's name; `rowId`: the id it gets |
 * | `style.rename-row` | `row`: its name before, or its id; `rowId`: its id; `name`: the new name |
 * | `style.move-row`, `style.delete-row` | `row`: its name, or its id; `rowId`: its id |
 * | `style.duplicate-row` | `row`: the source row's name, or its id; `rowId`: the source's id; `copyId`: the copy's id |
 * | `style.pin-row` | `row`: its name, or its id; `rowId`: its id; `pin`: `"top"`, `"bottom"` or `"none"` |
 * | `style.lock-row` | `row`: its name, or its id; `rowId`: its id; `locked` |
 * | `style.hide-row` | `row`: its name, or its id; `rowId`: its id; `hidden` |
 * | `style.add-default-rows` | none |
 * | `visibility.filter` | `kind`: the filter's kind |
 * | `visibility.clear-filter`, `visibility.window`, `visibility.clear-window` | none |
 * | `visibility.show-context`, `visibility.hide-context` | none |
 * | `visibility.step-add`, `visibility.step-edit`, `visibility.step-on`, `visibility.step-off`, `visibility.step-remove` | `id`: the filter step's id (an edit made through `setSteps`) |
 * | `visibility.condition-add`, `visibility.condition-on`, `visibility.condition-off`, `visibility.condition-remove` | `id`: the filter condition's id; `effect`: its effect (`"keep"`, `"exclude"` or `"select"`) |
 * | `visibility.condition-edit` | `id`; `effect`: its effect after the edit; `previousEffect`: its effect before |
 * | `visibility.steps` | none: several steps or conditions changed at once, or a reorder |
 * | `visibility.playback` | none: how `session.time` moves windows changed |
 * | `visibility.hide-nodes`, `visibility.show-nodes` | `count`: how many nodes were named |
 * | `time.field` | `column`: the column designated as the time field |
 * | `time.clear-field` | none |
 * | `set.create` | `name`: the set's name, or null |
 * | `set.rename` | `set`: its name before, or its id; `name`: the new name |
 * | `set.redefine`, `set.members`, `set.remove`, `set.restore` | `set`: its name, or its id |
 * | `note.add`, `note.update`, `note.remove` | none |
 * | `note.merge` | `source`: the merged document's name, or null |
 * | `view.save`, `view.remove` | `names`: the views |
 * | `view.rename` | `from`: the view's name before; `to`: its new name |
 * | `view.move` | `name`: the view moved; `index`: its new 0-based place |
 * | `view.open` | `name`: the view opened; `parts`: what it brought back besides the camera |
 * | `annotations.set` | `count`: how many annotations are kept |
 * | `annotations.patch` | `action`: `"add"`, `"update"` or `"remove"`; `id`: the annotation's id, or null |
 * | `view.dimension` | `dimension`: `"2d"` or `"3d"` |
 * | `view.immersive` | `mode`: `"vr"` or `"ar"` (a switch to 3D on the way in) |
 * | `config.set` | `keys`: the setting paths changed |
 * | `positions.set`, `positions.pin`, `positions.release` | `count`: how many nodes |
 * | `node.drag` | `node`: the id dragged |
 * | `layout.set` | `layout`: the layout's id |
 * | `layout.rerun` | `layout`: the id of the layout run again |
 * | `layout.behavior` | `layout`: the layout's id |
 * | `layout.scope`, `layout.whole-graph` | none |
 * | `project.open` | `name`: the project's name, or null |
 * | `document.open` | none |
 * | `transaction` | `label`: the label given to `session.transaction`, or null |
 *
 * New codes may be added in a minor release: word an unknown one generically.
 */
export type HistoryCode =
    | "algo.run"
    | "algo.legacy"
    | "algo.remove"
    | "algo.move"
    | "algo.rename"
    | "algo.batch"
    | "algo.template"
    | "batch"
    | "data.add-nodes"
    | "data.add-edges"
    | "data.remove-nodes"
    | "data.remove-edges"
    | "data.edit"
    | "data.fix-issue"
    | "data.ignore-issue"
    | "data.ignore-issues"
    | "data.issues"
    | "data.clear"
    | "data.set"
    | "data.replace-nodes"
    | "data.replace-edges"
    | "data.merge-nodes"
    | "groups.collapse"
    | "groups.expand"
    | "data.import"
    | "data.import-source"
    | "data.steps-set"
    | "data.expand"
    | "data.source-expand"
    | "data.collapse"
    | "data.declare"
    | "data.set-source"
    | "data.remove-source"
    | "data.replace-source"
    | "data.join"
    | "data.edit-join"
    | "data.label"
    | "data.set-role"
    | "data.set-type"
    | "data.rename-column"
    | "data.hide-columns"
    | "data.show-columns"
    | "data.columns"
    | "data.derive"
    | "annotations.set"
    | "annotations.patch"
    | "style.add-layer"
    | "style.update-layer"
    | "style.remove-layer"
    | "style.move-layer"
    | "style.remove-layers"
    | "style.highlight"
    | "style.fix-channel"
    | "style.encode"
    | "style.template"
    | "style.suggested"
    | "style.add-folder"
    | "style.rename-row"
    | "style.move-row"
    | "style.pin-row"
    | "style.lock-row"
    | "style.hide-row"
    | "style.delete-row"
    | "style.duplicate-row"
    | "style.add-default-rows"
    | "shader.add"
    | "shader.replace"
    | "shader.remove"
    | "asset.defaults"
    | "visibility.filter"
    | "visibility.clear-filter"
    | "visibility.window"
    | "visibility.clear-window"
    | "visibility.show-context"
    | "visibility.hide-context"
    | "visibility.step-add"
    | "visibility.step-edit"
    | "visibility.step-on"
    | "visibility.step-off"
    | "visibility.step-remove"
    | "visibility.condition-add"
    | "visibility.condition-edit"
    | "visibility.condition-on"
    | "visibility.condition-off"
    | "visibility.condition-remove"
    | "visibility.steps"
    | "visibility.playback"
    | "visibility.hide-nodes"
    | "visibility.show-nodes"
    | "time.field"
    | "time.clear-field"
    | "set.create"
    | "set.rename"
    | "set.redefine"
    | "set.members"
    | "set.remove"
    | "set.restore"
    | "note.add"
    | "note.update"
    | "note.remove"
    | "note.merge"
    | "view.save"
    | "view.remove"
    | "view.rename"
    | "view.move"
    | "view.key"
    | "view.starting"
    | "view.open"
    | "tour.save"
    | "tour.remove"
    | "tour.rename"
    | "tour.move"
    | "view.dimension"
    | "view.immersive"
    | "config.set"
    | "positions.set"
    | "positions.pin"
    | "positions.release"
    | "node.drag"
    | "layout.set"
    | "layout.rerun"
    | "layout.behavior"
    | "layout.scope"
    | "layout.whole-graph"
    | "project.open"
    | "document.open"
    | "transaction";

/** One undoable step: everything one command, gesture or transaction changed. Frozen. */
export interface HistoryStep {
    /** Stable for the life of the step. */
    readonly id: HistoryStepId;
    /**
     * What the step did, as a code and its values, for the application to word. A step merged
     * from several (a drag, a transaction) carries the fact of the whole.
     */
    readonly fact: CodedFact<HistoryCode>;
    /** ISO 8601 of the last commit or merge into the step. */
    readonly at: string;
    /** The ops of the commands in the step, in the order they ran. Payloads are not kept for display. */
    readonly ops: readonly SessionCommand["op"][];
    /** The slices the step changed. */
    readonly slices: readonly ProjectSlice[];
    /** What the step retains on the side of the cursor it is on. */
    readonly bytes: number;
    /** Where the step came from, such as `{ via: "assistant" }`. */
    readonly provenance: Readonly<Record<string, string>>;
}

/** Undoable work dispatched and not yet recorded: queued, waiting, or an open transaction. Frozen. */
export interface PendingStep {
    /** Pass it to `history.cancel`. */
    readonly id: PendingId;
    /** The fact the step will have: see {@link HistoryStep.fact}. */
    readonly fact: CodedFact<HistoryCode>;
    /** ISO 8601 of the dispatch. */
    readonly since: string;
    /** The runs this work is waiting on. */
    readonly runIds: readonly RunId[];
}

/** What an undo, a redo or a restore did. */
export type HistoryOutcome =
    | {
          /** Steps were undone, redone or restored. */
          readonly kind: "undone" | "redone" | "restored";
          /** The steps it passed, in the order it passed them. */
          readonly steps: readonly HistoryStep[];
      }
    | {
          /** Pending work was cancelled. */
          readonly kind: "cancelled";
          /** The pending work cancelled. */
          readonly pending: readonly PendingStep[];
      }
    | {
          /** There was nothing to do. */
          readonly kind: "nothing";
      };

/**
 * The session's undo history. `steps`, `pending` and `nextUndo` are frozen values, the identical
 * objects between changes; `version` moves on every `history:changed`, so a React host can
 * subscribe with `useSyncExternalStore(subscribe, () => session.history.version)`.
 */
export interface SessionHistory {
    /** Bumped on every `history:changed`. */
    readonly version: number;
    /** Oldest first; `steps[position..]` have been undone and can be redone. */
    readonly steps: readonly HistoryStep[];
    /** How many steps are applied. */
    readonly position: number;
    /** Undoable work dispatched and not yet recorded, oldest first. */
    readonly pending: readonly PendingStep[];
    /** What the next `undo()` will do: cancel pending work, undo a step, or nothing (null). */
    readonly nextUndo:
        | {
              /** The next undo cancels pending work. */
              readonly kind: "cancel";
              /** The pending work it cancels. */
              readonly pending: readonly PendingStep[];
          }
        | {
              /** The next undo undoes a step. */
              readonly kind: "undo";
              /** The step it undoes. */
              readonly step: HistoryStep;
          }
        | null;
    /** What every step retains, in bytes. */
    readonly bytes: number;
    /**
     * The byte budget. Default 256 MiB. When a record goes past it, or past `limitSteps`, the
     * oldest steps (then the farthest redo steps) are dropped until the history is within 90% of
     * both budgets, so the work of dropping is spread over many records. Lowering a budget below
     * what the history holds trims it the same way at once.
     */
    limitBytes: number;
    /**
     * The step budget. Default 1000. Going past it trims the history to 90% of it, rounded down,
     * as `limitBytes` describes: with a budget of 10, the eleventh step leaves 9.
     */
    limitSteps: number;
    /**
     * Move to the state just after a step, or to the baseline with `null`, as the equivalent run
     * of undos or redos. Resolves once the picture matches the state.
     * @param step - The step, or null for the state before every step.
     * @param options - Whether the steps after it can still be redone.
     * @returns What was done.
     */
    restoreTo(step: HistoryStepId | null, options?: HistoryRestoreOptions): Promise<HistoryOutcome>;
    /**
     * Cancel a pending item, and every later-dispatched item that depends on what it writes.
     * @param pending - The item.
     * @returns Every item canceled; empty when the id is not pending.
     */
    cancel(pending: PendingId): readonly PendingStep[];
    /**
     * Drop every step: the current state becomes the baseline. Pending work that has already
     * changed something (an open transaction that wrote, a layout moving nodes) is canceled,
     * since its step would undo to a state older than the baseline. By default the rest of the
     * pending work is canceled too; pass `{ pending: "keep" }` to let it finish and record its
     * steps over the new baseline, so a run started just before (one a reader began while a graph
     * was loading) is not lost.
     * @param options - What happens to pending work that has changed nothing yet.
     */
    clear(options?: HistoryClearOptions): void;
}

/** What `history.restoreTo` leaves to redo. */
export interface HistoryRestoreOptions {
    /**
     * `"keep"` (the default) leaves the steps after the one restored to as redo steps, as a run of
     * undos does; `"drop"` discards them, as a new edit would, so taking back work the reader
     * abandoned (a canceled edit) leaves nothing to redo.
     */
    readonly redo?: "keep" | "drop";
}

/** How `history.clear` treats work that is still pending. */
export interface HistoryClearOptions {
    /**
     * `"cancel"` (the default) cancels every pending item and aborts every open transaction;
     * `"keep"` leaves those that have changed nothing yet to finish, each recording its step over
     * the new baseline, and cancels the rest.
     */
    readonly pending?: "cancel" | "keep";
}

/** Stamped on the step a transaction records. */
export interface TransactionOptions {
    /** Where the step came from, such as `{ via: "assistant" }`. Shown in `HistoryStep.provenance`. */
    readonly provenance?: Readonly<Record<string, string>>;
    /**
     * A step this transaction continues, so work done in several short transactions can be one
     * undo step without holding anything open in between. While that step is the newest applied
     * step, what this transaction changes merges into it. When anything else has been recorded
     * above it since, or it has been undone, this transaction records as its own step, with
     * `provenance.after` set to the step it continued. An undo while this transaction is open
     * cancels it rather than undoing the step it continues.
     */
    readonly after?: HistoryStepId;
    /**
     * The caller's own key for this work, echoed unchanged as `JournalEntry.callerKey` on the
     * journal entry of every command the transaction runs. Lets a caller tell the commands its
     * own setup ran (naming a new project, say) from the ones a reader asked for.
     * @since 3.40.0
     */
    readonly callerKey?: string;
}

/**
 * The session a transaction's callback works through: every verb of the session, and what it
 * dispatches joins the transaction's step. It cannot undo, redo, read the history or dispose.
 */
export type TransactionScope = Omit<GraphSession, "undo" | "redo" | "history" | "dispose">;

/**
 * What `execute` returns, per op. No entry is wrapped in a promise, because a promise resolved
 * with a `Run` would adopt it and yield the result instead of the handle.
 */
export interface CommandOutcomeMap {
    /** The run's handle; awaiting it yields the result. */
    "algo.run": Run;
    /** Settles once the plugin has run and everything it wrote is recorded as one step. */
    "algo.legacy": Promise<void>;
    /** What went with the run, once the removal is recorded. */
    "algo.remove": Promise<RunRemoval>;
    /** Settles once the run's layers have moved, as one step. */
    "algo.move": Promise<void>;
    /** Settles once the run's new name is recorded, as one step. */
    "algo.rename": Promise<void>;
    /** Settles once every member is recorded as one step and the pass that draws it has run. */
    batch: Promise<void>;
    /** Settles once the change is recorded and the pass that draws it has run. */
    "data.apply": Promise<void>;
    /** Settles once the issue state is recorded. */
    "data.issues": Promise<void>;
    /** Settles once the last chunk is recorded and the pass that draws it has run. */
    "data.import": Promise<void>;
    /** Settles once the rows a network source load read are recorded and drawn. Experimental. */
    "data.import-source": Promise<void>;
    /** Settles once the sources and steps are recorded and the graph rebuilt from them is drawn. Experimental. */
    "data.steps-set": Promise<void>;
    /** Settles once the neighborhood is recorded and the pass that draws it has run. */
    "data.expand": Promise<void>;
    /** Settles once the expansion is recorded and drawn. Experimental. */
    "data.source-expand": Promise<void>;
    /** Settles once the collapse is recorded and drawn. Experimental. */
    "data.collapse": Promise<void>;
    /** Settles once the declaration is recorded. */
    "data.declare": Promise<void>;
    /** Settles once the source is recorded. */
    "data.setSource": Promise<void>;
    /** Settles once the name is recorded. */
    "data.label": Promise<void>;
    /** Settles once the column settings are recorded. */
    "data.columns": Promise<void>;
    /** Settles once the computed columns and their values are recorded. */
    "data.derive": Promise<void>;
    /** Settles once the edit is recorded and the pass that repaints it has run. */
    "style.patch": Promise<void>;
    /** Settles once the edit is recorded and the pass that repaints it has run. */
    "style.encode": Promise<void>;
    /** Settles once the edit is recorded and the pass that repaints it has run. */
    "style.template": Promise<void>;
    /** Settles once the shader's text is recorded. */
    "shader.set": Promise<void>;
    /** Settles once the model's settings are recorded and the pass that repaints its nodes has run. */
    "asset.defaults": Promise<void>;
    /** Settles once the filter is recorded and the pass that evaluates the masks has run. */
    "visibility.set": Promise<void>;
    /** Settles once the window is recorded and the pass that evaluates the masks has run. */
    "visibility.window": Promise<void>;
    /** Settles once the flag is recorded and the pass that follows it has run. */
    "visibility.context": Promise<void>;
    /** Settles once the steps are recorded and the pass that evaluates the masks has run. */
    "visibility.steps": Promise<void>;
    /**
     * Settles once the conditions are recorded and the pass that evaluates the masks has run.
     * Experimental: may change or be removed in a minor release.
     * @beta
     */
    "visibility.conditions": Promise<void>;
    /** Settles once the playback settings are recorded. */
    "visibility.playback": Promise<void>;
    /** Settles once the hidden list is recorded and the pass that draws it has run. */
    "visibility.hide": Promise<void>;
    /** The new set's id, once it is recorded. */
    "set.create": Promise<SetId>;
    /** Settles once the rename is recorded. */
    "set.rename": Promise<void>;
    /** Settles once the redefinition is recorded. */
    "set.redefine": Promise<void>;
    /** Settles once the member edit is recorded. */
    "set.members": Promise<void>;
    /** Settles once the removal is recorded. */
    "set.remove": Promise<void>;
    /** Settles once the restore is recorded. */
    "set.restore": Promise<void>;
    /** The new note's id, once it is recorded. */
    "note.add": Promise<NoteId>;
    /** Settles once the edit is recorded. */
    "note.update": Promise<void>;
    /** Settles once the removal is recorded. */
    "note.remove": Promise<void>;
    /** Settles once the merged notes are recorded; `session.notes.mergeDocument` returns the report. */
    "note.merge": Promise<void>;
    /** Settles once the views are recorded. */
    "view.save": Promise<void>;
    /** Settles once the annotations are recorded. */
    "annotations.set": Promise<void>;
    /** Settles once the change is recorded. */
    "annotations.patch": Promise<void>;
    /** Settles once the removal is recorded. */
    "view.remove": Promise<void>;
    /** Settles once the rename is recorded. */
    "view.rename": Promise<void>;
    /** Settles once the new order is recorded. */
    "view.move": Promise<void>;
    /** Settles once the key is recorded. */
    "view.key": Promise<void>;
    /** Settles once the starting cameras are recorded. */
    "view.starting": Promise<void>;
    /** Settles once the tours are recorded. */
    "tour.save": Promise<void>;
    /** Settles once the removal is recorded. */
    "tour.remove": Promise<void>;
    /** Settles once the rename is recorded. */
    "tour.rename": Promise<void>;
    /** Settles once the new order is recorded. */
    "tour.move": Promise<void>;
    /** Settles once the camera has arrived. */
    "view.camera": Promise<void>;
    /** Settles once the settings are recorded and the picture has caught up. */
    "config.set": Promise<void>;
    /** Settles once the coordinates are recorded and the layout has taken them. */
    "positions.set": Promise<void>;
    /** Settles once the pins are recorded and the layout has taken them. */
    "positions.pin": Promise<void>;
    /** Settles once the choice is recorded and the layout has spent its pre-steps. */
    "layout.set": Promise<void>;
    /** Settles once the re-run is recorded and the layout has spent its pre-steps. */
    "layout.rerun": Promise<void>;
    /** Settles once the scope is recorded. */
    "layout.scope": Promise<void>;
    /** Settles once the switch is recorded and the layout has been rebuilt for it. */
    "view.dimension": Promise<void>;
    /** Settles once the layout has started or stopped moving. */
    "layout.transport": Promise<void>;
    /** Settles once the device session has started or ended. */
    "view.immersive": Promise<void>;
}

/** One node's coordinates for `positions.set`, in scene units. */
export interface PositionEntry {
    /** The node. */
    readonly id: NodeId;
    /** Its x coordinate. */
    readonly x: number;
    /** Its y coordinate. */
    readonly y: number;
    /** Defaults to 0. */
    readonly z?: number;
}

/**
 * The node coordinates, read by dense node index: a row no layout has placed reads as unplaced
 * rather than as the origin.
 *
 * Read-only. A consumer places and pins nodes through `session.positions.set`, `pin` and `unpin`,
 * which are undoable steps; the array a layout writes every frame is the element's own.
 */
export interface ReadonlyElementPositions {
    /** Rows the coordinates can hold without growing. */
    readonly capacity: number;
    /** Rows in use: the node count of the current snapshot. */
    readonly count: number;
    /** Rows in use that hold a coordinate. */
    readonly placedCount: number;
    /** Rows in use that are pinned. */
    readonly pinnedCount: number;
    /** Moves whenever coordinates are written on purpose, so a reader can tell they changed. */
    readonly generation: number;
    /**
     * Whether a row holds a coordinate.
     * @param index - The dense node index.
     * @returns False for an unplaced row or one past the rows in use.
     */
    isPlaced(index: number): boolean;
    /**
     * Whether a row is pinned.
     * @param index - The dense node index.
     * @returns False for an unpinned row or one past the rows in use.
     */
    isPinned(index: number): boolean;
    /**
     * Read a row's coordinates into an object the caller owns.
     * @param index - The dense node index.
     * @param out - Receives x, y and z in scene units; NaN for an unplaced row.
     * @param out.x - Receives x.
     * @param out.y - Receives y.
     * @param out.z - Receives z.
     */
    read(index: number, out: { x: number; y: number; z: number }): void;
}

/**
 * Placing and pinning nodes, as undoable steps, beside the read-only coordinates.
 *
 * Coordinates a running layout writes are not steps: where the layout comes to rest is recorded
 * into the step before it, so undo and redo restore where the nodes were without running the
 * layout again.
 */
export interface SessionPositions extends ReadonlyElementPositions {
    /**
     * The pinned node ids: the nodes no layout moves. It holds and yields each id as the graph
     * holds it, but `has` takes an integer id written either way, as {@link SessionPositions.pin}
     * does: on a graph whose node `34` is pinned, `pinned.has("34")` is true.
     */
    readonly pinned: ReadonlySet<NodeId>;
    /**
     * Place nodes. One step; consecutive calls placing the same nodes, with no other step between
     * them, are one. Wrap a call in `session.transaction` to make it a step of its own.
     * @param entries - The nodes and where to put them.
     * @returns Settles once the step is recorded and the layout has taken the coordinates.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` for a node the graph does not
     *     hold or a coordinate that is not a finite number; nothing is placed then.
     */
    set(entries: readonly PositionEntry[]): Promise<void>;
    /**
     * Pin nodes where they are. One step. An integer id may be written either way: `"34"` pins
     * node `34`.
     * @param ids - The nodes.
     * @returns Settles once the step is recorded and the layout has taken the pins.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` naming every id the graph does
     *     not hold, in `details.ids`; nothing is pinned then.
     */
    pin(ids: readonly NodeId[]): Promise<void>;
    /**
     * Release pinned nodes, so the layout arranges them again. One step. Ids are looked up as
     * {@link SessionPositions.pin} looks them up.
     * @param ids - The nodes.
     * @returns Settles once the step is recorded and the layout has taken the change.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` naming every id the graph does
     *     not hold, in `details.ids`; nothing is released then.
     */
    unpin(ids: readonly NodeId[]): Promise<void>;
    /**
     * Where one node is now. An integer id may be written either way, as {@link SessionPositions.pin}.
     * @param id - The node.
     * @returns Its coordinates in scene units, or undefined for a node the graph does not hold or
     *     that nothing has placed yet.
     * @since 3.55.0
     */
    get(id: NodeId):
        | {
              /** The x coordinate. */
              readonly x: number;
              /** The y coordinate. */
              readonly y: number;
              /** The z coordinate. */
              readonly z: number;
          }
        | undefined;
    /**
     * Which nodes are pinned, one byte per dense node index (1 pinned, 0 not): a copy, cheap to
     * test and to send to a worker.
     * @returns The mask, as long as the node count.
     * @since 3.55.0
     */
    pinnedMask(): Uint8Array;
    /**
     * Every node's coordinates now, as a copy: the ids in dense index order and x, y, z per node
     * (NaN for a node nothing has placed). Hand it to {@link SessionPositions.restore}, on this
     * session or another holding the same nodes.
     *
     * ```ts
     * const saved = session.positions.snapshot();
     * await session.layout.set("circular");
     * await session.positions.restore(saved); // one undoable step
     * ```
     * @returns The ids and coordinates.
     * @since 3.55.0
     */
    snapshot(): {
        /** The node ids, in dense index order. */
        readonly order: readonly NodeId[];
        /** x, y and z per node in `order`; NaN for a node nothing has placed. */
        readonly xyz: Float32Array;
    };
    /**
     * Put nodes back where a {@link SessionPositions.snapshot} found them. One step, as
     * {@link SessionPositions.set}. A node the snapshot found unplaced is left as it is.
     * @param saved - A snapshot, from this session or another.
     * @param saved.order - Its ids, in the order of `xyz`.
     * @param saved.xyz - x, y, z per id.
     * @returns Settles once the step is recorded and the layout has taken the coordinates.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` when `xyz` does not hold three
     *     numbers per id, or for a node the graph does not hold; nothing is placed then.
     * @since 3.55.0
     */
    restore(saved: { readonly order: readonly NodeId[]; readonly xyz: Float32Array }): Promise<void>;
}

/**
 * Nodes hidden from the drawing only: each stays in the data, its results, the table, layout,
 * counts and exports, and is simply not drawn, with every edge that touches it. Unlike a filter
 * (`session.visibility.set`), which takes elements out of everything, this changes nothing but the
 * picture. Hiding and showing are undoable steps, and a project file saves the list.
 *
 * ```ts
 * await session.hidden.add(["n7"]); // n7 and its edges leave the canvas
 * session.hidden.ids.has("n7"); // true
 * await session.hidden.remove(["n7"]); // drawn again
 * ```
 */
export interface SessionHidden {
    /**
     * The hidden node ids, as they were given. `has` takes an integer id written either way. An
     * id the graph does not hold hides nothing; it is kept, and a project file saves only those
     * the graph holds.
     */
    readonly ids: ReadonlySet<NodeId>;
    /**
     * Hide nodes, and the edges that touch them, from the drawing. One step; an id already hidden
     * is left as it is.
     * @param ids - The nodes.
     * @returns Settles once the step is recorded and the pass that draws it has run.
     */
    add(ids: readonly NodeId[]): Promise<void>;
    /**
     * Draw hidden nodes again. One step; an id that is not hidden is left as it is.
     * @param ids - The nodes.
     * @returns Settles once the step is recorded and the pass that draws it has run.
     */
    remove(ids: readonly NodeId[]): Promise<void>;
}

/**
 * Which layout draws the graph, and in how many dimensions: the project's `layout` slice.
 *
 * Choosing a layout and switching between 2D and 3D are undoable steps, and undo puts back the
 * engine that was chosen with its own options, not the catalog's default. Until one is chosen
 * it reads the element's default, the `force` layout drawn by `ngraph` in 3D.
 */
export interface SessionLayout {
    /** The catalog id, such as `"force"`. */
    readonly id: LayoutId;
    /** The engine that draws it, such as `"d3"`. */
    readonly engine: string;
    /** The options it was chosen with. */
    readonly options: Readonly<Record<string, unknown>>;
    /** Whether the graph is drawn in two dimensions or three: the view's dimension. */
    readonly dimension: "2d" | "3d";
    /**
     * How many dimensions the current layout actually places nodes in. Always `"2d"` in the 2D
     * view; in the 3D view `"2d"` for an engine that only draws flat (such as `arf`) or one chosen
     * with `dim: 2`, and `"3d"` otherwise. Read it, not `options.dim`, to tell a flat layout in the
     * 3D view: options hold only what was asked for, not the defaults the element fills in.
     */
    readonly arrangedDimension: "2d" | "3d";
    /**
     * The code that draws the layout in force: the packages, at the versions that run, the
     * hardware (`accelerator`), and `method` when the code that consumes the seed is not
     * {@link SessionLayout.engine} (a session with no renderer steps ForceAtlas2 for `ngraph` and
     * `d3`). A save records it beside the positions (spec/README.md 4.5 rule 6).
     */
    readonly provenance: EngineVersions;
    /**
     * Choose the layout. One step.
     * @param id - The catalog id; a registered engine name is read as the id it serves.
     * @param options - The engine, when not the catalog's default for `id`, and its options.
     * @param options.engine - The engine that draws it, such as `"d3"`.
     * @param options.options - The engine's options.
     * @returns Settles once the step is recorded and the layout has taken its pre-steps.
     * @throws A `GraphtyError` (as a rejection) with `E_UNKNOWN_LAYOUT`, `E_UNKNOWN_OPTION` or
     *     `E_OPTION_RANGE` when the renderer cannot build it; nothing is changed then.
     */
    set(
        id: LayoutId,
        options?: { readonly engine?: string; readonly options?: Readonly<Record<string, unknown>> },
    ): Promise<void>;
    /**
     * Draw in 2D or 3D. One step; nothing is recorded when the graph is drawn so already.
     * @param dimension - Which.
     * @returns Settles once the step is recorded and the layout has been rebuilt for it.
     */
    setDimension(dimension: "2d" | "3d"): Promise<void>;
    /**
     * Run the current layout again from the start, with the same engine, options and scope, as
     * choosing it again would. One step, recorded as `layout.rerun` (not `layout.set`), so undo
     * and a history list name a re-run; undo puts the arrangement back.
     *
     * ```ts
     * await session.layout.rerun();
     * session.history.steps.at(-1)?.fact; // { code: "layout.rerun", params: { layout: "force" } }
     * ```
     * @returns Settles once the step is recorded and the layout has taken its pre-steps.
     * @throws A `GraphtyError` (as a rejection) with `E_UNSUPPORTED` in a session that draws
     *     nothing, where there is no layout to run.
     * @since 3.53.0
     */
    rerun(): Promise<void>;
    /**
     * Whether the layout is moving now: `running` while it steps, `paused` when it was stopped
     * before it came to rest (`element.setRunning(false)`), `settled` once it has come to rest
     * or when nothing runs (a session with no renderer reads `settled` until `play`, `tick` or
     * `settle` runs its layout). Not project
     * state and not undoable. `layout:motion-changed` publishes each change.
     *
     * ```ts
     * const show = (motion: LayoutMotion) => (chip.textContent = motion);
     * show(session.layout.motion);
     * session.on("layout:motion-changed", ({ motion }) => show(motion));
     * ```
     * @since 3.53.0
     */
    readonly motion: LayoutMotion;
    /**
     * The steps the current layout has taken since it was chosen, in a session with no renderer:
     * simulation iterations for a live engine, one for a one-shot arrangement. A renderer steps
     * its layout every frame without counting here, so a drawn session reads 0.
     * @since 3.55.0
     */
    readonly step: number;
    /**
     * Let the layout move until it comes to rest. In a session with no renderer this runs the
     * chosen layout with `@graphty/layout` over the session's graph, holding pinned nodes still:
     * `forceatlas2` and `spring` step their simulations, the `force` layout's `ngraph` and `d3`
     * engines step as ForceAtlas2 with the choice's `seed`, and a one-shot engine (`circular`,
     * `grid`, `kamada-kawai` and the rest) is computed at once. Choosing a layout there only
     * records it; nothing moves until this, `tick` or `settle` asks. Not a step.
     * @returns Settles once the layout has been told.
     * @throws A `GraphtyError` (as a rejection) with `E_UNSUPPORTED` for an engine that runs only
     *     on a renderer (`fixed`, `location-map`, Graphviz, `spring-electrical`), in a session with
     *     no renderer.
     * @since 3.55.0
     */
    play(): Promise<void>;
    /**
     * Stop the layout before it comes to rest; `motion` then reads `paused`. Not a step: where the
     * nodes stopped is sealed into the step on top.
     * @returns Settles once the layout has been told.
     * @since 3.55.0
     */
    pause(): Promise<void>;
    /**
     * Take steps now, without leaving the layout running: for a test or a tool that drives the
     * layout itself. Only in a session with no renderer, which steps nothing on its own.
     * @param count - How many; 1 when absent.
     * @throws A `GraphtyError` with `E_UNSUPPORTED` in a session drawn by a renderer, or for an
     *     engine that runs only on one; `E_BAD_COMMAND` for a count that is not a whole number
     *     of at least one.
     * @since 3.55.0
     */
    tick(count?: number): void;
    /**
     * Run the layout to rest: {@link SessionLayout.play}, then wait until it stops moving.
     *
     * ```ts
     * const session = createGraphSession();
     * await session.data.addNodes([{ id: "a" }, { id: "b" }]);
     * await session.data.addEdges([{ src: "a", dst: "b" }]);
     * await session.layout.set("force", { options: { seed: 1 } });
     * await session.layout.settle();
     * session.positions.get("a"); // { x, y, z }
     * ```
     * @returns True once it came to rest; false when it was paused or the session was disposed first.
     * @throws As {@link SessionLayout.play}.
     * @since 3.55.0
     */
    settle(): Promise<boolean>;
    /**
     * Whether a layout option changes the drawing in a view, as a coded fact: the location map's
     * `mapDimension` is `setting.notIn2d`, because the 2D view always draws its 2D map; then
     * `params.drawn` is the value the view draws instead (`"2d"`). A form shows an option not in
     * effect disabled, or offering only that value, with words for the code.
     * @param id - The layout's catalog id.
     * @param option - The option's name.
     * @param dimension - The view the layout would be drawn in; the view's dimension now when absent.
     * @returns The answer; every other option is `setting.inEffect`.
     * @since 3.37.0
     */
    optionInEffect(id: LayoutId, option: string, dimension?: "2d" | "3d"): SettingEffect;
    /**
     * The node columns the location map layout reads each node's location from when its own
     * options name none: the ones designated in `data.knownFields` (`nodeLocationPath`, or
     * `nodeLatitudePath` and `nodeLongitudePath`), else the ones it finds by name or by their
     * values. A form shows them as the location field, preselected before the reader picks one.
     *
     * ```ts
     * const { from, location, latitude, longitude } = session.layout.locationColumns();
     * // Designate a pair; the location map reads it from its next run.
     * await session.config.set({ data: { knownFields: { nodeLatitudePath: "lat", nodeLongitudePath: "lon" } } });
     * ```
     * @returns The columns; `from` is `none` when nothing reads as a location.
     * @since 3.37.0
     */
    locationColumns(): LocationColumns;
}

/**
 * Whether the layout is moving: see {@link SessionLayout.motion}.
 * @since 3.53.0
 */
export type LayoutMotion = "running" | "paused" | "settled";

/** Where the location map layout reads locations: one column of whole locations, or a pair. @since 3.37.0 */
export interface LocationColumns {
    /** `designated` in `data.knownFields`, `detected` by name or values, or `none` found. */
    readonly from: "designated" | "detected" | "none";
    /** The column of whole locations, or null with a pair or none. */
    readonly location: string | null;
    /** The latitude column of a pair, or null. */
    readonly latitude: string | null;
    /** The longitude column of a pair, or null. */
    readonly longitude: string | null;
    /**
     * How the location is read: `coords` for coordinates (a pair or one column of them), or the
     * kind of place `location` names (`country`, `region`, `city`; `auto` until the gazetteer that
     * decides it is loaded); null when nothing is read.
     * @since 3.33.0
     */
    readonly role: "coords" | "country" | "region" | "city" | "auto" | null;
    /** The column that narrows each place name (a city's country), or null. @since 3.33.0 */
    readonly within: string | null;
    /**
     * The column of each kind of location listed for the nodes: the kinds designated with
     * `data.setRole` (one column per kind), else the kinds of what is read now (a detected city
     * column and the country column narrowing it). A form lists one entry per kind.
     */
    readonly kinds: Readonly<Partial<Record<LocationKind, string>>>;
    /** What the location is read from: `pair`, `coordinates` or a place kind; null when nothing is. */
    readonly using: LocationUsing | null;
    /**
     * The listed kinds the element does not read, because another listed source wins (a full
     * pair over coordinates over place names, the finest place kind narrowed by the next coarser),
     * each as the coded fact `location.unused` naming the source in use.
     */
    readonly unused: readonly LocationUnused[];
}

/** A kind of location a node column can be given with `data.setRole`. */
export type LocationKind = "latitude" | "longitude" | "coordinates" | "country" | "region" | "city";

/** What a node location is read from: a latitude and longitude pair, coordinates, or place names of a kind. */
export type LocationUsing = "pair" | "coordinates" | "country" | "region" | "city";

/** A listed kind of location the element does not read: `{ code: "location.unused", params }`. */
export interface LocationUnused {
    /** The fact's code. */
    readonly code: "location.unused";
    /** The kind not read, and what is read instead. */
    readonly params: {
        /** The kind not read. */
        readonly kind: LocationKind;
        /** What is read instead. */
        readonly using: LocationUsing;
    };
}

/**
 * The annotations drawn beside the graph: shapes, texts, arrows and pictures, in the graph's own
 * convention (y up). Every change is one undoable step, and a project file saves them. A load
 * that reads a file's annotations writes them through these same steps.
 *
 * ```ts
 * await session.annotations.add({ id: "note-1", kind: "text", layer: "foreground", z: 0, ... });
 * session.annotations.list(); // [{ id: "note-1", kind: "text", ... }]
 * ```
 */
export interface SessionAnnotations {
    /** Scene units per annotation unit: 1 unless whatever wrote the annotations said otherwise. */
    readonly scale: number;
    /**
     * Every annotation, in drawing order.
     * @returns The annotations; empty when there are none.
     */
    list(): readonly DrawnAnnotation[];
    /**
     * Add an annotation, drawn over the others. One step.
     * @param annotation - The annotation; its `id` must be one no other annotation holds.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` for a malformed annotation or a repeated id.
     */
    add(annotation: DrawnAnnotation): Promise<void>;
    /**
     * Change an annotation, one key deep; its `id` and `kind` stay. One step.
     * @param id - The annotation's id.
     * @param patch - The keys to change.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` when no annotation has that id.
     */
    update(id: string, patch: Readonly<Record<string, unknown>>): Promise<void>;
    /**
     * Remove an annotation. One step.
     * @param id - The annotation's id.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` when no annotation has that id.
     */
    remove(id: string): Promise<void>;
    /**
     * Remove every annotation. One step.
     * @returns Settles once the step is recorded.
     */
    clear(): Promise<void>;
}

/**
 * One saved view: a fixed camera, or a camera view it follows, and the key a consumer binds to it.
 * @since 3.58.0
 */
export interface SavedView {
    /** A fixed camera. Absent for a following view. */
    readonly camera?: CameraState;
    /**
     * A camera view id (`catalog.cameras()`) this view is recomputed from each time it is applied,
     * for whatever is drawn then. Absent for a fixed view.
     */
    readonly follows?: string;
    /**
     * An opaque key chord the consumer binds; unique among the saved views. The element stores it
     * and never listens for it.
     */
    readonly key?: string;
    /**
     * The filter conditions (`session.visibility.conditions`) the view brings back. Absent when it
     * does not keep `"filters"`.
     * @since 3.59.0
     */
    readonly filters?: readonly FilterCondition[];
    /**
     * The style layers (`session.styles.toDocument()`) the view brings back. Absent when it does
     * not keep `"layers"`.
     * @since 3.59.0
     */
    readonly layers?: StyleDocument;
    /**
     * The nodes hidden from the drawing (`session.hidden`) the view brings back. Absent when it
     * does not keep `"hidden"`.
     * @since 3.59.0
     */
    readonly hidden?: readonly NodeId[];
    /**
     * Where the nodes were (`session.positions.snapshot()`): the ids and x, y, z per id, NaN for
     * a node nothing had placed. Absent when it does not keep `"positions"`.
     * @since 3.59.0
     */
    readonly positions?: {
        /** The node ids. */
        readonly order: readonly NodeId[];
        /** x, y and z per id in `order`. */
        readonly xyz: readonly number[];
    };
    /**
     * Whether the element's legend was shown. Absent when the view does not keep `"legend"`, or
     * when no element drew the session as it was saved.
     * @since 3.59.0
     */
    readonly legend?: boolean;
}

/**
 * A part of the project a saved view can keep beside its camera (`views.save`'s `include`).
 * @since 3.59.0
 */
export type SavedViewPart = "filters" | "layers" | "hidden" | "positions" | "legend";

/**
 * One view `session.views.save` keeps: a name, its camera, and what else it keeps.
 * @since 3.59.0
 */
export interface SavedViewInput extends Omit<SavedView, "key"> {
    /** The view's name. */
    readonly name: string;
    /** Its key chord; null clears it, absent keeps the key a view already under the name has. */
    readonly key?: string | null;
    /**
     * The parts the view keeps beside its camera, each read from the session now unless given
     * above. Default none: the view keeps only the camera.
     */
    readonly include?: readonly SavedViewPart[];
}

/**
 * One view `session.views.setStartingCameras` writes into a project that never had them.
 * @since 3.58.0
 */
export interface StartingCamera {
    /** The saved view's name. */
    readonly name: string;
    /** The camera view id it follows. */
    readonly follows: string;
    /** The key chord it carries, dropped when another saved view holds it. */
    readonly key?: string;
}

/**
 * The saved camera views, read as a map from name to saved view, iterated in project order.
 *
 * A saved view is either a fixed position or a camera view it follows (`follows`), recomputed for
 * whatever is drawn when it is applied. A name a camera view answers to is refused, so a saved view
 * never shadows one. A new view goes at the end of the order; `move` changes it.
 */
export interface SessionViews extends ReadonlyMap<string, SavedView> {
    /**
     * Keep views under names, replacing the camera or the followed view of any view already saved
     * under one; that view keeps its place, and its key unless `key` is given. One step.
     * @param views - The names, each with a `camera`, a camera view it `follows`, or neither: then
     *     it keeps where the camera stands now, read once, so redo puts back the same state. `key`
     *     sets its key chord, taking it from any other view that holds it; null clears it.
     *     `include` names what else it keeps (`"filters"`, `"layers"`, `"hidden"`, `"positions"`,
     *     `"legend"`), each read now unless given; `open` brings them back.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_PROTECTED` `{ name }` when a camera view
     *     answers to a name, `E_BAD_COMMAND` `{ reason: "empty-name" }` for an empty name,
     *     `E_BAD_COMMAND` `{ reason: "conflict", options: ["camera", "follows"] }` for both,
     *     `E_UNKNOWN_CAMERA` `{ name }` when `follows` names no camera view, `E_BAD_COMMAND`
     *     `{ reason: "empty-key" }` for an empty key, and, for a view with neither, `E_UNSUPPORTED`
     *     when the session draws nothing or `{ reason: "xr", mode }` while immersive, and
     *     `E_OPTION_RANGE` `{ option: "include", value }` for a part no view keeps; nothing is
     *     saved then.
     */
    save(views: readonly SavedViewInput[]): Promise<void>;
    /**
     * Bring a saved view back: the parts it keeps (filters, layers, hidden nodes, positions) as one
     * undoable step, then its legend switch, then the camera, which is not a step. A node the
     * graph no longer holds is skipped. A session that draws nothing skips the camera.
     * @param name - The view.
     * @param options - How the camera gets there.
     * @param options.animate - Fly instead of jumping. Default false.
     * @returns Settles once the step is recorded and the camera has arrived.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` `{ missing, available }` when
     *     nothing is saved as `name`, or as the camera refuses the view (`viewProblem`).
     * @since 3.59.0
     */
    open(name: string, options?: { readonly animate?: boolean }): Promise<void>;
    /**
     * Give a saved view a key chord, taking it from any other view that holds it, in one step; null
     * clears it. The element stores the key and never listens for it.
     * @param name - The view.
     * @param key - The key chord, or null.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` `{ missing, available }` when
     *     nothing is saved as `name`, or `E_BAD_COMMAND` `{ reason: "empty-key" }` for an empty key.
     * @since 3.58.0
     */
    setKey(name: string, key: string | null): Promise<void>;
    /**
     * The saved views to write once into every project that never had them; null (the default)
     * writes none. A session option, never saved: it lasts for the session's life. Each project
     * records that it got them in `config.startingCamerasWritten`, so a project is written once:
     * the list is appended after the project's own views now (no undo step on a fresh session,
     * one step after edits) and when a project that never had them is opened. A name already
     * saved is skipped, a key another view holds is dropped, and a `follows` no longer registered
     * is skipped.
     * @param list - The views, or null.
     * @returns Settles once the current project is written.
     * @throws A `GraphtyError` (as a rejection) with `E_UNKNOWN_CAMERA` `{ name }` when a `follows`
     *     names no camera view.
     * @since 3.58.0
     */
    setStartingCameras(list: readonly StartingCamera[] | null): Promise<void>;
    /**
     * Give a saved view a new name, keeping its place in the order. One step.
     * @param from - Its name now.
     * @param to - The new name.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` `{ missing, available }` when
     *     nothing is saved as `from`, `E_BAD_COMMAND` `{ reason: "name-taken", name }` when `to`
     *     is saved already, or `E_PROTECTED` `{ name }` when a camera view answers to `to`.
     */
    rename(from: string, to: string): Promise<void>;
    /**
     * Put a saved view at a place in the order. One step.
     * @param name - The view.
     * @param index - Its new 0-based place, clamped to the order.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` `{ missing, available }` when
     *     nothing is saved as `name`.
     */
    move(name: string, index: number): Promise<void>;
    /**
     * Forget saved views. One step.
     * @param names - The names.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` when a name is not saved;
     *     nothing is removed then.
     */
    remove(names: readonly string[]): Promise<void>;
}

/**
 * The saved camera tours, by name, in project order: each a list of stops that name views (see
 * `session.views`). Every change is one undoable step and a project file saves them; playing one
 * (`playTour`) is not a change. An empty tour, and a stop naming a view nothing is saved under,
 * are allowed, so drafts exist and a view's removal never fails; `planTour` reports them.
 * @since 3.58.0
 * @example
 * ```typescript
 * await session.tours.save([
 *     { name: "intro", tour: { stops: [{ view: "overview", hold: 2000 }, { view: "hub", duration: 1500 }] } },
 * ]);
 * ```
 */
export interface SessionTours extends ReadonlyMap<string, Tour> {
    /**
     * Keep tours under names, replacing a tour already saved under one in its place; a new name
     * goes at the end. One step.
     * @param tours - The names and tours.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` `{ reason: "empty-name" }`
     *     for an empty name, or `E_OPTION_RANGE` `{ option, stop }` for a negative or non-finite
     *     flight (`duration`) or `hold`, a stop whose `view` is not a name, or an unknown easing
     *     (`{ option: "easing" }`); nothing is saved then.
     */
    save(tours: readonly { readonly name: string; readonly tour: Tour }[]): Promise<void>;
    /**
     * Forget saved tours. One step.
     * @param names - The names.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` `{ missing, available }` when
     *     a name is not saved; nothing is removed then.
     */
    remove(names: readonly string[]): Promise<void>;
    /**
     * Give a saved tour a new name, keeping its place. One step.
     * @param from - Its name now.
     * @param to - The new name.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` `{ missing, available }` when
     *     nothing is saved as `from`, `{ reason: "name-taken", name }` when `to` is saved already,
     *     or `{ reason: "empty-name" }` for an empty `to`.
     */
    rename(from: string, to: string): Promise<void>;
    /**
     * Put a saved tour at a place in the order. One step.
     * @param name - The tour.
     * @param index - Its new 0-based place, clamped to the order.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` `{ missing, available }` when
     *     nothing is saved as `name`.
     */
    move(name: string, index: number): Promise<void>;
}

/** What `execute` returns for one command. */
export type CommandOutcome<C extends SessionCommand> = CommandOutcomeMap[C["op"]];

/**
 * A painting the element started for itself, and why it did not land.
 *
 * Structured-cloneable: the run's id and a `GraphtyError`, so it survives being posted to a
 * worker or written to a log.
 */
export interface StyleProblem {
    /** The run whose suggested styling was refused. */
    readonly runId: RunId;
    /** Why it was refused. */
    readonly error: GraphtyError;
}

/**
 * A graph with no view attached.
 *
 * The session holds the graph data, the coordinates, the runs and their results, the scope,
 * selection and visibility models, the style layers, the status, the catalog, the configuration
 * and the measured capabilities of the machine. A renderer binds to one; a Node test uses one on
 * its own; two synchronized views of one dataset share one.
 *
 * With no renderer it still runs layouts: `layout.play()`, `tick()` and `settle()` move the
 * nodes, and `positions` reads and places them.
 */
export interface GraphSession {
    /** Reading the graph. */
    readonly data: SessionDataApi;
    /** Starting computations, watching them, stopping them, and finding them again. */
    readonly runs: RunsApi;
    /** Addressing what a run produced: the path, the lookup and the completion list. */
    readonly results: ResultsApi;
    /**
     * Which elements a piece of work is allowed to look at: resolving a specification, counting
     * it without resolving it, and keeping one under a name.
     */
    readonly scope: ScopeApi;
    /**
     * The kept sets: named collections of nodes and edges -- groups, kept selections, communities
     * and paths -- that anything taking a scope can name as `{ set: id }`.
     *
     * A set is fixed (a member list), a rule (a query or rule tree that follows the data) or a
     * path (an ordered walk). Reading and counting one goes through `scope.resolve({ set: id })`
     * and `scope.count({ set: id })`; every change is published as `set:changed`.
     */
    readonly sets: SetsApi;
    /**
     * The notes: text people write about the graph, its nodes and edges, kept sets and results.
     * Every write is one undoable step and is published as `note:changed`; graphty-element stores
     * a note's text exactly as given and never interprets it.
     */
    readonly notes: NotesApi;
    /**
     * The 3D model files a style layer can draw nodes as: add one (a URL, a File, a folder, a
     * .zip or bytes), wait for one, read what it holds, remove it. Adding checks the files and
     * draws nothing; assets are not commands, so they are kept out of the history and recipes.
     */
    readonly assets: AssetsApi;
    /**
     * The fetches the page's code did not ask for, waiting for the reader: a model URL a project
     * file, an AI command or the data names, and a reopened project's network-source loads. Each
     * is a `W_URL_NEEDS_APPROVAL` fact, published as `network:pending`; nothing is fetched until
     * `allow`. Private, loopback and link-local addresses are refused whatever the answer.
     */
    readonly network: NetworkApi;
    /**
     * Collapsing a group of nodes (a community, a component, the nodes sharing a value) to one
     * node, and expanding it again: each call one undoable step, saved with the project. Experimental.
     * @beta
     */
    readonly groups: GroupsApi;
    /**
     * The record of the commands this session ran, oldest first: one entry per command that
     * finished, published as `journal:appended`. A run's `journalId` names the entry its command
     * wrote. Undo does not read it; `history` is the undo record.
     */
    readonly journal: JournalApi;
    /**
     * What is selected: two sets, five set operations, one selection for the whole session.
     *
     * Every surface reads and writes this one -- the canvas, a data table, an inspector, a
     * headset -- which is why it belongs to the session rather than to the thing that draws it.
     */
    readonly selection: SelectionApi;
    /**
     * What is visible: the DATA scope, produced by the filters and the time window.
     *
     * Never the render set. Above the renderer's ceiling fewer elements are drawn than are
     * visible here, and "analyse the visible graph" means this model rather than whatever
     * happened to be drawn.
     */
    readonly visibility: VisibilityApi;
    /**
     * The timeline: designate a time field, read its extent and histogram, and move the time
     * window along it -- set it, step it, seek it, or play it.
     * @beta
     */
    readonly time: TimeApi;
    /**
     * The style layers: what paints what, in what order, and why one element looks as it does.
     *
     * The stack is read BOTTOM FIRST, so a layer later in `list()` paints over one earlier in
     * it, and every layer is addressed by its id rather than by its place -- a position is what
     * goes wrong the moment anything else moves.
     *
     * The bottom of every stack is the element's own: the layers that give a node and an edge
     * their appearance before anything else is asked for. They carry `source.by === "element"`
     * and `locked: true`, and removing, editing or moving one is refused. That is what a
     * consumer tests rather than the layer's NAME, which two layers may share and a reader may
     * change.
     */
    readonly styles: StylesApi;
    /**
     * The shaders that belong to the project -- pasted, or carried in by a file -- and whether
     * each may run. Presets and registered shaders are in `catalog.shaders()`; this adds, checks,
     * approves and removes the project's own (design: shaders as style features).
     * @since 3.36.0
     */
    readonly shaders: SessionShaders;
    /**
     * The saved camera views, by name: camera states kept under a name of the consumer's
     * choosing. Saving and removing one are undoable steps; moving the camera to one is not.
     */
    readonly views: SessionViews;
    /**
     * The saved camera tours, by name, in project order; every change is one undoable step.
     * @since 3.58.0
     */
    readonly tours: SessionTours;
    /**
     * The session's graphs, one shown at a time: copy the graph shown, or a selection of it, into a
     * new graph, and switch between them. Each keeps its own attributes, results and styles.
     */
    readonly graphs: SessionGraphs;
    /** The annotations drawn beside the graph; every change is a step, and a project file saves them. */
    readonly annotations: SessionAnnotations;
    /** Which layout draws the graph, and in how many dimensions; choosing either is a step. */
    readonly layout: SessionLayout;
    /**
     * The element-owned node coordinates, read by dense node index, where a row no layout has
     * placed reads as unplaced rather than at the origin, with the verbs that place and pin nodes
     * as undoable steps.
     *
     * Place and pin through `set`, `pin` and `unpin`; the coordinates themselves are read-only
     * here, because a layout, a drag and a GPU readback write them and a write made there is not a
     * step.
     */
    readonly positions: SessionPositions;
    /**
     * Nodes hidden from the drawing only, with their edges, while they stay in the data, results,
     * layout and exports; hiding and showing are undoable steps.
     */
    readonly hidden: SessionHidden;
    /**
     * How many nodes the DATA arrived carrying a coordinate for.
     *
     * Ask this, not `positions.placedCount`, whenever the question is "did the file place these
     * nodes". The array above is written by the importer AND by every running layout, so one
     * frame after a file with no coordinates loads, every node carries a position because the
     * layout put it there. This counts the importer's own column, which nothing else writes.
     */
    readonly seededNodeCount: number;
    /** The O(1) facts, always current. */
    readonly status: SessionStatus;
    /** Everything the element can offer, as data. */
    readonly catalog: SessionCatalogApi;
    /**
     * The experiments this session switched on, and the requested ids it did not recognize.
     * Settled when the session is created (for an element's session, when the element first
     * renders) and the same object afterwards.
     */
    readonly features: EnabledFeatures;
    /** The settings as they are now, and `set` to change the project ones. */
    readonly config: SessionConfig;
    /**
     * What this machine can do, measured rather than guessed at by the consumer: acceleration,
     * and which immersive modes can be entered (with the reason when one cannot) and which one
     * is presenting. A session that draws nothing reports VR and AR as `"unsupported"`. Also the
     * limits a load is refused above, which `capabilities:changed` reports a change of.
     */
    readonly capabilities: SessionCapabilities;
    /**
     * What the consumer asks of the hardware: use an accelerator when there is one, never look,
     * or refuse to run without one.
     *
     * Settable, and the set applies at once: the next piece of accelerated work is planned under
     * the new policy, and `capabilities:changed` reports where that left the hardware.
     */
    acceleration: AccelerationPolicy;
    /**
     * Whether readers read the working graph: the part of the graph the filters leave shown. A
     * filter means the subset you work with, so layouts, counts, styles, framing and algorithms read
     * it. The time window is not part of it: a window step hides elements by drawing and never
     * moves the layout. The graph itself is unchanged -- edits, undo and the project file act on all
     * of it, and hidden nodes keep their positions, styles and results -- and a reader that names
     * the whole graph (`scope: "graph"`) still reads all of it.
     *
     * On, nothing a filter hides is drawn: `visibility.showContext`, and a `styles.showBranches`
     * view's `hold` and `base: "full"`, are kept but draw no hidden node, and `visibility.notDrawn`
     * lists each one as a `W_HIDDEN_NOT_DRAWN` fact (`visibility:not-drawn-changed` tells each
     * change). Time ghosts (`outside: "ghost"`) are drawn either way. Off, everything draws as
     * before.
     *
     * On by default. Off keeps every reader on the whole graph, as before 3.40.0. Settable; a session
     * setting that records no undo step and is not saved in a project file. Set it when creating the
     * session with `createGraphSession({ workingGraph: false })`, or on the element with
     * `working-graph="false"`.
     * @since 3.40.0
     */
    workingGraph: boolean;
    /**
     * Attach an accelerator the caller built, or detach the current one with `null`.
     *
     * For tests and third parties. An injected accelerator is never replaced by a probed one and
     * is not disposed by the session -- whoever built it owns its lifetime.
     * @param accelerator - The accelerator to attach, or null to detach.
     */
    setAccelerator(accelerator: GraphAccelerator | null): void;
    /**
     * Measure how fast this machine runs the element's work, once per page, so that later
     * estimates report `confidence: "calibrated"` instead of `"modelled"`.
     *
     * The probe takes about a quarter of a second and hands the thread back between its pieces.
     * Every session on the page shares one measurement: a second call, from this session or
     * another, resolves with the first one's answer. When it resolves, `capabilities.calibration`
     * says when it ran and whether it measured (`basis: "probe"`) or could not and kept the
     * shipped rates (`"defaults"`), and `capabilities:changed` reports the change.
     * @param options - `signal` stops waiting: the call rejects with the signal's reason (an
     *     `AbortError` unless it says otherwise). The shared measurement still finishes and is kept.
     * @returns The limits in force, the same document `capabilities.limits` returns.
     * @since 3.40.0
     */
    calibrate(options?: Pick<RunOptions, "signal">): Promise<Readonly<DefaultableLimits>>;
    /**
     * The current snapshot. Its structure, id map and attribute columns are the graph's own,
     * shared rather than copied; its `position` and `graphty.pinned` columns are copies taken
     * now, because the graph's own are written by the layout every frame and a write into them
     * would place nodes without a step. Place and pin through `session.positions`.
     * @returns the sealed graph-format snapshot
     */
    snapshot(): GraphSnapshot;
    /**
     * The topology fingerprint. Same answer as `data.fingerprint()`.
     * @returns the fingerprint
     */
    fingerprint(): string;
    /**
     * What a find box lists as the reader types: the nodes and edges whose values contain the
     * text, best first, and the commonest matched values. Selects nothing and records no step;
     * hand a hit's or a row's `target` to `selection.apply` for that.
     *
     * Matching ignores case and accents and reads the text box grammar of
     * `selection.apply({ text })`: plain text matches anywhere in a value, `exact:` only a whole
     * value, and `<attribute>:` (`id:`, `type:`) only that attribute. `regex:` and a leading `=`
     * are not run while typing; they set `notSearchable` and list nothing.
     *
     * A node is found by its id, its name and its attribute values; an edge by its own attribute
     * values, and by its two ends' names when `edgeNameJoiner` is set. A number or boolean value matches only whole. Ranking promises only this: an
     * exact name or id first, name and id matches before attribute values, ties in graph order.
     *
     * Synchronous: the first call after a change builds an index in one walk of the graph, and
     * every later call in the same revision reads it. At the load limit (50,000 nodes with 20
     * attributes each, 100,000 edges) the build takes about half a second and a later call 2 to
     * 9 ms.
     * @param text - What was typed. Blank text finds nothing.
     * @param options - The window, the kinds and the scope.
     * @returns A page of hits and at most three value rows.
     * @throws A `GraphtyError` coded `E_OPTION_RANGE` for a bad `limit`, `offset` or kind.
     */
    find(text: string, options?: FindOptions): FindResult;
    /**
     * Do one thing, as a command.
     *
     * The same verb `runs.start` offers, reached through the serializable form -- so a recipe, a
     * journal entry and an agent's tool call all replay through one door rather than three.
     * @param command - What to do.
     * @param options - The signal, the progress handler and how the call joins the queue.
     * @returns The run, awaitable and watchable straight away.
     */
    run(command: AlgorithmRunCommand, options?: RunOptions): Run;
    /**
     * Do any command in the vocabulary (`COMMANDS` in `@graphty/graphty-element/commands`).
     *
     * Returns the op's outcome directly, not wrapped in a promise; every outcome is itself
     * awaitable (a `Run` for `algo.run`), so `await session.execute(...)` waits for the command,
     * and a caller that wants the run handle keeps the returned value without awaiting it.
     * @param command - The command.
     * @returns Its outcome.
     */
    execute<C extends SessionCommand>(command: C): CommandOutcome<C>;
    /**
     * Undo the last step, or cancel pending undoable work dispatched after it instead. Never
     * waits for pending work. Resolves once the picture matches the state.
     * @returns What was done; `{ kind: "nothing" }` when there was nothing to undo.
     */
    undo(): Promise<HistoryOutcome>;
    /**
     * Redo the last undone step. Resolves once the picture matches the state.
     * @returns What was done; `{ kind: "nothing" }` when there was nothing to redo.
     */
    redo(): Promise<HistoryOutcome>;
    /** Whether `undo()` would do something: undo a step or cancel pending work. */
    readonly canUndo: boolean;
    /** Whether `redo()` would do something. */
    readonly canRedo: boolean;
    /** The steps, the cursor, the pending work and the budget. */
    readonly history: SessionHistory;
    /** Saving the whole session to one project file and opening one again. */
    readonly project: ProjectApi;
    /**
     * A session's analysis and style layers as one recipe file, applied to other data. Needs the
     * `save-files-v2` experiment.
     * @since 3.40.0
     * @experimental save-files-v2
     * @beta
     */
    readonly recipes: RecipesApi;
    /**
     * What a file is, read from its contents: a project, a recipe, a style file or graph data.
     * @since 3.40.0
     * @beta
     */
    readonly files: FilesApi;
    /**
     * What was done to the data and how it is drawn, as a document that names columns by name
     * and role and never names a node or an edge: the sources, the columns (roles, types,
     * declarations, hidden), the joins, the ignored issues, the filter and the style layers. A
     * filter leaf or a style layer that names elements is left out and counted in `leftOut`.
     * Read from the current state, so an undone step is not in it.
     * @returns The recipe, frozen.
     * @since 3.30.0
     */
    recipe(): RecipeDocument;
    /**
     * Run `fn`, and record everything it dispatches through `tx` as one step. Throw, or abort
     * the transaction, to roll all of it back. A transaction that changed nothing records
     * nothing. Its step never merges with the edits before or after it, which merge into the
     * step on top when they change the same thing: a transaction keeps an edit a step of its own.
     * @param label - The step's label.
     * @param fn - The body; `signal` fires when the transaction is aborted.
     * @param options - Provenance stamped on the step.
     * @returns What `fn` returned, once the step is recorded and the picture has caught up.
     */
    transaction<T>(
        label: string,
        fn: (tx: TransactionScope, signal: AbortSignal) => T | Promise<T>,
        options?: TransactionOptions,
    ): Promise<T>;
    /**
     * What one command would cost, answered synchronously.
     *
     * Synchronous because a user interface has to decide how a button behaves before the click
     * happens, and a promise cannot gate a click. It is O(1) in the size of the graph: the
     * session maintains the statistics it reads.
     * @param command - What would be done.
     * @returns The estimate, which reports `available: false` with a reason rather than throwing.
     */
    estimate(command: SessionCommand): CostEstimate;
    /**
     * Which layout suits the graph this session holds: `recommendLayout` over its statistics, the
     * nodes its data placed (`seededNodeCount`), and whether its nodes carry geographic locations
     * the location map layout can read.
     * @returns The recommendation, or undefined when the catalog serves none.
     * @since 3.37.0
     */
    recommendLayout(): LayoutRecommendation | undefined;
    /**
     * What one command would do, what it would cost, and whether it would be allowed.
     * @param command - What would be done.
     * @returns The plan.
     */
    plan(command: SessionCommand): Promise<Plan>;
    /**
     * Watch the session.
     * @param event - Which event.
     * @param handler - Called with the event's detail.
     * @returns A function that stops the subscription. There is no `off` to learn.
     */
    on<K extends keyof SessionEventMap>(event: K, handler: (detail: SessionEventMap[K]) => void): () => void;
    /**
     * Release what this session owns: the accelerator it attached, the store it built, and every
     * run still in flight.
     *
     * A store handed in by a caller is NOT disposed -- the caller that built it owns its
     * lifetime. Calling this twice is harmless.
     */
    dispose(): void;
}

/**
 * The session as the element's own renderer holds it: everything a consumer sees, plus the two
 * live mask readers the render loop needs.
 *
 * Both extras exist for the same reason and it is a shape disagreement rather than a privilege.
 * A consumer reads the selection as a list of ids and the visible set as a set of ids; the render
 * loop needs the mask OBJECTS, so that it can test one element at a time and key its "have I
 * already drawn this?" bookkeeping on a mask's version without materializing a list of fifty
 * thousand ids every frame. Nothing here decides anything a consumer could not decide -- the
 * verbs are the same verbs -- which is why the renderer is not a privileged consumer, merely a
 * per-element one.
 */
export interface ElementSession extends GraphSession {
    /** The selection, with the synchronous door a gesture handler needs and the live masks. */
    readonly selection: SelectionOwner;
    /** Visibility, with the live masks. */
    readonly visibility: SessionVisibilityApi;
    /** The style stack, with the compiled form a repaint reads and a consumer has no use for. */
    readonly styles: SessionStylesApi;
    /**
     * What the last style pass painted, per element.
     *
     * The third member of the same shape disagreement. A consumer asks what one element looks
     * like through `styles.explain(...)`, which answers in whole sentences about layers; a render
     * loop asks fifty thousand times a second which source mesh an element belongs to and what
     * color to write into its instance, and it asks by dense index. Neither the questions nor
     * the verbs differ -- the stack is still the one that decides -- only the shape of the answer.
     */
    readonly paint: ElementPaint;
    /**
     * Publish what happened to a model a layer names, as `model:changed`.
     * @param change - The change.
     */
    publishModelChange(change: ModelChange): void;
    /**
     * Publishes `canvas:empty-click`; the renderer calls it for a click on empty canvas.
     * @param at - Where the click landed.
     * @param at.x - Its distance from the drawing's left edge, in CSS pixels.
     * @param at.y - Its distance from the drawing's top edge, in CSS pixels.
     * @param at.secondary - Whether it was a secondary-button (right) click; false when left out.
     */
    emptyClick(at: { readonly x: number; readonly y: number; readonly secondary?: boolean }): void;
    /**
     * Publishes `canvas:element-click`; the renderer calls it for a click on a node or an edge.
     * @param target - What the click landed on.
     */
    elementClick(target: { readonly node: NodeId } | { readonly edge: EdgeId }): void;
    /**
     * Publishes `camera:gesture-end`; the renderer calls it when a reader's camera gesture ends.
     * @param kind - What the gesture did.
     */
    cameraGestureEnd(kind: CameraGestureKind): void;
    /**
     * Publishes `canvas:group-outline-click`; the renderer calls it for a click on a group outline.
     * @param target - The outline's layer, shader and group.
     */
    groupOutlineClick(target: GroupOutlineClick): void;
    /**
     * Record the layout's motion and publish `layout:motion-changed` when it changed; the
     * renderer calls it whenever its layout starts, pauses or comes to rest.
     * @param motion - The motion now.
     */
    layoutMotion(motion: LayoutMotion): void;
    /**
     * What the renderer fades edges by age with (`time.settings.ageFade`): each edge's start and
     * the window, normalized over the data's extent. Null while the setting draws no fade.
     */
    readonly edgeAges: () => EdgeAgeFade | null;
}

/**
 * What {@link createGraphSession} accepts.
 *
 * The session is the only writer of its graph and its settings, which is what makes every change
 * undoable: hand data in through `session.data.import`, `addNodes` and `addEdges`, and settings
 * through `session.config.set`.
 */
export interface CreateGraphSessionOptions {
    /** The configuration. Every part not given takes the element's own default. */
    readonly config?: {
        /**
         * The data configuration the session starts from; any part left out takes its default.
         * Change it later with `config.set`.
         */
        readonly data?: NonNullable<ProjectConfigPatch["data"]>;
        /** The acceleration policy and threshold. */
        readonly acceleration?: {
            /** Use an accelerator when available, never look, or refuse to run without one. */
            readonly policy?: AccelerationPolicy;
            /** The node count at or above which accelerated work uses the accelerator. */
            readonly minNodes?: number;
        };
    };
    /**
     * An acceleration controller to publish capabilities from, so a host that already owns one
     * does not end up with two. When absent the session builds one and disposes it with itself.
     */
    readonly acceleration?: AccelerationControllerLike;
    /** How this session runs algorithms. */
    readonly runs?: SessionRunsOptions;
    /**
     * The most nodes and edges a load may bring; a field left out keeps `DEFAULT_LIMITS`. A
     * session with no renderer draws nothing, so it holds them as given; on the element,
     * `limits` is honored only under `render-path="batched"`. `capabilities.limits` reports
     * what is in force.
     * @experimental cosmograph
     */
    readonly limits?: Readonly<LimitsOption>;
    /**
     * The experiments to switch on, by id, or `["all"]`; absent takes the page default set with
     * `setDefaultFeatures`. Unknown ids are listed in `features.unknown`, never thrown.
     */
    readonly features?: readonly string[];
    /**
     * Start with the working graph on: readers that name no scope read what the filters leave
     * shown (never the time window). Default true; false keeps them on the whole graph. See
     * `GraphSession.workingGraph`.
     * @since 3.40.0
     */
    readonly workingGraph?: boolean;
}

/**
 * How a session runs algorithms.
 *
 * `execute` is the one member without a default, and the reason is worth stating: every algorithm
 * this package ships is constructed from the renderer's `Graph` and reads the graph through its
 * data manager, so the session -- which must resolve in Node with no renderer anywhere in its
 * import graph -- cannot reach one. The element builds the executor and hands it in. A session
 * built without one answers `runs.start` with `E_UNSUPPORTED` rather than pretending.
 */
export interface SessionRunsOptions {
    /**
     * The thing that actually runs an algorithm. Absent means this session cannot run one.
     */
    readonly execute?: RunExecutor;
    /**
     * The queue runs take their turn in. Absent builds a sequential one of the session's own,
     * which is right for a headless session and wrong for a rendered graph: a rendered graph has
     * loads, layouts and style passes that must not interleave with a run, and it hands in the
     * element's own operation queue so that they do not.
     */
    readonly queue?: RunQueue;
    /** Which versions are producing the numbers. Defaults to the element's own. */
    readonly engine?: EngineVersions;
    /** What a call that names no scope gets. Defaults to the visible graph. */
    readonly defaultScope?: Scope;
    /**
     * The caveats a run starts from, before the work refines them. `facts` may be left out: a run
     * starts with none.
     */
    readonly defaultCaveats?: Caveats | Omit<Caveats, "facts">;
    /** The cap and the memory budget the cost gate compares a run against. */
    readonly limits?: Readonly<CostGateLimits>;
    /** Reads this machine's measured throughput, when the host has measured it. */
    readonly calibration?: () => MachineCalibration | undefined;
    /** Reads the most recent timing of each algorithm on this machine. */
    readonly measurements?: () => ReadonlyMap<AlgorithmKey, CostMeasurement> | undefined;
}

/**
 * The part of the acceleration controller a session uses.
 *
 * Declared structurally so that a caller can hand in the controller it already holds without the
 * session naming the class, and so that a test can publish a fixed capability document.
 */
export interface AccelerationControllerLike {
    /** The published capabilities subset. */
    readonly capabilities: AccelerationCapabilities;
    /** What the consumer asked for. */
    readonly policy: AccelerationPolicy;
    /** The node count at or above which accelerated work uses the accelerator. */
    readonly minNodes: number;
    /**
     * The attached accelerator, or null when none is. A run records its package beside the
     * element's own (spec/README.md 4.5 rule 6). Absent, no accelerator package is recorded.
     */
    readonly accelerator?: GraphAccelerator | null;
    /**
     * Changes what the consumer asks of the hardware.
     * @param policy - The new policy.
     */
    setPolicy(policy: AccelerationPolicy): void;
    /**
     * Attaches an accelerator the caller built, or detaches the current one with `null`.
     * @param accelerator - The accelerator, or null to detach.
     */
    setAccelerator(accelerator: GraphAccelerator | null): void;
    /**
     * Watches every transition.
     * @param listener - Called with the new status.
     * @returns A function that stops the subscription.
     */
    onChange(listener: (status: AccelerationStatus) => void): () => void;
    /** Releases the hardware. */
    dispose(): void;
}

/** The largest number of component sizes {@link ComponentStatistics.sizes} will list. */
export const COMPONENT_SIZE_CAP = 1000;

/** How many sample values an {@link AttributeDescriptor} carries. */
export const ATTRIBUTE_SAMPLE_CAP = 5;

/**
 * Above this many distinct values an attribute stops being counted as a category, and
 * `uniqueCount` stops being tracked exactly.
 */
export const ATTRIBUTE_UNIQUE_CAP = 256;
