import { assert, describe, it } from "vitest";

import type { OperationCanceledEvent } from "../../src/events";
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
                const error = new Error("Canceled");
                error.name = "AbortError";
                reject(error);
            });
        });
    });
    await running;
    return id;
}

function collectCancellations(eventManager: EventManager): OperationCanceledEvent[] {
    const events: OperationCanceledEvent[] = [];
    eventManager.onGraphEvent.add((event) => {
        if (event.type === "operation-canceled") {
            events.push(event);
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

        assert.deepEqual(events, [{ type: "operation-canceled", id, code: "queue-cleared" }]);
    });

    it("reports canceled when one operation is canceled", async () => {
        const eventManager = new EventManager();
        const queueManager = new OperationQueueManager(eventManager);
        const events = collectCancellations(eventManager);

        const id = await startBlockingOperation(queueManager);
        assert.isTrue(queueManager.cancelOperation(id));

        assert.deepEqual(events, [{ type: "operation-canceled", id, code: "canceled" }]);
    });
});
