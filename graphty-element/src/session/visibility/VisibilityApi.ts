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

import { type GraphSnapshot, INVALID_INDEX, type U8 } from "@graphty/graph-format";

import type { EdgeId, FieldDescriptor, NodeId, Path, Scope } from "../../catalog/types";
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
    edgeSpaceOf,
    ElementMask,
    type MaskIdSpace,
    membershipDigest,
    nodeSpaceOf,
    type ScopeVisibilitySource,
} from "../scope/index";
// The explicit `/index` matters: `src/session/scope.ts` still exists beside the directory and
// wins a bare `../scope`. It goes when the resolver behind it is retired.
import type { HistoryCause } from "../types";
import {
    assertEvaluable,
    assertVisibility,
    compileVisibility,
    type Filter,
    type FilterSources,
    runPass,
    type TimeWindow,
} from "./filter";

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
     * membership should call {@link VisibilityApi.isVisible}, which allocates nothing.
     */
    readonly nodes: ReadonlySet<NodeId>;
    /** The visible edge ids, on the same terms as {@link VisibilityApi.nodes}. */
    readonly edges: ReadonlySet<EdgeId>;
    /** How much of the graph is showing. */
    readonly summary: VisibilitySummary;
    /** The filter in force, or null when no filter is hiding anything. */
    readonly filter: Filter | null;
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
    set(filter: Filter | null, options?: RunOptions): Run<FilterResult>;
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
    readonly filter: Filter | null;
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

/**
 * A set that cannot be written to.
 *
 * `Object.freeze` alone does NOT stop `Set.prototype.add`: a frozen set that silently accepts an
 * `add()` would hand a consumer a mutation the visibility model never saw and would go on
 * answering as though the element were hidden. So the three mutators are replaced on the instance
 * before it is frozen, and a caller that reaches for one is told rather than ignored.
 * @param values - The ids to put in it.
 * @returns The sealed set.
 */
function sealedSet<TId>(values: readonly TId[]): ReadonlySet<TId> {
    const set = new Set<TId>(values);

    for (const verb of ["add", "delete", "clear"] as const) {
        Object.defineProperty(set, verb, {
            configurable: false,
            enumerable: false,
            writable: false,
            value: (): never => {
                throw new GraphtyError({
                    code: "E_READONLY",
                    message:
                        `The visible ids are a materialisation of the visibility mask, so "${verb}" ` +
                        "on them would change nothing. Call visibility.set() to change what is visible.",
                    source: "data",
                    details: { verb },
                });
            },
        });
    }

    return Object.freeze(set);
}

/**
 * What to call an edit, on its run.
 * @param filter - The filter it leaves in force, or null.
 * @param window - The window it leaves in force, or null.
 * @returns The label.
 */
