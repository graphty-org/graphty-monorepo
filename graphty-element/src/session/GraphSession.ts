/**
 * @file The session: a graph with no view attached.
 *
 * This is the object the rest of the element's model hangs off. It holds the graph data, the
 * coordinates, the style layers, the status, the catalogue, the configuration and what the
 * machine can do, and it holds none of the things two synchronised views of one dataset would
 * disagree about -- no camera, no canvas, no scene.
 *
 * Nothing here, and nothing it imports, reaches Babylon.js, Lit or the DOM. That is checkable
 * rather than aspirational: `test/packaging/node-safe-entries.test.ts` resolves the `./session`
 * entry point's import graph and fails if a renderer appears in it.
 */

import { type GraphSnapshot, INVALID_INDEX, type U32 } from "@graphty/graph-format";

import {
    ACCELERATION_POLICY_DEFAULT,
    type AccelerationCapabilities,
    AccelerationController,
    type AccelerationPolicy,
    type GraphAccelerator,
} from "../acceleration";
import type { CameraState } from "../camera/types";
import { readingOfScope } from "../catalog/sets/parse";
import type {
    EdgeId,
    EdgeMember,
    EdgeReading,
    LayoutId,
    NodeId,
    Path,
    Query,
    ResultItem,
    RuleTree,
    RunId,
    Scope,
    ScopeInput,
    SetId,
    StaticStyle,
} from "../catalog/types";
import { DataConfig } from "../config/DataConfig";
import { defaultEdgeStyle } from "../config/EdgeStyle";
import { defaultNodeStyle } from "../config/NodeStyle";
import { createEdgeCounter, pairsOrdered } from "../data/edgeIdentity";
import { GraphStore } from "../data/GraphStore";
import { readonlyPositions } from "../data/lane";
import type { ElementPositions } from "../data/positions";
import type { ImportReport } from "../data/report";
import { GraphtyError, isGraphtyError } from "../errors";
import { type InputCounters, inputCountersOf } from "./attributes";
import { createSessionCatalog, SESSION_CATALOG_TABLES } from "./catalog";
import { DEFINITIONS } from "./commands";
import { readProjectConfig } from "./commands/config";
import { declarationKey } from "./commands/data";
import { DEFAULT_LAYOUT } from "./commands/layout";
import { type CostEstimate, DEFAULT_COST_GATE_LIMITS } from "./cost";
import { headlessDataService, SessionData, sliceRecords } from "./data";
import { recommendLayout } from "./layout";
import { createNoteFacts } from "./notes/countIndex";
import { createNotesApi } from "./notes/NotesApi";
import { isNotePath, noteFieldOf } from "./notes/paths";
import { noteMembers } from "./notes/select";
import { boundTargets } from "./notes/status";
import type { NoteId, NotesApi } from "./notes/types";
import {
    type AlgorithmRunCommand,
    estimateCommand,
    type Plan,
    planCommand,
    type PlanningContext,
    type SessionCommand,
} from "./planning";
import {
    Dispatcher,
    type DispatchFunction,
    runQueueScheduler,
    type Scheduler,
    type TransactionScope as DispatchScope,
} from "./project/Dispatcher";
import { nodeOfKey, ROWS_MOVED } from "./project/graphOps";
import type { GraphSlice, LayoutChoice } from "./project/state";
import { answeringFromProject, type CannedOutcomes, type ProjectApi, projectOf } from "./projectFile";
import { createQueryEngine, type QueryEngine } from "./query";
import { createResultsApi, type ResultsApi, type ResultsRunEntry, type RunRef } from "./results";
import { resultExecutionOf } from "./results/ResultsApi";
import { shareNodeIndex } from "./results/RunResult";
import { bindResultPath } from "./results/types";
import {
    type Caveats,
    createLocalRunQueue,
    createRunsApi,
    ENGINE_VERSIONS,
    ManagedRun,
    type ResolvedScope,
    type Run,
    type RunExecutionContext,
    type RunExecutor,
    type RunOptions,
    type RunOutcome,
    type RunsApi,
    type SessionRunsApi,
} from "./runs";
import { canonicalize, frozenSelection, type LiveKeyword } from "./runs/runId";
import {
    type ComponentLabels,
    createScopeApi,
    edgeSpaceOf,
    type MaskIdSpace,
    type ScopeApi,
    type ScopeResolver,
} from "./scope";
import { sealedSet } from "./sealed";
import { createSelectionApi, type SelectionOwner, type SelectionTextMode } from "./selection";
import { createMaterialiser } from "./sets/algebra";
import { outcomeOf, SetsCache } from "./sets/cache";
import { captureItem, captureOf, type HeldCaptures, heldItems, nextCaptures } from "./sets/captures";
import { dependencyOf, type DependencySources, referentReading } from "./sets/dependencies";
import { LayerScopes } from "./sets/layers";
import { SetsNotifier } from "./sets/notify";
import { createOffering } from "./sets/offers";
import { createSetsApi, sessionEdgeMember, setsStoreOf } from "./sets/SetsApi";
import { identityOf, scopeSignature } from "./sets/signature";
import type { StatusRun } from "./sets/status";
import type { SetsApi, SetUser } from "./sets/types";
import {
    createAutoApplyPolicy,
    createStylesApi,
    type ElementLayerSpec,
    type EncodingRun,
    type EncodingSource,
    type FieldWords,
    type PathDirectory,
    type SessionStylesApi,
} from "./styles";
import { atStylePath, channelsFor } from "./styles/channels";
import type { CompiledLayer } from "./styles/Layer";
import { createLayerRepaint, type ElementPaint, type RepaintEngine } from "./styles/repaint";
import { createScaleRegistry } from "./styles/scales";
import { createSelectorSource, edgeEndpointOf, type SessionSelectorSource } from "./styles/sources";
import type {
    AccelerationControllerLike,
    CommandOutcome,
    CreateGraphSessionOptions,
    ElementSession,
    FindOptions,
    FindResult,
    GraphSession,
    HistoryOutcome,
    PositionEntry,
    ProjectConfig,
    ProjectConfigPatch,
    ProjectSlice,
    SessionCatalogApi,
    SessionConfig,
    SessionDataApi,
    SessionDataConfig,
    SessionEventMap,
    SessionGraphStore,
    SessionHistory,
    SessionLayout,
    SessionPositions,
    SessionRecordSource,
    SessionRunsOptions,
    SessionStatus,
    SessionViews,
    TransactionOptions,
    TransactionScope,
} from "./types";
import { createVisibilityApi, type FilterValueSource, type SessionVisibilityApi } from "./visibility";
import type { FilterRunResult } from "./visibility/filter";

/**
 * A store with its coordinate lane writable: what the arrangement hook restores coordinates and
 * pins into. The element's data manager is one; a consumer only ever sees the read-only form.
 * @internal
 */
export interface LaneStore extends Omit<SessionGraphStore, "positions"> {
    /** The lane itself. */
    readonly positions: ElementPositions;
    /** Whether structural changes wait for the next read of the graph; see `GraphStore.deferring`. */
    readonly deferring?: boolean;
    /** Whether the next read of the graph would freeze a snapshot; see `GraphStore.stale`. */
    readonly stale?: boolean;
    /**
     * The attribute revisions and input tick of whoever builds the stores (design/sets 6.2): the
     * data manager's, the same across a Clear. Absent, the store's own.
     */
    readonly inputs?: InputCounters;
}

/**
 * What the element's own session takes beyond {@link CreateGraphSessionOptions}: the data
 * manager's store, whose only writer is the dispatcher, a record source, and a data configuration
 * read live. No entry point exports it.
 * @internal
 */
export interface ElementSessionOptions extends Omit<CreateGraphSessionOptions, "config"> {
    /** The store to read. When absent the session builds one of its own and disposes it. */
    readonly store?: LaneStore;
    /** Where to read the attributes a record arrived with, for rows the graph slice lacks. */
    readonly records?: SessionRecordSource;
    /** The configuration; `data` may be a function, read on every use. */
    readonly config?: Omit<NonNullable<CreateGraphSessionOptions["config"]>, "data"> & {
        readonly data?: SessionDataConfig | (() => SessionDataConfig);
    };
}

/**
 * What a session with no configuration of its own runs on.
 *
 * Parsed per session rather than held as a module constant: `knownFields` is a nested object the
 * element mutates in place at run time, so one shared default would let a change made through one
 * session reach every other session that took the default.
 * @returns a fresh copy of the element's data defaults
 */
function defaultDataConfig(): SessionDataConfig {
    return DataConfig.parse({});
}

/**
 * The acceleration states that mean an accelerator is attached and could do the work.
 *
 * "idle" is in the set because it means exactly that: the device is there and the graph is merely
 * smaller than the threshold at which the element bothers to upload it.
 */
const ACCELERATOR_ATTACHED: ReadonlySet<string> = new Set(["active", "idle"]);

/**
 * What a planned run's numbers would be qualified by before the work has said anything about them.
 *
 * The same defaults the runs API starts a run from, stated once here so that the caveats on a plan
 * and the caveats on the run that plan describes cannot drift apart.
 */
const PLANNED_CAVEATS: Caveats = Object.freeze({
    exact: true,
    seed: null,
    direction: "as-loaded",
    weight: null,
    precision: "f64",
    method: "exact",
    notes: Object.freeze([]),
});

/** The status a disposed session reports, so a teardown path can still ask and get an answer. */
const DISPOSED_STATUS: SessionStatus = Object.freeze({
    ready: false,
    counts: Object.freeze({ nodes: 0, edges: 0, visibleNodes: 0, visibleEdges: 0 }),
    directed: false,
});

/** The prefix an attribute path carries in front of the key the record actually holds. */
const ATTRIBUTE_PREFIX = "data.";

/** The parts of a session whose verbs a transaction's `tx` routes into the transaction. */
const TX_PARTS = [
    "data",
    "runs",
    "results",
    "scope",
    "sets",
    "notes",
    "selection",
    "visibility",
    "styles",
    "views",
    "positions",
    "config",
] as const satisfies readonly (keyof GraphSession)[];

/**
 * What the factory hands the session, with the ownership question already answered.
 *
 * The `owned*` members are the same objects as their neighbours when the session built them and
 * null when a caller did, which is the whole of what `dispose()` needs to know.
 */
interface SessionParts {
    /** The store to read, whoever built it. */
    readonly store: LaneStore;
    /** The catalogue: the shared tables, plus the metric listing for this session's own graph. */
    readonly catalog: SessionCatalogApi;
    /** The store when this session built it, so that disposal releases it. */
    readonly ownedStore: GraphStore | null;
    /** The data surface over that store. */
    readonly data: SessionData;
    /** Reads the project settings, live. */
    readonly readProject: () => ProjectConfig;
    /** The controller whose capabilities and policy this session publishes. */
    readonly controller: AccelerationControllerLike;
    /** The controller when this session built it, so that disposal releases it. */
    readonly ownedAcceleration: AccelerationController | null;
    /** Starting runs, finding them and taking them away, plus the teardown a session owes them. */
    readonly runs: SessionRunsApi;
    /** Addressing what those runs produced. */
    readonly results: ResultsApi;
    /** Turning a scope specification into the elements it names. */
    readonly scope: ScopeApi;
    /** The kept sets. */
    readonly sets: SetsApi;
    /** The notes. */
    readonly notes: NotesApi;
    /** The one selection this session holds. */
    readonly selection: SelectionOwner;
    /** What the filters and the time window have left showing. */
    readonly visibility: SessionVisibilityApi;
    /** The style stack, with the element's own layers already at the bottom of it. */
    readonly styles: SessionStylesApi;
    /** Cancels every style edit still pending, for `dispose()`. */
    readonly stopStyleEdits: () => void;
    /** What the last style pass painted, which is what a renderer draws from. */
    readonly paint: ElementPaint;
    /** Everything `estimate` and `plan` read. */
    readonly planning: PlanningContext;
    /** Where a run notification is delivered, so the session can publish it to its watchers. */
    readonly watchers: Watchers;
    /** The one path every change to project state takes; the styles API already writes through it. */
    readonly dispatcher: Dispatcher;
    /** Saved results waiting for the runs a project open starts; the executor answers from it. */
    readonly canned: CannedOutcomes;
}

/**
 * What the element's own tests hand a session besides its options: the clock of the coalescing
 * window and the queue queued commands take their turn on, so a random sequence can drive both.
 */
interface SessionInternals {
    readonly now?: () => number;
    readonly scheduler?: Scheduler;
    /** Open the baseline window: what the page declared at construction is not undoable. */
    readonly baselineWindow?: boolean;
}

/**
 * Who is watching one session event.
 *
 * A set rather than a list, so that subscribing twice with the same function subscribes once and
 * the unsubscribe a caller holds cannot take somebody else's handler away with it.
 */
type Watchers = Map<keyof SessionEventMap, Set<(detail: never) => void>>;

/**
 * The executor a session that was handed none runs on.
 *
 * It refuses rather than doing nothing, because a run that resolved with an empty result would
 * publish a graph-wide answer of "nothing" that a style layer would happily paint. Every algorithm
 * this package ships is built from the renderer's `Graph`, so a session with no renderer behind it
 * genuinely cannot run one -- and saying so with a code is the honest form of that.
 * @param context - What the run handed the work.
 * @returns Never; it always rejects.
 */
