import { INVALID_INDEX } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import type { NodeId } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { createScopeApi } from "../../../src/session/scope/ScopeApi";
import {
    createSelectionApi,
    DEFAULT_SELECTION_CAP,
    type SelectionApi,
    type SelectionAttributeStatistics,
    type SelectionCause,
    type SelectionDelta,
    type SelectionOwner,
    type SelectionSources,
    type SelectionStatistics,
    SET_OPS,
    type SetOp,
} from "../../../src/session/selection/index";
import type { SessionRecordSource } from "../../../src/session/types";
import { edgeBetween, type EdgeRow, type Harness, makeSession, type NodeRow } from "../helpers";

/** A session with data in it. */
function harnessOf(nodes: readonly NodeRow[], edges: readonly EdgeRow[] = [], directed?: boolean): Harness {
    const harness = makeSession(directed === undefined ? {} : { directed });
    harness.add(nodes, edges);

    return harness;
}

/** A selection over a harness, with whatever capabilities a test wants to hand it. */
function selectionOf(harness: Harness, extra: Omit<SelectionSources, "snapshot"> = {}): SelectionOwner {
    return createSelectionApi({ snapshot: () => harness.store.getSnapshot(), ...extra });
}

/** The attribute bags the harness collected, as a session reads them. */
function recordsOf(harness: Harness): SessionRecordSource {
    return {
        nodeAttributes: (index) => harness.nodeAttributes.get(index),
        edgeAttributes: (index) => harness.edgeAttributes.get(index),
    };
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

/** Four nodes in a line, so there are three edges. */
function line(directed?: boolean): Harness {
    return harnessOf(
        [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
        ],
        directed,
    );
}

describe("two sets rather than one node", () => {
    it("holds nodes and edges at the same time", async () => {
        const harness = line();
        const selection: SelectionApi = selectionOf(harness);

        const delta = await selection.apply({ nodes: ["a", "c"], edges: [edgeBetween(harness, "a", "b")] });

        assert.deepStrictEqual([...selection.nodes], ["a", "c"]);
        assert.deepStrictEqual([...selection.edges], [edgeBetween(harness, "a", "b")]);
        assert.strictEqual(selection.size, 3, "the size counts both halves");
        assert.strictEqual(delta.nodes, 2);
        assert.strictEqual(delta.edges, 1);
        harness.session.dispose();
    });

    it("selects a second node instead of replacing the first", () => {
        const harness = line();
        const selection = selectionOf(harness);

        selection.applyNow({ nodes: ["a"] });
        selection.applyNow({ nodes: ["b"] }, "add");

        assert.deepStrictEqual([...selection.nodes], ["a", "b"]);
        harness.session.dispose();
    });

    it("starts with nothing selected", () => {
        const harness = line();
        const selection = selectionOf(harness);

        assert.strictEqual(selection.size, 0);
        assert.deepStrictEqual([...selection.nodes], []);
        assert.deepStrictEqual([...selection.edges], []);
        harness.session.dispose();
    });

    it("ignores an id the graph does not hold", () => {
        const harness = line();
        const selection = selectionOf(harness);

        selection.applyNow({ nodes: ["a", "gone"], edges: [edgeBetween(harness, "a", "b"), "999"] });

        assert.deepStrictEqual([...selection.nodes], ["a"]);
        assert.deepStrictEqual([...selection.edges], [edgeBetween(harness, "a", "b")]);
        harness.session.dispose();
    });
});

describe("the five set operations", () => {
    it("replaces, which is what a click does", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a", "b"] });

        selection.applyNow({ nodes: ["c"] }, "replace");

        assert.deepStrictEqual([...selection.nodes], ["c"]);
        harness.session.dispose();
    });

    it("replaces by default, so the operation is the thing a gesture names", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a", "b"] });

        selection.applyNow({ nodes: ["d"] });

        assert.deepStrictEqual([...selection.nodes], ["d"]);
        harness.session.dispose();
    });

    it("adds, removes, toggles and intersects", () => {
        const harness = line();
        const selection = selectionOf(harness);

        selection.applyNow({ nodes: ["a", "b"] });
        selection.applyNow({ nodes: ["c"] }, "add");
        assert.deepStrictEqual([...selection.nodes], ["a", "b", "c"]);

        selection.applyNow({ nodes: ["b"] }, "remove");
        assert.deepStrictEqual([...selection.nodes], ["a", "c"]);

        selection.applyNow({ nodes: ["a", "d"] }, "toggle");
        assert.deepStrictEqual([...selection.nodes], ["c", "d"], "what was in is out and what was out is in");

        selection.applyNow({ nodes: ["d", "a"] }, "intersect");
        assert.deepStrictEqual([...selection.nodes], ["d"]);
        harness.session.dispose();
    });

    it("applies the operation to both halves, because a target names both", () => {
        // A target that names no edges names an EMPTY edge set, not "leave the edges alone":
        // anything else would make replace and intersect do something no set operation does.
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a", "b"], edges: [edgeBetween(harness, "a", "b")] });

        selection.applyNow({ nodes: ["a"] }, "intersect");

        assert.deepStrictEqual([...selection.nodes], ["a"]);
        assert.deepStrictEqual([...selection.edges], [], "intersecting with a set holding no edges keeps no edges");
        harness.session.dispose();
    });

    it("empties on clear", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a"], edges: [edgeBetween(harness, "a", "b")] });

        const delta = selection.clear();

        assert.strictEqual(selection.size, 0);
        assert.deepStrictEqual([...delta.removed], ["a", edgeBetween(harness, "a", "b")]);
        harness.session.dispose();
    });

    it("refuses an operation that is not one of the five", () => {
        const harness = line();
        const selection = selectionOf(harness);

        assert.deepStrictEqual([...SET_OPS], ["replace", "add", "remove", "toggle", "intersect"]);
        assert.strictEqual(codeOf(() => selection.applyNow({ nodes: ["a"] }, "union" as SetOp)), "E_BAD_COMMAND");
        harness.session.dispose();
    });
});

