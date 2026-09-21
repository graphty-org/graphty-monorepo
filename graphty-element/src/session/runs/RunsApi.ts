/**
 * @file Starting runs, finding them, and taking them away.
 *
 * This sits in FRONT of the element's existing operation queue and does not replace any part of
 * it. The queue still decides order, still owns an abort controller per operation, still emits the
 * progress and lifecycle events every other operation emits. What this adds is the half an
 * operation id cannot answer: which run that operation is, whether starting the same work again
 * should make a second one, where a waiting run sits in the line, and what removing a run would
 * take with it.
 *
 * The one rule worth reading before anything else: **starting the same algorithm with the same
 * parameters over the same scope returns the run that already exists**, and re-executes it in
 * place when the data has moved under it. That is what "re-run from a layer" needs, and it is why
 * a layer binding never dangles. It is also why ids are derived from what a run IS rather than
 * from how many runs came before it.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM. The queue arrives as {@link RunQueue}, a
 * structural view of `OperationQueueManager` narrow enough that the session never imports the
 * renderer's manager to talk to it.
 */

import { registeredAlgorithmByKey } from "../../catalog/registry";
import type {
    AlgorithmDescriptor,
    AlgorithmKey,
    LayerId,
    OptionDescriptor,
    RunId,
    Scope,
} from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { RunResult } from "../results/types";
import type { AutoApplyPolicy } from "../styles/autoApply";
import {
    ManagedRun,
    type RunBody,
    type RunDefinition,
    type RunExecutor,
    type RunProgressSink,
    type RunQueueContext,
    type RunSurroundings,
    type RunTicket,
} from "./Run";
import {
    assertRunId,
    canonicalIdentity,
    canonicalize,
    canonicalizeParams,
    deriveRunId,
    type RunIdentity,
} from "./runId";
import {
    type BatchResult,
    type BatchStep,
    type Caveats,
    type EngineVersions,
    isTerminalRunStatus,
    type QueueEntry,
    type ResolvedScope,
    type Run,
    type RunChange,
    type RunOptions,
    type RunPhase,
    type RunRemoval,
    type RunsApi,
    type RunSpec,
    type StaleNote,
    type StartOptions,
} from "./types";

// ---------------------------------------------------------------------------------------------
// What the runs API needs from the rest of the element
// ---------------------------------------------------------------------------------------------

/**
 * The element's operation queue, as a run needs it.
 *
 * `OperationQueueManager` satisfies this structurally: the point of writing it down rather than
 * importing the class is that the session stays free of the renderer's manager graph, and that a
 * test can drive a run without a queue at all.
 */
export interface RunQueue {
    /**
     * Put work in the queue.
     * @param category - Always "algorithm-run"; the queue's other categories are not runs.
     * @param execute - The work.
     * @param options - What to call it in the queue's own events.
     * @param options.description - The description the queue's events carry.
     * @returns The queue's operation id, which is not the run id.
     */
    queueOperation(
        category: "algorithm-run",
        execute: (context: RunQueueContext) => Promise<void> | void,
        options?: { description?: string },
    ): string;
    /**
     * Resolve once nothing is queued or running.
     *
     * WHAT THIS EXISTS TO ANSWER. The element starts work of its own that nobody awaited -- a
     * run's suggested encoding lands on the run's first completion, deliberately without making a
     * consumer await the picture in order to have started the run. So `await runs.start(...)`
     * hands back the numbers while the paint is still on its way, and a consumer that read the
     * layer stack or the legend right then saw the picture as it stood a moment ago. Working that
     * out by counting turns is coordination code, and coordination code the element should not be
     * shipping to a consumer.
     * @returns A promise that resolves when the queue is empty.
     */
    settled(): Promise<void>;
    /**
     * Stop one queued or running operation.
     * @param operationId - The id `queueOperation` returned.
     * @returns True when there was something to stop.
     */
    cancelOperation(operationId: string): boolean;
}

/** The algorithm half of the catalogue, which is all a run reads. */
interface RunCatalog {
    /**
     * Every algorithm the element can run.
     * @returns The descriptors.
     */
    algorithms(): readonly AlgorithmDescriptor[];
}

/**
 * The style layers that read runs.
 *
 * Optional, because a session can be built without a style stack at all. While it is absent,
 * removing a run removes no layers and says so honestly rather than pretending it checked.
 */
