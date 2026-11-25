/**
 * @file `styles.moveListItems`: parallel list items reordered or removed on one layer, their item values and item
 * bindings moving with them, in one undo step.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import { createGraphSession } from "../../../src/session";

const LISTS = ["node.stripeColors", "node.stripeSizes", "node.stripeOpacities"] as const;

describe("styles.moveListItems", () => {
    it("moves each list, item value and item binding with its item, in one undo step", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a", tint: "#00ff00" }]);
        const layer = await session.styles.add({
            name: "Stripes",
            selector: { match: "everything" },
            set: {
                "node.stripeColors": "red green blue",
                "node.stripeSizes": "0.5 auto 0.2",
            },
            encode: { "node.stripeColors.2": { by: "data.tint" }, "node.stripeOpacities.0": { value: 0.4 } },
        });
        await session.styles.moveListItems(layer.id, [...LISTS], [2, 0, 1]);
        const moved = session.styles.get(layer.id);
        assert.equal(moved?.set?.["node.stripeColors"], "blue red green");
        assert.equal(moved?.set?.["node.stripeSizes"], "0.2 0.5");
        assert.deepEqual(moved?.encode?.["node.stripeOpacities.1" as never], { value: 0.4 });
        assert.isUndefined(moved?.encode?.["node.stripeOpacities.0" as never]);
        assert.deepEqual(moved?.encode?.["node.stripeColors.0" as never], { by: "data.tint" });
        assert.isUndefined(moved?.encode?.["node.stripeColors.2" as never]);

        await session.undo();
        assert.equal(session.styles.get(layer.id)?.set?.["node.stripeColors"], "red green blue");
    });

    it("removes an item left out of the order, with its values", async () => {
        const session = createGraphSession();
        const layer = await session.styles.add({
            name: "Stripes",
            selector: { match: "everything" },
            set: { "node.stripeColors": "red green blue" },
            encode: { "node.stripeSizes.1": { value: 0.3 } },
        });
        await session.styles.moveListItems(layer.id, [...LISTS], [0, 2]);
        const after = session.styles.get(layer.id);
        assert.equal(after?.set?.["node.stripeColors"], "red blue");
        assert.isUndefined(after?.encode?.["node.stripeSizes.1" as never]);
    });

    it("refuses a channel that is no list and an order that repeats an index", async () => {
        const session = createGraphSession();
        const layer = await session.styles.add({
            name: "L",
            selector: { match: "everything" },
            set: { "node.color": "red" },
        });
        for (const [channels, order, reason] of [
            [["node.color"], [0], "not-a-list"],
            [["node.stripeColors"], [0, 0], "bad-order"],
        ] as const) {
            try {
                await session.styles.moveListItems(layer.id, [...channels], [...order]);
                assert.fail("refused");
            } catch (error) {
                assert.isTrue(isGraphtyError(error) && error.details?.reason === reason, String(error));
            }
        }
    });
});
