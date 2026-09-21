/**
 * @file The run object: the addressable, watchable, cancellable handle a started computation
 * hands back.
 *
 * A run sits in front of the element's existing operation queue rather than beside it. The queue
 * still owns ordering, obsolescence, the abort controller and the progress events every other
 * operation emits; what a run adds is the half a caller cannot reach from an operation id -- an
 * identity, a label, the scope and caveats that qualify the numbers, a promise that resolves to
 * the result, and a `cancel()` a button can be wired to.
 *
 * Three behaviours here are contracts rather than implementation details, and each exists because
 * the alternative is a defect a consumer cannot work around:
 *
 * - **A run is a `PromiseLike`, not a `Promise` subclass, and the promise behind it always
 *   carries a rejection handler.** A run fired from a click handler and never awaited cannot
 *   reach the window as an unhandled rejection, while `await run` still throws.
 * - **Cancelling rejects with a `DOMException` named `AbortError`.** Every consumer already knows
 *   how to test for that, and a timeout from `AbortSignal.timeout()` arrives as `TimeoutError`,
 *   so "somebody pressed Cancel" and "this took too long" stay distinguishable.
 * - **Stopping early is not failing.** A run that hits its time box RESOLVES with `partial` set
 *   and a reason in its caveats. A result somebody paid for is data, whatever stopped it.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM beyond `AbortController`, `AbortSignal` and
 * `DOMException`, which Node has had since 18.
 */

import type { AlgorithmKey, FieldDescriptor, ResultShape, RunId } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import type { ResultSummary, RunResult } from "../results/types";
import { type StyleSuggestion, suggestStyles } from "../styles/derive";
import {
    type Caveats,
    type EngineVersions,
    isTerminalRunStatus,
    type JournalId,
    type Progress,
    type ResolvedScope,
    type Run,
    type RunPhase,
    type RunRecord,
    type RunScopeRecord,
    type RunStatus,
    type StaleNote,
} from "./types";

// ---------------------------------------------------------------------------------------------
// What the queue gives a run, and what the run gives the queue
// ---------------------------------------------------------------------------------------------

/**
 * Where a run writes its progress so the element's existing operation events carry it.
 *
 * This is the shape `OperationQueueManager` already hands every operation. A run does not invent
 * a second progress channel: it writes to this one and publishes the richer {@link Progress} on
 * itself.
 */
export interface RunProgressSink {
    /**
     * Set how far along the operation is.
     * @param percent - The percentage, from 0 to 100.
     */
    setProgress(percent: number): void;
    /**
     * Set the sentence describing the current step.
     * @param message - The sentence.
     */
    setMessage(message: string): void;
    /**
     * Set the name of the current phase.
     * @param phase - The phase name.
     */
    setPhase(phase: string): void;
}

/** What the queue hands a run's body when its turn comes. */
export interface RunQueueContext {
    /** The signal the queue aborts when the operation is cancelled or obsoleted. */
    readonly signal: AbortSignal;
    /** Where to write progress, so the queue's own events carry it. */
    readonly progress: RunProgressSink;
    /** The queue's operation id, which is not the run id. */
    readonly id: string;
}

/** A run's work, as the queue takes it. */
export type RunBody = (context: RunQueueContext) => Promise<void>;

/** A handle on work that has been handed to the queue. */
export interface RunTicket {
    /** Stop the work, whether it has started or is still waiting its turn. */
    cancel(): void;
}

// ---------------------------------------------------------------------------------------------
// What an algorithm's implementation sees
// ---------------------------------------------------------------------------------------------

/** One progress update, as the thing doing the work reports it. */
export interface RunProgressReport {
    /** What it is doing now. Unchanged when absent. */
    readonly phase?: string;
    /** How many units are done. Unchanged when absent. */
    readonly completed?: number;
    /** How many units there are, or null when that is not knowable. Unchanged when absent. */
    readonly total?: number | null;
    /** A sentence about the current step. Unchanged when absent. */
    readonly message?: string;
}

/**
 * What the thing doing the work is given.
 *
 * `signal` and `timeBox` are two different instructions and must not be folded together. An
 * aborted `signal` means stop and throw; an aborted `timeBox` means stop and RETURN what you
 * have, so the run can publish a partial result instead of a failure.
 */
