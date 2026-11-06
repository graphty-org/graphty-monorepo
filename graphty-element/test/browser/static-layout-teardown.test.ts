/**
 * @file A static layout lets go of the edges a replacing import, or its undo, tears down.
 *
 * A static layout only marks a removed node or edge, and sweeps its lists at the next read. The
 * element's layouts read the graph snapshot, never the edge list, so before issue #6006 the edges
 * were swept only as a side effect of something else reading them: the frame loop's walk (which
 * skips it while a load holds the draw, and never runs when no frame does) or strict state's check
 * after each pass. With neither, every edge a replacing import or its undo took out stayed in the
 * engine, holding its two nodes and their meshes. At the 100,000-node ceiling each load left about
 * 900 MB behind, and history-scale.bench.test.ts ran the page out of memory.
 *
 * So this test runs as a consumer's page does: strict state off, and no frame running.
 */

import { afterEach, assert, beforeEach, it } from "vitest";

import { type Graph, operationQueueOf } from "../../src/Graph";
import { simpleLayoutInternals, StaticLayoutEngine } from "../../src/layout/LayoutEngine";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

const NODES = 200;

type StrictScope = { __GRAPHTY_STRICT_STATE__?: boolean };
let graph: Graph | null = null;
let strictBefore: boolean | undefined;

beforeEach(() => {
    // Strict state checks after every pass that the engine can place every drawn edge, and that
    // read sweeps the list: on, it would hide the leak this test is for.
    strictBefore = (globalThis as StrictScope).__GRAPHTY_STRICT_STATE__;
    (globalThis as StrictScope).__GRAPHTY_STRICT_STATE__ = false;
});

afterEach(() => {
    (globalThis as StrictScope).__GRAPHTY_STRICT_STATE__ = strictBefore;
    if (graph !== null) {
        cleanupTestGraph(graph);
        graph = null;
    }
});

it("a replacing import and its undo leave no torn-down edge in a static layout", async () => {
    graph = await createTestGraph();
    graph.engine.stopRenderLoop();
    await graph.setLayout("random");
    const session = graph.getSession();
    const queue = operationQueueOf(graph);
    const data = JSON.stringify({
        nodes: Array.from({ length: NODES }, (_, at) => ({ id: `v${String(at)}` })),
        edges: Array.from({ length: NODES / 2 }, (_, at) => ({
            src: `v${String(2 * at)}`,
            dst: `v${String(2 * at + 1)}`,
        })),
    });
    await session.data.import({ type: "json", config: { data } });
    await queue.waitForCompletion();
    const engine = graph.getLayoutManager().layoutEngine;
    assert(engine instanceof StaticLayoutEngine, "the random layout is a static layout");
    assert.deepEqual(simpleLayoutInternals.held(engine), { nodes: NODES, edges: NODES / 2 }, "the graph is held");

    await session.data.import(
        { type: "json", config: { data: '{"nodes":[{"id":"r"}],"edges":[]}' } },
        { mode: "replace" },
    );
    await queue.waitForCompletion();
    assert.strictEqual(graph.getLayoutManager().layoutEngine, engine, "the same engine arranged the new graph");
    assert.deepEqual(simpleLayoutInternals.held(engine), { nodes: 1, edges: 0 }, "a replacing import");

    await session.undo();
    await queue.waitForCompletion();
    assert.deepEqual(simpleLayoutInternals.held(engine), { nodes: NODES, edges: NODES / 2 }, "its undo");

    await session.redo();
    await queue.waitForCompletion();
    assert.deepEqual(simpleLayoutInternals.held(engine), { nodes: 1, edges: 0 }, "its redo");
});
