/**
 * @file Two edges between one pair of nodes, which the element could not hold until now.
 *
 * THREE SEPARATE MECHANISMS used to prevent it: the data manager dropped a repeated record before
 * the store could see it, `processPendingEdges` dropped it again for an edge whose endpoints had
 * not arrived, and `EdgeMap.set` threw on a second edge for a pair. The loss was undetectable from
 * outside: `statistics().repeatedEdgeCount` is implemented and correct and was structurally pinned
 * at zero, because the repeats never reached the store that would have counted them, while the
 * number the element DID publish about the load counted records handed over and so reported them
 * as present.
 *
 * The default is now `keep`. A consumer who wants one edge per pair says so, in one word, and can
 * measure what that cost them.
 */
import { assert, describe, test } from "vitest";

import { isGraphtyError } from "../../src/errors";
import type { Graph } from "../../src/Graph";

/**
 * A graph over a fresh canvas with three nodes and nothing joining them yet.
 * @returns the graph
 */
async function makeGraph(): Promise<Graph> {
    document.body.innerHTML = '<canvas id="parallel-canvas"></canvas>';
    const { Graph: GraphClass } = await import("../../src/Graph.js");
    const graph = new GraphClass(document.getElementById("parallel-canvas") as HTMLCanvasElement);
    await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }], undefined, { skipQueue: true });
    return graph;
}

/** The weight one edge carries in the graph's snapshot. */
function weightOf(graph: Graph, edgeIndex: number): number {
    const snapshot = graph.getDataManager().getSnapshot();
    const { weights, edgeToArc } = snapshot;
    return weights === null ? 1 : weights[edgeToArc[edgeIndex] ?? 0];
}

describe("the default, which is to keep both", () => {
    test("two records for one ordered pair become two edges with two ids", async () => {
        const graph = await makeGraph();
        await graph.addEdges(
            [
                { source: "a", target: "b", label: "first" },
                { source: "a", target: "b", label: "second" },
            ],
            { skipQueue: true },
        );

        const session = graph.getSession();
        const ids = [...(await session.scope.resolve("graph")).edges];
        assert.strictEqual(ids.length, 2, "both edges are in the graph's scope");
        assert.strictEqual(new Set(ids).size, 2, "under two distinct ids");
        assert.strictEqual(graph.getDataManager().edges.size, 2, "and both have render objects");
        assert.strictEqual(session.data.snapshot().edgeCount, 2, "and both have store rows");
        assert.strictEqual(
            session.data.edge(ids[0])?.label,
            "first",
            "each keeps the attributes its own record arrived with",
        );
        assert.strictEqual(session.data.edge(ids[1])?.label, "second");
        graph.dispose();
    });

    test("statistics stop reporting zero repeats for a graph that has them", async () => {
        // `repeatedEdgeCount` has always been correct and always been zero, because the repeats
        // were dropped before the store could count them. The application renders a "parallel
        // edges" row off this number and suppresses it on zero, so that row has never appeared.
        const graph = await makeGraph();
        await graph.addEdges(
            [
                { source: "a", target: "b" },
                { source: "a", target: "b" },
                { source: "a", target: "b" },
                { source: "b", target: "c" },
            ],
            { skipQueue: true },
        );

        const statistics = graph.getSession().data.statistics();
        assert.strictEqual(statistics.edgeCount, 4);
        assert.strictEqual(statistics.repeatedEdgeCount, 2, "three edges for one pair are two repeats");
        graph.dispose();
    });
});

