import { assert, describe, it } from "vitest";

import { makeSession } from "./helpers";

/*
 * The documented way to list every record: resolve the "graph" scope for the ids, then read each
 * id through `session.data`. A consumer drawing a data table has no other supported door, so the
 * recipe itself is what is pinned here (docs/guide/javascript-api.md, "Listing every node and
 * edge record").
 */
describe("listing every node and edge record", () => {
    it("returns every node and every edge, each with its attributes", async () => {
        const harness = makeSession();
        harness.add(
            [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }, { id: 3 }],
            [
                { src: "a", dst: "b", kind: "knows" },
                { src: "b", dst: 3, kind: "owns" },
            ],
        );
        const { session } = harness;

        const { nodes, edges } = await session.scope.resolve("graph");
        const nodeRecords = [...nodes].map((id) => session.data.node(id));
        const edgeRecords = [...edges].map((id) => session.data.edge(id));

        assert.sameDeepMembers(nodeRecords, [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }, { id: 3 }]);
        assert.sameDeepMembers(
            edgeRecords.map((record) => ({ source: record?.source, target: record?.target, kind: record?.kind })),
            [
                { source: "a", target: "b", kind: "knows" },
                { source: "b", target: 3, kind: "owns" },
            ],
        );
        session.dispose();
    });

    it("keeps the element's own edge id when the record carries an id of its own", async () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b", id: "file-edge-7" }]);
        const { session } = harness;

        const { edges } = await session.scope.resolve("graph");
        const [edgeId] = [...edges];
        const record = session.data.edge(edgeId);

        assert.strictEqual(record?.id, edgeId, "the record answers to the id the listing gave");
        assert.notStrictEqual(record?.id, "file-edge-7");
        assert.strictEqual(record?.source, "a");
        assert.strictEqual(record?.target, "b");
        session.dispose();
    });

    it("lists nothing for an empty graph", async () => {
        const harness = makeSession();

        const { nodes, edges } = await harness.session.scope.resolve("graph");

        assert.strictEqual(nodes.size, 0);
        assert.strictEqual(edges.size, 0);
        harness.session.dispose();
    });
});