function refuseToExecute(context: RunExecutionContext): Promise<RunOutcome> {
    return Promise.reject(
        new GraphtyError({
            code: "E_UNSUPPORTED",
            message:
                "This session has no algorithm executor, so it cannot run anything. A session that " +
                "belongs to a <graphty-element> has one; a standalone session is handed one through " +
                "createGraphSession({ runs: { execute } }).",
            source: "run",
            target: { kind: "run", id: context.runId },
            details: { algorithm: context.algorithm, runId: context.runId },
        }),
    );
}

/**
 * An executor whose results read their nodes through the snapshot's id index when they hold the
 * same ids in the same order, so a finished result keeps its columns and not a second index
 * (design/undo/undo-design.md section 7).
 * @param execute - The executor.
 * @param snapshot - The resident snapshot.
 * @param token - The graph token now.
 * @returns The executor, sharing.
 */
function sharingIndexes(execute: RunExecutor, snapshot: () => GraphSnapshot, token: () => number): RunExecutor {
    return async (context) => {
        const outcome = await execute(context);
        shareNodeIndex(outcome.result, snapshot().ids, token());
        return outcome;
    };
}

/**
 * A graph with no view attached.
 *
 * Build one with {@link createGraphSession} rather than with `new`: the factory is what settles
 * whether the session owns its store and its accelerator, and that ownership is what `dispose()`
 * acts on.
 */
class Session implements ElementSession {
    readonly history: SessionHistory;
    readonly data: SessionDataApi;
    readonly catalog: SessionCatalogApi;
    readonly runs: RunsApi;
    readonly results: ResultsApi;
    readonly scope: ScopeApi;
    readonly sets: SetsApi;
    readonly notes: NotesApi;
    readonly selection: SelectionOwner;
    readonly visibility: SessionVisibilityApi;
    readonly styles: SessionStylesApi;
    readonly views: SessionViews;
    readonly layout: SessionLayout;
    readonly paint: ElementPaint;
    readonly project: ProjectApi;

    /** Cancels every style edit still pending. */
    private readonly stopStyleEdits: () => void;
    private readonly sessionRuns: SessionRunsApi;
    private readonly planning: PlanningContext;
    private readonly watchers: Watchers;
    /** The settings; identity-stable, every member read live. */
    readonly config: SessionConfig;
    private readonly sessionData: SessionData;
    private readonly store: LaneStore;
    private readonly controller: AccelerationControllerLike;
    /** The store, when this session built it and therefore has to dispose it. */
    private readonly ownedStore: GraphStore | null;
    /** The controller, when this session built it and therefore has to dispose it. */
    private readonly ownedAcceleration: AccelerationController | null;
    /** Stops the controller subscription `capabilities:changed` is published from. */
    private readonly unwatchController: () => void;
    /** The one path every change to project state takes, and the history it records. */
    private readonly dispatcher: Dispatcher;
    private disposed = false;
    /** The lane with the positions verbs beside it; built once, on first read. */
    private positionsView: SessionPositions | undefined;

    /**
     * Assemble the session from parts the factory has already decided the ownership of.
     * @param parts - the store, the data surface, the configuration and the accelerator, each
     *     paired with whether this session is the one that has to release it
     */
    constructor(parts: SessionParts) {
        this.store = parts.store;
        this.ownedStore = parts.ownedStore;
        this.sessionData = parts.data;
        this.data = parts.data;
        this.catalog = parts.catalog;
        this.controller = parts.controller;
        this.ownedAcceleration = parts.ownedAcceleration;
        this.sessionRuns = parts.runs;
        this.runs = parts.runs;
        this.results = parts.results;
        this.scope = parts.scope;
        this.sets = parts.sets;
        this.notes = parts.notes;
        this.selection = parts.selection;
        this.visibility = parts.visibility;
        this.styles = parts.styles;
        this.stopStyleEdits = parts.stopStyleEdits;
        this.paint = parts.paint;
        this.planning = parts.planning;
        this.watchers = parts.watchers;
        // Every transition the controller makes is one event on the session, carrying the same
        // frozen document `capabilities` returns -- so a consumer that cached the last one can
        // compare it by identity rather than walking it.
        this.unwatchController = this.controller.onChange(() => {
            publish(this.watchers, "capabilities:changed", { capabilities: this.controller.capabilities });
        });
        let version = 0;
        this.dispatcher = parts.dispatcher;
        // Chained: the kept sets hear each change after it, to tell `set:changed`.
        const beside = this.dispatcher.events.project;
        this.dispatcher.events.project = (change) => {
            publish(this.watchers, "project:changed", {
                slices: change.slices as readonly ProjectSlice[],
                cause: change.cause,
            });
            beside?.(change);
        };
        this.dispatcher.events.history = (reason) => {
            version++;
            publish(this.watchers, "history:changed", { reason });
        };
        // Undo and redo select what changed; selection itself is never a step.
        this.dispatcher.events.touched = {
            cap: () => this.selection.cap,
            select: (ids) => {
                const target = { nodes: [...ids.nodes], edges: [...ids.edges] };
                // Resolving ids reads the graph; an undo that left rows to rebuild does not rebuild
                // them only to select, it waits for whatever reads the graph next.
                if (this.store instanceof GraphStore && this.store.stale) {
                    this.selection.applyAtNextRead(target, "replace", "history");
                } else {
                    this.selection.applyNow(target, "replace", "history");
                }
            },
        };
        DISPATCHERS.set(this, this.dispatcher);
        LANES.set(this, this.store);
        SESSION_RUNS.set(this, this.sessionRuns);
        this.history = historyOf(this.dispatcher, () => version);
        this.views = viewsOf(this.dispatcher);
        this.layout = layoutOf(this.dispatcher, (command) => this.dispatcher.dispatch(command));
        // What an import asking for a recommended layout chooses, for the graph it loaded.
        this.dispatcher.services.layoutAdvice = () => {
            const advice = recommendLayout(this.data.statistics(), { placedNodes: this.store.seededNodeCount });
            return advice === undefined ? undefined : { id: advice.layout.id, engine: advice.layout.engine };
        };
        this.config = configOf(this.dispatcher, parts.readProject, parts.controller);
        this.project = projectOf(this, this.dispatcher, parts.canned, {
            announce: (change) => {
                publish(this.watchers, "project:status", change);
            },
            isDerived: (id) => this.sessionRuns.isDerivedId(id),
        });
    }

    /**
     * Whether `undo()` would do something.
     * @returns True when it would undo a step or cancel pending work.
     */
    get canUndo(): boolean {
        return this.dispatcher.nextUndo !== null;
    }

    /**
     * Whether `redo()` would do something.
     * @returns True when a step has been undone and not recorded over.
     */
    get canRedo(): boolean {
        return this.dispatcher.history.position < this.dispatcher.history.steps.length;
    }

    /**
     * Undo the last step, or cancel pending work dispatched after it.
     * @returns What was done, once the picture has caught up.
     */
    undo(): Promise<HistoryOutcome> {
        return this.dispatcher.undo() as Promise<HistoryOutcome>;
    }

    /**
     * Redo the last undone step.
     * @returns What was done, once the picture has caught up.
     */
    redo(): Promise<HistoryOutcome> {
        return this.dispatcher.redo() as Promise<HistoryOutcome>;
    }

    /**
     * Record everything `fn` dispatches through `tx` as one step.
     * @param label - The step's label.
     * @param fn - The body.
     * @param options - Provenance stamped on the step.
     * @returns What `fn` returned.
     */
    transaction<T>(
        label: string,
        fn: (tx: TransactionScope, signal: AbortSignal) => T | Promise<T>,
        options: TransactionOptions = {},
    ): Promise<T> {
        return this.dispatcher.transaction(label, (scope, signal) => fn(this.scopeOf(scope), signal), options);
    }

    /**
     * Do one command in the vocabulary.
     * @param command - The command.
     * @returns Its outcome.
     */
    execute<C extends SessionCommand>(command: C): CommandOutcome<C> {
        return this.executeThrough(command, (each, options) => this.dispatcher.dispatch(each, options));
    }

    /**
     * Do one command through `dispatch`. A run is started through the runs API, which dispatches
     * it and hands back its handle.
     * @param command - The command.
     * @param dispatch - The session's dispatch, or a transaction's.
     * @returns Its outcome.
     */
    private executeThrough<C extends SessionCommand>(command: C, dispatch: DispatchFunction): CommandOutcome<C> {
        if (command.op === "set.create") {
            // The element mints these; one a caller supplied could collide with the register or
            // re-point a stored reference (design/sets/undo-integration.md section 8, decision 2).
            const minted = ["id", "order", "createdFrom"].filter((field) => Object.hasOwn(command, field));
            if (minted.length > 0) {
                return Promise.reject(
                    new GraphtyError({
                        code: "E_BAD_COMMAND",
                        message: `A set's ${minted.join(", ")} ${minted.length === 1 ? "is" : "are"} minted by the element; leave ${minted.length === 1 ? "it" : "them"} out of set.create.`,
                        source: "data",
                        // The same reason a note's element-made fields are refused with.
                        details: { fields: minted, reason: "element-field" },
                    }),
                ) as CommandOutcome<C>;
            }
        }

        if (command.op === "algo.run") {
            return this.startCommand(dispatch, command) as CommandOutcome<C>;
        }

        return dispatch(command) as unknown as CommandOutcome<C>;
    }

    /**
     * Start a run command through a dispatch.
     * @param dispatch - The session's dispatch, or a transaction's.
     * @param command - The run.
     * @param options - The signal, the progress handler and how the call joins the queue.
     * @returns The run.
     */
    private startCommand(dispatch: DispatchFunction, command: AlgorithmRunCommand, options: RunOptions = {}): Run {
        return this.sessionRuns.startVia(dispatch, command.algorithm, command.params, {
            ...options,
            ...(command.scope === undefined ? {} : { scope: command.scope }),
            ...(command.seed === undefined ? {} : { seed: command.seed }),
            ...(command.sample === undefined ? {} : { sample: command.sample }),
            ...(command.exact === undefined ? {} : { exact: command.exact }),
            ...(command.as === undefined ? {} : { as: command.as }),
            ...(command.applySuggestedStyles === undefined
                ? {}
                : { applySuggestedStyles: command.applySuggestedStyles }),
        });
    }

    /**
     * The session a transaction's callback works through: this session, with every command it
     * executes joining the transaction.
     * @param scope - The dispatcher's scope for the transaction.
     * @returns The scope.
     */
    private scopeOf(scope: DispatchScope): TransactionScope {
        const via: DispatchFunction = (each, options) => scope.dispatch(each, options);
        // Every verb of a part runs with its dispatches routed into the transaction, so
        // `tx.styles.add` and `tx.data.addNodes` join it exactly as `tx.execute` does.
        const parts = Object.fromEntries(TX_PARTS.map((name) => [name, { value: this.routedPart(this[name], via) }]));
        const tx: TransactionScope = Object.create(this, {
            ...parts,
            execute: {
                value: <C extends SessionCommand>(command: C) => this.executeThrough(command, via),
            },
            run: {
                value: (command: AlgorithmRunCommand, options?: RunOptions) => this.startCommand(via, command, options),
            },
            // Its layout verbs join the transaction too.
            layout: {
                value: layoutOf(this.dispatcher, (command) => scope.dispatch(command)),
            },
            transaction: {
                value: <T>(
                    label: string,
                    fn: (inner: TransactionScope, signal: AbortSignal) => T | Promise<T>,
                    options?: TransactionOptions,
                ) => scope.transaction(label, (_same, signal) => fn(tx, signal), options),
            },
        }) as TransactionScope;
        return tx;
    }

    /**
     * A part of this session whose every method runs with its dispatches routed to `via`. Values
     * read from it are handed back as they are.
     * @param part - The part.
     * @param via - Where its dispatches go.
     * @returns The routed part.
     */
    private routedPart<P extends object>(part: P, via: DispatchFunction): P {
        return new Proxy(Object.create(null) as P, {
            get: (_target, key) => {
                const value: unknown = Reflect.get(part, key, part);
                return typeof value === "function"
                    ? (...args: unknown[]) => this.dispatcher.routed(via, () => Reflect.apply(value, part, args))
                    : value;
            },
            has: (_target, key) => key in part,
        });
    }

    /**
     * The element-owned node coordinates, read-only, with the verbs that place and pin nodes.
     * @returns the coordinates and the verbs
     */
    get positions(): SessionPositions {
        this.positionsView ??= positionsOf(this.store, this.dispatcher);
        return this.positionsView;
    }

    /**
     * How many nodes the data arrived carrying a coordinate for.
     *
     * See the interface: this is the importer's own count, which a running layout does not move.
     * @returns the count
     */
    get seededNodeCount(): number {
        return this.store.seededNodeCount;
    }

