/**
 * @file `selection.peek({ layer })` points at what a style layer paints, for a moment: the count it
 * returns is the layer's matched count, nothing is selected or saved, and `peek(null)` clears it.
 * It needs no experiment: a style editor points at a row's elements while the pointer rests on it.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";

describe("peeking at a layer", () => {
    it("names what the layer matches, selects nothing, adds no step, and clears", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", group: 1 },
            { id: "b", group: 1 },
            { id: "c", group: 2 },
        ]);
        const layer = await session.styles.add({
            name: "Group one",
            target: "node",
            selector: { match: "ids", nodes: ["a", "b"] },
            set: { "node.color": "#ff0000" },
        });
        await session.styles.settled();
        const steps = session.history.steps.length;

        const peeked = await session.selection.peek({ layer: layer.id });
        assert.strictEqual(peeked.nodes, session.styles.counts(layer.id).matched);
        assert.deepStrictEqual(peeked, { nodes: 2, edges: 0 });
        assert.deepStrictEqual(session.selection.peeked, { nodes: 2, edges: 0 });
        assert.lengthOf(session.selection.nodes, 0, "nothing is selected");
        assert.strictEqual(session.history.steps.length, steps, "no undo step");

        await session.selection.peek(null);
        assert.isNull(session.selection.peeked);
        session.dispose();
    });
});
