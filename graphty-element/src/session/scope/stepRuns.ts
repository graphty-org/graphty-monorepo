/**
 * @file The runs a union step's `measure` leaf reads, under the session's run limits.
 *
 * A measure on the base reads the ordinary session run with the same algorithm, params and scope
 * (listed in Analyze, painting nothing), or starts one when the step is first read. A measure
 * computed on So far, or bound to a live reference, is the step's own computation: run through the
 * session's executor over the step's input, cached by definition, never a `session.runs` entry and
 * never an undo step. Either kind waits (`run-needed`) above `askAboveMs` until `allowRun`, and a
 * live one waits (`run-paused`) above `liveMs` while the pointer is on a node.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type {
    AlgorithmKey,
    NodeId,
    OptionType,
    RuleTree,
    RunId,
    Scope,
    StepReference,
    UnionStep,
} from "../../catalog/types";
import type { RunResult } from "../results/types";
import type { RunExecutor } from "../runs";
import type { ResolvedScope, RunsApi } from "../runs/types";
import type { CodedFact } from "../shared";
import type { FilterRunResult, UnionStepSource } from "../visibility/filter";
import type { Bytes, StepFrame, StepGate } from "../visibility/union";
import type { ScopeStepOptions } from "./steps";

type MeasureLeaf = Extract<RuleTree, { kind: "measure" }>;

/** What the step runs read from the session. */
export interface StepRunsSources {
    readonly runs: RunsApi;
    /** The session's executor, for a step's own computation. */
    readonly execute: RunExecutor;
    /**
     * A scope resolved now.
     * @param spec - The scope.
     * @returns It, resolved.
     */
    resolveScope(spec: Scope): ResolvedScope;
    /**
     * The node ids some node bytes hold.
     * @param nodes - The bytes.
     * @returns The ids.
     */
    idsOf(nodes: Bytes): NodeId[];
    /**
     * A finished result as the compiler reads it.
     * @param result - The result.
     * @param run - The session run it belongs to, whose execution token it carries; absent for a
     *     step's own computation.
     * @returns The reader.
     */
    readerOf(result: RunResult, run?: RunId): FilterRunResult;
    /**
     * A run's estimated cost in milliseconds, or undefined when none can be given.
     * @param algorithm - The algorithm.
     * @param params - Its parameters.
     * @param scope - What it reads.
     * @returns The estimate.
     */
    estimateMs(algorithm: AlgorithmKey, params: Readonly<Record<string, unknown>>, scope: Scope): number | undefined;
    /**
     * An algorithm option's type, or undefined.
     * @param algorithm - The algorithm.
     * @param option - The option's name.
     * @returns The type.
     */
    optionType(algorithm: AlgorithmKey, option: string): OptionType | undefined;
    /** The run limits. */
    options(): ScopeStepOptions;
    /** Whether the pointer is on a node now. */
    hovering(): boolean;
    /** Tell every live reader that a step computation moved. */
    moved(): void;
}

/** The step runs: the compiler's source, and the reader's Run and Cancel. */
export interface StepRuns extends UnionStepSource {
    /**
     * Consent for a step's definition: it may run whatever its estimate.
     * @param step - The step.
     * @param within - Its base.
     */
    allow(step: UnionStep, within: "graph" | "visible"): void;
    /**
     * Cancel a step's computing run, leaving it waiting for consent.
     * @param step - The step.
     * @param within - Its base.
     */
    cancel(step: UnionStep, within: "graph" | "visible"): void;
    /**
     * The session run behind a step, or null.
     * @param step - The step.
     * @param within - Its base.
     * @returns The run id.
     */
    runOf(step: UnionStep, within: "graph" | "visible"): RunId | null;
    /**
     * The finished result of a step's own computation (computed on So far, or bound to a live
     * reference), or undefined while it has none.
     * @param step - The step.
     * @param within - Its base.
     * @returns The result.
     */
    ownResult(step: UnionStep, within: "graph" | "visible"): FilterRunResult | undefined;
}

/** A step's own computation. */
interface LocalEntry {
    state: "computing" | "ready" | "failed";
    result?: FilterRunResult;
    error?: string;
    readonly abort: AbortController;
}

/** How many step-local computations are kept. */
const LOCAL_LIMIT = 64;

/**
 * The step runs of one session.
 * @param sources - What they read.
 * @returns The step runs.
 */