    /**
     * The O(1) facts, as a fresh frozen struct on every read so that a consumer cannot hold a
     * stale one by mistake.
     *
     * A disposed session answers rather than throwing: a status surface is what a teardown path
     * reads to find out that teardown happened, and a chip that throws during unmount is worse
     * than a chip that says "not ready".
     *
     * The two visible counts are here rather than only on `visibility.summary` because a status
     * bar reading "showing 1,204 of 50,000" needs all four numbers together, and a consumer that
     * had to read two objects to write one sentence would eventually read them a frame apart.
     * @returns the status
     */
    get status(): SessionStatus {
        if (this.disposed) {
            return DISPOSED_STATUS;
        }

        const snapshot = this.store.getSnapshot();
        const showing = this.visibility.summary;
        return Object.freeze({
            ready: true,
            counts: Object.freeze({
                nodes: snapshot.nodeCount,
                edges: snapshot.edgeCount,
                visibleNodes: showing.visibleNodes,
                visibleEdges: showing.visibleEdges,
            }),
            directed: snapshot.directed,
        });
    }

    /**
     * What this machine can do.
     *
     * Acceleration is the whole of it today. The worker, XR, capture, calibration and limits
     * members of the published capability document arrive with the subsystems that measure them,
     * and reporting a guess for them in the meantime would be worse than reporting nothing.
     * @returns the capability document the acceleration subsystem publishes
     */
    get capabilities(): AccelerationCapabilities {
        // The probe starts HERE rather than at construction, and only for a controller this
        // session built. Constructing a session must not reach for the hardware: a renderer builds
        // one on its way up, and asking for a GPU adapter on the way to drawing a 30-node graph is
        // a cost nobody asked for. Asking what the machine can do is the one thing that IS a
        // request for the answer, so it is what starts the measurement. `start()` is idempotent,
        // and until it settles the state reads "probing", which is the honest word for it.
        if (!this.disposed) {
            void this.ownedAcceleration?.start().catch(() => undefined);
        }

        return this.controller.capabilities;
    }

    /**
     * What the consumer asks of the hardware.
     * @returns the policy in force
     */
    get acceleration(): AccelerationPolicy {
        return this.controller.policy;
    }

    /**
     * Changes what the consumer asks of the hardware; the change applies at once.
     * @param policy - use an accelerator when there is one, never look, or refuse without one
     */
    set acceleration(policy: AccelerationPolicy) {
        this.controller.setPolicy(policy);
    }

    /**
     * Attach an accelerator the caller built, or detach the current one with `null`.
     *
     * An injected accelerator is never replaced by a probed one, and the session does not dispose
     * it: whoever built it owns its lifetime.
     * @param accelerator - the accelerator to attach, or null to detach
     */
    setAccelerator(accelerator: GraphAccelerator | null): void {
        this.controller.setAccelerator(accelerator);
    }

    /**
     * The current snapshot, with copies of its coordinate and pin columns.
     * @returns the sealed graph-format snapshot
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    snapshot(): GraphSnapshot {
        return this.sessionData.snapshot();
    }

    /**
     * The topology fingerprint.
     * @returns the fingerprint
     * @throws A `GraphtyError` with `E_DISPOSED` when the session has been disposed.
     */
    fingerprint(): string {
        return this.sessionData.fingerprint();
    }

    /**
     * What a find box lists, without selecting anything.
     * @param text - What was typed.
     * @param options - The window, the kinds and the scope.
     * @returns A page of hits and at most three value rows.
     * @throws A `GraphtyError` coded `E_OPTION_RANGE` for a bad window or kind.
     */
    find(text: string, options?: FindOptions): FindResult {
        return this.sessionData.find(text, options);
    }

    /**
     * Do one thing, as a command.
     * @param command - What to do.
     * @param options - The signal, the progress handler and how the call joins the queue.
     * @returns The run.
     */
    run(command: AlgorithmRunCommand, options: RunOptions = {}): Run {
        return this.startCommand((each, dispatched) => this.dispatcher.dispatch(each, dispatched), command, options);
    }

    /**
     * What one command would cost, answered synchronously so that a button can be drawn from it.
     * @param command - What would be done.
     * @returns The estimate.
     */
    estimate(command: SessionCommand): CostEstimate {
        return estimateCommand(this.planning, command);
    }

    /**
     * What one command would do, what it would cost, and whether it would be allowed.
     *
     * A promise, because the commands that arrive after this one have to walk the graph to
     * preview what they would match or mutate. The algorithm run answers without waiting for
     * anything, and a caller that only wants the cost should ask {@link Session.estimate}, which
     * is the synchronous half by design.
     * @param command - What would be done.
     * @returns The plan.
     */
    plan(command: SessionCommand): Promise<Plan> {
        return Promise.resolve(planCommand(this.planning, command));
    }

    /**
     * Watch the session.
     * @param event - Which event.
     * @param handler - Called with the event's detail.
     * @returns A function that stops the subscription.
     */
    on<K extends keyof SessionEventMap>(event: K, handler: (detail: SessionEventMap[K]) => void): () => void {
        let subscribers = this.watchers.get(event);

        if (subscribers === undefined) {
            subscribers = new Set();
            this.watchers.set(event, subscribers);
        }

        const held = subscribers;
        held.add(handler as (detail: never) => void);

        return () => {
            held.delete(handler as (detail: never) => void);
        };
    }

    /**
     * Release what this session owns.
     *
     * A store or an accelerator handed in by a caller is left alone: whoever built it owns its
     * lifetime, and a session that disposed a data manager's store would take the graph out from
     * under the renderer sharing it. Calling this twice is harmless.
     */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        // A pass still queued would repaint from a store disposed below.
        this.dispatcher.lane.close();
        // The store may be the renderer's, and gone: nothing is captured on the way out.
        this.dispatcher.arrangement.bind(null);
        this.dispatcher.clear();
        this.unwatchController();
        // Runs first: a run still in flight holds a reference to the data it is reading, and
        // disposing the store under it would have it finish against a graph that no longer exists.
        this.sessionRuns.dispose();
        // Style edits are runs the runs list does not hold, so they are cancelled on their own.
        this.stopStyleEdits();
        this.watchers.clear();
        this.sessionData.dispose();
        this.ownedAcceleration?.dispose();
        this.ownedStore?.dispose();
    }
}

/** Each session's runs API with the parts only the element reaches; see {@link sessionRunsOf}. */
const SESSION_RUNS = new WeakMap<GraphSession, SessionRunsApi>();

/**
 * The runs API behind a session, with `startVia`: how the renderer starts the on-load runs as
 * deferred members of the command that added the rows. Not published.
 * @param session - A session this module built.
 * @returns Its runs API.
 */
export function sessionRunsOf(session: GraphSession): SessionRunsApi {
    const runs = SESSION_RUNS.get(session);
    if (runs === undefined) {
        throw new GraphtyError({
            code: "E_INTERNAL",
            message: "This session was not built by createGraphSession, so it has no runs API of its own.",
            source: "run",
        });
    }

    return runs;
}

/** Each headless session's `graph` repaint hook, by dispatcher, to unregister. */
const HEADLESS_GRAPH_PAINT = new WeakMap<Dispatcher, () => void>();

/**
 * Hand a session's repaint after a data change to the renderer drawing it, which repaints once
 * it has reconciled its own objects. Only the element calls it, before registering its own
 * `graph` hook; without it a session repaints by itself.
 * @param session - A session this module built.
 */
export function handGraphPaintToRenderer(session: GraphSession): void {
    const dispatcher = dispatcherOf(session);
    HEADLESS_GRAPH_PAINT.get(dispatcher)?.();
    HEADLESS_GRAPH_PAINT.delete(dispatcher);
}

/** Each session's dispatcher, for the element's own tests; see {@link dispatcherOf}. */
const DISPATCHERS = new WeakMap<GraphSession, Dispatcher>();

/** Each session's store, with its lane writable; see {@link laneOf}. */
const LANES = new WeakMap<GraphSession, LaneStore>();

/**
 * The coordinate lane behind a session, writable: what a layout engine writes every frame, and
 * what a test standing in for one writes. Not published; a consumer places nodes through
 * `session.positions.set`.
 * @param session - A session this module built.
 * @returns Its lane.
 */
export function laneOf(session: GraphSession): ElementPositions {
    const store = LANES.get(session);
    if (store === undefined) {
        throw new GraphtyError({ code: "E_INTERNAL", message: "That session was not built here.", source: "history" });
    }

    return store.positions;
}

/**
 * The dispatcher behind a session. Not published: the element's own tests spy on it and read the
 * project state it holds.
 * @param session - A session this module built.
 * @returns Its dispatcher.
 */
export function dispatcherOf(session: GraphSession): Dispatcher {
    const dispatcher = DISPATCHERS.get(session);
    if (dispatcher === undefined) {
        throw new GraphtyError({ code: "E_INTERNAL", message: "That session was not built here.", source: "history" });
    }

    return dispatcher;
}

/**
 * The pinned ids as a consumer reads them: a sealed copy, because the slice itself is project
 * state that only the dispatcher writes.
 * @param pins - The pins slice.
 * @returns The copy.
 */
function pinnedOf(pins: ReadonlySet<NodeId>): ReadonlySet<NodeId> {
    // ponytail: copies per read (O(pins)); cache per pins revision if a caller reads it per frame.
    return sealedSet(pins, "Call session.positions.pin() or unpin() to change what is pinned.");
}

/**
 * The coordinates, read-only, with the verbs that place and pin nodes as steps beside them.
 * @param store - The store whose lane it reads.
 * @param dispatcher - The dispatcher the verbs dispatch through.
 * @returns The coordinates and the verbs.
 */
function positionsOf(store: SessionGraphStore, dispatcher: Dispatcher): SessionPositions {
    return Object.defineProperties(
        readonlyPositions(() => store.positions),
        {
            pinned: { get: () => pinnedOf(dispatcher.state.pins), enumerable: true },
            set: {
                value: async (entries: readonly PositionEntry[]) => {
                    await dispatcher.dispatch({ op: "positions.set", entries });
                },
                enumerable: true,
            },
            pin: {
                value: async (ids: readonly NodeId[]) => {
                    await dispatcher.dispatch({ op: "positions.pin", ids, pinned: true });
                },
                enumerable: true,
            },
            unpin: {
                value: async (ids: readonly NodeId[]) => {
                    await dispatcher.dispatch({ op: "positions.pin", ids, pinned: false });
                },
                enumerable: true,
            },
        },
    ) as SessionPositions;
}

/**
 * The saved camera views: the dispatcher's `views` slice, read as a map, with the two verbs that
 * write it.
 * @param dispatcher - The dispatcher.
 * @returns The views.
 */
/**
 * The `layout` slice with its verbs.
 * @param dispatcher - The session's dispatcher, whose state is read.
 * @param dispatch - Where the verbs go: the session's dispatch, or a transaction's.
 * @returns The layout surface.
 */
function layoutOf(dispatcher: Dispatcher, dispatch: (command: SessionCommand) => Promise<unknown>): SessionLayout {
    const choice = (): LayoutChoice => dispatcher.state.layout ?? DEFAULT_LAYOUT;
    return Object.freeze({
        get id() {
            return choice().id;
        },
        get engine() {
            return choice().engine;
        },
        get options() {
            return choice().options;
        },
        get dimension() {
            return choice().dimension;
        },
        set: async (
            id: LayoutId,
            options?: { readonly engine?: string; readonly options?: Readonly<Record<string, unknown>> },
        ) => {
            await dispatch({
                op: "layout.set",
                id,
                ...(options?.engine === undefined ? {} : { engine: options.engine }),
                ...(options?.options === undefined ? {} : { options: options.options }),
            });
        },
        setDimension: async (dimension: "2d" | "3d") => {
            await dispatch({ op: "view.dimension", dimension });
        },
    });
}

function viewsOf(dispatcher: Dispatcher): SessionViews {
    const held = dispatcher.state.views;
    const views: SessionViews = Object.freeze({
        get size() {
            return held.size;
        },
        get: (name: string) => held.get(name),
        has: (name: string) => held.has(name),
        forEach: (
            visit: (camera: CameraState, name: string, map: ReadonlyMap<string, CameraState>) => void,
            self?: unknown,
        ) => {
            held.forEach((camera, name) => {
                visit.call(self, camera, name, views);
            });
        },
        entries: () => held.entries(),
        keys: () => held.keys(),
        values: () => held.values(),
        [Symbol.iterator]: () => held.entries(),
        save: async (saved: readonly { readonly name: string; readonly camera: CameraState }[]) => {
            await dispatcher.dispatch({ op: "view.save", views: saved });
        },
        remove: async (names: readonly string[]) => {
            await dispatcher.dispatch({ op: "view.remove", names });
        },
    });

    return views;
}

/**
 * Read the project settings from the `config` slice, rebuilt only when the slice or the base has
 * changed since the last read, so two reads with no change between them return the same object.
 * @param dispatcher - The dispatcher holding the slice.
 * @param base - Reads the data configuration an unset `data.` key falls back to.
 * @returns The reader.
 */
function projectConfigReader(dispatcher: Dispatcher, base: () => SessionDataConfig): () => ProjectConfig {
    let cache: { writes: number; base: SessionDataConfig; value: ProjectConfig } | undefined;
    return () => {
        const writes = dispatcher.lane.writes("config");
        const from = base();
        if (cache?.writes !== writes || cache.base !== from) {
            cache = { writes, base: from, value: readProjectConfig(dispatcher.state.config, from) };
        }

        return cache.value;
    };
}

