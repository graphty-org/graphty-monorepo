import { assert, beforeEach, describe, it, vi } from "vitest";

import { EventManager } from "../../src/managers/EventManager";
import { type OperationContext, OperationQueueManager } from "../../src/managers/OperationQueueManager";

describe("OperationQueueManager", () => {
    let eventManager: EventManager;
    let queueManager: OperationQueueManager;

    beforeEach(async () => {
        eventManager = new EventManager();
        await eventManager.init();
        queueManager = new OperationQueueManager(eventManager);
        await queueManager.init();
    });

    it("should queue and execute operations in dependency order", async () => {
        const executionOrder: string[] = [];

        // Queue operations in reverse dependency order
        queueManager.queueOperation("data-add", () => {
            executionOrder.push("data-add");
        });

        queueManager.queueOperation("style-init", () => {
            executionOrder.push("style-init");
        });

        queueManager.queueOperation("layout-set", () => {
            executionOrder.push("layout-set");
        });

        // Wait for completion
        await queueManager.waitForCompletion();

        // Should execute in correct dependency order: style-init -> data-add -> layout-set
        assert.deepEqual(executionOrder, ["style-init", "data-add", "layout-set"]);
    });

    it("should batch operations queued in same microtask", async () => {
        const executionOrder: string[] = [];
        let batchCount = 0;

        // Listen for batch events
        eventManager.addListener("operation-batch-complete", () => {
            batchCount++;
        });

        // Queue multiple operations in same microtask
        queueManager.queueOperation("style-init", () => {
            executionOrder.push("style-init");
        });

        queueManager.queueOperation("data-add", () => {
            executionOrder.push("data-add-1");
        });

        queueManager.queueOperation("data-add", () => {
            executionOrder.push("data-add-2");
        });

        await queueManager.waitForCompletion();

        // Should have executed all operations in correct dependency order
        // style-init should come first, then data-adds
        assert.isAbove(batchCount, 0, "Should have at least one batch");
        assert.isAtLeast(executionOrder.length, 3, "Should execute at least the 3 queued operations");
        // style-init should be first due to dependencies
        assert.equal(executionOrder[0], "style-init", "style-init should execute first");
    });

    it("should handle circular dependencies gracefully", async () => {
        const executionOrder: string[] = [];

        // Create a scenario that might have circular dependencies
        // The implementation should detect and handle this
        queueManager.queueOperation("style-init", () => {
            executionOrder.push("style-init");
        });

        queueManager.queueOperation("data-add", () => {
            executionOrder.push("data-add");
        });

        await queueManager.waitForCompletion();

        // Should still execute without throwing
        assert.isTrue(executionOrder.length > 0);
    });

    it("should emit lifecycle events (start, complete, error)", async () => {
        const events: string[] = [];

        eventManager.addListener("operation-start", () => {
            events.push("start");
        });

        eventManager.addListener("operation-complete", () => {
            events.push("complete");
        });

        eventManager.addListener("error", () => {
            events.push("error");
        });

        // Queue a successful operation
        queueManager.queueOperation("data-add", () => {
            // Success
        });

        await queueManager.waitForCompletion();

        assert.include(events, "start");
        assert.include(events, "complete");

        // Queue a failing operation
        queueManager.queueOperation("data-add", () => {
            throw new Error("Test error");
        });

        await queueManager.waitForCompletion();

        assert.include(events, "error");
    });

    it("reports an AbortError the operation body throws itself as an error, once", async () => {
        const errors: unknown[] = [];
        const queueEvents: string[] = [];
        eventManager.addListener("error", (event) => {
            errors.push(event);
        });
        eventManager.onGraphEvent.add((event) => {
            if (event.type === "operation-obsoleted" || event.type === "operation-cancelled") {
                queueEvents.push(event.type);
            }
        });

        const thrown = new Error("aborted by the body");
        thrown.name = "AbortError";
        const outcome = queueManager.queueOperationAsync("data-add", () => {
            throw thrown;
        });

        let rejection: unknown;
        await outcome.catch((error: unknown) => {
            rejection = error;
        });
        await queueManager.waitForCompletion();

        assert.strictEqual(rejection, thrown);
        assert.lengthOf(errors, 1);
        assert.deepEqual(queueEvents, []);
    });

    it("should provide queue statistics", async () => {
        let started!: () => void;
        const running = new Promise<void>((resolve) => {
            started = resolve;
        });
        let release!: () => void;
        const released = new Promise<void>((resolve) => {
            release = resolve;
        });

        // One operation runs and holds the queue; the other waits behind it
        queueManager.queueOperation(
            "data-add",
            async () => {
                started();
                await released;
            },
            { skipTriggers: true },
        );
        queueManager.queueOperation("layout-set", () => undefined, { skipTriggers: true });

        await running;
        assert.deepEqual(queueManager.getStats(), { pending: 1, size: 1, isPaused: false });

        release();
        await queueManager.waitForCompletion();
        assert.deepEqual(queueManager.getStats(), { pending: 0, size: 0, isPaused: false });

        queueManager.pause();
        assert.isTrue(queueManager.getStats().isPaused);
    });

    it("should support pausing and resuming the queue", async () => {
        const executionOrder: string[] = [];

        queueManager.pause();

        queueManager.queueOperation("data-add", () => {
            executionOrder.push("data-add");
        });

        // Operation should not execute while paused: the queue schedules work on a microtask,
        // so one macrotask yield is past the point it would have run
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.equal(executionOrder.length, 0);

        queueManager.resume();

        await queueManager.waitForCompletion();
        assert.equal(executionOrder.length, 1);
    });

    it("should clear pending operations", async () => {
        const executionOrder: string[] = [];

        // Pause to prevent execution
        queueManager.pause();

        queueManager.queueOperation("data-add", () => {
            executionOrder.push("data-add");
        });

        queueManager.queueOperation("layout-set", () => {
            executionOrder.push("layout-set");
        });

        // Clear before they execute
        queueManager.clear();
        queueManager.resume();

        await queueManager.waitForCompletion();

        // Nothing should have executed
        assert.equal(executionOrder.length, 0);
    });

    it("should handle operations with no dependencies", async () => {
        const executionOrder: string[] = [];

        // Queue operations that don't have dependencies defined
        queueManager.queueOperation("camera-update", () => {
            executionOrder.push("camera-update");
        });

        queueManager.queueOperation("render-update", () => {
            executionOrder.push("render-update");
        });

        await queueManager.waitForCompletion();

        // Both should execute
        assert.equal(executionOrder.length, 2);
    });

    it("should execute operations with context", async () => {
        let contextReceived: OperationContext | undefined;

        queueManager.queueOperation("data-add", (context: OperationContext) => {
            contextReceived = context;
        });

        await queueManager.waitForCompletion();

        assert.isDefined(contextReceived);
        assert.isDefined(contextReceived.signal);
        assert.isDefined(contextReceived.progress);
        assert.isDefined(contextReceived.id);
    });

    it("should handle async and sync operations", async () => {
        const executionOrder: string[] = [];

        // Mix async and sync operations
        queueManager.queueOperation("style-init", () => {
            executionOrder.push("style-init-sync");
        });

        queueManager.queueOperation("data-add", async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            executionOrder.push("data-add-async");
        });

        queueManager.queueOperation("layout-set", () => {
            executionOrder.push("layout-set-sync");
        });

        await queueManager.waitForCompletion();

        // Should execute in dependency order
        assert.deepEqual(executionOrder, ["style-init-sync", "data-add-async", "layout-set-sync"]);
    });

    it("lets go of finished operations when disposed, without waiting for their cleanup", async () => {
        // A finished operation's cleanup runs a second later and holds the manager -- and through
        // it a whole graph -- until it does. Dispose cancels every one (issue #3413).
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        try {
            queueManager.queueOperation("data-add", () => undefined, { skipTriggers: true });
            queueManager.queueOperation("layout-set", () => undefined, { skipTriggers: true });
            await queueManager.waitForCompletion();
            assert.equal(vi.getTimerCount(), 2, "each finished operation scheduled its cleanup");

            queueManager.dispose();
            assert.equal(vi.getTimerCount(), 0, "dispose cancelled the cleanups");
        } finally {
            vi.useRealTimers();
        }
    });
});
