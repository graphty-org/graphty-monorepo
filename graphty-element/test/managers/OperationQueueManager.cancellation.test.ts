import { assert, beforeEach, describe, it } from "vitest";

import { EventManager } from "../../src/managers/EventManager";
import { type OperationContext, OperationQueueManager } from "../../src/managers/OperationQueueManager";

/** A promise with its resolver, so a test decides when an operation's work ends. */
function gate(): { promise: Promise<void>; open: () => void } {
    let open!: () => void;
    const promise = new Promise<void>((resolve) => {
        open = resolve;
    });
    return { promise, open };
}

/** Work that ends only when the operation's signal aborts, by rejecting with an AbortError. */
function untilAborted(context: OperationContext): Promise<void> {
    return new Promise<void>((_resolve, reject) => {
        context.signal.addEventListener("abort", () => {
            const error = new Error("Cancelled");
            error.name = "AbortError";
            reject(error);
        });
    });
}

describe("Operation Cancellation", () => {
    let eventManager: EventManager;
    let queueManager: OperationQueueManager;
    let cancelledEvents: { id: string; code: string }[];
    let obsoletedEvents: string[];
    let startEvents: string[];
    let completeEvents: string[];

    beforeEach(() => {
        eventManager = new EventManager();
        queueManager = new OperationQueueManager(eventManager);
        cancelledEvents = [];
        obsoletedEvents = [];
        startEvents = [];
        completeEvents = [];

        eventManager.onGraphEvent.add((event) => {
            if (event.type === "operation-cancelled") {
                cancelledEvents.push({ id: event.id, code: event.code });
            } else if (event.type === "operation-obsoleted") {
                obsoletedEvents.push((event as Record<string, unknown>).id as string);
            } else if (event.type === "operation-start") {
                startEvents.push((event as Record<string, unknown>).id as string);
            } else if (event.type === "operation-complete") {
                completeEvents.push((event as Record<string, unknown>).id as string);
            }
        });
    });

    it("should cancel operations via AbortController", async () => {
        const started = gate();
        let operationCompleted = false;

        const id = queueManager.queueOperation("algorithm-run", async (context) => {
            started.open();
            await untilAborted(context);
            operationCompleted = true;
        });

        await started.promise;
        queueManager.clear();
        await queueManager.waitForCompletion();

        assert.deepEqual(startEvents, [id]);
        assert.isFalse(operationCompleted, "the body did not get past the abort");
        assert.deepEqual(completeEvents, []);
    });

    it("should hand an un-aborted signal to an operation nobody cancels", async () => {
        const seen: boolean[] = [];

        queueManager.queueOperation(
            "data-update",
            async (context) => {
                seen.push(context.signal.aborted);
                await Promise.resolve();
                seen.push(context.signal.aborted);
            },
            { skipTriggers: true },
        );

        await queueManager.waitForCompletion();

        assert.deepEqual(seen, [false, false], "not aborted before or during its work");
        assert.deepEqual(cancelledEvents, []);
        assert.lengthOf(completeEvents, 1);
    });

    it("should cleanup cancelled operations properly", async () => {
        const started = gate();
        const ids = [
            queueManager.queueOperation("data-add", async (context) => {
                started.open();
                await untilAborted(context);
            }),
            queueManager.queueOperation("data-add", () => undefined),
            queueManager.queueOperation("data-add", () => undefined),
        ];

        await started.promise;
        queueManager.clear();
        await queueManager.waitForCompletion();

        assert.deepEqual(startEvents, [ids[0]], "the queued operations never started");
        assert.deepEqual(completeEvents, []);
        assert.deepEqual(
            cancelledEvents,
            ids.map((id) => ({ id, code: "queue-cleared" })),
        );

        const stats = queueManager.getStats();
        assert.equal(stats.pending, 0);
        assert.equal(stats.size, 0);
    });

    it("should report a cleared operation as cancelled, not obsoleted", async () => {
        const started = gate();
        const id = queueManager.queueOperation("camera-update", async (context) => {
            started.open();
            await untilAborted(context);
        });

        await started.promise;
        queueManager.clear();
        await queueManager.waitForCompletion();

        assert.deepEqual(cancelledEvents, [{ id, code: "queue-cleared" }]);
        assert.deepEqual(obsoletedEvents, []);
    });

    it("should call every abort listener when the operation is cancelled", async () => {
        const started = gate();
        const abortCallbacks: number[] = [];

        const id = queueManager.queueOperation("style-init", async (context) => {
            for (const n of [1, 2, 3]) {
                context.signal.addEventListener("abort", () => {
                    abortCallbacks.push(n);
                });
            }

            started.open();
            await untilAborted(context);
        });

        await started.promise;
        assert.deepEqual(abortCallbacks, [], "no listener fires before the cancel");

        assert.isTrue(queueManager.cancelOperation(id));
        await queueManager.waitForCompletion();

        assert.deepEqual(abortCallbacks, [1, 2, 3]);
    });

    it("should not report the AbortError of a cancelled operation as a graph error", async () => {
        const started = gate();
        const graphErrors: unknown[] = [];
        eventManager.addListener("error", (event) => {
            graphErrors.push(event);
        });

        const id = queueManager.queueOperation("data-remove", async (context) => {
            started.open();
            await untilAborted(context);
        });

        await started.promise;
        assert.isTrue(queueManager.cancelOperation(id));
        await queueManager.waitForCompletion();

        assert.deepEqual(graphErrors, []);
        assert.deepEqual(cancelledEvents, [{ id, code: "cancelled" }]);
    });

    it("should support cancellation of specific operations", async () => {
        const op1Started = gate();
        const op1Release = gate();
        const results: string[] = [];

        queueManager.queueOperation(
            "data-add",
            async () => {
                op1Started.open();
                await op1Release.promise;
                results.push("op1");
            },
            { skipTriggers: true },
        );

        const op2 = queueManager.queueOperation("layout-set", () => {
            results.push("op2");
        });

        queueManager.queueOperation("render-update", () => {
            results.push("op3");
        });

        // op2 is queued behind the running op1; cancel only it.
        await op1Started.promise;
        assert.isTrue(queueManager.cancelOperation(op2));
        op1Release.open();

        await queueManager.waitForCompletion();

        assert.deepEqual(results, ["op1", "op3"]);
        assert.notInclude(startEvents, op2, "the cancelled operation never started");
        assert.deepEqual(cancelledEvents, [{ id: op2, code: "cancelled" }]);
    });

    it("should cancel a category's running and queued operations and answer both callers", async () => {
        const started = gate();
        const running = queueManager.queueOperationAsync(
            "data-add",
            async (context) => {
                started.open();
                await untilAborted(context);
            },
            { skipTriggers: true },
        );
        await started.promise;
        const queued = queueManager.queueOperationAsync("data-add", () => undefined, { skipTriggers: true });

        assert.equal(queueManager.cancelByCategory("data-add"), 2);

        // Both awaits resolve: a cancelled operation is not an error, and one that never started
        // is answered by the cancel itself.
        await Promise.all([running, queued]);
        await queueManager.waitForCompletion();

        assert.lengthOf(startEvents, 1, "the queued operation never started");
        assert.lengthOf(cancelledEvents, 2);
        assert.deepEqual(completeEvents, []);
    });

    it("should not cancel already completed operations", async () => {
        const completed: string[] = [];

        const id = queueManager.queueOperation("style-apply", () => {
            completed.push("instant");
        });

        await queueManager.waitForCompletion();

        queueManager.clear();

        assert.deepEqual(completed, ["instant"]);
        assert.deepEqual(completeEvents, [id]);
        assert.deepEqual(cancelledEvents, [], "a finished operation is not reported as cancelled");
        assert.isFalse(queueManager.cancelOperation(id), "a finished operation cannot be cancelled");

        const stats = queueManager.getStats();
        assert.equal(stats.pending, 0);
        assert.equal(stats.size, 0);
    });
});
