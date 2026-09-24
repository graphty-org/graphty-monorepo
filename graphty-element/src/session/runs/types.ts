/**
 * @file A run: the object a started computation hands back.
 *
 * Starting an algorithm returns a `Run` rather than a bare promise, because everything a caller
 * needs to behave well is a fact about the running work and has nowhere else to live: what it
 * is called, how far it has got, whether it can be stopped, what qualifies the numbers it will
 * produce, and -- once it finishes -- the result itself. A call that returns nothing forces
 * every consumer to go looking for its own answer somewhere else, and an analysis that cannot be
 * watched or stopped is unusable on a graph big enough to be worth analysing.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: a run is plain data plus a promise, published
 * from the Node-safe `./session` entry point.
 *
 * One member of the design's run object is deliberately absent until the work that defines it
 * lands, rather than being stubbed with a placeholder type: `command`, the journalled command a
 * run was started from, which arrives with the command union.
 */

import type { AlgorithmKey, EdgeId, FieldDescriptor, LayerId, NodeId, ResultShape, RunId, Scope } from "../../catalog/types";
import type { GraphtyError } from "../../errors/GraphtyError";
import type { ResultSummary, RunResult } from "../results/types";
import type { StyleSuggestion } from "../styles/derive";

// ---------------------------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------------------------

/**
 * The identity of a journal entry.
 *
 * Declared here because a run carries the entry its command wrote and the journal itself has
 * not landed. It moves to the journal module when that arrives; nothing should declare a second
 * one in the meantime.
 */
export type JournalId = string;

/**
 * What a run id is allowed to look like.
 *
 * An id ends up inside a style selector, a saved document and an export filename, so it is
 * restricted to lower-case letters, digits, hyphens and underscores, starting with a letter.
 */
export const RUN_ID_PATTERN = /^[a-z][a-z0-9_-]*$/;

/**
 * Tell whether a string can be used as a run id.
 * @param value - The value to test.
 * @returns True when the value is a string matching the run-id pattern.
 */
export function isRunId(value: unknown): value is RunId {
    return typeof value === "string" && RUN_ID_PATTERN.test(value);
}

// ---------------------------------------------------------------------------------------------
// Status and progress
// ---------------------------------------------------------------------------------------------

/**
 * Where a run is in its life.
 *
 * "canceled" and "failed" are separate because a consumer treats them differently: a cancel is
 * something a person did and needs no apology, a failure is something the consumer has to
 * report. A time-boxed run that stopped early is neither -- it SUCCEEDS with `partial` set.
 */
export const RUN_STATUSES = ["queued", "running", "succeeded", "failed", "canceled"] as const;

/** Where a run is in its life. */
export type RunStatus = (typeof RUN_STATUSES)[number];

/** The statuses a run never leaves once it reaches them. */
export const TERMINAL_RUN_STATUSES: readonly RunStatus[] = Object.freeze(["succeeded", "failed", "canceled"]);

/**
 * Tell whether a value is one of the run statuses.
 * @param value - The value to test.
 * @returns True when the value is a member of RUN_STATUSES.
 */
export function isRunStatus(value: unknown): value is RunStatus {
    return typeof value === "string" && (RUN_STATUSES as readonly string[]).includes(value);
}

/**
 * Tell whether a run in this status has stopped for good.
 * @param status - The status to test.
 * @returns True when nothing further will happen to the run.
 */
export function isTerminalRunStatus(status: RunStatus): boolean {
    return TERMINAL_RUN_STATUSES.includes(status);
}

/**
 * The four moments a watcher is told about.
 *
 * Coarser than {@link RunStatus} on purpose: a status bar draws the same thing for a run that
 * failed and one that was cancelled -- it stops showing progress and reads the record -- so the
 * distinction belongs in the record the notification carries rather than in the notification's
 * own name.
 */
export const RUN_PHASES = ["queued", "start", "progress", "end"] as const;

/** Which moment in a run's life a notification is about. */
export type RunPhase = (typeof RUN_PHASES)[number];

/**
 * What a run notification carries.
 *
 * The record rather than the run: this crosses a DOM event and a worker boundary, where a live
 * object with a `cancel()` on it cannot go. A consumer that wants to cancel looks the run up by
 * `record.id`.
 */
