/**
 * @file A legend block says how many elements its layer selects when it selects some and not
 * all (`scope`), and a row whose every element shows another layer's paint names that layer
 * (`paintedOverBy`), so a key never claims more than it paints.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";

const NODES = [
    { id: "a", kind: "agency" },
    { id: "b", kind: "agency" },
    { id: "c", kind: "donor" },
    { id: "d", kind: "donor" },
    { id: "e", kind: "family" },
];

describe("what a legend block reaches", () => {
    it("gives a hand-picked layer's count of all, and none for a layer of every node", async () => {
        const s = createGraphSession();
        await s.data.addNodes(NODES);
        const all = await s.styles.add({
            name: "All",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#00ff00" },
        });
        const picked = await s.styles.add({
            name: "Picked",
            target: "node",
            selector: { match: "ids", nodes: ["a", "c", "e"] },
            encode: { "node.size": { by: "data.kind", scale: "ordinal", range: [1, 3] } },
        });
        await s.styles.settled();

        const blocks = s.styles.legend();
        assert.isUndefined(blocks.find((block) => block.layerId === all.id)?.scope);
        assert.deepEqual(blocks.find((block) => block.layerId === picked.id)?.scope, { count: 3, of: 5 });
    });

    it("counts only the elements drawn once a filter step hides some", async () => {
        const s = createGraphSession();
        await s.data.addNodes(NODES);
        const picked = await s.styles.add({
            name: "Picked",
            target: "node",
            selector: { match: "ids", nodes: ["a", "c", "e"] },
            set: { "node.color": "#ff0000" },
        });
        const agencies = await s.styles.add({
            name: "Agencies",
            target: "node",
            selector: { match: "ids", nodes: ["a", "b"] },
            set: { "node.shape": "box" },
        });
        await s.visibility.set({ kind: "member", of: { nodes: ["c", "d", "e"] } });
        await s.styles.settled();

        const blocks = s.styles.legend();
        assert.deepEqual(
            blocks.find((block) => block.layerId === picked.id)?.scope,
            { count: 2, of: 5 },
            "a, the one picked node hidden, is not counted",
        );
        assert.deepEqual(
            blocks.find((block) => block.layerId === agencies.id)?.scope,
            { count: 0, of: 5 },
            "a layer whose every node is hidden counts none",
        );
    });

    it("marks a category every carrier of which a layer above paints over, and only that one", async () => {
        const s = createGraphSession();
        await s.data.addNodes(NODES);
        const kind = await s.styles.add({
            name: "Kind",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.kind", scale: "ordinal", palette: "okabe-ito" } },
        });
        const agencies = await s.styles.add({
            name: "Agencies",
            target: "node",
            selector: { match: "ids", nodes: ["a", "b", "c"] },
            set: { "node.color": "#ff0000" },
        });
        await s.styles.settled();

        const block = s.styles.legend().find((each) => each.layerId === kind.id);
        const row = (value: string) => block?.swatches.find((swatch) => swatch.value === value);
        assert.strictEqual(row("agency")?.paintedOverBy, agencies.id, "both agencies are drawn red");
        assert.isUndefined(row("donor")?.paintedOverBy, "one donor still shows the kind color");
        assert.isUndefined(row("family")?.paintedOverBy);
    });
});