/**
 * The session's settings: every project setting read live, the acceleration policy read from the
 * controller, and `set`, which dispatches `config.set`.
 * @param dispatcher - The dispatcher.
 * @param read - Reads the project settings.
 * @param controller - The acceleration controller.
 * @returns The settings.
 */
function configOf(
    dispatcher: Dispatcher,
    read: () => ProjectConfig,
    controller: AccelerationControllerLike,
): SessionConfig {
    return Object.freeze({
        get data() {
            return read().data;
        },
        get runAlgorithmsOnLoad() {
            return read().runAlgorithmsOnLoad;
        },
        get background() {
            return read().background;
        },
        get selectionStyle() {
            return read().selectionStyle;
        },
        get layoutBehavior() {
            return read().layoutBehavior;
        },
        get author() {
            return read().author;
        },
        get name() {
            return read().name;
        },
        // Read from the controller, not from a value frozen at construction: the policy and the
        // threshold are changed at runtime through the session's accessors and the element's
        // attributes.
        get acceleration() {
            return Object.freeze({ policy: controller.policy, minNodes: controller.minNodes });
        },
        set: async (values: ProjectConfigPatch) => {
            await dispatcher.dispatch({ op: "config.set", values });
        },
    });
}

/**
 * The published face of a dispatcher's history.
 * @param dispatcher - The dispatcher.
 * @param version - Counts `history:changed` events.
 * @returns The history.
 */
function historyOf(dispatcher: Dispatcher, version: () => number): SessionHistory {
    const { history } = dispatcher;
    // The dispatcher's steps and pending items are the published ones, with plain string ids
    // and slice names where the published types brand them.
    type Published = SessionHistory;
    return Object.freeze({
        get version() {
            return version();
        },
        get steps() {
            return history.steps as Published["steps"];
        },
        get position() {
            return history.position;
        },
        get pending() {
            return dispatcher.pending as Published["pending"];
        },
        get nextUndo() {
            return dispatcher.nextUndo as Published["nextUndo"];
        },
        get bytes() {
            return history.bytes;
        },
        get limitBytes() {
            return history.limitBytes;
        },
        set limitBytes(value: number) {
            history.limitBytes = value;
        },
        get limitSteps() {
            return history.limitSteps;
        },
        set limitSteps(value: number) {
            history.limitSteps = value;
        },
        restoreTo: (step: string | null) => dispatcher.restoreTo(step) as Promise<HistoryOutcome>,
        cancel: (pending: string) => dispatcher.cancel(pending) as Published["pending"],
        clear: () => {
            dispatcher.clear();
        },
    });
}

/**
 * Settle how the data configuration is read.
 *
 * A caller that hands in an object is read from that object; a caller that hands in a function is
 * asked every time, which is what a host that REPLACES its configuration needs. A caller that
 * hands in nothing gets one parsed copy of the element's defaults, parsed once rather than on
 * every read.
 * @param given - the configuration, a reader for it, or nothing
 * @returns the reader
 */
function resolveDataConfig(given: SessionDataConfig | (() => SessionDataConfig) | undefined): () => SessionDataConfig {
    if (typeof given === "function") {
        return given;
    }

    const fixed = given ?? defaultDataConfig();
    return () => fixed;
}

/**
 * Where a freeze that renumbered elements is delivered.
 *
 * The selection is addressed by dense index, so a mask that did not follow a compacting freeze
 * would go on selecting whatever now sits at the old index -- silently, and with the right count.
 */
interface FreezeFollower {
    /**
     * The nodes were renumbered.
     * @param remap - Old index to new index, or the absent marker for a node the freeze dropped.
     * @param count - How many nodes the new snapshot holds.
     */
    nodes(remap: U32, count: number): void;
    /**
     * The edges were renumbered.
     * @param remap - Old index to new index, or the absent marker for an edge the freeze dropped.
     * @param count - How many edges the new snapshot holds.
     */
    edges(remap: U32, count: number): void;
}

/**
 * Settle which store the session reads, and whether it is the session's to dispose.
 *
 * A store handed in belongs to whoever built it, and so do its freeze callbacks: that builder is
 * what delivers a remap to everything it holds, this session's selection included.
 * @param given - the store a caller handed in, if any
 * @param readData - reads the data configuration a store built here runs under
 * @param follow - where a freeze of a store built here is delivered
 * @returns the store, and the same object again when this call allocated it
 */
function resolveStore(
    given: LaneStore | undefined,
    readData: () => SessionDataConfig,
    follow: FreezeFollower,
): { store: LaneStore; owned: GraphStore | null } {
    if (given !== undefined) {
        return { store: given, owned: null };
    }

    const owned: GraphStore = new GraphStore({
        directed: readData().directed,
        // A thunk, not a value: the element mutates `data.knownFields` in place at run time, and a
        // scale captured here would be the one known field that ignored the change.
        positionScale: () => readData().knownFields.positionScale,
        // The session's own edge counter. A headless session builds one store for its life, so
        // this only matters as the seam `DataManager` uses too: whoever builds stores owns the
        // counter, and no store rewinds it.
        edgeCounter: createEdgeCounter(),
        // The new count is read from the store rather than from the remap, because a remap says
        // where each old row went and not how many rows there now are. Reading it here is safe
        // and cheap: a freeze in delivery answers `getSnapshot()` from the snapshot it is
        // delivering rather than freezing again.
        onNodeRemap: (remap) => {
            follow.nodes(remap, owned.getSnapshot().nodeCount);
        },
        onEdgeRemap: (remap) => {
            follow.edges(remap, owned.getSnapshot().edgeCount);
        },
        onReplaced: () => undefined,
    });

    return { store: owned, owned };
}

/**
 * Settle which acceleration controller the session publishes from, and whether it is the
 * session's to dispose.
 * @param given - the controller a caller handed in, if any
 * @param policy - the policy a controller built here runs under
 * @param minNodes - the threshold a controller built here runs under, or undefined for the default
 * @returns the controller, and the same object again when this call allocated it
 */
function resolveAcceleration(
    given: AccelerationControllerLike | undefined,
    policy: AccelerationPolicy,
    minNodes: number | undefined,
): { controller: AccelerationControllerLike; owned: AccelerationController | null } {
    if (given !== undefined) {
        return { controller: given, owned: null };
    }

    // Built, not started: probing is deferred to the first read of `session.capabilities`, so a
    // session that nobody asks about the hardware never reaches for it.
    const owned = new AccelerationController(minNodes === undefined ? { policy } : { policy, minNodes });

    return { controller: owned, owned };
}

/**
 * Read attribute values the way a filter and a time window address them.
 *
 * A filter names an attribute by its published path -- `data.type`, the same string
 * `data.attributes()` reports -- while a record bag is keyed by the key the record arrived with.
 * The prefix is what separates the two, and stripping it here is what keeps every other caller
 * from having to know that the session's attributes all live under one root today.
 * @param records - Where the attribute bags are read.
 * @param readSnapshot - Reads the snapshot the indices address.
 * @returns The value source.
 */
function valueSourceOf(records: SessionRecordSource, readSnapshot: () => GraphSnapshot): FilterValueSource {
    const keyOf = (path: Path): string =>
        path.startsWith(ATTRIBUTE_PREFIX) ? path.slice(ATTRIBUTE_PREFIX.length) : path;

    return {
        nodeValue: (index: number, path: Path): unknown =>
            records.nodeAttributes(index, readSnapshot().ids.idOf(index))?.[keyOf(path)],
        // An edge's endpoints are read from the snapshot when the record holds nothing under the
        // key, as a style selector reads them: the importer removes the keys they arrived under.
        edgeValue: (index: number, path: Path): unknown =>
            records.edgeAttributes(index)?.[keyOf(path)] ?? edgeEndpointOf(readSnapshot(), index, keyOf(path)),
    };
}

/**
 * Which halves carry a value path: a run field's declared kinds, or the kinds of the data
 * attribute at that path.
 * @param path - `results.<run>.<field>` or `data.<field>`.
 * @param data - The session's data surface.
 * @param fieldsOf - A run's published fields, or undefined when it has no result.
 * @returns The kinds, `"node"`, `"edge"` or both.
 */
function fieldKindsOf(
    path: Path,
    data: SessionDataApi,
    fieldsOf: (run: RunId) => readonly { readonly name: string; readonly kind: string }[] | undefined,
): readonly string[] {
    if (path.startsWith("results.")) {
        const rest = path.slice("results.".length);
        const dot = rest.indexOf(".");
        const field = rest.slice(dot + 1);

        return (fieldsOf(rest.slice(0, dot)) ?? [])
            .filter((descriptor) => descriptor.name === field)
            .map((descriptor) => descriptor.kind);
    }

    return data
        .attributes()
        .filter((attribute) => attribute.path === path)
        .map((attribute) => attribute.kind);
}

/**
 * Which connected component each node belongs to, as the scope resolver and a component filter
 * read it.
 *
 * Built from the statistics the session already maintains rather than walked again, and held
 * against the snapshot it was built from: the readers are a scope resolution and a filter pass,
 * and both of those can be asked for repeatedly while nothing about the graph has moved.
 * @param data - The session's data surface.
 * @returns A reader for the labels.
 */
function componentLabelsOf(data: SessionDataApi): () => ComponentLabels {
    let against: GraphSnapshot | null = null;
    let held: ComponentLabels = { labels: new Int32Array(0), count: 0 };

    return (): ComponentLabels => {
        const snapshot = data.snapshot();

        if (against !== snapshot) {
            const { components } = data.statistics();
            const labels = new Int32Array(snapshot.nodeCount);

            for (let index = 0; index < snapshot.nodeCount; index++) {
                labels[index] = components.componentOf(snapshot.ids.idOf(index)) ?? 0;
            }

            against = snapshot;
            held = { labels, count: components.count };
        }

        return held;
    };
}

// ---------------------------------------------------------------------------------------------
// The style stack
// ---------------------------------------------------------------------------------------------

/**
 * Turn one of the element's default styles into the channels a layer writes.
 *
 * DERIVED RATHER THAN RESTATED, and that is the whole point of it. Every channel declares where
 * its value lands in a parsed style, so the element's base layer can be read straight out of
 * `defaultNodeStyle` and `defaultEdgeStyle` through that table. A hand-written list of channel
 * values would be a second copy of the defaults that nothing keeps in step: change the default
 * node colour and the base layer would go on painting the old one, with no test between the two
 * to notice.
 *
 * A path that holds an object -- a label's whole rich-text block, a gradient -- is skipped rather
 * than written. Those channels carry a composite value that a default does not settle, and a
 * layer that wrote half of one would paint something nobody asked for.
 * @param style - The element's default node or edge style.
 * @param target - Which half of the channel table to read.
 * @returns The literal values the element's own layer writes.
 */
function baseStyleOf(style: unknown, target: "node" | "edge"): StaticStyle {
    const written: StaticStyle = {};

    for (const descriptor of channelsFor(target)) {
        // A channel the element draws nothing for has no default to state, whatever happens to
        // sit at its style path.
        if (descriptor.accepts === "nothing") {
            continue;
        }

        const value = atStylePath(style, descriptor.stylePath);

        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            written[descriptor.channel] = value;
        }
    }

    return written;
}

/**
 * The layers the element owns, which sit at the bottom of every stack.
 *
 * TWO, not one, because a layer paints nodes or edges and never both. They are what gives an
 * element its appearance before any consumer has asked for anything, and they are marked as the
 * element's: `source.by === "element"` makes them `locked`, so removing, editing or moving one
 * is refused with `E_PROTECTED` and a consumer testing for them tests the SOURCE rather than the
 * name. Matching on the name is what the one consumer does today, and it cannot tell the
 * element's layer from a reader who called their own layer "default".
 *
 * There is no selection layer here, and there should not be. Selection used to be a layer whose
 * node half painted gold behind a result selector, which put the highlight into precedence
 * competition with the layers a reader had asked for. The session holds selection as a mask and
 * the renderer draws the highlight by construction, outside the stack entirely.
 *
 * Built per session rather than held as a module constant: `defaultNodeStyle` and
 * `defaultEdgeStyle` are mutable exported objects, and one shared derivation would freeze
 * whatever they happened to say when this module was first loaded.
 * @returns The element's own layers, in the order they are seeded.
 */
function elementBaseLayers(): readonly ElementLayerSpec[] {
    return [
        {
            name: "Node defaults",
            kind: "base",
            source: { by: "element", reason: "default" },
            target: "node",
            selector: { match: "everything" },
            set: baseStyleOf(defaultNodeStyle, "node"),
        },
        {
            name: "Edge defaults",
            kind: "base",
            source: { by: "element", reason: "default" },
            target: "edge",
            selector: { match: "everything" },
            set: baseStyleOf(defaultEdgeStyle, "edge"),
        },
    ];
}

/**
 * Every path this session can answer for one kind of element.
 * @param data - The session's data surface, which lists the attributes.
 * @param runs - The runs, which publish the rest.
 * @param target - Whether the asking layer paints nodes or edges.
 * @returns The paths, attributes first.
 */
