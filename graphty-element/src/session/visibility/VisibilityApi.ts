/**
 * @file Visibility: hiding part of the graph without destroying it, and without moving anything.
 *
 * THIS IS THE DATA SCOPE. IT IS NOT THE RENDER SET. Everything on this surface answers one
 * question -- which nodes and edges does the session consider part of the graph the reader is
 * looking at -- and that is a question about DATA, decided by filters and by the time window. It
 * is not a question about pixels. Above its ceiling the renderer draws fewer elements than this,
 * and it is allowed to; `view.rendered` is where that number lives. When a run, a layout or an
 * export says it covers "the visible graph", it means the masks below and never the subset that
 * happened to reach the screen. A consumer that confuses the two gets an analysis silently
 * computed over "the 50,000 nodes we managed to draw", which is a wrong number with a confident
 * label on it.
 *
 * THE MASK IS THE MODEL. One byte per element, indexed by the dense index every node and edge
 * already carries: a membership test is one array read, the bytes go to a worker without being
 * rewritten, and the cost is bounded at the ELEMENT COUNT however many elements are visible.
 * Hiding 40,000 of 50,000 nodes writes 50,000 bytes. The id sets are LAZY MATERIALISATIONS for a
 * consumer that wants to iterate, and they are deliberately not the boundary type, because a set
 * of every visible id is unbounded in the size of the answer.
 *
 * ONE MODEL, TWO PRODUCERS. A filter and a time window are not two systems: they are two things
 * that write the same pair of masks, and an element is visible when it passes both. Clearing one
 * leaves the other's answer standing, setting one does not disturb the other, and the summary
 * reflects the composition rather than whichever ran last.
 *
 * AN EDGE'S VISIBILITY FOLLOWS ITS ENDPOINTS: an edge whose source or target is hidden is
 * hidden. An edge filter can narrow further but never wider. The rule is stated and enforced in
 * `./filter`.
 *
 * FILTERS NEVER RE-LAYOUT. Positions are separate session state, and nothing here touches them.
 * That is a structural fact rather than a promise: this module cannot move a node because it has
 * no way to reach one.
 *
 * WHAT IS DELIBERATELY NOT HERE. The precomputed temporal series (`steps()`) and the playback
 * transport (`play`, `pause`, `step`) attach to this surface and are a later piece, because they
 * need a temporal result shape that does not exist yet. The seam they attach to is
 * {@link VisibilityApi.setWindow}: `steps()` is a batch of runs over a list of windows, each one
 * setting this same window and summarising what it left visible, and playback is a cursor over
 * that list calling `setWindow` per step. Nothing about the masks needs to change for either.
 *
 * THE FILTER, THE WINDOW AND THE CONTEXT FLAG ARE PROJECT STATE; THE MASKS ARE NOT. The three
 * values live in the session's `visibility` slice and change only through the `visibility.*`
 * commands, so each change is one undoable step. The masks are derived from them and the graph,
 * and are brought up to date on the derivation lane or on the next read, whichever is first.
 * Undoing to a filter step whose masks were kept (a mask copy) puts the kept bytes back instead of
 * evaluating the filter again. See design/undo/undo-design.md section 3.4.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type GraphSnapshot, INVALID_INDEX, makeMask, type U8 } from "@graphty/graph-format";

import type {
    EdgeId,
    FieldDescriptor,
    FilterCondition,
    FilterConditionInput,
    FilterStep,
    NodeId,
    Path,
    Scope,
    SourceKey,
} from "../../catalog/types";
import { otherIdSpelling } from "../../data/nodeIdSpelling";
import { GraphtyError } from "../../errors";
import { featureOff } from "../../features/resolve";
import { VISIBILITY_DEFINITIONS, type VisibilityCommand } from "../commands/visibility";
import { Dispatcher } from "../project/Dispatcher";
import type { VisibilityState } from "../project/state";
import {
    type Caveats,
    deriveRunId,
    ENGINE_VERSIONS,
    type EngineVersions,
    ManagedRun,
    type ResolvedScope,
    type Run,
    type RunBody,
    type RunDefinition,
    type RunExecutionContext,
    type RunOptions,
    type RunQueueContext,
    type RunSurroundings,
    type RunTicket,
} from "../runs";
import {
    createScopeApi,
    edgeSpaceOf,
    ElementMask,
    type MaskIdSpace,
    nodeSpaceOf,
    type ScopeResolver,
    type ScopeVisibilitySource,
} from "../scope/index";
// The explicit `/index` matters: `src/session/scope.ts` still exists beside the directory and
// wins a bare `../scope`. It goes when the resolver behind it is retired.
import { sealedSet } from "../sealed";
import { type DependencySources, visibilityCycle } from "../sets/dependencies";
import type { SetWatch } from "../sets/notify";
import type { HistoryCause } from "../types";
import {
    assertConditions,
    assertNotCircular,
    combinedRule,
    conditionOf,
    conditionsOfSteps,
    selectRule,
    selectsOverGraph,
    stepsOf,
    wellFormed,
} from "./conditions";
import {
    assertEvaluable,
    assertVisibility,
    type CompiledVisibility,
    compileVisibility,
    type FilterSources,
    type RuleTree,
    runPass,
    type ScopeLeaf,
    type TimePlayback,
    type TimeWindow,
    windowBounds,
    windowInstants,
    windowNeedsTimeline,
    windowReadsRecords,
} from "./filter";
import { bytesOf, type FilterBytes, slideCounters, type SlideCounts, type SlideTarget, WindowSlider } from "./slide";
import { assertSteps } from "./steps";
import { WindowCounter } from "./windowCount";

// ---------------------------------------------------------------------------------------------
// What visibility answers with
// ---------------------------------------------------------------------------------------------

/**
 * How much of the graph is showing, which is what a status bar reads.
 *
 * Four numbers rather than a list, because "showing 1,204 of 50,000" has to be renderable without
 * materialising anything: every one of these is maintained by the masks and costs nothing to
 * read.
 */
export interface VisibilitySummary {
    /** How many nodes are visible. */
    readonly visibleNodes: number;
    /** How many nodes the graph holds. */
    readonly totalNodes: number;
    /** How many edges are visible. */
    readonly visibleEdges: number;
    /** How many edges the graph holds. */
    readonly totalEdges: number;
}

/** What applying a filter or a window produced. */
export interface FilterResult {
    /** How many elements are visible now. */
    readonly visible: {
        /** Visible nodes. */
        readonly nodes: number;
        /** Visible edges. */
        readonly edges: number;
    };
    /** How many elements the graph holds. */
    readonly total: {
        /** Nodes in the graph. */
        readonly nodes: number;
        /** Edges in the graph. */
        readonly edges: number;
    };
    /**
     * The paths nothing in this session answered.
     *
     * Matching nothing is a LEGITIMATE answer for a filter, so an unanswerable path is reported
     * beside the counts instead of thrown: a consumer can say "0 matched -- data.rank is not an
     * attribute on this graph" rather than showing a confident empty screen.
     */
    readonly unresolvedPaths: readonly Path[];
    /** How long the pass took, in milliseconds. */
    readonly durationMs: number;
}

/**
 * What one visibility change was, as an event carries it.
 *
 * `filterKind` names WHAT PRODUCED THIS CHANGE, not what state the model is in: the filter's kind
 * for a filter, `"window"` for a time window, `"context"` for the context flag, and `"none"` when
 * the producer was cleared.
 */
export interface VisibilityChange extends FilterResult {
    /** What produced this change. */
    readonly filterKind: string;
    /** Whether an edit, an undo, a redo, a restore or a rolled-back transaction made it. */
    readonly cause: HistoryCause;
}

/**
 * How many elements of one kind a filter condition's rule matches, out of all of them.
 * Experimental: may change or be removed in a minor release.
 * @since 3.32.0
 * @beta
 */
export interface FilterConditionMatches {
    /**
     * How many the rule matches over the whole graph, or, for a select condition that selects
     * only within the picture, among what is drawn.
     */
    readonly matched: number;
    /** How many the graph holds, for every condition. */
    readonly total: number;
    /**
     * How many of `matched` are shown now: those the filter conditions that are on and the time
     * window leave drawn. A condition's own count reads the whole graph, so beside other filters
     * it can match more than is shown; this says how many of its matches a reader can see.
     */
    readonly shown: number;
}

/**
 * What one filter condition's rule matches, as written, over the whole graph: the same whatever
 * its effect, whether it is on, and whatever the other conditions are, so a condition that is off
 * still says what switching it on would match.
 *
 * One exception: a select condition counts what it would select. Unless every select condition
 * that is on (this one counted as on) reads `within: "graph"`, it selects only within the picture,
 * so it counts its rule's matches among what is drawn, out of how many are drawn (the whole graph
 * when nothing filters). That too holds whether it is on or off, and whatever order the
 * conditions are in.
 * Experimental: may change or be removed in a minor release.
 * @since 3.32.0
 * @beta
 */
export interface FilterConditionCount {
    /** The condition's id. */
    readonly id: string;
    /** The nodes it matches; null when the rule says nothing about nodes (an edge value leaf). */
    readonly nodes: FilterConditionMatches | null;
    /** The edges it matches; null when the rule says nothing about edges (a node value leaf). */
    readonly edges: FilterConditionMatches | null;
    /** The paths it reads that nothing in this session answers (a removed column); empty when none. */
    readonly unresolved: readonly Path[];
}

/**
 * One filter condition being edited without changing what is shown: its edits are held until
 * {@link FilterDraft.commit}, so the masks, every reader of what is shown and the layout stay as
 * they are while a reader edits it, and the edit lands as one undo step. Opened with
 * {@link VisibilityApi.draft}.
 * @example
 * ```ts
 * const draft = element.session.visibility.draft({ effect: "keep", rule: { kind: "range", attribute: "data.score", min: 0.5 } });
 * draft.update({ rule: { kind: "range", attribute: "data.score", min: 0.7 } });
 * console.log(draft.counts().nodes); // what it would keep, over the whole graph
 * await draft.commit(); // one step: the filter changes, and the graph is laid out again over it
 * ```
 * Experimental: may change or be removed in a minor release.
 * @since 3.36.0
 * @beta
 */
export interface FilterDraft {
    /** The condition as the draft holds it now, with its id: a new one's id is made when it opens. */
    readonly condition: FilterCondition;
    /** Whether the draft is still open: false once committed or cancelled. */
    readonly open: boolean;
    /**
     * Change what the draft holds. Nothing is written and nothing that is shown changes.
     * @param change - What to change: the rule, the effect, `on`, `within` or the name.
     * @throws A `GraphtyError` (`E_BAD_COMMAND`) once the draft is no longer open.
     */
    update(change: Partial<Omit<FilterCondition, "id">>): void;
    /**
     * What the draft's rule matches over the whole graph, the time window ignored, as
     * {@link VisibilityApi.conditionCounts} counts a condition.
     * @returns The counts, under the condition's id.
     */
    counts(): FilterConditionCount;
    /**
     * Write the draft: the condition is added, or the condition it opened on is changed, in one
     * undoable step. The draft closes.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns The run, which resolves with the counts and the condition's id.
     * @throws A `GraphtyError` (`E_BAD_COMMAND`) once the draft is no longer open, or when the
     *     condition is malformed.
     */
    commit(options?: RunOptions): Run<FilterResult & { readonly id: string }>;
    /** Close the draft and write nothing. Does nothing once it is closed. */
    cancel(): void;
}

// ---------------------------------------------------------------------------------------------
// The surface
// ---------------------------------------------------------------------------------------------

