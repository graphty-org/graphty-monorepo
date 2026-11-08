/**
 * @file The session's readers over the working graph (design/working-graph/design.md sections 4
 * and 5). With the `workingGraph` option on, a reader that names no scope answers over what the
 * filter and the time window leave shown, and over the whole graph when it names it; with the
 * option off, every reader answers over the whole graph as before. A filter drops what it hides
 * from the selection (owner decision B); the time window does not. Opening a project restores the
 * filter before its runs, so a run over what is shown comes back current.
 */

import { assert, describe, it } from "vitest";

import { createRunResult } from "../../src/session/results";
import type { RunExecutionContext, RunOutcome } from "../../src/session/runs";
import type { RuleTree, TimeWindow } from "../../src/session/visibility";
import { type Harness, makeSession } from "./helpers";

/**
 * A run that gives every node the value 1, whatever it was asked.
 * @param context - The run.
 * @returns Its outcome.
 */
function executeOnes(context: RunExecutionContext): Promise<RunOutcome> {
    const result = createRunResult({
        runId: context.runId,
        shape: "node-metric",
        fields: [
            {
                name: "value",
                plainName: "One",
                technicalName: "one",
                kind: "node",
                type: "number",
                path: "results.$.value",
            },
        ],
        measured: { nodes: 1, edges: 0 },
        nodes: [{ id: "a", values: { value: 1 } }],
        edges: [],
        caveats: { exact: true, direction: "as-loaded", precision: "f64", method: "one", facts: [], notes: [] },
        durationMs: 1,
    });
    return Promise.resolve({ result, summary: result.summary() });
}

/**
 * Three hosts and two services in a line.
 * @param working - Whether the session reads the working graph.
 * @returns The harness.
 */
function harnessOf(working = true): Harness {
    const harness = makeSession({ runs: { execute: executeOnes } });
    harness.add(
        [
            { id: "a", type: "host", seen: 1 },
            { id: "b", type: "host", seen: 2 },
            { id: "c", type: "host", seen: 3 },
            { id: "d", type: "service", seen: 4 },
            { id: "e", type: "service", seen: 5 },
        ],
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
            { src: "d", dst: "e" },
        ],
    );
    harness.session.workingGraph = working;

    return harness;
}

/** Only the hosts. */
const HOSTS: RuleTree = { kind: "categories", attribute: "data.type", values: ["host"] };

/** The first two moments; a window is half-open. */
const EARLY: TimeWindow = { attribute: "data.seen", from: 1, to: 3 };

