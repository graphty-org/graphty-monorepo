/**
 * @file `styles.drawnValues(channel)`: how many drawn elements carry each value of one channel,
 * whichever layer decided it, most first.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";

describe("the values a channel is drawn with", () => {
    it("counts each drawn value, most first", async () => {
        const s = createGraphSession();
        await s.data.addNodes(["a", "b", "c", "d"].map((id) => ({ id })));
        await s.styles.add({
            name: "All",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shape": "box" },
        });
        await s.styles.add({
            name: "Some",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.shape": "box" },
        });
        await s.styles.add({
            name: "Other",
            target: "node",
            selector: { match: "ids", nodes: ["d"] },
            set: { "node.shape": "sphere" },
        });
        await s.styles.settled();
        // "box" decided by two layers is still one value.
        assert.deepEqual(s.styles.drawnValues("node.shape"), [
            { value: "box", count: 3 },
            { value: "sphere", count: 1 },
        ]);
        s.dispose();
    });

    it("an unpainted or filtered-out element is not counted", async () => {
        const s = createGraphSession();
        await s.data.addNodes(["a", "b", "c"].map((id) => ({ id })));
        await s.styles.add({
            name: "Some",
            target: "node",
            selector: { match: "ids", nodes: ["a", "b"] },
            set: { "node.labelFont": "Georgia" },
        });
        await s.styles.settled();
        assert.deepEqual(s.styles.drawnValues("node.labelFont"), [{ value: "Georgia", count: 2 }]);

        await s.visibility.set({ kind: "member", of: { nodes: ["b", "c"] } });
        await s.styles.settled();
        assert.deepEqual(s.styles.drawnValues("node.labelFont"), [{ value: "Georgia", count: 1 }]);
        assert.deepEqual(s.styles.drawnValues("edge.color"), []);
        s.dispose();
    });
});
