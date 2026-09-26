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
import type { EdgeId, NodeId, Path, Query, RunId, Scope, StaticStyle } from "../catalog/types";
import { DataConfig } from "../config/DataConfig";
import { defaultEdgeStyle } from "../config/EdgeStyle";
import { defaultNodeStyle } from "../config/NodeStyle";
import { GraphStore } from "../data/GraphStore";
import type { ElementPositions } from "../data/positions";
import { GraphtyError, isGraphtyError } from "../errors";
import { createSessionCatalog, SESSION_CATALOG_TABLES } from "./catalog";
import { type CostEstimate, DEFAULT_COST_GATE_LIMITS } from "./cost";
import { SessionData } from "./data";
import { estimateCommand, type Plan, planCommand, type PlanningContext, type SessionCommand } from "./planning";
import { createQueryEngine, type QueryEngine } from "./query";
import { createResultsApi, type ResultsApi, type ResultsRunEntry, type RunRef } from "./results";
import {
    type Caveats,
    createLocalRunQueue,
    createRunsApi,
    ENGINE_VERSIONS,
    type ResolvedScope,
    type Run,
    type RunExecutionContext,
    type RunOptions,
    type RunOutcome,
    type RunsApi,
    type SessionRunsApi,
} from "./runs";
import {
    type ComponentLabels,
    createScopeApi,
    edgeSpaceOf,
    type MaskIdSpace,
    type ScopeApi,
    type ScopeResolver,
} from "./scope";
import { createSelectionApi, type SelectionOwner, type SelectionTextMode } from "./selection";
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
import { channelsFor } from "./styles/channels";
import { createLayerRepaint, type ElementPaint, type RepaintEngine } from "./styles/repaint";
import { createScaleRegistry } from "./styles/scales";
import { createSelectorSource, edgeEndpointOf, type SessionSelectorSource } from "./styles/sources";
import type {
    AccelerationControllerLike,
    CreateGraphSessionOptions,
    ElementSession,
    GraphSession,
    SessionCatalogApi,
    SessionConfig,
    SessionDataApi,
    SessionDataConfig,
    SessionEventMap,
    SessionGraphStore,
    SessionRecordSource,
    SessionRunsOptions,
    SessionStatus,
} from "./types";
import { createVisibilityApi, type FilterValueSource, type SessionVisibilityApi } from "./visibility";

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

/**
 * What the factory hands the session, with the ownership question already answered.
 *
 * The `owned*` members are the same objects as their neighbours when the session built them and
 * null when a caller did, which is the whole of what `dispose()` needs to know.
 */
interface SessionParts {
    /** The store to read, whoever built it. */
    readonly store: SessionGraphStore;
    /** The catalogue: the shared tables, plus the metric listing for this session's own graph. */
    readonly catalog: SessionCatalogApi;
    /** The store when this session built it, so that disposal releases it. */
    readonly ownedStore: GraphStore | null;
    /** The data surface over that store. */
    readonly data: SessionData;
    /** Reads the data configuration, live. */
    readonly readData: () => SessionDataConfig;
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
    /** The one selection this session holds. */
    readonly selection: SelectionOwner;
    /** What the filters and the time window have left showing. */
    readonly visibility: SessionVisibilityApi;
    /** The style stack, with the element's own layers already at the bottom of it. */
    readonly styles: SessionStylesApi;
    /** What the last style pass painted, which is what a renderer draws from. */
    readonly paint: ElementPaint;
    /** Everything `estimate` and `plan` read. */
    readonly planning: PlanningContext;
    /** Where a run notification is delivered, so the session can publish it to its watchers. */
    readonly watchers: Watchers;
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
 * A graph with no view attached.
 *
 * Build one with {@link createGraphSession} rather than with `new`: the factory is what settles
 * whether the session owns its store and its accelerator, and that ownership is what `dispose()`
 * acts on.
 */
class Session implements ElementSession {
    readonly data: SessionDataApi;
    readonly catalog: SessionCatalogApi;
    readonly runs: RunsApi;
    readonly results: ResultsApi;
    readonly scope: ScopeApi;
    readonly selection: SelectionOwner;
    readonly visibility: SessionVisibilityApi;
    readonly styles: SessionStylesApi;
    readonly paint: ElementPaint;

