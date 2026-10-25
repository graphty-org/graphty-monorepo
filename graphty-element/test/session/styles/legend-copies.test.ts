/**
 * @file The legend lists a binding copied into several layers once, naming every layer it came
 * from and the categories those layers meet; copies that differ only in their value tables still
 * fold, each category painted as its own copy paints it; a copy that differs otherwise keeps a
 * block of its own.
 */

import { assert, describe, it } from "vitest";

import type { Binding } from "../../../src/catalog/types";
import { createGraphSession } from "../../../src/session";

/** Eight departments, two nodes each. */
const DEPTS = ["a", "b", "c", "d", "e", "f", "g", "h"];

describe("copies of one binding in the legend", () => {
    it("lists eight copies as one block naming the eight layers, and a changed entry in its copy's row", async () => {
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
        assert.sameMembers(
            blocks[0].swatches.map((swatch) => swatch.value),
            DEPTS,
        );

        await s.styles.setValueEntry(ids[7], "node.color", "h", "#000000");
        await s.styles.settled();

        const after = s.styles.legend().filter((block) => block.channel === "node.color");
        assert.lengthOf(after, 1, "a copy that differs only in its value table is still a copy");
        assert.deepEqual(after[0].layers, ids);
        assert.strictEqual(after[0].swatches.find((swatch) => swatch.value === "h")?.color, "#000000");

        await s.styles.update(ids[7], { encode: { "node.color": { by: "data.dept", scale: "ordinal" } } });
        await s.styles.settled();
        const apart = s.styles.legend().filter((block) => block.channel === "node.color");
        assert.lengthOf(apart, 2, "another palette is another binding");
        assert.deepEqual(apart[0].layers, ids.slice(0, 7));
        assert.isUndefined(apart[1].layers, "a block of one layer");
        assert.strictEqual(apart[1].layerId, ids[7]);
    });

    it("lists only the categories the shown copies meet", async () => {
        const s = createGraphSession();
        await s.data.addNodes(DEPTS.map((dept) => ({ id: dept, dept })));
        const ids: string[] = [];
        for (const dept of DEPTS.slice(0, 3)) {
            const layer = await s.styles.add({
                name: `Dept ${dept}`,
                target: "node",
                selector: { match: "rule", where: { kind: "categories", attribute: "data.dept", values: [dept] } },
                encode: { "node.color": { by: "data.dept", scale: "ordinal", palette: "okabe-ito" } },
            });
            ids.push(layer.id);
        }
        await s.styles.update(ids[1], { enabled: false });
        await s.styles.settled();

        const [block] = s.styles.legend().filter((each) => each.channel === "node.color");
        assert.deepEqual(block.layers, [ids[0], ids[2]]);
        assert.sameMembers(
            block.swatches.map((swatch) => swatch.value),
            ["a", "c"],
            "not the hidden copy's b, nor the five departments no copy selects",
        );
    });

    it("speaks for the copy shown on the most elements, not the first, so its range is the one drawn", async () => {
        const s = createGraphSession();
        await s.data.addNodes([
            { id: "s01", donations: 10 },
            { id: "s02", donations: 250000 },
            { id: "s03", donations: 5000 },
        ]);
        const size: Binding = { by: "data.donations", scale: "linear", range: [1, 3] };
        const one = await s.styles.add({
            name: "s01",
            target: "node",
            selector: { match: "ids", nodes: ["s01"], edges: [] },
            encode: { "node.size": size },
        });
        const all = await s.styles.add({
            name: "donations",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.size": size },
        });
        await s.styles.settled();

        const [block] = s.styles.legend().filter((each) => each.channel === "node.size");
        assert.deepEqual(block.layers, [one.id, all.id]);
        assert.strictEqual(block.layerId, all.id, "the layer that paints every node, not the one painted over");
        assert.deepEqual(block.domain && [block.domain.min, block.domain.max], [10, 250000]);
        assert.deepEqual(
            [block.swatches.at(0)?.value, block.swatches.at(-1)?.value],
            [10, 250000],
            "the ramp keeps its end values",
        );
    });
});
