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
import { assertConditions, combinedRule, conditionsOfSteps, selectRule, stepsOf, wellFormed } from "./conditions";
import {
    assertEvaluable,
    assertVisibility,
    type CompiledVisibility,
    compileVisibility,
    type FilterSources,
    type RuleTree,
    runPass,
    type ScopeLeaf,
    type TimeWindow,
} from "./filter";
import { type SlideCounts, WindowSlider } from "./slide";
import { assertSteps } from "./steps";

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
 * @since 3.32.0
 */
export interface FilterConditionMatches {
    /** How many the rule matches over the whole graph. */
    readonly matched: number;
    /** How many the graph holds. */
    readonly total: number;
}

/**
 * What one filter condition's rule matches, as written, over the whole graph: the same whatever
 * its effect, whether it is on, and whatever the other conditions are, so a condition that is off
 * still says what switching it on would match.
 * @since 3.32.0
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
     * edited, switched on or off, or removed), the selection becomes what every select condition
     * that is on matches, over the whole graph, replacing a selection the reader made; with none
     * on, nothing is selected. Opening a project never applies them; undo puts the selection
     * back.
     * @since 3.32.0
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
     * @since 3.32.0
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
     * @since 3.32.0
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
     * @since 3.32.0
     */
    updateCondition(id: string, change: Partial<Omit<FilterCondition, "id">>, options?: RunOptions): Run<FilterResult>;
    /**
     * Remove one filter condition: one undoable step.
     * @param id - The condition's id.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns The run, which resolves with the counts.
     * @throws A `GraphtyError` (`E_BAD_COMMAND`) when no condition has that id.
     * @since 3.32.0
     */
    removeCondition(id: string, options?: RunOptions): Run<FilterResult>;
    /**
     * What each condition's rule matches, in condition order: see {@link FilterConditionCount}.
     * Synchronous and kept per condition, so editing one condition counts that one again and no
     * other. Read again on `visibility:changed` or `history:changed`.
     * @returns The counts.
     * @since 3.32.0
     */
    conditionCounts(): readonly FilterConditionCount[];
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
     * Move the time window without recording it, writing only the rows whose membership changes:
     * the cursor `session.time` plays and drags. Recording the window afterwards (`setWindow`, or
     * a `visibility.window` command) evaluates it in full, which lands on the same masks.
     * @param window - The window to show, or null to put back the window the slice records.
     * @returns What came into view and went out of it; null when put back.
     */
    slideWindow(window: TimeWindow | null): SlideCounts | null;
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
    /** Told after the time cursor slid the masks, which no step records. */
    readonly onSlide?: () => void;
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
}

