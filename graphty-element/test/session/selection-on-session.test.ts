import { assert, describe, it } from "vitest";

import type { SelectionDelta } from "../../src/session/selection";
import { type Harness, makeSession } from "./helpers";

/** Five nodes in a line, with a department on each so the statistics have something to say. */
function harnessOf(): Harness {
    const harness = makeSession();
    harness.add(
        [
            { id: "a", department: "ops", headcount: 10 },
            { id: "b", department: "ops", headcount: 20 },
            { id: "c", department: "sales", headcount: 30 },
            { id: "d", department: "sales", headcount: 40 },
            { id: "e", department: "sales", headcount: 50 },
        ],
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
            { src: "d", dst: "e" },
        ],
    );

    return harness;
}

/** Every selection change the session published, in order. */
function watchSelection(harness: Harness): SelectionDelta[] {
    const seen: SelectionDelta[] = [];
    harness.session.on("selection:changed", (delta) => {
        seen.push(delta);
    });

    return seen;
}

describe("session.selection", () => {
    it("starts empty and holds two sets, not one node", async () => {
        const harness = harnessOf();

        assert.strictEqual(harness.session.selection.size, 0);
        assert.deepStrictEqual([...harness.session.selection.nodes], []);

        await harness.session.selection.apply({ nodes: ["a", "b"], edges: ["c:d"] });

        assert.deepStrictEqual([...harness.session.selection.nodes], ["a", "b"]);
        assert.deepStrictEqual([...harness.session.selection.edges], ["c:d"]);
        assert.strictEqual(harness.session.selection.size, 3);
        assert.isTrue(harness.session.selection.has("b"));
        assert.isTrue(harness.session.selection.has("c:d"), "an edge can be selected, which it never could before");
        harness.session.dispose();
    });

    it("takes the five set operations over the same targets", async () => {
        const harness = harnessOf();
        const { selection } = harness.session;

        await selection.apply({ nodes: ["a", "b", "c"] });
        await selection.apply({ nodes: ["d"] }, "add");
        await selection.apply({ nodes: ["a"] }, "remove");
        await selection.apply({ nodes: ["b", "e"] }, "toggle");

        assert.deepStrictEqual([...selection.nodes].sort(), ["c", "d", "e"]);

        await selection.apply({ nodes: ["c", "d"] }, "intersect");

        assert.deepStrictEqual([...selection.nodes].sort(), ["c", "d"]);
        harness.session.dispose();
    });

    it("publishes a change carrying ids, never node objects", async () => {
        // A CustomEvent detail crosses to listeners that may structure-clone it or post it to a
        // worker. A delta holding a render object -- a mesh, a material, a scene -- cannot go
        // there, so the test is not "does it have ids" but "does it survive the crossing".
        const harness = harnessOf();
        const seen = watchSelection(harness);

        await harness.session.selection.apply({ nodes: ["a", "b"] });

        assert.lengthOf(seen, 1);
        const [delta] = seen;
        assert.deepStrictEqual([...(delta?.added ?? [])].sort(), ["a", "b"]);
        assert.deepStrictEqual(delta?.removed, []);
        assert.strictEqual(delta?.nodes, 2);
        assert.strictEqual(delta?.edges, 0);
        assert.strictEqual(delta?.cause, "api");
        assert.deepStrictEqual(structuredClone(delta), delta, "the detail has to survive a structured clone");
        harness.session.dispose();
    });

    it("says nothing when a change changed nothing", async () => {
        const harness = harnessOf();
        await harness.session.selection.apply({ nodes: ["a"] });
        const seen = watchSelection(harness);

        await harness.session.selection.apply({ nodes: ["a"] });

        assert.lengthOf(seen, 0, "clicking an already selected node is not news");
        harness.session.dispose();
    });

    it("reports what left when the selection is cleared", async () => {
        const harness = harnessOf();
        await harness.session.selection.apply({ nodes: ["a", "b"] });
        const seen = watchSelection(harness);

        const delta = harness.session.selection.clear();

        assert.deepStrictEqual([...delta.removed].sort(), ["a", "b"]);
        assert.strictEqual(harness.session.selection.size, 0);
        assert.lengthOf(seen, 1);
        harness.session.dispose();
    });

    it("hands the same array object back until the contents change", async () => {
        // `previous === next` has to be a valid staleness test, or every consumer re-renders on
        // every read.
        const harness = harnessOf();
        await harness.session.selection.apply({ nodes: ["a"] });

        const first = harness.session.selection.nodes;

        assert.strictEqual(harness.session.selection.nodes, first);

        await harness.session.selection.apply({ nodes: ["b"] }, "add");

        assert.notStrictEqual(harness.session.selection.nodes, first);
        harness.session.dispose();
    });

    it("keeps a selection under a name, and the scope resolves to it afterwards", async () => {
        const harness = harnessOf();
        await harness.session.selection.apply({ nodes: ["a", "b"] });

        const id = harness.session.selection.promote("my picks");
        harness.session.selection.clear();

        const scope = await harness.session.scope.resolve({ set: id });

        assert.deepStrictEqual([...scope.nodes].sort(), ["a", "b"], "the saved set outlives the selection");
        assert.strictEqual(harness.session.scope.list()[0]?.name, "my picks");
        harness.session.dispose();
    });

    it("summarises what is selected against the rest of the graph", async () => {
        const harness = harnessOf();
        await harness.session.selection.apply({ nodes: ["d", "e"] });

        const statistics = await harness.session.selection.statistics();
        const headcount = statistics.attributes.find((entry) => entry.path === "data.headcount");

        assert.strictEqual(statistics.nodes, 2);
        assert.strictEqual(statistics.inducedEdges, 1, "d:e has both endpoints selected");
        assert.strictEqual(statistics.cutEdges, 1, "c:d has one");
        assert.strictEqual(headcount?.mean, 45);
        assert.strictEqual(headcount?.direction, "above");
        harness.session.dispose();
    });

    it("selects by a scope, so the two models compose", async () => {
        const harness = harnessOf();
        const id = harness.session.scope.save("core", { nodes: ["b", "c"] });

        await harness.session.selection.apply({ scope: { set: id } });

        assert.deepStrictEqual([...harness.session.selection.nodes].sort(), ["b", "c"]);
        harness.session.dispose();
    });
});
