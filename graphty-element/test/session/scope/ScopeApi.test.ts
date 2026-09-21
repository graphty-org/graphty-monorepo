import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import type { EdgeId, NodeId, Scope } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import {
    type ComponentLabels,
    createScopeApi,
    DEFAULT_SCOPE_SAMPLE,
    edgeSpaceOf,
    ElementMask,
    membershipDigest,
    nodeSpaceOf,
    type SavedScope,
    type ScopeApi,
    type ScopeCount,
    type ScopeCountOptions,
    type ScopeResolver,
    type ScopeSelectionSource,
    type ScopeSources,
    type ScopeVisibilitySource,
} from "../../../src/session/scope/index";
import { edgeBetween, type EdgeRow, type Harness, makeSession, type NodeRow } from "../helpers";

/** A session with data in it, plus the resolver reading the same store. */
function harnessOf(nodes: readonly NodeRow[], edges: readonly EdgeRow[] = []): Harness {
    const harness = makeSession();
    harness.add(nodes, edges);

    return harness;
}

/** A node mask over the harness's current snapshot, with nothing in it. */
function nodeMaskOf(harness: Harness): ElementMask<NodeId> {
    const snapshot = harness.store.getSnapshot();
    const space = nodeSpaceOf(snapshot);
    const mask = new ElementMask<NodeId>(() => space);
    mask.grow(snapshot.nodeCount);

    return mask;
}

/** An edge mask over the harness's current snapshot, with nothing in it. */
function edgeMaskOf(harness: Harness): ElementMask<EdgeId> {
    const snapshot = harness.store.getSnapshot();
    const space = edgeSpaceOf(snapshot);
    const mask = new ElementMask<EdgeId>(() => space);
    mask.grow(snapshot.edgeCount);

    return mask;
}

/** Put a set of ids into a mask. */
function fillWith<TId>(mask: ElementMask<TId>, ids: readonly TId[]): ElementMask<TId> {
    for (const id of ids) {
        mask.add(mask.indexOf(id));
    }

    return mask;
}

