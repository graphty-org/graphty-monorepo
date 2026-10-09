import { assert, describe, it } from "vitest";

import { createRegistry } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { tabFor } from "../../state/store";
import { groupKey, INSPECTED_KINDS, neighborhoodKey, nodeKey, resolveInspected } from "../inspected";

const NOTHING = { nodes: [], edges: [] };

describe("what the inspector shows", () => {
    it("reads the selection when no row is open", () => {
        assert.deepEqual(resolveInspected(null, NOTHING), { kind: "graph" });
        assert.deepEqual(resolveInspected(null, null), { kind: "graph" });
        assert.deepEqual(resolveInspected(null, { nodes: [1], edges: [] }), { kind: "node", node: 1 });
        assert.deepEqual(resolveInspected(null, { nodes: [], edges: ["a:b"] }), { kind: "edge", edge: "a:b" });
        assert.deepEqual(resolveInspected(null, { nodes: [1, 2], edges: [] }), { kind: "several" });
    });

    it("shows an open row over the selection", () => {
        const selection = { nodes: [1], edges: [] };
        // The Graph place's title opens the graph and keeps the selection.
        assert.deepEqual(resolveInspected({ kind: "graph" }, selection), { kind: "graph" });
        assert.deepEqual(resolveInspected({ kind: "run-row", id: "louvain" }, selection), {
            kind: "run-row",
            run: "louvain",
        });
        assert.deepEqual(resolveInspected({ kind: "group-row", id: groupKey("louvain", 3) }, selection), {
            kind: "group-row",
            run: "louvain",
            group: 3,
        });
        assert.deepEqual(resolveInspected({ kind: "neighborhood", id: nodeKey(7) }, selection), {
            kind: "neighborhood",
            node: 7,
            hops: 1,
            direction: "all",
        });
        // Grown by a hop, the row carries how far out it reaches.
        assert.deepEqual(resolveInspected({ kind: "neighborhood", id: neighborhoodKey(7, 2) }, selection), {
            kind: "neighborhood",
            node: 7,
            hops: 2,
            direction: "all",
        });
        // Following edges one way, the row carries the direction too.
        assert.deepEqual(resolveInspected({ kind: "neighborhood", id: neighborhoodKey(7, 1, "out") }, selection), {
            kind: "neighborhood",
            node: 7,
            hops: 1,
            direction: "out",
        });
        assert.deepEqual(resolveInspected({ kind: "attribute", id: "data.age" }, selection), {
            kind: "attribute",
            path: "data.age",
        });
        // The Graph place's row for one of the reader's own layers.
        assert.deepEqual(resolveInspected({ kind: "layer-row", id: "my-gray" }, selection), {
            kind: "layer-row",
            layer: "my-gray",
        });
    });

    it('keeps node 1 and node "1" apart', () => {
        assert.notEqual(nodeKey(1), nodeKey("1"));
        assert.deepEqual(resolveInspected({ kind: "neighborhood", id: nodeKey("1") }, NOTHING), {
            kind: "neighborhood",
            node: "1",
            hops: 1,
            direction: "all",
        });
    });

    it("falls back to the selection when a row's id does not parse", () => {
        assert.deepEqual(resolveInspected({ kind: "group-row", id: "not json" }, NOTHING), { kind: "graph" });
        assert.deepEqual(resolveInspected({ kind: "measure-row" }, NOTHING), { kind: "graph" });
    });

    it("registers every kind it draws, a single node always opening on Values", () => {
        const { kinds } = createRegistry(REGISTRATIONS);
        for (const kind of INSPECTED_KINDS) {
            assert.isTrue(kinds.has(kind), kind);
        }
        assert.equal(tabFor(kinds.get("node"), { node: "style" }), "values");
        assert.equal(tabFor(kinds.get("graph"), { graph: "style" }), "style");
        assert.isNull(tabFor(kinds.get("attribute"), {}));
    });
});
