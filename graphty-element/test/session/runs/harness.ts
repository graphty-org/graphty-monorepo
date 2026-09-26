import type { AlgorithmDescriptor, EdgeId, NodeId, RunId, Scope } from "../../../src/catalog/types";
import type { ResultSummary, RunResult } from "../../../src/session/results/types";
import {
    type Caveats,
    computeScopeDigest,
    type EngineVersions,
    type ResolvedScope,
    type RunExecutionContext,
    type RunOutcome,
    type RunProgressSink,
    type RunQueue,
    type RunQueueContext,
} from "../../../src/session/runs";

/** The versions a test run reports, so a record has something to carry. */
export const ENGINE: EngineVersions = Object.freeze({ element: "2.0.0-test", algorithms: "1.4.0", layout: "1.3.0" });

/** The caveats a test run starts from. */
export const CAVEATS: Caveats = Object.freeze({
    exact: true,
    seed: null,
    direction: "as-loaded",
    weight: null,
    precision: "f64",
    method: "test",
    notes: [],
});

/** One progress update the queue was asked to publish. */
export interface QueueProgressEvent {
    operationId: string;
    percent?: number;
    phase?: string;
    message?: string;
}

interface PendingOperation {
    id: string;
    execute: (context: RunQueueContext) => Promise<void> | void;
    controller: AbortController;
    description?: string;
    started: boolean;
}

/**
 * A sequential queue with the same surface the element's OperationQueueManager offers a run.
 *
 * It can be held paused, which is what lets a test look at three runs sitting in the queue
 * instead of racing them to completion.
 */
export class FakeQueue implements RunQueue {
    paused = false;

    readonly progress: QueueProgressEvent[] = [];

    readonly descriptions: string[] = [];

    private counter = 0;

    private readonly pending: PendingOperation[] = [];

    private active = false;

    queueOperation(
        category: "algorithm-run",
        execute: (context: RunQueueContext) => Promise<void> | void,
        options?: { description?: string },
    ): string {
        const id = `op-${this.counter++}`;
        this.descriptions.push(options?.description ?? category);
        this.pending.push({ id, execute, controller: new AbortController(), started: false, ...options });
        queueMicrotask(() => {
            void this.pump();
        });

        return id;
    }

    /**
     * Resolve once nothing is queued or running.
     *
     * A turn, then the pending list. The fake drains the same way the real local queue does, so
     * "settled" means the same thing here as it does there.
     * @returns A promise that resolves when nothing is waiting.
     */
    async settled(): Promise<void> {
        do {
            await new Promise<void>((resolve) => {
                queueMicrotask(resolve);
            });
        } while (this.pending.length > 0);
    }

    cancelOperation(operationId: string): boolean {
        const found = this.pending.find((operation) => operation.id === operationId);

        if (found === undefined) {
            return false;
        }

        found.controller.abort(new DOMException("Operation canceled.", "AbortError"));

        if (!found.started) {
            this.pending.splice(this.pending.indexOf(found), 1);
        }

        return true;
    }

    /** How many operations are still waiting or running. */
    get size(): number {
        return this.pending.length;
    }

    /** Let the queue run, and wait until nothing is left in it. */
    async drain(): Promise<void> {
        this.paused = false;
        void this.pump();

        // A run that starts another run (a batch) queues more work during the drain, so wait on
        // the queue being genuinely empty rather than on one pump having finished.
        while (this.pending.length > 0) {
            await settle(1);
        }

        await settle(0);
    }

    private async pump(): Promise<void> {
        if (this.active || this.paused) {
            return;
        }

        this.active = true;

        try {
            while (this.pending.length > 0 && !this.paused) {
                const next = this.pending[0];
                next.started = true;

                try {
                    await next.execute({
                        signal: next.controller.signal,
                        progress: this.sinkFor(next.id),
                        id: next.id,
                    });
                } catch {
                    // A run records its own failure; the queue only has to keep going.
                }

                this.pending.shift();
            }
        } finally {
            this.active = false;
        }
    }

    private sinkFor(operationId: string): RunProgressSink {
        return {
            setProgress: (percent: number) => {
                this.progress.push({ operationId, percent });
            },
            setMessage: (message: string) => {
                this.progress.push({ operationId, message });
            },
            setPhase: (phase: string) => {
                this.progress.push({ operationId, phase });
            },
        };
    }
}

/** A graph whose membership a test can change under a finished run. */
export class FakeGraph {
    readonly nodes = new Set<NodeId>();

    readonly edges = new Set<EdgeId>();

    constructor(nodeCount = 3) {
        for (let index = 0; index < nodeCount; index++) {
            this.nodes.add(`n${index}`);
        }
    }

    addNode(id: NodeId): void {
        this.nodes.add(id);
    }

    resolve = (spec: Scope): ResolvedScope => ({
        nodes: new Set(this.nodes),
        edges: new Set(this.edges),
        nodeCount: this.nodes.size,
        edgeCount: this.edges.size,
        digest: computeScopeDigest(spec, this.nodes, this.edges),
        spec,
        resolvedAt: new Date().toISOString(),
    });
}

/** A minimal algorithm descriptor, so the runs API has something to agree with. */
export function descriptor(overrides: Partial<AlgorithmDescriptor> = {}): AlgorithmDescriptor {
    return {
        key: "degree",
        plainName: "Connections",
        technicalName: "degree",
        description: "How many connections each node has.",
        category: "centrality",
        shape: "node-metric",
        fields: [
            {
                name: "value",
                plainName: "Connections",
                technicalName: "degree",
                kind: "node",
                type: "number",
                path: "results.$.value",
            },
        ],
        options: [],
        costClass: "instant",
        complexity: "O(n)",
        ...overrides,
    };
}

/** The summary a stub result publishes. */
function stubSummary(): ResultSummary {
    return {
        count: 0,
        measured: 0,
        min: null,
        max: null,
        median: null,
        mean: null,
        tiedAtMin: 0,
        normalization: "none",
        top: [],
        caveats: CAVEATS,
        durationMs: 0,
    };
}

/** A result object that satisfies the interface without computing anything. */
export function stubResult(runId: RunId): RunResult {
    return {
        runId,
        shape: "node-metric",
        fields: [],
        measured: { nodes: 0, edges: 0 },
        graph: {},
        node: () => undefined,
        edge: () => undefined,
        column: () => ({ length: 0, get: () => Number.NaN, min: Number.NaN, max: Number.NaN, mean: Number.NaN, median: Number.NaN }),
        ranking: () => [],
        top: () => ({ entries: [], leftOut: null, reason: null }),
        histogram: () => ({ bins: [], scale: "linear", suggestedScale: "linear", binning: "empty" }),
        summary: stubSummary,
        reading: () => "A stub result.",
    };
}

/** An executor that finishes at once with a stub result. */
export function finishAtOnce(context: RunExecutionContext): Promise<RunOutcome> {
    return Promise.resolve({ result: stubResult(context.runId) });
}

/** How many times an executor was asked to do the work, and with what. */
export interface ExecutorSpy {
    execute: (context: RunExecutionContext) => Promise<RunOutcome>;
    calls: RunExecutionContext[];
}

/** An executor that finishes straight away and records what it was asked. */
export function spyExecutor(
    body?: (context: RunExecutionContext) => Promise<void> | void,
): ExecutorSpy {
    const calls: RunExecutionContext[] = [];

    return {
        calls,
        execute: async (context) => {
            calls.push(context);
            await body?.(context);

            return { result: stubResult(context.runId) };
        },
    };
}

/** Wait for the microtask and timer queues to turn over. */
export async function settle(ms = 0): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}
