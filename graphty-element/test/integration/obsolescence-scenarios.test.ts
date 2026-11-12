import { assert, beforeEach, describe, it } from "vitest";

import { EventManager } from "../../src/managers/EventManager";
import { type OperationContext, OperationQueueManager } from "../../src/managers/OperationQueueManager";

/**
 * A promise the test settles by hand. Each scenario holds an operation open on one of these, so
 * the obsoleting operation arrives at a known point -- while the earlier work is running or
 * queued -- instead of whenever the clock happens to put it.
 * @returns The promise and the function that resolves it.
 */
function deferred(): { promise: Promise<void>; resolve: () => void } {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
        resolve = r;
    });
    return { promise, resolve };
}

/**
 * Throw if the queue cancelled this operation, as a real operation body does after an await.
 * @param context - The operation's context.
 */
function stopIfCancelled(context: OperationContext): void {
    if (context.signal.aborted) {
        throw new Error("AbortError");
    }
}

describe("Obsolescence Scenarios", () => {
    let eventManager: EventManager;
    let queueManager: OperationQueueManager;
    let obsoletedOperations: string[];
    let completedOperations: string[];

    beforeEach(() => {
        eventManager = new EventManager();
        queueManager = new OperationQueueManager(eventManager);
        obsoletedOperations = [];
        completedOperations = [];

        eventManager.onGraphEvent.add((event) => {
            if (event.type === "operation-obsoleted") {
                obsoletedOperations.push((event as Record<string, unknown>).id as string);
            } else if (event.type === "operation-complete") {
                completedOperations.push((event as Record<string, unknown>).id as string);
            }
        });
    });

    it("should handle rapid data updates efficiently", async () => {
        const executedLayouts: string[] = [];
        const executedDataOps: string[] = [];
        const layoutIds: string[] = [];
        const firstDataStarted = deferred();
        const releaseFirstData = deferred();

        // Five data updates arrive while the first one is still running. Each obsoletes the
        // layouts queued before it, so only the layout for the last batch is left to run. The
        // data operations skip their own triggered layout, which would obsolete that one too.
        for (let i = 0; i < 5; i++) {
            queueManager.queueOperation(
                "data-add",
                async () => {
                    executedDataOps.push(`data-${i}`);
                    if (i === 0) {
                        firstDataStarted.resolve();
                        await releaseFirstData.promise;
                    }
                },
                {
                    description: `Data batch ${i}`,
                    obsoletes: ["layout-update"],
                    skipTriggers: true,
                },
            );

            layoutIds.push(
                queueManager.queueOperation(
                    "layout-update",
                    (context) => {
                        stopIfCancelled(context);
                        executedLayouts.push(`layout-${i}`);
                    },
                    { description: `Layout for batch ${i}` },
                ),
            );

            if (i === 0) {
                await firstDataStarted.promise;
            }
        }

        releaseFirstData.resolve();
        await queueManager.waitForCompletion();

        assert.deepEqual(executedDataOps, ["data-0", "data-1", "data-2", "data-3", "data-4"]);
        assert.deepEqual(executedLayouts, ["layout-4"]);
        assert.deepEqual(obsoletedOperations, layoutIds.slice(0, 4));
    });

    it("should not cancel near-complete operations (>90% progress)", async () => {
        const results: string[] = [];
        const progressReached = deferred();
        const releaseLayout = deferred();

        // First queue a layout-set so layout-update has its dependency satisfied
        queueManager.queueOperation(
            "layout-set",
            () => {
                results.push("layout-set");
            },
            { description: "Set layout" },
        );
        await queueManager.waitForCompletion();

        const layoutOpId = queueManager.queueOperation(
            "layout-update",
            async (context) => {
                context.progress.setProgress(95);
                progressReached.resolve();
                await releaseLayout.promise;
                stopIfCancelled(context);
                results.push("layout-completed");
            },
            { description: "Nearly complete layout" },
        );

        await progressReached.promise;

        // A data operation that would obsolete the layout, were it not at 95%
        queueManager.queueOperation(
            "data-add",
            () => {
                results.push("data-added");
            },
            {
                description: "New data",
                obsoletes: ["layout-update"],
                respectProgress: true,
                skipTriggers: true,
            },
        );

        releaseLayout.resolve();
        await queueManager.waitForCompletion();

        assert.deepEqual(results, ["layout-set", "layout-completed", "data-added"]);
        assert.deepEqual(obsoletedOperations, []);
        assert.include(completedOperations, layoutOpId);
    });

    it("should cancel a running operation below 90% progress", async () => {
        const results: string[] = [];
        const progressReached = deferred();
        const releaseLayout = deferred();

        queueManager.queueOperation("layout-set", () => undefined, { description: "Set layout" });
        await queueManager.waitForCompletion();

        const layoutOpId = queueManager.queueOperation(
            "layout-update",
            async (context) => {
                context.progress.setProgress(50);
                progressReached.resolve();
                await releaseLayout.promise;
                stopIfCancelled(context);
                results.push("layout-completed");
            },
            { description: "Half-done layout" },
        );

        await progressReached.promise;

        queueManager.queueOperation(
            "data-add",
            () => {
                results.push("data-added");
            },
            {
                description: "New data",
                obsoletes: ["layout-update"],
                respectProgress: true,
                skipTriggers: true,
            },
        );

        releaseLayout.resolve();
        await queueManager.waitForCompletion();

        assert.deepEqual(results, ["data-added"]);
        assert.deepEqual(obsoletedOperations, [layoutOpId]);
    });

    it("should cancel cascading obsolete operations", async () => {
        const executed: string[] = [];
        const dataStarted = deferred();
        const releaseData = deferred();

        // Queue a chain of dependent operations; the data operation holds the queue open
        queueManager.queueOperation(
            "data-add",
            async (context) => {
                dataStarted.resolve();
                await releaseData.promise;
                stopIfCancelled(context);
                executed.push("data");
            },
            { description: "Add initial data", skipTriggers: true },
        );

        const dependentIds = (
            [
                ["layout-update", "layout"],
                ["algorithm-run", "algorithm"],
                ["render-update", "render"],
            ] as const
        ).map(([category, name]) =>
            queueManager.queueOperation(
                category,
                (context) => {
                    stopIfCancelled(context);
                    executed.push(name);
                },
                { description: name },
            ),
        );

        // While the first operation runs, new data obsoletes everything queued behind it
        await dataStarted.promise;

        queueManager.queueOperation(
            "data-remove",
            () => {
                executed.push("new-data");
            },
            {
                description: "Remove all data",
                obsoletes: ["layout-update", "algorithm-run", "render-update"],
                cascading: true,
                skipTriggers: true,
            },
        );

        releaseData.resolve();
        await queueManager.waitForCompletion();

        assert.deepEqual(executed, ["data", "new-data"]);
        assert.deepEqual(obsoletedOperations, dependentIds);
    });

    it("should handle mixed operation priorities correctly", async () => {
        const results: string[] = [];

        // All three arrive in one batch. The data operation obsoletes the render queued before
        // it, and the style initialization runs first because data depends on it.
        const renderId = queueManager.queueOperation(
            "render-update",
            (context) => {
                stopIfCancelled(context);
                results.push("render");
            },
            { description: "Low priority render" },
        );

        queueManager.queueOperation(
            "data-add",
            () => {
                results.push("data");
            },
            {
                description: "High priority data",
                obsoletes: ["render-update"],
                skipTriggers: true,
            },
        );

        queueManager.queueOperation(
            "style-init",
            () => {
                results.push("style");
            },
            { description: "Critical style init" },
        );

        await queueManager.waitForCompletion();

        assert.deepEqual(results, ["style", "data"]);
        assert.deepEqual(obsoletedOperations, [renderId]);
    });

    it("should respect custom obsolescence conditions", async () => {
        const completed: string[] = [];
        const ids: string[] = [];
        const firstStarted = deferred();
        const releaseFirst = deferred();

        // Each algorithm obsoletes every algorithm queued before it. The second and third arrive
        // while the first is running at 0% progress, so the first and second are both cancelled.
        for (let i = 0; i < 3; i++) {
            ids.push(
                queueManager.queueOperation(
                    "algorithm-run",
                    async (context) => {
                        if (i === 0) {
                            firstStarted.resolve();
                            await releaseFirst.promise;
                        }

                        stopIfCancelled(context);
                        completed.push(`algo-${i}`);
                    },
                    {
                        description: `Algorithm ${i}`,
                        shouldObsolete: (operation) =>
                            operation.category === "algorithm-run" && ids.includes(operation.id),
                    },
                ),
            );

            if (i === 0) {
                await firstStarted.promise;
            }
        }

        releaseFirst.resolve();
        await queueManager.waitForCompletion();

        assert.deepEqual(completed, ["algo-2"]);
        assert.deepEqual(obsoletedOperations, [ids[0], ids[1]]);
    });

    it("should handle operation batches with obsolescence", async () => {
        const results: string[] = [];
        const dataStarted = deferred();
        const releaseData = deferred();

        // Batch 1: data, then the layout and render that depend on it
        queueManager.queueOperation(
            "data-add",
            async () => {
                dataStarted.resolve();
                await releaseData.promise;
                results.push("batch1-data");
            },
            { description: "Batch 1 data", skipTriggers: true },
        );
        const layoutId = queueManager.queueOperation(
            "layout-update",
            (context) => {
                stopIfCancelled(context);
                results.push("batch1-layout");
            },
            { description: "Batch 1 layout" },
        );
        const renderId = queueManager.queueOperation(
            "render-update",
            (context) => {
                stopIfCancelled(context);
                results.push("batch1-render");
            },
            { description: "Batch 1 render" },
        );

        // While batch 1's data runs, batch 2 clears the data and obsoletes batch 1's layout and render
        await dataStarted.promise;

        queueManager.queueOperation(
            "data-remove",
            () => {
                results.push("batch2-data");
            },
            {
                description: "Batch 2 data - clear all",
                obsoletes: ["layout-update", "render-update"],
                skipTriggers: true,
            },
        );
        queueManager.queueOperation(
            "style-init",
            () => {
                results.push("batch2-style");
            },
            { description: "Batch 2 style reset" },
        );

        releaseData.resolve();
        await queueManager.waitForCompletion();

        assert.equal(results[0], "batch1-data");
        assert.sameMembers(results, ["batch1-data", "batch2-data", "batch2-style"]);
        assert.deepEqual(obsoletedOperations, [layoutId, renderId]);
    });
});
