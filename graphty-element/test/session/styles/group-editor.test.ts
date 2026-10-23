/**
 * @file What a group editor needs beyond `styles.groups` and `styles.setValueEntries`: folding the
 * small groups into Other in every property at once, a property bound later folding and hiding the
 * same groups, reading which group an element is in, and a colour that repeats past its palette
 * always differing in a second cue -- a node shape, an edge pattern -- even when the layer stores
 * only the colour.
 */

import { assert, describe, it } from "vitest";

import { OTHER_GROUP_COLOR } from "../../../src/config/palettes/categorical";
import { isGraphtyError } from "../../../src/errors";
import { createGraphSession, type GraphSession } from "../../../src/session";
import type { ElementSession } from "../../../src/session/types";

/** Group sizes: groups 0 to 3 hold 4, 3, 1 and 1 nodes. */
const SIZES = [4, 3, 1, 1];

/**
 * Nine nodes in four groups, under a layer that colors them by group and sets a shape by group.
 * @returns The session and the layer's id.
 */
async function grouped(): Promise<{ session: GraphSession; id: string }> {
    const session = createGraphSession();
    const groups = SIZES.flatMap((size, group) => Array.from({ length: size }, () => group));
    await session.data.addNodes(groups.map((group, at) => ({ id: `n${String(at)}`, group })));
    const layer = await session.styles.add({
        name: "Groups",
        target: "node",
        selector: { match: "has", path: "data.group" },
        encode: {
            "node.color": { by: "data.group", scale: "ordinal" },
            "node.shape": { by: "data.group", scale: "ordinal", otherwise: "box", map: { "0": "cone" } },
        },
    });
    await session.styles.settled();
    return { session, id: layer.id };
}

/**
 * The value one node is painted on one channel.
 * @param session - The session.
 * @param index - The node's index.
 * @param channel - The channel.
 * @returns The value.
 */
function painted(session: GraphSession, index: number, channel: "node.color" | "node.shape"): unknown {
    return (session as ElementSession).paint.styleOf("node", index)[channel];
}