interface RunLayerBindings {
    /**
     * Which layers read one run.
     * @param runId - The run.
     * @returns The layer ids.
     */
    bindings(runId: RunId): readonly LayerId[];
    /**
     * Remove layers, because the run they read is going away.
     * @param layerIds - The layers to remove.
     */
    remove(layerIds: readonly LayerId[]): void;
}

/** Everything the runs API is built from. */
export interface RunsApiOptions {
    /** The element's operation queue. */
    readonly queue: RunQueue;
    /** The catalogue the run machinery agrees with rather than restates. */
    readonly catalog: RunCatalog;
    /**
     * Resolve a scope specification against the graph as it stands.
     * @param spec - What was asked for.
     * @returns What it resolves to now.
     */
    readonly resolveScope: (spec: Scope) => ResolvedScope;
    /** The thing that actually runs an algorithm. */
    readonly execute: RunExecutor;
    /** Which versions are producing the numbers. */
    readonly engine: EngineVersions;
    /** What a call that names no scope gets. Defaults to the visible graph. */
    readonly defaultScope?: Scope;
    /** The caveats a run starts from, before the work refines them. */
    readonly defaultCaveats?: Caveats;
    /** The style layers that read runs, once there are any. */
    readonly layers?: RunLayerBindings;
    /**
     * The one policy that decides whether a finished run paints, and with what.
     *
     * Optional, and absent it paints nothing: a session with no style stack has nowhere to put a
     * layer. It is handed IN rather than built here because the policy belongs to the style
     * system -- this file knows when a run finished and when a batch is in flight, and nothing
     * else about styling.
     */
    readonly styling?: AutoApplyPolicy;
    /**
     * Called every time any run this session holds reaches one of the four watched moments.
     *
     * One observer for every run, rather than a handler per call, because the thing that wants it
     * is a status bar that did not start the run: an element mirroring runs onto a DOM event has
     * no way to attach `onProgress` to a run a console or an agent started. `StartOptions.onProgress`
     * stays what it is -- the caller's own handler for its own run.
     * @param change - The run's record, and which moment it reached.
     */
    readonly onChange?: (change: RunChange) => void;
}

/** The runs API, plus the two things a session needs and a consumer never calls. */
export interface SessionRunsApi extends RunsApi {
    /**
     * Whether the element minted this run's id rather than the author naming it with `as:`.
     *
     * A document that references a derived id would resolve differently against a session where
     * the run was started with different parameters, so serialising one is refused with
     * `E_UNSTABLE_RUN_ID`. Nothing else can answer this: a derived id and an author-assigned one
     * are the same string once they exist.
     * @param id - The run id.
     * @returns True when the element derived the id.
     */
    isDerivedId(id: RunId): boolean;
    /** Cancel everything still running and forget every run this session held. */
    dispose(): void;
}

// ---------------------------------------------------------------------------------------------
// Defaults and small helpers
// ---------------------------------------------------------------------------------------------

/** What a run's numbers are qualified by before the work has said anything about them. */
const DEFAULT_CAVEATS: Caveats = Object.freeze({
    exact: true,
    seed: null,
    direction: "as-loaded",
    weight: null,
    precision: "f64",
    method: "exact",
    notes: Object.freeze([]),
});

/** Where progress goes for work running beside the queue, which has no operation to report on. */
const NO_QUEUE_PROGRESS: RunProgressSink = Object.freeze({
    setProgress: () => {
        // The run publishes its own progress; there is no operation to report on.
    },
    setMessage: () => {
        // The run publishes its own progress; there is no operation to report on.
    },
    setPhase: () => {
        // The run publishes its own progress; there is no operation to report on.
    },
});

/**
 * Tell whether a thrown value is an abort rather than a failure.
 * @param error - The thrown value.
 * @returns True when it is an `AbortError` or a `TimeoutError`.
 */