/** The selection as select conditions reach it. */
export interface ConditionSelection {
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

/** Nothing read besides the graph. */
const NO_INPUTS: readonly unknown[] = Object.freeze([]);

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
    let slid = false;

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
            return sources;
        }

        return {
            ...sources,
            scope: (spec): ScopeLeaf =>
                dependencies !== undefined && visibilityCycle({ kind: "member", of: spec }, dependencies) !== null
                    ? { nodes: makeMask(graph.nodeCount), edges: null }
                    : scope(spec),
        };
    };

    /**
     * Write the whole membership into the masks from a filter and a window.
     * @param graph - The snapshot to evaluate against.
     * @param filter - The filter, or null.
     * @param window - The window, or null.
     */
    const evaluate = (graph: GraphSnapshot, filter: RuleTree | null, window: TimeWindow | null): void => {
        nodeMaskValue.grow(graph.nodeCount);
        edgeMaskValue.grow(graph.edgeCount);
        nodeMaskValue.clear();
        edgeMaskValue.clear();

        if (filter === null && window === null) {
            nodeMaskValue.fill();
            edgeMaskValue.fill();
            unresolvedValue = NO_PATHS;

            return;
        }

        const compiled = compileVisibility(graph, filter, window, passSources(graph));
        runPass({ compiled, edges: edgeMaskValue, graph, nodes: nodeMaskValue });
        unresolvedValue = compiled.unresolvedPaths();
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

        slid = false;

        const kept = step === null ? undefined : (history.cacheOf(step) as MaskCopy | undefined);
        if (kept !== undefined && sameTag(kept.tag, tag)) {
            nodeMaskValue.load(kept.nodes);
            edgeMaskValue.load(kept.edges);
            unresolvedValue = kept.unresolved;
        } else {
            const startedAt = performance.now();
            evaluate(active.graph, tag.filter, tag.window);
            lastDurationMs = Math.round(performance.now() - startedAt);
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
    const ghostingNow = (): boolean =>
        dispatcher.state.visibility.playback?.outside === "ghost" &&
        (dispatcher.state.visibility.window !== null || slid);

    /**
     * Bring the drawn masks up to date: what the filter keeps with no window.
     * @returns The frame.
     */
    const drawnUpToDate = (): VisibilityFrame => {
        const active = upToDate();
        const filter = ruleNow();
        const inputs = inputsFor(filter, null);
        if (drawnTag?.graph === active.graph && drawnTag.filter === filter && sameInputs(drawnTag.inputs, inputs)) {
            return active;
        }

        drawnNodes.grow(active.graph.nodeCount);
        drawnEdges.grow(active.graph.edgeCount);
        drawnNodes.clear();
        drawnEdges.clear();
        if (filter === null) {
            drawnNodes.fill();
            drawnEdges.fill();
        } else {
            const compiled = compileVisibility(active.graph, filter, null, passSources(active.graph));
            runPass({ compiled, edges: drawnEdges, graph: active.graph, nodes: drawnNodes });
        }

        drawnTag = { graph: active.graph, filter, inputs };

        return active;
    };

    let ghostCache: { readonly key: readonly unknown[]; readonly node: Uint8Array; readonly edge: Uint8Array } | null =
        null;

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
            state.runs,
            sources.snapshot(),
        ];
        if (ghostCache?.key.length === key.length && ghostCache.key.every((part, at) => part === key[at])) {
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
        followSelectHistory(was.conditions, now.conditions);
        sync();
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
            assertVisibility(rule, null, sources.dependencies);
            return Object.freeze({ id: shaped.id, on: shaped.on, effect: shaped.effect, rule });
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
     * The ids a select rule matches, over the whole graph; a kind it says nothing of has none.
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

        const active = upToDate();
        const compiled = compiledOver(active, rule);
        const nodes: NodeId[] = [];
        const edges: EdgeId[] = [];
        const { node, edge } = compiled;
        for (let at = 0; node !== null && at < active.graph.nodeCount; at++) {
            if (node(at)) {
                nodes.push(active.nodeSpace.idOf(at));
            }
        }

        for (let at = 0; edge !== null && at < active.graph.edgeCount; at++) {
            if (edge(at)) {
                edges.push(active.edgeSpace.idOf(at));
            }
        }

        return { nodes, edges };
    };

    /**
     * What the select conditions that are on say, by value: equal keys select the same.
     * @param conditions - The conditions.
     * @returns The key.
     */
    const selectKey = (conditions: readonly FilterCondition[]): string => JSON.stringify(selectRule(conditions));

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
     * Record a conditions list: one step; when its select conditions differ from the ones in
     * force, the selection becomes what they match, and the selection it replaced is kept for
     * undo.
     * @param conditions - The admitted conditions.
     * @param options - A signal, and a progress handler.
     * @param extra - What else the run resolves with.
     * @returns The run.
     */
    const editConditions = <TExtra extends object = object>(
        conditions: readonly FilterCondition[],
        options: RunOptions,
        extra?: TExtra,
    ): Run<FilterResult & TExtra> => {
        const { selection } = sources;
        const selects = selection !== undefined && selectKey(conditionsNow()) !== selectKey(conditions);
        const before = selects ? selection.current() : null;
        const base = conditionsNow();
        editedBy = "conditions";

        return edit(
            { op: "visibility.conditions", conditions },
            combinedRule(dispatcher.state.visibility.filter, conditions),
            dispatcher.state.visibility.window,
            options,
            {
                ...(extra === undefined ? {} : { extra }),
                after: () => {
                    if (before === null || selection === undefined) {
                        return;
                    }

                    const recorded = conditionsNow();
                    selectionBefore.set(recorded, before);
                    selectionWhile.set(base, before);
                    selectFollowed = recorded;
                    selection.replace(selectedBy(recorded), "command");
                },
            },
        );
    };

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
     * What one rule matches, as written, over the whole graph.
     * @param active - The frame.
     * @param rule - The rule.
     * @returns The count, without an id.
     */
    const countRule = (active: VisibilityFrame, rule: RuleTree): Omit<FilterConditionCount, "id"> => {
        const compiled = compiledOver(active, rule);
        const tally = (test: ((index: number) => boolean) | null, total: number): FilterConditionMatches | null => {
            if (test === null) {
                return null;
            }

            let matched = 0;
            for (let at = 0; at < total; at++) {
                matched += test(at) ? 1 : 0;
            }

            return Object.freeze({ matched, total });
        };
        const nodes = tally(compiled.node, active.graph.nodeCount);
        const edges = tally(compiled.edge, active.graph.edgeCount);

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
        const each = conditions.map((condition) => signatureOf(condition.rule));
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
                let count = key === null ? undefined : bucket.byRule.get(key);
                count ??= Object.freeze({ id: condition.id, ...countRule(active, condition.rule) });

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
        const params = Object.freeze({ filter, window });
        const definition: RunDefinition<FilterResult & TExtra> = {
            algorithm: VISIBILITY_ALGORITHM,
            caveats: caveatsFor(filter, window),
            engine,
            exact: null,
            fields: NO_FIELDS,
            id: deriveRunId({
                algorithm: VISIBILITY_ALGORITHM,
                exact: null,
                params,
                sample: null,
                scope: WHOLE_GRAPH,
                seed: null,
            }),
            params,
            sample: null,
            seed: null,
            // "fact" rather than "node-set": an edit publishes two counts about the graph, not a
            // set of elements to paint. Calling it a node-set would make it eligible to become an
            // exclusive highlight layer, and hiding something is not highlighting it.
            shape: "fact",
            style: false,
            timeBoxMs: null,
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

            return edit({ op: "visibility.window", window }, ruleNow(), window, options);
        },

        get steps(): readonly FilterStep[] {
            return stepsOf(dispatcher.state.visibility.conditions);
        },

        setSteps(steps: readonly FilterStep[], options: RunOptions = {}): Run<FilterResult> {
            const admitted = admitSteps(steps);
            editedBy = "steps";

            return edit(
                { op: "visibility.steps", steps: admitted },
                combinedRule(dispatcher.state.visibility.filter, conditionsOfSteps(admitted, conditionsNow())),
                dispatcher.state.visibility.window,
                options,
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
            const { on, effect, rule } = { ...list[at], ...change };
            return editConditions(
                admitConditions(list.map((each, index) => (index === at ? { id, on, effect, rule } : each))),
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

        restoreConditions(conditions: readonly FilterCondition[]): Run<FilterResult> {
            const admitted = admitConditions(conditions);
            return edit(
                { op: "visibility.conditions", conditions: admitted },
                combinedRule(dispatcher.state.visibility.filter, admitted),
                dispatcher.state.visibility.window,
                {},
            );
        },

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

            const active = upToDate();
            const { filter } = dispatcher.state.visibility;
            const rule = ruleNow();
            slid = true;

            const counts = slider.move(
                {
                    graph: active.graph,
                    filter: [filter, rule, active.graph],
                    nodes: nodeMaskValue,
                    edges: edgeMaskValue,
                    compileFilter: () => compileVisibility(active.graph, rule, null, passSources(active.graph)),
                    evaluate: (moved) => {
                        evaluate(active.graph, rule, moved);
                    },
                    instants: sources.instants?.(window.attribute) ?? null,
                },
                window,
            );
            sources.onSlide?.();

            return counts;
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
    };
}
