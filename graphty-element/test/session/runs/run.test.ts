import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import { GraphtyError } from "../../../src/errors/GraphtyError";
import {
    ManagedRun,
    type Progress,
    type RunBody,
    type RunDefinition,
    type RunExecutor,
    type RunProgressSink,
    type RunSurroundings,
    type RunTicket,
} from "../../../src/session/runs";
import { CAVEATS, ENGINE, FakeGraph, finishAtOnce, settle, stubResult } from "./harness";

/** A queue a test drives by hand, so a run can be looked at while it is still waiting. */
class ManualQueue {
    readonly bodies: RunBody[] = [];

    readonly controllers: AbortController[] = [];

    readonly progress: { percent?: number; phase?: string; message?: string }[] = [];

    cancelled = 0;

    enqueue = (body: RunBody): RunTicket => {
        const index = this.bodies.length;
        this.bodies.push(body);
        this.controllers.push(new AbortController());

        return {
            cancel: () => {
                this.cancelled += 1;
                this.controllers[index].abort(new DOMException("Operation canceled.", "AbortError"));
            },
        };
    };

    async runLatest(): Promise<void> {
        const index = this.bodies.length - 1;
        const sink: RunProgressSink = {
            setProgress: (percent) => this.progress.push({ percent }),
            setMessage: (message) => this.progress.push({ message }),
            setPhase: (phase) => this.progress.push({ phase }),
        };

        await this.bodies[index]({ signal: this.controllers[index].signal, progress: sink, id: `op-${index}` });
    }
}

interface Fixture {
    run: ManagedRun;
    queue: ManualQueue;
    graph: FakeGraph;
    progress: Progress[];
}

function makeRun(
    execute: RunExecutor,
    overrides: Partial<RunDefinition> = {},
    surroundingOverrides: Partial<RunSurroundings> = {},
): Fixture {
    const graph = new FakeGraph(4);
    const queue = new ManualQueue();
    const progress: Progress[] = [];
    const definition: RunDefinition = {
        id: "degree_test",
        algorithm: "degree",
        params: { weighted: false },
        seed: null,
        exact: null,
        sample: null,
        timeBoxMs: null,
        style: true,
        shape: "node-metric",
        fields: [],
        engine: ENGINE,
        caveats: CAVEATS,
        execute,
        onProgress: (update) => progress.push(update),
        ...overrides,
    };
    const surroundings: RunSurroundings = {
        label: () => "Connections",
        queuePosition: () => 2,
        stale: () => null,
        resolveScope: () => graph.resolve("visible"),
        enqueue: queue.enqueue,
        ...surroundingOverrides,
    };

    return { run: new ManagedRun(definition, surroundings), queue, graph, progress };
}

describe("a run before it starts", () => {
    it("is queued, indeterminate, cancellable and has no result", () => {
        const { run } = makeRun(finishAtOnce);

        assert.strictEqual(run.status, "queued");
        assert.strictEqual(run.determinate, false);
        assert.strictEqual(run.cancellable, true);
        assert.strictEqual(run.startedAt, null);
        assert.strictEqual(run.durationMs, null);
        assert.strictEqual(run.result, undefined);
        assert.strictEqual(run.progress.fraction, null, "a percentage must never be invented");
    });

    it("reports the queue position its surroundings give it, and none once it is running", async () => {
        const { run, queue } = makeRun(finishAtOnce);

        run.start();
        assert.strictEqual(run.queuePosition, 2);

        await queue.runLatest();
        assert.strictEqual(run.queuePosition, null);
    });
});

describe("a run that finishes", () => {
    it("resolves with the result the work returned", async () => {
        const { run, queue } = makeRun(finishAtOnce);

        run.start();
        const settled = queue.runLatest();
        const result = await run;
        await settled;

        assert.strictEqual(result.runId, "degree_test");
        assert.strictEqual(run.status, "succeeded");
        assert.strictEqual(run.result, result);
        assert.isNotNull(run.startedAt);
        assert.isNotNull(run.durationMs);
        assert.strictEqual(run.cancellable, false);
        assert.strictEqual(run.partial, false);
    });

    it("takes the fields and caveats the work reported over the ones it started with", async () => {
        const { run, queue } = makeRun((context) => Promise.resolve({
            result: stubResult(context.runId),
            caveats: { precision: "f32", method: "brandes-sampled", exact: false, sampleSize: 500 },
            fields: [
                {
                    name: "value",
                    plainName: "Betweenness",
                    technicalName: "betweenness",
                    kind: "node",
                    type: "number",
                    path: "results.degree_test.value",
                },
            ],
        }));

        run.start();
        await queue.runLatest();

        assert.strictEqual(run.caveats.precision, "f32");
        assert.strictEqual(run.caveats.method, "brandes-sampled");
        assert.strictEqual(run.caveats.exact, false);
        assert.strictEqual(run.caveats.sampleSize, 500);
        assert.strictEqual(run.caveats.direction, "as-loaded", "an unreported caveat keeps its default");
        assert.strictEqual(run.fields.length, 1);
    });

    it("publishes a frozen record that carries the scope it ran over", async () => {
        const { run, queue, graph } = makeRun(finishAtOnce);

        run.start();
        await queue.runLatest();

        const { record } = run;
        assert.isTrue(Object.isFrozen(record));
        assert.strictEqual(record.id, "degree_test");
        assert.strictEqual(record.label, "Connections");
        assert.strictEqual(record.status, "succeeded");
        assert.strictEqual(record.scope.nodes, graph.nodes.size);
        assert.strictEqual(record.scope.digest, run.scope.digest);
        assert.strictEqual(record.engine.element, ENGINE.element);
    });
});