describe("the data readers", () => {
    it("count what is shown when they name no scope, and everything when they name the graph", async () => {
        const harness = harnessOf();
        const { data } = harness.session;
        await harness.session.visibility.set(HOSTS);

        assert.strictEqual(data.statistics().nodeCount, 3);
        assert.strictEqual(data.statistics().edgeCount, 2);
        assert.strictEqual(data.statistics({ scope: "all" }).nodeCount, 5);

        assert.strictEqual(data.nodePage({ limit: 10 }).total, 3);
        assert.strictEqual(data.nodePage({ limit: 10, scope: "graph" }).total, 5);
        assert.strictEqual(data.edgePage({ limit: 10 }).total, 2);
        assert.strictEqual(data.edgePage({ limit: 10, scope: "graph" }).total, 4);

        const counts = data.valueCounts("data.type");
        assert.deepStrictEqual(
            counts.values.map(({ value, count }) => [value, count]),
            [["host", 3]],
        );
        assert.strictEqual(counts.total, 3);
        assert.strictEqual(data.valueCounts("data.type", { scope: "graph" }).total, 5);

        const histogram = data.histogram({ kind: "node", name: "type" });
        assert.strictEqual(histogram.kind, "categorical");
        assert.deepStrictEqual(
            histogram.kind === "categorical" ? histogram.values.map(({ value, count }) => [value, count]) : [],
            [["host", 3]],
        );
        const whole = data.histogram({ kind: "node", name: "type" }, { scope: "graph" });
        assert.strictEqual(whole.kind === "categorical" ? whole.values.length : 0, 2);
        harness.session.dispose();
    });

    it("list a node's shown neighbors, and its hidden ones too, marked, when they name the graph", async () => {
        const harness = harnessOf();
        const { data } = harness.session;
        await harness.session.visibility.set(HOSTS);

        assert.deepStrictEqual(
            data.neighbors("c").records.map((each) => each.node.id),
            ["b"],
        );
        const all = data.neighbors("c", { scope: "graph" }).records;
        assert.deepStrictEqual(
            all.map((each) => [each.node.id, each.excludedBy?.kind ?? null]),
            [
                ["b", null],
                ["d", "filter"],
            ],
        );
        harness.session.dispose();
    });

    it("measure a node's degree among what is shown, and in the whole graph by name", async () => {
        const harness = harnessOf();
        const { data } = harness.session;
        await harness.session.visibility.set(HOSTS);

        assert.strictEqual(data.structureValue("c", "graphty.degree"), 1);
        assert.strictEqual(data.structureValue("c", "graphty.degree", { scope: "graph" }), 2);
        assert.isUndefined(data.structureValue("d", "graphty.degree"), "a hidden node has no degree in the view");
        harness.session.dispose();
    });

    it("read the whole graph, as before, with the option off", async () => {
        const harness = harnessOf(false);
        const { data } = harness.session;
        await harness.session.visibility.set(HOSTS);

        assert.strictEqual(data.statistics().nodeCount, 5);
        assert.strictEqual(data.nodePage({ limit: 10 }).total, 5);
        assert.strictEqual(data.valueCounts("data.type").total, 5);
        assert.strictEqual(data.neighbors("c").records.length, 2);
        assert.strictEqual(data.structureValue("c", "graphty.degree"), 2);
        harness.session.dispose();
    });
});

describe("the selection under a filter", () => {
    it("adds up its degrees and edges over what is shown, and over the whole graph with the option off", async () => {
        for (const working of [true, false]) {
            const harness = harnessOf(working);
            const { session } = harness;
            await session.visibility.set(HOSTS);
            await session.selection.apply({ nodes: ["b", "c"] }, "replace");
            const stats = await session.selection.statistics();
            if (working) {
                // c's edge to the hidden d is not shown: b has 2 edges and c 1, and b-a alone leaves.
                assert.deepStrictEqual(stats.degree, { min: 1, max: 2 });
                assert.strictEqual(stats.cutEdges, 1);
            } else {
                assert.deepStrictEqual(stats.degree, { min: 2, max: 2 });
                assert.strictEqual(stats.cutEdges, 2);
            }
            assert.strictEqual(stats.inducedEdges, 1, "b-c");
            session.dispose();
        }
    });

    it("drops what the filter hides, and clearing the filter does not bring it back", async () => {
        const harness = harnessOf();
        const { session } = harness;
        await session.selection.apply({ nodes: ["a", "d"] }, "replace");

        await session.visibility.set(HOSTS);
        assert.deepStrictEqual([...session.selection.nodes], ["a"]);

        await session.visibility.set(null);
        assert.deepStrictEqual([...session.selection.nodes], ["a"]);
        session.dispose();
    });

    it("comes back when the filter step is undone", async () => {
        const harness = harnessOf();
        const { session } = harness;
        await session.selection.apply({ nodes: ["a", "d"] }, "replace");

        await session.visibility.set(HOSTS);
        await session.undo();
        assert.sameMembers([...session.selection.nodes], ["a", "d"]);
        session.dispose();
    });

    it("keeps a node the time window hides", async () => {
        const harness = harnessOf();
        const { session } = harness;
        await session.selection.apply({ nodes: ["a", "c"] }, "replace");

        await session.visibility.setWindow(EARLY);
        assert.sameMembers([...session.selection.nodes], ["a", "c"]);
        session.dispose();
    });

    it("never selects a node the filter hides, by id or mixed with shown ones", async () => {
        const harness = harnessOf();
        const { session } = harness;
        await session.visibility.set(HOSTS);

        await session.selection.apply({ nodes: ["d"] }, "replace");
        assert.deepStrictEqual([...session.selection.nodes], [], "a hidden node is dropped (decision B)");
        await session.selection.apply({ nodes: ["a", "b", "d", "e"] }, "replace");
        assert.sameMembers([...session.selection.nodes], ["a", "b"]);
        session.dispose();
    });

    it("selects only shown neighbors, and never walks through a hidden node", async () => {
        const harness = harnessOf();
        const { session } = harness;
        // a-b-c-d-e with b hidden: a's neighborhood is a alone, even two steps out.
        await session.visibility.addCondition({
            effect: "exclude",
            rule: { kind: "range", attribute: "data.seen", min: 2, max: 2 },
        });
        assert.isFalse(session.visibility.isVisible("b"));
        await session.selection.apply({ neighborsOf: ["c"] }, "replace");
        assert.sameMembers([...session.selection.nodes], ["c", "d"]);
        await session.selection.apply({ neighborsOf: ["a"], depth: 2 }, "replace");
        assert.sameMembers([...session.selection.nodes], ["a"]);
        session.dispose();
    });

    it("inverts within what is shown", async () => {
        const harness = harnessOf();
        const { session } = harness;
        await session.visibility.set(HOSTS);
        await session.selection.apply({ nodes: ["a"] }, "replace");
        await session.selection.apply({ invert: true }, "replace");
        assert.sameMembers([...session.selection.nodes], ["b", "c"]);
        session.dispose();
    });

    it("keeps selecting a node the time window alone hides", async () => {
        const harness = harnessOf();
        const { session } = harness;
        await session.visibility.setWindow(EARLY);
        assert.isFalse(session.visibility.isVisible("c"));
        await session.selection.apply({ nodes: ["c"] }, "replace");
        assert.sameMembers([...session.selection.nodes], ["c"]);
        session.dispose();
    });

    it("keeps what the filter hides with the option off, as before", async () => {
        const harness = harnessOf(false);
        const { session } = harness;
        await session.selection.apply({ nodes: ["a", "d"] }, "replace");

        await session.visibility.set(HOSTS);
        assert.sameMembers([...session.selection.nodes], ["a", "d"]);
        session.dispose();
    });
});

