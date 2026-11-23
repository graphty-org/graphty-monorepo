/**
 * @file An algorithm run over a graph mixing directed and undirected edges (#309) says how it read
 * them: every edge alike, with the graph's default direction.
 */
import { assert, describe, test } from "vitest";

import { Graph } from "../../src/Graph";

describe("an algorithm run over a graph mixing directed and undirected edges", () => {
    test("says in its caveats that every edge was read with the graph's direction", async () => {
        document.body.innerHTML = '<canvas id="mixed-canvas"></canvas>';
        const graph = new Graph(document.getElementById("mixed-canvas") as HTMLCanvasElement);
        await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }], undefined, { skipQueue: true });
        await graph.addEdges(
            [
                { source: "a", target: "b" },
                { source: "b", target: "c", directed: false },
            ],
            { skipQueue: true },
        );
        const session = graph.getSession();
        assert.strictEqual(session.data.statistics().directedness, "mixed");

        const run = session.runs.start("degree");
        await run;

        assert.deepInclude(run.caveats.facts, { code: "direction.mixed", params: { directed: true } });
        graph.dispose();
    });
});
