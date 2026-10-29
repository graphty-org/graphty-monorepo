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
 * The rule that decides whether a thing belongs here or on the view: if two synchronised views
 * of one dataset would DISAGREE about it, it belongs to the view. A camera disagrees. Node
 * count, coordinates and statistics do not.
 */

import type { DerivedGraph, GraphSnapshot, NodeId } from "@graphty/graph-format";
import type { SourceListing, SourceListQuery, SourceProbe } from "@graphty/graph-io";
import type { StyleTool } from "@graphty/graph-io/styles";
import type { GeneratorParams } from "@graphty/graph-samples/generators";
import type { z } from "zod";

import type {
    AccelerationCapabilities,
    AccelerationPolicy,
    AccelerationStatus,
    Capabilities,
    GraphAccelerator,
} from "../acceleration";
// EdgeId comes from the ELEMENT's catalogue rather than from graph-format, which is the one line
// that makes `const id: EdgeId = record.id` type-check. This entry point used to publish two
// different EdgeId types -- graph-format's `string | number` on EdgeRecord and the catalogue's
// `string` everywhere else -- so assigning one to the other was an error on the element's own
// published surface.
import type { CameraState } from "../camera/types";
import type {
    AlgorithmKey,
    AttributeDescriptor,
    CatalogApi,
    DeprecatedCatalogMethod,
    EdgeId,
    LayerId,
    LayoutId,
    MeasurementDeclaration,
    Path,
    ReadableValue,
    RuleTree,
    RunId,
    Scope,
    ScopeInput,
    SelectionDirection,
    SetId,
    SourceKey,
    StructureValue,
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
import type { AssetId, AssetsApi } from "./assets/AssetsApi";
import type { CostEstimate, CostGateLimits, CostMeasurement, MachineCalibration } from "./cost";
import type { DataIssue, FixCode, FixResult, IssueId } from "./issues";
import type { JournalApi, JournalEntry } from "./journal";
import type { LayoutRecommendation } from "./layout";
import type { NetworkApi, NetworkRequest } from "./network";
import type { NoteChange, NoteId, NotesApi } from "./notes/types";
import type { AlgorithmRunCommand, Plan, SessionCommand } from "./planning";
import type { ProjectApi, ProjectStatus } from "./projectFile";
import type { RecipeDocument } from "./recipe";
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
    SourceRefreshReport,
} from "./sources/types";
import type { ElementPaint, SessionStylesApi, StyleBatchChange, StyleChange, StylesApi } from "./styles";
import type { FileStyleOptions } from "./styles/fileStyles/translate";
import type { TimeUnit } from "./time/parse";
import type { TimeApi, TimeField, TimeStepEvent } from "./time/TimeApi";
import type { SessionVisibilityApi, TimeWindow, VisibilityApi, VisibilityChange } from "./visibility";

/**
 * The element's data configuration, parsed: the id and weight paths, the position scale, the
 * direction policy and the id coercion rule.
 *
 * It is the configuration the session's own behaviour reads, which is why it is the part of the
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

/** The attribute bag one record arrived with, as the session reads it. */
export type SessionAttributes = Readonly<Record<string, unknown>>;

