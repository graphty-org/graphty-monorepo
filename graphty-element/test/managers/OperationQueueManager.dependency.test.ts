import { assert, beforeEach, describe, it } from "vitest";

import { EventManager } from "../../src/managers/EventManager";
import { OperationQueueManager } from "../../src/managers/OperationQueueManager";

describe("Dependency Ordering", () => {
    let eventManager: EventManager;
    let queueManager: OperationQueueManager;

    beforeEach(async () => {
        eventManager = new EventManager();
        await eventManager.init();
        queueManager = new OperationQueueManager(eventManager);
        await queueManager.init();
    });

    it("should order style-init before data-add due to dependencies", async () => {
        const executionOrder: string[] = [];

        // Queue in wrong order - data-add depends on style-init
        queueManager.queueOperation("data-add", () => {
            executionOrder.push("data-add");
        });

        queueManager.queueOperation("style-init", () => {
            executionOrder.push("style-init");
        });

        // Wait a microtask for batching
        await new Promise((resolve) => {
            queueMicrotask(() => {
                resolve(undefined);
            });
        });

        await queueManager.waitForCompletion();

        // Should execute style-init first due to dependencies
        assert.deepEqual(executionOrder, ["style-init", "data-add"]);
    });

    it("should allow layout-set and data-add in any order (stateless design)", async () => {
        const executionOrder: string[] = [];

        // Queue layout-set before data - this is now valid in stateless design
        queueManager.queueOperation("layout-set", () => {
            executionOrder.push("layout-set");
        });

        queueManager.queueOperation("data-add", () => {
            executionOrder.push("data-add");
        });

        // Wait a microtask for batching
        await new Promise((resolve) => {
            queueMicrotask(() => {
                resolve(undefined);
            });
        });

        await queueManager.waitForCompletion();

        // In stateless design, layout-set does NOT depend on data-add
        // They can execute in queue order since there's no dependency
        assert.deepEqual(executionOrder, ["layout-set", "data-add"]);
    });

    it("should handle operations with no dependencies", async () => {
        const executionOrder: string[] = [];

        // Queue operations that aren't in the dependency graph
        // @ts-expect-error Testing unknown operation category
        queueManager.queueOperation("custom-op-1", () => {
            executionOrder.push("custom-op-1");
        });

        // @ts-expect-error Testing unknown operation category
        queueManager.queueOperation("custom-op-2", () => {
            executionOrder.push("custom-op-2");
        });

        // Wait a microtask for batching
        await new Promise((resolve) => {
            queueMicrotask(() => {
                resolve(undefined);
            });
        });

        await queueManager.waitForCompletion();

        // Should execute both
        assert.sameMembers(executionOrder, ["custom-op-1", "custom-op-2"]);
    });

    it("should sort multiple operation categories correctly", async () => {
        const executionOrder: string[] = [];

        // Queue operations in reverse dependency order; none of these three obsoletes another
        queueManager.queueOperation("layout-set", () => {
            executionOrder.push("layout-set");
        });

        queueManager.queueOperation("data-add", () => {
            executionOrder.push("data-add");
        });

        queueManager.queueOperation("style-init", () => {
            executionOrder.push("style-init");
        });

        // Wait a microtask for batching
        await new Promise((resolve) => {
            queueMicrotask(() => {
                resolve(undefined);
            });
        });

        await queueManager.waitForCompletion();

        // Verify ordering constraints
        const indices = executionOrder.reduce<Record<string, number>>((acc, op, idx) => {
            acc[op] = idx;
            return acc;
        }, {});

        // style-init before data-add (data-add depends on style-init)
        assert.isTrue(indices["style-init"] < indices["data-add"]);

        // layout-set does NOT depend on data-add in stateless design
        // So we just verify they all execute
        assert.sameMembers(executionOrder, ["layout-set", "data-add", "style-init"]);
    });

    it("should handle multiple operations of the same category", async () => {
        const executionOrder: string[] = [];

        // Queue multiple data-add operations
        queueManager.queueOperation("data-add", () => {
            executionOrder.push("data-add-1");
        });

        queueManager.queueOperation("data-add", () => {
            executionOrder.push("data-add-2");
        });

        queueManager.queueOperation("data-add", () => {
            executionOrder.push("data-add-3");
        });

        // Use camera-update which does depend on layout-set
        queueManager.queueOperation("camera-update", () => {
            executionOrder.push("camera-update");
        });

        // Wait a microtask for batching
        await new Promise((resolve) => {
            queueMicrotask(() => {
                resolve(undefined);
            });
        });

        await queueManager.waitForCompletion();

        // All data-add operations should execute (order preserved within category)
        // camera-update has no dependency on data-add, so it executes in queue order
        assert.sameMembers(executionOrder, ["data-add-1", "data-add-2", "data-add-3", "camera-update"]);
        assert.deepEqual(
            executionOrder.filter((op) => op.startsWith("data-add")),
            ["data-add-1", "data-add-2", "data-add-3"],
        );
    });

    it("should maintain order within same category", async () => {
        const executionOrder: string[] = [];

        // Queue multiple operations of same category
        for (let i = 1; i <= 5; i++) {
            queueManager.queueOperation("data-add", () => {
                executionOrder.push(`data-${i}`);
            });
        }

        // Wait a microtask for batching
        await new Promise((resolve) => {
            queueMicrotask(() => {
                resolve(undefined);
            });
        });

        await queueManager.waitForCompletion();

        // Should maintain FIFO order within category
        assert.deepEqual(executionOrder, ["data-1", "data-2", "data-3", "data-4", "data-5"]);
    });

    it("should order a dependency chain and drop the algorithm-run that data-add obsoletes", async () => {
        const executionOrder: string[] = [];

        // Queued in reverse dependency order. data-add obsoletes the algorithm-run queued before it
        // (src/constants/obsolescence-rules.ts), so that one never runs.
        queueManager.queueOperation("algorithm-run", () => {
            executionOrder.push("algorithm-run");
        });

        queueManager.queueOperation("layout-set", () => {
            executionOrder.push("layout-set");
        });

        queueManager.queueOperation("data-add", () => {
            executionOrder.push("data-add");
        });

        queueManager.queueOperation("style-init", () => {
            executionOrder.push("style-init");
        });

        // Wait a microtask for batching
        await new Promise((resolve) => {
            queueMicrotask(() => {
                resolve(undefined);
            });
        });

        await queueManager.waitForCompletion();

        // Verify the dependency chain
        const indices = executionOrder.reduce<Record<string, number>>((acc, op, idx) => {
            acc[op] = idx;
            return acc;
        }, {});

        // style-init -> data-add (data-add depends on style-init)
        assert.isTrue(indices["style-init"] < indices["data-add"]);

        assert.notInclude(executionOrder, "algorithm-run", "data-add obsoleted it");
        // layout-set does NOT depend on data-add in stateless design, so its place can vary
        assert.sameMembers(executionOrder, ["style-init", "data-add", "layout-set"]);
    });

    it("should sort layout-set before a layout-update queued ahead of it", async () => {
        const executionOrder: string[] = [];

        // Batch mode applies no obsolescence, so the layout-update that layout-set would otherwise
        // obsolete stays in the batch and only the dependency decides the order.
        queueManager.enterBatchMode();
        queueManager.queueOperation("layout-update", () => {
            executionOrder.push("layout-update");
        });
        queueManager.queueOperation("layout-set", () => {
            executionOrder.push("layout-set");
        });
        await queueManager.exitBatchMode();
        await queueManager.waitForCompletion();

        assert.deepEqual(executionOrder, ["layout-set", "layout-update"]);
    });

    it("should execute layout-set before layout-update", async () => {
        const executionOrder: string[] = [];

        // Queue layout-set first
        queueManager.queueOperation(
            "layout-set",
            () => {
                executionOrder.push("layout-set");
            },
            { description: "Set layout" },
        );

        // Then queue layout-update - it should wait for layout-set due to dependency
        queueManager.queueOperation(
            "layout-update",
            () => {
                executionOrder.push("layout-update");
            },
            { description: "Update layout" },
        );

        // Wait a microtask for batching
        await new Promise((resolve) => {
            queueMicrotask(() => {
                resolve(undefined);
            });
        });

        await queueManager.waitForCompletion();

        // Should execute in correct dependency order
        assert.deepEqual(executionOrder, ["layout-set", "layout-update"]);
    });

    it("should obsolete previous layout-update operations", async () => {
        const executionOrder: string[] = [];

        queueManager.queueOperation(
            "layout-update",
            () => {
                executionOrder.push("layout-update-1");
            },
            { description: "Update 1" },
        );

        queueManager.queueOperation(
            "layout-update",
            () => {
                executionOrder.push("layout-update-2");
            },
            { description: "Update 2" },
        );

        queueManager.queueOperation(
            "layout-update",
            () => {
                executionOrder.push("layout-update-3");
            },
            { description: "Update 3" },
        );

        // Wait a microtask for batching
        await new Promise((resolve) => {
            queueMicrotask(() => {
                resolve(undefined);
            });
        });

        await queueManager.waitForCompletion();

        // Only the last layout-update should execute
        assert.deepEqual(executionOrder, ["layout-update-3"]);
    });
});