function answerablePaths(data: SessionDataApi, runs: RunsApi, target: "node" | "edge"): readonly Path[] {
    const paths: Path[] = [];

    for (const attribute of data.attributes()) {
        if (attribute.kind === target) {
            paths.push(attribute.path);
        }
    }

    for (const run of runs.list()) {
        for (const field of run.fields) {
            if (field.kind === target) {
                // A field declared by its algorithm names the run as "$" until bound to this one.
                paths.push(bindResultPath(field.path, run.id));
            }
        }
    }

    // An edge's endpoints are answered from the snapshot, whichever keys its record arrived with.
    if (target === "edge") {
        for (const endpoint of ["data.source", "data.target"]) {
            if (!paths.includes(endpoint)) {
                paths.push(endpoint);
            }
        }
    }

    return paths;
}

/**
 * Which paths a layer may name, and what it might have meant instead.
 *
 * A path nothing answers is not a refusal: a selector naming a run that has not been started is
 * a correct selector over a session that will answer it later. It is REPORTED, so that a
 * consumer can say why a layer paints nothing rather than showing a confident empty screen.
 * @param data - The session's data surface.
 * @param runs - The runs this session holds.
 * @returns The directory.
 */
function pathDirectoryOf(data: SessionDataApi, runs: RunsApi): PathDirectory {
    return {
        // A note value is always answerable: it reads nothing until a note names the element.
        answers: (path: Path, target: "node" | "edge"): boolean =>
            noteFieldOf(path) !== undefined || answerablePaths(data, runs, target).includes(path),
        candidates: (_path: Path, target: "node" | "edge"): readonly Path[] => answerablePaths(data, runs, target),
    };
}

/**
 * The words one column goes by, for a legend that says "Connections" rather than
 * "results.degree.value".
 * @param data - The session's data surface.
 * @param runs - The runs this session holds.
 * @returns A reader for the words, answering undefined for a path nothing in the session names.
 */
function fieldWordsOf(
    data: SessionDataApi,
    runs: RunsApi,
): (path: Path, target: "node" | "edge") => FieldWords | undefined {
    return (path: Path, target: "node" | "edge"): FieldWords | undefined => {
        for (const attribute of data.attributes()) {
            if (attribute.path === path && attribute.kind === target) {
                return { plainName: attribute.plainName, technicalName: attribute.technicalName };
            }
        }

        for (const run of runs.list()) {
            for (const field of run.fields) {
                if (bindResultPath(field.path, run.id) === path && field.kind === target) {
                    return { plainName: field.plainName, technicalName: field.technicalName };
                }
            }
        }

        return undefined;
    };
}

/**
 * The run id behind any of the three ways a caller names a run.
 * @param ref - The run, its result, or its id.
 * @returns The run id.
 */
function runIdOf(ref: RunRef): RunId {
    if (typeof ref === "string") {
        return ref;
    }

    return "runId" in ref ? ref.runId : ref.id;
}

/**
 * Where `styles.encode()` and `styles.highlight()` look a run up.
 *
 * Handed in rather than assumed, because a session that cannot resolve a run must refuse to write
 * a layer bound to one: the layer would carry a selector matching nothing and say nothing about
 * why.
 * @param runs - The runs this session holds.
 * @returns The source.
 */
function encodingSourceOf(runs: RunsApi): EncodingSource {
    return {
        run: (ref: RunRef): EncodingRun | undefined => runs.get(runIdOf(ref)),
        runIds: (): readonly RunId[] => runs.list().map((run) => run.id),
    };
}

/**
 * The dense index of one node, for an explanation addressed by id.
 * @param readSnapshot - Reads the snapshot the indices address.
 * @returns The reader, answering undefined for an id this session holds no node for.
 */
function nodeIndexOf(readSnapshot: () => GraphSnapshot): (id: NodeId) => number | undefined {
    return (id: NodeId): number | undefined => {
        const index = readSnapshot().ids.indexOf(id);

        return index === INVALID_INDEX ? undefined : index;
    };
}

/**
 * The dense index of one edge, for an explanation addressed by id.
 *
 * The endpoint-pair index behind it is built once per snapshot and thrown away the moment a
 * freeze replaces one: an id map built from the graph as it was would answer confidently about
 * a row that now belongs to somebody else.
 * @param readSnapshot - Reads the snapshot the indices address.
 * @returns The reader, answering undefined for an id this session holds no edge for.
 */
function edgeIndexOf(readSnapshot: () => GraphSnapshot): (id: EdgeId) => number | undefined {
    let against: GraphSnapshot | null = null;
    let space: MaskIdSpace<EdgeId> | null = null;

    return (id: EdgeId): number | undefined => {
        const graph = readSnapshot();

        if (against !== graph || space === null) {
            against = graph;
            space = edgeSpaceOf(graph);
        }

        const index = space.indexOf(id);

        return index === INVALID_INDEX ? undefined : index;
    };
}

/**
 * Wrap the repaint so that a pass over data that has moved prepares its bindings again.
 *
 * A prepared binding's domain, its percentile clamp and its category list are properties of the
 * COLUMN it was prepared against, settled once and then read rather than recomputed. When the
 * graph behind that column is replaced -- a load, a compacting freeze -- they describe data that
 * is gone, and the pass would paint a picture of the previous graph without saying so. The
 * identity of the snapshot is what says it happened, and it is one compare per pass.
 * @param engine - The repaint engine.
 * @param readSnapshot - Reads the snapshot the pass will run against.
 * @returns The repaint the styles API takes, and the invalidation a published run triggers.
 */
function repaintAgainstCurrentData(
    engine: RepaintEngine,
    readSnapshot: () => GraphSnapshot,
): {
    paint: ElementPaint;
    repaint: RepaintEngine["repaint"];
    repaintElements: RepaintEngine["repaintElements"];
    encoding: RepaintEngine["encoding"];
    invalidate: () => void;
} {
    let painted: GraphSnapshot | null = null;
    /** The snapshot whose index space the engine's record of what each layer painted is in. */
    let indexedBy: GraphSnapshot | null = null;

    /**
     * Prepare the bindings again when the graph behind them has been replaced.
     *
     * One identity compare, in front of BOTH doors into the pass: a renderer's first draw runs
     * against data that has just arrived, which is the moment a stale domain is most likely and
     * least visible.
     */
    const againstCurrentData = (): void => {
        const graph = readSnapshot();

        if (painted !== graph) {
            engine.invalidate();
            painted = graph;
        }

        // Its own identity rather than `painted`, which a published run clears without the
        // elements being renumbered at all.
        if (indexedBy !== graph) {
            engine.renumbered();
            indexedBy = graph;
        }
    };

    return {
        // The renderer's half: reads, plus the first draw. It carries neither `repaint` nor
        // `invalidate`, so a renderer cannot paint behind the stack's back.
        paint: {
            repaintAll: async (stack, context) => {
                againstCurrentData();

                return engine.repaintAll(stack, context);
            },
            styleOf: (target, index) => engine.styleOf(target, index),
            plainText: (target, index, channel) => engine.plainText(target, index, channel),
            meshKeyOf: (target, index) => engine.meshKeyOf(target, index),
            meshStyleOf: (target, key) => engine.meshStyleOf(target, key),
            meshCount: (target) => engine.meshCount(target),
            lastPainted: (target) => engine.lastPainted(target),
            onPainted: (listener) => engine.onPainted(listener),
            painting: () => engine.painting(),
            problems: () => engine.problems(),
        },
        repaint: async (request, context) => {
            againstCurrentData();

            return engine.repaint(request, context);
        },
        repaintElements: async (stack, dirty, context) => {
            againstCurrentData();

            return engine.repaintElements(stack, dirty, context);
        },
        // A READ, so it does NOT re-prepare against current data first. Two reasons, and the
        // second is the load-bearing one. `againstCurrentData` would forget what the pass
        // prepared, and a legend asked for between a data change and the repaint that answers it
        // would report nothing about a picture that is still on screen -- which happens on an
        // ordinary re-run, where the auto-apply policy declines and nothing repaints. And a
        // domain is settled against the element count the pass last sized its stores to, so
        // preparing here rather than in a pass would invent one.
        encoding: (entry) => engine.encoding(entry),
        invalidate: (): void => {
            engine.invalidate();
            painted = null;
        },
    };
}

/**
 * Build a graph session.
 *
 * With no arguments it builds a graph of its own: its own store, its own coordinates, its own
 * accelerator, disposed with it. That is the headless case -- a CI job, a Node test, a check on
 * a server -- and it needs no canvas, no GPU and no DOM.
 *
 * The session is the only writer of its graph and settings, which is what makes every change an
 * undoable step: data arrives through `session.data.import`, `addNodes` and `addEdges`, and
 * settings through `session.config.set`.
 * @param options - the starting configuration, the accelerator and how runs execute, each
 *     optional
 * @returns the session
 * @example
 * ```ts
 * import { createGraphSession } from "@graphty/graphty-element/session";
 *
 * const session = createGraphSession();
 * console.log(session.status.counts.nodes, session.data.statistics().components.count);
 * session.dispose();
 * ```
 */
export function createGraphSession(options: CreateGraphSessionOptions = {}): GraphSession {
    // Only the published options, even from a caller the types did not check: a store or a record
    // source handed in would make that caller a second writer of the graph.
    const { config, acceleration, runs } = options;
    return buildSession({
        ...(config === undefined ? {} : { config }),
        ...(acceleration === undefined ? {} : { acceleration }),
        ...(runs === undefined ? {} : { runs }),
    });
}

/**
 * Build the session a `<graphty-element>` draws.
 *
 * The same object {@link createGraphSession} builds, typed so that the render loop can reach the
 * live selection and visibility masks. It is not a privileged session and it holds nothing extra:
 * the difference is a shape one, and it exists because a renderer tests one element at a time
 * where a consumer reads a list of ids.
 * @param options - The store, the record source, the configuration and the accelerator.
 * @param internals - The history clock and queue, which only the element's own tests replace.
 * @returns The session.
 */
export function createElementSession(
    options: ElementSessionOptions = {},
    internals: SessionInternals = {},
): ElementSession {
    return buildSession(options, internals);
}

/**
 * Assemble one session.
 *
 * The order below is the one the three new models force, and the reason is that each of them can
 * name the other two: a scope can be `"selection"` or `"visible"`, a selection can be taken from
 * a scope, and a filter records the scope it walked. So the resolver is built first over readers
 * that reach the other two through a function call, and they are built afterwards holding the
 * resolver itself. Nothing reads through those readers during construction.
 * @param options - What the caller asked for.
 * @param internals - The history clock and queue, when a test replaces them.
 * @returns The session.
 */
