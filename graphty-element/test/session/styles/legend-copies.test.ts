/**
 * @file The legend lists a binding copied into several layers once, naming every layer it came
 * from; a copy that differs keeps a block of its own.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";

/** Eight departments, two nodes each. */
const DEPTS = ["a", "b", "c", "d", "e", "f", "g", "h"];

describe("copies of one binding in the legend", () => {
    it("lists eight copies as one block naming the eight layers, and a changed copy on its own", async () => {
        const s = createGraphSession();
        await s.data.addNodes(
            DEPTS.flatMap((dept) => [
                { id: `${dept}1`, dept },
                { id: `${dept}2`, dept },
            ]),
        );
        const ids: string[] = [];
        for (const dept of DEPTS) {
            const layer = await s.styles.add({
                name: `Dept ${dept}`,
                target: "node",
                selector: { match: "rule", where: { kind: "categories", attribute: "data.dept", values: [dept] } },
                encode: { "node.color": { by: "data.dept", scale: "ordinal", palette: "okabe-ito" } },
            });
            ids.push(layer.id);
        }
        await s.styles.settled();

        const blocks = s.styles.legend().filter((block) => block.channel === "node.color");
        assert.lengthOf(blocks, 1);
        assert.deepEqual(blocks[0].layers, ids);

        await s.styles.setValueEntry(ids[7], "node.color", "h", "#000000");
        await s.styles.settled();

        const after = s.styles.legend().filter((block) => block.channel === "node.color");
        assert.lengthOf(after, 2);
        assert.deepEqual(after[0].layers, ids.slice(0, 7));
        assert.isUndefined(after[1].layers, "a block of one layer");
        assert.strictEqual(after[1].layerId, ids[7]);
    });
});