    private readonly sessionRuns: SessionRunsApi;
    private readonly planning: PlanningContext;
    private readonly watchers: Watchers;
    private readonly readData: () => SessionDataConfig;
    private readonly sessionData: SessionData;
    private readonly store: SessionGraphStore;
    private readonly controller: AccelerationControllerLike;
    /** The store, when this session built it and therefore has to dispose it. */
    private readonly ownedStore: GraphStore | null;
    /** The controller, when this session built it and therefore has to dispose it. */
    private readonly ownedAcceleration: AccelerationController | null;
    /** Stops the controller subscription `capabilities:changed` is published from. */
    private readonly unwatchController: () => void;
    private disposed = false;

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
        this.readData = parts.readData;
        this.controller = parts.controller;
        this.ownedAcceleration = parts.ownedAcceleration;
        this.sessionRuns = parts.runs;
        this.runs = parts.runs;
        this.results = parts.results;
        this.scope = parts.scope;
        this.selection = parts.selection;
        this.visibility = parts.visibility;
        this.styles = parts.styles;
        this.paint = parts.paint;
        this.planning = parts.planning;
        this.watchers = parts.watchers;
        // Every transition the controller makes is one event on the session, carrying the same
        // frozen document `capabilities` returns -- so a consumer that cached the last one can
        // compare it by identity rather than walking it.
        this.unwatchController = this.controller.onChange(() => {
            publish(this.watchers, "capabilities:changed", { capabilities: this.controller.capabilities });
        });
    }