describe("the delta every mutation answers with", () => {
    it("says what joined and what left, so nobody diffs two snapshots", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a", "b"] });

        const delta: SelectionDelta = selection.applyNow({ nodes: ["b", "c"] }, "replace");

        assert.deepStrictEqual([...delta.added], ["c"]);
        assert.deepStrictEqual([...delta.removed], ["a"]);
        assert.strictEqual(delta.nodes, 2);
        assert.strictEqual(delta.edges, 0);
        harness.session.dispose();
    });

    it("lists the nodes before the edges", () => {
        const harness = line();
        const selection = selectionOf(harness);

        const delta = selection.applyNow({ nodes: ["b"], edges: [edgeBetween(harness, "a", "b"), edgeBetween(harness, "b", "c")] });

        assert.deepStrictEqual([...delta.added], ["b", edgeBetween(harness, "a", "b"), edgeBetween(harness, "b", "c")]);
        harness.session.dispose();
    });

    it("answers with an empty delta when nothing moved", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a"] });

        const delta = selection.applyNow({ nodes: ["a"] }, "add");

        assert.deepStrictEqual([...delta.added], []);
        assert.deepStrictEqual([...delta.removed], []);
        harness.session.dispose();
    });

    it("records who asked, because a consumer reacts differently to a person", () => {
        const harness = line();
        const selection = selectionOf(harness);

        const asked: SelectionCause[] = ["user", "command"];

        assert.strictEqual(selection.applyNow({ nodes: ["a"] }).cause, "api", "the API is the default");

        for (const cause of asked) {
            assert.strictEqual(selection.applyNow({ nodes: ["b"] }, "add", cause).cause, cause);
        }
        harness.session.dispose();
    });

    it("always carries a path list, and carries unmatched ids only when there were some", () => {
        const harness = line();
        const selection = selectionOf(harness);

        const clean = selection.applyNow({ ids: ["a"] });
        const dirty = selection.applyNow({ ids: ["a", "nobody"] });

        assert.deepStrictEqual([...clean.unresolvedPaths], []);
        assert.isUndefined(clean.unmatched, "every id named something, so there is nothing to report");
        assert.deepStrictEqual(dirty.unmatched === undefined ? [] : [...dirty.unmatched], ["nobody"]);
        harness.session.dispose();
    });

    it("is frozen, so a consumer cannot edit the record of what happened", () => {
        const harness = line();
        const selection = selectionOf(harness);

        const delta = selection.applyNow({ nodes: ["a"] });

        assert.isTrue(Object.isFrozen(delta));
        assert.isTrue(Object.isFrozen(delta.added));
        harness.session.dispose();
    });
});

