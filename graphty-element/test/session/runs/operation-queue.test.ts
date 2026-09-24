import { assert, beforeEach, describe, it } from "vitest";

import { EventManager } from "../../../src/managers/EventManager";
import { OperationQueueManager } from "../../../src/managers/OperationQueueManager";
import { createRunsApi, type RunExecutor, type RunQueue, type SessionRunsApi } from "../../../src/session/runs";
import { CAVEATS, descriptor, ENGINE, FakeGraph, settle, stubResult } from "./harness";

/**
 * These tests run against the element's REAL operation queue rather than a stand-in, because the
 * whole design of the runs API is that it puts a run in front of that queue instead of building a
 * second one. If `OperationQueueManager` stopped satisfying `RunQueue`, or stopped carrying a
 * run's progress on its own events, that is a break the fake would never notice.
 */

const DEGREE = descriptor({ options: [] });
const KCORE = descriptor({
    key: "k-core",
    plainName: "Core",
    technicalName: "k_core",
    options: [{ name: "k", plainName: "K", type: "integer", default: 1 }],
});

interface GraphEvent {
    type: string;
    id?: string;
    phase?: string;
    progress?: number;
}

describe("runs over the element's own operation queue", () => {
    let eventManager: EventManager;
    let queueManager: OperationQueueManager;
    let events: GraphEvent[];
    let graph: FakeGraph;

    beforeEach(() => {
        eventManager = new EventManager();
        queueManager = new OperationQueueManager(eventManager);
        events = [];
        graph = new FakeGraph(4);
        eventManager.onGraphEvent.add((event) => {
            const record = event as unknown as GraphEvent;
            events.push({
                type: record.type,
                id: record.id,
                phase: record.phase,
                progress: record.progress,
            });
        });
    });

    function makeRuns(execute: RunExecutor): SessionRunsApi {
        // The assignment is the assertion: OperationQueueManager satisfies RunQueue structurally,
        // with no cast, so the session never has to import the renderer's manager to talk to it.
        const queue: RunQueue = queueManager;

        return createRunsApi({
            queue,
            catalog: { algorithms: () => [DEGREE, KCORE] },
            resolveScope: graph.resolve,
            execute,
            engine: ENGINE,
            defaultCaveats: CAVEATS,
        });
    }

    it("starts, finishes and resolves through the real queue", async () => {
        const runs = makeRuns(async (context) => {
            context.report({ phase: "measuring", completed: 1, total: 2 });
            await settle(1);

            return { result: stubResult(context.runId) };
        });
        const run = runs.start("degree");

        assert.strictEqual(run.status, "queued");

        await queueManager.waitForCompletion();
        const result = await run;

        assert.strictEqual(run.status, "succeeded");
        assert.strictEqual(result.runId, run.id);
        assert.isNotNull(run.durationMs);
    });

    it("carries a run's progress on the queue's own events", async () => {
        const runs = makeRuns(async (context) => {
            context.report({ phase: "measuring", completed: 1, total: 2, message: "Measuring nodes" });
            await settle(1);

            return { result: stubResult(context.runId) };
        });

        runs.start("degree");
        await queueManager.waitForCompletion();

        const starts = events.filter((event) => event.type === "operation-start");
        const completes = events.filter((event) => event.type === "operation-complete");
        const progress = events.filter((event) => event.type === "operation-progress");

        assert.strictEqual(starts.length, 1);
        assert.strictEqual(completes.length, 1);
        assert.isTrue(
            progress.some((event) => event.phase === "measuring"),
            "the run's phase reaches the queue's progress events",
        );
        assert.isTrue(
            progress.some((event) => event.progress === 50),
            "half of two units is published as 50 percent",
        );
    });

    it("runs queued work one at a time, in the order it was started", async () => {
        const order: string[] = [];
        const runs = makeRuns(async (context) => {
            order.push(`start:${String(context.params.k)}`);
            await settle(5);
            order.push(`end:${String(context.params.k)}`);

            return { result: stubResult(context.runId) };
        });

        const first = runs.start("k-core", { k: 1 });
        const second = runs.start("k-core", { k: 2 });

        await queueManager.waitForCompletion();
        await first;
        await second;

        assert.deepStrictEqual(order, ["start:1", "end:1", "start:2", "end:2"]);
    });

    it("cancels a waiting run without disturbing the one behind it", async () => {
        const ran: number[] = [];
        const runs = makeRuns(async (context) => {
            ran.push(Number(context.params.k));
            await settle(2);

            return { result: stubResult(context.runId) };
        });

        queueManager.pause();
        const first = runs.start("k-core", { k: 1 });
        const second = runs.start("k-core", { k: 2 });
        await settle(1);

        first.cancel("no longer wanted");

        assert.strictEqual(first.status, "canceled");
        assert.deepStrictEqual(runs.queue.map((entry) => entry.runId), [second.id]);

        queueManager.resume();
        await queueManager.waitForCompletion();
        await second;

        assert.deepStrictEqual(ran, [2], "the cancelled run never executed");
        assert.strictEqual(second.status, "succeeded");

        try {
            await first;
            assert.fail("a cancelled run must not resolve");
        } catch (error) {
            assert.strictEqual((error as DOMException).name, "AbortError");
        }
    });

    it("keeps a failed run from stopping the queue", async () => {
        const runs = makeRuns((context) => {
            if (context.params.k === 1) {
                throw new Error("this run failed");
            }

            return Promise.resolve({ result: stubResult(context.runId) });
        });

        const failing = runs.start("k-core", { k: 1 });
        const following = runs.start("k-core", { k: 2 });

        await queueManager.waitForCompletion();
        await following;

        assert.strictEqual(failing.status, "failed");
        assert.strictEqual(failing.error?.code, "E_INTERNAL");
        assert.strictEqual(following.status, "succeeded");
    });
});
