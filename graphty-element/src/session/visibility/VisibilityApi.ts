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
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type GraphSnapshot, INVALID_INDEX, makeMask } from "@graphty/graph-format";

import type { EdgeId, FieldDescriptor, NodeId, Path, Scope } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import {
    type Caveats,
    createLocalRunQueue,
    deriveRunId,
    ENGINE_VERSIONS,
    type EngineVersions,
    ManagedRun,
    type ResolvedScope,
    type Run,
    type RunBody,
    type RunDefinition,
    type RunOptions,
    type RunQueue,
    type RunSurroundings,
    type RunTicket,
} from "../runs";
// The explicit `/index` matters: `src/session/scope.ts` still exists beside the directory and
// wins a bare `../scope`. It goes when the resolver behind it is retired.
import {
    createScopeApi,
    edgeSpaceOf,
    ElementMask,
    type MaskIdSpace,
    nodeSpaceOf,
    type ScopeResolver,
    type ScopeVisibilitySource,
} from "../scope/index";
import { type DependencySources, visibilityCycle } from "../sets/dependencies";
import type { SetWatch } from "../sets/notify";
import {
    assertVisibility,
    compileVisibility,
    type FilterSources,
    type RuleTree,
    runPass,
    runPassInSlices,
    type ScopeLeaf,
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
    readonly filter: RuleTree | null;
    /** The time window in force, or null when no window is hiding anything. */
    readonly window: TimeWindow | null;
    /**
     * Apply a filter, or clear it with null.
     *
     * A `Run`, so a filter over a large graph reports progress and can be cancelled. Starting one
     * CANCELS whatever visibility pass is already in flight: dragging a slider must not leave
     * five walks queued behind each other, and only the latest instruction's answer matters. A
     * cancelled pass changes nothing at all -- the masks are written in one step at the end.
     *
     * The time window is untouched. The two compose.
     *
     * Of the run options, `signal` and `onProgress` are honoured; `queue` is not, because the
     * coalescing above decides the order instead, and `dryRun` is REFUSED rather than ignored --
     * `plan({ op: "visibility.set", filter })` is the call that answers "what would this leave
     * showing" without doing it.
     * @param filter - What to keep, or null to stop filtering.
     * @param options - A signal to cancel with, and a progress handler.
     * @returns The run, which resolves with the counts.
     * @throws A `GraphtyError` when the filter is malformed or needs something this session lacks.
     */
    set(filter: RuleTree | null, options?: RunOptions): Run<FilterResult>;
    /**
     * Apply a time window, or clear it with null.
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
     * outside every run's default scope, and still absent from `nodes`.
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
    /** The live masks, for the scope resolver. */
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
     * The queue a pass takes its turn in. Absent builds a sequential one of its own, which is
     * right for a headless session and wrong for a rendered graph -- a rendered graph hands in
     * the element's own operation queue so that a filter does not interleave with a load.
     */
    readonly queue?: RunQueue;
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
     * Called whenever what is visible changes, so a host can mirror it onto an event.
     *
     * One hook for every producer -- a filter, a window and the context flag all arrive here --
     * because a status bar reading "showing X of Y" has to update for all three and must not
     * learn about them in three different ways.
     * @param change - The counts, the unresolved paths, and what produced the change.
     */
    readonly onChange?: (change: VisibilityChange) => void;
    /** Called on every version bump of either mask, which is what advances the session input tick. */
    readonly onMaskVersion?: () => void;
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

/** The name a visibility pass runs under, which is also the command that performs it. */
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

/** A visibility pass publishes no per-element field: the mask is not a result bag. */
const NO_FIELDS: readonly FieldDescriptor[] = Object.freeze([]);

/** Nothing further qualifies a pass's numbers. */
const NO_NOTES: readonly string[] = Object.freeze([]);

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
 * What to call a pass, in the queue and on the run.
 * @param filter - The filter it applies, or null.
 * @param window - The window it applies, or null.
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
 * What qualifies a pass's numbers.
 * @param filter - The filter it applies, or null.
 * @param window - The window it applies, or null.
 * @returns The caveats.
 */
function caveatsFor(filter: RuleTree | null, window: TimeWindow | null): Caveats {
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
 * @param sources - The snapshot, the queue, and the capabilities a filter needs.
 * @returns The visibility model, including the masks the scope resolver reads.
 */
export function createVisibilityApi(sources: VisibilitySources): SessionVisibilityApi {
    const queue = sources.queue ?? createLocalRunQueue();
    const engine = sources.engine ?? ENGINE_VERSIONS;

    let frame: VisibilityFrame | null = null;
    let evaluated: GraphSnapshot | null = null;
    let filterValue: RuleTree | null = null;
    let windowValue: TimeWindow | null = null;
    let showContextValue = false;
    let unresolvedValue: readonly Path[] = NO_PATHS;
    let pending: ManagedRun<FilterResult> | null = null;

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
    const nodeMaskValue = new ElementMask<NodeId>(() => currentFrame().nodeSpace, 1, sources.onMaskVersion);
    const edgeMaskValue = new ElementMask<EdgeId>(() => currentFrame().edgeSpace, 1, sources.onMaskVersion);

    let cachedNodeIds: readonly NodeId[] | null = null;
    let cachedNodeSet: ReadonlySet<NodeId> | null = null;
    let cachedEdgeIds: readonly EdgeId[] | null = null;
    let cachedEdgeSet: ReadonlySet<EdgeId> | null = null;
    let cachedSummary: VisibilitySummary | null = null;
    let cachedSummaryKey = "";
    let fallbackScope: ScopeResolver | null = null;
    /** The signature of the named sets the masks were last evaluated under. */
    let evaluatedSignature: string | null = "";
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
     */
    const follow = (): void => {
        const { watch } = sources;
        if (watch === undefined) {
            return;
        }

        const scopes = filterScopes(filterValue);
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
     * Write the whole membership into the masks from the stored filter and window.
     * @param graph - The snapshot to evaluate against.
     */
    const evaluate = (graph: GraphSnapshot): void => {
        // Read before the compile, as the notifier reads a watch's signature before resolving it.
        evaluatedSignature = signatureOf(filterValue);
        // Compiled before the masks are cleared: nothing a compile reads may see them half-written.
        const compiled =
            filterValue === null && windowValue === null
                ? null
                : compileVisibility(graph, filterValue, windowValue, passSources(graph));
        nodeMaskValue.grow(graph.nodeCount);
        edgeMaskValue.grow(graph.edgeCount);
        nodeMaskValue.clear();
        edgeMaskValue.clear();

        if (compiled === null) {
            nodeMaskValue.fill();
            edgeMaskValue.fill();
            unresolvedValue = NO_PATHS;

            return;
        }

        runPass({ compiled, edges: edgeMaskValue, graph, nodes: nodeMaskValue });
        unresolvedValue = compiled.unresolvedPaths();
        follow();
    };

    /**
     * Make the masks describe the graph as it now stands, re-applying the stored filter when it
     * has moved.
     *
     * Synchronous, and deliberately so. Every reader here -- a status bar, the scope resolver, a
     * run about to resolve its scope -- needs the answer for the current graph, and none of them
     * can await. The walk is the same one a pass does, without the slicing.
     * @returns The frame the masks now describe.
     */
    const sync = (): VisibilityFrame => {
        const active = currentFrame();

        if (evaluated !== active.graph) {
            evaluated = active.graph;
            evaluate(active.graph);
        }

        return active;
    };

    /**
     * How much of the graph is showing, as one object per membership.
     * @returns The summary.
     */
    const summaryOf = (): VisibilitySummary => {
        const active = sync();
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
     * What a pass looked at, which is always the whole graph.
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
     * The counts, the unresolved paths and the duration, as a pass reports them.
     * @param durationMs - How long the pass took.
     * @returns The result.
     */
    const resultOf = (durationMs: number): FilterResult => {
        const summary = summaryOf();

        return Object.freeze({
            durationMs,
            total: Object.freeze({ edges: summary.totalEdges, nodes: summary.totalNodes }),
            unresolvedPaths: unresolvedValue,
            visible: Object.freeze({ edges: summary.visibleEdges, nodes: summary.visibleNodes }),
        });
    };

    /**
     * Tell whoever is listening that what is visible has changed.
     * @param result - The counts the change left behind.
     * @param filterKind - What produced the change.
     */
    const announce = (result: FilterResult, filterKind: string): void => {
        sources.onChange?.({ ...result, filterKind });
    };

    /**
     * Take a finished pass's answer, or throw it away when the graph moved under it.
     * @param against - The snapshot the pass walked.
     * @param scratchNodes - The node membership it computed.
     * @param scratchEdges - The edge membership it computed.
     * @param unresolved - The paths nothing answered.
     * @param signature - The signature of the named sets the pass compiled under.
     */
    const commit = (
        against: GraphSnapshot,
        scratchNodes: ElementMask<NodeId>,
        scratchEdges: ElementMask<EdgeId>,
        unresolved: readonly Path[],
        signature: string | null,
    ): void => {
        // A named set that moved while the pass was walking makes its answer out of date too.
        if (sources.snapshot() !== against || signature === null || signature !== signatureOf(filterValue)) {
            // The graph moved while the pass was walking it, so its answer describes a graph that
            // is gone. Re-walk the stored filter against what is actually there rather than
            // committing a membership indexed against elements that have been renumbered.
            evaluated = null;
            sync();

            return;
        }

        const active = currentFrame();
        nodeMaskValue.grow(active.graph.nodeCount);
        edgeMaskValue.grow(active.graph.edgeCount);
        nodeMaskValue.clear();
        nodeMaskValue.union(scratchNodes);
        edgeMaskValue.clear();
        edgeMaskValue.union(scratchEdges);
        unresolvedValue = unresolved;
        evaluated = active.graph;
        evaluatedSignature = signature;
        follow();
    };

    /**
     * Hand a pass's work to the queue.
     * @param label - What to call it in the queue's own events.
     * @returns The surroundings a run asks of whoever holds it.
     */
    const surroundingsFor = (label: string): RunSurroundings => ({
        label: () => label,
        // A visibility pass is not one of the runs a consumer browses: it holds no result to rank
        // and nothing binds a style layer to it, so it never takes a place in the runs list.
        queuePosition: () => null,
        // Never stale: the masks are re-evaluated whenever the graph moves, so a pass's counts
        // cannot go on describing a graph that has changed underneath them.
        stale: () => null,
        resolveScope: () => wholeGraphScope(),
        enqueue: (body: RunBody): RunTicket => {
            const id = queue.queueOperation("algorithm-run", body, { description: label });

            return {
                cancel: () => {
                    queue.cancelOperation(id);
                },
            };
        },
    });

    /**
     * Start a pass that applies one filter and one window.
     * @param nextFilter - The filter to apply, or null.
     * @param nextWindow - The window to apply, or null.
     * @param options - A signal to cancel with, and a progress handler.
     * @param filterKind - What produced this change, for the announcement.
     * @returns The run.
     * @throws A `GraphtyError` when either is malformed, or when a dry run was asked for.
     */
    const startPass = (
        nextFilter: RuleTree | null,
        nextWindow: TimeWindow | null,
        options: RunOptions,
        filterKind: string,
    ): Run<FilterResult> => {
        assertVisibility(nextFilter, nextWindow, sources.dependencies);

        if (options.dryRun === true) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message:
                    "A visibility pass cannot be a dry run. Ask what a filter would leave showing " +
                    'with plan({ op: "visibility.set", filter }), which performs nothing.',
                source: "data",
                details: { op: VISIBILITY_ALGORITHM },
            });
        }

        // Only the latest instruction's answer matters: a slider being dragged produces one pass
        // per frame, and every pass but the last is work nobody will ever look at.
        pending?.cancel("A newer visibility instruction replaced this one.");

        const label = labelFor(nextFilter, nextWindow);
        const params = Object.freeze({ filter: nextFilter, window: nextWindow });
        const definition: RunDefinition<FilterResult> = {
            algorithm: VISIBILITY_ALGORITHM,
            caveats: caveatsFor(nextFilter, nextWindow),
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
            // "fact" rather than "node-set": a pass publishes two counts about the graph, not a
            // set of elements to paint. Calling it a node-set would make it eligible to become an
            // exclusive highlight layer, and hiding something is not highlighting it.
            shape: "fact",
            style: false,
            timeBoxMs: null,
            execute: async (context) => {
                const startedAt = performance.now();
                const active = currentFrame();
                const signature = signatureOf(nextFilter);
                const compiled = compileVisibility(active.graph, nextFilter, nextWindow, passSources(active.graph));
                const scratchNodes = new ElementMask<NodeId>(
                    () => active.nodeSpace,
                    Math.max(1, active.graph.nodeCount),
                );
                const scratchEdges = new ElementMask<EdgeId>(
                    () => active.edgeSpace,
                    Math.max(1, active.graph.edgeCount),
                );
                scratchNodes.grow(active.graph.nodeCount);
                scratchEdges.grow(active.graph.edgeCount);

                await runPassInSlices(
                    { compiled, edges: scratchEdges, graph: active.graph, nodes: scratchNodes },
                    context.signal,
                    (completed, total) => {
                        context.report({ completed, message: label, phase: "filtering", total });
                    },
                );

                filterValue = nextFilter;
                windowValue = nextWindow;
                commit(active.graph, scratchNodes, scratchEdges, compiled.unresolvedPaths(), signature);

                const result = resultOf(Math.round(performance.now() - startedAt));
                announce(result, filterKind);

                return { result };
            },
            ...(options.signal === undefined ? {} : { signal: options.signal }),
            ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
        };

        const run = new ManagedRun<FilterResult>(definition, surroundingsFor(label));
        pending = run;
        run.start();

        return run;
    };

    // The filter follows the sets it names: when one moves, the masks are evaluated again and the
    // change announced. On the same snapshot that is synchronous, before any public event; after a
    // freeze it waits for the notifier's frame, unless a read re-evaluated it first.
    const filterWatch: SetWatch<boolean> = {
        signature: () => signatureOf(filterValue),
        resolve: (): boolean => {
            const graph = sources.snapshot();
            const signature = signatureOf(filterValue);
            if (evaluated === graph && signature !== null && signature === evaluatedSignature) {
                return false;
            }

            evaluated = currentFrame().graph;
            evaluate(graph);

            return true;
        },
        ready: (changed) => {
            if (changed) {
                announce(resultOf(0), filterValue?.kind ?? "none");
            }
        },
        cost: () => {
            const graph = sources.snapshot();

            return graph.nodeCount + graph.edgeCount;
        },
    };

    return {
        nodeMask(): Uint8Array {
            sync();

            return nodeMaskValue.bytes();
        },

        edgeMask(): Uint8Array {
            sync();

            return edgeMaskValue.bytes();
        },

        isVisible(id: NodeId | EdgeId): boolean {
            sync();
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
            sync();
            const ids = nodeMaskValue.ids();

            if (cachedNodeSet === null || cachedNodeIds !== ids) {
                cachedNodeIds = ids;
                cachedNodeSet = sealedSet(ids);
            }

            return cachedNodeSet;
        },

        get edges(): ReadonlySet<EdgeId> {
            sync();
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

        get filter(): RuleTree | null {
            return filterValue;
        },

        get window(): TimeWindow | null {
            return windowValue;
        },

        set(filter: RuleTree | null, options: RunOptions = {}): Run<FilterResult> {
            const admitted = filter === null || sources.admit === undefined ? filter : sources.admit(filter);
            return startPass(admitted, windowValue, options, admitted === null ? "none" : admitted.kind);
        },

        setWindow(window: TimeWindow | null, options: RunOptions = {}): Run<FilterResult> {
            return startPass(filterValue, window, options, window === null ? "none" : "window");
        },

        get showContext(): boolean {
            return showContextValue;
        },

        set showContext(value: boolean) {
            if (showContextValue === value) {
                return;
            }

            showContextValue = value;
            announce(resultOf(0), "context");
        },

        masks: {
            nodes: (): ElementMask<NodeId> => {
                sync();

                return nodeMaskValue;
            },
            edges: (): ElementMask<EdgeId> => {
                sync();

                return edgeMaskValue;
            },
        },
    };
}
