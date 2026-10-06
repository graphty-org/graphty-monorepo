/**
 * @file A file's declared direction, all the way through the element's own import path.
 *
 * The importers are tested against the corpus in `test/data/declared-direction.test.ts`; this asks
 * the question a consumer asks, of the object a consumer holds. `graph.addDataFromSource(...)`
 * followed by `graph.getSession().data.statistics()` is the route a settings panel, a counts
 * readout and an algorithm picker all take, and it is the route that used to answer "directed" for
 * every file ever loaded.
 *
 * karate.gml is the shipped sample this is measured on: 34 nodes, 78 edges, and no `directed` key
 * anywhere in it, which under GML's own rules makes it undirected.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import fsmDot from "../helpers/corpus/dot/fsm.gv?raw";
import karateGml from "../helpers/corpus/gml/karate.gml?raw";

describe("the direction the element reports for a loaded file", () => {
    let container: HTMLDivElement;
    let graph: Graph;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("reads the karate club sample as the undirected graph its format says it is", async () => {
        await graph.addDataFromSource("gml", { data: karateGml });
        await operationQueueOf(graph).waitForCompletion();

        const stats = graph.getSession().data.statistics();
        assert.strictEqual(stats.nodeCount, 34);
        assert.strictEqual(stats.edgeCount, 78);
        assert.strictEqual(stats.directedness, "undirected");

        // The number a Counts panel prints. Read as a digraph the same 78 edges are measured
        // against twice as many possible pairs, which halves it to 0.0695.
        assert.closeTo(stats.density, 78 / ((34 * 33) / 2), 1e-12);
    });

    it("reads a digraph as directed", async () => {
        await graph.addDataFromSource("dot", { data: fsmDot });
        await operationQueueOf(graph).waitForCompletion();

        assert.strictEqual(graph.getSession().data.statistics().directedness, "directed");
    });

    it("leaves an explicit data.directed standing over the file's own header", async () => {
        // The store locks its direction when `data.directed` is a boolean, so the file's own
        // header cannot change it.
        await graph.getSession().config.set({ data: { directed: true } });

        await graph.addDataFromSource("gml", { data: karateGml });
        await operationQueueOf(graph).waitForCompletion();

        const stats = graph.getSession().data.statistics();
        assert.strictEqual(stats.edgeCount, 78, "the import succeeded rather than throwing E_DIRECTED");
        assert.strictEqual(stats.directedness, "directed", "the consumer settled it, not the file");
    });

    it("re-reads a loaded graph in the direction data.directed is set to, and undo puts it back (#837)", async () => {
        await graph.addDataFromSource("gml", { data: karateGml });
        await operationQueueOf(graph).waitForCompletion();
        const session = graph.getSession();

        await session.config.set({ data: { directed: true } });
        let stats = session.data.statistics();
        assert.strictEqual(stats.directedness, "directed");
        assert.strictEqual(stats.edgeCount, 78, "every edge is kept");

        await session.undo();
        stats = session.data.statistics();
        assert.strictEqual(stats.directedness, "undirected", "the file's own reading is back");
        assert.strictEqual(stats.edgeCount, 78);
    });
});
