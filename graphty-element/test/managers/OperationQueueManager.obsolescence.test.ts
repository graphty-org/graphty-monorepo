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

interface Obsoleted {
    id: string;
    category: string;
    obsoletedBy: string;
}

describe("Obsolescence Rules", () => {
    let eventManager: EventManager;
    let queueManager: OperationQueueManager;
    let obsoletedEvents: Obsoleted[];
    let startedOperations: string[];
    let completedOperations: string[];

    beforeEach(() => {
        eventManager = new EventManager();
        queueManager = new OperationQueueManager(eventManager);
        obsoletedEvents = [];
        startedOperations = [];
        completedOperations = [];

        eventManager.onGraphEvent.add((event) => {
            const fields = event as Record<string, unknown>;
            if (event.type === "operation-obsoleted") {
                obsoletedEvents.push({
                    id: fields.id as string,
                    category: fields.category as string,
                    obsoletedBy: fields.obsoletedBy as string,
                });
            } else if (event.type === "operation-start") {
                startedOperations.push(fields.id as string);
            } else if (event.type === "operation-complete") {
                completedOperations.push(fields.id as string);
            }
        });
    });

    it("should cancel a running layout-update when new data-add arrives", async () => {
        const started = gate();
        const executedOps: string[] = [];

        const layoutId = queueManager.queueOperation(
            "layout-update",
            async (context) => {
                started.open();
                await untilAborted(context);
                executedOps.push("layout-update");
            },
            { description: "Update layout positions" },
        );

        await started.promise;

        const dataId = queueManager.queueOperation(
            "data-add",
            () => {
                executedOps.push("data-add");
            },
            { description: "Add new nodes", obsoletes: ["layout-update"], skipTriggers: true },
        );

        await queueManager.waitForCompletion();

        assert.deepEqual(obsoletedEvents, [{ id: layoutId, category: "layout-update", obsoletedBy: dataId }]);
        assert.deepEqual(executedOps, ["data-add"]);
        assert.deepEqual(completedOperations, [dataId]);
    });

    it("should cancel a running algorithm-run when data changes", async () => {
        const started = gate();
        const executedOps: string[] = [];

        const algoId = queueManager.queueOperation(
            "algorithm-run",
            async (context) => {
                started.open();
                await untilAborted(context);
                executedOps.push("algorithm-run");
            },
            { description: "Run graph algorithm" },
        );

        await started.promise;

        const updateId = queueManager.queueOperation(
            "data-update",
            () => {
                executedOps.push("data-update");
            },
            { description: "Update node properties", obsoletes: ["algorithm-run"], skipTriggers: true },
        );

        await queueManager.waitForCompletion();

        assert.deepEqual(obsoletedEvents, [{ id: algoId, category: "algorithm-run", obsoletedBy: updateId }]);
        assert.deepEqual(executedOps, ["data-update"]);
        assert.deepEqual(completedOperations, [updateId]);
    });

    it("should apply custom obsolescence rules", async () => {
        const executedOps: string[] = [];

        const first = queueManager.queueOperation(
            "render-update",
            () => {
                executedOps.push("render-1");
            },
            { description: "Render update 1" },
        );

        // shouldObsolete is asked about every operation already in the queue
        const second = queueManager.queueOperation(
            "render-update",
            () => {
                executedOps.push("render-2");
            },
            {
                description: "Render update 2",
                shouldObsolete: (operation) => operation.category === "render-update",
            },
        );

        await queueManager.waitForCompletion();

        assert.deepEqual(obsoletedEvents, [{ id: first, category: "render-update", obsoletedBy: second }]);
        assert.deepEqual(executedOps, ["render-2"], "the obsoleted body never ran");
        assert.notInclude(startedOperations, first);
    });

    it("should obsolete queued operations and spare a running one with skipRunning", async () => {
        const started = gate();
        const release = gate();
        const executedOps: string[] = [];

        // A running operation of a category the later operation obsoletes
        const runningId = queueManager.queueOperation(
            "algorithm-run",
            async () => {
                started.open();
                await release.promise;
                executedOps.push("running-algorithm");
            },
            { description: "Currently running algorithm" },
        );

        await started.promise;

        // Queued behind it, and also of an obsoleted category
        const queuedId = queueManager.queueOperation(
            "layout-update",
            () => {
                executedOps.push("queued-layout");
            },
            { description: "Queued layout operation" },
        );

        const removeId = queueManager.queueOperation(
            "data-remove",
            () => {
                executedOps.push("data-remove");
            },
            {
                description: "Remove data",
                obsoletes: ["layout-update", "algorithm-run"],
                skipRunning: true, // Only obsolete queued operations
                skipTriggers: true,
            },
        );

        release.open();
        await queueManager.waitForCompletion();

        assert.deepEqual(obsoletedEvents, [{ id: queuedId, category: "layout-update", obsoletedBy: removeId }]);
        assert.deepEqual(executedOps, ["running-algorithm", "data-remove"]);
        assert.include(completedOperations, runningId);
    });

    it("should allow conditional obsolescence with shouldObsolete", async () => {
        const results: string[] = [];

        const nodeStyles = queueManager.queueOperation(
            "style-apply",
            () => {
                results.push("style-1");
            },
            { description: "Apply styles to nodes", nodeSelector: ".class-a" },
        );

        queueManager.queueOperation(
            "style-apply",
            () => {
                results.push("style-2");
            },
            { description: "Apply styles to edges", edgeSelector: ".class-b" },
        );

        const global = queueManager.queueOperation(
            "style-apply",
            () => {
                results.push("style-3");
            },
            {
                description: "Apply global styles",
                shouldObsolete: (operation) =>
                    operation.category === "style-apply" && operation.metadata?.nodeSelector !== undefined,
            },
        );

        await queueManager.waitForCompletion();

        assert.deepEqual(obsoletedEvents, [{ id: nodeStyles, category: "style-apply", obsoletedBy: global }]);
        assert.deepEqual(results, ["style-2", "style-3"]);
    });
});