function buildSession(options: ElementSessionOptions, internals: SessionInternals = {}): Session {
    const runsOptions = options.runs ?? {};
    // ONE queue for both, whether the host handed one in or not: a filter pass and an algorithm
    // run both read the whole graph, and two queues would let one start while the other is
    // halfway through. A rendered graph hands in the element's own, so a filter also takes its
    // turn among the loads, the layouts and the style passes. A queued command (an import) takes
    // its turn there too, unless the host hands in a scheduler of its own.
    const queue = runsOptions.queue ?? createLocalRunQueue();

    // Built first: the project settings, which the store and the data surface read, live in its
    // `config` slice, and the scope resolver, the visibility model and the style stack live in its
    // other slices and write through it.
    const dispatcher = new Dispatcher({
        definitions: DEFINITIONS,
        ...(internals.now === undefined ? {} : { now: internals.now }),
        scheduler: internals.scheduler ?? runQueueScheduler(queue),
        baselineWindow: internals.baselineWindow === true,
    });
    const readProject = projectConfigReader(dispatcher, resolveDataConfig(options.config?.data));
    dispatcher.services.config = readProject;
    const readData = (): SessionDataConfig => readProject().data;
    // A controller handed in is the authority on its own policy: the session does not own it, so
    // it cannot make a configuration value true merely by declaring it.
    const policy = options.acceleration?.policy ?? options.config?.acceleration?.policy ?? ACCELERATION_POLICY_DEFAULT;
    // Undefined stays undefined: a threshold nobody set leaves the controller's built-in
    // per-capability floors in force, and a 0 written here would count as the consumer's own.
    const minNodes = options.acceleration?.minNodes ?? options.config?.acceleration?.minNodes;
    const watchers: Watchers = new Map();
    dispatcher.services.progress = (change) => {
        publish(watchers, "progress:changed", change);
    };

    // Assigned below, and read only from inside a callback: a store this session built delivers
    // its freeze remaps here, and a freeze cannot happen before the store exists.
    let selection: SelectionOwner | null = null;

    // The style stack, late-bound because the runs are built before it and the auto-apply policy
    // hands a run's derived layer to it. A thunk rather than a captured object for the reason the
    // policy's own `styles` member states: a session that paints nothing is a legitimate session,
    // and the stack does not exist yet at the moment the runs are constructed.
    let stack: SessionStylesApi | null = null;
    // The query engine, late-bound for the same reason: it reads the style layers' selector
    // source, which reads the runs, and the scope and visibility APIs are built before both.
    let query: QueryEngine | null = null;

    const store = resolveStore(options.store, readData, {
        nodes: (remap: U32, count: number) => selection?.remapNodes(remap, count),
        edges: (remap: U32, count: number) => selection?.remapEdges(remap, count),
    });
    // The attribute revisions and the input tick (design/sets 6.2), shared with whoever writes the
    // store's records: the store owner's, so its writes, its freezes and this session's masks and
    // runs all advance one tick.
    const inputs = (store.store as { readonly inputs?: InputCounters }).inputs ?? inputCountersOf(store.store);
    const advanceTick = (): void => {
        inputs.tick.advance();
    };
    const acceleration = resolveAcceleration(options.acceleration, policy, minNodes);
    const snapshot = (): GraphSnapshot => store.store.getSnapshot();
    dispatcher.arrangement.bind({
        snapshot,
        get positions() {
            return store.store.positions;
        },
        holdsNoRows: () => (store.store instanceof GraphStore ? store.store.holdsNoRows : true),
        get stale() {
            return (store.store as { readonly stale?: boolean }).stale === true;
        },
    });
    const slice = (): GraphSlice => dispatcher.state.graph;
    // What the records say, from the `graph` slice every primitive fills, then from a host's own
    // source for rows it wrote some other way.
    const records = sliceRecords(
        slice,
        snapshot,
        () => (slice().values.get("importReport") as ImportReport | undefined) ?? store.store.lastImport ?? null,
        options.records ?? null,
    );
    const data = new SessionData(
        store.store,
        records,
        readData,
        {
            dispatch: (mutation) => dispatcher.dispatch({ op: "data.apply", mutation }),
            importer: () => dispatcher.capturedDispatch(),
            slice,
            declare: (column, declaration) => dispatcher.dispatch({ op: "data.declare", column, declaration }),
            setSource: (source) => dispatcher.dispatch({ op: "data.setSource", source }),
            declarations: () => dispatcher.state.attributes,
        },
        {
            revision: () => inputs.tick.value,
            // Read through a call: the resolver is built below.
            resolve: (spec: ScopeInput) => scope.resolveNow(scope.canonical(spec)),
            // And the query engine, below that.
            search: (text, request) => requireQuery(query).search(text, request),
            textTest: (text, mode, target) => requireQuery(query).textTest(text, mode, target),
            // Read through calls: the runs are built below.
            run: (id: RunId) => runs.get(id),
            runIds: () => runs.list().map((run) => run.id),
        },
    );
    // A session that holds a store of its own kind writes it through its own ingest; the element
    // hands its data manager's in instead.
    if (store.store instanceof GraphStore) {
        dispatcher.services.data = headlessDataService(store.store, dispatcher, readData);
    }

    const components = componentLabelsOf(data);
    // Kept sets, published as `session.sets`.
    const edgeMember = (id: EdgeId): EdgeMember | undefined =>
        sessionEdgeMember(snapshot(), id, (row) => records.edgeAttributes(row), readData().knownFields.edgeIdPath);
    // What a `{ set }` reference names and what "visible" reads, so a door can refuse a chain of
    // references that loops (design/sets 5.2). Read through calls: the sets and the visibility
    // API are built below.
    const dependencies: DependencySources = {
        referent: (id: SetId) => setsStoreOf(sets).get(id)?.definition,
        visibility: () => visibility.filter,
        pathsOf: (where: Query) => requireQuery(query).pathsOf(where),
        shapeOf: (run: RunId) => runs.get(run)?.result?.shape,
        fieldKinds: (path: Path) => fieldKindsOf(path, data, (run) => runs.get(run)?.result?.fields),
    };
    // One resolution cache for the scope resolver and the status reads of its last passes.
    const setsCache = new SetsCache();
    // What status and "Used by" read of a run. Late-bound: the runs are built below.
    const statusRun = (run: Run): StatusRun => ({
        id: run.id,
        label: run.label,
        algorithm: run.algorithm,
        registered: SESSION_CATALOG_TABLES.algorithms().some((descriptor) => descriptor.key === run.algorithm),
        execution: executionOf(run.id),
        scope: run.record.scope,
        scopeMoved: () => run.stale !== null,
        captures: runs.heldOf(run.id),
    });
    // Offers and Memberships. Read through calls: the runs and the scope resolver are built below.
    const offerRun = (run: Run): { id: RunId; label: string; result: Run["result"] } => ({
        id: run.id,
        label: run.label,
        result: run.result,
    });
    const offering = createOffering({
        run: (id: RunId) => {
            const run = runs.get(id);
            return run === undefined ? undefined : offerRun(run);
        },
        runs: () => runs.list().map(offerRun),
        values: (id: RunId) => resultSource(id),
        context: () => scope.contextNow(),
        sets: () => keptSets.list(),
    });
    // Users of sets the element adds from outside the session: its running layout.
    const hostUsers: SetsUsersProvider[] = [];
    const sets = createSetsApi({
        dispatcher,
        edgeMember,
        pairsOrdered: () => pairsOrdered(snapshot()),
        dependencies,
        offering,
        executionOf: (run: RunId) => executionOf(run),
        runs: {
            get: (id: RunId) => {
                const run = runs.get(id);
                return run === undefined ? undefined : statusRun(run);
            },
            list: () => runs.list().map(statusRun),
        },
        outcome: (record) => outcomeOf(setsCache, record),
        // Read through calls: the scope resolver and the selection are built below.
        // Style layers naming a set are its users too; the stack is built below.
        // So is the visibility filter, once however many of its leaves name the set.
        users: () => [
            ...(stack?.list() ?? []).flatMap((layer) =>
                layer.selector.match === "member"
                    ? [{ user: { kind: "layer" as const, id: layer.id, label: layer.name }, scope: layer.selector.of }]
                    : [],
            ),
            ...(visibility.filter === null
                ? []
                : [{ user: { kind: "filter" as const, label: "Visibility filter" }, scope: visibility.filter }]),
            ...hostUsers.flatMap((provider) => [...provider()]),
            // And notes naming it, labeled with the note's first line (design/notes 5.7). A set a file
            // named is that file's, not this session's set of the same id.
            ...[...dispatcher.state.notes.values()].flatMap((entry) =>
                boundTargets(entry).flatMap((target) =>
                    "set" in target
                        ? [
                              {
                                  user: {
                                      kind: "note" as const,
                                      id: entry.note.id,
                                      label: firstLineOf(entry.note.text),
                                  },
                                  scope: { set: target.set },
                              },
                          ]
                        : [],
                ),
            ),
        ],
        materialise: createMaterialiser({
            snapshot,
            resolve: (spec: Scope) => scope.resolutionOf(spec),
            readingOf: (spec: Scope) => scope.readingOf(spec),
            edgeMember,
            selection: () => ({
                nodes: requireSelection(selection).nodeMembers(),
                edges: requireSelection(selection).edgeMembers(),
            }),
            offering,
        }),
    });
    const keptSets = setsStoreOf(sets);
    // Change notification (design/sets 11): live users of a set re-resolve from here, before any
    // public event. The store owner's side -- freezes and attribute writes -- arrives on the tick.
    const notifier = new SetsNotifier();
    keptSets.onCommit((changes) => {
        notifier.notify({ kind: "sets", ids: changes.map((change) => change.id) });
    });
    // The attribute fields record edits changed since the graph hook last ran, by element: what
    // lets it repaint only the layers that read them.
    const edited = { node: new Set<string>(), edge: new Set<string>() };
    const stopHearing = inputs.tick.listen((input) => {
        if (input.kind === "attributes") {
            for (const field of input.fields) {
                edited[input.element].add(field);
            }
        }

        notifier.notify(input);
    });
    keptSets.onChange((change) => {
        publish(watchers, "set:changed", change);
    });

    // The token of the result a predicate reads; a result published with none (an executor
    // outside the runs API) stands for itself, so a new result is never read as the old one.
    const executionOf = (run: RunId): string | undefined => {
        const result = runs.get(run)?.result;

        return result === undefined ? undefined : (resultExecutionOf(results, run) ?? `#${identityOf(result)}`);
    };
    // A run's current result as an `item` or `threshold` leaf reads it, by dense index.
    const resultSource = (run: RunId): FilterRunResult | undefined => {
        const result = runs.get(run)?.result;
        if (result === undefined) {
            return undefined;
        }

        const graph = snapshot();
        const space = edgeSpaceOf(graph);

        return {
            execution: executionOf(run),
            fields: result.fields,
            nodeValue: (index: number, field: string): unknown => result.node(graph.ids.idOf(index))?.[field],
            edgeValue: (index: number, field: string): unknown => result.edge(space.idOf(index))?.[field],
        };
    };

    /**
     * Pin a scope's cache entry: the kept set's definition, else the canonical scope.
     * @param spec - The scope.
     * @returns Releases the pin.
     */
    const pinScope = (spec: Scope): (() => void) => {
        const key = typeof spec === "object" && "set" in spec ? keptSets.get(spec.set)?.definition : canonicalize(spec);
        return key === undefined ? () => undefined : setsCache.pin(key);
    };

    const scope: ScopeResolver = createScopeApi({
        snapshot,
        store: store.store,
        components,
        // Read through a call rather than captured: both of these are built below, and the
        // resolver only reaches them when somebody resolves a scope that names them.
        selection: { nodes: () => requireSelection(selection).nodeMembers() },
        visibility: {
            nodes: () => visibility.masks.nodes(),
            edges: () => visibility.masks.edges(),
        },
        match: (where: Query) => requireQuery(query).nodes(where),
        pathsOf: (where: Query) => requireQuery(query).pathsOf(where),
        revisions: inputs.nodes,
        edgeRevisions: inputs.edges,
        executionOf,
        result: resultSource,
        captured: (item: ResultItem) => captureOf(runs.heldOf(item.result), item),
        cache: setsCache,
        tick: inputs.tick,
        sets,
        edgeMember,
        fieldKinds: dependencies.fieldKinds,
        matchEdges: (where: Query) => requireQuery(query).edges(where),
        values: valueSourceOf(records, snapshot),
    });

    const visibility = createVisibilityApi({
        snapshot,
        components,
        dispatcher,
        dependencies,
        admit: (filter: RuleTree) => scope.admit(filter),
        scope: (spec: Scope) => scope.leafOf(spec),
        // The resolver's context turns a capture into bitmaps over the current snapshot.
        captured: (item: ResultItem) => scope.contextNow().captured?.(item),
        watch: {
            subscribe: (watch) => notifier.subscribe(watch),
            signature: (spec: Scope) => scopeSignature(spec, scope.contextNow()),
            pin: (spec: Scope) => pinScope(spec),
        },
        resolveScope: (spec: Scope) => scope.resolveNow(spec),
        match: (where: Query) => requireQuery(query).nodes(where),
        matchEdges: (where: Query) => requireQuery(query).edges(where),
        unresolvedPathsOf: (where: Query) => requireQuery(query).unresolvedPathsOf(where),
        ...(runsOptions.engine === undefined ? {} : { engine: runsOptions.engine }),
        result: resultSource,
        values: valueSourceOf(records, snapshot),
        onChange: (change) => {
            notifier.notify({ kind: "visibility" });
            publish(watchers, "visibility:changed", change);
        },
        onMaskVersion: advanceTick,
    });

    const defaultScope: Scope = runsOptions.defaultScope ?? "visible";
    /** The result each run last announced, so the tick advances when one is published or cleared. */
    const resultsSeen = new Map<RunId, unknown>();
    /**
     * A run's scope, refused when it reads a removed set. A layer or filter naming a removed set
     * keeps reading its kept record, but new work over one is refused (design/sets 15.3, item 33).
     * @param spec - The scope.
     * @returns The same scope.
     */
    const attached = (spec: Scope): Scope => {
        if (typeof spec === "object" && ("set" in spec || "define" in spec)) {
            const gone = sets.status(spec).reasons.find((reason) => reason.kind === "missing-set");
            if (gone !== undefined) {
                throw new GraphtyError({
                    code: "E_BAD_COMMAND",
                    message: `The set "${gone.name}" was removed, so a run cannot read it. Restore it or choose another set.`,
                    source: "run",
                    target: { kind: "scope", id: gone.id },
                    details: { scope: spec, reason: "missing-set", id: gone.id, name: gone.name },
                });
            }
        }

        return spec;
    };
    const canned: CannedOutcomes = new Map();
    const runs = createRunsApi({
        queue,
        // Finished runs are the `runs` slice, recorded in this session's history.
        dispatcher,
        catalog: SESSION_CATALOG_TABLES,
        resolveScope: (spec: Scope) => scope.resolveNow(attached(spec)),
        admitScope: (spec: ScopeInput) => scope.admit(spec) as Scope,
        // A derived run id hashes what a live keyword stands for now, so the same unscoped call
        // under another filter or selection is another result (design/sets 15.3, item 34).
        liveScope: (keyword: LiveKeyword) =>
            keyword === "visible"
                ? { filter: visibility.filter, window: visibility.window }
                : frozenSelection(requireSelection(selection).nodeMembers().ids()),
        scopeFacts: (spec: Scope) => {
            const reading = readingOfScope(spec, referentReading(dependencies)) as EdgeReading;
            const kept = typeof spec === "object" && "set" in spec ? sets.get(spec.set) : undefined;

            return kept === undefined ? { reading } : { set: { id: kept.id, revision: kept.revision }, reading };
        },
        setName: (id: SetId) => sets.get(id)?.name,
        execute: sharingIndexes(
            answeringFromProject(runsOptions.execute ?? refuseToExecute, canned),
            snapshot,
            () => dispatcher.state.graph.token,
        ),
        engine: runsOptions.engine ?? ENGINE_VERSIONS,
        defaultScope,
        onExecution: advanceTick,
        onRemoved: (id: RunId) => {
            resultsSeen.delete(id);
            advanceTick();
            notifier.notify({ kind: "run", run: id });
        },
        // Before a re-run replaces a result, what kept rules, style layers and the visibility filter
        // hold of it is captured onto the run (design/sets 5.2).
        captureHeld: (runId: RunId, prior: HeldCaptures) => {
            const result = resultSource(runId);
            const graph = snapshot();
            const space = edgeSpaceOf(graph);
            const held = heldItems(
                [
                    ...keptSets.list().map((set) => set.definition),
                    ...layerScopesOf(stack),
                    visibility.filter,
                    // A note's item target selects what its run held (design/notes 5.6).
                    ...[...dispatcher.state.notes.values()].flatMap((entry) =>
                        boundTargets(entry).flatMap((target) =>
                            "item" in target ? [{ kind: "item", item: target.item }] : [],
                        ),
                    ),
                ],
                runId,
            );

            return nextCaptures(
                prior,
                held,
                executionOf(runId),
                result === undefined
                    ? undefined
                    : (key) => captureItem(result, key, graph, (row) => edgeMember(space.idOf(row))),
            );
        },
        ...(runsOptions.defaultCaveats === undefined ? {} : { defaultCaveats: runsOptions.defaultCaveats }),
        // ONE POLICY, EVERY ROUTE. A run paints itself on its first completion, from the encoding
        // its own shape derives -- see `./styles/autoApply` for the six rules and `./styles/derive`
        // for what a shape suggests. It is handed in here rather than called at each door because
        // the console, the panel, an agent's tool call and a bare `runs.start()` all end at this
        // one API, and a decision made at the doors is a decision made more than once.
        styling: createAutoApplyPolicy({
            styles: () => stack ?? undefined,
            // WHERE A REFUSAL GOES WHEN NOBODY ASKED FOR THE LAYER. The element paints a run's
            // suggestion in the step that records the run, which nobody called for layer by
            // layer, so a refused suggestion has no call site to arrive at. The run is still
            // recorded without it, and the refusal is published here rather than swallowed --
            // a graph that kept its old picture while the element believed it had painted a new
            // one is the silent failure the whole style system exists to replace.
            onProblem: (runId, error) => {
                publish(watchers, "style:problem", {
                    runId,
                    error: isGraphtyError(error)
                        ? error
                        : new GraphtyError({
                              code: "E_INTERNAL",
                              message: `Applying the styling suggested by run "${runId}" failed.`,
                              source: "style",
                              target: { kind: "run", id: runId },
                              cause: error,
                          }),
                });
            },
        }),
        // WHICH LAYERS READ A RUN, which is the question behind "Removes 2 style layers" on a
        // confirmation dialog and behind not leaving a layer pointing at a column that has gone.
        // A layer records the run it came from in its own `source`, so this is a read of the
        // stack rather than a second register that could disagree with it. Late-bound for the
        // same reason the policy above is: the stack is built from this API and cannot exist yet.
        // A layer's removal with its run is planned into the removal's own step, through this
        // dispatcher's style stack; only the question of which layers read a run is asked here.
        layers: {
            bindings: (runId) =>
                (stack?.list() ?? [])
                    .filter((layer) => layer.source.by === "run" && layer.source.runId === runId)
                    .map((layer) => layer.id),
        },
        onChange: (change) => {
            // The token is minted when the work starts, but the result it stamps is published
            // later (and a re-run clears it when queued). A signature memoised under the tick in
            // between would go on reading the result as it was, so the tick advances again
            // whenever the result a run holds is not the one it last held.
            // Read through the session's run, which a re-run replaces, not the announced object.
            const result = runs.get(change.run.id)?.result;
            if (result !== resultsSeen.get(change.run.id)) {
                resultsSeen.set(change.run.id, result);
                advanceTick();
            }

            if (change.phase !== "start" && change.phase !== "progress") {
                notifier.notify({ kind: "run", run: change.run.id });
            }

            publish(watchers, "run:changed", change);
            // The announced record is a snapshot without the progress; the live run holds it.
            const progress = runs.get(change.run.id)?.progress;
            if (progress !== undefined && (change.phase === "progress" || change.phase === "end")) {
                const { completed, total, fraction } = progress;
                publish(watchers, "progress:changed", {
                    task: "run",
                    run: change.run.id,
                    phase: change.phase,
                    completed,
                    total,
                    fraction,
                });
            }
        },
    });

    const results = createResultsApi({
        entry: (id) => runEntry(runs, id),
        entries: () => runs.list().map((run) => toResultsEntry(run)),
    });

    // Notes, published as `session.notes`: a result a note names is known while its run is, and
    // a cite or an item pins the token of its current finished run.
    const noteResult = (id: RunId): { readonly execution: string | undefined } | undefined =>
        runs.get(id) === undefined ? undefined : { execution: executionOf(id) };
    const notes = createNotesApi({
        dispatcher,
        edgeMember,
        status: {
            snapshot,
            visible: {
                node: (row: number) => visibility.masks.nodes().has(row),
                edge: (row: number) => visibility.masks.edges().has(row),
            },
            set: (id: SetId) => keptSets.get(id),
            result: noteResult,
        },
        onChange: (change) => {
            publish(watchers, "note:changed", change);
        },
    });

    // The real columns, read per element and never captured: a compiled selector stays correct
    // across a freeze that renumbers the index space because every lookup starts from the
    // snapshot the session holds NOW.
    const elements: SessionSelectorSource = createSelectorSource({
        snapshot,
        results: (runId) => runs.get(runId)?.result,
        records,
        notes: createNoteFacts(
            () => dispatcher.state.notes,
            () => dispatcher.lane.writes("notes"),
            snapshot,
        ),
    });
    // ONE query engine, over the same source the style layers read, so a layer selector and a
    // scope, a selection or a filter with the same expression match the same elements.
    const paths = pathDirectoryOf(data, runs);
    query = createQueryEngine({
        snapshot,
        revision: () => inputs.tick.value,
        elements,
        answers: (path, target) => paths.answers(path, target),
        searchPaths: () =>
            data
                .attributes()
                .filter((attribute) => attribute.kind === "node")
                .map((attribute) => attribute.path),
        edgeSearchPaths: () =>
            data
                .attributes()
                .filter((attribute) => attribute.kind === "edge")
                .map((attribute) => attribute.path),
        labelPath: () => {
            const key = readData().knownFields.nodeLabelPath;
            return key === null ? null : `data.${key}`;
        },
        idPath: () => `data.${readData().knownFields.nodeIdPath}`,
        excluded: (target, index) =>
            !(target === "node" ? visibility.masks.nodes() : visibility.masks.edges()).has(index),
    });
    const engine = query;

    selection = createSelectionApi({
        snapshot,
        scope,
        results,
        match: (where: Query) => engine.select(where),
        find: (text: string, mode: SelectionTextMode) => engine.find(text, mode),
        note: (id: NoteId, target: number | undefined) => {
            const status = notes.status(id);
            return noteMembers(notes.get(id)?.targets ?? [], status, snapshot(), target);
        },
        records,
        onChange: (delta) => {
            notifier.notify({ kind: "selection" });
            publish(watchers, "selection:changed", delta);
        },
        onMaskVersion: advanceTick,
    });

    // ONE registry for the stack and for the pass that paints from it. Two would let a layer be
    // accepted against a scale the repaint then could not find, which reads as a layer that
    // validated and paints nothing.
    const scales = createScaleRegistry();
    // The columnar pass, over the session's own data. It resolves what every element shows and
    // stops there: binding a renderer to those columns is a separate step, and nothing here
    // reaches one.
    const painter = repaintAgainstCurrentData(
        createLayerRepaint({
            nodeCount: () => snapshot().nodeCount,
            edgeCount: () => snapshot().edgeCount,
            elements,
            // What makes a run-bound layer cost its RUN rather than the graph: a layer selecting
            // the elements one run measured walks that run's 300 rows, not the graph's 50,000.
            measured: elements.measured,
            scales,
        }),
        snapshot,
    );

    const teardown = new AbortController();
    // The live scopes `{match:"member"}` layers test (design/sets 11): each watches its scope and
    // repaints exactly the elements that moved, or both halves whole after a freeze.
    const layerScopes = new LayerScopes({
        snapshot,
        resolve: (spec: Scope) => scope.resolutionOf(spec),
        signature: (spec: Scope) => scopeSignature(spec, scope.contextNow()),
        subscribe: (watch) => notifier.subscribe(watch),
        pin: (spec: Scope) => pinScope(spec),
        repaint: (dirty) => {
            if (stack === null || (dirty.node.length === 0 && dirty.edge.length === 0)) {
                return undefined;
            }

            return painter
                .repaintElements(stack.compiled(), dirty, { signal: teardown.signal, report: () => undefined })
                .catch((error: unknown) => {
                    if (!teardown.signal.aborted) {
                        console.error("[graphty] Could not repaint the layers naming a set that changed.", error);
                    }
                });
        },
    });
    teardown.signal.addEventListener("abort", () => {
        stopHearing();
        layerScopes.dispose();
        notifier.dispose();
    });
    const styles = createStylesApi({
        dispatcher,
        elements: { ...elements, scope: (spec: Scope) => layerScopes.live(spec) },
        admitScope: (spec: unknown) => scope.admit(spec),
        base: elementBaseLayers(),
        paths,
        scales,
        runs: encodingSourceOf(runs),
        columns: {
            attributes: () => data.attributes(),
            declaration: (column) => dispatcher.state.attributes.get(declarationKey(column)),
        },
        nodeIndex: nodeIndexOf(snapshot),
        edgeIndex: edgeIndexOf(snapshot),
        field: fieldWordsOf(data, runs),
        repaint: painter.repaint,
        // What `styles.legend()` and `styles.explain()` read: the bindings the last pass actually
        // painted from. Without it both verbs fall back to "nothing is prepared" and report an
        // empty picture on a graph that is plainly painted.
        encoding: painter.encoding,
        // THE SAME QUEUE the runs and the filters take their turn in. A style write that ran
        // beside a load would paint half a graph and then be handed the other half.
        queue,
        resolveScope: (spec: Scope) => scope.resolveNow(spec),
        engine: runsOptions.engine ?? ENGINE_VERSIONS,
        onChange: (change) => {
            // Only the scopes the stack names stay live.
            layerScopes.keep(layerScopesOf(stack));
            publish(watchers, "style:changed", change);
        },
        disposed: teardown.signal,
    });

    stack = styles;

    // The `runs` hook: a run whose entry changed -- recorded, re-run, undone, redone -- has
    // replaced the columns under `results.<runId>`, which any layer may read (a run's own layers,
    // and a reader's layer selecting on the run's values), so what was prepared is forgotten and
    // every layer kept across the change is repainted. Layers added or removed with the run are
    // the `styles` hook's, which runs after this one.
    dispatcher.lane.register("runs", async (rendered, target, dirty) => {
        if (![...dirty].some((id) => rendered.runs.get(id) !== target.runs.get(id))) {
            return;
        }

        painter.invalidate();
        const kept = new Set(rendered.styles);
        // ponytail: repaints every kept layer, not only those reading the changed runs -- the
        // cost the element paid before on every finished run; name the readers if it shows.
        const edits = target.styles
            .filter((entry) => kept.has(entry))
            .map((entry) => ({ previous: entry, next: entry }));

        if (edits.length > 0) {
            await painter.repaint({ reason: "update", edits, stack: target.styles, fromIndex: 0 }, RUNS_PASS);
        }
    });

    // The `notes` hook: a note written, edited, removed, merged, undone or redone moves the
    // `graphty.notes.*` values of the nodes and edges it names (design/notes 8.3), so the layers
    // reading one are repainted over what they matched before and match now, from the lowest of
    // them up. A stack reading no note path paints nothing.
    // ponytail: a reader repaints all it matches, not only the elements whose notes changed, so a
    // domain over the count stays whole; paint the changed rows alone if a big noted graph shows it.
    dispatcher.lane.register("notes", async (rendered, target, dirty) => {
        const readers = target.styles.filter((entry) => entry.reads.some(isNotePath));
        if (readers.length === 0 || ![...dirty].some((id) => rendered.notes.get(id) !== target.notes.get(id))) {
            return;
        }

        painter.invalidate();
        const edits = readers.map((entry) => ({ previous: entry, next: entry }));
        const fromIndex = target.styles.indexOf(readers[0]);
        await painter.repaint({ reason: "update", edits, stack: target.styles, fromIndex }, RUNS_PASS);
    });

    // The `graph` hook of a session with no renderer: a layer may select on any value a data
    // command wrote, and a node a command added has no paint until a pass reaches it. So a change
    // to the rows -- an add, a removal, a replace, a weight or the direction, forward or on undo
    // and redo -- repaints every layer. A change to records' attributes alone repaints only the
    // layers that read a field it changed, from the lowest of them up: a record edit the stack does
    // not read paints nothing. A renderer that reconciles its own objects and repaints from there
    // takes this over; see `handGraphPaintToRenderer`.
    HEADLESS_GRAPH_PAINT.set(
        dispatcher,
        dispatcher.lane.register("graph", async (_rendered, target, dirty) => {
            const changed = { node: [...edited.node], edge: [...edited.edge] };
            edited.node.clear();
            edited.edge.clear();
            // Undone rows wait to be rebuilt until something reads the graph, so a run of undos
            // rebuilds it once; painting now would read it. The picture catches up at the next
            // pass over a settled graph.
            // ponytail: no pass is owed for it; repaint on the store's next rebuild if a headless
            // reader needs the picture current between an unawaited undo and its next edit.
            if (target.styles.length === 0 || store.store.deferring === true) {
                return;
            }

            const recordsOnly = ![...dirty].some(
                (key) => key === ROWS_MOVED || !(key.startsWith("n:") || key.startsWith("e:") || key.startsWith("v:")),
            );
            const readers = recordsOnly
                ? target.styles.filter((entry) => readsAnyField(entry, changed))
                : target.styles;
            if (readers.length === 0) {
                return;
            }

            painter.invalidate();
            const edits = readers.map((entry) => ({ previous: entry, next: entry }));
            const fromIndex = target.styles.indexOf(readers[0]);
            await painter.repaint({ reason: "update", edits, stack: target.styles, fromIndex }, RUNS_PASS);
            if (recordsOnly) {
                // The layers above paint what the edited field's readers match now; an element the
                // edit took out of a reader's match is found by its own row, repainted whole.
                await painter.repaintElements(target.styles, editedRows(snapshot(), dirty), RUNS_PASS);
            }
        }),
    );

    const planning = planningContext(
        runsOptions,
        data,
        (spec: Scope) => scope.resolveNow(spec),
        defaultScope,
        acceleration.controller,
        () => keptSets.list(),
    );

    const session = new Session({
        store: store.store,
        ownedStore: store.owned,
        data,
        // THE SAME COST MODEL THE BUTTON ASKS. A metric listing quotes the number a run of that
        // metric would be estimated at, so it is produced by the estimate rather than by a second
        // model beside it: one source, consulted twice, cannot disagree with itself.
        catalog: createSessionCatalog({
            algorithms: () => SESSION_CATALOG_TABLES.algorithms(),
            estimate: (algorithm) => estimateCommand(planning, { op: "algo.run", algorithm }),
            runs: () => runs.list(),
        }),
        readProject,
        controller: acceleration.controller,
        ownedAcceleration: acceleration.owned,
        runs,
        results,
        scope,
        sets,
        notes,
        selection,
        visibility,
        styles,
        stopStyleEdits: () => {
            teardown.abort(new DOMException("The session was disposed.", "AbortError"));
        },
        paint: painter.paint,
        planning,
        watchers,
        dispatcher,
        canned,
    });
    sessionInputs.set(session, inputs);
    sessionScopes.set(session, scope);
    sessionNotifiers.set(session, notifier);
    sessionHostUsers.set(session, hostUsers);

    return session;
}

