/**
 * @file Per-field attribute revisions (design/sets/sets-design.md 6.2), moved by the graph
 * primitives' `bumpFields` (session/project/graphOps.ts) on a record edit. Ingest and the
 * repeated-edge policies through `Graph` and `DataManager` are in
 * `test/browser/sets/attributes.revision.test.ts`.
 */

import { assert, describe, it } from "vitest";

import { inputCountersOf } from "../../src/session/attributes";
import { inputCountersOfSession } from "../../src/session/GraphSession";
import { type Harness, makeSession } from "./helpers";

/**
 * A session with two labeled, weighted nodes and one labeled edge between them, added through
 * the session so every record is the graph primitives' to write.
 * @returns the harness
 */
async function settled(): Promise<Harness> {
    const harness = makeSession();
    await harness.session.data.addNodes([
        { id: "a", label: "a", weight: 1 },
        { id: "b", label: "b", weight: 1 },
    ]);
    await harness.session.data.addEdges([{ source: "a", target: "b", label: "a" }]);
    return harness;
}

describe("a record edit", () => {
    it("bumps only the fields it wrote, on its own kind", async () => {
        const harness = await settled();
        const counters = inputCountersOfSession(harness.session);
        const before = ["label", "weight", "id"].map((f) => counters.nodes.of(f));
        const edgeLabel = counters.edges.of("label");

        await harness.session.data.updateNodes([{ id: "a", values: { label: "b" } }]);
        assert.deepEqual(
            ["label", "weight", "id"].map((f) => counters.nodes.of(f)),
            [before[0] + 1, before[1], before[2]],
        );
        assert.strictEqual(counters.edges.of("label"), edgeLabel, "node writes leave edge revisions alone");
        harness.session.dispose();
    });

    it("bumps a field even when the value did not change", async () => {
        const harness = await settled();
        const counters = inputCountersOfSession(harness.session);
        const [edge] = harness.session.data.edgePage().records;
        assert.ok(edge !== undefined);
        const before = counters.edges.of("label");
        await harness.session.data.updateEdges([{ id: edge.id, values: { label: "a" } }]);
        assert.strictEqual(counters.edges.of("label"), before + 1);
        harness.session.dispose();
    });

    it("advances the tick once per write", async () => {
        const harness = await settled();
        const counters = inputCountersOfSession(harness.session);
        const before = counters.tick.value;
        await harness.session.data.updateNodes([{ id: "a", values: { label: "z", weight: 2 } }]);
        assert.strictEqual(counters.tick.value, before + 1);
        harness.session.dispose();
    });
});

describe("inputCountersOf", () => {
    it("hands one owner the same counters and two owners different ones", () => {
        const owner = {};
        assert.strictEqual(inputCountersOf(owner), inputCountersOf(owner));
        assert.notStrictEqual(inputCountersOf(owner), inputCountersOf({}));
        assert.strictEqual(inputCountersOf(owner).nodes.of("anything"), 0);
    });
});