export interface RunChange {
    /** The run, as a frozen snapshot. */
    readonly run: RunRecord;
    /** Which moment this is. */
    readonly phase: RunPhase;
}

/**
 * How far a run has got.
 *
 * `fraction` is null while the work is indeterminate, and it stays null: a percentage invented
 * for a progress bar that has nothing to measure is worse than a spinner, because it tells the
 * reader a lie they will time their patience against.
 */
export interface Progress {
    /** What the run is doing now, in words a progress line can show. */
    readonly phase: string;
    /** Whether the total is known. False means the run cannot say how much is left. */
    readonly determinate: boolean;
    /** How many units are done. */
    readonly completed: number;
    /** How many units there are in total, or null when that is not knowable. */
    readonly total: number | null;
    /** How far along, from 0 to 1, or null when indeterminate. Never a fabricated number. */
    readonly fraction: number | null;
    /** How much longer, in milliseconds, or null when that cannot be projected. */
    readonly etaMs: number | null;
    /** A sentence about the current step, when the run has one to offer. */
    readonly message?: string;
}

/**
 * Why a run's numbers no longer describe what is on screen.
 *
 * This is DERIVED rather than tracked: the element compares the scope digest the run recorded
 * against the current resolution of the same scope specification, so "computed on 200 nodes,
 * now showing 120" is answerable with the consumer tracking nothing.
 */
export interface StaleNote {
    /** How many elements the run was computed over. */
    readonly ranOn: number;
    /** How many the same scope resolves to now. */
    readonly nowVisible: number;
    /** The scope specification, so a consumer can offer to re-run over it. */
    readonly scopeSpec: Scope;
}

// ---------------------------------------------------------------------------------------------
// Caveats: what qualifies the numbers
// ---------------------------------------------------------------------------------------------

/** The arithmetic a run's numbers were computed in. */
export type Precision = "f32" | "f64";

/** How edge direction was treated. */
export type RunDirection = "directed" | "undirected" | "as-loaded";

/** What an edge weight was taken to mean. */
export interface WeightMeaning {
    /** The attribute the weight was read from. */
    readonly attribute: string;
    /** Whether a larger weight means further apart or more strongly connected. */
    readonly meaning: "distance" | "strength";
}

/**
 * What qualifies a run's numbers.
 *
 * Caveats travel with the result rather than sitting in a graph-level bag of facts, because two
 * runs of the same algorithm on the same graph can differ in every one of them. A consumer
 * comparing a value against a saved one, or ranking two nodes whose scores are within a rounding
 * error, reads the qualification from the same object that carries the value.
 *
 * `precision` is the clearest case: a run on an accelerator computes in single precision and
 * reports "f32", a run on the CPU path reports "f64", and without it "why does this number
 * disagree with the one I had a minute ago" has no answer.
 */
export interface Caveats {
    /** Whether the numbers are exact, or an approximation the element chose above the cost cap. */
    readonly exact: boolean;
    /** How many elements the approximation sampled. Present only when `exact` is false. */
    readonly sampleSize?: number;
    /** The seed a sampled or randomised run used, so it can be reproduced. */
    readonly seed?: number | null;
    /** Whether an iterative algorithm reached its convergence threshold. */
    readonly converged?: boolean;
    /** How many iterations it took. */
    readonly iterations?: number;
    /** Whether the run covered every component or only the largest. */
    readonly componentScope?: "all" | "largest";
    /** Whether a visibility filter narrowed what the run looked at. */
    readonly filterScope?: boolean;
    /** Whether a time window narrowed what the run looked at. */
    readonly windowScope?: boolean;
    /** How edge direction was treated. */
    readonly direction: RunDirection;
    /** What the edge weight was taken to mean, or null when the run ignored weights. */
    readonly weight?: WeightMeaning | null;
    /** The arithmetic that produced these numbers. */
    readonly precision: Precision;
    /** Which method computed them, such as "dijkstra" or "brandes-sampled". */
    readonly method: string;
    /**
     * Why a run stopped before it finished, when it did. Present exactly when the run resolved
     * with `partial` set -- a time box is the usual reason.
     */
    readonly partialReason?: string;
    /** Anything else a reader should know, in sentences. */
    readonly notes: readonly string[];
}