/**
 * The rows of the records a pass's dirty keys name, that the snapshot holds.
 * @param graph - The snapshot.
 * @param dirty - The `graph` slice's dirty keys.
 * @returns Their dense indices, by element.
 */
function editedRows(graph: GraphSnapshot, dirty: ReadonlySet<string>): { node: number[]; edge: number[] } {
    const rows = { node: [] as number[], edge: [] as number[] };
    const space = edgeSpaceOf(graph);
    for (const key of dirty) {
        if (key.startsWith("n:")) {
            const row = graph.ids.indexOf(nodeOfKey(key) as string | number);
            if (row !== INVALID_INDEX) {
                rows.node.push(row);
            }
        } else if (key.startsWith("e:")) {
            const row = space.indexOf(key.slice(2));
            if (row !== INVALID_INDEX) {
                rows.edge.push(row);
            }
        }
    }

    return rows;
}

/**
 * Whether a layer reads an attribute field a record edit changed: one of its paths names the field,
 * on the kind of element it paints.
 * @param entry - The layer.
 * @param changed - The fields changed, by element.
 * @param changed.node - The node fields changed.
 * @param changed.edge - The edge fields changed.
 * @returns True when it does.
 */
function readsAnyField(entry: CompiledLayer, changed: { readonly node: string[]; readonly edge: string[] }): boolean {
    const fields = changed[entry.layer.target];
    if (fields.length === 0) {
        return false;
    }

    return entry.reads.some((path) => {
        const read = dependencyOf(path);
        return "field" in read && fields.includes(read.field);
    });
}

