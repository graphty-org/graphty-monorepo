/**
 * @file The working graph's view (design/working-graph/design.md sections 1 and 6): the part of the
 * original graph the visibility filter and the time window leave shown, derived with
 * graph-format's `inducedSubgraph` and `filterEdges`, built once per filter state, shared by every
 * reader, and handed to a run over what is shown instead of a derivation of its own. Builds and
 * derivations are counted, never timed.
 */

import { INVALID_INDEX, maskTest } from "@graphty/graph-format";
import { assert, beforeEach, describe, it } from "vitest";

import { DerivedInputs } from "../../src/algorithms/input/derivedInputs";
import { createScopedInput, type RunInput, scopedInputCounters } from "../../src/algorithms/input/ScopedInput";
import { createGraphSession, scopeResolverOfSession, workingGraphOfSession } from "../../src/session/GraphSession";
import { resolutionBehind } from "../../src/session/scope/ScopeApi";
import type { RuleTree, TimeWindow } from "../../src/session/visibility";
import { workingViewCounters } from "../../src/session/working/view";
import { type Harness, makeSession } from "./helpers";

/** Three hosts and two services in a line, each edge carrying a strength. */
function harnessOf(): Harness {
    const harness = makeSession();
    harness.add(
        [
            { id: "a", type: "host", seen: 1 },
            { id: "b", type: "host", seen: 2 },
            { id: "c", type: "host", seen: 3 },
            { id: "d", type: "service", seen: 4 },
            { id: "e", type: "service", seen: 5 },
        ],
        [
            { src: "a", dst: "b", strength: 5 },
            { src: "b", dst: "c", strength: 1 },
            { src: "c", dst: "d", strength: 5 },
            { src: "d", dst: "e", strength: 5 },
        ],
    );
    harness.session.workingGraph = true;

    return harness;
}

/** Only the hosts. */
const HOSTS: RuleTree = { kind: "categories", attribute: "data.type", values: ["host"] };

/** The first two moments of the timeline; a window is half-open. */
const EARLY: TimeWindow = { attribute: "data.seen", from: 1, to: 3 };

/**
 * A snapshot's node ids, in row order.
 * @param snapshot - The snapshot.
 * @param snapshot.nodeCount - How many nodes it holds.
 * @param snapshot.ids - Its id map.
 * @param snapshot.ids.idOf - The id of a row.
 * @returns The ids.
 */
function idsOf(snapshot: { nodeCount: number; ids: { idOf(row: number): unknown } }): string[] {
    return Array.from({ length: snapshot.nodeCount }, (_, row) => String(snapshot.ids.idOf(row)));
}

beforeEach(() => {
    workingViewCounters.builds = 0;
    scopedInputCounters.derivations = 0;
});

describe("the option", () => {
    it("is off by default, and a reader naming no scope then reads the whole graph", async () => {
        const harness = makeSession();
        harness.add(
            [
                { id: "a", type: "host" },
                { id: "d", type: "service" },
            ],
            [{ src: "a", dst: "d" }],
        );
        await harness.session.visibility.set(HOSTS);

        assert.isFalse(harness.session.workingGraph);
        const view = workingGraphOfSession(harness.session).view();
        assert.isTrue(view.whole);
        assert.strictEqual(view.snapshot, harness.store.getSnapshot());
        assert.strictEqual(workingViewCounters.builds, 0);
        harness.session.dispose();
    });

    it("is taken from createGraphSession and can be switched later", () => {
        const on = createGraphSession({ workingGraph: true });
        assert.isTrue(on.workingGraph);
        on.workingGraph = false;
        assert.isFalse(on.workingGraph);
        on.dispose();

        const off = createGraphSession();
        assert.isFalse(off.workingGraph);
        off.dispose();
    });
});