// ---------------------------------------------------------------------------------------------
// Scope, as a run records it
// ---------------------------------------------------------------------------------------------

/**
 * A scope specification resolved against the graph as it stands.
 *
 * Declared here because a run carries the scope it ran over and the scope API has not landed.
 * It moves to the scope module when that arrives; nothing should declare a second one in the
 * meantime.
 */
export interface ResolvedScope {
    /** The nodes in scope. */
    readonly nodes: ReadonlySet<NodeId>;
    /** The edges in scope. */
    readonly edges: ReadonlySet<EdgeId>;
    /** How many nodes are in scope. */
    readonly nodeCount: number;
    /** How many edges are in scope. */
    readonly edgeCount: number;
    /** Equal digests mean equal scopes, which is how staleness is derived rather than tracked. */
    readonly digest: string;
    /** What was asked for, before it was resolved. */
    readonly spec: Scope;
    /** When it was resolved, as an ISO 8601 timestamp. */
    readonly resolvedAt: string;
}

/** The scope a run ran over, in the structured-cloneable form a record carries. */
export interface RunScopeRecord {
    /** What was asked for. */
    readonly spec: Scope;
    /** How many nodes it resolved to. */
    readonly nodes: number;
    /** How many edges it resolved to. */
    readonly edges: number;
    /** The digest the staleness comparison reads. */
    readonly digest: string;
}

/** Which versions of which packages produced a result. */
export interface EngineVersions {
    /** The graphty-element version. */
    readonly element: string;
    /** The algorithms package version. */
    readonly algorithms: string;
    /** The layout package version. */
    readonly layout: string;
    /**
     * The versions of any registered extensions that produced these numbers, by catalogue key.
     *
     * WHY IT IS HERE. The three fixed fields above name the element and its two sibling packages,
     * which is everything when the element's own algorithm did the work. A run of a THIRD PARTY's
     * algorithm used to record those same three and nothing at all identifying the code that
     * actually computed the result -- which is the field's whole purpose. Filled from an optional
     * `static version` on the registered class, and absent when the class declares none.
     */
    readonly plugins?: Readonly<Record<string, string>>;
}

// ---------------------------------------------------------------------------------------------
// Starting a run
// ---------------------------------------------------------------------------------------------

/**
 * How a call joins the queue.
 *
 * "append" waits its turn. "replace" aborts the in-flight work of the same kind, rejecting its
 * promise with an AbortError. "now" runs beside the queue, and is refused for anything that
 * mutates.
 */
export const QUEUE_POLICIES = ["append", "replace", "now"] as const;

/** How a call joins the queue. */
export type QueuePolicy = (typeof QUEUE_POLICIES)[number];

/**
 * What any started work accepts.
 *
 * Declared beside `Progress` because `onProgress` is what makes it worth passing. It is the same
 * type the command executor takes when that lands; there is one of it, not two.
 */
export interface RunOptions {
    /** A signal that cancels the work. Cancelling rejects with an AbortError. */
    readonly signal?: AbortSignal;
    /** Called as the work advances, with the run's current progress. */
    readonly onProgress?: (progress: Progress) => void;
    /** How the call joins the queue. Defaults to "append". */
    readonly queue?: QueuePolicy;
    /** Ask what this would do and cost instead of doing it. Nothing is performed. */
    readonly dryRun?: boolean;
    /** Override the configured transition duration for this call only, in milliseconds. */
    readonly transitionMs?: number;
}

/**
 * What starting one algorithm accepts.
 *
 * `as` is the author-assigned id, and it is REQUIRED the moment anything that names the run is
 * persisted: a derived id is a function of the algorithm, the parameters and the scope, and a
 * saved document that referenced one would resolve differently against a different session.
 */
export interface StartOptions extends RunOptions {
    /** What the run may look at. Defaults to the visible graph. */
    readonly scope?: Scope;
    /** The seed for a randomised or sampled method, so a run can be reproduced. */
    readonly seed?: number;
    /**
     * Stop after this many milliseconds and publish what was computed.
     *
     * A run that hits its box RESOLVES with `partial` set and a reason in the caveats. A
     * stopped-early result is data, not a failure.
     */
    readonly timeBoxMs?: number;
    /** The id to give the run. Required for anything that will be saved. */
    readonly as?: RunId;
    /**
     * What the element paints on first completion. Set false to opt out of the encoding layer it
     * applies, or `{ size: true }` to size the nodes by a node measurement as well. See
     * {@link RunStyle}.
     */
    readonly style?: RunStyle;
    /** Refuse to approximate. Above the cost cap this fails rather than sampling. */
    readonly exact?: boolean;
    /** Ask for the approximate method at a chosen sample size. */
    readonly sample?: number;
}

