/**
 * @file `styles.counts(id).visible`: a layer's selection read over the graph a filter leaves drawn,
 * the base a style selector is shown against, beside `matched`, which still counts the whole graph.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";

const NODES = ["a", "b", "c", "d", "e"].map((id, at) => ({ id, rank: at }));

describe("a layer's count over the graph the filter leaves", () => {
    it("leaves out filtered-out nodes and keeps matched over the whole graph", async () => {
        const s = createGraphSession({ workingGraph: false });
        await s.data.addNodes(NODES);
        const all = await s.styles.add({
            name: "All",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#888888" },
        });
        const picked = await s.styles.add({
            name: "Picked",
            target: "node",
            selector: { match: "ids", nodes: ["a", "c", "e"] },
            set: { "node.color": "#ff0000" },
        });
        await s.styles.settled();
        assert.deepEqual(s.styles.counts(picked.id).visible, { matched: 3, of: 5 }, "no filter: the whole graph");
        const before = s.styles.counts(picked.id).revision;

        await s.visibility.set({ kind: "member", of: { nodes: ["c", "d", "e"] } });
        await s.styles.settled();

        const counts = s.styles.counts(picked.id);
        assert.strictEqual(counts.matched, 3, "matched still counts the whole graph");
        assert.deepEqual(counts.visible, { matched: 2, of: 3 }, "a, filtered out, is not counted");
        assert.notStrictEqual(counts.revision, before, "a filter change moves the revision");
        assert.deepEqual(s.styles.counts(all.id).visible, { matched: 3, of: 3 }, "everything is the 3 drawn");
        assert.strictEqual(s.styles.counts(all.id).matched, 5);
        s.dispose();
    });
});