function isAbortLike(error: unknown): boolean {
    return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/**
 * What to call a scope in a run label.
 * @param spec - The scope specification.
 * @returns A short phrase a person reads.
 */
function describeScope(spec: Scope): string {
    if (spec === "visible") {
        return "visible";
    }

    if (spec === "graph") {
        return "whole graph";
    }

    if (spec === "selection") {
        return "selection";
    }

    if (spec === "largest-component") {
        return "largest component";
    }

    if ("set" in spec) {
        return `set ${spec.set}`;
    }

    if ("where" in spec) {
        return spec.where;
    }

    return `${spec.nodes.length} nodes`;
}

/**
 * How a parameter value reads inside a label.
 * @param value - The value.
 * @returns Its text.
 */
function formatParamValue(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number") {
        return String(value);
    }

    if (typeof value === "boolean") {
        return value ? "on" : "off";
    }

    if (value === undefined) {
        return "default";
    }

    return canonicalize(value);
}

/**
 * The versions to record on a run, with the registered algorithm's own version beside them.
 *
 * A run records the versions of the code that produced its numbers, and the three fixed fields
 * name the element and its two sibling packages -- which says nothing at all about a third
 * party's algorithm. The version is read from an optional `static version` on the registered
 * class, so an algorithm that declares none leaves the record exactly as it was.
 * @param key - The catalogue key the run was started by.
 * @param base - The element's own versions.
 * @returns The versions to record on this run.
 */
function engineVersionsFor(key: AlgorithmKey, base: EngineVersions): EngineVersions {
    const version = registeredAlgorithmByKey(key)?.version;

    return version === undefined ? base : Object.freeze({ ...base, plugins: Object.freeze({ [key]: version }) });
}

/**
 * Check one option's value against what its descriptor permits.
 * @param algorithm - Which algorithm the option belongs to, for the error's details.
 * @param option - The option descriptor.
 * @param value - What the caller passed.
 * @throws A `GraphtyError` with code `E_OPTION_RANGE` when the value is outside what is allowed.
 */
function checkOptionValue(algorithm: AlgorithmKey, option: OptionDescriptor, value: unknown): void {
    if (option.values !== undefined && option.values.length > 0 && typeof value === "string") {
        const allowed = option.values.map((choice) => choice.value);

        if (!allowed.includes(value)) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `"${value}" is not one of the values the "${option.name}" option accepts.`,
                source: "run",
                details: { algorithm, option: option.name, value, allowed },
            });
        }
    }

    if (typeof value !== "number") {
        return;
    }

    if (typeof option.min === "number" && value < option.min) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: `The "${option.name}" option is ${value}, below its minimum of ${option.min}.`,
            source: "run",
            details: { algorithm, option: option.name, value, min: option.min },
        });
    }

    if (typeof option.max === "number" && value > option.max) {
        throw new GraphtyError({
            code: "E_OPTION_RANGE",
            message: `The "${option.name}" option is ${value}, above its maximum of ${option.max}.`,
            source: "run",
            details: { algorithm, option: option.name, value, max: option.max },
        });
    }
}

// ---------------------------------------------------------------------------------------------
// The runs API
// ---------------------------------------------------------------------------------------------

/** Starting runs, finding them, and taking them away. */
class Runs implements SessionRunsApi {
    private readonly options: RunsApiOptions;

    private readonly defaultScope: Scope;

    private readonly defaultCaveats: Caveats;

    /** Every algorithm run this session holds, in the order they were started. */
    private readonly runs = new Map<RunId, ManagedRun>();

    /** What each run IS, so that reusing an id for different work is caught rather than silent. */
    private readonly identities = new Map<RunId, string>();

    /** The ids the element minted, which are the ones a saved document may not reference. */
    private readonly derivedIds = new Set<RunId>();

    /** The batches, which are not algorithm runs and therefore not in `list()`. */
    private readonly batches = new Set<ManagedRun<BatchResult>>();

    private disposed = false;

    /**
     * Build the runs API.
     * @param options - The queue, the catalogue, the scope resolver and the thing that does the
     * work.
     */
    constructor(options: RunsApiOptions) {
        this.options = options;
        this.defaultScope = options.defaultScope ?? "visible";
        this.defaultCaveats = options.defaultCaveats ?? DEFAULT_CAVEATS;
    }

    // -- starting -----------------------------------------------------------------------------

