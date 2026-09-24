import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import type { Filter } from "../../src/session/visibility";
import { edgeBetween, type Harness, makeSession } from "./helpers";

/** Three hosts, two services, and four edges between them. */
function harnessOf(): Harness {
    const harness = makeSession();
    harness.add(
        [
            { id: "a", type: "host" },
            { id: "b", type: "host" },
            { id: "c", type: "host" },
            { id: "d", type: "service" },
            { id: "e", type: "service" },
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

/** Only the hosts. */
const HOSTS: Filter = { kind: "categories", attribute: "data.type", values: ["host"] };

/** The code a call refused with, or null when it did not refuse. */
function codeOf(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

describe("session.scope", () => {
    it("resolves the whole graph, with its edges", async () => {
        const harness = harnessOf();

        const whole = await harness.session.scope.resolve("graph");

        assert.strictEqual(whole.nodeCount, 5);
        assert.strictEqual(whole.edgeCount, 4);
        assert.deepStrictEqual([...whole.nodes].sort(), ["a", "b", "c", "d", "e"]);
        assert.isTrue(whole.edges.has(edgeBetween(harness, "a", "b")), "an edge is addressed by its endpoints");
        harness.session.dispose();
    });

    it("answers for an empty graph rather than refusing one", async () => {
        const harness = makeSession();

        const whole = await harness.session.scope.resolve("graph");

        assert.strictEqual(whole.nodeCount, 0);
        assert.strictEqual(whole.edgeCount, 0);
        assert.isString(whole.digest);
        harness.session.dispose();
    });

    it("narrows `visible` to what a filter left showing, and leaves `graph` alone", async () => {
        // This is the distinction the whole model turns on: a run started against "visible" has
        // to mean whatever is visible NOW, and one started against "graph" must not move when a
        // reader hides four fifths of the screen.
        const harness = harnessOf();
        await harness.session.visibility.set(HOSTS);

        const visible = await harness.session.scope.resolve("visible");
        const whole = await harness.session.scope.resolve("graph");

        assert.deepStrictEqual([...visible.nodes].sort(), ["a", "b", "c"]);
        assert.deepStrictEqual([...visible.edges].sort(), [edgeBetween(harness, "a", "b"), edgeBetween(harness, "b", "c")], "an edge needs both endpoints");
        assert.strictEqual(whole.nodeCount, 5);
        harness.session.dispose();
    });

    it("resolves `selection` to what is selected", async () => {
        const harness = harnessOf();
        await harness.session.selection.apply({ nodes: ["a", "b"] });

        const scope = await harness.session.scope.resolve("selection");

        assert.deepStrictEqual([...scope.nodes].sort(), ["a", "b"]);
        assert.deepStrictEqual([...scope.edges], [edgeBetween(harness, "a", "b")], "a scope's edges are induced from its nodes");
        harness.session.dispose();
    });

    it("moves the digest when the membership moves, and holds it still when nothing did", async () => {
        // The digest is what lets a finished run answer "computed on 5 of 5, now showing 3" with
        // the consumer tracking nothing at all.
        const harness = harnessOf();
        const before = (await harness.session.scope.resolve("visible")).digest;

        assert.strictEqual((await harness.session.scope.resolve("visible")).digest, before, "asking twice is free");

        await harness.session.visibility.set(HOSTS);

        assert.notStrictEqual((await harness.session.scope.resolve("visible")).digest, before);
        harness.session.dispose();
    });

    it("counts a scope without materialising it", async () => {
        const harness = harnessOf();
        await harness.session.visibility.set(HOSTS);

        const count = await harness.session.scope.count("visible");

        assert.deepStrictEqual(count, { nodes: 3, edges: 2, exact: true });
        harness.session.dispose();
    });

    it("keeps a scope under a name and takes it away again", async () => {
        const harness = harnessOf();

        const id = harness.session.scope.save("core", { nodes: ["a", "b"] });
        const saved = harness.session.scope.list();

        assert.lengthOf(saved, 1);
        assert.strictEqual(saved[0]?.name, "core");
        assert.isTrue(saved[0]?.bound, "every node it names is still here");
        assert.strictEqual((await harness.session.scope.resolve({ set: id })).nodeCount, 2);

        harness.session.scope.remove(id);

        assert.lengthOf(harness.session.scope.list(), 0);
        harness.session.dispose();
    });

    it("refuses a predicate rather than resolving it to nothing", () => {
        // A session with no query engine that answered "0 nodes matched" would be indistinguishable
        // from a predicate that genuinely matched nothing, and no consumer can tell those apart
        // after the fact.
        const harness = harnessOf();

        assert.strictEqual(codeOf(() => harness.session.scope.count({ where: "data.type == `host`" })), "E_UNSUPPORTED");
        harness.session.dispose();
    });
});