describe("a group editor's element side", () => {
    it("counts each group among the layer's own elements, not the whole graph's", async () => {
        const session = createGraphSession();
        const groups = SIZES.flatMap((size, group) => Array.from({ length: size }, () => group));
        await session.data.addNodes(groups.map((group, at) => ({ id: `n${String(at)}`, group })));
        // n0 is in group 0 and n4 in group 1: the layer holds one node of each.
        const layer = await session.styles.add({
            name: "Two",
            target: "node",
            selector: { match: "ids", nodes: ["n0", "n4"] },
            encode: { "node.color": { by: "data.group", scale: "ordinal" } },
        });
        await session.styles.settled();
        assert.deepStrictEqual(
            session.styles.groups(layer.id, "data.group").map((group) => [group.value, group.count]),
            [
                [0, 1],
                [1, 1],
                [2, 0],
                [3, 0],
            ],
        );
        session.dispose();
    });

    it("folds the small groups into Other in every channel, lists them last, and unfolds them", async () => {
        const { session, id } = await grouped();
        await session.styles.setFoldBelow(id, "data.group", 2);
        await session.styles.settled();

        const groups = session.styles.groups(id, "data.group");
        assert.deepStrictEqual(
            groups.map((group) => [group.value, group.folded === true]),
            [
                [0, false],
                [1, false],
                [2, true],
                [3, true],
            ],
        );
        // Node 7 is in group 2: the Other grey, and the layer's one shape.
        const color = painted(session, 7, "node.color") as { hex?: string } | string;
        assert.strictEqual(
            (typeof color === "string" ? color : (color.hex ?? "")).slice(0, 7).toUpperCase(),
            OTHER_GROUP_COLOR.toUpperCase(),
        );
        assert.strictEqual(painted(session, 7, "node.shape"), "box");
        assert.strictEqual(painted(session, 0, "node.shape"), "cone", "a kept group keeps its entry");

        await session.styles.setFoldBelow(id, "data.group", undefined);
        await session.styles.settled();
        assert.isTrue(session.styles.groups(id, "data.group").every((group) => group.folded !== true));
        session.dispose();
    });

    it("refuses a threshold that is not a whole number of 1 or more", async () => {
        const { session, id } = await grouped();
        let reason: unknown;
        try {
            await session.styles.setFoldBelow(id, "data.group", 0.5);
        } catch (error) {
            reason = isGraphtyError(error) ? error.details?.reason : error;
        }
        assert.strictEqual(reason, "bad-threshold");
        session.dispose();
    });

    it("a property bound later folds and hides the same groups", async () => {
        const { session, id } = await grouped();
        await session.styles.setFoldBelow(id, "data.group", 2);
        await session.styles.setValueHidden(id, "node.color", 1, true);
        await session.styles.setValueEntries(id, "data.group", [{ channel: "node.size", value: 0, entry: 3 }]);
        await session.styles.settled();
        const size = session.styles.get(id)?.encode?.["node.size"];
        assert.isDefined(size);
        if (size !== undefined && "by" in size) {
            assert.strictEqual(size.other?.threshold, 2);
            assert.deepStrictEqual(size.hidden, [1]);
        }
        session.dispose();
    });

    it("answers the groups from the layer's last paint while its repaint is pending", async () => {
        const { session, id } = await grouped();
        const seen: number[] = [];
        // What a panel does: read the groups on every change the session announces.
        const read = (): void => {
            seen.push(session.styles.groups(id, "data.group").length);
        };
        const stops = (["style:changed", "project:changed", "history:changed"] as const).map((event) =>
            session.on(event, read),
        );
        // The editor has shown the groups before the edit.
        read();
        await session.styles.setValueEntries(id, "data.group", [{ channel: "node.size", value: 0, entry: 3 }]);
        read();
        await session.styles.settled();
        for (const stop of stops) {
            stop();
        }
        assert.isAbove(seen.length, 0, "the edit was announced");
        assert.isTrue(
            seen.every((count) => count === SIZES.length),
            `every read during the edit saw the groups: ${seen.join(",")}`,
        );
        session.dispose();
    });

    it("reads which group a node is in", async () => {
        const { session } = await grouped();
        assert.strictEqual(session.styles.valueAt({ node: "n5" }, "data.group"), 1);
        assert.isUndefined(session.styles.valueAt({ node: "n5" }, "data.nothing"));
        session.dispose();
    });

    it("draws repeated colors in other shapes when the layer stores only the color", async () => {
        const session = createGraphSession();
        await session.data.addNodes(Array.from({ length: 12 }, (_, at) => ({ id: `n${String(at)}`, group: at })));
        await session.styles.add({
            name: "Twelve",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.group", scale: "ordinal", palette: "okabe-ito", overflow: "shape" } },
        });
        await session.styles.settled();
        const element = session as ElementSession;
        const styles = Array.from({ length: 12 }, (_, at) => element.paint.styleOf("node", at));
        const key = (at: number): string =>
            `${JSON.stringify(styles[at]["node.color"])}|${String(styles[at]["node.shape"])}`;
        assert.strictEqual(new Set(styles.map((_, at) => key(at))).size, 12, "no two groups look the same");
        assert.strictEqual(new Set(styles.map((style) => style["node.shape"])).size, 2, "two shapes: one per cycle");
        session.dispose();
    });

    it("draws repeated edge colors in other patterns under overflow pattern, and refuses it on nodes", async () => {
        const session = createGraphSession();
        await session.data.addNodes(Array.from({ length: 13 }, (_, at) => ({ id: `n${String(at)}` })));
        await session.data.addEdges(
            Array.from({ length: 12 }, (_, at) => ({ source: "n0", target: `n${String(at + 1)}`, kind: at })),
        );
        await session.styles.add({
            name: "Kinds",
            target: "edge",
            selector: { match: "everything" },
            encode: { "edge.color": { by: "data.kind", scale: "ordinal", palette: "okabe-ito", overflow: "pattern" } },
        });
        await session.styles.settled();
        const element = session as ElementSession;
        const styles = Array.from({ length: 12 }, (_, at) => element.paint.styleOf("edge", at));
        const key = (at: number): string =>
            `${JSON.stringify(styles[at]["edge.color"])}|${String(styles[at]["edge.style"])}`;
        assert.strictEqual(new Set(styles.map((_, at) => key(at))).size, 12, "no two edge groups look the same");

        let code: unknown;
        try {
            await session.styles.add({
                name: "Bad",
                target: "node",
                selector: { match: "everything" },
                encode: { "node.color": { by: "data.id", scale: "ordinal", overflow: "pattern" } },
            });
        } catch (error) {
            code = isGraphtyError(error) ? error.code : error;
        }
        assert.strictEqual(code, "E_BAD_LAYER");
        session.dispose();
    });
});
