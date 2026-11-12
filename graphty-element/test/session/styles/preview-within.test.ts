/**
 * @file `styles.preview(binding, { within })`: what a binding would paint written into one layer --
 * the bins counted over that layer's elements, the scale and its colors still the whole graph's.
 */

import { assert, describe, it } from "vitest";

import type { NodeId } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";

/** Nine nodes in three departments. */
const DEPT: Readonly<Record<string, string>> = {
    a: "x",
    b: "x",
    c: "x",
    d: "y",
    e: "y",
    f: "y",
    g: "z",
    h: "z",
    i: "z",
};

/**
 * A session over the nine nodes.
 * @returns The session.
 */
async function session(): Promise<GraphSession> {
    const s = createGraphSession();
    await s.data.addNodes(Object.entries(DEPT).map(([id, dept]) => ({ id, dept })));
    return s;
}

/** Color by department. */
const BY_DEPT = { by: "data.dept", scale: "ordinal" } as const;

describe("a binding's preview within one layer", () => {
    it("counts one bin, with the color the whole graph's preview gives that value, inside a layer of one value", async () => {
        const s = await session();
        const y = await s.styles.add({
            name: "Dept y",
            target: "node",
            selector: { match: "rule", where: { kind: "categories", attribute: "data.dept", values: ["y"] } },
            set: { "node.size": 2 },
        });

        const whole = s.styles.preview(BY_DEPT, { channel: "node.color" });
        const within = s.styles.preview(BY_DEPT, { channel: "node.color", within: y.id });

        const counted = within.bins.filter((bin) => bin.count > 0);
        assert.lengthOf(counted, 1);
        assert.strictEqual(counted[0].value, "y");
        assert.strictEqual(counted[0].count, 3);
        assert.deepEqual(counted[0].paints, whole.bins.find((bin) => bin.value === "y")?.paints);
    });

    it("counts several bins inside a hand-made layer across values", async () => {
        const s = await session();
        const hubs = await s.styles.add({
            name: "Hubs",
            target: "node",
            selector: { match: "ids", nodes: ["a", "d", "g"] as NodeId[] },
            set: { "node.size": 2 },
        });

        const within = s.styles.preview(BY_DEPT, { channel: "node.color", within: hubs.id });

        assert.deepEqual(
            within.bins.filter((bin) => bin.count > 0).map((bin) => bin.count),
            [1, 1, 1],
        );
    });

    it("refuses a layer the stack does not hold", async () => {
        const s = await session();

        assert.throws(
            () => s.styles.preview(BY_DEPT, { channel: "node.color", within: "no-such-layer" }),
            /no style layer/,
        );
    });
});
