import { assert, describe, it } from "vitest";

import type { OperationCancelledEvent } from "../../src/events";
import { EventManager } from "../../src/managers/EventManager";
import { OperationQueueManager } from "../../src/managers/OperationQueueManager";

/** Queue one operation that runs until aborted; resolve once it has started. */
async function startBlockingOperation(queueManager: OperationQueueManager): Promise<string> {
    let started!: () => void;
    const running = new Promise<void>((resolve) => {
        started = resolve;
    });
    const id = queueManager.queueOperation("algorithm-run", (context) => {
        started();
        return new Promise<void>((_resolve, reject) => {
            context.signal.addEventListener("abort", () => {
                const error = new Error("Cancelled");
                error.name = "AbortError";
                reject(error);
            });
        });
    });
    await running;
    return id;
}

function collectCancellations(eventManager: EventManager): OperationCancelledEvent[] {
    const events: OperationCancelledEvent[] = [];
    eventManager.onGraphEvent.add((event) => {
        if (event.type === "operation-cancelled") {
            events.push(event);
        }
    });
    return events;
}

describe("operation-cancelled code", () => {
    it("reports queue-cleared when the whole queue is cleared", async () => {
        const eventManager = new EventManager();
        const queueManager = new OperationQueueManager(eventManager);
        const events = collectCancellations(eventManager);

        const id = await startBlockingOperation(queueManager);
        queueManager.clear();

        assert.deepEqual(events, [{ type: "operation-cancelled", id, code: "queue-cleared" }]);
    });

    it("reports cancelled when one operation is cancelled", async () => {
        const eventManager = new EventManager();
        const queueManager = new OperationQueueManager(eventManager);
        const events = collectCancellations(eventManager);

        const id = await startBlockingOperation(queueManager);
        assert.isTrue(queueManager.cancelOperation(id));

        assert.deepEqual(events, [{ type: "operation-cancelled", id, code: "cancelled" }]);
    });
});