/**
 * The scopes a stack's `{match:"member"}` layers name.
 * @param stack - The stack, or null before it exists.
 * @returns The scopes.
 */
function layerScopesOf(stack: SessionStylesApi | null): Scope[] {
    return (stack?.list() ?? []).flatMap((layer) => (layer.selector.match === "member" ? [layer.selector.of] : []));
}

/**
 * A note's first line with any characters, cut to 80 code points: how `sets.usedBy` labels it.
 * @param text - The note's text.
 * @returns The label.
 */
function firstLineOf(text: string): string {
    const line = text.split(/\r\n|\r|\n/).find((candidate) => candidate.trim() !== "") ?? "";
    return Array.from(line.trim()).slice(0, 80).join("");
}

/** What names a set from outside the session, for `usedBy`. */
type SetsUsersProvider = () => Iterable<{ readonly user: SetUser; readonly scope: Scope | RuleTree }>;

/** Each session's outside users of sets. */
const sessionHostUsers = new WeakMap<GraphSession, SetsUsersProvider[]>();

/**
 * Add users of sets that live outside the session -- the element's running layout -- to what
 * `sets.usedBy` reports. Internal.
 * @param session - a session this module built
 * @param provider - reads the users now
 * @throws An Error for a session this module did not build.
 */
export function addSetsUsers(session: GraphSession, provider: SetsUsersProvider): void {
    const providers = sessionHostUsers.get(session);
    if (providers === undefined) {
        throw new Error("Not a session built by createGraphSession.");
    }

    providers.push(provider);
}

/** Each session's change notifier, for the live users of sets and the element's frame source. */
const sessionNotifiers = new WeakMap<GraphSession, SetsNotifier>();

/**
 * A session's change notifier and re-resolution scheduler (design/sets 11). Internal.
 * @param session - a session this module built
 * @returns its notifier
 * @throws An Error for a session this module did not build.
 */
export function setsNotifierOfSession(session: GraphSession): SetsNotifier {
    const notifier = sessionNotifiers.get(session);
    if (notifier === undefined) {
        throw new Error("Not a session built by createGraphSession.");
    }

    return notifier;
}

/** Each session's input counters, beside it rather than on it so the published type gains nothing. */
const sessionInputs = new WeakMap<GraphSession, InputCounters>();

/** Each session's scope resolver, for the internal readers that want its bitmaps. */
const sessionScopes = new WeakMap<GraphSession, ScopeResolver>();

/**
 * A session's scope resolver, with the synchronous doors the published `session.scope` lacks.
 * Internal.
 * @param session - a session this module built
 * @returns its resolver
 * @throws An Error for a session this module did not build.
 */
export function scopeResolverOfSession(session: GraphSession): ScopeResolver {
    const scope = sessionScopes.get(session);
    if (scope === undefined) {
        throw new Error("Not a session built by createGraphSession.");
    }

    return scope;
}

/**
 * A session's kept sets. Internal: the tests' spelling of `session.sets`.
 * @param session - a session
 * @returns its sets
 */
export function setsOfSession(session: GraphSession): SetsApi {
    return session.sets;
}

/**
 * A session's input counters: its input tick and its attribute revisions (design/sets 6.2).
 * Internal.
 * @param session - a session this module built
 * @returns its counters
 * @throws An Error for a session this module did not build.
 */
export function inputCountersOfSession(session: GraphSession): InputCounters {
    const inputs = sessionInputs.get(session);
    if (inputs === undefined) {
        throw new Error("Not a session built by createGraphSession.");
    }

    return inputs;
}

/** The context of the `runs` hook's repaint: nothing cancels it, and it reports nowhere. */
const RUNS_PASS = Object.freeze({ signal: new AbortController().signal, report: () => undefined });

/**
 * The selection, once the session has one.
 *
 * The scope resolver reads the selection through a call, and this is the one moment where that
 * could be asked too early. It is an internal invariant rather than a consumer's mistake, so it
 * fails loudly instead of answering with an empty set -- a `"selection"` scope silently resolving
 * to nothing is a run over no elements that reports success.
 * @param held - The selection, or null while the session is still being assembled.
 * @returns The selection.
 * @throws A `GraphtyError` coded `E_UNSUPPORTED` when it is asked for too early.
 */
function requireSelection(held: SelectionOwner | null): SelectionOwner {
    if (held === null) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message: "This session's selection was read before the session finished being built.",
            source: "run",
        });
    }

    return held;
}

/**
 * The query engine, which is built after the scope and visibility APIs that read it.
 * @param held - The engine, once built.
 * @returns The engine.
 * @throws A `GraphtyError` coded `E_UNSUPPORTED` when it is asked for too early.
 */
function requireQuery(held: QueryEngine | null): QueryEngine {
    if (held === null) {
        throw new GraphtyError({
            code: "E_UNSUPPORTED",
            message: "This session's query engine was read before the session finished being built.",
            source: "run",
        });
    }

    return held;
}

/**
 * Publish one session event to whoever is watching it.
 *
 * A copy of the subscriber set is walked, so that a handler unsubscribing itself -- which a
 * "tell me once" listener does -- cannot change the set under the loop it is in. A throwing
 * handler is contained: one broken status chip must not stop the next one being told.
 * @param watchers - Every subscriber, by event.
 * @param event - Which event.
 * @param detail - What to tell them.
 */
function publish<K extends keyof SessionEventMap>(watchers: Watchers, event: K, detail: SessionEventMap[K]): void {
    const subscribers = watchers.get(event);

    if (subscribers === undefined) {
        return;
    }

    for (const handler of [...subscribers]) {
        try {
            (handler as (value: SessionEventMap[K]) => void)(detail);
        } catch {
            // A watcher's failure is the watcher's. The session carries on.
        }
    }
}

/**
 * One run, in the shape the results API looks runs up in.
 * @param run - The run.
 * @returns The entry.
 */
function toResultsEntry(run: Run): ResultsRunEntry {
    return {
        id: run.id,
        label: run.label,
        shape: run.shape,
        ...(run.result === undefined ? {} : { result: run.result }),
        ...(run instanceof ManagedRun && run.resultExecution !== undefined ? { execution: run.resultExecution } : {}),
    };
}

/**
 * One run by id, in the shape the results API looks runs up in.
 * @param runs - The runs this session holds.
 * @param id - The run id.
 * @returns The entry, or undefined when there is no such run.
 */
function runEntry(runs: RunsApi, id: string): ResultsRunEntry | undefined {
    const run = runs.get(id);

    return run === undefined ? undefined : toResultsEntry(run);
}

/**
 * Assemble what `estimate` and `plan` read.
 * @param runsOptions - What the host said about running algorithms.
 * @param data - The session's data surface, which maintains the statistics.
 * @param resolveScope - Resolves a scope specification against the graph as it stands.
 * @param defaultScope - What a command that names no scope gets.
 * @param acceleration - The controller whose capabilities decide whether an accelerator is here.
 * @param keptSets - The kept sets, for the scopes a refused run is pointed at.
 * @returns The context.
 */
function planningContext(
    runsOptions: SessionRunsOptions,
    data: SessionDataApi,
    resolveScope: (spec: Scope) => ResolvedScope,
    defaultScope: Scope,
    acceleration: AccelerationControllerLike,
    keptSets: NonNullable<PlanningContext["keptSets"]>,
): PlanningContext {
    const defaultCaveats: Caveats = runsOptions.defaultCaveats ?? PLANNED_CAVEATS;

    return {
        algorithms: () => SESSION_CATALOG_TABLES.algorithms(),
        statistics: () => data.statistics(),
        resolveScope,
        defaultScope,
        limits: runsOptions.limits ?? DEFAULT_COST_GATE_LIMITS,
        defaultCaveats,
        // "idle" counts: an accelerator IS attached and the node count is merely below the
        // threshold at which the element bothers to use it, so an algorithm that needs one can run.
        acceleratorAvailable: () => ACCELERATOR_ATTACHED.has(acceleration.capabilities.acceleration.state),
        keptSets,
        ...(runsOptions.calibration === undefined ? {} : { calibration: runsOptions.calibration }),
        ...(runsOptions.measurements === undefined ? {} : { measurements: runsOptions.measurements }),
    };
}
