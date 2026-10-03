/**
 * @file The quick start of the "Neighbors" guide (`docs/guide/neighbors.md`), kept here so the
 * documented code keeps working. The guide reaches the same session as `element.session`.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

describe("the neighbors guide's example", () => {
    it("lists Javert's neighbors, strongest tie first", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "Javert" }, { id: "Valjean" }, { id: "Cosette" }]);
        await session.data.addEdges([
            { source: "Javert", target: "Valjean", "shared chapters": 10 },
            { source: "Valjean", target: "Javert", "shared chapters": 7 },
            { source: "Javert", target: "Cosette", "shared chapters": 2 },
        ]);

        // Javert's neighbors, strongest tie first
        const page = session.data.neighbors("Javert", { weight: "shared chapters" });
        const lines = page.records.map((row) => `${String(row.node.id)}, ${String(row.tie)} shared chapters`);

        assert.deepStrictEqual(lines, ["Valjean, 17 shared chapters", "Cosette, 2 shared chapters"]);
        assert.strictEqual(page.total, 2);
        session.dispose();
    });
});