/**
 * What a run paints when it first completes.
 *
 * - `true`, or left off: the colour suggestion its result shape calls for.
 * - `false`: nothing. The numbers are published and no layer is added.
 * - `{ size }`: the colour suggestion, plus -- for a run whose result is a node measurement
 *   (shape `"node-metric"`: PageRank, degree, betweenness and the rest) -- a node size encoding of
 *   the same field. `size: true` sizes nodes from 1 (the default node size, so the least
 *   important node looks unchanged) to 3; `size: [min, max]` uses that range. `size: false` or
 *   left off adds no size. For any other result shape the size is ignored, without an error,
 *   exactly as the colour suggestion itself depends on the shape.
 *
 * Every layer this adds is scoped to the nodes carrying the run's value, and is removed with the
 * run.
 */
export type RunStyle = boolean | { readonly size?: boolean | readonly [min: number, max: number] };

/** One member of a batch: the same thing `start` takes, as data. */
export interface RunSpec {
    /** Which algorithm to run. */
    readonly algorithm: AlgorithmKey;
    /** Its parameters. */
    readonly params?: Readonly<Record<string, unknown>>;
    /** What it may look at. */
    readonly scope?: Scope;
    /** The seed for a randomised or sampled method. */
    readonly seed?: number;
    /** The id to give the run. */
    readonly as?: RunId;
    /** What the element paints on first completion; see {@link RunStyle}. */
    readonly style?: RunStyle;
}

/** How one member of a batch turned out. */
export interface BatchStep {
    /** Its position in the specification list. */
    readonly index: number;
    /** The run it started, absent when the member never started. */
    readonly runId?: RunId;
    /** Whether it succeeded. */
    readonly ok: boolean;
    /** Why it did not, when it did not. */
    readonly reason?: string;
}

/**
 * What a batch produced.
 *
 * A cancelled batch KEEPS the members that already completed: they are results somebody paid
 * for, and throwing them away because a later member was stopped would be the element deciding
 * on the consumer's behalf that partial work is worthless.
 */
export interface BatchResult {
    /** What the batch is called. */
    readonly label: string;
    /** How many members it had. */
    readonly total: number;
    /** How many finished. */
    readonly completed: number;
    /** Whether it stopped before every member finished. */
    readonly partial: boolean;
    /** How each member turned out, in specification order. */
    readonly steps: readonly BatchStep[];
}

// ---------------------------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------------------------

/**
 * A frozen, structured-cloneable snapshot of a run.
 *
 * This is what crosses a worker boundary, what an event carries, what the journal stores and
 * what an export embeds. It holds no functions and no live references, so it can be posted,
 * saved and diffed; `Run` is the live object, and `run.record` is this.
 */
export interface RunRecord {
    /** The run id. */
    readonly id: RunId;
    /** What the run is called, computed by the element. */
    readonly label: string;
    /** Which algorithm ran. */
    readonly algorithm: AlgorithmKey;
    /** The parameters it ran with, canonicalised. */
    readonly params: Readonly<Record<string, unknown>>;
    /** The seed it used, or null when it needed none. */
    readonly seed: number | null;
    /** The scope it ran over. */
    readonly scope: RunScopeRecord;
    /** Where the run got to. */
    readonly status: RunStatus;
    /** When it started, as an ISO 8601 timestamp, or null while it is still queued. */
    readonly startedAt: string | null;
    /** How long it took, in milliseconds, or null until it finishes. */
    readonly durationMs: number | null;
    /** Whether it stopped early and published what it had. */
    readonly partial: boolean;
    /** Why its numbers no longer describe what is on screen, when they do not. */
    readonly stale: StaleNote | null;
    /** Which versions produced the numbers. */
    readonly engine: EngineVersions;
    /** The fields the run published. */
    readonly fields: readonly FieldDescriptor[];
    /** The shape, which fixes those field names. */
    readonly shape: ResultShape;
    /** What qualifies the numbers. */
    readonly caveats: Caveats;
    /** The bounded form of the result, once there is one. */
    readonly summary?: ResultSummary;
}