describe("what each repeat policy does to the second record", () => {
    test("first keeps the edge already there, weight and all", async () => {
        const graph = await makeGraph();
        await graph.addEdges([{ source: "a", target: "b", weight: 2 }], { repeated: "first", skipQueue: true });
        await graph.addEdges([{ source: "a", target: "b", weight: 9 }], { repeated: "first", skipQueue: true });

        assert.strictEqual(graph.getSession().data.snapshot().edgeCount, 1);
        assert.strictEqual(weightOf(graph, 0), 2, "the first record's weight survived");
        graph.dispose();
    });

    test("last takes the repeat's weight and its attributes", async () => {
        const graph = await makeGraph();
        await graph.addEdges([{ source: "a", target: "b", weight: 2, label: "old" }], { repeated: "last", skipQueue: true });
        await graph.addEdges([{ source: "a", target: "b", weight: 9, label: "new" }], { repeated: "last", skipQueue: true });

        const session = graph.getSession();
        assert.strictEqual(session.data.snapshot().edgeCount, 1);
        assert.strictEqual(weightOf(graph, 0), 9);
        assert.strictEqual(session.data.edge([...(await session.scope.resolve("graph")).edges][0])?.label, "new");
        graph.dispose();
    });

    test("sum adds the group's weights into the one edge that survives", async () => {
        const graph = await makeGraph();
        await graph.addEdges([{ source: "a", target: "b", weight: 2 }], { repeated: "sum", skipQueue: true });
        await graph.addEdges([{ source: "a", target: "b", weight: 9 }], { repeated: "sum", skipQueue: true });

        assert.strictEqual(graph.getSession().data.snapshot().edgeCount, 1);
        assert.strictEqual(weightOf(graph, 0), 11);
        graph.dispose();
    });

    test("min and max reduce over the group rather than taking an arrival order", async () => {
        const low = await makeGraph();
        await low.addEdges([{ source: "a", target: "b", weight: 2 }], { repeated: "min", skipQueue: true });
        await low.addEdges([{ source: "a", target: "b", weight: 9 }], { repeated: "min", skipQueue: true });
        assert.strictEqual(weightOf(low, 0), 2);
        low.dispose();

        const high = await makeGraph();
        await high.addEdges([{ source: "a", target: "b", weight: 2 }], { repeated: "max", skipQueue: true });
        await high.addEdges([{ source: "a", target: "b", weight: 9 }], { repeated: "max", skipQueue: true });
        assert.strictEqual(weightOf(high, 0), 9);
        high.dispose();
    });

    test("error refuses the repeat and names both endpoints", async () => {
        const graph = await makeGraph();
        await graph.addEdges([{ source: "a", target: "b" }], { repeated: "error", skipQueue: true });

        let thrown: unknown;
        try {
            await graph.addEdges([{ source: "a", target: "b" }], { repeated: "error", skipQueue: true });
        } catch (error) {
            thrown = error;
        }

        assert.isTrue(isGraphtyError(thrown));
        if (isGraphtyError(thrown)) {
            // A repeated edge has its own code. It used to borrow E_DUPLICATE_ID, which a caller
            // also gets for a repeated NODE id, so a handler could not tell the two apart.
            assert.strictEqual(thrown.code, "E_DUPLICATE_EDGE");
            assert.strictEqual(thrown.details?.source, "a");
            assert.strictEqual(thrown.details?.target, "b");
        }

        graph.dispose();
    });
});

describe("what the load report says about the repeats it saw", () => {
    test("counts them, and the four numbers add up", async () => {
        const graph = await makeGraph();
        await graph.addEdges(
            [
                { source: "a", target: "b" },
                { source: "a", target: "b" },
                { source: "b", target: "c" },
            ],
            { skipQueue: true },
        );

        const report = graph.getSession().data.lastImport();
        assert.isNotNull(report);
        assert.strictEqual(report?.repeated.seen, 1);
        assert.strictEqual(report?.repeated.kept, 1, "under keep, every repeat becomes an edge of its own");
        assert.strictEqual(report?.repeated.dropped, 0);
        assert.strictEqual(report?.repeated.merged, 0);
        assert.strictEqual(report?.policy, "keep");
        assert.strictEqual(report?.counts.edgeRecords, 3, "three records arrived");
        assert.strictEqual(report?.counts.edges, 3, "and the graph holds three edges");
        graph.dispose();
    });

    test("counts a dropped repeat as dropped, and a merged one as merged", async () => {
        const dropped = await makeGraph();
        await dropped.addEdges(
            [
                { source: "a", target: "b" },
                { source: "a", target: "b" },
            ],
            { repeated: "first", skipQueue: true },
        );

        const droppedReport = dropped.getSession().data.lastImport();
        assert.strictEqual(droppedReport?.repeated.dropped, 1);
        assert.strictEqual(droppedReport?.counts.edges, 1, "the graph's edge count, not the record count");
        assert.strictEqual(droppedReport?.counts.edgeRecords, 2);
        dropped.dispose();

        const merged = await makeGraph();
        await merged.addEdges(
            [
                { source: "a", target: "b", weight: 1 },
                { source: "a", target: "b", weight: 1 },
            ],
            { repeated: "sum", skipQueue: true },
        );

        assert.strictEqual(merged.getSession().data.lastImport()?.repeated.merged, 1);
        merged.dispose();
    });
});