    /**
     * Start one algorithm, or hand back the run that already answers this question.
     * @param algorithm - Which algorithm to run.
     * @param params - Its parameters.
     * @param options - The scope, the seed, the id and the rest.
     * @returns The run, awaitable and watchable straight away.
     */
    start(algorithm: AlgorithmKey, params?: Readonly<Record<string, unknown>>, options: StartOptions = {}): Run {
        this.refuseWhenDisposed();

        if (options.dryRun === true) {
            throw new GraphtyError({
                code: "E_UNSUPPORTED",
                message: "runs.start does not answer dry runs. Ask session.plan for what a run would do and cost.",
                source: "run",
                details: { algorithm, reason: "dry-run" },
            });
        }

        const descriptor = this.descriptorFor(algorithm);
        this.checkParams(descriptor, params);

        const spec = options.scope ?? this.defaultScope;
        const identity: RunIdentity = {
            algorithm: descriptor.key,
            params: canonicalizeParams(params, descriptor.options),
            scope: spec,
            seed: options.seed ?? null,
            sample: options.sample ?? null,
            exact: options.exact ?? null,
        };
        const assignedId = options.as;
        const derived = assignedId === undefined;
        const id = assignedId === undefined ? deriveRunId(identity) : assertRunId(assignedId);
        const existing = this.runs.get(id);

        if (existing !== undefined) {
            return this.reuse(existing, identity);
        }

        return this.create(id, identity, descriptor, spec, options, derived);
    }

    /**
     * Start several algorithms as one piece of work, with one progress stream and one cancel.
     *
     * The batch itself runs BESIDE the queue rather than in it. A batch that occupied the queue
     * would be waiting for members that cannot start until it finishes, which on a queue that runs
     * one operation at a time is a deadlock rather than a slow batch.
     * @param specs - What to run.
     * @param options - The batch's label, and the ordinary run options.
     * @returns A run over the batch, resolving to how each member turned out.
     */
    batch(specs: readonly RunSpec[], options: RunOptions & { readonly label?: string } = {}): Run<BatchResult> {
        this.refuseWhenDisposed();

        const label = options.label ?? "Batch";
        const identity: RunIdentity = {
            algorithm: "batch",
            params: { label, specs: specs.map((spec) => ({ ...spec })) },
            scope: this.defaultScope,
            seed: null,
            sample: null,
            exact: null,
        };
        const id = deriveRunId(identity);
        const definition: RunDefinition<BatchResult> = {
            id,
            algorithm: "batch",
            params: identity.params,
            seed: null,
            exact: null,
            sample: null,
            timeBoxMs: null,
            style: false,
            shape: "fact",
            fields: [],
            engine: this.options.engine,
            caveats: this.defaultCaveats,
            execute: this.batchExecutor(specs, label),
            publishOnCancel: true,
            ...(options.signal === undefined ? {} : { signal: options.signal }),
            ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
        };
        const surroundings: RunSurroundings = {
            label: () => label,
            queuePosition: () => null,
            stale: () => null,
            resolveScope: () => this.options.resolveScope(this.defaultScope),
            enqueue: (body) => enqueueBesideQueue(body, id),
            notify: (phase) => {
                this.announce(run, phase);
            },
        };
        const run = new ManagedRun<BatchResult>(definition, surroundings);
        this.batches.add(run);
        run.start();

        return run;
    }

    // -- addressing ---------------------------------------------------------------------------

    /**
     * One run, by id.
     * @param id - The run id.
     * @returns The run, or undefined when this session holds none with that id.
     */
    get(id: RunId): Run | undefined {
        return this.runs.get(id);
    }

    /**
     * Every algorithm run this session holds, finished or not.
     * @returns The runs, in the order they were started.
     */
    list(): readonly Run[] {
        return Object.freeze([...this.runs.values()]);
    }

    /**
     * Which style layers read a run.
     *
     * Answered from the layers themselves -- a layer built from a run records the run in its own
     * `source` -- rather than from a register kept beside them, so the two cannot disagree. A run
     * whose suggested styling has not landed yet reports none, which is the truthful answer
     * rather than a promise about a layer that does not exist.
     * @param id - The run id.
     * @returns The layer ids, bottom of the stack first.
     */
    bindings(id: RunId): readonly LayerId[] {
        return Object.freeze([...(this.options.layers?.bindings(id) ?? [])]);
    }

