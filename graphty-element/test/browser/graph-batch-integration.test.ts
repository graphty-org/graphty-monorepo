/**
 * @file `batchOperations` is a transaction: what its callback does through `tx` is one undoable
 * step, a throw rolls all of it back, and a door called on the graph itself during the callback is
 * a step of its own and says so. See design/undo/undo-design.md section 5.1.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

describe("Graph.batchOperations", () => {
    let container: HTMLElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        graph.dispose();
        container.remove();
    });

    it("records every change made through tx as one step", async () => {
        const session = graph.getSession();
        const before = session.history.steps.length;

        await graph.batchOperations(async (tx) => {
            await tx.data.addNodes([{ id: "1" }, { id: "2" }]);
            await tx.data.addEdges([{ src: "1", dst: "2" }]);
            await tx.layout.set("circular");
        });

        assert.strictEqual(graph.getNodeCount(), 2);
        assert.strictEqual(graph.getEdgeCount(), 1);
        assert.lengthOf(session.history.steps, before + 1, "one step");
        assert.deepEqual(session.history.steps.at(-1)?.ops, ["data.apply", "data.apply", "layout.set"]);

        await session.undo();
        assert.strictEqual(graph.getNodeCount(), 0, "one undo takes the whole batch back");
        assert.strictEqual(graph.getEdgeCount(), 0);
    });

    it("rolls every change back when the callback throws", async () => {
        const session = graph.getSession();
        const before = session.history.steps.length;

        let failure: unknown;
        try {
            await graph.batchOperations(async (tx) => {
                await tx.data.addNodes([{ id: "1" }]);
                await tx.data.addNodes([{ id: "2" }]);
                throw new Error("the batch failed on purpose");
            });
        } catch (error) {
            failure = error;
        }

        assert.instanceOf(failure, Error, "the error reaches the caller");
        assert.strictEqual(graph.getNodeCount(), 0, "nothing the batch added is left");
        assert.lengthOf(session.history.steps, before, "and nothing was recorded");
    });

    it("warns, naming the tx verb, when a door is called on the graph during the callback", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const session = graph.getSession();
        const before = session.history.steps.length;

        // Called before the batch holds the graph: once it does, a door that needs the graph
        // fails at once rather than waiting on a transaction that may be waiting on it.
        await graph.batchOperations(async (tx) => {
            await graph.addNodes([{ id: "2" }]);
            await tx.data.addNodes([{ id: "1" }]);
        });

        const warned = warn.mock.calls.map((call) => String(call[0]));
        assert.isTrue(
            warned.some((message) => message.includes("addNodes") && message.includes("tx.data.addNodes")),
            "the warning names the door and the tx verb",
        );
        assert.lengthOf(session.history.steps, before + 2, "the door's change is a step of its own");

        warn.mockClear();
        await graph.addNodes([{ id: "3" }]);
        assert.lengthOf(warn.mock.calls, 0, "outside a batch the door does not warn");
    });

    it("runs sequential batches as one step each", async () => {
        const session = graph.getSession();
        const before = session.history.steps.length;

        await graph.batchOperations(async (tx) => {
            await tx.data.addNodes([{ id: "1" }]);
        });
        await graph.batchOperations(async (tx) => {
            await tx.data.addNodes([{ id: "2" }]);
            await tx.data.addEdges([{ src: "1", dst: "2" }]);
        });

        assert.strictEqual(graph.getNodeCount(), 2);
        assert.strictEqual(graph.getEdgeCount(), 1);
        assert.lengthOf(session.history.steps, before + 2);
    });

    it("handles a large batch in one step", async () => {
        const session = graph.getSession();
        const before = session.history.steps.length;
        const nodeCount = 100;
        const startTime = Date.now();

        await graph.batchOperations(async (tx) => {
            for (let i = 0; i < nodeCount; i++) {
                await tx.data.addNodes([{ id: `node-${String(i)}` }]);
            }
        });

        assert.strictEqual(graph.getNodeCount(), nodeCount);
        assert.lengthOf(session.history.steps, before + 1);
        assert.isBelow(Date.now() - startTime, 2000, "a hundred adds take well under two seconds");
    });
});

describe("the element's batchOperations", () => {
    it("is one step through tx, and an element door called during it warns", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        document.body.appendChild(element);
        try {
            await element.updateComplete;
            await operationQueueOf(element.graph).waitForCompletion();
            const { session } = element;
            await session.data.addNodes([{ id: "first" }]);
            const before = session.history.steps.length;

            await element.batchOperations(async (tx) => {
                await element.setLayout("random");
                await tx.data.addNodes([{ id: "a" }, { id: "b" }]);
                await tx.data.addEdges([{ src: "a", dst: "b" }]);
            });

            assert.lengthOf(session.history.steps, before + 2, "the batch is one step, the element call another");
            assert.isTrue(
                warn.mock.calls.some((call) => String(call[0]).includes("tx.layout.set")),
                "the element call logged the warning",
            );
        } finally {
            warn.mockRestore();
            element.remove();
        }
    });
});