/** Hiding part of the graph, and saying how much is left. */
export interface VisibilityApi {
    /**
     * The visible nodes, as one byte per node.
     *
     * A DETACHED COPY of the live bytes, so it can be transferred to a worker without leaving the
     * session holding a dead array. Indexed by the dense node index, `1` for visible.
     *
     * This is the DATA scope. The renderer may draw fewer nodes than are set here.
     * @returns The bytes, one per node in the graph.
     */
    nodeMask(): Uint8Array;
    /**
     * The visible edges, as one byte per edge.
     *
     * An edge is visible only when BOTH its endpoints are visible; an edge filter can narrow the
     * set further but can never put back an edge whose endpoint is hidden.
     * @returns The bytes, one per edge in the graph.
     */
    edgeMask(): Uint8Array;
    /**
     * Whether one element is visible.
     *
     * The id is read as a NODE id first and as an EDGE id only when the graph holds no such node,
     * because an edge is addressed by its two endpoints joined with a colon and a node is not.
     * An element the graph does not hold is not visible.
     * @param id - The node or edge id.
     * @returns True when the element is part of the visible data scope.
     */
    isVisible(id: NodeId | EdgeId): boolean;
    /**
     * The visible node ids, materialised lazily from the mask.
     *
     * Identity-stable and genuinely read-only: the same object comes back until the membership
     * changes, so `previous === next` is a valid staleness test. A consumer that only needs
     * membership should call {@link VisibilityApi.isVisible}, which allocates nothing. It yields each
     * id as the graph holds it, but `has` takes an integer id written either way: on a graph whose
     * node `34` is visible, `nodes.has("34")` is true.
     */
    readonly nodes: ReadonlySet<NodeId>;
    /** The visible edge ids, on the same terms as {@link VisibilityApi.nodes}. */
    readonly edges: ReadonlySet<EdgeId>;
    /**
     * How much of the graph is showing: the one shown-versus-total count, after the filter, every
     * step that is on and the time window.
     */
    readonly summary: VisibilitySummary;
    /**
     * How much of what one load supplied is showing, on the same terms as
     * {@link VisibilityApi.summary}: the totals are the elements the graph holds that the load
     * supplied (what `session.data.sourcesOf` lists), the visible counts those of them visible now.
     * @param source - A `session.data.sources()` key.
     * @returns The counts; all zero for a key that supplied nothing, or when this session records
     *     no provenance.
     * @since 3.30.0
     */
    summaryOf(source: SourceKey): VisibilitySummary;
    /** The filter in force, or null when no filter is hiding anything. */
    readonly filter: RuleTree | null;
    /** The time window in force, or null when no window is hiding anything. */
    readonly window: TimeWindow | null;
    /**
     * Apply a filter, or clear it with null.
     *
     * One undoable step: the filter is recorded at once (`filter` reads it as soon as this
     * returns), and the masks are evaluated on the next pass against whatever filter is in force
     * then, so a slider dragged through sixty values evaluates the last one, not all sixty, and
     * the drag is one step. The run settles once that pass has run, with the counts it left.
     *
     * A signal already aborted when this is called writes nothing. A `cancel()` or an abort after
     * the call does NOT take the filter back -- it has been recorded, and may have merged into a
     * larger step -- so `session.undo()` is the way back.
     *
     * The time window is untouched. The two compose.
     *
     * Of the run options, `signal` and `onProgress` are honoured; `queue` is not, and `dryRun` is
     * REFUSED rather than ignored -- `plan({ op: "visibility.set", filter })` is the call that
     * answers "what would this leave showing" without doing it.
     * @param filter - What to keep, or null to stop filtering.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns The run, which resolves with the counts.
     * @throws A `GraphtyError` when the filter is malformed or needs something this session lacks.
     */
    set(filter: RuleTree | null, options?: RunOptions): Run<FilterResult>;
    /**
     * Apply a time window, or clear it with null: one undoable step, on the same terms as
     * {@link VisibilityApi.set}.
     *
     * The SAME masks as {@link VisibilityApi.set}, produced the same way, composed with whatever
     * filter is in force. Moving the window never re-layouts, rebuilds or removes data, which is
     * a structural fact here rather than a promise: a window writes bytes into a mask, and
     * positions are somewhere else entirely.
     * @param window - The stretch of the timeline to keep, or null to stop windowing.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns The run, which resolves with the counts.
     * @throws A `GraphtyError` when the window is malformed or needs something this session lacks.
     */
    setWindow(window: TimeWindow | null, options?: RunOptions): Run<FilterResult>;
    /**
     * The filter steps, in order: a view of the keep and exclude {@link VisibilityApi.conditions}
     * (an exclude condition reads as `{ kind: "not", of: rule }`). The steps that are on combine
     * with {@link VisibilityApi.filter} by AND; a step that is off keeps its rule and hides
     * nothing. Empty when there are none.
     *
     * Superseded by {@link VisibilityApi.conditions}, whose order has no meaning; prefer them in new
     * code.
     */
    readonly steps: readonly FilterStep[];
    /**
     * Replace the filter steps, or clear them with an empty list: one undoable step, on the same
     * terms as {@link VisibilityApi.set}. To add, edit, switch or remove one step, pass the list
     * with that one change; the history step's fact names it (`visibility.step-add`,
     * `visibility.step-edit`, `visibility.step-on`, `visibility.step-off`,
     * `visibility.step-remove`, each with the step's `id`).
     *
     * `plan({ op: "visibility.steps", steps })` answers what each step that is on would leave,
     * without doing it.
     *
     * The steps replace the keep and exclude conditions, one keep condition per step with the
     * step's id and rule; the select conditions are left as they are. Superseded by
     * {@link VisibilityApi.setConditions} and the single-condition verbs; prefer them in new code.
     * @param steps - The steps, each `{ id, on, rule }` with a unique id.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns The run, which resolves with the counts.
     * @throws A `GraphtyError` when a step is malformed, its id is a select condition's, or its
     *     rule needs something this session lacks.
     */
    setSteps(steps: readonly FilterStep[], options?: RunOptions): Run<FilterResult>;
    /**
     * The filter conditions, in the order they were added (a stable order for a list; it has no
     * meaning). Each is `{ id, on, effect, rule }`; see {@link FilterCondition} for how they
     * combine. Empty when there are none.
     *
     * How the conditions sit with the rest: what is visible is {@link VisibilityApi.filter} AND
     * the time window AND every keep condition that is on AND no exclude condition that is on.
     * Select conditions hide nothing: whenever the select conditions change (one is added,
     * edited, switched on or off, or removed), or a keep or exclude condition changes while a
     * select condition is on, the selection becomes what every select condition that is on
     * matches among the elements that are visible (or over the whole graph, when every select
     * condition that is on reads `within: "graph"`), replacing a selection the reader made; with
     * none on, nothing is selected. The result depends only on the set of conditions, never on
     * their order. A selection change the reader makes by hand (a `"user"` cause) switches every
     * select condition that is on off, in one undoable step, and keeps the reader's selection.
     * Opening a project never applies them; undo puts the selection back.
     * Experimental: may change or be removed in a minor release.
     * @since 3.32.0
     * @beta
     */
    readonly conditions: readonly FilterCondition[];
    /**
     * Replace every filter condition, or clear them with an empty list: one undoable step, on the
     * same terms as {@link VisibilityApi.set}.
     * @param conditions - The conditions; an id is made for one without, and `on` defaults to true.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns The run, which resolves with the counts.
     * @throws A `GraphtyError` (`E_BAD_COMMAND`) when a condition is malformed or two share an id,
     *     or one whose rule needs something this session lacks.
     * Experimental: may change or be removed in a minor release.
     * @since 3.32.0
     * @beta
     */
    setConditions(conditions: readonly FilterConditionInput[], options?: RunOptions): Run<FilterResult>;
    /**
     * Add one filter condition: one undoable step.
     * @example
     * ```ts
     * const v = element.session.visibility;
     * const { id } = await v.addCondition({ effect: "keep", rule: { kind: "range", attribute: "data.score", min: 0.7 } });
     * await v.updateCondition(id, { on: false });
     * ```
     * @param condition - The condition; an id is made when absent, and `on` defaults to true.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns The run, which resolves with the counts and the condition's id.
     * @throws A `GraphtyError` (`E_BAD_COMMAND`) when it is malformed or its id is taken.
     * Experimental: may change or be removed in a minor release.
     * @since 3.32.0
     * @beta
     */
    addCondition(condition: FilterConditionInput, options?: RunOptions): Run<FilterResult & { readonly id: string }>;
    /**
     * Change one filter condition's effect, rule or `on`: one undoable step.
     * @param id - The condition's id.
     * @param change - What to change.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns The run, which resolves with the counts.
     * @throws A `GraphtyError` (`E_BAD_COMMAND`) when no condition has that id, or the change is
     *     malformed.
     * Experimental: may change or be removed in a minor release.
     * @since 3.32.0
     * @beta
     */
    updateCondition(id: string, change: Partial<Omit<FilterCondition, "id">>, options?: RunOptions): Run<FilterResult>;
    /**
     * Remove one filter condition: one undoable step.
     * @param id - The condition's id.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns The run, which resolves with the counts.
     * @throws A `GraphtyError` (`E_BAD_COMMAND`) when no condition has that id.
     * Experimental: may change or be removed in a minor release.
     * @since 3.32.0
     * @beta
     */
    removeCondition(id: string, options?: RunOptions): Run<FilterResult>;
    /**
     * What each condition's rule matches, in condition order: see {@link FilterConditionCount}.
     * Synchronous and kept per condition, so editing one condition counts that one again and no
     * other. Read again on `visibility:changed` or `history:changed`.
     * @returns The counts.
     * Experimental: may change or be removed in a minor release.
     * @since 3.32.0
     * @beta
     */
    conditionCounts(): readonly FilterConditionCount[];
    /**
     * Open a draft of one filter condition: a new condition, or an existing one by id. Edits to the
     * draft change nothing that is shown until it is committed, which writes them as one step.
     * See {@link FilterDraft}.
     * @param target - The new condition (an id is made when absent, and `on` defaults to true), or
     *     the id of a condition to edit.
     * @returns The draft.
     * @throws A `GraphtyError` (`E_BAD_COMMAND`) when no condition has that id, or the new
     *     condition is malformed or its id is taken.
     * Experimental: may change or be removed in a minor release.
     * @since 3.36.0
     * @beta
     */
    draft(target: FilterConditionInput | string): FilterDraft;
    /**
     * Whether hidden nodes should still be drawn faintly instead of vanishing.
     *
     * A reader who hides nine tenths of a graph usually still wants to see the shape of what they
     * hid. The flag is owned here because it is part of what "visible" means to a consumer, and
     * it is honoured by the renderer, which draws the hidden nodes as a low-alpha point layer.
     * Turning it on changes NOTHING about the masks: a context node is still hidden, still
     * outside every run's default scope, and still absent from `nodes`. Changing it is one
     * undoable step.
     */
    showContext: boolean;
}

/**
 * Visibility as the session holds it: the consumer surface plus the masks the resolver reads.
 *
 * `masks` is separate rather than folded in because the two shapes disagree on purpose. A
 * consumer reads `nodes` as a set of ids; the scope resolver needs the mask OBJECT, so that it
 * can test membership per element and key its caches on the mask's version without materialising
 * anything.
 */
export interface SessionVisibilityApi extends VisibilityApi {
    /**
     * The masks, for the scope resolver and the renderer: read-only copies carrying the live
     * masks' `version`, one per membership, so nothing holding one can change what is visible.
     */
    readonly masks: ScopeVisibilitySource;
    /** The one rule the masks evaluate: the filter AND every step that is on, or null. */
    readonly rule: RuleTree | null;
    /**
     * The conditions the filter drafts still open hold, as they hold them now: what a selection
     * editor's Done keeps the runs of, since its draft is written after the visit ends.
     * @returns The conditions.
     */
    openDrafts(): readonly FilterCondition[];
    /**
     * What a steps list would leave visible, without recording it: the counts before the first
     * step (the filter and the window alone), then after each step that is on, in order.
     * @param steps - The steps.
     * @returns The counts.
     * @throws A `GraphtyError` when a step is malformed.
     */
    previewSteps(steps: readonly FilterStep[]): StepCounts;
    /**
     * Record conditions read back from a project file: one step, admitted as
     * {@link VisibilityApi.setConditions} admits them, that never touches the selection (a saved
     * selection wins over the select conditions saved with it).
     * @param conditions - The conditions.
     * @returns The run, which resolves with the counts.
     */
    restoreConditions(conditions: readonly FilterCondition[]): Run<FilterResult>;
    /**
     * Record a window read back from a project file, kept as saved whatever the session switched
     * on, so a project saved with the timeline on survives being opened and saved with it off.
     * @param window - The window.
     * @param raw - Whether the file says its bounds are values to compare as they stand.
     * @returns The run, which resolves with the counts.
     */
    restoreWindow(window: TimeWindow, raw: boolean): Run<FilterResult>;
    /**
     * Record timeline settings read back from a project file, or clear them, kept as saved
     * whatever the session switched on.
     * @param playback - The settings, or null.
     * @returns Resolves once they are recorded.
     */
    restorePlayback(playback: TimePlayback | null): Promise<unknown>;
    /**
     * Whether a window's bounds are instants of a time column's parsed values.
     * @param window - The window.
     * @returns True with the timeline on, and for a window a project saved as instants.
     */
    holdsInstants(window: TimeWindow): boolean;
    /**
     * Move the time window without recording it, writing only the rows whose membership changes:
     * every move of `session.time`. Recording the same window afterwards (`setWindow`, or a
     * `visibility.window` command) adopts the masks; any other evaluates in full.
     * @param window - The window to show, or null to put back the window the slice records.
     * @returns What came into view and went out of it; null when put back.
     */
    slideWindow(window: TimeWindow | null): SlideCounts | null;
    /**
     * A run that moves windows of its own, so nothing on screen, in the project or in history moves. It describes the graph and the filter as they stand when `work` opens the walk.
     * @param algorithm - What the run is.
     * @param params - What it was asked for.
     * @param options - A signal, and a progress handler.
     * @param work - The work: opens the walk when it is ready to, and returns the result.
     * @returns The run; never in the runs list.
     */
    windowRun<T>(
        algorithm: string,
        params: Readonly<Record<string, unknown>>,
        options: Pick<RunOptions, "signal" | "onProgress">,
        work: (open: () => WindowWalk, context: RunExecutionContext) => Promise<T>,
    ): Run<T>;
    /**
     * What the filter alone keeps, with no window: the same object until the filter or the data
     * changes, so a reader can key a cache on it.
     * @returns Each kind's bytes, read on first use, null for a kind the filter says nothing of.
     */
    filterBytes(): FilterBytes;
    /**
     * What every filter leaves showing, the window aside: as {@link filterBytes}, and an edge also
     * needs both its ends to pass.
     * @returns Each kind's bytes, null for a kind nothing narrows.
     */
    passingBytes(): FilterBytes;
    /**
     * Record the window a gesture ended at (`session.time.commit()`): as `setWindow`, but always
     * its own undoable step, never merged into a window step recorded just before it.
     * @param window - The window.
     * @returns The run, which resolves with the counts.
     */
    commitWindow(window: TimeWindow): Run<FilterResult>;
    /**
     * Whether elements outside the time window are drawn as ghosts now: the playback setting
     * `outside` is `"ghost"` and a window is in force.
     */
    readonly ghosting: boolean;
    /**
     * What the renderer draws: the visible masks, or while {@link SessionVisibilityApi.ghosting},
     * every element the filter and its steps keep, whatever the window says. Read-only copies.
     */
    readonly drawnMasks: ScopeVisibilitySource;
    /**
     * Whether an element is a ghost: drawn, but outside the time window, so not visible.
     * @param target - Nodes or edges.
     * @param index - The element's row.
     * @returns True for a ghost; always false while not ghosting.
     */
    ghosted(target: "node" | "edge", index: number): boolean;
    /**
     * Every ghost at once: one byte per element, 1 for a ghost.
     * @returns The bytes, or null while not ghosting.
     */
    ghosts(): { readonly node: Uint8Array; readonly edge: Uint8Array } | null;
    /**
     * Hold one filter condition while a reader edits it (`styles.showBranches` with `hold`): it
     * still decides what is visible, but what it would remove stays drawn, as ghosts. Records no
     * step. Null lets it go.
     * @param id - The condition, or null.
     * @param all - Lift every condition, not only this one: the view is drawn over the full graph.
     */
    hold(id: string | null, all?: boolean): void;
}