/** The code a call refused with, or null when it did not refuse. */
function codeOf(call: () => unknown): string | null {
    try {
        call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

describe("resolving a scope", () => {
    it("answers with the nodes, the edges, the counts and the specification", async () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }, { id: "c" }], [{ src: "a", dst: "b" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        const resolved = await scope.resolve("graph");

        assert.deepStrictEqual([...resolved.nodes].sort(), ["a", "b", "c"]);
        assert.deepStrictEqual([...resolved.edges], [edgeBetween(harness, "a", "b")], "an edge is addressed by its endpoints");
        assert.strictEqual(resolved.nodeCount, 3);
        assert.strictEqual(resolved.edgeCount, 1);
        assert.strictEqual(resolved.spec, "graph");
        assert.match(resolved.resolvedAt, /^\d{4}-\d{2}-\d{2}T/);
        harness.session.dispose();
    });

    it("takes a scope's edges to be the ones with both endpoints inside it", async () => {
        // An edge with one endpoint outside the scope is not in the scope: no algorithm running
        // over the scope could follow it there.
        const harness = harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ],
        );
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        const resolved = await scope.resolve({ nodes: ["a", "b"] });

        assert.deepStrictEqual([...resolved.nodes].sort(), ["a", "b"]);
        assert.deepStrictEqual([...resolved.edges], [edgeBetween(harness, "a", "b")]);
        harness.session.dispose();
    });

    it("ignores a named node the graph no longer holds", async () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        const resolved = await scope.resolve({ nodes: ["a", "gone"] });

        assert.deepStrictEqual([...resolved.nodes], ["a"]);
        harness.session.dispose();
    });

    it("resolves an empty graph rather than refusing one", async () => {
        const harness = harnessOf([]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        const resolved = await scope.resolve("graph");

        assert.strictEqual(resolved.nodeCount, 0);
        assert.strictEqual(resolved.edgeCount, 0);
        harness.session.dispose();
    });

    it("answers the same thing with and without a promise", async () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        const now = scope.resolveNow("graph");
        const later = await scope.resolve("graph");

        assert.strictEqual(now.digest, later.digest);
        assert.strictEqual(now.nodeCount, later.nodeCount);
        harness.session.dispose();
    });

    it("refuses a value that is not a scope at all", () => {
        const harness = harnessOf([{ id: "a" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        assert.strictEqual(codeOf(() => scope.resolveNow("everything" as unknown as Scope)), "E_BAD_COMMAND");
        assert.strictEqual(codeOf(() => scope.resolveNow({} as unknown as Scope)), "E_BAD_COMMAND");
        assert.strictEqual(codeOf(() => scope.resolveNow(null as unknown as Scope)), "E_BAD_COMMAND");
        harness.session.dispose();
    });
});

describe("the scope digest", () => {
    it("folds the same membership to the same digest, twice running", () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        assert.strictEqual(scope.resolveNow("graph").digest, scope.resolveNow("graph").digest);
        harness.session.dispose();
    });

    it("moves the moment the membership moves", () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });
        const before = scope.resolveNow("graph").digest;

        harness.add([{ id: "c" }]);

        assert.notStrictEqual(scope.resolveNow("graph").digest, before, "a node arrived, so the scope moved");
        harness.session.dispose();
    });

    it("moves when only the edges moved", () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });
        const before = scope.resolveNow("graph").digest;

        harness.add([], [{ src: "a", dst: "b" }]);

        assert.notStrictEqual(scope.resolveNow("graph").digest, before);
        harness.session.dispose();
    });

    it("gives two specifications over the same elements one digest", () => {
        // Equal digests mean equal scopes, and that is the whole load the digest carries: a run
        // over a saved set and a run over the list it holds covered the same elements, so
        // comparing their digests must say so.
        const harness = harnessOf([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        const whole = scope.resolveNow("graph").digest;

        assert.strictEqual(scope.resolveNow({ nodes: ["a", "b"] }).digest, whole);
        assert.strictEqual(scope.resolveNow({ nodes: ["b", "a"] }).digest, whole, "order is not membership");
        assert.strictEqual(scope.resolveNow("visible").digest, whole, "nothing hides anything here");
        harness.session.dispose();
    });

    it("tells the number 1 from the string \"1\"", () => {
        const numeric = harnessOf([{ id: 1 }, { id: 2 }]);
        const textual = harnessOf([{ id: "1" }, { id: "2" }]);
        const left = createScopeApi({ snapshot: () => numeric.store.getSnapshot() });
        const right = createScopeApi({ snapshot: () => textual.store.getSnapshot() });

        assert.notStrictEqual(left.resolveNow("graph").digest, right.resolveNow("graph").digest);
        numeric.session.dispose();
        textual.session.dispose();
    });
});