describe("the id arrays", () => {
    it("are frozen", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a"], edges: [edgeBetween(harness, "a", "b")] });

        assert.isTrue(Object.isFrozen(selection.nodes));
        assert.isTrue(Object.isFrozen(selection.edges));
        harness.session.dispose();
    });

    it("are identity-stable, so `previous === next` is a valid staleness test", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a", "b"] });

        const first = selection.nodes;

        assert.strictEqual(selection.nodes, first, "a read of an unchanged selection costs nothing");

        selection.applyNow({ nodes: ["a", "b"] }, "add");

        assert.strictEqual(selection.nodes, first, "a mutation that changed nothing is not a change");

        selection.applyNow({ nodes: ["c"] }, "add");

        assert.notStrictEqual(selection.nodes, first, "a mutation that changed something is");
        harness.session.dispose();
    });

    it("survive a graph that grew, because the contents are compared and not assumed", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a"] });
        const before = selection.nodes;

        harness.add([{ id: "e" }]);

        assert.strictEqual(selection.nodes, before, "a new node nobody selected did not change the selection");
        assert.isFalse(selection.has("e"));
        harness.session.dispose();
    });
});

describe("membership testing", () => {
    it("answers for a node and for an edge", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a"], edges: [edgeBetween(harness, "b", "c")] });

        assert.isTrue(selection.has("a"));
        assert.isTrue(selection.has(edgeBetween(harness, "b", "c")));
        assert.isFalse(selection.has("b"));
        assert.isFalse(selection.has(edgeBetween(harness, "a", "b")));
        harness.session.dispose();
    });

    it("reconciles with nothing and materialises nothing, so a render loop can ask per frame", () => {
        // The pin is indirect on purpose: what a render loop cannot afford is the work behind an
        // allocation, and the two pieces of work here are reading the store for a fresh snapshot
        // and rebuilding the id array. Neither happens.
        const harness = line();
        let snapshotReads = 0;
        const selection = createSelectionApi({
            snapshot: () => {
                snapshotReads += 1;

                return harness.store.getSnapshot();
            },
        });
        selection.applyNow({ nodes: ["a"], edges: [edgeBetween(harness, "a", "b")] });
        const materialised = selection.nodes;
        const reads = snapshotReads;

        for (let round = 0; round < 50_000; round++) {
            selection.has("a");
            selection.has("nobody");
            selection.has(7);
            selection.has(edgeBetween(harness, "a", "b"));
        }

        assert.strictEqual(snapshotReads, reads, "membership never went back to the store");
        assert.strictEqual(selection.nodes, materialised, "and never rebuilt the ids");
        harness.session.dispose();
    });

    it("skips a half that is empty rather than looking an id up in it", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a"] });

        assert.isFalse(selection.has(edgeBetween(harness, "a", "b")), "no edge is selected, so no edge can be a member");
        assert.isFalse(selection.has(1), "a number is never an edge id, so the edge half is not asked");
        harness.session.dispose();
    });
});