/**
 * A started computation.
 *
 * A run is a `PromiseLike`, NOT a `Promise` subclass, and the element attaches a no-op rejection
 * handler to the promise behind it. The two together are what make an element driven by clicks,
 * a console and an agent safe to use: a run fired from a click handler and never awaited cannot
 * produce an unhandled rejection, while `await run` still throws. Subclassing `Promise` would
 * give the opposite -- every unawaited failure reaching the window as an unhandled rejection --
 * and there is no way to have both.
 *
 * What a rejection means is fixed, so a consumer can tell the three cases apart without parsing
 * a message:
 *
 * - `cancel()` and an aborted `signal` reject with a `DOMException` named `AbortError`, which is
 *   what every consumer already knows how to test for.
 * - `AbortSignal.timeout()` rejects with a `DOMException` named `TimeoutError`, so a timeout is
 *   distinguishable from somebody pressing Cancel.
 * - Everything else rejects with a {@link GraphtyError} carrying a code.
 *
 * A time boxed run that hits its box does not reject at all: it RESOLVES, with `partial` set and
 * `caveats.partialReason` saying why. A stopped-early result is data.
 */
export interface Run<T = RunResult> extends PromiseLike<T> {
    /** The run id: stable, selector-safe, and author-assignable through `as`. */
    readonly id: RunId;
    /**
     * What to call the run.
     *
     * Computed by the element, never by the consumer: the algorithm's plain name on its own
     * while it is the only run of that algorithm, gaining the parameter that differs in
     * parentheses the moment a sibling exists. One string, used by the layer row, the legend,
     * the journal and every export.
     */
    readonly label: string;
    /** Which algorithm is running. */
    readonly algorithm: AlgorithmKey;
    /** The parameters it is running with, canonicalised. */
    readonly params: Readonly<Record<string, unknown>>;
    /** What it is allowed to look at, resolved against the graph as it stood when it started. */
    readonly scope: ResolvedScope;
    /** Where it has got to. */
    readonly status: RunStatus;
    /** How far along it is. */
    readonly progress: Progress;
    /** Whether the total is knowable, so a consumer can choose a bar or a spinner. */
    readonly determinate: boolean;
    /** Whether it can be stopped. Distinct from whether it HAS been stopped. */
    readonly cancellable: boolean;
    /** Its place in the queue, counting from 0, or null when it is not waiting. */
    readonly queuePosition: number | null;
    /** When it started, as an ISO 8601 timestamp, or null while it is still queued. */
    readonly startedAt: string | null;
    /** How long it took, in milliseconds, or null until it finishes. */
    readonly durationMs: number | null;
    /** Whether it stopped early and published what it had. Not a failure. */
    readonly partial: boolean;
    /** Why its numbers no longer describe what is on screen, when they do not. */
    readonly stale: StaleNote | null;
    /** Which versions produced the numbers. */
    readonly engine: EngineVersions;
    /** The fields it publishes. */
    readonly fields: readonly FieldDescriptor[];
    /** The shape, which fixes those field names. */
    readonly shape: ResultShape;
    /** What qualifies the numbers. */
    readonly caveats: Caveats;
    /**
     * The result, once there is one. Awaiting the run is the other way to get it.
     *
     * Spelled `?: T | undefined` rather than `?: T` because the implementation answers with a
     * getter, and under a consumer's `exactOptionalPropertyTypes` a getter that can return
     * undefined does not satisfy a property that can only be absent or present.
     */
    readonly result?: T | undefined;
    /** Why it failed, when it failed. Optional-or-undefined for the reason {@link Run.result} gives. */
    readonly error?: GraphtyError | undefined;
    /** The frozen, structured-cloneable snapshot of everything above. */
    readonly record: RunRecord;
    /** The journal entry this run's command wrote, or null until it lands. */
    readonly journalId: JournalId | null;
    /**
     * Stop the run.
     *
     * The promise rejects with a `DOMException` named `AbortError`. Calling this on a run that
     * has already finished does nothing.
     * @param reason - Why, for the journal and for an error message.
     */
    cancel(reason?: string): void;
    /**
     * Run it again, in place.
     *
     * The new run keeps the SAME id, so every style layer, legend and saved reference bound to
     * it survives. That is what "re-run from a layer" needs, and it is why a binding never
     * dangles after a re-run.
     * @returns The run, which is this one restarted rather than a second entry.
     */
    rerun(): Run<T>;
    /**
     * What this run suggests be drawn from it.
     *
     * Derived from the run's own shape and the fields it published, never from a block of styling
     * written per algorithm: a measurement suggests a colour over the elements it measured, a
     * grouping suggests a categorical colour, a route or a chosen set suggests a highlight, and a
     * table of pairs, a time series or a bare fact suggests nothing at all.
     *
     * The element applies these itself on a run's first completion unless `{ style: false }` was
     * asked for. Reading them is for a consumer that wants to show what WOULD be painted, apply it
     * at another moment, or alter the taste before it lands -- each suggestion is the specification
     * `styles.encode()` or `styles.highlight()` takes, with its taste left unsaid so the element's
     * own defaults settle it.
     * @returns The suggestions, empty when the result is read rather than painted.
     */
    suggestEncodings(): readonly StyleSuggestion[];
}