describe("progress", () => {
    it("turns a report into a fraction, an eta and a percentage on the queue's own channel", async () => {
        const { run, queue, progress } = makeRun(async (context) => {
            context.report({ phase: "measuring", completed: 25, total: 100, message: "Measuring nodes" });
            await settle(5);
            context.report({ completed: 50 });

            return { result: stubResult(context.runId) };
        });

        run.start();
        await queue.runLatest();

        const quarter = progress.find((update) => update.completed === 25);
        assert.isDefined(quarter);
        assert.strictEqual(quarter?.determinate, true);
        assert.strictEqual(quarter?.fraction, 0.25);
        assert.strictEqual(quarter?.phase, "measuring");
        assert.strictEqual(quarter?.message, "Measuring nodes");

        const half = progress.find((update) => update.completed === 50);
        assert.strictEqual(half?.fraction, 0.5);
        assert.strictEqual(half?.phase, "measuring", "an unreported field keeps its previous value");
        assert.isNotNull(half?.etaMs ?? null, "half way through, the run can project the rest");

        assert.deepInclude(queue.progress, { percent: 25 });
        assert.deepInclude(queue.progress, { phase: "measuring" });
        assert.deepInclude(queue.progress, { message: "Measuring nodes" });
    });

    it("stays indeterminate, with no eta, while the total is unknown", async () => {
        const { run, queue, progress } = makeRun((context) => {
            context.report({ phase: "walking", completed: 10 });

            return Promise.resolve({ result: stubResult(context.runId) });
        });

        run.start();
        await queue.runLatest();

        const walking = progress.find((update) => update.phase === "walking");
        assert.strictEqual(walking?.determinate, false);
        assert.strictEqual(walking?.fraction, null);
        assert.strictEqual(walking?.etaMs, null);
    });
});

describe("cancelling", () => {
    it("rejects with a DOMException named AbortError", async () => {
        const { run } = makeRun(finishAtOnce);

        run.start();
        run.cancel("the reader pressed Cancel");

        try {
            await run;
            assert.fail("a cancelled run must not resolve");
        } catch (error) {
            assert.instanceOf(error, DOMException);
            assert.strictEqual(error.name, "AbortError");
            assert.strictEqual(error.message, "the reader pressed Cancel");
        }

        assert.strictEqual(run.status, "canceled");
        assert.strictEqual(run.cancellable, false);
    });

    it("tells the queue to drop the operation", () => {
        const { run, queue } = makeRun(finishAtOnce);

        run.start();
        run.cancel();

        assert.strictEqual(queue.cancelled, 1);
    });

    it("aborts the work's own signal, so a running algorithm stops", async () => {
        let aborted = false;
        const { run, queue } = makeRun(async (context) => {
            while (!context.signal.aborted) {
                await settle(1);
            }

            aborted = true;
            throw new DOMException("stopped", "AbortError");
        });

        run.start();
        const body = queue.runLatest();
        await settle(5);
        run.cancel();
        await body;

        assert.isTrue(aborted);
        assert.strictEqual(run.status, "canceled");
    });

    it("does nothing to a run that has already finished", async () => {
        const { run, queue } = makeRun(finishAtOnce);

        run.start();
        await queue.runLatest();
        run.cancel();

        assert.strictEqual(run.status, "succeeded");
        assert.strictEqual(await run, run.result);
    });

    it("carries a TimeoutError through untouched, so a timeout is not read as a user cancel", async () => {
        const { run, queue } = makeRun(
            async (context) => {
                while (!context.signal.aborted) {
                    await settle(1);
                }

                throw new DOMException("stopped", "AbortError");
            },
            { signal: AbortSignal.timeout(10) },
        );

        run.start();
        const body = queue.runLatest();

        try {
            await run;
            assert.fail("a timed-out run must not resolve");
        } catch (error) {
            assert.strictEqual((error as DOMException).name, "TimeoutError");
        }

        await body;
        assert.strictEqual(run.status, "canceled");
    });

    it("refuses to start at all when the caller's signal is already aborted", async () => {
        const controller = new AbortController();
        controller.abort();
        const { run, queue } = makeRun(finishAtOnce, {
            signal: controller.signal,
        });

        run.start();

        assert.strictEqual(queue.bodies.length, 0);
        await assertRejectsWithAbort(run);
    });
});