describe("the masks the model is built on", () => {
    it("hands out one byte per element, as a detached copy", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a", "c"], edges: [edgeBetween(harness, "b", "c")] });

        const nodes = selection.nodeMask();
        const edges = selection.edgeMask();
        nodes[1] = 1;

        assert.deepStrictEqual([...nodes], [1, 1, 1, 0], "the copy was edited");
        assert.deepStrictEqual([...selection.nodeMask()], [1, 0, 1, 0], "the model was not");
        assert.deepStrictEqual([...edges], [0, 1, 0]);
        harness.session.dispose();
    });

    it("follows a freeze that renumbered the elements", () => {
        // Only the remap carries a renumbering, so the session delivers it. A mask that did not
        // follow would go on selecting whatever now sits at the old index.
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a", "c"] });

        // a leaves the graph and everything after it moves down one.
        selection.remapNodes(Uint32Array.from([INVALID_INDEX, 0, 1, 2]), 3);

        assert.strictEqual(selection.nodeMembers().size, 1, "the member that left the graph left the selection");
        assert.isTrue(selection.nodeMembers().has(1), "and the one that survived moved to its new index");
        assert.isFalse(selection.nodeMembers().has(2));
        harness.session.dispose();
    });

    it("answers has() against the new numbering once a freeze has renumbered the nodes", () => {
        // has() skips the sync to stay free of allocation, so it reads a cached frame holding the
        // previous snapshot's id map. A remap arrives from inside the freeze, where asking the
        // store for the new snapshot would re-enter it, so the frame is marked stale instead and
        // the next read rebuilds it. Without that mark, has() looks an id up in the old map, tests
        // whatever now sits at that row, and reports a selected node as unselected.
        // A renumbering is a freeze, so the snapshot the ids are read through changes at the same
        // moment the mask bits move. The second harness is that graph: "a" gone, so "b" sits at 0
        // where it used to sit at 1, which is exactly what the remap below says.
        const before = line();
        const after = harnessOf([{ id: "b" }, { id: "c" }, { id: "d" }], [{ src: "b", dst: "c" }, { src: "c", dst: "d" }]);
        let frozen = false;
        const selection = createSelectionApi({
            snapshot: () => (frozen ? after.store.getSnapshot() : before.store.getSnapshot()),
        });
        selection.applyNow({ nodes: ["b"] });

        assert.isTrue(selection.has("b"), "selected before the freeze");

        frozen = true;
        selection.remapNodes(Uint32Array.from([INVALID_INDEX, 0, 1, 2]), 3);

        assert.isTrue(selection.has("b"), "still selected after the renumbering");
        assert.isFalse(selection.has("c"), "and a node that was never selected still is not");
        before.session.dispose();
        after.session.dispose();
    });

    it("follows a freeze that renumbered the edges", () => {
        const harness = line();
        const selection = selectionOf(harness);
        selection.applyNow({ edges: [edgeBetween(harness, "a", "b"), edgeBetween(harness, "c", "d")] });

        selection.remapEdges(Uint32Array.from([0, INVALID_INDEX, 1]), 2);

        assert.strictEqual(selection.edgeMembers().size, 2);
        assert.isTrue(selection.edgeMembers().has(0));
        assert.isTrue(selection.edgeMembers().has(1));
        harness.session.dispose();
    });

    it("drops a member whose row the graph no longer has", () => {
        const harness = harnessOf([{ id: "a" }, { id: "b" }]);
        const selection = selectionOf(harness);
        selection.applyNow({ nodes: ["a", "b"] });

        selection.nodeMembers().grow(1);

        assert.deepStrictEqual([...selection.nodes], ["a"]);
        harness.session.dispose();
    });
});