export function createStepRuns(sources: StepRunsSources): StepRuns {
    const started = new Map<string, RunId>();
    const consent = new Set<string>();
    const local = new Map<string, LocalEntry>();
    /** The cache key of each step definition's own computation, so Cancel finds it. */
    const localKeys = new Map<string, string>();
    /** Step definitions whose own computation the reader cancelled: they wait for consent. */
    const cancelled = new Set<string>();

    const measureOf = (step: UnionStep): MeasureLeaf | null => (step.rule.kind === "measure" ? step.rule : null);
    const definitionKey = (step: UnionStep, within: string): string =>
        JSON.stringify([step.rule, step.computedOn ?? "base", within]);

    /**
     * A measure's params with its references bound to node ids, or the gate that stops it.
     * @param leaf - The measure.
     * @param frame - The step's frame.
     * @returns The params, or a gate.
     */
    const bound = (leaf: MeasureLeaf, frame: StepFrame): Readonly<Record<string, unknown>> | StepGate => {
        const params: Record<string, unknown> = { ...(leaf.params ?? {}) };
        for (const [option, reference] of Object.entries(leaf.bind ?? {})) {
            const ids = sources.idsOf(frame.reference(reference));
            if (ids.length === 0) {
                return { state: "empty", reason: { code: "reference-empty", params: { option } } };
            }

            if (sources.optionType(leaf.algorithm, option) === "node-id") {
                if (ids.length > 1) {
                    return { state: "inert", reason: { code: "one-node-only", params: { option } } };
                }

                params[option] = ids[0];
            } else {
                params[option] = ids;
            }
        }

        return params;
    };
    const isGate = (value: unknown): value is StepGate =>
        typeof value === "object" && value !== null && "state" in value && "reason" in value;
    const isLive = (leaf: MeasureLeaf, step: UnionStep): boolean =>
        step.computedOn === "so-far" ||
        Object.values(leaf.bind ?? {}).some(
            (reference: StepReference) => reference === "hovered-or-selected" || reference === "selection",
        );
    const baseScope = (frame: StepFrame): Scope => (frame.within === "graph" ? "graph" : "visible");

    /**
     * Whether the limits hold a run back, and why.
     * @param step - The step.
     * @param leaf - Its measure.
     * @param params - The bound params.
     * @param scope - What it reads.
     * @param live - Whether it follows the pointer or the step's input.
     * @param stale - Whether it reruns a result the data moved under.
     * @param within - Its base.
     * @returns The reason, or null when it may start.
     */
    const heldBack = (
        step: UnionStep,
        leaf: MeasureLeaf,
        params: Readonly<Record<string, unknown>>,
        scope: Scope,
        live: boolean,
        stale: boolean,
        within: string,
    ): CodedFact | null => {
        const { liveMs, askAboveMs } = sources.options();
        if (liveMs === undefined && askAboveMs === undefined) {
            return null;
        }

        const estimateMs = sources.estimateMs(leaf.algorithm, params, scope);
        if (estimateMs === undefined) {
            return null;
        }

        if (live && liveMs !== undefined && estimateMs > liveMs && sources.hovering()) {
            return { code: "run-paused", params: { estimateMs } };
        }

        if (askAboveMs !== undefined && estimateMs > askAboveMs && !consent.has(definitionKey(step, within))) {
            return { code: stale ? "stale" : "run-needed", params: { estimateMs } };
        }

        return null;
    };

    /**
     * Start a step's own computation over a scope.
     * @param key - Its cache key.
     * @param leaf - The measure.
     * @param params - The bound params.
     * @param scope - What it reads.
     */
    const startLocal = (
        key: string,
        leaf: MeasureLeaf,
        params: Readonly<Record<string, unknown>>,
        scope: Scope,
    ): void => {
        const entry: LocalEntry = { state: "computing", abort: new AbortController() };
        local.set(key, entry);
        while (local.size > LOCAL_LIMIT) {
            const oldest = local.keys().next().value;
            if (oldest === undefined) {
                break;
            }

            local.get(oldest)?.abort.abort();
            local.delete(oldest);
        }

        const resolved = sources.resolveScope(scope);
        sources
            .execute({
                runId: `graphty-step-${String(local.size)}`,
                algorithm: leaf.algorithm,
                params,
                scope: resolved,
                seed: null,
                exact: null,
                sample: null,
                timeBoxMs: null,
                signal: entry.abort.signal,
                timeBox: null,
                report: () => undefined,
            })
            .then(
                (outcome) => {
                    entry.state = "ready";
                    entry.result = sources.readerOf(outcome.result);
                },
                (error: unknown) => {
                    entry.state = "failed";
                    entry.error = (error as { code?: string } | null)?.code ?? "E_UNKNOWN";
                },
            )
            .finally(() => {
                if (!entry.abort.signal.aborted) {
                    sources.moved();
                }
            });
    };

    /**
     * Where a step's own computation stands, starting it when the limits allow.
     * @param step - The step.
     * @param leaf - The measure.
     * @param params - The bound params.
     * @param frame - The step's frame.
     * @returns The gate and, when ready, the result.
     */
    const localState = (
        step: UnionStep,
        leaf: MeasureLeaf,
        params: Readonly<Record<string, unknown>>,
        frame: StepFrame,
    ): { gate: StepGate | null; result?: FilterRunResult } => {
        const scope: Scope = step.computedOn === "so-far" ? { nodes: sources.idsOf(frame.soFar) } : baseScope(frame);
        const key = JSON.stringify([leaf.algorithm, params, scope]);
        const definition = definitionKey(step, frame.within);
        localKeys.set(definition, key);
        if (cancelled.has(definition) && !consent.has(definition)) {
            return { gate: { state: "pending", reason: { code: "run-needed", params: {} } } };
        }

        const entry = local.get(key);
        if (entry?.state === "ready") {
            return { gate: null, ...(entry.result === undefined ? {} : { result: entry.result }) };
        }

        if (entry?.state === "failed") {
            return {
                gate: { state: "pending", reason: { code: "run-failed", params: { error: entry.error ?? null } } },
            };
        }

        if (entry === undefined) {
            const held = heldBack(step, leaf, params, scope, true, false, frame.within);
            if (held !== null) {
                return { gate: { state: "pending", reason: held } };
            }

            startLocal(key, leaf, params, scope);
        }

        return { gate: { state: "pending", reason: { code: "computing", params: {} } } };
    };

    /**
     * Where a step's session run stands, starting it when the limits allow.
     * @param step - The step.
     * @param leaf - The measure.
     * @param params - The bound params.
     * @param frame - The step's frame.
     * @returns The gate and, when ready, the result.
     */
    const baseState = (
        step: UnionStep,
        leaf: MeasureLeaf,
        params: Readonly<Record<string, unknown>>,
        frame: StepFrame,
    ): { gate: StepGate | null; result?: FilterRunResult } => {
        const scope = baseScope(frame);
        const options = { scope, style: false } as const;
        const done = sources.runs.answered(leaf.algorithm, params, options);
        if (done?.result !== undefined) {
            started.set(definitionKey(step, frame.within), done.id);
            return { gate: null, result: sources.readerOf(done.result, done.id) };
        }

        const key = definitionKey(step, frame.within);
        const known = started.get(key);
        const run = known === undefined ? undefined : sources.runs.get(known);
        const pending = (reason: CodedFact): { gate: StepGate } => ({ gate: { state: "pending", reason } });
        // "" marks a run asked for in this turn and not yet started.
        if (known === "" || (run !== undefined && (run.status === "queued" || run.status === "running"))) {
            return pending({ code: "computing", params: {} });
        }

        if (run?.status === "failed") {
            return pending({ code: "run-failed", params: { error: run.error?.code ?? null } });
        }

        // Removed in Analyze, or cancelled: never restarted unasked.
        if (known !== undefined && (run === undefined || run.status === "removed" || run.status === "canceled")) {
            if (!consent.has(key)) {
                return pending({ code: "run-needed", params: {} });
            }
        }

        const held = heldBack(step, leaf, params, scope, isLive(leaf, step), run?.status === "succeeded", frame.within);
        if (held !== null) {
            return pending(held);
        }

        // Started outside the pass that asked: a run is a command, and a pass does not dispatch.
        started.set(key, "");
        queueMicrotask(() => {
            const begun = sources.runs.start(leaf.algorithm, params, options);
            started.set(key, begun.id);
            consent.delete(key);
            Promise.resolve(begun).catch(() => undefined);
            sources.moved();
        });

        return pending({ code: "computing", params: {} });
    };

    /**
     * A step's gate and result.
     * @param step - The step.
     * @param frame - Its frame.
     * @returns The gate, and the result when ready.
     */
    const stateOf = (step: UnionStep, frame: StepFrame): { gate: StepGate | null; result?: FilterRunResult } => {
        const leaf = measureOf(step);
        if (leaf === null) {
            return { gate: null };
        }

        const params = bound(leaf, frame);
        if (isGate(params)) {
            return { gate: params };
        }

        return isLive(leaf, step) ? localState(step, leaf, params, frame) : baseState(step, leaf, params, frame);
    };

    /** The step whose frame a measure is compiled in, so `result` finds it. */
    let current: UnionStep | null = null;

    return {
        gate(step, frame) {
            current = step;
            return stateOf(step, frame).gate;
        },
        result(leaf, frame) {
            const step = current?.rule === leaf ? current : { op: "keep" as const, rule: leaf };
            return stateOf(step, frame).result;
        },
        allow(step, within) {
            consent.add(definitionKey(step, within));
            cancelled.delete(definitionKey(step, within));
            sources.moved();
        },
        cancel(step, within) {
            const key = definitionKey(step, within);
            const known = started.get(key);
            const run = known === undefined || known === "" ? undefined : sources.runs.get(known);
            run?.cancel();
            consent.delete(key);
            const localKey = localKeys.get(key);
            const entry = localKey === undefined ? undefined : local.get(localKey);
            if (localKey !== undefined && entry?.state === "computing") {
                entry.abort.abort();
                local.delete(localKey);
                cancelled.add(key);
            }

            sources.moved();
        },
        runOf(step, within) {
            const known = started.get(definitionKey(step, within));
            return known === undefined || known === "" ? null : known;
        },
        ownResult(step, within) {
            const key = localKeys.get(definitionKey(step, within));
            const entry = key === undefined ? undefined : local.get(key);
            return entry?.state === "ready" ? entry.result : undefined;
        },
    };
}
