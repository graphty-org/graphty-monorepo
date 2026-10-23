/**
 * @file `styles.update` with `keepEmpty`: an edit that takes a layer's last value away keeps the
 * layer in place, painting nothing; without it the update is refused, as before.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { createGraphSession } from "../../src/session";

describe("styles.update with keepEmpty", () => {
    it("keeps a layer whose last value it takes away, and is refused without it", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const layer = await session.styles.add({
            name: "Size",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });

        const refused = await session.styles.update(layer.id, { set: undefined }).then(
            () => null,
            (error: unknown) => error,
        );
        assert.isTrue(isGraphtyError(refused) && refused.code === "E_BAD_LAYER", "refused by default");

        await session.styles.update(layer.id, { set: undefined }, { keepEmpty: true });
        const kept = session.styles.get(layer.id);
        assert.isDefined(kept, "the layer is still there");
        assert.isUndefined(kept?.set);

        await session.undo();
        assert.strictEqual(session.styles.get(layer.id)?.set?.["node.size"], 2, "one undo puts the value back");
        session.dispose();
    });
});