describe("the cap", () => {
    it("is five thousand elements unless the session says otherwise", () => {
        const harness = line();

        assert.strictEqual(selectionOf(harness).cap, DEFAULT_SELECTION_CAP);
        assert.strictEqual(selectionOf(harness, { cap: () => 12 }).cap, 12);
        harness.session.dispose();
    });

    it("truncates rather than selecting two million things in silence", () => {
        const harness = line();
        const selection = selectionOf(harness, { cap: () => 2 });

        const delta = selection.applyNow({ nodes: ["a", "b", "c", "d"] });

        assert.deepStrictEqual([...selection.nodes], ["a", "b"]);
        assert.isTrue(delta.truncated);
        assert.isTrue(selection.truncated);
        harness.session.dispose();
    });

    it("keeps the nodes before the edges, and the same ones every time", () => {
        const harness = line();
        const first = selectionOf(harness, { cap: () => 3 });
        const second = selectionOf(harness, { cap: () => 3 });

        first.applyNow({ nodes: ["a", "b", "c"], edges: [edgeBetween(harness, "a", "b"), edgeBetween(harness, "b", "c")] });
        second.applyNow({ nodes: ["c", "b", "a"], edges: [edgeBetween(harness, "b", "c"), edgeBetween(harness, "a", "b")] });

        assert.deepStrictEqual([...first.nodes], ["a", "b", "c"]);
        assert.deepStrictEqual([...first.edges], [], "the cap was reached before the edge half");
        assert.deepStrictEqual([...second.nodes], [...first.nodes], "a truncated selection is reproducible");
        harness.session.dispose();
    });

    it("stops being truncated once the selection fits again", () => {
        const harness = line();
        const selection = selectionOf(harness, { cap: () => 2 });
        selection.applyNow({ nodes: ["a", "b", "c"] });

        selection.applyNow({ nodes: ["a"] });

        assert.isFalse(selection.truncated);
        assert.isFalse(selection.clear().truncated);
        harness.session.dispose();
    });

    it("refuses a cap that is not a whole number of elements, before it changes anything", () => {
        const harness = line();
        let cap = 2;
        const selection = selectionOf(harness, { cap: () => cap });
        selection.applyNow({ nodes: ["a"] });
        cap = 2.5;

        assert.strictEqual(codeOf(() => selection.cap), "E_OPTION_RANGE");
        assert.strictEqual(codeOf(() => selection.applyNow({ nodes: ["d"] })), "E_OPTION_RANGE");
        assert.deepStrictEqual([...selection.nodes], ["a"], "the selection is what it was before the refusal");
        harness.session.dispose();
    });
});

describe("statistics over the selection", () => {
    /** Four nodes carrying a number and a category, in a line. */
    function measured(): Harness {
        return harnessOf(
            [
                { id: "a", size: 10, kind: "host" },
                { id: "b", size: 20, kind: "host" },
                { id: "c", size: 30, kind: "service" },
                { id: "d", size: 40, kind: "service" },
            ],
            [
                { src: "a", dst: "b" },
                { src: "b", dst: "c" },
                { src: "c", dst: "d" },
            ],
        );
    }

    it("counts the edges the selection holds together and the edges it cuts", async () => {
        const harness = measured();
        const selection = selectionOf(harness, { records: recordsOf(harness) });
        selection.applyNow({ nodes: ["a", "b"] });

        const statistics: SelectionStatistics = await selection.statistics();

        assert.strictEqual(statistics.nodes, 2);
        assert.strictEqual(statistics.edges, 0, "no edge was selected");
        assert.strictEqual(statistics.inducedEdges, 1, "a:b has both endpoints inside");
        assert.strictEqual(statistics.cutEdges, 1, "b:c has exactly one");
        harness.session.dispose();
    });

    it("summarises a number against the same number across the whole graph", async () => {
        const harness = measured();
        const selection = selectionOf(harness, { records: recordsOf(harness) });
        selection.applyNow({ nodes: ["a", "b"] });

        const [size]: readonly SelectionAttributeStatistics[] = (await selection.statistics()).attributes;

        assert.strictEqual(size.path, "data.size");
        assert.strictEqual(size.plainName, "size");
        assert.strictEqual(size.mean, 15);
        assert.strictEqual(size.min, 10);
        assert.strictEqual(size.max, 20);
        assert.strictEqual(size.graphMean, 25);
        assert.strictEqual(size.direction, "below");
        harness.session.dispose();
    });

    it("says a selection of everything sits exactly on the average", async () => {
        // The two averages are computed by the same function over the same values in the same
        // order, so "equal" is reachable rather than lost in the last bits of two summations.
        const harness = measured();
        const selection = selectionOf(harness, { records: recordsOf(harness) });
        selection.applyNow({ nodes: ["a", "b", "c", "d"] });

        const [size] = (await selection.statistics()).attributes;

        assert.strictEqual(size.direction, "equal");
        harness.session.dispose();
    });

    it("divides a non-numeric attribute into its values, commonest first", async () => {
        const harness = measured();
        const selection = selectionOf(harness, { records: recordsOf(harness) });
        selection.applyNow({ nodes: ["a", "b", "c"] });

        const kind = (await selection.statistics()).attributes.find((entry) => entry.path === "data.kind");

        assert.deepStrictEqual(kind?.distribution === undefined ? [] : [...kind.distribution], [
            { value: "host", count: 2 },
            { value: "service", count: 1 },
        ]);
        assert.isUndefined(kind?.mean, "a category has no average");
        harness.session.dispose();
    });

    it("describes no attributes when the session holds none, and none when nothing is selected", async () => {
        const harness = measured();
        const attributeless = selectionOf(harness);
        attributeless.applyNow({ nodes: ["a"] });
        const empty = selectionOf(harness, { records: recordsOf(harness) });

        assert.deepStrictEqual([...(await attributeless.statistics()).attributes], []);
        assert.deepStrictEqual([...(await empty.statistics()).attributes], []);
        assert.strictEqual((await empty.statistics()).cutEdges, 0);
        harness.session.dispose();
    });
});