describe("re-adding data the graph already holds", () => {
    test("the expand path is still idempotent, because it asks for first", async () => {
        // Under `keep`, an additive re-add of a node's neighbourhood would double every edge
        // already present -- and the double-click expand handler fetches a neighbourhood and adds
        // it on every expand. The element knows that about its own call site, so it passes the
        // policy rather than leaving the consumer to discover the doubling.
        const graph = await makeGraph();
        const neighbourhood = [
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ];

        graph.getDataManager().addEdges([...neighbourhood], { repeated: "first" });
        graph.getDataManager().addEdges([...neighbourhood], { repeated: "first" });

        assert.strictEqual(graph.getDataManager().edges.size, 2, "the second expand added nothing");
        graph.dispose();
    });

    test("assigning edge-data again replaces the edges rather than adding to them", async () => {
        const graph = await makeGraph();
        const records = [
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ];

        await graph.setEdges([...records], { skipQueue: true });
        await graph.setEdges([...records], { skipQueue: true });

        assert.strictEqual(graph.getSession().data.snapshot().edgeCount, 2, "still two edges, not four");
        graph.dispose();
    });
});

describe("an algorithm run over a multigraph", () => {
    test("says in its caveats how many parallel edges it had to merge", async () => {
        // `@graphty/algorithms` cannot represent a multigraph and does not say so: a second
        // parallel edge silently replaces the first in its adjacency while `edgeCount` counts
        // both, so the graph handed to an algorithm is internally inconsistent. The element
        // simplifies first, summing weights, and the caveat is how a reader learns that.
        const graph = await makeGraph();
        await graph.addEdges(
            [
                { source: "a", target: "b" },
                { source: "a", target: "b" },
                { source: "b", target: "c" },
            ],
            { skipQueue: true },
        );

        const run = graph.getSession().runs.start("degree");
        await run;

        const notes = run.caveats.notes.join(" ");
        assert.include(notes, "parallel", "the merge is named on the result rather than only in a design document");
        assert.include(notes, "1 parallel edge was merged", "and the count is the graph's repeat count");
        graph.dispose();
    });

    test("lands its per-edge values on every member of a merged group, not just the survivor", async () => {
        // The simplification that lets an algorithm run over a multigraph folds a group of
        // parallel edges into one. If the result were then published against only the edge that
        // survived the fold, a style layer bound to the run would paint one of two coincident
        // lines and leave the other unpainted -- which reads as a rendering glitch rather than as
        // a result, and is invisible to any test that counts values instead of naming edges.
        const graph = await makeGraph();
        await graph.addEdges(
            [
                { source: "a", target: "b", weight: 1 },
                { source: "a", target: "b", weight: 1 },
                { source: "b", target: "c", weight: 1 },
            ],
            { skipQueue: true },
        );

        const session = graph.getSession();
        const run = session.runs.start("shortest-path", { method: "dijkstra", source: "a", target: "c" });
        const result = await run;

        const parallelIds = [...(await session.scope.resolve("graph")).edges].filter((id) => {
            const record = session.data.edge(id);
            return record?.source === "a" && record.target === "b";
        });

        assert.strictEqual(parallelIds.length, 2, "the two records really are two edges");
        for (const id of parallelIds) {
            assert.isDefined(result.edge(id), `the run answers for ${id}, which is one of the merged group`);
        }

        graph.dispose();
    });
});