export interface RunExecutionContext {
    /** The run this work belongs to. */
    readonly runId: RunId;
    /** Which algorithm to run. */
    readonly algorithm: AlgorithmKey;
    /** Its parameters, canonicalised. */
    readonly params: Readonly<Record<string, unknown>>;
    /** What it may look at, resolved against the graph as it stands now. */
    readonly scope: ResolvedScope;
    /** The seed a randomised or sampled method should use, or null. */
    readonly seed: number | null;
    /** Whether the caller refused approximation, or null when it did not say. */
    readonly exact: boolean | null;
    /** The sample size the caller asked for, or null. */
    readonly sample: number | null;
    /** The time box in milliseconds, or null when the run is not boxed. */
    readonly timeBoxMs: number | null;
    /** Aborted when the run is cancelled. Throw from here; do not swallow it. */
    readonly signal: AbortSignal;
    /** Aborted when the time box expires. Stop and return what has been computed. */
    readonly timeBox: AbortSignal | null;
    /**
     * Report how far along the work is.
     * @param progress - What changed.
     */
    report(progress: RunProgressReport): void;
}

/**
 * What the thing doing the work hands back.
 *
 * The fields and caveats travel with the result rather than being restated by the run, because
 * only the implementation knows what it actually filled in and in what arithmetic.
 */
export interface RunOutcome<T = RunResult> {
    /** The result the run resolves to. */
    readonly result: T;
    /** What qualifies the numbers, merged over the defaults the run started with. */
    readonly caveats?: Partial<Caveats>;
    /** The fields this run actually published, which may be fewer than the algorithm declares. */
    readonly fields?: readonly FieldDescriptor[];
    /** The bounded form of the result, for the run's record. */
    readonly summary?: ResultSummary;
    /** Whether the work stopped before it finished. Taken from the time box when absent. */
    readonly partial?: boolean;
    /** Why it stopped early, in a sentence. */
    readonly partialReason?: string;
}

/** The thing that does the work. */
export type RunExecutor<T = RunResult> = (context: RunExecutionContext) => Promise<RunOutcome<T>>;

// ---------------------------------------------------------------------------------------------
// How a run is built
// ---------------------------------------------------------------------------------------------

/** Everything a run is, before it has done anything. */
export interface RunDefinition<T = RunResult> {
    /** The run id: author-assigned or derived, never counted. */
    readonly id: RunId;
    /** Which algorithm this run runs. */
    readonly algorithm: AlgorithmKey;
    /** Its parameters, canonicalised. */
    readonly params: Readonly<Record<string, unknown>>;
    /** The seed it uses, or null. */
    readonly seed: number | null;
    /** Whether approximation was refused, or null when the caller did not say. */
    readonly exact: boolean | null;
    /** The sample size asked for, or null. */
    readonly sample: number | null;
    /** How long it may take before it publishes what it has, or null when it is not boxed. */
    readonly timeBoxMs: number | null;
    /** Whether the element may apply the derived encoding layer on first completion. */
    readonly style: boolean;
    /** The shape of the result, which fixes its field names. */
    readonly shape: ResultShape;
    /** The fields the algorithm declares, until the run says which it actually filled. */
    readonly fields: readonly FieldDescriptor[];
    /** Which versions are about to produce the numbers. */
    readonly engine: EngineVersions;
    /** The caveats the run starts from, which the outcome refines. */
    readonly caveats: Caveats;
    /** The thing that does the work. */
    readonly execute: RunExecutor<T>;
    /** A caller's signal. Aborting it cancels the run. */
    readonly signal?: AbortSignal;
    /**
     * Called every time the run's progress changes.
     * @param progress - Where the run has got to.
     */
    readonly onProgress?: (progress: Progress) => void;
    /**
     * Whether cancelling publishes what was computed instead of rejecting.
     *
     * False for one algorithm, which has nothing to publish once it is stopped. True for a batch,
     * whose completed members are results somebody paid for and which the element must not throw
     * away because a later member was stopped.
     */
    readonly publishOnCancel?: boolean;
}

