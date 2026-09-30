/**
 * @file What undo costs in time on a real `Graph` at the largest graph it draws, derivation pass
 * and all: the render objects an undo tears down or builds again are the dominant cost, and a
 * headless session has none. See design/undo/undo-design.md sections 7 and 12.6.
 *
 * Runs in the `browser-bench` project, never under coverage, with strict state off. The graph is
 * the element's node ceiling (`DEFAULT_LIMITS.renderCeiling`, 50,000 today) with half as many
 * edges, laid out once by a one-shot layout, with the render loop stopped so nothing but the
 * undo moves, and loaded as the baseline, so `restoreTo(null)` returns to it. A million nodes is
 * past that ceiling and the element refuses to load it (`E_TOO_LARGE`), so there is no
 * million-node run here; what a history retains at a million nodes is checked in Node by
 * `test/session/history/scale.test.ts`.
 *
 * Each forward operation is left to finish -- its queue turns and the tasks after them -- before
 * its undo is timed, so an undo is not charged for the work before it. Every budget is a ratio
 * against loading the same graph, measured in this page at this moment, so a busy runner slows
 * both sides alike.
 *
 * That includes the garbage the work before it left: the page runs with `--expose-gc` (the
 * "browser-bench" project in vitest.config.ts) and each step is timed from a fully collected heap.
 * Without it, the loaded graph holds about 1.1 GB of heap, and whether V8's next major collection
 * starts, or finishes, inside a timed step depends on how full the heap happened to be, not on
 * the step. On CI (4-vCPU runners, 44 runs from 2026-09-28 to 2026-09-29) that made undoing the
 * removal trimodal -- about 250, 540 or 800 ms against a load of about 3,450 ms -- and put a drag
 * at 65 or 640 ms and restoreTo(null) at 300 or 900 ms, whichever branch ran. The 800 ms mode is a
 * ratio of 0.21 to 0.24 against the load, and on the runners that load in about 2,100 ms it
 * reached 0.26 and failed. On four cores of the development machine the same thing gave 121 to
 * 709 ms (3 failures in 29 runs); from a collected heap, 169 to 215 ms in 10 runs.
 *
 * Measured on the development machine (i9-14900, headless Chromium without WebGPU), 50,000 nodes
 * and 25,000 edges, printed by each test as `[undo-scale-browser]`, which a CI log carries too:
 *
 *   loading the graph, drawn                            1,500 to 2,300 ms
 *   undoing the removal of 1,000 nodes                    110 to 240 ms
 *   undoing a drag, at rest                                40 to 60 ms
 *   undoing a replacing import                          1,400 to 2,300 ms
 *   restoreTo(null) over those steps                      210 to 260 ms
 *
 * NOT A BUDGET HERE, REPORTED: tearing the whole graph down -- a replacing import, a clear, or
 * undoing the load -- takes about 20 s at this size, because every node's mesh dispose searches
 * and splices the scene's mesh list. That is the renderer's cost of removing a node, which a
 * forward clear pays as well; the replacing import below prints it. Tracked by
 * https://github.com/graphty-org/graphty-monorepo/issues/543, which turns this into a budget.
 */

import { Vector3 } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { DEFAULT_LIMITS } from "../../src/session/limits";

const NODES = DEFAULT_LIMITS.renderCeiling;
const EDGES = NODES / 2;
const TIMEOUT_MS = 300_000;

/**
 * Run a full garbage collection, so the next timed step does not pay for one the steps before it
 * made due. Needs the page started with `--js-flags=--expose-gc`.
 */
function collectGarbage(): void {
    const { gc } = globalThis as { gc?: () => void };
    if (gc === undefined) {
        throw new Error("gc() is missing: the browser-bench project must launch Chromium with --js-flags=--expose-gc");
    }

    gc();
}

/**
 * Report a timing.
 * @param what - What was timed.
 * @param ms - How long it took.
 */
function report(what: string, ms: number): void {
    console.log(`[undo-scale-browser] ${what}: ${ms.toFixed(1)} ms`);
}

/**
 * Time an async call, derivation pass included: every call here settles once the picture has
 * caught up.
 * @param work - The call.
 * @returns Milliseconds.
 */
async function time(work: () => Promise<unknown>): Promise<number> {
    const start = performance.now();
    await work();
    return performance.now() - start;
}

