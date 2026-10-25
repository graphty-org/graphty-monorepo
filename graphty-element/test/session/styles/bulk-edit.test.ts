/**
 * @file Editing many style layers at once: what some rows reach through their folders
 * (`styles.layersUnder`), and writing many layers as one undo step and one repaint
 * (`styles.updateMany`).
 */

import { assert, describe, it } from "vitest";

import type { LayerId, NodeId } from "../../../src/catalog/types";
import type { StyleChange } from "../../../src/session/styles";
import type { GraphSession } from "../../../src/session/types";
import { makeSession } from "../helpers";

/**
 * A session of twelve nodes, each with its own layer coloring it.
 * @returns The session and the layers, bottom first.
 */
async function twelve(): Promise<{ session: GraphSession; ids: LayerId[] }> {
    const harness = makeSession();
    harness.add(Array.from({ length: 12 }, (_, at) => ({ id: `n${String(at)}`, group: at })));
    const { session } = harness;
    const ids: LayerId[] = [];
    for (let at = 0; at < 12; at++) {
        const layer = await session.styles.add({
            name: `Group ${String(at)}`,
            target: "node",
            selector: { match: "ids", nodes: [`n${String(at)}` as NodeId] },
            set: { "node.color": "#d55e00" },
        });
        ids.push(layer.id);
    }
    await session.styles.settled();
    return { session, ids };
}

/**
 * The hex a node is painted.
 * @param session - The session.
 * @param node - The node.
 * @returns The hex.
 */
function colorOf(session: GraphSession, node: string): string | undefined {
    return (session.styles.explain({ node: node as NodeId }).merged["node.color"] as { hex?: string } | undefined)?.hex;
}

describe("the layers some rows reach", () => {
    it("walks nested folders once each, and carries a folder's hidden and lock down to its layers", async () => {
        const { session, ids } = await twelve();
        const { styles } = session;
        const outer = await styles.addFolder("Louvain");
        const inner = await styles.addFolder("Fantine's", { parent: outer.id });
        for (const id of ids.slice(0, 4)) {
            await styles.moveRow(id, { parent: outer.id });
        }
        for (const id of ids.slice(4, 6)) {
            await styles.moveRow(id, { parent: inner.id });
        }
        await styles.hideRow(inner.id, true);
        await styles.lockRow(ids[0], true);
        await styles.update(ids[1], { encode: { "node.size": { value: 2 } } });

        // The folder, and one of its layers named again: reached once.
        const reach = styles.layersUnder([outer.id, ids[2]]);

        assert.lengthOf(reach, 6);
        assert.sameMembers(
            reach.map((row) => row.row),
            ids.slice(0, 6),
        );
        assert.deepEqual(
            reach.filter((row) => row.hidden).map((row) => row.row),
            [ids[4], ids[5]],
        );
        assert.deepEqual(
            reach.filter((row) => row.locked).map((row) => row.row),
            [ids[0]],
        );
        assert.sameMembers([...(reach.find((row) => row.row === ids[1])?.sets ?? [])], ["node.color", "node.size"]);
        assert.deepEqual(reach.find((row) => row.row === ids[2])?.layers, [ids[2]]);
    });

    it("lists the layers in paint order, bottom first", async () => {
        const { session, ids } = await twelve();

        const reach = session.styles.layersUnder([ids[5], ids[1], ids[3]]);

        assert.deepEqual(
            reach.map((row) => row.row),
            [ids[1], ids[3], ids[5]],
        );
    });

    it("reports a row inside a locked folder as locked", async () => {
        const { session, ids } = await twelve();
        const folder = await session.styles.addFolder("Locked");
        await session.styles.moveRow(ids[0], { parent: folder.id });
        await session.styles.lockRow(folder.id, true);

        assert.isTrue(session.styles.layersUnder([ids[0]])[0].locked);
    });

    it("refuses a row the tree does not hold", async () => {
        const { session } = await twelve();

        assert.throws(() => session.styles.layersUnder(["no-such-row"]), /no style row/);
    });
});

describe("writing many layers at once", () => {
    it("writes twelve layers as one undo step and one repaint, and one undo restores all twelve", async () => {
        const { session, ids } = await twelve();
        const steps = session.history.steps.length;
        const seen: StyleChange[] = [];
        const stop = session.on("style:changed", (change) => {
            seen.push(change);
        });

        const result = await session.styles.updateMany(
            ids.map((id) => ({ id, patch: { set: { "node.color": "#0072b2" } } })),
        );
        await session.styles.settled();
        stop();

        assert.lengthOf(result.updated, 12);
        assert.lengthOf(result.skipped, 0);
        assert.strictEqual(session.history.steps.length, steps + 1, "one undo step");
        // Each edit's change carries the report of the pass that drew it: one object, one pass.
        assert.strictEqual(new Set(seen.map((change) => change.painted)).size, 1, "one repaint pass");
        // One event for the one edit, naming all twelve layers: not twelve, which made every
        // listener that re-reads the stack do it once per layer.
        assert.lengthOf(seen, 1, "one style:changed event");
        assert.sameMembers([...seen[0].layers], ids);
        assert.strictEqual(colorOf(session, "n0"), "#0072b2");
        assert.strictEqual(colorOf(session, "n11"), "#0072b2");

        await session.undo();
        await session.styles.settled();

        for (let at = 0; at < 12; at++) {
            assert.strictEqual(colorOf(session, `n${String(at)}`), "#d55e00");
        }
    });

    it("skips a locked layer, reports it, and writes the rest", async () => {
        const { session, ids } = await twelve();
        await session.styles.lockRow(ids[3], true);

        const result = await session.styles.updateMany(
            ids.slice(0, 5).map((id) => ({ id, patch: { set: { "node.color": "#009e73" } } })),
        );
        await session.styles.settled();

        assert.deepEqual(result.skipped, [{ id: ids[3], code: "E_LOCKED" }]);
        assert.deepEqual(
            result.updated.map((layer) => layer.id),
            [ids[0], ids[1], ids[2], ids[4]],
        );
        assert.strictEqual(colorOf(session, "n3"), "#d55e00");
        assert.strictEqual(colorOf(session, "n4"), "#009e73");
    });

    it("writes nothing when one patch is refused", async () => {
        const { session, ids } = await twelve();

        let refused: unknown;
        try {
            await session.styles.updateMany([
                { id: ids[0], patch: { set: { "node.color": "#009e73" } } },
                { id: "no-such-layer", patch: { set: { "node.color": "#009e73" } } },
            ]);
        } catch (error) {
            refused = error;
        }
        await session.styles.settled();

        assert.match(String(refused), /no style layer/);
        assert.strictEqual(colorOf(session, "n0"), "#d55e00");
    });
});
