import { assert, describe, it } from "vitest";

import { makeSession } from "./helpers";

describe("reading one node or one edge", () => {
    it("answers by id, with the attributes the record arrived with", () => {
        const harness = makeSession();
        harness.add([{ id: "a", label: "Alpha", size: 3 }, { id: "b" }], [{ src: "a", dst: "b", kind: "knows" }]);

        const node = harness.session.data.node("a");
        assert.isDefined(node);
        assert.strictEqual(node?.id, "a");
        assert.strictEqual(node?.label, "Alpha");
        assert.strictEqual(node?.size, 3);
        harness.session.dispose();
    });

    it("misses without coercing, so 1 and \"1\" stay two different nodes", () => {
        const harness = makeSession();
        harness.add([{ id: 1 }]);

        assert.isDefined(harness.session.data.node(1));
        assert.isUndefined(harness.session.data.node("1"));
        harness.session.dispose();
    });

    it("answers undefined for a node the graph does not have", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }]);

        assert.isUndefined(harness.session.data.node("nobody"));
        harness.session.dispose();
    });

    it("lets the stored id win over an id key the record happened to carry", () => {
        // Every record imported through the element's default id path carries its own "id" key,
        // and a record whose key disagrees with the id it was stored under must not be able to
        // hand back an id that does not resolve.
        const harness = makeSession();
        harness.add([{ id: "a" }]);
        harness.nodeAttributes.set(0, { id: "something else", label: "Alpha" });

        assert.strictEqual(harness.session.data.node("a")?.id, "a");
        assert.strictEqual(harness.session.data.node("a")?.label, "Alpha");
        harness.session.dispose();
    });

    it("reads an edge by the element-assigned id and reports its endpoints as ids", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b", kind: "knows" }]);

        // The store stamps a counter into its role-"id" edge column, starting at 0, and the
        // element's edge id is that counter printed.
        const edge = harness.session.data.edge("0");
        assert.isDefined(edge);
        assert.strictEqual(edge?.source, "a");
        assert.strictEqual(edge?.target, "b");
        assert.strictEqual(edge?.kind, "knows");
        // The record carries source and target ONCE, under the canonical names. The keys the
        // record arrived with are stripped at the seam that builds the bag, so a consumer that
        // derives its columns from the keys -- the application's data table does -- does not
        // render the same fact twice under two spellings.
        assert.notProperty(edge, "src");
        assert.notProperty(edge, "dst");
        harness.session.dispose();
    });

    it("answers undefined for an edge id nothing was stamped with", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);

        assert.isUndefined(harness.session.data.edge("99"));
        assert.isUndefined(harness.session.data.edge("not-a-counter"), "and a malformed id is a miss, not a throw");
        harness.session.dispose();
    });

    it("sees a record that arrived after the last read", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }]);
        assert.strictEqual(harness.session.status.counts.nodes, 1);

        harness.add([{ id: "b" }]);

        assert.strictEqual(harness.session.status.counts.nodes, 2);
        assert.isDefined(harness.session.data.node("b"));
        harness.session.dispose();
    });
});

describe("what attributes the graph carries", () => {
    it("describes node and edge attributes with their type, completeness and samples", () => {
        const harness = makeSession();
        harness.add(
            [{ id: "a", label: "Alpha", weightKg: 1.5 }, { id: "b", label: "Beta" }],
            [{ src: "a", dst: "b", kind: "knows" }],
        );

        const attributes = harness.session.data.attributes();
        const label = attributes.find((a) => a.name === "label");
        const weight = attributes.find((a) => a.name === "weightKg");
        const kind = attributes.find((a) => a.name === "kind");

        assert.strictEqual(label?.kind, "node");
        assert.strictEqual(label?.completeness, 1);
        assert.strictEqual(weight?.type, "number");
        assert.strictEqual(weight?.min, 1.5);
        assert.strictEqual(weight?.max, 1.5);
        assert.strictEqual(weight?.completeness, 0.5, "one of the two nodes carries it");
        assert.strictEqual(kind?.kind, "edge");
        assert.deepEqual(kind?.sampleValues, ["knows"]);
        harness.session.dispose();
    });

    it("carries the bracketed token a formula would use", () => {
        const harness = makeSession();
        harness.add([{ id: "a", score: 1 }]);

        assert.strictEqual(harness.session.data.attributes()[0].token, "[score]");
        harness.session.dispose();
    });

    it("calls a column of whole numbers and fractions a number, and a column of two kinds mixed", () => {
        const harness = makeSession();
        harness.add([
            { id: "a", n: 1, m: 1 },
            { id: "b", n: 1.5, m: "one" },
        ]);

        const attributes = harness.session.data.attributes();
        assert.strictEqual(attributes.find((a) => a.name === "n")?.type, "number");
        assert.strictEqual(attributes.find((a) => a.name === "m")?.type, "mixed");
        harness.session.dispose();
    });

    it("calls a small set of repeated strings a category, so a palette can be offered for it", () => {
        const harness = makeSession();
        harness.add([
            { id: "a", team: "red" },
            { id: "b", team: "blue" },
            { id: "c", team: "red" },
            { id: "d", team: "blue" },
            { id: "e", team: "red" },
            { id: "f", team: "blue" },
            { id: "g", team: "red" },
            { id: "h", team: "blue" },
            { id: "i", team: "red" },
        ]);

        const team = harness.session.data.attributes().find((a) => a.name === "team");
        assert.strictEqual(team?.type, "category");
        assert.strictEqual(team?.uniqueCount, 2);
        harness.session.dispose();
    });

    it("reports no attributes for a graph whose records nothing is holding", () => {
        const harness = makeSession();
        harness.add([{ id: "a", label: "Alpha" }]);
        harness.nodeAttributes.clear();

        assert.deepEqual(harness.session.data.attributes(), []);
        harness.session.dispose();
    });
});

describe("the topology fingerprint", () => {
    it("is the same for two separately built graphs with the same shape", () => {
        const first = makeSession();
        first.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const second = makeSession();
        second.add([{ id: "a", label: "different attributes entirely" }, { id: "b" }], [{ src: "a", dst: "b" }]);

        assert.strictEqual(first.session.fingerprint(), second.session.fingerprint());
        first.session.dispose();
        second.session.dispose();
    });

    it("changes when an edge is added, and when a node id changes", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }]);
        const bare = harness.session.fingerprint();

        harness.add([], [{ src: "a", dst: "b" }]);
        const linked = harness.session.fingerprint();

        const renamed = makeSession();
        renamed.add([{ id: "a" }, { id: "c" }], [{ src: "a", dst: "c" }]);

        assert.notStrictEqual(bare, linked);
        assert.notStrictEqual(linked, renamed.session.fingerprint());
        harness.session.dispose();
        renamed.session.dispose();
    });

    it("does not change when a node moves, because moving a node is not a different graph", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const before = harness.session.fingerprint();

        harness.session.positions.write(0, 10, 20, 30);

        assert.strictEqual(harness.session.fingerprint(), before);
        harness.session.dispose();
    });
});

describe("the cost of asking twice", () => {
    it("hands back the same computed answer until the graph changes", () => {
        const harness = makeSession();
        harness.add([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);

        const first = harness.session.data.statistics();
        assert.strictEqual(harness.session.data.statistics(), first, "one walk per snapshot, not per call");

        harness.add([{ id: "c" }]);

        assert.notStrictEqual(harness.session.data.statistics(), first, "a changed graph is walked again");
        harness.session.dispose();
    });
});