describe("the time box", () => {
    it("publishes what was computed instead of failing", async () => {
        const { run, queue } = makeRun(
            async (context) => {
                while (!(context.timeBox?.aborted ?? false)) {
                    await settle(1);
                }

                return { result: stubResult(context.runId) };
            },
            { timeBoxMs: 15 },
        );

        run.start();
        await queue.runLatest();

        assert.strictEqual(run.status, "succeeded", "a stopped-early result is data, not a failure");
        assert.strictEqual(run.partial, true);
        assert.isDefined(run.caveats.partialReason);
        assert.include(run.caveats.partialReason ?? "", "15 ms");
        assert.strictEqual(run.record.partial, true);
    });

    it("leaves the work's own signal alone, so stopping early is not an abort", async () => {
        let sawAbort = false;
        const { run, queue } = makeRun(
            async (context) => {
                while (!(context.timeBox?.aborted ?? false)) {
                    await settle(1);
                }

                sawAbort = context.signal.aborted;

                return { result: stubResult(context.runId) };
            },
            { timeBoxMs: 10 },
        );

        run.start();
        await queue.runLatest();

        assert.isFalse(sawAbort);
    });
});

describe("failing", () => {
    it("rejects with a GraphtyError and records it on the run", async () => {
        const { run, queue } = makeRun(() => Promise.reject(new Error("the algorithm gave up")));

        run.start();
        await queue.runLatest();

        assert.strictEqual(run.status, "failed");
        assert.isTrue(isGraphtyError(run.error));
        assert.strictEqual(run.error?.code, "E_INTERNAL");
        assert.strictEqual(run.error?.source, "run");
        assert.deepStrictEqual(run.error?.target, { kind: "run", id: "degree_test" });

        try {
            await run;
            assert.fail("a failed run must not resolve");
        } catch (error) {
            assert.strictEqual(error, run.error);
        }
    });

    it("keeps the code a GraphtyError already carried", async () => {
        const failure = new GraphtyError({ code: "E_CAP_EXCEEDED", message: "too expensive", source: "run" });
        const { run, queue } = makeRun(() => Promise.reject(failure));

        run.start();
        await queue.runLatest();

        assert.strictEqual(run.error?.code, "E_CAP_EXCEEDED");
    });

    it("does not reach the process as an unhandled rejection when nobody awaited it", async () => {
        const seen: unknown[] = [];
        const listener = (reason: unknown): void => {
            seen.push(reason);
        };

        process.on("unhandledRejection", listener);

        try {
            const { run, queue } = makeRun(() => Promise.reject(new Error("nobody is listening")));

            run.start();
            await queue.runLatest();
            await settle(20);

            assert.strictEqual(run.status, "failed");
            assert.deepStrictEqual(seen, []);
        } finally {
            process.off("unhandledRejection", listener);
        }
    });
});

describe("rerun", () => {
    it("runs again under the same id, so a bound layer survives", async () => {
        let calls = 0;
        const { run, queue } = makeRun((context) => {
            calls += 1;

            return Promise.resolve({ result: stubResult(context.runId) });
        });

        run.start();
        await queue.runLatest();
        const first = run.result;

        assert.strictEqual(run.rerun(), run);
        await queue.runLatest();

        assert.strictEqual(calls, 2);
        assert.strictEqual(run.id, "degree_test");
        assert.strictEqual(run.status, "succeeded");
        assert.notStrictEqual(run.result, first);
        assert.strictEqual((await run).runId, "degree_test");
    });

    it("re-resolves the scope, so the second answer is about the graph as it is now", async () => {
        const { run, queue, graph } = makeRun(finishAtOnce);

        run.start();
        await queue.runLatest();
        const before = run.scope.nodeCount;

        graph.addNode("n99");
        run.rerun();
        await queue.runLatest();

        assert.strictEqual(run.scope.nodeCount, before + 1);
    });

    it("leaves a run that has not finished alone", () => {
        const { run, queue } = makeRun(finishAtOnce);

        run.start();
        run.rerun();

        assert.strictEqual(queue.bodies.length, 1);
    });
});

describe("staleness", () => {
    it("is derived rather than tracked, and only once there are numbers to qualify", async () => {
        const note = { ranOn: 4, nowVisible: 2, scopeSpec: "visible" as const };
        const { run, queue } = makeRun(finishAtOnce, {}, {
            stale: () => note,
        });

        assert.strictEqual(run.stale, null, "a run that has computed nothing cannot be stale");

        run.start();
        await queue.runLatest();

        assert.deepStrictEqual(run.stale, note);
        assert.deepStrictEqual(run.record.stale, note);
    });
});

async function assertRejectsWithAbort(awaitable: PromiseLike<unknown>): Promise<void> {
    try {
        await awaitable;
        assert.fail("expected an AbortError");
    } catch (error) {
        assert.strictEqual((error as DOMException).name, "AbortError");
    }
}