    /**
     * The element-owned node coordinates: a stride-3 Float32Array indexed by dense node index,
     * where a row no layout has placed reads NaN rather than the origin.
     * @returns the live position array
     */
    get positions(): ElementPositions {
        return this.store.positions;
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
     * The configuration this session runs under, as a fresh frozen struct on every read.
     *
     * It is read rather than held because the element REPLACES its configuration object when a
     * style template is applied, and a session holding the old one would answer from a setting
     * nobody is running under any more.
     *
     * The trade: `config` and the `config.acceleration` inside it are NOT identity-stable, so
     * `prev === next` is not a staleness test here as it is on `capabilities`. Read the values,
     * do not cache the object. `config` is not one of the identity-stable structs.
     * @returns the configuration
     */
    get config(): SessionConfig {
        return Object.freeze({
            data: this.readData(),
            // Read from the controller, not from a value frozen at construction: the policy and
            // the threshold are changed at runtime through the accessors below and through the
            // element's attributes, and a copy taken here would answer from a setting nobody is
            // running under any more.
            acceleration: Object.freeze({ policy: this.controller.policy, minNodes: this.controller.minNodes }),
        });
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
     * The current snapshot, by reference: nothing is copied.
     * @returns the immutable graph-format snapshot
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
     * Do one thing, as a command.
     * @param command - What to do.
     * @param options - The signal, the progress handler and how the call joins the queue.
     * @returns The run.
     */
    run(command: SessionCommand, options: RunOptions = {}): Run {
        return this.runs.start(command.algorithm, command.params, {
            ...options,
            ...(command.scope === undefined ? {} : { scope: command.scope }),
            ...(command.seed === undefined ? {} : { seed: command.seed }),
            ...(command.sample === undefined ? {} : { sample: command.sample }),
            ...(command.exact === undefined ? {} : { exact: command.exact }),
            ...(command.as === undefined ? {} : { as: command.as }),
        });
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
        this.unwatchController();
        // Runs first: a run still in flight holds a reference to the data it is reading, and
        // disposing the store under it would have it finish against a graph that no longer exists.
        this.sessionRuns.dispose();
        this.watchers.clear();
        this.sessionData.dispose();
        this.ownedAcceleration?.dispose();
        this.ownedStore?.dispose();
    }
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
    given: SessionGraphStore | undefined,
    readData: () => SessionDataConfig,
    follow: FreezeFollower,
): { store: SessionGraphStore; owned: GraphStore | null } {
    if (given !== undefined) {
        return { store: given, owned: null };
    }

    const owned: GraphStore = new GraphStore({
        directed: readData().directed,
        // A thunk, not a value: the element mutates `data.knownFields` in place at run time, and a
        // scale captured here would be the one known field that ignored the change.
        positionScale: () => readData().knownFields.positionScale,
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
 * Read one dotted path out of a parsed style object.
 * @param style - The style to read.
 * @param path - The dotted path a channel declares, such as `texture.color`.
 * @returns What sits there, or undefined when any step of the path is missing.
 */
function atStylePath(style: unknown, path: string): unknown {
    let held = style;

    for (const segment of path.split(".")) {
        if (typeof held !== "object" || held === null) {
            return undefined;
        }

        held = (held as Record<string, unknown>)[segment];
    }

    return held;
}

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
                paths.push(field.path);
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
        answers: (path: Path, target: "node" | "edge"): boolean =>
            answerablePaths(data, runs, target).includes(path),
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
function fieldWordsOf(data: SessionDataApi, runs: RunsApi): (path: Path, target: "node" | "edge") => FieldWords | undefined {
    return (path: Path, target: "node" | "edge"): FieldWords | undefined => {
        for (const attribute of data.attributes()) {
            if (attribute.path === path && attribute.kind === target) {
                return { plainName: attribute.plainName, technicalName: attribute.technicalName };
            }
        }

        for (const run of runs.list()) {
            for (const field of run.fields) {
                if (field.path === path && field.kind === target) {
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
 * Handed a store, it reads that one instead and disposes nothing that arrived from outside. That
 * is how a rendered graph gets a session: the element's data manager already owns one store for
 * the life of the graph, and a second one would be a second, disagreeing copy.
 * @param options - the store, the record source, the configuration and the accelerator, each
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
    return buildSession(options);
}

/**
 * Build the session a `<graphty-element>` draws.
 *
 * The same object {@link createGraphSession} builds, typed so that the render loop can reach the
 * live selection and visibility masks. It is not a privileged session and it holds nothing extra:
 * the difference is a shape one, and it exists because a renderer tests one element at a time
 * where a consumer reads a list of ids.
 * @param options - The store, the record source, the configuration and the accelerator.
 * @returns The session.
 */
export function createElementSession(options: CreateGraphSessionOptions = {}): ElementSession {
    return buildSession(options);
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
 * @returns The session.
 */
function buildSession(options: CreateGraphSessionOptions): Session {
    const readData = resolveDataConfig(options.config?.data);
    // A controller handed in is the authority on its own policy: the session does not own it, so
    // it cannot make a configuration value true merely by declaring it.
    const policy = options.acceleration?.policy ?? options.config?.acceleration?.policy ?? ACCELERATION_POLICY_DEFAULT;
    // Undefined stays undefined: a threshold nobody set leaves the controller's built-in
    // per-capability floors in force, and a 0 written here would count as the consumer's own.
    const minNodes = options.acceleration?.minNodes ?? options.config?.acceleration?.minNodes;
    const watchers: Watchers = new Map();

    // Assigned below, and read only from inside a callback: a store this session built delivers
    // its freeze remaps here, and a freeze cannot happen before the store exists.
    let selection: SelectionOwner | null = null;
    // The same shape, for the same reason: the style stack is built after the runs, and a run
    // reaching its end is what tells it that a column it prepared a binding against has moved.
    let forgetPreparedBindings: (() => void) | null = null;

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
    const acceleration = resolveAcceleration(options.acceleration, policy, minNodes);
    const data = new SessionData(store.store, options.records ?? null, readData);
    const runsOptions = options.runs ?? {};
    const snapshot = (): GraphSnapshot => store.store.getSnapshot();
    const components = componentLabelsOf(data);
    // ONE queue for both, whether the host handed one in or not: a filter pass and an algorithm
    // run both read the whole graph, and two queues would let one start while the other is
    // halfway through. A rendered graph hands in the element's own, so a filter also takes its
    // turn among the loads, the layouts and the style passes.
    const queue = runsOptions.queue ?? createLocalRunQueue();

    const scope: ScopeResolver = createScopeApi({
        snapshot,
        components,
        // Read through a call rather than captured: both of these are built below, and the
        // resolver only reaches them when somebody resolves a scope that names them.
        selection: { nodes: () => requireSelection(selection).nodeMembers() },
        visibility: {
            nodes: () => visibility.masks.nodes(),
            edges: () => visibility.masks.edges(),
        },
        match: (where: Query) => requireQuery(query).nodes(where),
    });

    const visibility = createVisibilityApi({
        snapshot,
        components,
        queue,
        resolveScope: (spec: Scope) => scope.resolveNow(spec),
        match: (where: Query) => requireQuery(query).nodes(where),
        matchEdges: (where: Query) => requireQuery(query).edges(where),
        unresolvedPathsOf: (where: Query) => requireQuery(query).unresolvedPathsOf(where),
        ...(runsOptions.engine === undefined ? {} : { engine: runsOptions.engine }),
        ...(options.records === undefined ? {} : { values: valueSourceOf(options.records, snapshot) }),
        onChange: (change) => {
            publish(watchers, "visibility:changed", change);
        },
    });

    const defaultScope: Scope = runsOptions.defaultScope ?? "visible";
    const runs = createRunsApi({
        queue,
        catalog: SESSION_CATALOG_TABLES,
        resolveScope: (spec: Scope) => scope.resolveNow(spec),
        execute: runsOptions.execute ?? refuseToExecute,
        engine: runsOptions.engine ?? ENGINE_VERSIONS,
        defaultScope,
        ...(runsOptions.defaultCaveats === undefined ? {} : { defaultCaveats: runsOptions.defaultCaveats }),
        // ONE POLICY, EVERY ROUTE. A run paints itself on its first completion, from the encoding
        // its own shape derives -- see `./styles/autoApply` for the six rules and `./styles/derive`
        // for what a shape suggests. It is handed in here rather than called at each door because
        // the console, the panel, an agent's tool call and a bare `runs.start()` all end at this
        // one API, and a decision made at the doors is a decision made more than once.
        styling: createAutoApplyPolicy({
            styles: () => stack ?? undefined,
            // WHERE A REFUSAL GOES WHEN NOBODY IS AWAITING IT. The element paints a run's
            // suggestion on the run's own completion, fire-and-forget, because a consumer must
            // not have to await the picture in order to have started the work. That leaves a
            // refusal with nowhere to arrive: not at a call site, because there was no call.
            // Unwired, it was swallowed, and a graph kept the picture it already had while the
            // element believed it had painted a new one -- which is the silent failure the whole
            // style system exists to replace.
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
        layers: {
            bindings: (runId) =>
                (stack?.list() ?? [])
                    .filter((layer) => layer.source.by === "run" && layer.source.runId === runId)
                    .map((layer) => layer.id),
            remove: (layerIds) => {
                for (const layerId of layerIds) {
                    // Fire and forget with the refusal reported, on the same terms as every other
                    // style edit the element starts on a consumer's behalf: removing the run is
                    // what was asked for, and it must not wait on the repaint that follows.
                    void stack?.remove(layerId).then(
                        () => undefined,
                        (error: unknown) => {
                            // Said out loud rather than swallowed. A run layer is never locked,
                            // so a refusal here means something unexpected about the stack, and a
                            // layer left behind reads a column whose run has gone.
                            console.error(
                                `[graphty] Could not remove style layer "${layerId}" with the run that produced it.`,
                                error,
                            );
                        },
                    );
                }
            },
        },
        onChange: (change) => {
            if (change.phase === "end") {
                // A run that has just published has replaced the column a style layer bound to
                // it was prepared against, so what was prepared describes the numbers as they
                // stood before the run finished. A re-run keeps its id and its layers, which is
                // exactly the case where nothing else would notice.
                forgetPreparedBindings?.();
            }

            publish(watchers, "run:changed", change);
        },
    });

    const results = createResultsApi({
        entry: (id) => runEntry(runs, id),
        entries: () => runs.list().map((run) => toResultsEntry(run)),
    });

    // The real columns, read per element and never captured: a compiled selector stays correct
    // across a freeze that renumbers the index space because every lookup starts from the
    // snapshot the session holds NOW.
    const elements: SessionSelectorSource = createSelectorSource({
        snapshot,
        results: (runId) => runs.get(runId)?.result,
        ...(options.records === undefined ? {} : { records: options.records }),
    });
    // ONE query engine, over the same source the style layers read, so a layer selector and a
    // scope, a selection or a filter with the same expression match the same elements.
    const paths = pathDirectoryOf(data, runs);
    query = createQueryEngine({
        snapshot,
        elements,
        answers: (path, target) => paths.answers(path, target),
        searchPaths: () =>
            data
                .attributes()
                .filter((attribute) => attribute.kind === "node")
                .map((attribute) => attribute.path),
    });
    const engine = query;

    selection = createSelectionApi({
        snapshot,
        scope,
        results,
        match: (where: Query) => engine.select(where),
        find: (text: string, mode: SelectionTextMode) => engine.find(text, mode),
        ...(options.records === undefined ? {} : { records: options.records }),
        onChange: (delta) => {
            publish(watchers, "selection:changed", delta);
        },
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
    forgetPreparedBindings = painter.invalidate;

    const styles = createStylesApi({
        elements,
        base: elementBaseLayers(),
        paths,
        scales,
        runs: encodingSourceOf(runs),
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
            publish(watchers, "style:changed", change);
        },
    });

    stack = styles;

    const planning = planningContext(
        runsOptions,
        data,
        (spec: Scope) => scope.resolveNow(spec),
        defaultScope,
        acceleration.controller,
    );

    return new Session({
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
        readData,
        controller: acceleration.controller,
        ownedAcceleration: acceleration.owned,
        runs,
        results,
        scope,
        selection,
        visibility,
        styles,
        paint: painter.paint,
        planning,
        watchers,
    });
}

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
 * @returns The context.
 */
function planningContext(
    runsOptions: SessionRunsOptions,
    data: SessionDataApi,
    resolveScope: (spec: Scope) => ResolvedScope,
    defaultScope: Scope,
    acceleration: AccelerationControllerLike,
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
        ...(runsOptions.calibration === undefined ? {} : { calibration: runsOptions.calibration }),
        ...(runsOptions.measurements === undefined ? {} : { measurements: runsOptions.measurements }),
    };
}
