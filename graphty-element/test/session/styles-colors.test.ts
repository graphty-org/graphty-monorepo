/**
 * @file The fixed colors a set of style rows writes (`styles.colors`), replacing one of them in
 * exactly those rows as one undo step (`styles.replaceColor`), and the off value an effect
 * channel takes (`ChannelDescriptor.off`).
 */

import { assert, describe, it } from "vitest";

import type { LayerId, NodeId } from "../../src/catalog/types";
import { isGraphtyError } from "../../src/errors";
import { createGraphSession, type GraphSession } from "../../src/session";
import { CHANNEL_DESCRIPTORS } from "../../src/session/styles/channels";

/**
 * A session with five nodes, a and b in group "x", c in "x", d and e in "y".
 * @returns The session and the ids of three layers: two in the rows asked about, one outside.
 */
async function painted(): Promise<{ session: GraphSession; first: LayerId; second: LayerId; outside: LayerId }> {
    const session = createGraphSession();
    await session.data.addNodes([
        { id: "a", group: "x" },
        { id: "b", group: "x" },
        { id: "c", group: "x" },
        { id: "d", group: "y" },
        { id: "e", group: "y" },
    ]);
    const { styles } = session;
    const first = await styles.add({
        name: "Fixed",
        target: "node",
        selector: { match: "ids", nodes: ["a"] },
        set: { "node.color": "#d55e00" },
    });
    const second = await styles.add({
        name: "Groups",
        target: "node",
        selector: { match: "ids", nodes: ["c", "d"] },
        encode: { "node.color": { by: "data.group", map: { x: "#D55E00", y: "#0072b2" } } },
    });
    const outside = await styles.add({
        name: "Outside",
        target: "node",
        selector: { match: "ids", nodes: ["e"] },
        set: { "node.color": "#d55e00" },
    });
    await styles.settled();

    return { session, first: first.id, second: second.id, outside: outside.id };
}

/**
 * The color a node is painted, as its hex.
 * @param session - The session.
 * @param node - The node.
 * @returns The hex, or undefined when nothing painted it.
 */
function colorOf(session: GraphSession, node: string): string | undefined {
    const value = session.styles.explain({ node: node as NodeId }).merged["node.color"] as { hex?: string } | undefined;

    return value?.hex;
}

describe("the colors some rows write", () => {
    it("lists #d55e00 and #D55E00 from two rows as one color naming both, and leaves out a row not asked about", async () => {
        const { session, first, second, outside } = await painted();

        const colors = session.styles.colors([first, second]);

        assert.deepEqual(
            colors.map((entry) => entry.color),
            ["#d55e00", "#0072b2"],
        );
        assert.deepEqual(colors[0].writes, [
            { layer: first, channel: "node.color" },
            { layer: second, channel: "node.color", value: "x" },
        ]);
        assert.notInclude(
            colors.flatMap((entry) => entry.writes.map((write) => write.layer)),
            outside,
        );
    });

    it("reaches every layer in a folder", async () => {
        const { session, first, second } = await painted();
        const folder = await session.styles.addFolder("Both");
        await session.styles.moveRow(first, { parent: folder.id });
        await session.styles.moveRow(second, { parent: folder.id });

        const colors = session.styles.colors([folder.id]);

        assert.lengthOf(colors[0].writes, 2);
    });

    it("refuses a row the tree does not hold", async () => {
        const { session } = await painted();

        assert.throws(() => session.styles.colors(["no-such-row"]), /no style row/);
    });
});

describe("replacing a color in some rows", () => {
    it("repaints both rows' elements, keeps a row outside the ids, and one undo restores both", async () => {
        const { session, first, second } = await painted();

        const changed = await session.styles.replaceColor([first, second], "#D55E00", "#009e73");
        await session.styles.settled();

        assert.deepEqual(
            changed.map((layer) => layer.id),
            [first, second],
        );
        assert.strictEqual(colorOf(session, "a"), "#009e73", "the fixed value");
        assert.strictEqual(colorOf(session, "c"), "#009e73", "the value-table entry");
        assert.strictEqual(colorOf(session, "d"), "#0072b2", "another entry of the same table");
        assert.strictEqual(colorOf(session, "e"), "#d55e00", "a row outside the ids");

        await session.undo();
        await session.styles.settled();

        assert.strictEqual(colorOf(session, "a"), "#d55e00");
        assert.strictEqual(colorOf(session, "c"), "#d55e00");
        const binding = session.styles.get(second)?.encode?.["node.color"];
        assert.deepEqual(binding !== undefined && "by" in binding ? binding.map : undefined, {
            x: "#D55E00",
            y: "#0072b2",
        });
    });

    it("leaves a layer the reader locked as it is", async () => {
        const { session, first, second } = await painted();
        await session.styles.lockRow(first, true);

        const changed = await session.styles.replaceColor([first, second], "#d55e00", "#009e73");
        await session.styles.settled();

        assert.deepEqual(
            changed.map((layer) => layer.id),
            [second],
        );
        assert.strictEqual(colorOf(session, "a"), "#d55e00");
    });

    it("refuses a replacement that is not a color", async () => {
        const { session, first } = await painted();

        try {
            await session.styles.replaceColor([first], "#d55e00", "not a color");
            assert.fail("the replacement was accepted");
        } catch (error) {
            assert.isTrue(isGraphtyError(error) && error.code === "E_BAD_COMMAND");
        }
    });
});

describe("an effect written off", () => {
    it("names the off value of the outline, the glow and the animation", () => {
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.outline"].off, "none");
        assert.strictEqual(CHANNEL_DESCRIPTORS["node.glow"].off, "none");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.animationSpeed"].off, 0);
        assert.isUndefined(CHANNEL_DESCRIPTORS["node.color"].off);
    });

    it("covers a glow a layer beneath writes, and is refused on a channel with no off value", async () => {
        const { session } = await painted();
        const { styles } = session;
        await styles.add({
            name: "Glow",
            target: "node",
            selector: { match: "everything" },
            set: { "node.glow": "#ff00ff" },
        });
        await styles.add({
            name: "No glow",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: { "node.glow": "none" },
        });
        await styles.settled();

        const glowOf = (node: string): unknown =>
            (styles.explain({ node: node as NodeId }).merged["node.glow"] as { hex?: string } | undefined)?.hex;
        assert.strictEqual(glowOf("a"), "none");
        assert.strictEqual(glowOf("b"), "#ff00ff");

        assert.isFalse(
            styles.validate({
                name: "No color",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "none" },
            }).ok,
        );
    });
});

describe("a color that follows another", () => {
    it("names the edge color as what an arrowhead's color takes while no layer sets it", () => {
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowHeadColor"].follows, "edge.color");
        assert.strictEqual(CHANNEL_DESCRIPTORS["edge.arrowTailColor"].follows, "edge.color");
        assert.isUndefined(CHANNEL_DESCRIPTORS["edge.color"].follows);
    });
});
