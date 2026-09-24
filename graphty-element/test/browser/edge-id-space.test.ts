/**
 * @file One id space for edges, asserted across every surface that names an edge.
 *
 * This is the join that fails silently. A style layer bound to a run reads a value by asking the
 * run for the id of the edge at a dense row, and asking the result what it published for that id.
 * If the two sides mint ids differently -- and until now there were FOUR independent
 * implementations of the pair-string convention, two of them carrying a doc comment claiming to be
 * the only one -- every edge-valued layer paints nothing at all, reports no error, and looks
 * exactly like a layer whose selector matched nothing.
 *
 * So the assertion is not "the ids look right". It is that an id taken from one surface is
 * accepted by every other one.
 */
import { assert, describe, test } from "vitest";

import type { Graph } from "../../src/Graph";

/**
 * A three-node path over a fresh canvas, with a weight on each edge.
 * @returns the graph
 */
async function makeGraph(): Promise<Graph> {
    document.body.innerHTML = '<canvas id="id-space-canvas"></canvas>';
    const { Graph: GraphClass } = await import("../../src/Graph.js");
    const graph = new GraphClass(document.getElementById("id-space-canvas") as HTMLCanvasElement);
    await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }], undefined, { skipQueue: true });
    await graph.addEdges(
        [
            { source: "a", target: "b", weight: 2 },
            { source: "b", target: "c", weight: 3 },
        ],
        { skipQueue: true },
    );
    return graph;
}

describe("an edge id taken from one surface is accepted by the others", () => {
    test("the scope, the data surface, the selection and the style explanation all mean the same edge", async () => {
        const graph = await makeGraph();
        const session = graph.getSession();

        const ids = [...(await session.scope.resolve("graph")).edges];
        assert.strictEqual(ids.length, 2);

        for (const id of ids) {
            const record = session.data.edge(id);
            assert.isDefined(record, `the scope named ${id}, so the data surface must know it`);
            assert.strictEqual(record?.id, id, "and it answers under the id it was asked by");

            const delta = await session.selection.apply({ edges: [id] });
            assert.deepStrictEqual([...session.selection.edges], [id], "the selection holds exactly that edge");
            assert.strictEqual(delta.edges, 1, "one edge entered the selection");

            // `explain` refuses an id the graph does not hold, so reaching an answer at all is the
            // assertion: the style stack resolves this id in the same space.
            const explanation = session.styles.explain({ edge: id });
            assert.isDefined(explanation);
        }

        graph.dispose();
    });

    test("a run publishes per-edge values under ids the rest of the session can read back", async () => {
        const graph = await makeGraph();
        const session = graph.getSession();

        const run = session.runs.start("shortest-path", { method: "dijkstra", source: "a", target: "c" }, { as: "route" });
        const result = await run;

        const ids = [...(await session.scope.resolve("graph")).edges];
        let measured = 0;
        for (const id of ids) {
            const values = result.edge(id);
            if (values !== undefined) {
                measured++;
                assert.isDefined(session.data.edge(id), "the run named an edge the graph holds");
            }
        }

        assert.strictEqual(measured, ids.length, "every edge the graph holds is addressable in the run's answer");
        graph.dispose();
    });

    test("an id the graph never handed out names nothing, rather than resolving by accident", async () => {
        const graph = await makeGraph();
        const session = graph.getSession();

        assert.isUndefined(session.data.edge("999"));
        // The old ids, which a saved scope or a persisted selection could still be carrying.
        assert.isUndefined(session.data.edge("a:b"));

        const delta = await session.selection.apply({ edges: ["a:b"] });
        assert.deepStrictEqual([...session.selection.edges], [], "an unknown id selects nothing");
        assert.strictEqual(delta.edges, 0, "nothing entered the selection");
        graph.dispose();
    });
});