/** What a run asks of whoever is holding it. */
export interface RunSurroundings {
    /**
     * What to call this run right now.
     *
     * A thunk rather than a string because the answer changes: a run is called by its algorithm's
     * plain name until a sibling run of the same algorithm exists, and then it gains the
     * parameter that tells them apart.
     * @returns The label.
     */
    label(): string;
    /**
     * Where this run sits among the runs still waiting.
     * @returns The position counting from 0, or null when it is not waiting.
     */
    queuePosition(): number | null;
    /**
     * Why this run's numbers no longer describe what is on screen.
     * @returns The note, or null when they still do.
     */
    stale(): StaleNote | null;
    /**
     * Resolve this run's scope against the graph as it stands now.
     * @returns The resolved scope.
     */
    resolveScope(): ResolvedScope;
    /**
     * Hand the run's work to the queue.
     * @param body - The work.
     * @returns A handle that can stop it.
     */
    enqueue(body: RunBody): RunTicket;
    /**
     * Say that the run reached one of the four moments a watcher is told about.
     *
     * Optional, because a run is usable with nobody watching it -- a test drives one directly --
     * and a run that had to be handed an observer in order to run would make the observer part of
     * the machinery rather than part of the session.
     * @param phase - Which moment.
     */
    notify?(phase: RunPhase): void;
}

// ---------------------------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------------------------

/** How far a run that has not started yet has got. */
const QUEUED_PROGRESS: Progress = Object.freeze({
    phase: "queued",
    determinate: false,
    completed: 0,
    total: null,
    fraction: null,
    etaMs: null,
});

/** How many percent a fraction of 1 is, for the queue's own progress channel. */
const PERCENT = 100;

/** A promise with its settlement handles kept to one side. */
interface Deferred<T> {
    /** The promise itself. */
    readonly promise: Promise<T>;
    /**
     * Settle it with a value.
     * @param value - The value.
     */
    resolve(value: T): void;
    /**
     * Settle it with a failure.
     * @param reason - Why.
     */
    reject(reason: unknown): void;
}

/**
 * Build a deferred whose promise can never become an unhandled rejection.
 *
 * The no-op handler attached here is what makes a fire-and-forget run safe: the promise is
 * already "handled" the moment it exists, so a failure nobody awaited stays inside the run
 * object, while a caller that does await still sees the rejection.
 * @returns The deferred.
 */
function createDeferred<T>(): Deferred<T> {
    let resolve: (value: T) => void = () => undefined;
    let reject: (reason: unknown) => void = () => undefined;
    const promise = new Promise<T>((settle, fail) => {
        resolve = settle;
        reject = fail;
    });

    void promise.catch(() => undefined);

    return { promise, resolve, reject };
}

/**
 * The monotonic clock, for durations that a wall-clock change cannot corrupt.
 * @returns Milliseconds since an arbitrary origin.
 */
function nowMs(): number {
    return performance.now();
}

/**
 * Tell whether a thrown value is an abort rather than a failure.
 * @param error - The thrown value.
 * @returns True when it is an `AbortError` or a `TimeoutError`.
 */
