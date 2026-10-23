import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

// No edge ids in the file, so each tie is named by its ends and its place among its pair's ties.
const TIES = "source,target\nAva,Ben\nBen,Chloe\nChloe,Ava\nChloe,Dev\nBen,Dev\nEli,Dev\n";

describe("a replacing load of the same file", () => {
    it("keeps a layer of hand-picked edges on the same edges", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: TIES } });
        const picked = session.data
            .edges()
            .filter((edge) => edge.target === "Dev")
            .map((edge) => edge.id);
        assert.lengthOf(picked, 3);
        const layer = await session.styles.add({
            name: "3 edges",
            target: "edge",
            selector: { match: "ids", edges: picked },
            set: { "edge.width": 24 },
        });
        assert.strictEqual(session.styles.counts(layer.id).matched, 3);

        await session.data.import({ type: "csv", config: { data: TIES } });

        assert.strictEqual(session.styles.counts(layer.id).matched, 3);
        const now = session.data.edges().filter((edge) => edge.target === "Dev");
        const selector = session.styles.get(layer.id)?.selector;
        assert.deepEqual(selector, { match: "ids", edges: now.map((edge) => edge.id) });

        await session.undo();
        assert.deepEqual(session.styles.get(layer.id)?.selector, { match: "ids", edges: picked });
        session.dispose();
    });
});