describe("undo on a real graph at the largest graph it draws", () => {
    let graph: Graph;
    let container: HTMLElement;
    let loadMs = 0;

    /** Let what a forward operation queued, and the tasks after it, finish. */
    const idle = async (): Promise<void> => {
        await operationQueueOf(graph).waitForCompletion();
        await new Promise((resolve) => setTimeout(resolve, 0));
        collectGarbage();
    };

    beforeAll(async () => {
        (globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        graph.engine.stopRenderLoop();
        await graph.setLayout("random");
        const session = graph.getSession();
        const json = JSON.stringify({
            nodes: Array.from({ length: NODES }, (_, at) => ({ id: `v${String(at)}` })),
            edges: Array.from({ length: EDGES }, (_, at) => ({
                src: `v${String(2 * at)}`,
                dst: `v${String(2 * at + 1)}`,
            })),
        });
        // The load's own promise settles before the repaint its queue turn triggers; the graph is
        // drawn once the queue is idle, which is what an undo that rebuilds it waits for too.
        loadMs = await time(async () => {
            await session.data.import({ type: "json", config: { data: json } });
            await operationQueueOf(graph).waitForCompletion();
        });
        report(`loading ${String(NODES)} nodes and ${String(EDGES)} edges`, loadMs);
        assert.strictEqual(session.snapshot().nodeCount, NODES);
        await idle();
        session.history.clear();
    }, TIMEOUT_MS);

    // Disposing a graph this size tears down every node's render objects, which takes as long as
    // the replacing import below reports (issue #543), well past the default hook timeout.
    afterAll(() => {
        graph.dispose();
        container.remove();
    }, TIMEOUT_MS);

    it(
        "undoing the removal of 1,000 nodes costs a small part of the load",
        async () => {
            const session = graph.getSession();
            await session.data.removeNodes(Array.from({ length: 1000 }, (_, at) => `v${String(10_000 + 7 * at)}`));
            await idle();
            const ms = await time(() => session.undo());
            report("undoing the removal of 1,000 nodes", ms);
            assert.strictEqual(session.snapshot().nodeCount, NODES);
            // Redone before the budget is checked, so a missed budget fails this test alone: the
            // tests below start from the removal done.
            await session.redo();
            await idle();
            assert.isBelow(ms, loadMs / 4);
        },
        TIMEOUT_MS,
    );

    it(
        "undoing a drag at rest costs a small part of the load",
        async () => {
            const session = graph.getSession();
            const node = graph.getNode("v3");
            assert.isDefined(node);
            const { dragHandler } = node;
            assert.isDefined(dragHandler, "the node can be dragged");
            const before = session.history.steps.length;
            const start = node.mesh.position.clone();
            dragHandler.onDragStart(start);
            dragHandler.onDragUpdate(start.add(new Vector3(40, 30, 0)));
            dragHandler.onDragEnd();
            // The drop records once the frame after it has run; the render loop is stopped.
            for (let wait = 0; wait < 500 && session.history.steps.length === before; wait++) {
                graph.getUpdateManager().stepFrames(1);
                await new Promise((resolve) => setTimeout(resolve, 10));
            }

            assert.lengthOf(session.history.steps, before + 1, "the drop recorded one step");
            await idle();
            const ms = await time(() => session.undo());
            report("undoing a drag, at rest", ms);
            await session.redo();
            await idle();
            assert.isBelow(ms, loadMs / 4);
        },
        TIMEOUT_MS,
    );

    it(
        "undoing a replacing import costs about what the load it brings back cost",
        async () => {
            const session = graph.getSession();
            const replacing = await time(async () => {
                await session.data.import(
                    { type: "json", config: { data: '{"nodes":[{"id":"r"}],"edges":[]}' } },
                    { mode: "replace" },
                );
                await idle();
            });
            report("a replacing import, tearing the graph down (not a budget)", replacing);
            const ms = await time(() => session.undo());
            report("undoing a replacing import", ms);
            assert.strictEqual(session.snapshot().nodeCount, NODES - 1000);
            // Only the parse is saved; every render object is built again.
            assert.isBelow(ms, 1.5 * loadMs);
            await idle();
        },
        TIMEOUT_MS,
    );

    it(
        "restoreTo(null) over those steps costs less than the load",
        async () => {
            const session = graph.getSession();
            const ms = await time(() => session.history.restoreTo(null));
            report("restoreTo(null) over those steps", ms);
            assert.strictEqual(session.snapshot().nodeCount, NODES);
            assert.isBelow(ms, loadMs);
        },
        TIMEOUT_MS,
    );
});
