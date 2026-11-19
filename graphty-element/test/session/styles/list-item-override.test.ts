/**
 * @file A higher layer changes one item of a list a lower layer resolves, by the item's address,
 * and nothing else of the list. An index past the list's end changes nothing and says so, as a
 * `W_LIST_ITEM_PAST_END` note on the element's explanation.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { listItemAddress, parseListItemAddress } from "../../../src/session/styles/channels";

/**
 * The pie colors node a is drawn with.
 * @param session - The session.
 * @returns The colors, as the canvas draws them.
 */
function pieOf(session: GraphSession): unknown {
    return session.styles.explain({ node: "a" }).merged["node.pieColors"];
}

describe("one list item, overridden from above", () => {
    it("changes only that item of the list beneath", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        await session.styles.add({
            name: "Pie",
            target: "node",
            selector: { match: "everything" },
            set: { "node.pieColors": "#111111 #222222 #333333" },
        });
        await session.styles.add({
            name: "Slice",
            target: "node",
            selector: { match: "everything" },
            encode: { [listItemAddress("node.pieColors", 1)]: { value: "#ff0000" } },
        });
        await session.styles.settled();
        assert.strictEqual(pieOf(session), "#111111 #ff0000 #333333");
        assert.isUndefined(session.styles.explain({ node: "a" }).notes, "an item inside the list notes nothing");
        session.dispose();
    });

    it("changes nothing for an index past the list's end, or over no list, and notes it", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const over = await session.styles.add({
            name: "Slice",
            target: "node",
            selector: { match: "everything" },
            encode: { [listItemAddress("node.pieColors", 5)]: { value: "#ff0000" } },
        });
        await session.styles.settled();
        assert.isUndefined(pieOf(session), "over no list there is nothing to change");
        assert.deepStrictEqual(session.styles.explain({ node: "a" }).notes, [
            {
                code: "W_LIST_ITEM_PAST_END",
                params: { channel: "node.pieColors", index: 5, length: 0, layerId: over.id },
            },
        ]);
        await session.styles.add(
            {
                name: "Pie",
                target: "node",
                selector: { match: "everything" },
                set: { "node.pieColors": "#111111 #222222" },
            },
            { below: over.id },
        );
        await session.styles.settled();
        assert.strictEqual(pieOf(session), "#111111 #222222");
        assert.deepStrictEqual(session.styles.explain({ node: "a" }).notes, [
            {
                code: "W_LIST_ITEM_PAST_END",
                params: { channel: "node.pieColors", index: 5, length: 2, layerId: over.id },
            },
        ]);
        session.dispose();
    });

    it("refuses an item value the list does not hold", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const added = session.styles.add({
            name: "Bad",
            target: "node",
            selector: { match: "everything" },
            encode: { [listItemAddress("node.pieSizes", 0)]: { value: "#ff0000" } },
        });
        const refused = await added.then(
            () => undefined,
            (error: unknown) => error as { code?: string },
        );
        assert.strictEqual(refused?.code, "E_BAD_LAYER");
        session.dispose();
    });

    it("round-trips its address, only on a list channel", () => {
        assert.deepStrictEqual(parseListItemAddress(listItemAddress("node.stripeColors", 2)), {
            channel: "node.stripeColors",
            index: 2,
        });
        assert.isNull(parseListItemAddress("node.color.1"));
        assert.isNull(parseListItemAddress("node.pieColors"));
    });
});