function isAbortLike(error: unknown): error is Error {
    return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/**
 * Abort one controller when a signal aborts, carrying the reason across.
 * @param source - The signal to watch.
 * @param target - The controller to abort.
 */
function forwardAbort(source: AbortSignal, target: AbortController): void {
    if (source.aborted) {
        target.abort(source.reason);

        return;
    }

    source.addEventListener(
        "abort",
        () => {
            target.abort(source.reason);
        },
        { once: true },
    );
}

/**
 * The `DOMException` a cancellation rejects with.
 * @param signal - The signal that carried the reason, when there was one.
 * @param fallback - The message to use when the reason is not an exception of its own.
 * @returns The exception.
 */
function abortError(signal: AbortSignal | null, fallback: string): Error {
    const reason: unknown = signal?.reason;

    if (reason instanceof DOMException) {
        return reason;
    }

    return new DOMException(typeof reason === "string" && reason !== "" ? reason : fallback, "AbortError");
}

// ---------------------------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------------------------

/**
 * A started computation.
 *
 * Built by the runs API rather than by a consumer: everything it needs to answer -- its label,
 * its place in the queue, whether it has gone stale -- is a fact about the session it belongs to,
 * and is supplied as {@link RunSurroundings}.
 */
export class ManagedRun<T = RunResult> implements Run<T> {
    readonly id: RunId;

    readonly algorithm: AlgorithmKey;

    readonly params: Readonly<Record<string, unknown>>;

    readonly seed: number | null;

    readonly shape: ResultShape;

    readonly engine: EngineVersions;

    /**
     * Whether the element may apply the derived encoding layer when this run first completes.
     *
     * Read by the auto-apply policy, which is not this module's to enforce.
     */
    readonly style: boolean;

    /** The journal has not landed, so every run reports that it wrote no entry. */
    readonly journalId: JournalId | null = null;

    private readonly definition: RunDefinition<T>;

    private readonly surroundings: RunSurroundings;

    private scopeValue: ResolvedScope;

    private statusValue: RunStatus = "queued";

    private progressValue: Progress = QUEUED_PROGRESS;

    private caveatsValue: Caveats;

    private fieldsValue: readonly FieldDescriptor[];

    private resultValue: T | undefined = undefined;

    private summaryValue: ResultSummary | undefined = undefined;

    private errorValue: GraphtyError | undefined = undefined;

    private startedAtValue: string | null = null;

    private startedAtMs = 0;

    private durationValue: number | null = null;

    private partialValue = false;

    private deferred: Deferred<T> = createDeferred<T>();

    private ticket: RunTicket | null = null;

    private executionController: AbortController | null = null;

    private timeBoxTimer: ReturnType<typeof setTimeout> | null = null;

    private detachSignal: (() => void) | null = null;

    private queueSink: RunProgressSink | null = null;

    private settledFlag = false;

    /** Why a cancel is being honoured, when the run publishes what it has instead of rejecting. */
    private cancelReason: string | null = null;

    /**
     * Build a run that has not been handed to the queue yet.
     * @param definition - What the run is.
     * @param surroundings - What the run asks of the session holding it.
     */
    constructor(definition: RunDefinition<T>, surroundings: RunSurroundings) {
        this.definition = definition;
        this.surroundings = surroundings;
        this.id = definition.id;
        this.algorithm = definition.algorithm;
        this.params = definition.params;
        this.seed = definition.seed;
        this.shape = definition.shape;
        this.engine = definition.engine;
        this.style = definition.style;
        this.caveatsValue = definition.caveats;
        this.fieldsValue = definition.fields;
        this.scopeValue = surroundings.resolveScope();
    }

    // -- the facts ----------------------------------------------------------------------------

    /**
     * What to call this run, computed by the element rather than by the consumer.
     * @returns The label.
     */
    get label(): string {
        return this.surroundings.label();
    }

    /**
     * What this run may look at, as it stood when the work started.
     * @returns The resolved scope.
     */
    get scope(): ResolvedScope {
        return this.scopeValue;
    }

    /**
     * Where the run has got to.
     * @returns The status.
     */
    get status(): RunStatus {
        return this.statusValue;
    }

    /**
     * How far along the run is.
     * @returns The progress.
     */
    get progress(): Progress {
        return this.progressValue;
    }

    /**
     * Whether the total is knowable, so a consumer can choose a bar over a spinner.
     * @returns True when the progress is determinate.
     */
    get determinate(): boolean {
        return this.progressValue.determinate;
    }

    /**
     * Whether the run can still be stopped. Not the same question as whether it has been.
     * @returns True while the run has not settled.
     */
    get cancellable(): boolean {
        return !this.settledFlag && !isTerminalRunStatus(this.statusValue);
    }

    /**
     * Where this run sits among the runs still waiting.
     * @returns The position counting from 0, or null when it is not waiting.
     */
    get queuePosition(): number | null {
        return this.statusValue === "queued" ? this.surroundings.queuePosition() : null;
    }

    /**
     * When the work started.
     * @returns An ISO 8601 timestamp, or null while the run is still queued.
     */
    get startedAt(): string | null {
        return this.startedAtValue;
    }

    /**
     * How long the work took.
     * @returns Milliseconds, or null until the run finishes.
     */
    get durationMs(): number | null {
        return this.durationValue;
    }

    /**
     * Whether the run stopped early and published what it had. Not a failure.
     * @returns True when the result is partial.
     */
    get partial(): boolean {
        return this.partialValue;
    }

    /**
     * Why the run's numbers no longer describe what is on screen.
     *
     * Derived by comparing the scope digest the run recorded against what the same specification
     * resolves to now, so nothing has to be tracked for this answer to be available.
     * @returns The note, or null when the numbers still describe the graph.
     */
    get stale(): StaleNote | null {
        return this.statusValue === "succeeded" ? this.surroundings.stale() : null;
    }

    /**
     * The fields this run publishes: what the algorithm declares until the run says otherwise.
     * @returns The field descriptors.
     */
    get fields(): readonly FieldDescriptor[] {
        return this.fieldsValue;
    }

    /**
     * What qualifies the run's numbers.
     * @returns The caveats.
     */
    get caveats(): Caveats {
        return this.caveatsValue;
    }

    /**
     * The result, once there is one.
     * @returns The result, or undefined until the run succeeds.
     */
    get result(): T | undefined {
        return this.resultValue;
    }

    /**
     * Why the run failed.
     * @returns The error, or undefined when it did not.
     */
    get error(): GraphtyError | undefined {
        return this.errorValue;
    }

    /**
     * The frozen, structured-cloneable snapshot of everything above.
     * @returns The record.
     */
    get record(): RunRecord {
        const scope: RunScopeRecord = Object.freeze({
            spec: this.scopeValue.spec,
            nodes: this.scopeValue.nodeCount,
            edges: this.scopeValue.edgeCount,
            digest: this.scopeValue.digest,
        });

        const record: RunRecord = {
            id: this.id,
            label: this.label,
            algorithm: this.algorithm,
            params: this.params,
            seed: this.seed,
            scope,
            status: this.statusValue,
            startedAt: this.startedAtValue,
            durationMs: this.durationValue,
            partial: this.partialValue,
            stale: this.stale,
            engine: this.engine,
            fields: this.fieldsValue,
            shape: this.shape,
            caveats: this.caveatsValue,
            ...(this.summaryValue === undefined ? {} : { summary: this.summaryValue }),
        };

        return Object.freeze(record);
    }

    // -- the promise --------------------------------------------------------------------------

    /**
     * Await the run's result.
     *
     * Declared rather than inherited: a run is a `PromiseLike`, not a `Promise` subclass, so that
     * a run nobody awaited cannot reach the window as an unhandled rejection.
     * @param onfulfilled - Called with the result.
     * @param onrejected - Called with the failure.
     * @returns A promise for whatever the handlers return.
     */
    then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
        return this.deferred.promise.then(onfulfilled, onrejected);
    }

    // -- the verbs ----------------------------------------------------------------------------

    /**
     * Hand the run's work to the queue. Calling this twice does nothing.
     */
    start(): void {
        if (this.ticket !== null || this.settledFlag) {
            return;
        }

        const { signal } = this.definition;

        if (signal !== undefined && signal.aborted) {
            this.finishAsCanceled(abortError(signal, `Run "${this.id}" was aborted before it started.`));

            return;
        }

        this.attachCallerSignal();
        // Announced BEFORE the work is handed over, because work handed to the "now" policy or to
        // a batch begins synchronously inside `enqueue` -- so a watcher told afterwards would see
        // the run start, report and finish before it heard that it was queued.
        this.surroundings.notify?.("queued");
        this.ticket = this.surroundings.enqueue(async (context) => {
            await this.body(context);
        });
    }

    /**
     * Stop the run.
     *
     * The promise rejects with a `DOMException` named `AbortError`, except for work declared with
     * `publishOnCancel` -- a batch -- where the promise instead resolves with whatever had been
     * computed. Calling this on a finished run does nothing.
     * @param reason - Why, for the message and for the journal.
     */
    cancel(reason?: string): void {
        if (!this.cancellable) {
            return;
        }

        const message = reason ?? `Run "${this.id}" was canceled.`;
        const error = new DOMException(message, "AbortError");

        if (this.definition.publishOnCancel === true && this.statusValue === "running") {
            // The work publishes what it has; `succeed` reads this and records the cancel.
            this.cancelReason = message;
            this.executionController?.abort(error);

            return;
        }

        this.statusValue = "canceled";
        this.durationValue = this.startedAtMs === 0 ? null : Math.round(nowMs() - this.startedAtMs);
        this.settle(() => {
            this.deferred.reject(error);
        });
        this.stopWork(error);
    }

    /**
     * Run it again, in place.
     *
     * The run keeps its id, so every style layer, legend and saved reference bound to it survives.
     * A run that has not finished is left alone rather than restarted.
     * @returns This run, restarted.
     */
    rerun(): Run<T> {
        if (!isTerminalRunStatus(this.statusValue)) {
            return this;
        }

        this.resetForRerun();
        this.start();

        return this;
    }

    /**
     * What this run suggests be drawn from it.
     *
     * Derived from the shape and the fields, so there is nothing per algorithm to get wrong and
     * nothing for a run to declare beyond what it already declares. The element applies these
     * itself on a first completion; a consumer reads them to show what would be painted, to paint
     * it at another moment, or to change the taste before it lands.
     * @returns The suggestions, empty when the result is read rather than painted.
     */
    suggestEncodings(): readonly StyleSuggestion[] {
        return suggestStyles(this);
    }

    // -- execution ----------------------------------------------------------------------------

    /**
     * The work, as the queue runs it.
     * @param context - What the queue hands the operation.
     */
    private async body(context: RunQueueContext): Promise<void> {
        if (this.settledFlag) {
            return;
        }

        this.queueSink = context.progress;
        this.statusValue = "running";
        this.startedAtValue = new Date().toISOString();
        this.startedAtMs = nowMs();
        this.scopeValue = this.surroundings.resolveScope();

        const execution = new AbortController();
        this.executionController = execution;
        forwardAbort(context.signal, execution);

        const { signal } = this.definition;

        if (signal !== undefined) {
            forwardAbort(signal, execution);
        }

        const timeBox = this.startTimeBox();
        this.surroundings.notify?.("start");
        this.report({ phase: "running", completed: 0 });

        try {
            const outcome = await this.definition.execute({
                runId: this.id,
                algorithm: this.algorithm,
                params: this.params,
                scope: this.scopeValue,
                seed: this.seed,
                exact: this.definition.exact,
                sample: this.definition.sample,
                timeBoxMs: this.definition.timeBoxMs,
                signal: execution.signal,
                timeBox,
                report: (progress) => {
                    this.report(progress);
                },
            });

            this.succeed(outcome, timeBox);
        } catch (error) {
            this.fail(error);
        } finally {
            this.clearTimeBox();
        }
    }

    /**
     * Start the time box, if there is one.
     *
     * The box does NOT abort the execution signal: an expired box means "stop and publish what you
     * have", and aborting the work's own signal would turn a partial result into a failure.
     * @returns The box's signal, or null when the run is not boxed.
     */
    private startTimeBox(): AbortSignal | null {
        const { timeBoxMs } = this.definition;

        if (timeBoxMs === null) {
            return null;
        }

        const controller = new AbortController();
        this.timeBoxTimer = setTimeout(() => {
            controller.abort(new DOMException(`Run "${this.id}" reached its ${timeBoxMs} ms time box.`, "TimeoutError"));
        }, timeBoxMs);

        return controller.signal;
    }

    /** Stop the time box's timer, whether or not it fired. */
    private clearTimeBox(): void {
        if (this.timeBoxTimer !== null) {
            clearTimeout(this.timeBoxTimer);
            this.timeBoxTimer = null;
        }
    }

    /**
     * Record a finished piece of work and settle the promise with its result.
     * @param outcome - What the work produced.
     * @param timeBox - The time box's signal, so an expired box becomes a partial result.
     */
    private succeed(outcome: RunOutcome<T>, timeBox: AbortSignal | null): void {
        if (this.settledFlag) {
            return;
        }

        const canceled = this.cancelReason !== null;
        const timedOut = timeBox !== null && timeBox.aborted;
        const partial = outcome.partial ?? (timedOut || canceled);

        this.resultValue = outcome.result;
        this.summaryValue = outcome.summary;
        this.fieldsValue = outcome.fields ?? this.fieldsValue;
        this.caveatsValue = this.mergeCaveats(outcome, partial, timedOut);
        this.partialValue = partial;
        this.durationValue = Math.round(nowMs() - this.startedAtMs);
        this.statusValue = canceled ? "canceled" : "succeeded";
        const { total } = this.progressValue;
        this.report({ phase: canceled ? "canceled" : "done", completed: total ?? this.progressValue.completed, total });
        this.settle(() => {
            this.deferred.resolve(outcome.result);
        });
    }

    /**
     * Record a piece of work that threw.
     * @param error - What it threw.
     */
    private fail(error: unknown): void {
        if (this.settledFlag) {
            return;
        }

        if (isAbortLike(error)) {
            this.finishAsCanceled(error);

            return;
        }

        const wrapped = GraphtyError.wrap(error, {
            code: "E_INTERNAL",
            source: "run",
            target: { kind: "run", id: this.id },
            details: { algorithm: this.algorithm, runId: this.id },
        });

        this.errorValue = wrapped;
        this.statusValue = "failed";
        this.durationValue = this.startedAtMs === 0 ? null : Math.round(nowMs() - this.startedAtMs);
        this.report({ phase: "failed" });
        this.settle(() => {
            this.deferred.reject(wrapped);
        });
    }

    /**
     * Settle the run as cancelled, rejecting with the exception a consumer tests for.
     * @param error - The abort or timeout exception.
     */
    private finishAsCanceled(error: Error): void {
        if (this.settledFlag) {
            return;
        }

        this.statusValue = "canceled";
        this.durationValue = this.startedAtMs === 0 ? null : Math.round(nowMs() - this.startedAtMs);
        this.settle(() => {
            this.deferred.reject(error);
        });
    }

    /**
     * Fold what the work reported into the caveats the run started with.
     * @param outcome - What the work produced.
     * @param partial - Whether the run stopped early.
     * @param timedOut - Whether the time box is what stopped it.
     * @returns The caveats, frozen.
     */
    private mergeCaveats(outcome: RunOutcome<T>, partial: boolean, timedOut: boolean): Caveats {
        const reported = outcome.caveats ?? {};
        const merged: Caveats = { ...this.definition.caveats, ...reported };

        if (!partial) {
            return Object.freeze(merged);
        }

        const stated = outcome.partialReason ?? reported.partialReason ?? merged.partialReason;
        const reason = stated ?? this.defaultPartialReason(timedOut);

        return Object.freeze({ ...merged, partialReason: reason });
    }

    /**
     * What to say about a run that stopped early and did not say why itself.
     * @param timedOut - Whether the time box is what stopped it.
     * @returns The sentence.
     */
    private defaultPartialReason(timedOut: boolean): string {
        if (timedOut) {
            return `Stopped after the ${this.definition.timeBoxMs ?? 0} ms time box and published what was computed.`;
        }

        return this.cancelReason ?? "Stopped before every element was measured.";
    }

    // -- progress -----------------------------------------------------------------------------

    /**
     * Fold one update into the run's progress and publish it everywhere it is watched.
     * @param update - What changed.
     */
    private report(update: RunProgressReport): void {
        const previous = this.progressValue;
        const phase = update.phase ?? previous.phase;
        const completed = update.completed ?? previous.completed;
        const total = update.total === undefined ? previous.total : update.total;
        const determinate = total !== null;
        const fraction = total === null ? null : fractionOf(completed, total);
        const message = update.message ?? previous.message;
        const next: Progress = Object.freeze({
            phase,
            determinate,
            completed,
            total,
            fraction,
            etaMs: this.estimateEta(fraction),
            ...(message === undefined ? {} : { message }),
        });

        this.progressValue = next;
        this.pushToQueue(next);
        this.definition.onProgress?.(next);

        if (!this.settledFlag) {
            this.surroundings.notify?.("progress");
        }
    }

    /**
     * Write a progress update to the queue's own channel, so the element's operation events carry
     * it without a run inventing a second one.
     * @param progress - Where the run has got to.
     */
    private pushToQueue(progress: Progress): void {
        const sink = this.queueSink;

        if (sink === null) {
            return;
        }

        sink.setPhase(progress.phase);

        if (progress.message !== undefined) {
            sink.setMessage(progress.message);
        }

        if (progress.fraction !== null) {
            sink.setProgress(Math.round(progress.fraction * PERCENT));
        }
    }

    /**
     * How much longer the run has, projected from how long it has taken so far.
     * @param fraction - How far along it is, or null when that is unknown.
     * @returns Milliseconds, or null when nothing can honestly be projected.
     */
    private estimateEta(fraction: number | null): number | null {
        if (fraction === null || fraction <= 0 || fraction >= 1 || this.startedAtMs === 0) {
            return null;
        }

        const elapsed = nowMs() - this.startedAtMs;

        return Math.max(0, Math.round(elapsed / fraction - elapsed));
    }

    // -- lifecycle ----------------------------------------------------------------------------

    /** Watch the caller's signal, so aborting it cancels the run. */
    private attachCallerSignal(): void {
        const { signal } = this.definition;

        if (signal === undefined || this.detachSignal !== null) {
            return;
        }

        const listener = (): void => {
            this.cancelFromSignal(signal);
        };

        signal.addEventListener("abort", listener, { once: true });
        this.detachSignal = () => {
            signal.removeEventListener("abort", listener);
        };
    }

    /**
     * Cancel the run because the caller's signal aborted.
     *
     * The signal's own reason is carried through untouched where it is an exception, which is what
     * keeps `AbortSignal.timeout()` arriving as a `TimeoutError` rather than being flattened into
     * "somebody pressed Cancel".
     * @param signal - The signal that aborted.
     */
    private cancelFromSignal(signal: AbortSignal): void {
        if (!this.cancellable) {
            return;
        }

        const error = abortError(signal, `Run "${this.id}" was aborted.`);
        this.statusValue = "canceled";
        this.durationValue = this.startedAtMs === 0 ? null : Math.round(nowMs() - this.startedAtMs);
        this.settle(() => {
            this.deferred.reject(error);
        });
        this.stopWork(error);
    }

    /**
     * Tell the queue and the work itself to stop.
     * @param error - The reason, carried into the abort.
     */
    private stopWork(error: Error): void {
        this.ticket?.cancel();
        this.executionController?.abort(error);
    }

    /**
     * Mark the run settled and run the one action that settles its promise.
     * @param action - Resolve or reject.
     */
    private settle(action: () => void): void {
        this.settledFlag = true;
        this.clearTimeBox();
        this.detachSignal?.();
        this.detachSignal = null;
        this.queueSink = null;
        action();
        // After the promise settles, so that a watcher reading the record sees the status, the
        // duration and the summary the run finished with rather than the ones it had a line ago.
        this.surroundings.notify?.("end");
    }

    /** Put the run back the way it was before it ran, keeping its id and its definition. */
    private resetForRerun(): void {
        this.settledFlag = false;
        this.cancelReason = null;
        this.deferred = createDeferred<T>();
        this.statusValue = "queued";
        this.progressValue = QUEUED_PROGRESS;
        this.caveatsValue = this.definition.caveats;
        this.fieldsValue = this.definition.fields;
        this.resultValue = undefined;
        this.summaryValue = undefined;
        this.errorValue = undefined;
        this.startedAtValue = null;
        this.startedAtMs = 0;
        this.durationValue = null;
        this.partialValue = false;
        this.ticket = null;
        this.executionController = null;
    }
}

/**
 * How far along a determinate run is, with the empty case answered rather than divided.
 * @param completed - How many units are done.
 * @param total - How many there are.
 * @returns The fraction, from 0 to 1.
 */
function fractionOf(completed: number, total: number): number {
    if (total <= 0) {
        return 1;
    }

    return Math.min(1, Math.max(0, completed / total));
}
