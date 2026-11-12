/**
 * @file Undo across a file opened over itself redraws from the layers. After a replacing load and
 * the undo of that load, a later undo that removes a layer's look takes that look off the drawing:
 * the node is drawn as the layers left in the stack say, not as it was drawn before.
 */

import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

/** Three nodes in a path. */
const DATASET = JSON.stringify({
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
    ],
});

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

describe("undo across a replacing load", () => {
    it("takes an undone layer's color off the drawing", async () => {
        const container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        const graph = new Graph(container);
        cleanups.push(() => {
            graph.dispose();
            container.remove();
        });
        await graph.init();
        const session = graph.getSession();
        const settle = async (): Promise<void> => {
            await operationQueueOf(graph).waitForCompletion();
            graph.getUpdateManager().stepFrames(2);
        };

        /**
         * The color node `a` is drawn in.
         * @returns `#rrggbb`, or null before its first paint.
         */
        const drawn = (): string | null => {
            const node = graph.getNodes().find((each) => String(each.id) === "a");
            assert.isDefined(node, "node a is drawn");
            return node.drawnFill;
        };

        await session.data.import({ type: "json", config: { data: DATASET } }, { mode: "replace" });
        await settle();
        const base = drawn();

        await session.styles.add({
            name: "a",
            selector: { match: "expression", where: 'id == `"a"`' },
            set: { "node.color": "#00aa00" },
        });
        await settle();
        const green = drawn();
        assert.notStrictEqual(green, base, "the layer painted a");

        await session.data.import({ type: "json", config: { data: DATASET } }, { mode: "replace" });
        await settle();
        await session.undo();
        await settle();
        assert.strictEqual(drawn(), green, "undoing the load keeps the layer's color");

        await session.undo();
        await settle();
        assert.strictEqual(drawn(), base, "undoing the layer takes its color off the drawing");
    });
});