describe("the view", () => {
    it("is the snapshot itself, with no build, while nothing is hidden", () => {
        const harness = harnessOf();
        const view = workingGraphOfSession(harness.session).view();

        assert.isTrue(view.whole);
        assert.strictEqual(view.snapshot, harness.store.getSnapshot());
        assert.isNull(view.nodeOrigin);
        assert.strictEqual(workingViewCounters.builds, 0);
        harness.session.dispose();
    });

    it("holds only what the filter shows, with row maps both ways", async () => {
        const harness = harnessOf();
        await harness.session.visibility.set(HOSTS);
        const view = workingGraphOfSession(harness.session).view();
        const graph = harness.store.getSnapshot();

        assert.isFalse(view.whole);
        assert.strictEqual(view.graph, graph);
        assert.deepStrictEqual(idsOf(view.snapshot), ["a", "b", "c"]);
        assert.strictEqual(view.snapshot.edgeCount, 2);
        assert.strictEqual(view.nodeCount, 3);
        assert.strictEqual(view.edgeCount, 2);
        assert.strictEqual(workingViewCounters.builds, 1);
        assert.strictEqual(scopedInputCounters.derivations, 1, "the induce alone: no edge is hidden among shown nodes");

        const { nodeOrigin, nodeRows, edgeOrigin, edgeRows } = view;
        assert.isNotNull(nodeOrigin);
        assert.isNotNull(nodeRows);
        assert.isNotNull(edgeOrigin);
        assert.isNotNull(edgeRows);
        for (let row = 0; row < view.snapshot.nodeCount; row++) {
            assert.strictEqual(graph.ids.idOf(nodeOrigin[row]), view.snapshot.ids.idOf(row));
            assert.strictEqual(nodeRows[nodeOrigin[row]], row);
        }
        for (const id of ["d", "e"]) {
            const row = graph.ids.indexOf(id);
            assert.strictEqual(nodeRows[row], INVALID_INDEX);
            assert.isFalse(maskTest(view.nodes, row));
        }
        for (let row = 0; row < view.snapshot.edgeCount; row++) {
            assert.strictEqual(edgeRows[edgeOrigin[row]], row);
        }
        harness.session.dispose();
    });

    it("is built once per filter state and shared by every reader of it", async () => {
        const harness = harnessOf();
        await harness.session.visibility.set(HOSTS);
        const working = workingGraphOfSession(harness.session);

        const first = working.view();
        assert.strictEqual(working.view(), first);
        assert.strictEqual(working.view("visible"), first);
        // A change that is not the filter, the window or the data leaves the view alone.
        await harness.session.selection.apply({ nodes: ["a"] }, "replace");
        assert.strictEqual(working.view(), first);
        assert.strictEqual(workingViewCounters.builds, 1);
        harness.session.dispose();
    });

    it("gives the whole graph by name, whatever is hidden", async () => {
        const harness = harnessOf();
        await harness.session.visibility.set(HOSTS);
        const whole = workingGraphOfSession(harness.session).view("graph");

        assert.isTrue(whole.whole);
        assert.strictEqual(whole.snapshot, harness.store.getSnapshot());
        assert.strictEqual(whole.nodeCount, 5);
        assert.strictEqual(workingViewCounters.builds, 0);
        harness.session.dispose();
    });

    it("is rebuilt when the filter changes, the window moves or the data changes", async () => {
        const harness = harnessOf();
        const working = workingGraphOfSession(harness.session);

        await harness.session.visibility.set(HOSTS);
        assert.deepStrictEqual(idsOf(working.view().snapshot), ["a", "b", "c"]);
        assert.strictEqual(workingViewCounters.builds, 1);

        await harness.session.visibility.setWindow(EARLY);
        assert.deepStrictEqual(idsOf(working.view().snapshot), ["a", "b"]);
        assert.strictEqual(workingViewCounters.builds, 2);

        harness.add([{ id: "f", type: "host", seen: 2 }], [{ src: "a", dst: "f", strength: 5 }]);
        assert.deepStrictEqual(idsOf(working.view().snapshot), ["a", "b", "f"]);
        assert.strictEqual(working.view().snapshot.edgeCount, 2);
        assert.strictEqual(workingViewCounters.builds, 3);

        await harness.session.visibility.setWindow(null);
        await harness.session.visibility.set(null);
        assert.isTrue(working.view().whole);
        assert.strictEqual(workingViewCounters.builds, 3);
        harness.session.dispose();
    });

    it("filters the edges too when a filter hides an edge between shown nodes", async () => {
        const harness = harnessOf();
        await harness.session.visibility.set({ kind: "threshold", path: "data.strength", above: 2 });
        const view = workingGraphOfSession(harness.session).view();

        assert.strictEqual(view.snapshot.nodeCount, harness.session.visibility.summary.visibleNodes);
        assert.strictEqual(view.snapshot.edgeCount, 3);
        assert.strictEqual(scopedInputCounters.derivations, 2, "the induce, then the edge filter");
        harness.session.dispose();
    });
});