describe("resolving against what is visible and what is selected", () => {
    it("narrows to the visible nodes, and to fewer edges than those induce", async () => {
        // The edge mask is not redundant with the node mask: an edge filter can hide an edge
        // whose endpoints are both showing, and "visible" has to mean what is actually showing.
        const harness = harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ],
        );
        const nodes = fillWith(nodeMaskOf(harness), ["a", "b", "c"]);
        const edges = fillWith(edgeMaskOf(harness), [edgeBetween(harness, "a", "b")]);
        const visibility: ScopeVisibilitySource = { nodes: () => nodes, edges: () => edges };
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot(), visibility });

        const resolved = await scope.resolve("visible");

        assert.strictEqual(resolved.nodeCount, 3);
        assert.deepStrictEqual([...resolved.edges], [edgeBetween(harness, "a", "b")], "b:c is filtered out even though b and c show");
        harness.session.dispose();
    });

    it("treats visible as the whole graph when nothing hides anything", async () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        assert.strictEqual((await scope.resolve("visible")).nodeCount, 2);
        harness.session.dispose();
    });

    it("narrows to the selection, and follows it when it changes", () => {
        const harness = harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ],
        );
        const selected = fillWith(nodeMaskOf(harness), ["a", "b"]);
        const selection: ScopeSelectionSource = { nodes: () => selected };
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot(), selection });

        assert.deepStrictEqual([...scope.resolveNow("selection").nodes].sort(), ["a", "b"]);

        selected.add(selected.indexOf("c"));

        assert.strictEqual(
            scope.resolveNow("selection").nodeCount,
            3,
            "the cached answer is dropped when the selection moves, even though the graph did not",
        );
        harness.session.dispose();
    });

    it("refuses selection and largest-component when the session has neither", () => {
        const harness = harnessOf([{ id: "a" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        for (const spec of ["selection", "largest-component"] as const) {
            assert.strictEqual(codeOf(() => scope.resolveNow(spec)), "E_UNSUPPORTED", spec);
        }

        harness.session.dispose();
    });
});

describe("resolving the largest component and a predicate", () => {
    it("takes the biggest piece of the graph", async () => {
        const harness = harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }],
            [
                { src: "a", dst: "b" },
                { src: "c", dst: "d" },
                { src: "d", dst: "e" },
            ],
        );
        const labels: ComponentLabels = { labels: [0, 0, 1, 1, 1], count: 2 };
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot(), components: () => labels });

        const resolved = await scope.resolve("largest-component");

        assert.deepStrictEqual([...resolved.nodes].sort(), ["c", "d", "e"]);
        assert.deepStrictEqual([...resolved.edges].sort(), [edgeBetween(harness, "c", "d"), edgeBetween(harness, "d", "e")]);
        harness.session.dispose();
    });

    it("resolves a graph with no components to nothing rather than to everything", () => {
        const harness = harnessOf([{ id: "a" }]);
        const scope = createScopeApi({
            snapshot: () => harness.store.getSnapshot(),
            components: () => ({ labels: [], count: 0 }),
        });

        assert.strictEqual(scope.resolveNow("largest-component").nodeCount, 0);
        harness.session.dispose();
    });

    it("takes whatever the query engine matched", async () => {
        const harness = harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ],
        );
        const scope = createScopeApi({
            snapshot: () => harness.store.getSnapshot(),
            match: (where) => (where === "all" ? ["a", "b", "c"] : ["a", "c"]),
        });

        assert.strictEqual((await scope.resolve({ where: "all" })).nodeCount, 3);
        assert.deepStrictEqual([...scope.resolveNow({ where: "some" }).edges], [], "a and c share no edge");
        harness.session.dispose();
    });

    it("refuses a predicate when nothing can evaluate one", () => {
        const harness = harnessOf([{ id: "a" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        assert.strictEqual(codeOf(() => scope.resolveNow({ where: "a == `1`" })), "E_UNSUPPORTED");
        harness.session.dispose();
    });
});

describe("counting a scope", () => {
    /** A graph of five nodes in a line, so it has four edges. */
    function line(): Harness {
        return harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
                { src: "c", dst: "d" },
                { src: "d", dst: "e" },
            ],
        );
    }

    it("answers for the whole graph from the two numbers the snapshot already holds", async () => {
        const harness = line();
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        assert.deepStrictEqual(await scope.count("graph"), { nodes: 5, edges: 4, exact: true });
        assert.deepStrictEqual(await scope.count("visible"), { nodes: 5, edges: 4, exact: true });
        harness.session.dispose();
    });

    it("counts a narrowed scope exactly by default", async () => {
        const harness = line();
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        assert.deepStrictEqual(await scope.count({ nodes: ["a", "b", "c"] }), { nodes: 3, edges: 2, exact: true });
        harness.session.dispose();
    });

    it("says so when it answered from a sample", async () => {
        const harness = line();
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        const options: ScopeCountOptions = { approximate: true, sample: 2 };
        const counted: ScopeCount = await scope.count({ nodes: ["a", "b", "c", "d", "e"] }, options);

        assert.isFalse(counted.exact, "an estimate must never pass for a count");
        assert.strictEqual(counted.sampled, 2);
        assert.strictEqual(counted.nodes, 5, "the node count is never estimated");
        assert.strictEqual(counted.edges, 4, "every sampled edge was in scope, so the estimate is the whole set");
        harness.session.dispose();
    });

    it("counts exactly when the sample would cover every edge anyway", async () => {
        const harness = line();
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        const counted = await scope.count({ nodes: ["a", "b"] }, { approximate: true, sample: 500 });

        assert.isTrue(counted.exact);
        assert.isUndefined(counted.sampled);
        assert.strictEqual(counted.edges, 1);
        harness.session.dispose();
    });

    it("takes the declared default when no sample is named", async () => {
        const harness = line();
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });
        const spec: Scope = { nodes: ["a", "b", "c"] };

        assert.deepStrictEqual(
            await scope.count(spec, { approximate: true }),
            await scope.count(spec, { approximate: true, sample: DEFAULT_SCOPE_SAMPLE }),
        );
        harness.session.dispose();
    });

    it("refuses a sample that is not a positive whole number", () => {
        const harness = line();
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        assert.strictEqual(codeOf(() => scope.count("selection", { sample: 0 })), "E_OPTION_RANGE");
        assert.strictEqual(codeOf(() => scope.count("selection", { sample: 1.5 })), "E_OPTION_RANGE");
        harness.session.dispose();
    });
});