/** What a page of records is sorted by: one of the keys its records carry. */
export interface RecordSort {
    /**
     * The record key to sort by: a top-level attribute, or `id` (and `source` or `target` for an
     * edge), read literally. Numbers (bigints among them) come before text, text sorts in natural
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
    /** Which records: any scope, such as `"selection"` or `{ set: id }`. Default `"graph"`. */
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
    readonly matching?: { readonly text: string; readonly mode?: SelectionTextMode };
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

/** Which edges a page holds: {@link RecordPageOptions}, plus the edges at one node. */
export interface EdgePageOptions extends RecordPageOptions {
    /** Only the edges with this node at one end or both. */
    readonly touching?: NodeId;
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
     * Where to search. Default the whole graph: a hit the visibility filter hides is still
     * listed, and carries `excludedBy`.
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
    readonly booleanWords?: { readonly true: string; readonly false: string };
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
    readonly match: { readonly path: Path; readonly value: FindMatchValue };
    /**
     * Present when the element is in the graph but `session.visibility` hides it (the time window
     * is part of that filter). Never present under `scope: "visible"`, which leaves hidden
     * elements out.
     */
    readonly excludedBy?: { readonly kind: "filter" };
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
          readonly ends: { readonly source: FindEnd; readonly target: FindEnd };
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
    readonly atLeast?: { readonly count: number; readonly target: SelectionTarget };
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
    readonly atLeast?: { readonly value: number; readonly count: number; readonly target: SelectionTarget };
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
    readonly totals: { readonly node: number; readonly edge: number };
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
    /** Which neighbors are listed: any scope, such as `"selection"`. Default `"graph"`. */
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
    readonly excludedBy?: { readonly kind: "filter" };
}

/** The weight a graph was loaded with: `session.data.loadedWeight()`. */
export interface LoadedWeight {
    /** The edge attribute the weights were read from. */
    readonly attribute: string;
    /** What the weight means, or null when the load did not say. */
    readonly meaning: WeightMeaning["meaning"] | null;
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
 * needs the second. A properties panel that prints "Directed" on a CSV nobody labelled is stating
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
     * Edges as a fraction of the pairs that could carry one, self-loops excluded from both
     * halves. Zero for a graph with fewer than two nodes.
     */
    readonly density: number;
    /**
     * Whether the graph is directed, as a fact about the graph rather than a guess per edge.
     *
     * `"unknown"` is the honest answer for an empty graph the element was never told about:
     * under `data.directed: "auto"` nothing has settled the question yet. `"mixed"` is in the
     * union because a format can report it; the element does not produce it today, because a
     * snapshot carries one flag for the whole graph.
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
     * The mean total degree, over the same measure {@link GraphStatistics.degreeRange} summarises:
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
     * summarises, binned the way `RunResult.histogram` bins a count. One bar per degree when there
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
    readonly values: readonly { readonly value: string | number | boolean; readonly count: number }[];
    /** How many elements of the kind carry no value for the path. */
    readonly missing: number;
    /** How many elements of the kind there are: the values' counts plus `missing`. */
    readonly total: number;
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
    readonly examples: readonly { readonly value: unknown; readonly converted: unknown }[];
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
    | (Histogram & { readonly kind: "numeric" })
    | {
          readonly kind: "categorical";
          /**
           * The commonest values, most elements first; a tie keeps the order the values were first
           * seen in. At most `bins` of them (20 unless asked).
           */
          readonly values: readonly { readonly value: string | number | boolean; readonly count: number }[];
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
     * @returns the record, carrying the id as the graph holds it, or undefined when the graph has
     *     no such node
     */
    node(id: NodeId): NodeRecord | undefined;
    /**
     * What a node is called: the value of its label column (`data.knownFields.nodeLabelPath`) as
     * text, else its id as text. The same name {@link neighbors} gives each neighbor and a result
     * summary gives each element, so a header and a list never disagree. Untrusted text from the
     * data: render it as text, never as markup.
     *
     * ```ts
     * const title = session.data.name(nodeId) ?? String(nodeId); // "Javert"
     * ```
     * @param id - the node id; an integer id may be written either way, as {@link node} takes it
     * @returns the name, or undefined when the graph has no such node
     */
    name(id: NodeId): string | undefined;
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
     * @returns the records, deep-frozen
     */
    nodes(): readonly NodeRecord[];
    /**
     * Every edge, in the graph's order: the records {@link edge} reads one at a time. Walks the
     * whole graph on every call, so read it when the graph changes, not every frame.
     * @returns the records, deep-frozen
     */
    edges(): readonly EdgeRecord[];
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
    nodePage(
        options: RecordPageOptions & { readonly columns: readonly ResultColumn[] },
    ): RecordPage<NodeRecord> & { readonly columns: readonly PageColumn[] };
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
    edgePage(
        options: EdgePageOptions & { readonly columns: readonly ResultColumn[] },
    ): RecordPage<EdgeRecord> & { readonly columns: readonly PageColumn[] };
    edgePage(options?: EdgePageOptions): RecordPage<EdgeRecord>;
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
     * @returns the loads, or an empty list when no import loaded the graph
     * @since 3.30.0
     */
    sources(): readonly LoadedSource[];
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
     * @returns the issues, those a load saw first
     * @since 3.30.0
     */
    issues(options?: { readonly includeIgnored?: boolean; readonly includeFixed?: boolean }): readonly DataIssue[];
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
     * edge another load also supplied stays, as does anything no load recorded.
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
     * ```ts
     * const key = await session.data.matchesSource({ config: { file } });
     * if (key !== null) {
     *     const report = await session.data.replaceSource(key, { config: { file } });
     *     report.edges; // { added: 12, removed: 3, changed: 40 }
     * }
     * ```
     * @param key - The load's key, from {@link SessionDataApi.sources}.
     * @param source - The newer copy, as `import` takes it.
     * @param choices - How to read it, as `draft.load` takes them; `mode` is ignored.
     * @returns What was added, removed and changed, and what no longer matches anything.
     * @throws A `GraphtyError` (as a rejection) with `E_SOURCE_UNKNOWN` for a key `sources()` does not list.
     * @since 3.30.0
     */
    replaceSource(key: SourceKey, source: DataSourceInput, choices?: LoadChoices): Promise<ReplaceReport>;
    /**
     * Read one load again from what it was read from, with changed choices -- another id, source
     * or target column, the kinds of its ends, kept or scoped ids -- as one undoable step that
     * keeps everything else, as {@link SessionDataApi.replaceSource} does. The choices are laid
     * over the ones the load was read with (`LoadedSource.choices`); a mapping key set to `null`
     * goes back to the element's own reading. Only a load this session read itself can be read
     * again (`LoadedSource.reloadable`): what a file was is never saved in a project.
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
     * @returns the descriptors, node attributes first, each kind in first-seen order
     */
    attributes(): readonly AttributeDescriptor[];
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
     * @returns settles once the step is recorded
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` for a column no record carries,
     *     `E_BAD_COMMAND` (`details.reason: "role-kind"`, with `details.roles`) for a role the
     *     column's kind has no field for, and `E_UNSUPPORTED` (`details.reason: "reload"`) for
     *     `key`, `source`, `target` or `edgeId` on rows already loaded.
     * @since 3.30.0
     */
    setRole(column: ColumnRef, role: ColumnRole | null): Promise<void>;
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
     * @since 3.30.0
     */
    renameColumn(column: ColumnRef, name: string): Promise<void>;
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
     *     by default, 1 to 100); `scale`: a numeric column's axis, as `RunResult.histogram` takes it
     * @returns the distribution
     * @throws A `GraphtyError` with `E_UNKNOWN_ATTRIBUTE` (with `details.candidates`) for a column
     *     no record carries, and `E_OPTION_RANGE` for a bin count outside 1 to 100.
     */
    histogram(column: ColumnRef, options?: HistogramOptions): ColumnHistogram;
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
     * @returns The counts, most elements first.
     * @since 3.37.0
     */
    valueCounts(path: Path, options?: { readonly kind?: "node" | "edge" }): ValueCounts;
    /**
     * The graph's shape. Walked once per snapshot and cached.
     * @param options - What to measure.
     * @param options.scope - `"visible"` measures only what the filters and the time window leave
     *     showing (the same as the whole graph while nothing is hidden). Default `"all"`.
     * @returns the statistics
     */
    statistics(options?: { readonly scope?: "all" | "visible" }): GraphStatistics;
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
     * once when its name says nothing. A format nothing recognises rejects with
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
     * ```ts
     * const { added, removed, updated } = await session.data.refresh(session.data.loads()[0].key);
     * ```
     * @param load - The load's key, from `sources()` or `loads()`.
     * @param options - The credential and the endpoint.
     * @returns The node and edge counts added, removed and updated; rejects with
     *     `E_LOAD_UNKNOWN` for an unknown key, `E_SOURCE_PENDING` for a load of an opened project
     *     that has not run since it opened, else with the source's code.
     */
    refresh(load: string, options?: SourceLoadOptions): Promise<SourceRefreshReport>;
    /**
     * Load one of the public samples the registered sources list (`samples` on a descriptor of
     * `sourceDescriptors()`, graph-samples' datasets among them), as one undoable step: the
     * sample's params, its endpoint and the login its service publishes, so
     * `loadSample("neo4j-movies")` is the whole call. Experimental.
     * @param id - The sample's id, such as `"string-tp53"` or `"graph-samples-karate"`.
     * @param options - Anything `import` takes; a `credential` or `endpoint` given here wins.
     * @returns Settles once the sample is in the graph; rejects with `E_SOURCE_UNKNOWN` (its
     *     `known` lists every sample id) when no source lists the id.
     */
    loadSample(id: string, options?: LoadChoices & SourceLoadOptions): Promise<void>;
    /**
     * The loads from network sources this graph holds, in order: what a refresh needs, never a
     * secret. Experimental.
     * @returns The records.
     */
    loads(): readonly SourceLoadRecord[];
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
     * @returns The draft.
     */
    prepare(
        source: DataSourceInput,
        options?: { readonly signal?: AbortSignal; readonly onto?: "graph"; readonly guess?: "names" | "values" },
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
     * with its parameters (each one left out takes its catalogue default). The same name and
     * parameters give the same graph on every platform. A random generator's `seed` picks which
     * graph.
     * @param name - The generator's name, e.g. `"barabasi-albert"`.
     * @param params - Its parameters by name, e.g. `{ n: 500, m: 3 }`.
     * @param options - Whether to replace the graph (the default) or add to it.
     * @returns Settles once the graph is loaded. Rejects with `E_UNKNOWN_GENERATOR` for a name the
     *     catalogue does not list, `E_UNKNOWN_OPTION` for a parameter the generator does not take,
     *     and `E_OPTION_RANGE` for a value it refuses; nothing is recorded then.
     */
    generate(name: string, params?: GeneratorParams, options?: ImportOptions): Promise<void>;
    /**
     * Download one of `catalog.datasets()` by name and load it, as one undoable step.
     * @param name - The dataset's name, e.g. `"karate"`.
     * @param options - Whether to replace the graph (the default) or add to it, where to download
     *     from (`baseUrl`: a mirror of the published files; graphty.app by default) and a signal
     *     that abandons the download. Loads land in the order they were asked for, so a load
     *     asked for after this one waits until this download finishes or fails; aborting the
     *     signal, even once the download has finished, stops it and lets the next load through.
     * @returns Settles once the graph is loaded. Rejects with `E_UNKNOWN_DATASET` for a name the
     *     catalogue does not list (unless `baseUrl` is given) and `E_FETCH_FAILED` when the
     *     download fails; nothing is recorded then.
     */
    loadDataset(name: string, options?: DatasetLoadOptions): Promise<void>;
}

/** What `data.loadDataset` takes besides the name. */
export interface DatasetLoadOptions extends ImportOptions {
    /** Where the dataset files are published; graphty.app's copy when absent. */
    readonly baseUrl?: string;
    /** Abandons the download. */
    readonly signal?: AbortSignal;
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
     * Load the held rows as one undoable step, without reading the source again. For a graph
     * file (every table `fixed`), a load with no `mapping` loads what `data.import` of the same
     * source loads, and also sets `data.knownFields.nodeLabelPath` to the file's `label` field
     * when no label path is configured.
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
    /** Let go of the held rows. */
    dispose(): void;
    /**
     * Whether the file carries styles a load with `styles: "file"` would draw, and how many rules
     * they hold per kind; null when the format cannot carry styles or the file holds none.
     */
    readonly styles: { readonly declared: boolean; readonly summary: FileStyleSummary } | null;
}

/** How many rules a file's styles hold, and the program whose defaults fill in the rest. */
export interface FileStyleSummary {
    /** The rules for nodes. */
    readonly nodeRules: number;
    /** The rules for edges. */
    readonly edgeRules: number;
    /**
     * The program that wrote the file, whose defaults fill in what it leaves unset (`gephi`,
     * `cytoscape`, `graphviz`, ...), or null when it is not known. Open union.
     */
    readonly tool: FileStyleTool | null;
}

/** The program whose defaults a file's styles take: graph-io's tool ids. Open union. */
export type FileStyleTool = StyleTool;

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
    /** True when the format sets the roles (every format but CSV). A mapping for it is refused with `E_BAD_COMMAND`. */
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
    readonly delimiter?: { readonly value: string; readonly detected: boolean };
}

/** One column of a draft table, described as `data.attributes()` describes it after a load. */
export interface DraftColumn extends Pick<
    AttributeDescriptor,
    "name" | "type" | "completeness" | "uniqueCount" | "sampleValues"
> {
    /** The role the element gives it by itself; absent when it is a plain attribute. */
    readonly suggested?: ColumnRole;
}

/**
 * What a column can be to a load. `kind` is the column whose values name each row's kind: a
 * node's, which loads as its `kind` attribute and keeps ids of different kinds apart under
 * `LoadChoices.kindIds` `"scoped"`, or an edge's, which loads as its `kind` attribute. The
 * {@link LocationKind}s (`latitude`, `longitude`, `coordinates`, `country`, `region`, `city`) are
 * where a node's location is read from, one column per kind (`data.setRole` only).
 */
export type ColumnRole = "key" | "label" | "source" | "target" | "weight" | "time" | "edgeId" | "kind" | LocationKind;

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
}

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
     */
    readonly timeUnit?: TimeUnit | null;
    /** The column holding an edge's own id. Written to `data.knownFields.edgeIdPath`. */
    readonly edgeId?: string | null;
    /** The column naming each row's kind, which loads as the node's or edge's `kind` attribute. */
    readonly kind?: string | null;
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

/** A bare `TableMapping` applies to a source with one table; otherwise each table is named by id. */
export type LoadMapping = TableMapping | { readonly tables: Readonly<Record<string, TableMapping>> };

/** One table's roles as the element reads them: `rowsAre` always set, endpoints always objects. */
export interface TableMappingRead extends TableMapping {
    readonly rowsAre: "nodes" | "edges";
    readonly source?: Endpoint;
    readonly target?: Endpoint;
}

/** Every table's roles as the element reads them. */
export interface LoadMappingRead {
    readonly tables: Readonly<Record<string, TableMappingRead>>;
}

/** What `import` and `LoadDraft.load` take. */
export interface LoadChoices extends ImportOptions {
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
     */
    readonly styles?: "file" | "none";
    /** How a file's styles are turned into layers, when `styles` is `"file"`. */
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
    readonly counts: { readonly nodes: number; readonly edges: number };
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
    /** How many nodes and edges the load added to the graph. */
    readonly added: { readonly nodes: number; readonly edges: number };
    /**
     * Edge rows the load left out because they named a node no node row held (`unmatched:
     * "leave-out"`), and how many distinct such names, as `LoadReport.unmatched` counts them.
     * Present only when the load left at least one row out.
     */
    readonly leftOut?: {
        readonly rows: number;
        readonly values: number;
        /**
         * The names of the columns the load read each row's two ends from. Absent when an end was
         * read by an expression that is not a plain column name, or in a project saved before it
         * was kept.
         */
        readonly endColumns?: { readonly source: string; readonly target: string };
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
    readonly choices?: LoadChoices;
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
 *
 * OPEN UNION: shapes may be added in a minor release.
 * @since 3.30.0
 */
export type JoinShape = "node-values" | "edge-values" | "edges" | "rows" | "replace";

/**
 * One pair of a join's key: a column of the incoming table and the graph value it matches.
 * @since 3.30.0
 */
export interface JoinKey {
    /** The incoming table's column. */
    readonly file: string;
    /** The graph value: `"id"` (the node id, or the edge id) or `"data.<column>"`. */
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
}

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
     * A column the graph already has: `"keep"` the graph's value where it has one, `"overwrite"`
     * it, or keep `"both"` (the default), the incoming one as `<column> (<table name>)`.
     */
    readonly clash?: Readonly<Record<string, "keep" | "overwrite" | "both">>;
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
     * A mapping table: a joined table (`sources()` key) with one column holding the incoming
     * keys and one holding the graph's, through which incoming keys are translated first.
     */
    readonly via?: SourceKey;
}

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
    readonly clashes: readonly { readonly column: string; readonly code: "clash" }[];
    /**
     * For each incoming row, in table order: the nodes (edges for `"edge-values"`) its key matches,
     * or for `"edges"` its source and target nodes when both are in the graph; empty when it
     * matches nothing. Empty for `"rows"` and `"replace"`.
     * @since 3.30.0
     */
    readonly rowMatches: readonly (readonly (NodeId | EdgeId)[])[];
    /** The nodes (or edges) {@link JoinReport.withoutValue} counts. @since 3.30.0 */
    readonly withoutValueIds: readonly (NodeId | EdgeId)[];
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
        readonly name: string;
        readonly columns: readonly string[];
        readonly rows: readonly Readonly<Record<string, unknown>>[];
    };
    /**
     * For values: each element's values before the join wrote over them, by id, null for a value
     * it did not have, so editing the join can put them back.
     */
    readonly before?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

/**
 * Where a load came from, as {@link LoadedSource.kind} says: a file the reader gave (or inline
 * text), a URL, a network source, a generated or sample graph, or a table joined onto an earlier
 * load. A saved project's `graphty-sources` entry names the same kinds `file`, `url`, `source`
 * (for `server`) and `sample`, and a join as a `file` entry with `joinedOnto`. OPEN UNION: kinds
 * may be added.
 */
export type LoadedSourceKind = "file" | "url" | "server" | "sample" | "join";

/**
 * What `session.data.removeSource(key)` did.
 * @since 3.30.0
 */
export interface RemoveSourceResult {
    /** The nodes and edges that went: the load supplied them and no other load did. */
    readonly removed: { readonly nodes: number; readonly edges: number };
    /** The load's nodes and edges that stayed, because another load also supplied them. */
    readonly kept: { readonly nodes: number; readonly edges: number };
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
}

/** How an import treats the graph already there. */
export interface ImportOptions {
    /** `"replace"` (the default) empties the graph first, in the same step; `"merge"` adds to it. */
    readonly mode?: "replace" | "merge";
    /**
     * `"recommended"` also chooses a layout for what was loaded, from its shape and its
     * coordinates, in the same step; `"keep"` (the default) leaves the layout as it is.
     */
    readonly layout?: "recommended" | "keep";
    /**
     * `"step"` (the default) records the load as one undoable step. `"start"` makes the loaded
     * graph where the history starts, as opening a new project does: the load is never undone or
     * cancelled by `undo()` (while it is pending `canUndo` is false unless later work is), the
     * steps recorded before it was called are dropped once it is in, and work dispatched while it
     * was pending is kept as its own steps.
     */
    readonly history?: "step" | "start";
}

/** A node record to add: its id is read through `data.knownFields.nodeIdPath`. */
export type NodeRecordInput = Readonly<Record<string, unknown>>;

/** An edge record to add: its endpoints are read through the edge id paths; its id is assigned. */
export type EdgeRecordInput = Readonly<Record<string, unknown>>;

/** New values for some attributes of one existing row; keys not named are left as they are. */
export interface RowUpdate<Id> {
    /** The row's id. */
    readonly id: Id;
    /** The new values. */
    readonly values: Readonly<Record<string, unknown>>;
}

/**
 * The part of the catalogue a session can answer today: the seven capability tables, which are
 * plain data and need no graph, plus `metrics()`, which needs one.
 *
 * Six of the seven -- algorithms, cameras, formats, layouts, log destinations and palettes --
 * carry the element's own entries followed by whatever a third party registered, because those
 * are the six supported extension points and an extension a picker cannot find is half an
 * extension. `scales` is the element's own table alone.
 *
 * `metrics()` is the graph-dependent half's first member, and it is here because everything it
 * reads now exists: the catalogue declares what each algorithm requires of a graph, the cost model
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
    readonly data: SessionDataConfig;
    /** Whether the algorithms in `data.algorithms` run once data has loaded. */
    readonly runAlgorithmsOnLoad: boolean;
    /** What the graph is drawn against: a colour or a skybox, and a shader over either. */
    readonly background: GraphBackgroundConfig;
    /** What a selected node's halo looks like. */
    readonly selectionStyle: GraphSelectionStyleConfig;
    /**
     * What a pinned node's halo looks like, in the shape of {@link ProjectConfig.selectionStyle}
     * (only `color`, `scale` and `opacity` are read). Absent by default. Set while
     * {@link ProjectConfig.startingRows} is on, the starting rows gain a fifth, Pinned (nodes in
     * the state `"pinned"`, pinned to the top directly below Selected, drawing this halo); cleared,
     * the row is taken away. The look is the consumer's choice, so nothing is drawn for a pinned
     * node until it is set.
     *
     * ```ts
     * await session.config.set({ startingRows: true, pinnedStyle: { color: "#868e96", scale: 1.12, opacity: 1 } });
     * ```
     * @since 3.37.0
     */
    readonly pinnedStyle?: GraphSelectionStyleConfig;
    /**
     * Whether the style tree starts with its three starting rows: Everything (pinned to the
     * bottom, writing nothing), Selected (pinned to the top, drawing a solid near-black node halo
     * with a white glow and a near-black edge band, at the selection settings' sizes, which
     * reads on the default background and every default palette color) and Hovered (pinned to the top, writing nothing). False by default.
     * Turned on, the rows are added in the same step, and the selection settings
     * ({@link ProjectConfig.selectionStyle}) draw nothing themselves; `styles.restoreStartingRows()`
     * brings back any a reader deleted. While a time field is designated, a fourth row, Ghost, sits
     * directly below Selected: it paints the elements outside the time window grey at low opacity
     * when the timeline draws them (`session.time.setSettings({ outside: "ghost" })`).
     * @since 3.26.0
     */
    readonly startingRows: boolean;
    /**
     * Whether the element's base look (every node and edge value it draws before any layer says
     * otherwise) is held by the Everything starting row as ordinary values a reader can edit or
     * remove, instead of by the element's two locked base layers. False by default. With it on, the
     * locked base layers paint nothing, the Everything row is added (or restored) holding the base
     * values when {@link ProjectConfig.startingRows} is on, and an element that no shown layer
     * paints is not drawn: hiding the Everything row hides every element no other shown layer
     * paints, and an element a shown layer paints stays drawn in that layer's look.
     * @since 3.26.0
     */
    readonly editableBase: boolean;
    /**
     * Where the layer a finished run paints lands: `"beneath"` (the default), under the lowest
     * layer somebody wrote that drives the same property, and not at all when such a layer covers
     * every element; or `"top"`, on top of the unpinned rows, never held back by a layer somebody
     * wrote.
     * @since 3.26.0
     */
    readonly runPlacement: RunPlacement;
    /**
     * The layout-behaviour settings a project file saves. The rest of the element's
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
}

/** Where a finished run's layer lands: see {@link ProjectConfig.runPlacement}. */
export type RunPlacement = "beneath" | "top";

/**
 * A partial {@link ProjectConfig}, nested: `{ data: { knownFields: { nodeIdPath: "key" } } }`.
 * Plain objects are merged key by key; `data.algorithms`, `background` and `selectionStyle` are
 * replaced whole. Setting a key to `undefined` returns it to its default.
 */
export interface ProjectConfigPatch {
    readonly data?: {
        readonly algorithms?: SessionDataConfig["algorithms"];
        readonly directed?: SessionDataConfig["directed"];
        readonly knownFields?: Partial<SessionDataConfig["knownFields"]>;
    };
    readonly runAlgorithmsOnLoad?: boolean;
    readonly background?: GraphBackgroundConfig;
    readonly selectionStyle?: GraphSelectionStyleInput;
    /** See {@link ProjectConfig.pinnedStyle}; `undefined` clears it. */
    readonly pinnedStyle?: GraphSelectionStyleInput;
    /** See {@link ProjectConfig.startingRows}. */
    readonly startingRows?: boolean;
    /** See {@link ProjectConfig.editableBase}. */
    readonly editableBase?: boolean;
    /** See {@link ProjectConfig.runPlacement}. */
    readonly runPlacement?: RunPlacement;
    readonly layoutBehavior?: Partial<ProjectConfig["layoutBehavior"]>;
    /** See {@link ProjectConfig.layoutTransition}; `undefined` turns transitions off. */
    readonly layoutTransition?: LayoutTransitionConfig;
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
     * background's own `color`, else `DEFAULT_BACKGROUND_COLOR`. A settings panel shows it when
     * the background sets no color of its own.
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
    | "node.depthIndependentSize"
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
    "selection:origin-changed": { readonly origin: SelectionTarget | null };
    /**
     * The node under the pointer changed: the pointer reached a node, moved to another, or left
     * the node or the drawing. `selection.hovered` is `after` when it arrives.
     *
     * A `{ match: "state", state: "hovered" }` layer's `styles.counts` moves with it, so a host
     * showing such a count reads it again here; nothing else publishes the hover.
     * @since 3.34.0
     */
    "selection:hover-changed": { readonly before: NodeId | null; readonly after: NodeId | null };
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
    "canvas:empty-click": { readonly x: number; readonly y: number; readonly secondary: boolean };
    /**
     * A click landed on a node or an edge in the drawing.
     *
     * Published for every such click, also when the element was already the whole selection,
     * which `selection:changed` cannot tell: a host showing something else as chosen (a run, a
     * panel's row) learns that the reader picked the element again on the drawing.
     * @since 3.33.0
     */
    "canvas:element-click": { readonly node: NodeId } | { readonly edge: EdgeId };
    /**
     * A click landed on a group outline a style layer draws (a use at the place `group`), and on
     * no node or edge: the layer, the shader, and the group's `groupBy` value (null for a use
     * drawing one outline). The topmost outline under the pointer is the one reported.
     * @since 3.36.0
     */
    "canvas:group-outline-click": GroupOutlineClick;
    /** A filter, the time window or the context flag changed what is showing. */
    "visibility:changed": VisibilityChange;
    /** The time window moved through `session.time`: where it is now and what entered and left. */
    "time:step": TimeStepEvent;
    /** Playback started, from this window (null when it opens one). */
    "time:play": { readonly window: TimeWindow | null };
    /** Playback stopped at this window. */
    "time:pause": { readonly window: TimeWindow | null };
    /** Playback reached the end of the data; `time:pause` follows. */
    "time:end": { readonly window: TimeWindow | null };
    /** The designated time field changed through `session.time.setField`. */
    "time:field": { readonly field: TimeField | null };
    /** The designated time field was indexed, so `time.extent()` and `time.bins()` answer. */
    "time:ready": { readonly field: TimeField | null };
    /**
     * A run the `results: "rerun"` setting re-ran after a window move failed: which run, and the
     * error's code and details.
     */
    "time:rerun-failed": { readonly run: RunId; readonly error: CodedFact };
    /**
     * A layer was added, changed, removed or moved, and how much of the picture it repainted.
     *
     * Published for every verb that changes the stack, including the ones that write several
     * layers at once: one event per EDIT rather than one per layer, because an edit is what a
     * consumer undoes, records and mirrors.
     */
    "style:changed": StyleChange;
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
     * Every acceleration transition, and every change to what VR and AR can do: the probe
     * settling, a WebXR device change, entering or leaving a session (including the headset
     * ending it), an XR configuration change. The document is the one `capabilities` returns.
     */
    "capabilities:changed": { readonly capabilities: Pick<Capabilities, "acceleration" | "xr"> };
    /**
     * The history changed: a step was recorded, merged, undone, redone, restored, evicted or
     * cleared, or the pending work (and so what the next undo will do) changed. Fires
     * synchronously after `project:changed`. Read `session.history` for the new state; its
     * `version` has moved.
     */
    "history:changed": {
        readonly reason: "record" | "merge" | "undo" | "redo" | "restore" | "evict" | "clear" | "pending" | "size";
    };
    /**
     * Project state changed: the slices written and what wrote them. Fires synchronously, as
     * soon as the state has changed and before the picture has caught up; the per-domain events
     * (`style:changed` and the rest) follow once it has, then `project:derived`.
     */
    "project:changed": { readonly slices: readonly ProjectSlice[]; readonly cause: HistoryCause };
    /**
     * The picture has caught up with a project change: published once per `project:changed`,
     * after every hook deriving it has run and after the per-domain events it causes. THE event
     * for a consumer that re-reads derived state -- `styles.legend()`, `styles.counts()`,
     * `styles.explain()` -- after any change, including an edit to data alone, which publishes no
     * `style:changed`. Read on `project:changed`, those answer for the previous pass.
     * @since 3.37.0
     */
    "project:derived": { readonly slices: readonly ProjectSlice[]; readonly cause: HistoryCause };
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
    /** A command finished and the journal appended its entry: one event per entry. */
    "journal:appended": { readonly entry: JournalEntry };
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
    "shader:status": { readonly id: string } & ShaderStatus;
    /**
     * Shaders arrived that wait for approval: a project or style file opened, an AI command, or
     * an undo brought them back. Mirrored as `graphty-shader-held`.
     * @since 3.36.0
     */
    "shader:held": { readonly ids: readonly string[] };
    /**
     * A shader's text was approved to run: the reader added it, or `approve` ran it. An
     * application that remembers approvals stores the hash and passes it back in
     * `shaderSettings.trustedHashes`. Mirrored as `graphty-shader-approved`.
     * @since 3.36.0
     */
    "shader:approved": { readonly id: string; readonly hash: string };
    /**
     * The frame guard changed how much shader work the element does: it stepped quality down,
     * paused motion or turned heavy shaders off on a GPU that fell behind, or stepped back up.
     * Mirrored on the element as `graphty-render-quality`; the quality now is
     * `element.renderQuality`.
     * @since 3.36.0
     */
    "render:quality": RenderQualityChange;
    /**
     * A model a style layer names moved on: requested, checked, drawn, refused or failed. One
     * event per model and state, never one per node. Mirrored on the element as
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
 * What happened to one model a style layer names (`node.model`), for `model:changed` and the
 * element's `graphty-model-change`.
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
    /** Why it was refused or failed (`E_MODEL_*`), and what is worth knowing (`W_MODEL_*`). */
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
    | "notes"
    | "attributes"
    | "valueLabels"
    | "shaders";

/** What moved project state: a command, a history move, or a failed command being reverted. */
export type HistoryCause = "command" | "undo" | "redo" | "restore" | "rollback";

/** The id of one step in `session.history.steps`. */
export type HistoryStepId = string & { readonly __brand: "HistoryStepId" };

/** The id of one item in `session.history.pending`. */
export type PendingId = string & { readonly __brand: "PendingId" };

/**
 * What a history step did, as the `code` of its {@link HistoryStep.fact}. The application words
 * it; graphty-element writes no sentence for it. Each code's `params`:
 *
 * | Code | Params |
 * | --- | --- |
 * | `algo.run`, `algo.legacy` | `algorithm`: the algorithm's key |
 * | `algo.remove`, `algo.move` | `run`: the run's id; `algorithm`: its algorithm, or null when unknown |
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
 * | `data.import` | `name`: the source's name (given, file or URL), or null; `type`: the data source, or null |
 * | `data.import-source` | `source`: the network source's id; `name`: what the reader called the data, or null |
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
 * | `data.set-file-styles` | `loads`: how many loads' style values are kept |
 * | `shader.add`, `shader.replace`, `shader.remove` | `id`: the shader's id; `layer` (`shader.add` only): the layer `add` also wrote it to, or null |
 * | `style.add-layer`, `style.remove-layer`, `style.move-layer` | `layer`: its name, or its id |
 * | `style.update-layer` | `layer`: its name, or its id; `channels`: the channels whose set value or binding changed (empty when only another key did) |
 * | `style.remove-layers` | `count` |
 * | `style.highlight` | `run`: the run highlighted |
 * | `style.fix-channel` | `channel`; `layer`: its name, or its id |
 * | `style.encode` | `channel`; `run` |
 * | `style.template` | none |
 * | `style.suggested` | `algorithms`: the algorithms whose suggested styles were applied |
 * | `style.add-folder` | `name`: the folder's name |
 * | `style.rename-row` | `row`: its name before, or its id; `name`: the new name |
 * | `style.move-row`, `style.delete-row` | `row`: its name, or its id |
 * | `style.pin-row` | `row`: its name, or its id; `pin`: `"top"`, `"bottom"` or `"none"` |
 * | `style.lock-row` | `row`: its name, or its id; `locked` |
 * | `style.hide-row` | `row`: its name, or its id; `hidden` |
 * | `style.restore-starting-rows` | none |
 * | `visibility.filter` | `kind`: the filter's kind |
 * | `visibility.clear-filter`, `visibility.window`, `visibility.clear-window` | none |
 * | `visibility.show-context`, `visibility.hide-context` | none |
 * | `visibility.step-add`, `visibility.step-edit`, `visibility.step-on`, `visibility.step-off`, `visibility.step-remove` | `id`: the filter step's id |
 * | `visibility.steps` | none: several steps changed at once, or a reorder |
 * | `visibility.playback` | none: how `session.time` moves windows changed |
 * | `time.field` | `column`: the column designated as the time field |
 * | `time.clear-field` | none |
 * | `set.create` | `name`: the set's name, or null |
 * | `set.rename` | `set`: its name before, or its id; `name`: the new name |
 * | `set.redefine`, `set.members`, `set.remove`, `set.restore` | `set`: its name, or its id |
 * | `note.add`, `note.update`, `note.remove` | none |
 * | `note.merge` | `source`: the merged document's name, or null |
 * | `view.save`, `view.remove` | `names`: the views |
 * | `view.dimension` | `dimension`: `"2d"` or `"3d"` |
 * | `view.immersive` | `mode`: `"vr"` or `"ar"` (a switch to 3D on the way in) |
 * | `config.set` | `keys`: the setting paths changed |
 * | `positions.set`, `positions.pin`, `positions.release` | `count`: how many nodes |
 * | `node.drag` | `node`: the id dragged |
 * | `layout.set` | `layout`: the layout's id |
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
    | "data.import"
    | "data.import-source"
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
    | "data.set-file-styles"
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
    | "style.restore-starting-rows"
    | "shader.add"
    | "shader.replace"
    | "shader.remove"
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
    | "visibility.steps"
    | "visibility.playback"
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
    | "view.dimension"
    | "view.immersive"
    | "config.set"
    | "positions.set"
    | "positions.pin"
    | "positions.release"
    | "node.drag"
    | "layout.set"
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
     * What a history list shows, such as "Changed colour of Hubs".
     * @deprecated English written by the element. Word {@link HistoryStep.fact} instead; removed in
     * the next major release.
     */
    readonly label: string;
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
    /**
     * The label the step will have.
     * @deprecated English written by the element. Word {@link PendingStep.fact} instead; removed in
     * the next major release.
     */
    readonly label: string;
    /** The fact the step will have: see {@link HistoryStep.fact}. */
    readonly fact: CodedFact<HistoryCode>;
    /** ISO 8601 of the dispatch. */
    readonly since: string;
    /** The runs this work is waiting on. */
    readonly runIds: readonly RunId[];
}

/** What an undo, a redo or a restore did. */
export type HistoryOutcome =
    | { readonly kind: "undone" | "redone" | "restored"; readonly steps: readonly HistoryStep[] }
    | { readonly kind: "cancelled"; readonly pending: readonly PendingStep[] }
    | { readonly kind: "nothing" };

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
        | { readonly kind: "cancel"; readonly pending: readonly PendingStep[] }
        | { readonly kind: "undo"; readonly step: HistoryStep }
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
     * @returns What was done.
     */
    restoreTo(step: HistoryStepId | null): Promise<HistoryOutcome>;
    /**
     * Cancel a pending item, and every later-dispatched item that depends on what it writes.
     * @param pending - The item.
     * @returns Every item cancelled; empty when the id is not pending.
     */
    cancel(pending: PendingId): readonly PendingStep[];
    /**
     * Drop every step: the current state becomes the baseline. Pending work that has already
     * changed something (an open transaction that wrote, a layout moving nodes) is cancelled,
     * since its step would undo to a state older than the baseline. By default the rest of the
     * pending work is cancelled too; pass `{ pending: "keep" }` to let it finish and record its
     * steps over the new baseline, so a run started just before (one a reader began while a graph
     * was loading) is not lost.
     * @param options - What happens to pending work that has changed nothing yet.
     */
    clear(options?: HistoryClearOptions): void;
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
    /** Settles once the neighbourhood is recorded and the pass that draws it has run. */
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
    /** Settles once the style values are recorded. */
    "data.setFileStyles": Promise<void>;
    /** Settles once the edit is recorded and the pass that repaints it has run. */
    "style.patch": Promise<void>;
    /** Settles once the edit is recorded and the pass that repaints it has run. */
    "style.encode": Promise<void>;
    /** Settles once the edit is recorded and the pass that repaints it has run. */
    "style.template": Promise<void>;
    /** Settles once the shader's text is recorded. */
    "shader.set": Promise<void>;
    /** Settles once the filter is recorded and the pass that evaluates the masks has run. */
    "visibility.set": Promise<void>;
    /** Settles once the window is recorded and the pass that evaluates the masks has run. */
    "visibility.window": Promise<void>;
    /** Settles once the flag is recorded and the pass that follows it has run. */
    "visibility.context": Promise<void>;
    /** Settles once the steps are recorded and the pass that evaluates the masks has run. */
    "visibility.steps": Promise<void>;
    /** Settles once the playback settings are recorded. */
    "visibility.playback": Promise<void>;
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
    /** Settles once the removal is recorded. */
    "view.remove": Promise<void>;
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
    readonly id: NodeId;
    readonly x: number;
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
     * Place nodes. One step; calls made one after another within the coalescing window are one.
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
}

/**
 * Which layout draws the graph, and in how many dimensions: the project's `layout` slice.
 *
 * Choosing a layout and switching between 2D and 3D are undoable steps, and undo puts back the
 * engine that was chosen with its own options, not the catalogue's default. Until one is chosen
 * it reads the element's default, the `force` layout drawn by `ngraph` in 3D.
 */
export interface SessionLayout {
    /** The catalogue id, such as `"force"`. */
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
     * Choose the layout. One step.
     * @param id - The catalogue id; a registered engine name is read as the id it serves.
     * @param options - The engine, when not the catalogue's default for `id`, and its options.
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
     * Whether a layout option changes the drawing in a view, as a coded fact: the location map's
     * `surface` is `setting.notIn2d`, because the 2D view always draws its flat map. A form shows
     * an option not in effect disabled, with words for the code.
     * @param id - The layout's catalogue id.
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
     * @since 3.31.0
     */
    readonly role: "coords" | "country" | "region" | "city" | "auto" | null;
    /** The column that narrows each place name (a city's country), or null. @since 3.31.0 */
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
 * The saved camera views, read as a map from name to camera state.
 *
 * A saved view is a fixed position, not a rule: it does not recompute itself for a different
 * graph the way a camera view does, which is why a name a camera view answers to is refused.
 */
export interface SessionViews extends ReadonlyMap<string, CameraState> {
    /**
     * Keep camera states under names, replacing any view already saved under one. One step.
     * @param views - The names and the camera states.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_PROTECTED` when a camera view answers to
     *     a name, or `E_BAD_COMMAND` for an empty name; nothing is saved then.
     */
    save(views: readonly { readonly name: string; readonly camera: CameraState }[]): Promise<void>;
    /**
     * Forget saved views. One step.
     * @param names - The names.
     * @returns Settles once the step is recorded.
     * @throws A `GraphtyError` (as a rejection) with `E_BAD_COMMAND` when a name is not saved;
     *     nothing is removed then.
     */
    remove(names: readonly string[]): Promise<void>;
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
 * selection and visibility models, the style layers, the status, the catalogue, the configuration
 * and the measured capabilities of the machine. A renderer binds to one; a Node test uses one on
 * its own; two synchronised views of one dataset share one.
 *
 * What is deliberately NOT here yet: the layout transport. It waits on work that has not
 * landed, and is absent rather than stubbed.
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
     * The experiments this session switched on, and the requested ids it did not recognise.
     * Settled when the session is created (for an element's session, when the element first
     * renders) and the same object afterwards.
     */
    readonly features: EnabledFeatures;
    /** The settings as they are now, and `set` to change the project ones. */
    readonly config: SessionConfig;
    /**
     * What this machine can do, measured rather than guessed at by the consumer: acceleration,
     * and which immersive modes can be entered (with the reason when one cannot) and which one
     * is presenting. A session that draws nothing reports VR and AR as `"unsupported"`.
     */
    readonly capabilities: Pick<Capabilities, "acceleration" | "xr">;
    /**
     * What the consumer asks of the hardware: use an accelerator when there is one, never look,
     * or refuse to run without one.
     *
     * Settable, and the set applies at once: the next piece of accelerated work is planned under
     * the new policy, and `capabilities:changed` reports where that left the hardware.
     */
    acceleration: AccelerationPolicy;
    /**
     * Attach an accelerator the caller built, or detach the current one with `null`.
     *
     * For tests and third parties. An injected accelerator is never replaced by a probed one and
     * is not disposed by the session -- whoever built it owns its lifetime.
     * @param accelerator - The accelerator to attach, or null to detach.
     */
    setAccelerator(accelerator: GraphAccelerator | null): void;
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
     * The same verb `runs.start` offers, reached through the serialisable form -- so a recipe, a
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
     * nothing.
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
     * @returns The recommendation, or undefined when the catalogue serves none.
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
 * already drawn this?" bookkeeping on a mask's version without materialising a list of fifty
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
     * colour to write into its instance, and it asks by dense index. Neither the questions nor
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
     * Publishes `canvas:group-outline-click`; the renderer calls it for a click on a group outline.
     * @param target - The outline's layer, shader and group.
     */
    groupOutlineClick(target: GroupOutlineClick): void;
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
     * The experiments to switch on, by id, or `["all"]`; absent takes the page default set with
     * `setDefaultFeatures`. Unknown ids are listed in `features.unknown`, never thrown.
     */
    readonly features?: readonly string[];
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