describe("opening a project", () => {
    it("restores the filter before the runs, so a run over what is shown comes back current", async () => {
        const harness = harnessOf();
        const { session } = harness;
        await session.visibility.set(HOSTS);
        await session.runs.start("degree");
        assert.isNull(session.runs.list()[0]?.stale ?? null);
        const { text } = await session.project.save();

        const reopened = harnessOf();
        await reopened.session.project.open(text, { discard: true });
        assert.strictEqual(reopened.session.data.statistics().nodeCount, 3);
        const back = reopened.session.runs.list()[0];
        assert.isDefined(back);
        assert.isNull(back.stale, "the run's scope is the filter's, not the unfiltered graph's");
        session.dispose();
        reopened.session.dispose();
    });

    for (const working of [true, false]) {
        it(`keeps a run made before the filter out of date (option ${working ? "on" : "off"})`, async () => {
            const harness = harnessOf(working);
            const { session } = harness;
            await session.runs.start("degree");
            await session.visibility.set(HOSTS);
            assert.deepInclude(session.runs.list()[0]?.stale, { reason: "scope-changed", ranOn: 5, nowVisible: 3 });
            const { text } = await session.project.save();

            const reopened = harnessOf(working);
            await reopened.session.project.open(text, { discard: true });
            const back = reopened.session.runs.list()[0];
            assert.isDefined(back);
            assert.deepInclude(
                back.stale,
                { reason: "scope-changed", ranOn: 5, nowVisible: 3 },
                "it ran on the whole graph, not on what the file shows",
            );
            session.dispose();
            reopened.session.dispose();
        });
    }
});

