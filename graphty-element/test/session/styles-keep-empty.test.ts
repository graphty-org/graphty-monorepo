/**
 * @file `styles.update` and `keepEmpty`: an edit that takes a layer's last value away keeps the
 * layer in place, painting nothing, with the option or without it (every layer may write nothing,
 * issue #5905).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";

describe("styles.update with keepEmpty", () => {
    it("keeps a layer whose last value it takes away, with keepEmpty or without it", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const layer = await session.styles.add({
            name: "Size",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });

        await session.styles.update(layer.id, { set: undefined });
        assert.isUndefined(session.styles.get(layer.id)?.set, "kept without the option");
        await session.undo();
        assert.strictEqual(session.styles.get(layer.id)?.set?.["node.size"], 2);

        await session.styles.update(layer.id, { set: undefined }, { keepEmpty: true });
        const kept = session.styles.get(layer.id);
        assert.isDefined(kept, "the layer is still there");
        assert.isUndefined(kept?.set);

        await session.undo();
        assert.strictEqual(session.styles.get(layer.id)?.set?.["node.size"], 2, "one undo puts the value back");
        session.dispose();
    });
});