    /**
     * Remove a run and every style layer reading it.
     *
     * The count and the ids come back so a consumer can say "Removes 1 style layer" BEFORE it asks
     * for confirmation. `bindings(id)` answers the same question without removing anything, which
     * is what a confirmation dialog should ask first.
     * @param id - The run id.
     * @returns What went with it.
     */
    remove(id: RunId): RunRemoval {
        const layerIds = Object.freeze([...(this.options.layers?.bindings(id) ?? [])]);
        const run = this.runs.get(id);

        if (run !== undefined) {
            run.cancel(`Run "${id}" was removed.`);
            this.runs.delete(id);
            this.identities.delete(id);
            this.derivedIds.delete(id);
            // The layers this run painted went with it, so starting the same work again is a
            // first completion again rather than a run nothing will ever draw.
            this.options.styling?.forget(id);
        }

        if (layerIds.length > 0) {
            this.options.layers?.remove(layerIds);
        }

        return Object.freeze({ removedLayers: layerIds.length, layerIds });
    }

    /**
     * Whether the element minted this run's id rather than the author naming it.
     * @param id - The run id.
     * @returns True when the element derived the id.
     */
    isDerivedId(id: RunId): boolean {
        return this.derivedIds.has(id);
    }

    /**
     * The runs waiting to start, in queue order.
     * @returns One entry per waiting run, each carrying its position and the total.
     */
    get queue(): readonly QueueEntry[] {
        const waiting = this.waiting();

        return Object.freeze(
            waiting.map((run, index) => Object.freeze({ runId: run.id, index, of: waiting.length })),
        );
    }

    /** Cancel everything still running and forget every run this session held. */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        for (const run of this.batches) {
            run.cancel("The session was disposed.");
        }

        for (const run of this.runs.values()) {
            run.cancel("The session was disposed.");
        }

