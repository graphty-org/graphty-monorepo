/**
 * @file A run over a set, through a real graph (design/sets/sets-design.md section 10): values are
 * published for the set only, the run says what it computed on, its scope record names the set's
 * size and reading, and a node option outside the set is refused before any work.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { WHOLE_GRAPH_CAVEAT } from "../../../src/algorithms/input/maskBack";
import { isGraphtyError } from "../../../src/errors";
import { Graph } from "../../../src/Graph";
import type { ElementSession } from "../../../src/session/types";

/** Forty nodes on a path. */
const IDS = Array.from({ length: 40 }, (_, index) => `n${String(index)}`);

describe("a run over a set", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.addNodes(IDS.map((id) => ({ id })));
        await graph.addEdges(IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id })));
        await graph.operationQueue.waitForCompletion();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("a PageRank over a 20-node set reports 20 values, says it computed on them, and measured 20 nodes", async () => {
        const session = graph.getSession() as ElementSession;
        const id = session.sets.create({ kind: "fixed", nodes: IDS.slice(0, 20), reading: "induced" }, { name: "First half" });

        const run = session.runs.start("pagerank", {}, { scope: { set: id } });
        const result = await run;

        assert.strictEqual(result.column("value").length, 20);
        assert.isDefined(result.node("n0"));
        assert.isUndefined(result.node("n30"));
        assert.include(run.record.caveats.notes, "Computed on the induced subgraph of 20 nodes.");
        assert.notInclude(run.record.caveats.notes, WHOLE_GRAPH_CAVEAT);
        assert.strictEqual(run.record.scope.nodes, 20);
        assert.strictEqual(run.record.scope.reading, "induced");
        assert.deepStrictEqual(run.record.scope.set, { id, revision: session.sets.get(id)?.revision });
        // PageRank computes over its scope, so what it measured is the set.
        assert.strictEqual(result.measured.nodes, 20);
    });

    it("a run over the whole graph carries no scope caveat", async () => {
        const session = graph.getSession() as ElementSession;
        const run = session.runs.start("pagerank", {}, { scope: "graph" });
        const result = await run;

        assert.strictEqual(result.column("value").length, 40);
        assert.notInclude(run.record.caveats.notes, WHOLE_GRAPH_CAVEAT);
    });

    it("a source outside the set is refused E_OPTION_RANGE with outside-scope", async () => {
        const session = graph.getSession() as ElementSession;
        const id = session.sets.create({ kind: "fixed", nodes: IDS.slice(0, 20), reading: "induced" }, { name: "First half" });

        let error: unknown;
        try {
            await session.runs.start("shortest-path", { source: "n30", target: "n1" }, { scope: { set: id } });
        } catch (caught) {
            error = caught;
        }

        assert.isTrue(isGraphtyError(error), String(error));
        if (isGraphtyError(error)) {
            assert.strictEqual(error.code, "E_OPTION_RANGE");
            assert.strictEqual(error.details?.reason, "outside-scope");
        }
    });
});