/** What is drawn, one mask per kind. */
interface Drawn {
    readonly nodes: ElementMask<NodeId>;
    readonly edges: ElementMask<EdgeId>;
}

/** Visible nodes and edges. */
interface Counts {
    readonly nodes: number;
    readonly edges: number;
}

/** What a steps list would leave: before any step, and after each step that is on. */
export interface StepCounts {
    readonly start: Counts;
    readonly steps: readonly (Counts & { readonly id: string })[];
}

/** Everything the visibility model is built from. */
export interface VisibilitySources extends FilterSources {
    /**
     * The snapshot the masks describe.
     *
     * Read on every access rather than held, because the masks must answer for the graph as it
     * NOW stands. When it moves, the stored filter is re-evaluated against the new snapshot
     * before anything is answered: a mask kept across a data change hides nodes that no longer
     * exist and shows none of the ones that just arrived.
     * @returns The current snapshot.
     */
    snapshot(): GraphSnapshot;
    /**
     * The dispatcher whose `visibility` slice holds the filter, the window and the context flag.
     * Absent, the model makes one of its own.
     */
    readonly dispatcher?: Dispatcher;
    /**
     * Resolve a scope specification, so a pass can record what it looked at.
     *
     * Absent, the whole graph is resolved here instead, which costs one walk per snapshot. Hand
     * the session's resolver in and it is a cache hit.
     * @param spec - What to resolve.
     * @returns What it resolves to now.
     */
    readonly resolveScope?: (spec: Scope) => ResolvedScope;
    /** Which versions are producing the numbers. Defaults to the element's own. */
    readonly engine?: EngineVersions;
    /**
     * Called whenever what is visible changes, so a host can mirror it onto an event: once the
     * pass deriving the change has run, one call per edit, and one per step an undo, a redo or a
     * restore passes.
     *
     * One hook for every producer -- a filter, a window and the context flag all arrive here --
     * because a status bar reading "showing X of Y" has to update for all three and must not
     * learn about them in three different ways.
     * @param change - The counts, the unresolved paths, and what produced the change.
     */
    readonly onChange?: (change: VisibilityChange) => void;
    /**
     * Told after the drawn masks moved without a step: the time cursor slid them, or a condition is held.
     * @param moved - What a slide changed; absent when a held condition moved the masks.
     */
    readonly onSlide?: (moved?: SlideCounts) => void;
    /** Called on every version bump of either mask, which is what advances the session input tick. */
    readonly onMaskVersion?: () => void;
    /**
     * The selection, which select conditions replace. Absent, select conditions select nothing.
     */
    readonly selection?: ConditionSelection;
    /**
     * Where the sets a `member` leaf names are looked up, so a filter that reads `"visible"` or
     * `"search"` through them is refused, and a pass never reads the masks it is writing.
     */
    readonly dependencies?: DependencySources;
    /**
     * A write door's check of a filter: session edge ids inside a `member` leaf's inline
     * definition to stable members, and every set id it names checked as issued. Absent, the
     * filter is taken as given.
     * @param filter - The filter as given.
     * @returns The filter to hold.
     */
    readonly admit?: (filter: RuleTree) => RuleTree;
    /**
     * How the filter follows the sets its `scope` leaves name (design/sets 11). Absent, a filter
     * is re-evaluated only when it is set again or the snapshot moves.
     */
    readonly watch?: FilterWatchSources;
    /**
     * Whether a filter drops what it hides from the selection: the session's working graph
     * option. Absent or false, the selection keeps hidden ids.
     * @returns True when it drops them.
     */
    readonly dropsHiddenSelection?: () => boolean;
}

/** The selection as select conditions reach it. */
interface ConditionSelection {
    /**
     * The ids selected now.
     * @returns The ids.
     */
    current(): { readonly nodes: readonly NodeId[]; readonly edges: readonly EdgeId[] };
    /**
     * Replace the selection.
     * @param ids - What to select.
     * @param ids.nodes - The nodes.
     * @param ids.edges - The edges.
     * @param cause - An edit (`"command"`) or an undo or redo (`"history"`).
     */
    replace(
        ids: { readonly nodes: readonly NodeId[]; readonly edges: readonly EdgeId[] },
        cause: "command" | "history",
    ): void;
    /**
     * Be told after the reader changes the selection by hand (a `"user"` cause).
     * @param listener - Called after each such change.
     */
    onHandChange?(listener: () => void): void;
}

/** What the filter follows its sets through: the session's change notifier and cache. */
interface FilterWatchSources {
    /**
     * Watch through the session's notifier.
     * @param watch - The watch; it resolves to whether the masks were re-evaluated.
     * @returns Stops watching.
     */
    subscribe(watch: SetWatch<boolean>): () => void;
    /**
     * A scope's input signature now.
     * @param scope - The scope.
     * @returns The signature, or null when its inputs cannot be enumerated.
     */
    signature(scope: Scope): string | null;
    /**
     * Pin a scope's cache entry, so budget pressure never evicts what the filter shows.
     * @param scope - The scope.
     * @returns Releases the pin.
     */
    pin(scope: Scope): () => void;
}

/**
 * The scopes a filter tree's `member` leaves name, outermost first. Not followed into a scope: its
 * own signature covers what it reads.
 * @param filter - The filter, or null.
 * @returns The scopes.
 */
function filterScopes(filter: RuleTree | null): Scope[] {
    const found: Scope[] = [];
    const walk = (node: RuleTree): void => {
        if (node.kind === "member") {
            found.push(node.of);
        } else if (node.kind === "all" || node.kind === "any") {
            node.of.forEach(walk);
        } else if (node.kind === "not") {
            walk(node.of);
        }
    };
    if (filter !== null) {
        walk(filter);
    }

    return found;
}

// ---------------------------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------------------------

/** The name a visibility edit's run carries, which is also the command that performs it. */
const VISIBILITY_ALGORITHM = "visibility.set";

/**
 * What a pass records as the scope it looked at.
 *
 * Always the whole graph, never "visible": a filter resolved against what is already visible
 * could only ever hide, so widening one would be impossible without reloading the data.
 */
const WHOLE_GRAPH: Scope = "graph";

/** No paths went unanswered. */
const NO_PATHS: readonly Path[] = Object.freeze([]);

/** A visibility edit publishes no per-element field: the mask is not a result bag. */
const NO_FIELDS: readonly FieldDescriptor[] = Object.freeze([]);

/** Nothing further qualifies a pass's numbers. */
const NO_NOTES: readonly string[] = Object.freeze([]);

/** What an edit's run is handed in place of a queue slot: it is never stopped. */
const IMMEDIATE: RunQueueContext = {
    signal: new AbortController().signal,
    progress: { setProgress: () => undefined, setMessage: () => undefined, setPhase: () => undefined },
    id: "visibility-edit",
};

/** An edit's run has nothing on a queue to cancel. */
const NO_TICKET: RunTicket = { cancel: () => undefined };

/** Windows moved one after another, later each time, away from what is on screen. */
export interface WindowWalk {
    /** Whether the graph walked is directed. */
    readonly directed: boolean;
    /**
     * Move to a window no earlier than the last. The first move compares with nothing showing.
     * @param window - The window.
     * @returns What it shows, and what came and went.
     */
    move(window: TimeWindow): {
        readonly visible: Readonly<{ nodes: number; edges: number }>;
        readonly entered: Readonly<{ nodes: number; edges: number }>;
        readonly left: Readonly<{ nodes: number; edges: number }>;
    };
}

/** The snapshot, and the two identity spaces every mask over it reads ids through. */
interface VisibilityFrame {
    /** The snapshot this frame describes. */
    readonly graph: GraphSnapshot;
    /** The node identity space, one object for the life of the frame. */
    readonly nodeSpace: MaskIdSpace<NodeId>;
    /** The edge identity space, one object for the life of the frame. */
    readonly edgeSpace: MaskIdSpace<EdgeId>;
}

/**
 * Everything the masks are a function of. Two equal tags mean equal masks, which is what lets a
 * mask copy stand in for an evaluation.
 */
interface MaskTag {
    /**
     * The graph token: it names one exact row order and set of records, moves on every write to
     * the graph, and comes back with undo and redo, which restore the rows exactly. So a copy
     * taken before a data step is used again once that step is undone.
     */
    readonly token: number;
    readonly filter: RuleTree | null;
    readonly window: TimeWindow | null;
    /**
     * The entries of the `runs` slice, whose results a filter can read; empty when nothing is
     * filtering. An entry is replaced whenever its run is recorded, and restored as the same
     * object by undo and redo, so identical entries mean identical results.
     */
    readonly inputs: readonly unknown[];
}

/** One filter step's after-masks, kept on the step so undoing or redoing to it needs no walk. */
interface MaskCopy {
    readonly tag: MaskTag;
    readonly nodes: U8;
    readonly edges: U8;
    readonly unresolved: readonly Path[];
}

/**
 * Whether two lists of inputs hold the identical objects in the same order.
 * @param a - A list.
 * @param b - Another.
 * @returns True when every entry is identical.
 */
function sameInputs(a: readonly unknown[], b: readonly unknown[]): boolean {
    return a.length === b.length && a.every((entry, index) => entry === b[index]);
}

/** What a graph with no filter keeps. */
const NOTHING_FILTERED: FilterBytes = Object.freeze({ nodes: null, edges: null });

/** Nothing read besides the graph. */
const NO_INPUTS: readonly unknown[] = Object.freeze([]);

/** No condition: what a view over the full graph draws by. One array, so the combined rule is kept. */
const NO_CONDITIONS: readonly FilterCondition[] = Object.freeze([]);

/**
 * Whether two tags name the same masks.
 * @param a - A tag.
 * @param b - Another.
 * @returns True when every input is identical.
 */
function sameTag(a: MaskTag, b: MaskTag): boolean {
    return a.token === b.token && a.filter === b.filter && a.window === b.window && sameInputs(a.inputs, b.inputs);
}

/** What a caller writing into a visible-id set is told to do instead. */
const VISIBLE_HINT =
    "The visible ids are a materialisation of the visibility mask; call visibility.set() to change what is visible.";

/**
 * What to call an edit, on its run.
 * @param filter - The filter it leaves in force, or null.
 * @param window - The window it leaves in force, or null.
 * @returns The label.
 */
function labelFor(filter: RuleTree | null, window: TimeWindow | null): string {
    if (filter !== null && window !== null) {
        return `Filter (${filter.kind}) and time window`;
    }

    if (filter !== null) {
        return `Filter (${filter.kind})`;
    }

    return window === null ? "Show everything" : "Time window";
}

/**
 * What qualifies an edit's numbers.
 * @param filter - The filter it leaves in force, or null.
 * @param window - The window it leaves in force, or null.
 * @returns The caveats.
 */
function caveatsFor(filter: RuleTree | null, window: TimeWindow | null): Caveats {
    const caveats: Caveats = {
        direction: "as-loaded",
        exact: true,
        filterScope: filter !== null,
        method: "mask",
        facts: [],
        notes: NO_NOTES,
        precision: "f64",
        seed: null,
        weight: null,
        windowScope: window !== null,
    };

    return Object.freeze(caveats);
}

/**
 * What produced a change of the slice, as an announcement names it.
 * @param was - The slice before.
 * @param now - The slice after.
 * @param otherwise - The answer when none of the three moved.
 * @returns The filter's kind, "window", "context" or "none".
 * @param edited - Which API an edit of the conditions came through, or null for an undo or a redo.
 */