        this.batches.clear();
        this.runs.clear();
        this.identities.clear();
        this.derivedIds.clear();
    }

    // -- building a run -----------------------------------------------------------------------

    /**
     * Build, register and start a run that does not exist yet.
     * @param id - The id it will answer to.
     * @param identity - What the run is.
     * @param descriptor - The algorithm's catalogue entry.
     * @param spec - The scope specification it was asked for.
     * @param options - What the caller passed.
     * @param derived - Whether the element minted the id rather than the author naming it.
     * @returns The run.
     */
    private create(
        id: RunId,
        identity: RunIdentity,
        descriptor: AlgorithmDescriptor,
        spec: Scope,
        options: StartOptions,
        derived: boolean,
    ): Run {
        const policy = options.queue ?? "append";

        if (policy === "replace") {
            this.cancelSiblings(descriptor.key, id);
        }

        const definition: RunDefinition = {
            id,
            algorithm: descriptor.key,
            params: identity.params,
            seed: identity.seed,
            exact: identity.exact,
            sample: identity.sample,
            timeBoxMs: options.timeBoxMs ?? null,
            style: options.style ?? true,
            shape: descriptor.shape,
            fields: descriptor.fields,
            engine: engineVersionsFor(descriptor.key, this.options.engine),
            caveats: Object.freeze({
                ...this.defaultCaveats,
                seed: identity.seed,
                method: descriptor.technicalName,
            }),
            execute: this.options.execute,
            ...(options.signal === undefined ? {} : { signal: options.signal }),
            ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
        };
        const surroundings: RunSurroundings = {
            label: () => this.labelOf(id),
            queuePosition: () => this.queuePositionOf(id),
            stale: () => this.staleOf(id),
            resolveScope: () => this.options.resolveScope(spec),
            enqueue: (body) => (policy === "now" ? enqueueBesideQueue(body, id) : this.enqueueOnQueue(id, body)),
            notify: (phase) => {
                this.announce(run, phase);

                if (phase === "end") {
                    // After the announcement, so a consumer watching runs has already been told
                    // the run finished by the time the layer it suggested arrives.
                    this.options.styling?.completed(run);
                }
            },
        };
        const run = new ManagedRun<RunResult>(definition, surroundings);

        this.runs.set(id, run);
        this.identities.set(id, canonicalIdentity(identity));

        if (derived) {
            this.derivedIds.add(id);
        }

        run.start();

        return run;
    }

    /**
     * Hand back a run that already answers this question, re-executing it if the data moved.
     * @param existing - The run this session already holds under that id.
     * @param identity - What the caller asked for.
     * @returns The existing run.
     * @throws A `GraphtyError` with code `E_DUPLICATE_ID` when the id names different work.
     */
    private reuse(existing: ManagedRun, identity: RunIdentity): Run {
        const wanted = canonicalIdentity(identity);

        if (this.identities.get(existing.id) !== wanted) {
            throw new GraphtyError({
                code: "E_DUPLICATE_ID",
                message:
                    `The run id "${existing.id}" already names a different computation. ` +
                    "Choose another id, or remove the run that holds it.",
                source: "run",
                target: { kind: "run", id: existing.id },
                details: { id: existing.id, held: existing.algorithm, wanted: identity.algorithm },
            });
        }

        if (this.shouldReexecute(existing)) {
            existing.rerun();
        }

        return existing;
    }

    /**
     * Whether starting this run again should re-execute it in place.
     *
     * Only when it has something to redo: work still queued or running is left alone, a finished
     * run is redone when the scope it ran over no longer resolves the same way, and a run that
     * failed or was cancelled is redone because it never published an answer.
     * @param run - The run held under the requested id.
     * @returns True when it should run again.
     */
    private shouldReexecute(run: ManagedRun): boolean {
        if (!isTerminalRunStatus(run.status)) {
            return false;
        }

        if (run.status !== "succeeded") {
            return true;
        }

        return this.options.resolveScope(run.scope.spec).digest !== run.scope.digest;
    }

    // -- the queue ----------------------------------------------------------------------------

    /**
     * Put a run's work in the element's operation queue.
     * @param id - The run id, for the queue's description.
     * @param body - The work.
     * @returns A ticket that cancels the queued operation.
     */
    private enqueueOnQueue(id: RunId, body: RunBody): RunTicket {
        const operationId = this.options.queue.queueOperation(
            "algorithm-run",
            async (context) => {
                await body(context);
            },
            { description: `Run ${id}` },
        );

        return {
            cancel: () => {
                this.options.queue.cancelOperation(operationId);
            },
        };
    }

    /**
     * The runs still waiting their turn, in the order they were started.
     * @returns The waiting runs.
     */
    private waiting(): ManagedRun[] {
        return [...this.runs.values()].filter((run) => run.status === "queued");
    }

    /**
     * Where one run sits among the runs still waiting.
     * @param id - The run id.
     * @returns The position counting from 0, or null when it is not waiting.
     */
    private queuePositionOf(id: RunId): number | null {
        const index = this.waiting().findIndex((run) => run.id === id);

        return index === -1 ? null : index;
    }

    /**
     * Cancel every other run of one algorithm, which is what the "replace" queue policy means.
     * @param algorithm - The algorithm whose runs make each other obsolete.
     * @param keep - The run that is replacing them.
     */
    private cancelSiblings(algorithm: AlgorithmKey, keep: RunId): void {
        for (const run of this.runs.values()) {
            if (run.algorithm === algorithm && run.id !== keep && run.cancellable) {
                run.cancel(`Replaced by a newer "${algorithm}" run.`);
            }
        }
    }

    // -- derived facts ------------------------------------------------------------------------

    /**
     * Why one run's numbers no longer describe what is on screen.
     * @param id - The run id.
     * @returns The note, or null when they still do.
     */
    private staleOf(id: RunId): StaleNote | null {
        const run = this.runs.get(id);

        if (run === undefined) {
            return null;
        }

        const current = this.options.resolveScope(run.scope.spec);

        if (current.digest === run.scope.digest) {
            return null;
        }

        return Object.freeze({
            ranOn: run.scope.nodeCount,
            nowVisible: current.nodeCount,
            scopeSpec: run.scope.spec,
        });
    }

    /**
     * What to call one run.
     *
     * The algorithm's plain name while it is the only run of that algorithm, gaining whatever
     * tells it apart from its siblings the moment one exists. Computed here rather than by the
     * consumer, so the layer row, the legend, the journal and every export say the same thing.
     * @param id - The run id.
     * @returns The label.
     */
    private labelOf(id: RunId): string {
        const run = this.runs.get(id);

        if (run === undefined) {
            return id;
        }

        const descriptor = this.findDescriptor(run.algorithm);
        const base = descriptor?.plainName ?? run.algorithm;
        const siblings = [...this.runs.values()].filter(
            (other) => other.algorithm === run.algorithm && other.id !== id,
        );

        if (siblings.length === 0) {
            return base;
        }

        return `${base} (${this.qualifierFor(run, siblings)})`;
    }

    /**
     * What tells one run apart from its siblings: the parameters that differ, or failing that the
     * scope it ran over.
     * @param run - The run being labelled.
     * @param siblings - The other runs of the same algorithm.
     * @returns The qualifier, without its parentheses.
     */
    private qualifierFor(run: ManagedRun, siblings: readonly ManagedRun[]): string {
        const differing = new Set<string>();

        for (const sibling of siblings) {
            for (const name of new Set([...Object.keys(run.params), ...Object.keys(sibling.params)])) {
                if (canonicalize(run.params[name]) !== canonicalize(sibling.params[name])) {
                    differing.add(name);
                }
            }
        }

        if (differing.size === 0) {
            return describeScope(run.scope.spec);
        }

        return [...differing]
            .sort((left, right) => (left < right ? -1 : 1))
            .map((name) => `${name} ${formatParamValue(run.params[name])}`)
            .join(", ");
    }

    // -- the catalogue ------------------------------------------------------------------------

    /**
     * One algorithm's catalogue entry.
     * @param algorithm - The algorithm key.
     * @returns The descriptor, or undefined when nothing registers that key.
     */
    private findDescriptor(algorithm: AlgorithmKey): AlgorithmDescriptor | undefined {
        return this.options.catalog.algorithms().find((candidate) => candidate.key === algorithm);
    }

    /**
     * One algorithm's catalogue entry, insisting that it exists.
     * @param algorithm - The algorithm key.
     * @returns The descriptor.
     * @throws A `GraphtyError` with code `E_UNKNOWN_ALGORITHM` when nothing registers that key.
     */
    private descriptorFor(algorithm: AlgorithmKey): AlgorithmDescriptor {
        const descriptor = this.findDescriptor(algorithm);

        if (descriptor === undefined) {
            throw new GraphtyError({
                code: "E_UNKNOWN_ALGORITHM",
                message: `No algorithm is registered under "${algorithm}".`,
                source: "run",
                details: {
                    algorithm,
                    available: this.options.catalog.algorithms().map((candidate) => candidate.key),
                },
            });
        }

        return descriptor;
    }

    /**
     * Check the caller's parameters against what the algorithm declares it accepts.
     * @param descriptor - The algorithm's catalogue entry.
     * @param params - What the caller passed.
     * @throws A `GraphtyError` with code `E_UNKNOWN_OPTION` or `E_OPTION_RANGE`.
     */
    private checkParams(descriptor: AlgorithmDescriptor, params: Readonly<Record<string, unknown>> | undefined): void {
        if (params === undefined) {
            return;
        }

        for (const [name, value] of Object.entries(params)) {
            if (value === undefined) {
                continue;
            }

            const option = descriptor.options.find((candidate) => candidate.name === name);

            if (option === undefined) {
                throw new GraphtyError({
                    code: "E_UNKNOWN_OPTION",
                    message: `"${name}" is not an option the "${descriptor.key}" algorithm accepts.`,
                    source: "run",
                    details: {
                        algorithm: descriptor.key,
                        option: name,
                        available: descriptor.options.map((candidate) => candidate.name),
                    },
                });
            }

            checkOptionValue(descriptor.key, option, value);
        }
    }

    // -- batches ------------------------------------------------------------------------------

    /**
     * The work a batch does: start each member in turn, on one progress stream and one cancel.
     * @param specs - What to run.
     * @param label - What the batch is called.
     * @returns The executor.
     */
    private batchExecutor(specs: readonly RunSpec[], label: string): RunExecutor<BatchResult> {
        return async (context) => {
            const steps: BatchStep[] = [];
            let completed = 0;

            // Held for the whole batch, so a sweep of six node metrics paints ONCE rather than
            // adding six colour layers with five of them invisible under the sixth. Released in
            // the `finally` below whatever stopped the batch: a cancelled sweep still keeps the
            // members that finished, and their picture is part of what was kept.
            this.options.styling?.hold();

            try {
                for (let index = 0; index < specs.length; index++) {
                    const spec = specs[index];

                    if (context.signal.aborted) {
                        steps.push({
                            index,
                            ok: false,
                            reason: "The batch was stopped before this member started.",
                        });
                        continue;
                    }

                    context.report({
                        phase: "running",
                        completed: index,
                        total: specs.length,
                        message: `Running ${spec.algorithm}`,
                    });

                    const step = await this.runBatchMember(context.signal, spec, index);
                    steps.push(step);

                    if (step.ok) {
                        completed += 1;
                    }
                }
            } finally {
                this.options.styling?.release();
            }

            const partial = completed < specs.length;

            return {
                result: Object.freeze({ label, total: specs.length, completed, partial, steps: Object.freeze(steps) }),
                partial,
                ...(partial ? { partialReason: `${completed} of ${specs.length} members finished.` } : {}),
            };
        };
    }

    /**
     * Run one member of a batch, keeping its failure to itself.
     *
     * A member that fails does not take the batch down: the batch reports how each member turned
     * out and the members that finished keep their results, because throwing away work somebody
     * paid for is not the element's decision to make.
     * @param signal - The batch's signal, which cancels the member that is in flight.
     * @param spec - What to run.
     * @param index - Its place in the specification list.
     * @returns How it turned out.
     */
    private async runBatchMember(signal: AbortSignal, spec: RunSpec, index: number): Promise<BatchStep> {
        let member: Run;

        try {
            member = this.start(spec.algorithm, spec.params, {
                ...(spec.scope === undefined ? {} : { scope: spec.scope }),
                ...(spec.seed === undefined ? {} : { seed: spec.seed }),
                ...(spec.as === undefined ? {} : { as: spec.as }),
                ...(spec.style === undefined ? {} : { style: spec.style }),
            });
        } catch (error) {
            return { index, ok: false, reason: error instanceof Error ? error.message : String(error) };
        }

        const stopMember = (): void => {
            member.cancel("The batch was canceled.");
        };

        signal.addEventListener("abort", stopMember, { once: true });

        try {
            await member;

            return { index, runId: member.id, ok: true };
        } catch (error) {
            return { index, runId: member.id, ok: false, reason: batchStepReason(error) };
        } finally {
            signal.removeEventListener("abort", stopMember);
        }
    }

    /**
     * Tell the session's observer that one run reached a watched moment.
     *
     * A throwing observer is contained here rather than allowed to reach the run: a status bar
     * that fails to render must not turn a successful computation into a failed one.
     * @param run - The run.
     * @param phase - Which moment it reached.
     */
    private announce(run: ManagedRun | ManagedRun<BatchResult>, phase: RunPhase): void {
        const { onChange } = this.options;

        if (onChange === undefined) {
            return;
        }

        try {
            onChange(Object.freeze({ run: run.record, phase }));
        } catch {
            // A watcher's failure is the watcher's. The run carries on.
        }
    }

    /**
     * Refuse work on a session that has been torn down.
     * @throws A `GraphtyError` with code `E_DISPOSED`.
     */
    private refuseWhenDisposed(): void {
        if (this.disposed) {
            throw new GraphtyError({
                code: "E_DISPOSED",
                message: "This session's runs have been disposed and accept no further work.",
                source: "run",
                details: { disposed: "runs" },
            });
        }
    }
}