// ---------------------------------------------------------------------------------------------
// The runs API
// ---------------------------------------------------------------------------------------------

/** One waiting run's place in the queue. */
export interface QueueEntry {
    /** The run that is waiting. */
    readonly runId: RunId;
    /** Its position, counting from 0. */
    readonly index: number;
    /** How many runs are waiting in total, so a consumer can say "2 of 3". */
    readonly of: number;
}

/**
 * What removing a run took with it.
 *
 * Returned so a consumer can say "Removes 1 style layer" BEFORE it asks for confirmation, which
 * is the difference between a delete a reader can consent to and one they discover afterwards.
 */
export interface RunRemoval {
    /** How many style layers were removed with the run. */
    readonly removedLayers: number;
    /** Which ones, so an undo can name them. */
    readonly layerIds: readonly LayerId[];
}

/**
 * Starting runs, finding them, and taking them away.
 *
 * Starting the same algorithm with the same parameters over the same scope returns the run that
 * already exists rather than a second one, re-executing it in place if the data moved under it.
 * Ids are therefore deterministic -- derived from the algorithm, the canonical parameters and
 * the scope digest, never from an execution counter -- so that a saved layer, recipe or template
 * resolves to the same run whatever order things happened to run in.
 */
export interface RunsApi {
    /**
     * Start one algorithm.
     * @param algorithm - Which algorithm to run.
     * @param params - Its parameters.
     * @param options - The scope, the seed, the id and the rest.
     * @returns The run, which is awaitable and watchable straight away.
     */
    start(algorithm: AlgorithmKey, params?: Readonly<Record<string, unknown>>, options?: StartOptions): Run;
    /**
     * Start several algorithms as one piece of work, with one progress stream and one cancel.
     * @param specs - What to run.
     * @param options - The batch's label, and the ordinary run options.
     * @returns A run over the batch, resolving to how each member turned out.
     */
    batch(specs: readonly RunSpec[], options?: RunOptions & { readonly label?: string }): Run<BatchResult>;
    /**
     * One run, by id.
     * @param id - The run id.
     * @returns The run, or undefined when this session holds none with that id.
     */
    get(id: RunId): Run | undefined;
    /**
     * Every run this session holds, finished or not.
     * @returns The runs, in the order they were started.
     */
    list(): readonly Run[];
    /**
     * Remove a run and every style layer reading it.
     *
     * This is the other delete verb: removing a LAYER takes away the picture and keeps the
     * result, removing a RUN takes away the result and everything drawn from it.
     * @param id - The run id.
     * @returns What went with it.
     */
    remove(id: RunId): RunRemoval;
    /**
     * Which style layers read a run.
     *
     * Run-to-layer is many-to-many, so a layer reading two runs survives the removal of one.
     * @param id - The run id.
     * @returns The layer ids.
     */
    bindings(id: RunId): readonly LayerId[];
    /** The runs waiting to start, in queue order. */
    readonly queue: readonly QueueEntry[];
}