describe("saving a scope under a name", () => {
    it("mints a legible id, lists it, and resolves what it holds", async () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }, { id: "c" }], [{ src: "a", dst: "b" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        const id = scope.save("Core hosts", { nodes: ["a", "b"] });
        const listed: readonly SavedScope[] = scope.list();

        assert.strictEqual(id, "set_core-hosts");
        assert.deepStrictEqual(listed, [{ id, name: "Core hosts", spec: { nodes: ["a", "b"] }, bound: true }]);

        const resolved = await scope.resolve({ set: id });

        assert.deepStrictEqual([...resolved.nodes].sort(), ["a", "b"]);
        assert.deepStrictEqual(resolved.spec, { set: id }, "the specification reported is the one that was asked");
        harness.session.dispose();
    });

    it("gives a saved set and the specification it holds one digest", () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });
        const id = scope.save("everything", "graph");

        assert.strictEqual(scope.resolveNow({ set: id }).digest, scope.resolveNow("graph").digest);
        harness.session.dispose();
    });

    it("refuses a second scope under a name that is taken", () => {
        const harness = harnessOf([{ id: "a" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });
        scope.save("mine", "graph");

        assert.strictEqual(codeOf(() => scope.save("mine", { nodes: ["a"] })), "E_DUPLICATE_ID");
        assert.strictEqual(codeOf(() => scope.save("  ", "graph")), "E_BAD_COMMAND", "a name is how a person finds it");
        harness.session.dispose();
    });

    it("refuses to save a reference to a set nothing holds", () => {
        const harness = harnessOf([{ id: "a" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        assert.strictEqual(codeOf(() => scope.save("broken", { set: "set_nothing" })), "E_BAD_COMMAND");
        harness.session.dispose();
    });

    it("keeps two names that slug the same apart", () => {
        const harness = harnessOf([{ id: "a" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        assert.strictEqual(scope.save("My set", "graph"), "set_my-set");
        assert.strictEqual(scope.save("my-set", "graph"), "set_my-set_2");
        assert.strictEqual(scope.save("!!!", "graph"), "set_set", "a name with nothing to slug still gets an id");
        harness.session.dispose();
    });

    it("refuses to resolve or remove a set nothing holds", () => {
        const harness = harnessOf([{ id: "a" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });

        assert.strictEqual(codeOf(() => scope.resolveNow({ set: "set_nothing" })), "E_BAD_COMMAND");
        assert.strictEqual(codeOf(() => scope.remove("set_nothing")), "E_BAD_COMMAND");
        harness.session.dispose();
    });

    it("forgets a saved scope, and says so about anything that named it", () => {
        const harness = harnessOf([{ id: "a" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });
        const inner = scope.save("inner", "graph");
        scope.save("outer", { set: inner });

        scope.remove(inner);

        assert.deepStrictEqual(
            scope.list().map((entry) => ({ name: entry.name, bound: entry.bound })),
            [{ name: "outer", bound: false }],
            "a set whose reference is gone is unbound, not silently empty",
        );
        harness.session.dispose();
    });

    it("reports a set as unbound when it needs a capability the session lacks", () => {
        const harness = harnessOf([{ id: "a" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });
        scope.save("all", "graph");
        scope.save("chosen", "selection");
        scope.save("biggest", "largest-component");
        scope.save("matched", { where: "a == `1`" });
        scope.save("departed", { nodes: ["gone"] });
        scope.save("here", { nodes: ["a", "gone"] });

        assert.deepStrictEqual(
            scope.list().map((entry) => ({ name: entry.name, bound: entry.bound })),
            [
                { name: "all", bound: true },
                { name: "chosen", bound: false },
                { name: "biggest", bound: false },
                { name: "matched", bound: false },
                { name: "departed", bound: false },
                { name: "here", bound: true },
            ],
        );
        harness.session.dispose();
    });

    it("catches a ring of saved sets instead of following it forever", () => {
        const harness = harnessOf([{ id: "a" }]);
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });
        const first = scope.save("first", "graph");
        const second = scope.save("second", { set: first });
        // Removing the first and saving a new scope under the same name mints the same id, which
        // is what closes the ring: first -> second -> first.
        scope.remove(first);
        const reused = scope.save("first", { set: second });

        assert.strictEqual(reused, first);
        assert.strictEqual(codeOf(() => scope.resolveNow({ set: first })), "E_BAD_COMMAND");
        assert.deepStrictEqual(
            scope.list().map((entry) => entry.bound),
            [false, false],
            "neither end of the ring refers to anything",
        );
        harness.session.dispose();
    });
});

describe("the sources a resolver was built with", () => {
    it("is a plain object, so a session hands in only what it has", () => {
        // The shape is the seam the session wires into later: everything but the snapshot is
        // optional, and an absent member is a refusal rather than a quiet widening.
        const harness = harnessOf([{ id: "a" }]);
        const sources: ScopeSources = { snapshot: () => harness.store.getSnapshot() };
        const resolver: ScopeResolver = createScopeApi(sources);
        const published: ScopeApi = resolver;

        assert.strictEqual(resolver.resolveNow("graph").nodeCount, 1);
        assert.strictEqual(published.list().length, 0);
        harness.session.dispose();
    });
});

describe("the identity spaces a mask is built over", () => {
    it("addresses a node by its id and an edge by its endpoints", () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const snapshot = harness.store.getSnapshot();
        const nodes = nodeSpaceOf(snapshot);
        const edges = edgeSpaceOf(snapshot);

        assert.strictEqual(nodes.idOf(nodes.indexOf("b")), "b");
        assert.strictEqual(edges.idOf(0), edgeBetween(harness, "a", "b"));
        assert.strictEqual(edges.indexOf(edgeBetween(harness, "a", "b")), 0);
        harness.session.dispose();
    });

    it("answers the sentinel for an element the graph does not hold", () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }], [{ src: "a", dst: "b" }]);
        const snapshot = harness.store.getSnapshot();

        assert.strictEqual(nodeSpaceOf(snapshot).indexOf("gone"), INVALID_INDEX);
        // An id nothing was stamped with, and an id that is not a counter at all: both are a
        // miss rather than a throw, because a saved scope or a pasted list carries whatever the
        // reader had.
        assert.strictEqual(edgeSpaceOf(snapshot).indexOf("99"), INVALID_INDEX);
        assert.strictEqual(edgeSpaceOf(snapshot).indexOf("b:a"), INVALID_INDEX, "an old pair-string id names nothing");
        harness.session.dispose();
    });

    it("carries an edge mask's membership by id", () => {
        const harness = harnessOf(
            [{ id: "a" }, { id: "b" }, { id: "c" }],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
            ],
        );
        const mask = fillWith(edgeMaskOf(harness), [edgeBetween(harness, "b", "c")]);

        assert.isTrue(mask.hasId(edgeBetween(harness, "b", "c")));
        assert.isFalse(mask.hasId(edgeBetween(harness, "a", "b")));
        assert.deepStrictEqual([...mask.ids()], [edgeBetween(harness, "b", "c")]);
        harness.session.dispose();
    });
});

describe("the membership digest on its own", () => {
    it("does not care what order the ids came out in", () => {
        assert.strictEqual(membershipDigest(["a", "b"], ["0"]), membershipDigest(["b", "a"], ["0"]));
    });

    it("tells a node apart from an edge that happens to share its name", () => {
        assert.notStrictEqual(membershipDigest(["x"], []), membershipDigest([], ["x"]));
    });

    it("moves when one element joins", () => {
        assert.notStrictEqual(membershipDigest(["a"], []), membershipDigest(["a", "b"], []));
    });
});