function kindOf(
    was: VisibilityState,
    now: VisibilityState,
    otherwise: string,
    edited: "steps" | "conditions" | null,
): string {
    if (was.filter !== now.filter) {
        return now.filter?.kind ?? "none";
    }

    if (was.conditions !== now.conditions) {
        if (!now.conditions.some((each) => each.on && each.effect !== "select")) {
            return "none";
        }

        // An edit says which API made it; an undo or a redo of a list only steps could have
        // written is announced as steps, as it was before conditions.
        if (edited !== null) {
            return edited;
        }

        return [...was.conditions, ...now.conditions].every((each) => each.effect === "keep") ? "steps" : "conditions";
    }

    if (was.window !== now.window) {
        return now.window === null ? "none" : "window";
    }

    return was.showContext === now.showContext ? otherwise : "context";
}

// ---------------------------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------------------------

/**
 * Build the visibility model one session holds.
 *
 * ONE pair of masks lives for the life of the model, rather than a fresh pair per pass. That is
 * what makes the mask version a usable cache key for everything downstream: a new mask object
 * would start its revision at zero, and a reader keyed on it could not tell a fresh empty mask
 * from the one it had already seen.
 * @param sources - The snapshot, the dispatcher, and the capabilities a filter needs.
 * @returns The visibility model, including the masks the scope resolver reads.
 */