describe("a run over what is shown", () => {
    /**
     * A run over the visible graph, resolved the way a run resolves it, with its own cache.
     * @param harness - The session.
     * @returns The run input.
     */
    function visibleRun(harness: Harness): RunInput {
        const resolved = scopeResolverOfSession(harness.session).resolveNow("visible");
        const behind = resolutionBehind(resolved);
        assert.isDefined(behind);

        return { inputs: new DerivedInputs(), holder: {}, scope: () => behind };
    }

    it("takes the shared view instead of deriving its own", async () => {
        const harness = harnessOf();
        await harness.session.visibility.set(HOSTS);
        const view = workingGraphOfSession(harness.session).view();
        const before = scopedInputCounters.derivations;

        const one = createScopedInput(harness.store, "declared", undefined, visibleRun(harness));
        const two = createScopedInput(harness.store, "declared", undefined, visibleRun(harness));

        assert.strictEqual(one.subgraph(), view.snapshot);
        assert.strictEqual(two.subgraph(), view.snapshot);
        assert.strictEqual(scopedInputCounters.derivations, before, "no run derived again");
        harness.session.dispose();
    });

    it("builds the view when a run asks first, and the next reader shares it", async () => {
        const harness = harnessOf();
        await harness.session.visibility.set(HOSTS);

        const input = createScopedInput(harness.store, "declared", undefined, visibleRun(harness));
        const snapshot = input.subgraph();

        assert.strictEqual(workingGraphOfSession(harness.session).view().snapshot, snapshot);
        assert.strictEqual(workingViewCounters.builds, 1);
        assert.strictEqual(scopedInputCounters.derivations, 1);
        harness.session.dispose();
    });

    it("derives its own, as today, with the option off", async () => {
        const harness = harnessOf();
        harness.session.workingGraph = false;
        await harness.session.visibility.set(HOSTS);

        const input = createScopedInput(harness.store, "declared", undefined, visibleRun(harness));
        assert.deepStrictEqual(idsOf(input.subgraph()), ["a", "b", "c"]);
        assert.strictEqual(workingViewCounters.builds, 0);
        assert.strictEqual(scopedInputCounters.derivations, 1);
        harness.session.dispose();
    });

    it("does not take the view for a scope that is not what is shown", async () => {
        const harness = harnessOf();
        await harness.session.visibility.set(HOSTS);
        const resolved = scopeResolverOfSession(harness.session).resolveNow({ nodes: ["a", "b"] });
        const behind = resolutionBehind(resolved);
        assert.isDefined(behind);

        const input = createScopedInput(harness.store, "declared", undefined, {
            inputs: new DerivedInputs(),
            holder: {},
            scope: () => behind,
        });

        assert.deepStrictEqual(idsOf(input.subgraph()), ["a", "b"]);
        assert.strictEqual(workingViewCounters.builds, 0, "a scope that differs builds no view");
        harness.session.dispose();
    });
});
