import { assert, describe, it } from "vitest";

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

/** Each cancellation as `[name, id, code]`, under both spellings of the event, in emission order. */
function collectCancellations(eventManager: EventManager): [string, string, string][] {
    const events: [string, string, string][] = [];
    eventManager.onGraphEvent.add((event) => {
        if (event.type === "operation-canceled" || event.type === "operation-cancelled") {
            events.push([event.type, event.id, event.code]);
        }
    });
    return events;
}

describe("operation-canceled code", () => {
    it("reports queue-cleared when the whole queue is cleared", async () => {
        const eventManager = new EventManager();
        const queueManager = new OperationQueueManager(eventManager);
        const events = collectCancellations(eventManager);

        const id = await startBlockingOperation(queueManager);
        queueManager.clear();

        assert.deepEqual(events, [
            ["operation-canceled", id, "queue-cleared"],
            ["operation-cancelled", id, "queue-cleared"],
        ]);
    });

    it("reports canceled when one operation is canceled, and the British event says cancelled", async () => {
        const eventManager = new EventManager();
        const queueManager = new OperationQueueManager(eventManager);
        const events = collectCancellations(eventManager);

        const id = await startBlockingOperation(queueManager);
        assert.isTrue(queueManager.cancelOperation(id));

        assert.deepEqual(events, [
            ["operation-canceled", id, "canceled"],
            ["operation-cancelled", id, "cancelled"],
        ]);
    });
});