/**
 * Why one batch member did not finish, in a sentence its row can show.
 * @param error - What the member threw.
 * @returns The reason.
 */
function batchStepReason(error: unknown): string {
    if (isAbortLike(error)) {
        return "The batch was canceled.";
    }

    return error instanceof Error ? error.message : String(error);
}

/**
 * Run work beside the queue rather than in it.
 *
 * Used by the "now" queue policy, and by every batch: a batch that occupied a sequential queue
 * would be waiting for members that cannot start until it finishes.
 * @param body - The work.
 * @param id - The run id, so the pseudo-operation has a name in a stack trace.
 * @returns A ticket that aborts the work.
 */
function enqueueBesideQueue(body: RunBody, id: RunId): RunTicket {
    const controller = new AbortController();

    void body({ signal: controller.signal, progress: NO_QUEUE_PROGRESS, id: `beside:${id}` });

    return {
        cancel: () => {
            controller.abort(new DOMException(`Run "${id}" was canceled.`, "AbortError"));
        },
    };
}

/**
 * Build the runs API over an existing operation queue.
 * @param options - The queue, the catalogue, the scope resolver and the thing that does the work.
 * @returns The runs API, plus the teardown a session needs.
 */
export function createRunsApi(options: RunsApiOptions): SessionRunsApi {
    return new Runs(options);
}