function labelFor(filter: Filter | null, window: TimeWindow | null): string {
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
function caveatsFor(filter: Filter | null, window: TimeWindow | null): Caveats {
    const caveats: Caveats = {
        direction: "as-loaded",
        exact: true,
        filterScope: filter !== null,
        method: "mask",
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
 */
function kindOf(was: VisibilityState, now: VisibilityState, otherwise: string): string {
    if (was.filter !== now.filter) {
        return now.filter?.kind ?? "none";
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
    /**
     * What the live pair holds, the step whose after-masks those are, and the snapshot they were
     * written against: a new snapshot has new rows to size the masks to, even for an equal tag.
     */
    let shown: (MaskTag & { readonly step: string | null; readonly snapshot: GraphSnapshot }) | null = null;
    let unresolvedValue: readonly Path[] = NO_PATHS;
    /** What the last pass changed, and how long its walk took: what an announcement reports. */
    let lastKind = "none";
    let lastDurationMs = 0;

    /**
     * The frame to answer from, rebuilt when the snapshot moves.
     * @returns The current frame.
     */
    const currentFrame = (): VisibilityFrame => {
        const graph = sources.snapshot();

        if (frame === null || frame.graph !== graph) {
            frame = { graph, nodeSpace: nodeSpaceOf(graph), edgeSpace: edgeSpaceOf(graph) };
        }

        return frame;
    };

    // The spaces are read through the live frame rather than captured, so one mask object spans
    // every snapshot this session ever holds and its id cache still notices when the ids move.
    const nodeMaskValue = new ElementMask<NodeId>(() => currentFrame().nodeSpace, 1);
    const edgeMaskValue = new ElementMask<EdgeId>(() => currentFrame().edgeSpace, 1);

    let cachedNodeIds: readonly NodeId[] | null = null;
    let cachedNodeSet: ReadonlySet<NodeId> | null = null;
    let cachedEdgeIds: readonly EdgeId[] | null = null;
    let cachedEdgeSet: ReadonlySet<EdgeId> | null = null;
    let cachedSummary: VisibilitySummary | null = null;
    let cachedSummaryKey = "";
    let cachedScope: ResolvedScope | null = null;
    let cachedScopeGraph: GraphSnapshot | null = null;

    /**
     * Write the whole membership into the masks from a filter and a window.
     * @param graph - The snapshot to evaluate against.
     * @param filter - The filter, or null.
     * @param window - The window, or null.
     */
    const evaluate = (graph: GraphSnapshot, filter: Filter | null, window: TimeWindow | null): void => {
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

        const compiled = compileVisibility(graph, filter, window, sources);
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
    const inputsFor = (filter: Filter | null, window: TimeWindow | null): readonly unknown[] =>
        // ponytail: every entry rather than the ones the filter's paths name, so any run change
        // re-evaluates a filter; name the read runs if that ever costs a pass that matters.
        filter === null && window === null ? NO_INPUTS : [...dispatcher.state.runs.values()];

    /**
     * The tag of the masks the slice and the graph call for now.
     * @returns The tag.
     */
    const wantedTag = (): MaskTag => {
        const { filter, window } = dispatcher.state.visibility;

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
        if (shown !== null && shown.snapshot === active.graph && sameTag(shown, tag)) {
            return active;
        }

        const step = ownerStep();
        if (shown !== null && shown.step !== null && shown.step !== step) {
            keepCopy({ ...shown, step: shown.step });
        }

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

        const active = currentFrame();

        if (cachedScope !== null && cachedScopeGraph === active.graph) {
            return cachedScope;
        }

        const nodeIds: NodeId[] = [];
        const edgeIds: EdgeId[] = [];

        for (let index = 0; index < active.graph.nodeCount; index++) {
            nodeIds.push(active.nodeSpace.idOf(index));
        }

        for (let index = 0; index < active.graph.edgeCount; index++) {
            edgeIds.push(active.edgeSpace.idOf(index));
        }

        cachedScopeGraph = active.graph;
        cachedScope = Object.freeze({
            digest: membershipDigest(nodeIds, edgeIds),
            edgeCount: edgeIds.length,
            edges: new Set(edgeIds),
            nodeCount: nodeIds.length,
            nodes: new Set(nodeIds),
            resolvedAt: new Date().toISOString(),
            spec: WHOLE_GRAPH,
        });

        return cachedScope;
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
        lastKind = kindOf(rendered.visibility, target.visibility, lastKind);
        sync();
    });

    // Told once the pass deriving a change has run: one call per edit, one per step passed.
    const previousDerived = dispatcher.events.derived;
    dispatcher.events.derived = (change) => {
        previousDerived?.(change);
        if (change.slices.includes("visibility")) {
            sources.onChange?.({ ...resultOf(), filterKind: lastKind, cause: change.cause });
        }
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
     * @returns The run.
     * @throws A `GraphtyError` when a dry run was asked for.
     */
    const edit = (
        command: VisibilityCommand,
        filter: Filter | null,
        window: TimeWindow | null,
        options: RunOptions,
    ): Run<FilterResult> => {
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
        const definition: RunDefinition<FilterResult> = {
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
                context.report({ completed: 1, message: label, phase: "filtering", total: 1 });

                return { result: resultOf() };
            },
            // Only a signal that is already aborted is handed over: it refuses the edit before
            // anything is written. One aborted later has nothing left to stop.
            ...(options.signal?.aborted === true ? { signal: options.signal } : {}),
            ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
        };

        const run = new ManagedRun<FilterResult>(definition, surroundingsFor(label));
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

            if (typeof id !== "string") {
                return false;
            }

            const edge = edgeMaskValue.indexOf(id);

            return edge !== INVALID_INDEX && edgeMaskValue.has(edge);
        },

        get nodes(): ReadonlySet<NodeId> {
            upToDate();
            const ids = nodeMaskValue.ids();

            if (cachedNodeSet === null || cachedNodeIds !== ids) {
                cachedNodeIds = ids;
                cachedNodeSet = sealedSet(ids);
            }

            return cachedNodeSet;
        },

        get edges(): ReadonlySet<EdgeId> {
            upToDate();
            const ids = edgeMaskValue.ids();

            if (cachedEdgeSet === null || cachedEdgeIds !== ids) {
                cachedEdgeIds = ids;
                cachedEdgeSet = sealedSet(ids);
            }

            return cachedEdgeSet;
        },

        get summary(): VisibilitySummary {
            return summaryOf();
        },

        get filter(): Filter | null {
            return dispatcher.state.visibility.filter;
        },

        get window(): TimeWindow | null {
            return dispatcher.state.visibility.window;
        },

        set(filter: Filter | null, options: RunOptions = {}): Run<FilterResult> {
            assertVisibility(filter, null);

            return edit({ op: "visibility.set", filter }, filter, dispatcher.state.visibility.window, options);
        },

        setWindow(window: TimeWindow | null, options: RunOptions = {}): Run<FilterResult> {
            assertVisibility(null, window);

            return edit({ op: "visibility.window", window }, dispatcher.state.visibility.filter, window, options);
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
            nodes: copies(nodeMaskValue),
            edges: copies(edgeMaskValue),
        },
    };
}
