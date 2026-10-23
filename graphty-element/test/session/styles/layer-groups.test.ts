/**
 * @file `styles.layerGroups(ids, binding, { channel })`: several layers read as the groups of one
 * binding across them -- the same fields `styles.groups` gives a data value's groups, so one group
 * editor lists both.
 */

import { assert, describe, it } from "vitest";

import type { LayerId, NodeId } from "../../../src/catalog/types";
import type { GraphSession } from "../../../src/session/types";
import { makeSession } from "../helpers";

/**
 * A session of four nodes, each with its own layer named "Layer <i>", and a fifth layer over two.
 * @returns The session and the layers, bottom first.
 */
async function four(): Promise<{ session: GraphSession; ids: LayerId[] }> {
    const harness = makeSession();
    harness.add(Array.from({ length: 4 }, (_, at) => ({ id: `n${String(at)}` })));
    const { session } = harness;
    const ids: LayerId[] = [];
    for (let at = 0; at < 4; at++) {
        const layer = await session.styles.add({
            name: `Layer ${String(at)}`,
            target: "node",
            selector: { match: "ids", nodes: [`n${String(at)}` as NodeId] },
            set: { "node.color": "#d55e00" },
        });
        ids.push(layer.id);
    }
    const pair = await session.styles.add({
        name: "Pair",
        target: "node",
        selector: { match: "ids", nodes: ["n0", "n1"] as NodeId[] },
        set: { "node.size": 2 },
    });
    ids.push(pair.id);
    await session.styles.settled();
    return { session, ids };
}

describe("styles.layerGroups", () => {
    it("gives one group per layer, top first, with its name, count and the sequence's paint", async () => {
        const { session, ids } = await four();
        const groups = session.styles.layerGroups(ids, { palette: "okabe-ito" }, { channel: "node.color" });
        const seq = session.styles.sequence({ palette: "okabe-ito" }, { channel: "node.color", count: ids.length });

        assert.deepEqual(
            groups.map((g) => g.value),
            [...ids].reverse(),
        );
        assert.deepEqual(
            groups.map((g) => g.name),
            ["Pair", "Layer 3", "Layer 2", "Layer 1", "Layer 0"],
        );
        assert.deepEqual(
            groups.map((g) => g.count),
            [2, 1, 1, 1, 1],
        );
        assert.deepEqual(
            groups.map((g) => g.paints["node.color"]),
            [...seq.values],
        );
        assert.isTrue(groups.every((g) => !g.hidden && Object.keys(g.entries).length === 0));
    });

    it("takes a map entry keyed by layer id as that layer's own value", async () => {
        const { session, ids } = await four();
        const [, , chosen] = ids;
        const groups = session.styles.layerGroups(
            ids,
            { choices: ["box", "sphere", "cylinder", "cone", "torus"], map: { [chosen]: "cone" } },
            { channel: "node.shape" },
        );
        const row = groups.find((g) => g.value === chosen);
        assert.strictEqual(row?.entries["node.shape"], "cone");
        assert.strictEqual(row?.paints["node.shape"], "cone");
        assert.isUndefined(groups.find((g) => g.value !== chosen)?.entries["node.shape"]);
    });

    it("spreads a number over the range and reports a hidden row", async () => {
        const { session, ids } = await four();
        await session.styles.hideRow(ids[0], true);
        const groups = session.styles.layerGroups(ids.slice(0, 3), { range: [1, 3] }, { channel: "node.size" });
        assert.deepEqual(
            groups.map((g) => g.paints["node.size"]),
            [1, 2, 3],
        );
        assert.isTrue(groups.at(-1)?.hidden);
        assert.strictEqual(groups.at(-1)?.row, ids[0]);
    });

    it("refuses an id the stack does not hold", async () => {
        const { session } = await four();
        assert.throws(() => session.styles.layerGroups(["nope"], {}, { channel: "node.color" }), /nope/);
    });
});
