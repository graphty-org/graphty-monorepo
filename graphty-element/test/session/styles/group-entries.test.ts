/**
 * @file `styles.groups` and `styles.setValueEntries`: a group editor reads every channel a layer
 * paints a group with in one call, and writes several groups and channels in one undo step. A
 * channel the layer did not vary yet is bound to the groups, every other group keeping the one
 * value the layer painted before.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import { createGraphSession, type GraphSession } from "../../../src/session";
import type { ElementSession } from "../../../src/session/types";

/**
 * Four nodes in groups 0 to 3, under a layer that colors them by group and draws every one a box.
 * @returns The session and the layer's id.
 */
async function grouped(): Promise<{ session: GraphSession; id: string }> {
    const session = createGraphSession();
    await session.data.addNodes([0, 0, 1, 2].map((group, at) => ({ id: `n${String(at)}`, group })));
    const layer = await session.styles.add({
        name: "Groups",
        target: "node",
        selector: { match: "has", path: "data.group" },
        set: { "node.shape": "box" },
        encode: { "node.color": { by: "data.group", scale: "ordinal" } },
    });
    await session.styles.settled();

    return { session, id: layer.id };
}

describe("a layer's groups", () => {
    it("are read with every channel's entry, and written several at once in one step", async () => {
        const { session, id } = await grouped();
        assert.deepStrictEqual(
            session.styles.groups(id, "data.group").map((group) => [group.value, group.count]),
            [
                [0, 2],
                [1, 1],
                [2, 1],
            ],
        );

        await session.styles.setValueEntries(id, "data.group", [
            { channel: "node.shape", value: 1, entry: "sphere" },
            { channel: "node.shape", value: 2, entry: "cone" },
            { channel: "node.color", value: 1, entry: "#ff0000" },
        ]);
        await session.styles.settled();

        const groups = session.styles.groups(id, "data.group");
        assert.deepStrictEqual(groups.find((group) => group.value === 1)?.entries, {
            "node.color": "#ff0000",
            "node.shape": "sphere",
        });
        assert.deepStrictEqual(groups.find((group) => group.value === 0)?.entries, {});

        const element = session as ElementSession;
        const shapes = [0, 1, 2, 3].map((index) => element.paint.styleOf("node", index)["node.shape"]);
        assert.deepStrictEqual(shapes, ["box", "box", "sphere", "cone"], "group 0 keeps the layer's one shape");
        assert.isUndefined(session.styles.get(id)?.set?.["node.shape"], "the one shape moved into the binding");

        await session.undo();
        await session.styles.settled();
        assert.strictEqual(session.styles.get(id)?.set?.["node.shape"], "box", "one undo takes every write back");
        session.dispose();
    });

    it("refuses to replace a channel that varies by another path", async () => {
        const { session, id } = await grouped();
        let reason: unknown;
        try {
            await session.styles.setValueEntries(id, "data.other", [
                { channel: "node.color", value: 1, entry: "#ff0000" },
            ]);
        } catch (error) {
            reason = isGraphtyError(error) ? error.details?.reason : error;
        }
        assert.strictEqual(reason, "bound-to-other-path");
        session.dispose();
    });
});