describe("keeping a selection under a name", () => {
    it("saves the selected nodes as a scope anything can resolve", () => {
        const harness = line();
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });
        const selection = selectionOf(harness, { scope });
        selection.applyNow({ nodes: ["a", "b"], edges: [edgeBetween(harness, "a", "b")] });

        const id = selection.promote("Core hosts");

        assert.strictEqual(id, "set_core-hosts");
        assert.deepStrictEqual([...scope.resolveNow({ set: id }).nodes].sort(), ["a", "b"]);
        harness.session.dispose();
    });

    it("refuses to save nothing, and refuses when the session keeps no scopes", () => {
        const harness = line();
        const scope = createScopeApi({ snapshot: () => harness.store.getSnapshot() });
        const withScopes = selectionOf(harness, { scope });
        const without = selectionOf(harness);
        without.applyNow({ nodes: ["a"] });

        assert.strictEqual(codeOf(() => withScopes.promote("empty")), "E_SCOPE_EMPTY");
        assert.strictEqual(codeOf(() => without.promote("nowhere")), "E_UNSUPPORTED");
        harness.session.dispose();
    });
});

describe("what a scope reads off the selection", () => {
    it("resolves the selection scope from the one set the session holds", () => {
        const harness = line();
        const selection = selectionOf(harness);
        const scope = createScopeApi({
            snapshot: () => harness.store.getSnapshot(),
            selection: { nodes: () => selection.nodeMembers() },
        });
        selection.applyNow({ nodes: ["a", "b"] });

        const resolved = scope.resolveNow("selection");

        assert.deepStrictEqual([...resolved.nodes].sort(), ["a", "b"]);
        assert.deepStrictEqual([...resolved.edges], [edgeBetween(harness, "a", "b")], "a scope's edges are induced from its nodes");

        selection.applyNow({ nodes: ["c"] }, "add");

        assert.strictEqual(scope.resolveNow("selection").nodeCount, 3, "and it follows the selection");
        harness.session.dispose();
    });
});

describe("the sources a selection was built with", () => {
    it("is a plain object, so a session hands in only what it has", () => {
        const harness = line();
        const sources: SelectionSources = { snapshot: () => harness.store.getSnapshot() };
        const owner: SelectionOwner = createSelectionApi(sources);
        const published: SelectionApi = owner;
        const ids: readonly NodeId[] = published.nodes;

        assert.deepStrictEqual([...ids], []);
        assert.strictEqual(owner.edgeMembers().size, 0);
        harness.session.dispose();
    });
});