describe("a Top-N style rule", () => {
    /** The two latest nodes. */
    const latest = (within?: "graph" | "visible"): RuleTree => ({
        kind: "threshold",
        path: "data.seen",
        top: 2,
        ...(within === undefined ? {} : { within }),
    });

    it("ranks the whole column by default, and only what is shown within the view", async () => {
        const harness = harnessOf();
        const { session } = harness;
        const whole = await session.styles.add({
            name: "Latest",
            target: "node",
            selector: { match: "rule", where: latest() },
            set: { "node.color": "#ff0000" },
        });
        const shown = await session.styles.add({
            name: "Latest shown",
            target: "node",
            selector: { match: "rule", where: latest("visible") },
            set: { "node.color": "#00ff00" },
        });

        await session.visibility.set(HOSTS);
        await session.styles.settled();
        // The whole column's top two (d, e) are hidden; among what is shown they are b and c.
        assert.strictEqual(session.styles.counts(whole.id).visible?.matched, 0);
        assert.strictEqual(session.styles.counts(shown.id).visible?.matched, 2);
        assert.strictEqual(session.styles.counts(shown.id).matched, 2);

        // Its facts are ranked the same way: three are shown, so a top five takes three.
        await session.styles.update(shown.id, {
            selector: { match: "rule", where: { kind: "threshold", path: "data.seen", top: 5, within: "visible" } },
        });
        assert.deepStrictEqual(session.styles.counts(shown.id).tops, [
            { code: "top.fewerMeasured", params: { path: "data.seen", n: 5, taken: 3, ties: "fewer" } },
        ]);
        session.dispose();
    });

    it("cannot rank within what a filter shows inside the filter itself", async () => {
        const harness = harnessOf();
        let reason: unknown;
        try {
            await harness.session.visibility.set(latest("visible"));
        } catch (error) {
            reason = (error as { details?: { reason?: unknown } }).details?.reason;
        }

        assert.strictEqual(reason, "circular-scope");
        harness.session.dispose();
    });
});

describe("a style layer's categories", () => {
    /**
     * A session with a layer coloring every node by its type, and only the hosts shown.
     * @param working - Whether the session reads the working graph.
     * @returns The harness and the layer's id.
     */
    async function byType(working: boolean): Promise<{ harness: Harness; id: string }> {
        const harness = harnessOf(working);
        const layer = await harness.session.styles.add({
            name: "By type",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.type", scale: "ordinal", palette: "okabe-ito" } },
        });
        await harness.session.visibility.set(HOSTS);
        await harness.session.styles.settled();
        return { harness, id: layer.id };
    }

    it("count and list what is shown with the option on", async () => {
        const { harness, id } = await byType(true);
        const { styles } = harness.session;

        assert.deepStrictEqual(
            styles.categories(id, "node.color").map(({ value, count }) => [value, count]),
            [
                ["host", 3],
                ["service", 0],
            ],
        );
        assert.deepStrictEqual(
            styles.groups(id, "data.type").map(({ value, count }) => [value, count]),
            [
                ["host", 3],
                ["service", 0],
            ],
        );
        const block = styles.legend().find((each) => each.layerId === id && each.channel === "node.color");
        assert.deepStrictEqual(
            block?.swatches.map((swatch) => swatch.value),
            ["host"],
            "a legend row is a category that is shown",
        );
        harness.session.dispose();
    });

    it("count a layer's matches among what is shown, and the whole graph by name", async () => {
        const { harness, id } = await byType(true);
        const { styles } = harness.session;
        const shown = styles.counts(id);
        assert.strictEqual(shown.matched, 3);
        assert.strictEqual(shown.painted["node.color"], 3);
        assert.strictEqual(styles.counts(id, { scope: "graph" }).matched, 5);
        harness.session.dispose();
    });

    it("count the whole graph with the option off, as before", async () => {
        const { harness, id } = await byType(false);
        assert.strictEqual(harness.session.styles.counts(id).matched, 5);
        harness.session.dispose();
    });

    it("count and list the whole graph with the option off, as before", async () => {
        const { harness, id } = await byType(false);
        const { styles } = harness.session;

        assert.deepStrictEqual(
            styles.categories(id, "node.color").map(({ value, count }) => [value, count]),
            [
                ["host", 3],
                ["service", 2],
            ],
        );
        const block = styles.legend().find((each) => each.layerId === id && each.channel === "node.color");
        assert.deepStrictEqual(
            block?.swatches.map((swatch) => swatch.value),
            ["host", "service"],
        );
        harness.session.dispose();
    });
});