export function createVisibilityApi(sources: VisibilitySources): SessionVisibilityApi {
    const engine = sources.engine ?? ENGINE_VERSIONS;
    const dispatcher = sources.dispatcher ?? new Dispatcher({ definitions: VISIBILITY_DEFINITIONS });
    const { history } = dispatcher;

    let frame: VisibilityFrame | null = null;
    /** The rule each conditions list evaluates, and the last one handed out. */
    const stableRules = new WeakMap<
        readonly FilterCondition[],
        { readonly filter: RuleTree | null; readonly rule: RuleTree | null }
    >();
    let lastRule: { readonly filter: RuleTree | null; readonly rule: RuleTree | null } | null = null;
    /**
     * What the live pair holds, the step whose after-masks those are, and the snapshot they were
     * written against: a new snapshot has new rows to size the masks to, even for an equal tag.
     */
    let shown: (MaskTag & { readonly step: string | null; readonly snapshot: GraphSnapshot }) | null = null;
    let unresolvedValue: readonly Path[] = NO_PATHS;
    /** What the last pass changed, and how long its walk took: what an announcement reports. */
    let lastKind = "none";
    /**
     * Whether every pass since the last announcement changed nothing visible, so it is not
     * announced; undefined before the first such pass. A transaction runs several passes and is
     * announced once, so one pass that changed something visible makes the whole change loud.
     */
    let quiet: boolean | undefined;
    /** Which API the last conditions edit came through, until its pass announces it. */
    let editedBy: "steps" | "conditions" | null = null;
    let lastDurationMs = 0;
    /** The time window a cursor slid through the masks, which the masks hold until the next pass. */
    const slider = new WindowSlider();
    let recordsRead: { readonly key: readonly unknown[]; readonly reads: boolean } | null = null;
    let slid = false;
    /** What the last slide wrote the masks from, so recording that window can adopt them. */
    let slidTo: (MaskTag & { readonly snapshot: GraphSnapshot; readonly window: TimeWindow }) | null = null;
    /** The last pass's filter tests, and the filter, graph and inputs they were compiled from. */
    let lastCompiled: { readonly key: readonly unknown[]; readonly filter: CompiledVisibility["filter"] } | null = null;
    /** What the filter alone keeps, and the filter, graph and inputs it was read from. */
    let filterCache: {
        readonly key: readonly unknown[];
        readonly bytes: FilterBytes;
        /** The paths no row answered, once the bytes are read. */
        unresolved: readonly Path[];
        /** {@link FilterBytes} with an edge also needing both its ends, once a reader asked. */
        passing: FilterBytes | null;
    } | null = null;

    /**
     * The frame to answer from, rebuilt when the snapshot moves.
     * @returns The current frame.
     */
    const currentFrame = (): VisibilityFrame => {
        const graph = sources.snapshot();

        if (frame?.graph !== graph) {
            frame = { graph, nodeSpace: nodeSpaceOf(graph), edgeSpace: edgeSpaceOf(graph) };
        }

        return frame;
    };

    /**
     * The rule the slice calls for now: the filter AND every step that is on.
     * @returns The rule, or null.
     */
    const ruleNow = (): RuleTree | null => {
        const { filter, conditions } = dispatcher.state.visibility;
        const kept = stableRules.get(conditions);
        if (kept?.filter === filter) {
            return kept.rule;
        }

        let rule = combinedRule(filter, conditions);
        // An equal rule (only a select condition, or one that is off, changed) is the same object,
        // so the masks are not evaluated again.
        if (lastRule?.filter === filter && JSON.stringify(lastRule.rule) === JSON.stringify(rule)) {
            ({ rule } = lastRule);
        }

        lastRule = { filter, rule };
        stableRules.set(conditions, lastRule);
        return rule;
    };

    // The spaces are read through the live frame rather than captured, so one mask object spans
    // every snapshot this session ever holds and its id cache still notices when the ids move.
    const nodeMaskValue = new ElementMask<NodeId>(() => currentFrame().nodeSpace, 1, sources.onMaskVersion);
    const edgeMaskValue = new ElementMask<EdgeId>(() => currentFrame().edgeSpace, 1, sources.onMaskVersion);

    // What the filter alone keeps, for drawing ghosts: evaluated only while ghosting.
    const drawnNodes = new ElementMask<NodeId>(() => currentFrame().nodeSpace, 1);
    const drawnEdges = new ElementMask<EdgeId>(() => currentFrame().edgeSpace, 1);
    let drawnTag: {
        readonly graph: GraphSnapshot;
        readonly filter: RuleTree | null;
        readonly window: TimeWindow | null;
        readonly inputs: readonly unknown[];
    } | null = null;

    let cachedNodeIds: readonly NodeId[] | null = null;
    let cachedNodeSet: ReadonlySet<NodeId> | null = null;
    let cachedEdgeIds: readonly EdgeId[] | null = null;
    let cachedEdgeSet: ReadonlySet<EdgeId> | null = null;
    let cachedSummary: VisibilitySummary | null = null;
    let cachedSummaryKey = "";
    let fallbackScope: ScopeResolver | null = null;
    let unpins: (() => void)[] = [];
    let stopWatching: (() => void) | null = null;

    /**
     * The input signature of the sets a filter names. A scope that reaches `"visible"` or
     * `"search"` speaks nothing whatever moves, and is left out: its signature moves with the
     * masks the filter writes, so following it would re-evaluate for ever.
     * @param filter - The filter, or null.
     * @returns The signature: "" for none, null when one cannot be enumerated.
     */
    const signatureOf = (filter: RuleTree | null): string | null => {
        const { watch, dependencies } = sources;
        if (watch === undefined) {
            return "";
        }

        const parts: string[] = [];
        for (const scope of filterScopes(filter)) {
            if (dependencies !== undefined && visibilityCycle({ kind: "member", of: scope }, dependencies) !== null) {
                continue;
            }

            const part = watch.signature(scope);
            if (part === null) {
                return null;
            }

            parts.push(part);
        }

        return parts.join("\n");
    };

    /**
     * Follow the sets the filter in force names: watch them and pin their cache entries, or stop
     * watching when it names none, so a session filtering without sets pays nothing.
     * @param filter - The filter the masks now show.
     */
    const follow = (filter: RuleTree | null): void => {
        const { watch } = sources;
        if (watch === undefined) {
            return;
        }

        const scopes = filterScopes(filter);
        const previous = unpins;
        unpins = scopes.map((scope) => watch.pin(scope));
        for (const unpin of previous) {
            unpin();
        }

        if (scopes.length === 0) {
            stopWatching?.();
            stopWatching = null;
        } else {
            stopWatching ??= watch.subscribe(filterWatch);
        }
    };

    /**
     * The sources a pass compiles against: a `member` leaf that reaches `"visible"` or `"search"`
     * (a cycle a later redefine or a load made) speaks nothing, so a pass never reads the masks
     * it is writing and never recurses.
     * @param graph - The snapshot the pass walks.
     * @returns The sources.
     */
    const passSources = (graph: GraphSnapshot): FilterSources => {
        const { scope, dependencies } = sources;
        if (scope === undefined) {
            return { ...sources, holdsInstants };
        }

        return {
            ...sources,
            holdsInstants,
            scope: (spec): ScopeLeaf =>
                dependencies !== undefined && visibilityCycle({ kind: "member", of: spec }, dependencies) !== null
                    ? { nodes: makeMask(graph.nodeCount), edges: null }
                    : scope(spec),
        };
    };

    /** The window a project restored as instants, as text: undo brings back a copy of it. */
    let savedInstants: string | null = null;

    /**
     * Whether a window's bounds are instants. With the timeline off a window set live reads values
     * as they stand, as it did before the timeline; only a saved one holds instants.
     * @param window - The window.
     * @returns True for instants.
     */
    const holdsInstants = (window: TimeWindow): boolean =>
        sources.timeline?.() !== false || JSON.stringify(window) === savedInstants;

    /**
     * Write the whole membership into the masks from a filter and a window.
     * @param graph - The snapshot to evaluate against.
     * @param filter - The filter, or null.
     * @param window - The window, or null.
     */
    const evaluate = (graph: GraphSnapshot, filter: RuleTree | null, window: TimeWindow | null): void => {
        slideCounters.full++;
        nodeMaskValue.grow(graph.nodeCount);
        edgeMaskValue.grow(graph.edgeCount);
        nodeMaskValue.clear();
        edgeMaskValue.clear();

        if (filter === null && window === null) {
            nodeMaskValue.fill();
            edgeMaskValue.fill();
            unresolvedValue = NO_PATHS;
            lastCompiled = null;

            return;
        }

        const compiled = compileVisibility(graph, filter, window, passSources(graph));
        runPass({ compiled, edges: edgeMaskValue, graph, nodes: nodeMaskValue });
        unresolvedValue = compiled.unresolvedPaths();
        if (sources.timeline?.() === true) {
            slideCounters.filterReads++;
            lastCompiled = { key: [filter, graph, ...inputsFor(filter, null)], filter: compiled.filter };
        }
    };

    /**
     * What a filter and a window read besides the graph: the run entries whose results a
     * `results.*` path names.
     * @param filter - The filter, or null.
     * @param window - The window, or null.
     * @returns The entries; none when nothing is filtering, which reads nothing.
     */
    const inputsFor = (filter: RuleTree | null, window: TimeWindow | null): readonly unknown[] => {
        if (filter === null && window === null) {
            return NO_INPUTS;
        }

        // The signature of every set the filter names, so masks copied before a redefine are never
        // pasted back after one; one that cannot be enumerated matches nothing, not even itself.
        const signature = signatureOf(filter);
        // ponytail: every entry rather than the ones the filter's paths name, so any run change
        // re-evaluates a filter; name the read runs if that ever costs a pass that matters.
        return [...dispatcher.state.runs.values(), signature ?? {}];
    };

    /**
     * A filter's tests: the last pass's when they fit, since compiling walks both kinds.
     * @param graph - The snapshot.
     * @param rule - The filter.
     * @param key - The filter, graph and inputs.
     * @returns The tests, or null with no filter.
     */
    const filterTests = (
        graph: GraphSnapshot,
        rule: RuleTree | null,
        key: readonly unknown[],
    ): CompiledVisibility["filter"] => {
        if (lastCompiled !== null && sameInputs(lastCompiled.key, key)) {
            return lastCompiled.filter;
        }

        return rule === null ? null : compileVisibility(graph, rule, null, passSources(graph)).filter;
    };

    /**
     * What the filter alone keeps, read once per filter, graph and inputs.
     * @param graph - The snapshot.
     * @returns The bytes.
     */
    const filterBytesOf = (graph: GraphSnapshot): FilterBytes => {
        const rule = ruleNow();
        const key = [rule, graph, ...inputsFor(rule, null)];
        if (filterCache !== null && sameInputs(filterCache.key, key)) {
            return filterCache.bytes;
        }

        // Read on first use: a reader of the identity alone compiles nothing.
        let read: FilterBytes | null = null;
        const tested = (): FilterBytes => {
            if (read === null) {
                slideCounters.filterReads++;
                const compiled = filterTests(graph, rule, key);
                read = {
                    nodes: bytesOf(compiled?.node ?? null, graph.nodeCount),
                    edges: bytesOf(compiled?.edge ?? null, graph.edgeCount),
                };
                entry.unresolved = compiled?.unresolvedPaths() ?? NO_PATHS;
                lastCompiled = null;
            }

            return read;
        };
        const bytes: FilterBytes = {
            get nodes() {
                return tested().nodes;
            },
            get edges() {
                return tested().edges;
            },
        };
        const entry = { key, bytes, unresolved: NO_PATHS, passing: null };
        filterCache = entry;

        return bytes;
    };

    /**
     * What every filter leaves showing, the window aside: read once per filter, graph and inputs.
     * @param graph - The snapshot.
     * @returns The bytes.
     */
    const passingOf = (graph: GraphSnapshot): FilterBytes => {
        const { nodes, edges } = filterBytesOf(graph);
        const entry = filterCache;
        if (entry === null || nodes === null) {
            return { nodes, edges };
        }

        if (entry.passing === null) {
            const { src, dst } = graph.edgeList();
            const out = new Uint8Array(graph.edgeCount);
            for (let row = 0; row < out.length; row++) {
                out[row] = (edges === null ? 1 : edges[row]) & nodes[src[row]] & nodes[dst[row]];
            }

            entry.passing = { nodes, edges: out };
        }

        return entry.passing;
    };

    /**
     * The paths a slide's masks leave unresolved. A full pass tests an edge only past its ends, so
     * what it sees depends on the window; a slide has read every row of the filter, which does not.
     * @param window - The window.
     * @param instants - The window's index.
     * @returns The filter's unresolved paths, and the window's own when no row holds a time.
     */
    const unresolvedOfSlide = (window: TimeWindow, instants: SlideTarget["instants"]): readonly Path[] => {
        const filterPaths = filterCache?.unresolved ?? NO_PATHS;
        const timed = (instants?.node?.timed ?? 0) + (instants?.edge?.timed ?? 0);

        return timed > 0 || filterPaths.includes(window.attribute) ? filterPaths : [...filterPaths, window.attribute];
    };

    /**
     * The tag of the masks the slice and the graph call for now.
     * @returns The tag.
     */
    const wantedTag = (): MaskTag => {
        const { window } = dispatcher.state.visibility;
        const filter = ruleNow();

        return { token: dispatcher.state.graph.token, filter, window, inputs: inputsFor(filter, window) };
    };

    /**
     * The nearest done step that changed the visibility slice: the step whose after-masks the
     * masks are once they are up to date.
     * @returns Its id, or null when no done step changed it.
     */
    const ownerStep = (): string | null => {
        const { steps, position } = history;
        for (let index = position - 1; index >= 0; index--) {
            if (steps[index].slices.includes("visibility")) {
                return steps[index].id;
            }
        }

        return null;
    };

    /**
     * Keep the live pair on the step whose after-masks it holds, unless that step already keeps
     * these. Taken only when the pair is about to be rewritten for another step, so a drag
     * merging into one step sixty times copies nothing until it is over.
     * @param held - What the pair holds.
     */
    const keepCopy = (held: MaskTag & { readonly step: string }): void => {
        const kept = history.cacheOf(held.step) as MaskCopy | undefined;
        if (kept !== undefined && sameTag(kept.tag, held)) {
            return;
        }

        const copy: MaskCopy = {
            tag: { token: held.token, filter: held.filter, window: held.window, inputs: held.inputs },
            nodes: nodeMaskValue.bytes(),
            edges: edgeMaskValue.bytes(),
            unresolved: unresolvedValue,
        };
        history.setCache(held.step, copy, copy.nodes.byteLength + copy.edges.byteLength);
    };

    /**
     * Whether the slid masks are the masks a tag calls for. A slid window must never pass for the
     * recorded one by mistake, so every part the masks depend on is compared.
     * @param tag - The tag.
     * @param graph - The snapshot.
     * @returns True when the masks can stay as they are.
     */
    const holdsSlide = (tag: MaskTag, graph: GraphSnapshot): boolean => {
        const at = slidTo;
        const { window } = tag;

        return (
            at !== null &&
            window !== null &&
            at.snapshot === graph &&
            at.filter === tag.filter &&
            sameInputs(at.inputs, tag.inputs) &&
            at.window.attribute === window.attribute &&
            at.window.from === window.from &&
            at.window.to === window.to &&
            at.window.nodes === window.nodes &&
            at.window.missing === window.missing
        );
    };

    /**
     * Write the masks a tag calls for: from the owning step's copy when its tag matches, by
     * evaluating the filter otherwise.
     * @param graph - The snapshot.
     * @param tag - The tag.
     * @param step - The owning step, or null.
     */
    const restoreMasks = (graph: GraphSnapshot, tag: MaskTag, step: string | null): void => {
        const kept = step === null ? undefined : (history.cacheOf(step) as MaskCopy | undefined);
        if (kept !== undefined && sameTag(kept.tag, tag)) {
            nodeMaskValue.load(kept.nodes);
            edgeMaskValue.load(kept.edges);
            unresolvedValue = kept.unresolved;
        } else {
            const startedAt = performance.now();
            evaluate(graph, tag.filter, tag.window);
            lastDurationMs = Math.round(performance.now() - startedAt);
        }
    };

    /**
     * Make the masks describe the slice and the graph as they now stand: from the owning step's
     * mask copy when its tag matches, by evaluating the filter otherwise. What the `visibility`
     * hook runs.
     * @returns The frame the masks now describe.
     */
    const sync = (): VisibilityFrame => {
        const active = currentFrame();
        const tag = wantedTag();
        if (shown !== null && shown.snapshot === active.graph && sameTag(shown, tag) && !slid) {
            return active;
        }

        const step = ownerStep();
        // Slid masks belong to no step: copying them would hand the last step a window it never had.
        if (shown !== null && shown.step !== null && shown.step !== step && !slid) {
            keepCopy({ ...shown, step: shown.step });
        }

        const adopted = slid && holdsSlide(tag, active.graph);
        slid = false;

        if (!adopted) {
            restoreMasks(active.graph, tag, step);
        }

        shown = { ...tag, step, snapshot: active.graph };
        follow(tag.filter);

        return active;
    };

    /**
     * The masks as a reader gets them: brought up to date at once when the graph, or the results
     * a filter reads, moved underneath them, because a mask kept across a data change hides
     * nodes that no longer exist. A change of the slice itself waits for its pass, so a filter
     * superseded before then is never evaluated, even when something reads in between.
     *
     * Synchronous, and deliberately so. Every reader here -- a status bar, the scope resolver, a
     * run about to resolve its scope -- needs the answer for the current graph, and none of them
     * can await.
     * @returns The frame the masks describe.
     */
    const upToDate = (): VisibilityFrame => {
        const active = currentFrame();
        if (
            shown !== null &&
            shown.snapshot === active.graph &&
            sameInputs(shown.inputs, inputsFor(shown.filter, shown.window))
        ) {
            return active;
        }

        return sync();
    };

    /**
     * How much of the graph is showing, as one object per membership.
     * @returns The summary.
     */
    const summaryOf = (): VisibilitySummary => {
        const active = upToDate();
        const key = `${nodeMaskValue.version}:${edgeMaskValue.version}:${active.graph.nodeCount}:${active.graph.edgeCount}`;

        if (cachedSummary === null || cachedSummaryKey !== key) {
            cachedSummaryKey = key;
            cachedSummary = Object.freeze({
                totalEdges: active.graph.edgeCount,
                totalNodes: active.graph.nodeCount,
                visibleEdges: edgeMaskValue.size,
                visibleNodes: nodeMaskValue.size,
            });
        }

        return cachedSummary;
    };

    /**
     * Whether ghosts are drawn now.
     * @returns True while the `outside` setting is `"ghost"` and a window is in force.
     */
    const timeGhosting = (): boolean =>
        sources.timeline?.() !== false &&
        dispatcher.state.visibility.playback?.outside === "ghost" &&
        (dispatcher.state.visibility.window !== null || slid);

    /** The condition a reader is editing, whose removals stay drawn as ghosts (`hold`). */
    let held: string | null = null;
    /** Whether every condition is lifted while one is held (a view over the full graph). */
    let heldAll = false;
    /** The held condition's rule-less stand-in: the rule the rest draws by, by its inputs. */
    let heldRule: {
        readonly conditions: readonly FilterCondition[];
        readonly filter: RuleTree | null;
        readonly held: string;
        readonly all: boolean;
        readonly rule: RuleTree | null;
    } | null = null;

    /**
     * What is drawn by: the rule in force, or while a condition that removes anything is held,
     * the rule without it. The same object until its inputs move.
     * @returns The rule.
     */
    const drawnRuleNow = (): RuleTree | null => {
        const { filter, conditions } = dispatcher.state.visibility;
        const holding = conditions.find((each) => each.id === held);
        const lifts = heldAll ? held !== null : holding !== undefined && holding.on && holding.effect !== "select";
        if (held === null || !lifts) {
            return ruleNow();
        }

        if (
            heldRule?.conditions !== conditions ||
            heldRule.filter !== filter ||
            heldRule.held !== held ||
            heldRule.all !== heldAll
        ) {
            heldRule = {
                conditions,
                filter,
                held,
                all: heldAll,
                rule: combinedRule(filter, heldAll ? NO_CONDITIONS : conditions.filter((each) => each.id !== held)),
            };
        }

        return heldRule.rule;
    };

    const ghostingNow = (): boolean => timeGhosting() || drawnRuleNow() !== ruleNow();

    /**
     * Bring the drawn masks up to date: what the filter keeps with no window.
     * @returns The frame.
     */
    const drawnUpToDate = (): VisibilityFrame => {
        const active = upToDate();
        const filter = drawnRuleNow();
        // Time ghosts are drawn whatever the window says; a held condition alone keeps the window.
        const window = timeGhosting() ? null : dispatcher.state.visibility.window;
        const inputs = inputsFor(filter, window);
        if (
            drawnTag?.graph === active.graph &&
            drawnTag.filter === filter &&
            drawnTag.window === window &&
            sameInputs(drawnTag.inputs, inputs)
        ) {
            return active;
        }

        drawnNodes.grow(active.graph.nodeCount);
        drawnEdges.grow(active.graph.edgeCount);
        drawnNodes.clear();
        drawnEdges.clear();
        if (filter === null && window === null) {
            drawnNodes.fill();
            drawnEdges.fill();
        } else {
            const compiled = compileVisibility(active.graph, filter, window, passSources(active.graph));
            runPass({ compiled, edges: drawnEdges, graph: active.graph, nodes: drawnNodes });
        }

        drawnTag = { graph: active.graph, filter, window, inputs };

        return active;
    };

    let ghostCache: { readonly key: readonly unknown[]; readonly node: Uint8Array; readonly edge: Uint8Array } | null =
        null;

    /**
     * Bring the kept ghosts forward by the rows a slide moved, in place: with the drawn masks
     * unmoved, those are the only rows that can have become or stopped being ghosts.
     * @param key - The key of what is asked for.
     * @returns The ghosts, or null when more than that moved.
     */
    const ghostsAfterSlide = (key: readonly unknown[]): typeof ghostCache => {
        if (ghostCache === null || key.slice(2).some((part, at) => part !== ghostCache?.key[at + 2])) {
            return null;
        }

        const { key: kept, node, edge } = ghostCache;
        const nodeRows = nodeMaskValue.changedSince(kept[0] as number);
        const edgeRows = edgeMaskValue.changedSince(kept[1] as number);
        if (nodeRows === null || edgeRows === null) {
            return null;
        }

        for (const row of nodeRows) {
            node[row] = nodeMaskValue.has(row) ? 0 : 1;
        }

        for (const row of edgeRows) {
            edge[row] = edgeMaskValue.has(row) ? 0 : 1;
        }

        return { key, node, edge };
    };

    /**
     * One byte per element, 1 for a ghost, or null while not ghosting. Kept until a mask, the
     * graph, the filter or the runs it reads move, so a repaint asking per element walks once.
     * @returns The bytes, or null.
     */
    const ghostsNow = (): { readonly node: Uint8Array; readonly edge: Uint8Array } | null => {
        if (!ghostingNow()) {
            return null;
        }

        const { state } = dispatcher;
        const key = [
            nodeMaskValue.version,
            edgeMaskValue.version,
            state.graph.token,
            ruleNow(),
            drawnRuleNow(),
            state.visibility.window,
            state.runs,
            sources.snapshot(),
        ];
        if (ghostCache?.key.length === key.length && ghostCache.key.every((part, at) => part === key[at])) {
            return ghostCache;
        }

        const carried = ghostsAfterSlide(key);
        if (carried !== null) {
            ghostCache = carried;
            return ghostCache;
        }

        const active = drawnUpToDate();
        const node = new Uint8Array(active.graph.nodeCount);
        const edge = new Uint8Array(active.graph.edgeCount);
        drawnNodes.forEachMember((index) => {
            node[index] = nodeMaskValue.has(index) ? 0 : 1;
        });
        drawnEdges.forEachMember((index) => {
            edge[index] = edgeMaskValue.has(index) ? 0 : 1;
        });
        ghostCache = { key, node, edge };

        return ghostCache;
    };

    /**
     * What an edit looked at, which is always the whole graph.
     *
     * A filter has to be evaluated over everything it could possibly show, not over what is
     * showing now; a filter resolved against the visible set could only ever hide, and widening
     * one would be impossible.
     * @returns The resolved scope.
     */
    const wholeGraphScope = (): ResolvedScope => {
        const resolve = sources.resolveScope;

        if (resolve !== undefined) {
            return resolve("graph");
        }

        fallbackScope ??= createScopeApi({ snapshot: () => sources.snapshot() });

        return fallbackScope.resolveNow(WHOLE_GRAPH);
    };

    /**
     * The counts, the unresolved paths and the duration of the last walk.
     * @returns The result.
     */
    const resultOf = (): FilterResult => {
        const summary = summaryOf();

        return Object.freeze({
            durationMs: lastDurationMs,
            total: Object.freeze({ edges: summary.totalEdges, nodes: summary.totalNodes }),
            unresolvedPaths: unresolvedValue,
            visible: Object.freeze({ edges: summary.visibleEdges, nodes: summary.visibleNodes }),
        });
    };

    // The visibility ops of this dispatcher refuse what this session cannot evaluate.
    dispatcher.services.visibility = {
        timeline: () => sources.timeline?.() !== false,
        check: (filter, window) => {
            assertEvaluable(filter, window, sources);
        },
    };

    // The `visibility` hook: the masks follow the slice, whatever moved it -- an edit, an undo, a
    // redo, a restore or a rollback.
    dispatcher.lane.register("visibility", (rendered, target) => {
        const was = rendered.visibility;
        const now = target.visibility;
        lastKind = kindOf(was, now, lastKind, dispatcher.lane.passCause === "command" ? editedBy : null);
        editedBy = null;
        // A change only to select conditions (or to conditions that are off) shows and hides
        // nothing, so it is not announced as a visibility change.
        quiet =
            (quiet ?? true) &&
            was.conditions !== now.conditions &&
            was.filter === now.filter &&
            was.window === now.window &&
            was.showContext === now.showContext &&
            JSON.stringify(combinedRule(was.filter, was.conditions)) ===
                JSON.stringify(combinedRule(now.filter, now.conditions));
        // The masks first: a redo's selection is what the select conditions match among what the
        // conditions it reached leave visible.
        sync();
        followSelectHistory(was.conditions, now.conditions);
        dropHiddenSelection(was, now);
    });

    // The filter follows the sets it names: when one moves -- a set edit, its undo or redo, or an
    // input a rule set reads -- the masks are brought up to date and the change announced. On the
    // same snapshot that is synchronous, before any public event; after a freeze it waits for the
    // notifier's frame, unless a read brought the masks up to date first.
    const filterWatch: SetWatch<boolean> = {
        signature: () => signatureOf(ruleNow()),
        resolve: (): boolean => {
            const before = shown;
            upToDate();

            return shown !== before;
        },
        ready: (changed) => {
            if (changed) {
                sources.onChange?.({
                    ...resultOf(),
                    filterKind: ruleNow()?.kind ?? "none",
                    cause: dispatcher.lane.passCause,
                });
            }
        },
        cost: () => {
            const graph = sources.snapshot();

            return graph.nodeCount + graph.edgeCount;
        },
    };

    // Told once the pass deriving a change has run: one call per edit, one per step passed.
    const previousDerived = dispatcher.events.derived;
    dispatcher.events.derived = (change) => {
        previousDerived?.(change);
        if (change.slices.includes("visibility") && quiet !== true) {
            sources.onChange?.({ ...resultOf(), filterKind: lastKind, cause: change.cause });
        }

        quiet = undefined;
    };

    /**
     * Check a steps list the way {@link VisibilityApi.set} checks a filter, and admit each rule.
     * @param steps - The steps as given.
     * @returns The steps to hold, frozen.
     */
    const admitSteps = (steps: readonly FilterStep[]): readonly FilterStep[] => {
        assertSteps(steps);

        return Object.freeze(
            steps.map((step) => {
                const rule = sources.admit === undefined ? step.rule : sources.admit(step.rule);
                assertVisibility(rule, null, sources.dependencies);

                return Object.freeze({ id: step.id, on: step.on, rule });
            }),
        );
    };

    /**
     * The conditions the slice holds.
     * @returns The conditions.
     */
    const conditionsNow = (): readonly FilterCondition[] => dispatcher.state.visibility.conditions;

    /**
     * Check conditions as given and admit each new one's rule: an id is made for one without
     * (unused by `taken` and the rest), and `on` defaults to true. A condition the list already
     * holds (the same object) is kept as it is.
     * @param inputs - The conditions as given.
     * @param taken - Conditions whose ids a made id must not take.
     * @returns The conditions, frozen.
     * @throws A `GraphtyError` (`E_BAD_COMMAND`) when one is malformed or two share an id.
     */
    const admitConditions = (
        inputs: readonly FilterConditionInput[],
        taken: readonly FilterCondition[] = [],
    ): readonly FilterCondition[] => {
        if (!Array.isArray(inputs)) {
            assertConditions(inputs);
        }

        const held = new Set<unknown>(conditionsNow());
        const used = new Set([...taken, ...inputs].map((each) => (each as { id?: unknown }).id));
        let next = 1;
        const madeId = (): string => {
            while (used.has(`c-${next}`)) {
                next++;
            }

            used.add(`c-${next}`);
            return `c-${next}`;
        };
        const list = inputs.map((input): FilterCondition => {
            if (held.has(input)) {
                return input as FilterCondition;
            }

            const shaped = { ...input, id: input.id ?? madeId(), on: input.on ?? true };
            if (!wellFormed(shaped)) {
                assertConditions([shaped]);
            }

            const rule = sources.admit === undefined ? shaped.rule : sources.admit(shaped.rule);
            assertNotCircular(rule);
            assertVisibility(rule, null, sources.dependencies);
            return Object.freeze(conditionOf(shaped, rule));
        });
        assertConditions(list);
        return Object.freeze(list);
    };

    /**
     * Where a condition is in a list.
     * @param list - The list.
     * @param id - The condition's id.
     * @returns Its index.
     * @throws A `GraphtyError` (`E_BAD_COMMAND`) when no condition has the id.
     */
    const indexOfCondition = (list: readonly FilterCondition[], id: string): number => {
        const at = list.findIndex((each) => each.id === id);
        if (at === -1) {
            throw new GraphtyError({
                code: "E_BAD_COMMAND",
                message: `There is no filter condition with the id "${id}".`,
                source: "data",
                details: { id },
            });
        }

        return at;
    };

    /**
     * The elements a rule matches over the whole graph, as the two compiled tests and the paths
     * nothing answered.
     * @param active - The frame.
     * @param rule - The rule.
     * @returns The tests and the unresolved paths; a test is null when the rule says nothing of
     *     that kind.
     */
    const compiledOver = (active: VisibilityFrame, rule: RuleTree): CompiledVisibility =>
        compileVisibility(active.graph, rule, null, passSources(active.graph));

    /**
     * The ids a select rule matches among the visible elements, or over the whole graph when every
     * select condition that is on reads `within: "graph"`; a kind it says nothing of has none.
     * @param conditions - The conditions whose select ones to read.
     * @returns The ids.
     */
    const selectedBy = (
        conditions: readonly FilterCondition[],
    ): { readonly nodes: readonly NodeId[]; readonly edges: readonly EdgeId[] } => {
        const rule = selectRule(conditions);
        if (rule === null) {
            return { nodes: [], edges: [] };
        }

        // Only what is in the picture: a filter step drops from the selection the ids it leaves
        // out (design/ui/framework/interaction-patterns.md, "When selected elements leave").
        const active = upToDate();
        const compiled = compiledOver(active, rule);
        const whole = selectsOverGraph(conditions);
        const nodes: NodeId[] = [];
        const edges: EdgeId[] = [];
        const { node, edge } = compiled;
        for (let at = 0; node !== null && at < active.graph.nodeCount; at++) {
            const id = active.nodeSpace.idOf(at);
            if (node(at) && (whole || nodeMaskValue.has(nodeMaskValue.indexOf(id)))) {
                nodes.push(id);
            }
        }

        for (let at = 0; edge !== null && at < active.graph.edgeCount; at++) {
            const id = active.edgeSpace.idOf(at);
            if (edge(at) && (whole || edgeMaskValue.has(edgeMaskValue.indexOf(id)))) {
                edges.push(id);
            }
        }

        return { nodes, edges };
    };

    /**
     * What the select conditions that are on say, and while one is on what the keep and exclude
     * conditions leave in the picture, by value: equal keys select the same.
     * @param conditions - The conditions.
     * @returns The key.
     */
    const selectKey = (conditions: readonly FilterCondition[]): string => {
        const rule = selectRule(conditions);
        const picture = rule === null ? [] : stepsOf(conditions).filter((step) => step.on);
        return JSON.stringify(rule === null ? null : [rule, picture.map((step) => step.rule)]);
    };

    /** The selection before each select change, by the conditions list it produced: what undo puts back. */
    const selectionBefore = new WeakMap<
        readonly FilterCondition[],
        { readonly nodes: readonly NodeId[]; readonly edges: readonly EdgeId[] }
    >();
    /** The selection before each select change, by the conditions list it replaced: what a rollback puts back. */
    const selectionWhile = new WeakMap<
        readonly FilterCondition[],
        { readonly nodes: readonly NodeId[]; readonly edges: readonly EdgeId[] }
    >();
    /** The filter drafts still open, for {@link SessionVisibilityApi.openDrafts}. */
    const drafts = new Set<FilterDraft>();
    /** The selection before a filter change dropped what it hides, by the visibility it reached. */
    const droppedFrom = new WeakMap<
        VisibilityState,
        { readonly nodes: readonly NodeId[]; readonly edges: readonly EdgeId[] }
    >();
    /** The conditions whose select conditions the selection last followed, or null when none did. */
    let selectFollowed: readonly FilterCondition[] | null = null;

    /**
     * After an undo or a redo that changed the select conditions, put the selection that goes
     * with the conditions it reached back: the reader's selection from before the change for an
     * undo, what the select conditions match for a redo. A rollback puts back the selection from
     * before the rolled-back select change, so a rolled-back transaction leaves nothing behind;
     * it is judged against the conditions the selection last followed, because a transaction that
     * threw may never have been shown. An edit applies its own; opening a project and a restore
     * apply none.
     * @param was - The conditions shown before.
     * @param now - The conditions shown after.
     */
    const followSelectHistory = (was: readonly FilterCondition[], now: readonly FilterCondition[]): void => {
        const cause = dispatcher.lane.passCause;
        const { selection } = sources;
        if (selection === undefined) {
            return;
        }

        if (cause === "rollback") {
            const back = selectionWhile.get(now);
            if (selectFollowed !== null && back !== undefined && selectKey(selectFollowed) !== selectKey(now)) {
                selection.replace(back, "history");
                selectFollowed = now;
            }

            return;
        }

        if ((cause !== "undo" && cause !== "redo") || selectKey(was) === selectKey(now)) {
            return;
        }

        selection.replace(
            cause === "undo" ? (selectionBefore.get(was) ?? selectedBy(now)) : selectedBy(now),
            "history",
        );
        selectFollowed = now;
    };

    /**
     * With the working graph on, a filter change drops what the filter hides from the selection
     * (owner decision B): the time window does not, and clearing the filter brings nothing back.
     * Undoing the change puts back what it dropped; redoing it drops it again.
     * @param was - The visibility shown before.
     * @param now - The visibility shown after.
     */
    const dropHiddenSelection = (was: VisibilityState, now: VisibilityState): void => {
        const { selection } = sources;
        const cause = dispatcher.lane.passCause;
        if (
            selection === undefined ||
            sources.dropsHiddenSelection?.() !== true ||
            (was.filter === now.filter && was.conditions === now.conditions)
        ) {
            return;
        }

        if (cause === "undo") {
            const back = droppedFrom.get(was);
            if (back !== undefined) {
                selection.replace(back, "history");
            }

            return;
        }

        if (cause !== "command" && cause !== "redo") {
            return;
        }

        const graph = sources.snapshot();
        const { nodes: keepsNodes, edges: keepsEdges } = passingOf(graph);
        if (keepsNodes === null) {
            return;
        }

        const current = selection.current();
        const nodes = current.nodes.filter((id) => keepsNodes[nodeMaskValue.indexOf(id)] === 1);
        const edges = current.edges.filter((id) => keepsEdges === null || keepsEdges[edgeMaskValue.indexOf(id)] === 1);
        if (nodes.length === current.nodes.length && edges.length === current.edges.length) {
            return;
        }

        droppedFrom.set(now, current);
        selection.replace({ nodes, edges }, cause === "redo" ? "history" : "command");
    };

    /**
     * What an edit to the conditions does to the selection once it is recorded: when what the
     * select conditions would select changes, the selection becomes what they match, and the
     * selection it replaced is kept for undo.
     * @param conditions - The conditions the edit records.
     * @param follow - Whether the selection follows the change; false keeps the reader's.
     * @returns What to run after the edit is recorded.
     */
    const followSelection = (conditions: readonly FilterCondition[], follow = true): (() => void) => {
        const { selection } = sources;
        if (!follow || selection === undefined || selectKey(conditionsNow()) === selectKey(conditions)) {
            return () => undefined;
        }

        const before = selection.current();
        const base = conditionsNow();
        return () => {
            const recorded = conditionsNow();
            selectionBefore.set(recorded, before);
            selectionWhile.set(base, before);
            selectFollowed = recorded;
            selection.replace(selectedBy(recorded), "command");
        };
    };

    /**
     * Record a conditions list: one step, which the selection follows ({@link followSelection}).
     * @param conditions - The admitted conditions.
     * @param options - A signal, and a progress handler.
     * @param extra - What else the run resolves with.
     * @param follow - Whether the selection follows the change; false keeps the reader's.
     * @returns The run.
     */
    const editConditions = <TExtra extends object = object>(
        conditions: readonly FilterCondition[],
        options: RunOptions,
        extra?: TExtra,
        follow = true,
    ): Run<FilterResult & TExtra> => {
        const after = followSelection(conditions, follow);
        editedBy = "conditions";

        return edit(
            { op: "visibility.conditions", conditions },
            combinedRule(dispatcher.state.visibility.filter, conditions),
            dispatcher.state.visibility.window,
            options,
            { ...(extra === undefined ? {} : { extra }), after },
        );
    };

    // A selection the reader changes by hand switches the select conditions off, so a card never
    // claims a selection that is gone (interaction-patterns.md: what is ringed and what is
    // described never differ). The reader's selection stays; undo switches them back on.
    sources.selection?.onHandChange?.(() => {
        const now = conditionsNow();
        if (!now.some((each) => each.on && each.effect === "select")) {
            return;
        }

        const off = now.map((each) =>
            each.on && each.effect === "select" ? Object.freeze({ ...each, on: false }) : each,
        );
        // A refused edit leaves the conditions as they were; nothing waits on this run.
        editConditions(Object.freeze(off), {}, undefined, false).then(undefined, () => undefined);
    });

    /** The counts kept for one graph and one set of run results, by rule. */
    let countBucket: {
        readonly graph: GraphSnapshot;
        readonly runs: unknown;
        byRule: Map<string, FilterConditionCount>;
    } | null = null;
    /** The last counts list, for the conditions and the bucket it was read from. */
    let countsMemo: {
        readonly conditions: readonly FilterCondition[];
        readonly bucket: unknown;
        readonly signatures: string;
        readonly value: readonly FilterConditionCount[];
    } | null = null;

    /**
     * What one rule matches, as written, over the whole graph or only among what is drawn.
     * @param active - The frame.
     * @param rule - The rule.
     * @param drawn - What is drawn, to count among; null for the whole graph.
     * @returns The count, without an id.
     */
    const countRule = (
        active: VisibilityFrame,
        rule: RuleTree,
        drawn: Drawn | null,
    ): Omit<FilterConditionCount, "id"> => {
        const compiled = compiledOver(active, rule);
        const tally = (
            test: ((index: number) => boolean) | null,
            count: number,
            among: ElementMask<NodeId> | ElementMask<EdgeId> | undefined,
            visible: ElementMask<NodeId> | ElementMask<EdgeId>,
        ): FilterConditionMatches | null => {
            if (test === null) {
                return null;
            }

            let matched = 0;
            let shown = 0;
            for (let at = 0; at < count; at++) {
                if ((among === undefined || among.has(at)) && test(at)) {
                    matched++;
                    shown += visible.has(at) ? 1 : 0;
                }
            }

            // One basis for every condition: the whole graph's count, so a Select card and a Filter
            // to card beside it are read against the same number.
            return Object.freeze({ matched, total: count, shown });
        };
        const nodes = tally(compiled.node, active.graph.nodeCount, drawn?.nodes, nodeMaskValue);
        const edges = tally(compiled.edge, active.graph.edgeCount, drawn?.edges, edgeMaskValue);

        return Object.freeze({ nodes, edges, unresolved: compiled.unresolvedPaths() });
    };

    /**
     * Every condition's count, kept per rule until the graph or the run results move.
     * @returns The counts, in condition order.
     */
    const countsNow = (): readonly FilterConditionCount[] => {
        const active = upToDate();
        const { runs } = dispatcher.state;
        if (countBucket?.graph !== active.graph || countBucket.runs !== runs) {
            countBucket = { graph: active.graph, runs, byRule: new Map() };
        }

        const conditions = conditionsNow();
        const bucket = countBucket;
        // A select condition selects only among what is drawn unless every select condition that is
        // on reads "graph" (selectsOverGraph), and its count follows the same predicate: among the
        // live masks, synced by upToDate above, so their version is part of its key. An off one is
        // judged as if it were switched on, so it says what switching it on would mark.
        const inPicture = (condition: FilterCondition): boolean =>
            condition.effect === "select" &&
            !selectsOverGraph(
                condition.on
                    ? conditions
                    : conditions.map((each) => (each === condition ? { ...each, on: true } : each)),
            );
        // Every count says how many of its matches are shown, so the live masks' version is part
        // of every key.
        const pictureSignature = `${nodeMaskValue.version}:${edgeMaskValue.version}`;
        const each = conditions.map((condition) => {
            const own = signatureOf(condition.rule);
            return own === null ? own : `${own}\n${inPicture(condition) ? "picture" : "graph"}\n${pictureSignature}`;
        });
        const signatures = JSON.stringify(each);
        if (
            countsMemo?.conditions === conditions &&
            countsMemo.bucket === bucket &&
            countsMemo.signatures === signatures &&
            !each.includes(null)
        ) {
            return countsMemo.value;
        }

        // Only the counts of the conditions held now are kept, so a dragged slider keeps one.
        const kept = new Map<string, FilterConditionCount>();
        const value = Object.freeze(
            conditions.map((condition, at): FilterConditionCount => {
                const signature = each[at];
                // A rule reading a set whose inputs cannot be enumerated is counted every time.
                // By id too, so a condition nothing changed hands back the same object.
                const key =
                    signature === null ? null : `${condition.id}\n${JSON.stringify(condition.rule)}\n${signature}`;
                const drawn = inPicture(condition) ? { nodes: nodeMaskValue, edges: edgeMaskValue } : null;
                let count = key === null ? undefined : bucket.byRule.get(key);
                count ??= Object.freeze({ id: condition.id, ...countRule(active, condition.rule, drawn) });

                if (key !== null) {
                    kept.set(key, count);
                }

                return count;
            }),
        );
        bucket.byRule = kept;
        countsMemo = { conditions, bucket, signatures, value };
        return value;
    };

    /**
     * How many nodes and edges a rule and a window leave, in masks of their own: the live pair is
     * not touched.
     * @param active - The frame to count in.
     * @param rule - The rule, or null.
     * @param window - The window, or null.
     * @returns The counts.
     */
    const countOf = (active: VisibilityFrame, rule: RuleTree | null, window: TimeWindow | null): Counts => {
        const { graph } = active;
        if (rule === null && window === null) {
            return Object.freeze({ nodes: graph.nodeCount, edges: graph.edgeCount });
        }

        const nodes = new ElementMask<NodeId>(() => active.nodeSpace, Math.max(1, graph.nodeCount));
        const edges = new ElementMask<EdgeId>(() => active.edgeSpace, Math.max(1, graph.edgeCount));
        nodes.grow(graph.nodeCount);
        edges.grow(graph.edgeCount);
        runPass({ compiled: compileVisibility(graph, rule, window, passSources(graph)), edges, graph, nodes });

        return Object.freeze({ nodes: nodes.size, edges: edges.size });
    };

    /**
     * Whether a window reads records, kept while the index stands: asking scans every record of a
     * kind the field does not time, and any change to the data drops the index.
     * @param graph - The snapshot.
     * @param window - The window.
     * @param instants - The designated field's index.
     * @returns True when an index alone cannot say what the window keeps.
     */
    const readsRecords = (graph: GraphSnapshot, window: TimeWindow, instants: SlideTarget["instants"]): boolean => {
        const key = [graph, window.attribute, window.end, window.spells, instants?.node, instants?.edge];
        if (recordsRead === null || !sameInputs(recordsRead.key, key)) {
            recordsRead = { key, reads: windowReadsRecords(graph, window, sources) };
        }

        return recordsRead.reads;
    };

    /**
     * What a slide moves.
     * @param graph - The snapshot.
     * @param rule - The filter's rule.
     * @param nodes - The node mask.
     * @param edges - The edge mask.
     * @param instants - The designated field's index.
     * @param evaluateWindow - Write the masks in one full pass.
     * @returns The target.
     */
    const slideTarget = (
        graph: GraphSnapshot,
        rule: RuleTree | null,
        nodes: ElementMask<NodeId>,
        edges: ElementMask<EdgeId>,
        instants: SlideTarget["instants"],
        evaluateWindow: SlideTarget["evaluate"],
    ): SlideTarget => ({
        graph,
        filter: [dispatcher.state.visibility.filter, rule, graph, ...inputsFor(rule, null)],
        nodes,
        edges,
        filterBytes: () => filterBytesOf(graph),
        bounds: (moved) => windowBounds(moved, sources),
        evaluate: evaluateWindow,
        readsRecords: (moved) => readsRecords(graph, moved, instants),
        instants,
    });

    /**
     * Windows counted away from what is on screen, from the graph and the filter as they stand: by
     * the index alone when it says what a window keeps, else by a full pass over masks of their own.
     * The index is read at the first move and kept, so a graph that changes under a walk does not
     * reach it.
     * @returns The walk.
     */
    const openWalk = (): WindowWalk => {
        const active = upToDate();
        const { graph } = active;
        const rule = ruleNow();
        const nodes = new ElementMask<NodeId>(() => active.nodeSpace, Math.max(1, graph.nodeCount));
        const edges = new ElementMask<EdgeId>(() => active.edgeSpace, Math.max(1, graph.edgeCount));
        nodes.grow(graph.nodeCount);
        edges.grow(graph.edgeCount);
        const walker = new WindowSlider();
        let target: SlideTarget | null = null;
        let counter: WindowCounter | null | undefined;

        return {
            directed: graph.directed,
            move(window) {
                target ??= slideTarget(graph, rule, nodes, edges, windowInstants(window, sources), (moved) => {
                    slideCounters.full++;
                    nodes.clear();
                    edges.clear();
                    const compiled = compileVisibility(graph, rule, moved, passSources(graph));
                    runPass({ compiled, edges, graph, nodes });
                });
                counter = counter === undefined ? WindowCounter.open(target, window) : counter;
                if (counter !== null) {
                    return counter.move(window, target);
                }

                const { entered, left } = walker.move(target, window);

                return {
                    visible: Object.freeze({ nodes: nodes.size, edges: edges.size }),
                    entered: Object.freeze({ nodes: entered.nodes, edges: entered.edges }),
                    left: Object.freeze({ nodes: left.nodes, edges: left.edges }),
                };
            },
        };
    };

    /**
     * An edit's run is never queued: the command is dispatched as the run starts.
     * @param label - What to call it.
     * @returns The surroundings a run asks of whoever holds it.
     */
    const surroundingsFor = (label: string): RunSurroundings => ({
        label: () => label,
        // A visibility edit is not one of the runs a consumer browses: it holds no result to rank
        // and nothing binds a style layer to it, so it never takes a place in the runs list.
        queuePosition: () => null,
        // Never stale: the masks are brought up to date whenever the graph moves, so an edit's
        // counts cannot go on describing a graph that has changed underneath them.
        stale: () => null,
        resolveScope: () => wholeGraphScope(),
        enqueue: (body: RunBody): RunTicket => {
            void body(IMMEDIATE);

            return NO_TICKET;
        },
    });

    /**
     * What every run here shares.
     * @param algorithm - Its name.
     * @param params - What it was asked for.
     * @param caveats - What qualifies its numbers.
     * @returns The common part of its definition.
     */
    const factRun = (
        algorithm: string,
        params: Readonly<Record<string, unknown>>,
        caveats: Caveats,
    ): Omit<RunDefinition<never>, "execute"> => ({
        algorithm,
        caveats,
        engine,
        exact: null,
        fields: NO_FIELDS,
        id: deriveRunId({ algorithm, exact: null, params, sample: null, scope: WHOLE_GRAPH, seed: null }),
        params,
        sample: null,
        seed: null,
        // "fact" rather than "node-set": an edit publishes two counts about the graph, not a set of
        // elements to paint. Calling it a node-set would make it eligible to become an exclusive
        // highlight layer, and hiding something is not highlighting it.
        shape: "fact",
        style: false,
        timeBoxMs: null,
    });

    /**
     * Make one edit: dispatch its command, which records the value at once, and hand back a run
     * that settles once the pass evaluating the masks has run.
     * @param command - The command.
     * @param filter - The filter the edit leaves in force.
     * @param window - The window the edit leaves in force.
     * @param options - A signal, and a progress handler.
     * @param then - What else the run resolves with, and what to do once the command is recorded.
     * @param then.extra - Merged into the run's result.
     * @param then.after - Called once the command is recorded, before the run settles.
     * @returns The run.
     * @throws A `GraphtyError` when a dry run was asked for.
     */
    const edit = <TExtra extends object = object>(
        command: VisibilityCommand,
        filter: RuleTree | null,
        window: TimeWindow | null,
        options: RunOptions,
        then: { readonly extra?: TExtra; readonly after?: () => void } = {},
    ): Run<FilterResult & TExtra> => {
        if (options.dryRun === true) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message:
                    "A visibility edit cannot be a dry run. Ask what a filter would leave showing " +
                    'with plan({ op: "visibility.set", filter }), which performs nothing.',
                source: "data",
                details: { op: command.op },
            });
        }

        const label = labelFor(filter, window);
        const definition: RunDefinition<FilterResult & TExtra> = {
            ...factRun(VISIBILITY_ALGORITHM, Object.freeze({ filter, window }), caveatsFor(filter, window)),
            // A cancel settles the run with the edit applied rather than rejecting it.
            publishOnCancel: true,
            execute: async (context) => {
                await dispatcher.dispatch(command);
                then.after?.();
                context.report({ completed: 1, message: label, phase: "filtering", total: 1 });

                return { result: Object.freeze({ ...resultOf(), ...then.extra }) as FilterResult & TExtra };
            },
            // Only a signal that is already aborted is handed over: it refuses the edit before
            // anything is written. One aborted later has nothing left to stop.
            ...(options.signal?.aborted === true ? { signal: options.signal } : {}),
            ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
        };

        const run = new ManagedRun<FilterResult & TExtra>(definition, surroundingsFor(label));
        run.start();

        return run;
    };

    /**
     * A read-only copy of one live mask, made again only when the live one changes.
     * @param live - The live mask.
     * @returns The reader.
     */
    const copies = <TId>(live: ElementMask<TId>): (() => ElementMask<TId>) => {
        let held: { version: number; count: number; copy: ElementMask<TId> } | null = null;

        return () => {
            upToDate();
            if (held?.version !== live.version || held.count !== live.count) {
                held = { version: live.version, count: live.count, copy: live.readOnlyCopy() };
            }

            return held.copy;
        };
    };

    const visibleNodeCopy = copies(nodeMaskValue);
    const visibleEdgeCopy = copies(edgeMaskValue);
    const drawnNodeCopy = copies(drawnNodes);
    const drawnEdgeCopy = copies(drawnEdges);

    return {
        nodeMask(): Uint8Array {
            upToDate();

            return nodeMaskValue.bytes();
        },

        edgeMask(): Uint8Array {
            upToDate();

            return edgeMaskValue.bytes();
        },

        isVisible(id: NodeId | EdgeId): boolean {
            upToDate();
            const node = nodeMaskValue.indexOf(id);

            if (node !== INVALID_INDEX) {
                return nodeMaskValue.has(node);
            }

            // An edge id is text; the number it spells names the same edge.
            const edge = edgeMaskValue.indexOf(String(id));

            return edge !== INVALID_INDEX && edgeMaskValue.has(edge);
        },

        get nodes(): ReadonlySet<NodeId> {
            upToDate();
            const ids = nodeMaskValue.ids();

            if (cachedNodeSet === null || cachedNodeIds !== ids) {
                cachedNodeIds = ids;
                cachedNodeSet = sealedSet(ids, VISIBLE_HINT, otherIdSpelling);
            }

            return cachedNodeSet;
        },

        get edges(): ReadonlySet<EdgeId> {
            upToDate();
            const ids = edgeMaskValue.ids();

            if (cachedEdgeSet === null || cachedEdgeIds !== ids) {
                cachedEdgeIds = ids;
                cachedEdgeSet = sealedSet(ids, VISIBLE_HINT, otherIdSpelling);
            }

            return cachedEdgeSet;
        },

        get summary(): VisibilitySummary {
            return summaryOf();
        },

        summaryOf(source: SourceKey): VisibilitySummary {
            upToDate();
            const supplied = sources.supplied?.([source]);
            const count = <TId>(ids: Iterable<TId>, mask: ElementMask<TId>): [number, number] => {
                let total = 0;
                let visible = 0;
                for (const id of ids) {
                    const index = mask.indexOf(id);
                    if (index !== INVALID_INDEX) {
                        total++;
                        visible += mask.has(index) ? 1 : 0;
                    }
                }

                return [visible, total];
            };
            const [visibleNodes, totalNodes] = count(supplied?.nodes ?? [], nodeMaskValue);
            const [visibleEdges, totalEdges] = count(supplied?.edges ?? [], edgeMaskValue);
            return Object.freeze({ totalEdges, totalNodes, visibleEdges, visibleNodes });
        },

        get filter(): RuleTree | null {
            return dispatcher.state.visibility.filter;
        },

        get window(): TimeWindow | null {
            return dispatcher.state.visibility.window;
        },

        set(filter: RuleTree | null, options: RunOptions = {}): Run<FilterResult> {
            const admitted = filter === null || sources.admit === undefined ? filter : sources.admit(filter);
            assertVisibility(admitted, null, sources.dependencies);

            return edit(
                { op: "visibility.set", filter: admitted },
                combinedRule(admitted, dispatcher.state.visibility.conditions),
                dispatcher.state.visibility.window,
                options,
            );
        },

        setWindow(window: TimeWindow | null, options: RunOptions = {}): Run<FilterResult> {
            assertVisibility(null, window);
            if (sources.timeline?.() === false && windowNeedsTimeline(window)) {
                throw featureOff("timeline", "visibility.window");
            }

            return edit({ op: "visibility.window", window }, ruleNow(), window, options);
        },

        get steps(): readonly FilterStep[] {
            return stepsOf(dispatcher.state.visibility.conditions);
        },

        setSteps(steps: readonly FilterStep[], options: RunOptions = {}): Run<FilterResult> {
            const admitted = admitSteps(steps);
            const conditions = conditionsOfSteps(admitted, conditionsNow());
            const after = followSelection(conditions);
            editedBy = "steps";

            return edit(
                { op: "visibility.steps", steps: admitted },
                combinedRule(dispatcher.state.visibility.filter, conditions),
                dispatcher.state.visibility.window,
                options,
                { after },
            );
        },

        get conditions(): readonly FilterCondition[] {
            return conditionsNow();
        },

        setConditions(conditions: readonly FilterConditionInput[], options: RunOptions = {}): Run<FilterResult> {
            return editConditions(admitConditions(conditions), options);
        },

        addCondition(
            condition: FilterConditionInput,
            options: RunOptions = {},
        ): Run<FilterResult & { readonly id: string }> {
            const [added] = admitConditions([condition], conditionsNow());
            return editConditions(admitConditions([...conditionsNow(), added]), options, { id: added.id });
        },

        updateCondition(
            id: string,
            change: Partial<Omit<FilterCondition, "id">>,
            options: RunOptions = {},
        ): Run<FilterResult> {
            const list = conditionsNow();
            const at = indexOfCondition(list, id);
            const merged = { ...list[at], ...change, id };
            return editConditions(
                admitConditions(list.map((each, index) => (index === at ? conditionOf(merged, merged.rule) : each))),
                options,
            );
        },

        removeCondition(id: string, options: RunOptions = {}): Run<FilterResult> {
            const list = conditionsNow();
            const at = indexOfCondition(list, id);
            return editConditions(
                list.filter((_, index) => index !== at),
                options,
            );
        },

        conditionCounts(): readonly FilterConditionCount[] {
            return countsNow();
        },

        openDrafts(): readonly FilterCondition[] {
            return [...drafts].map((each) => each.condition);
        },

        draft(target: FilterConditionInput | string): FilterDraft {
            const list = conditionsNow();
            const editing = typeof target === "string";
            // An existing condition is read live and the draft holds only its edits, so a write that
            // lands meanwhile (a rename, its on box) is kept by the commit; a new one is admitted now,
            // which fixes its id.
            const base: FilterCondition | null = editing ? null : admitConditions([target], list)[0];
            const id = editing ? list[indexOfCondition(list, target)].id : (base?.id ?? "");
            let edits: Partial<Omit<FilterCondition, "id">> = {};
            let open = true;
            const held = (): FilterCondition => {
                const now = conditionsNow();
                const from = base ?? now[indexOfCondition(now, id)];
                return Object.freeze({ ...from, ...edits, id });
            };
            const requireOpen = (): void => {
                if (!open) {
                    throw new GraphtyError({
                        code: "E_BAD_COMMAND",
                        message: `the draft of filter condition "${id}" is closed`,
                        source: "data",
                    });
                }
            };
            const made: FilterDraft = {
                get condition(): FilterCondition {
                    return held();
                },
                get open(): boolean {
                    return open;
                },
                update(change: Partial<Omit<FilterCondition, "id">>): void {
                    requireOpen();
                    edits = { ...edits, ...change };
                },
                counts(): FilterConditionCount {
                    return Object.freeze({ id, ...countRule(upToDate(), held().rule, null) });
                },
                commit(options: RunOptions = {}): Run<FilterResult & { readonly id: string }> {
                    requireOpen();
                    open = false;
                    drafts.delete(made);
                    // One step, as `updateCondition` or `addCondition` writes it, against the
                    // conditions as they stand now.
                    const now = conditionsNow();
                    const condition = held();
                    if (editing) {
                        const at = indexOfCondition(now, id);
                        const next = now.map((each, index) =>
                            index === at ? conditionOf(condition, condition.rule) : each,
                        );
                        return editConditions(admitConditions(next), options, { id });
                    }

                    const [added] = admitConditions([condition], now);
                    return editConditions(admitConditions([...now, added]), options, { id: added.id });
                },
                cancel(): void {
                    open = false;
                    drafts.delete(made);
                },
            };
            drafts.add(made);
            return made;
        },

        restoreConditions(conditions: readonly FilterCondition[]): Run<FilterResult> {
            const admitted = admitConditions(conditions);
            return edit(
                { op: "visibility.conditions", conditions: admitted },
                combinedRule(dispatcher.state.visibility.filter, admitted),
                dispatcher.state.visibility.window,
                {},
            );
        },

        restoreWindow(window: TimeWindow, raw: boolean): Run<FilterResult> {
            assertVisibility(null, window);
            savedInstants = raw ? null : JSON.stringify(window);

            return edit({ op: "visibility.window", window }, ruleNow(), window, {});
        },

        restorePlayback(playback: TimePlayback | null): Promise<unknown> {
            return dispatcher.dispatch({ op: "visibility.playback", playback });
        },

        holdsInstants,

        get rule(): RuleTree | null {
            return ruleNow();
        },

        commitWindow(window: TimeWindow): Run<FilterResult> {
            assertVisibility(null, window);

            return edit({ op: "visibility.window", window, ownStep: true }, ruleNow(), window, {});
        },

        slideWindow(window: TimeWindow | null): SlideCounts | null {
            if (window === null) {
                if (slid) {
                    sync();
                }

                return null;
            }

            assertVisibility(null, window);
            const active = upToDate();
            const rule = ruleNow();
            slid = true;
            slidTo = {
                token: dispatcher.state.graph.token,
                filter: rule,
                window,
                inputs: inputsFor(rule, window),
                snapshot: active.graph,
            };

            const startedAt = performance.now();
            const instants = windowInstants(window, sources);
            let passed = false;
            const counts = slider.move(
                slideTarget(active.graph, rule, nodeMaskValue, edgeMaskValue, instants, (moved) => {
                    passed = true;
                    evaluate(active.graph, rule, moved);
                }),
                window,
            );
            lastDurationMs = Math.round(performance.now() - startedAt);
            if (!passed) {
                unresolvedValue = unresolvedOfSlide(window, instants);
            }

            sources.onSlide?.(counts);

            return { ...counts, graph: active.graph };
        },

        windowRun<T>(
            algorithm: string,
            params: Readonly<Record<string, unknown>>,
            options: Pick<RunOptions, "signal" | "onProgress">,
            work: (open: () => WindowWalk, context: RunExecutionContext) => Promise<T>,
        ): Run<T> {
            const definition: RunDefinition<T> = {
                ...factRun(algorithm, Object.freeze(params), caveatsFor(ruleNow(), null)),
                execute: async (context) => ({ result: await work(openWalk, context) }),
                ...(options.signal === undefined ? {} : { signal: options.signal }),
                ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
            };
            const run = new ManagedRun<T>(definition, surroundingsFor(algorithm));
            run.start();

            return run;
        },

        filterBytes(): FilterBytes {
            return filterBytesOf(upToDate().graph);
        },

        passingBytes(): FilterBytes {
            const active = upToDate();
            const rule = ruleNow();
            if (rule === null) {
                return NOTHING_FILTERED;
            }

            // With no window the masks hold exactly this, as long as their pass has run.
            if (!slid && shown?.window === null && shown.filter === rule) {
                return { nodes: nodeMaskValue.bytes(), edges: edgeMaskValue.bytes() };
            }

            return passingOf(active.graph);
        },

        previewSteps(steps: readonly FilterStep[]): StepCounts {
            const admitted = admitSteps(steps);
            const active = upToDate();
            const { filter, window } = dispatcher.state.visibility;
            const rules: RuleTree[] = filter === null ? [] : [filter];
            const start = countOf(active, filter, window);

            return Object.freeze({
                start,
                steps: Object.freeze(
                    admitted
                        .filter((step) => step.on)
                        .map((step) => {
                            rules.push(step.rule);
                            const rule: RuleTree = rules.length === 1 ? rules[0] : { kind: "all", of: [...rules] };

                            return Object.freeze({ id: step.id, ...countOf(active, rule, window) });
                        }),
                ),
            });
        },

        get showContext(): boolean {
            return dispatcher.state.visibility.showContext;
        },

        set showContext(value: boolean) {
            if (dispatcher.state.visibility.showContext !== value) {
                void dispatcher.dispatch({ op: "visibility.context", show: value });
            }
        },

        masks: {
            nodes: visibleNodeCopy,
            edges: visibleEdgeCopy,
        },

        get ghosting(): boolean {
            return ghostingNow();
        },

        drawnMasks: {
            nodes: () => {
                if (!ghostingNow()) {
                    return visibleNodeCopy();
                }

                drawnUpToDate();
                return drawnNodeCopy();
            },
            edges: () => {
                if (!ghostingNow()) {
                    return visibleEdgeCopy();
                }

                drawnUpToDate();
                return drawnEdgeCopy();
            },
        },

        ghosts() {
            return ghostsNow();
        },

        ghosted(target: "node" | "edge", index: number): boolean {
            const ghosts = ghostsNow();
            return ghosts !== null && ghosts[target][index] === 1;
        },

        hold(id: string | null, all = false): void {
            if (held === id && heldAll === (id !== null && all)) {
                return;
            }

            held = id;
            heldAll = id !== null && all;
            sources.onSlide?.();
        },
    };
}
