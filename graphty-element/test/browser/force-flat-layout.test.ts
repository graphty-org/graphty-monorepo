/**
 * @file A flat force layout is the `force` layout with `dim: 2`, or the 2D view, on a real `Graph`.
 *
 * `force-2d` is a deprecated alias for force drawn by `arf`. The 2D view draws flat whatever `dim`
 * was asked for, `session.layout.arrangedDimension` says what is actually drawn, d3 takes `dim`,
 * and an option name the engine does not declare is warned about.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { laneOf } from "../../src/session/GraphSession";
import type { GraphSession } from "../../src/session/types";

/** Per-test budget: each builds a real Babylon scene. */
const TEST_TIMEOUT_MS = 30_000;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }

    vi.restoreAllMocks();
});

/**
 * A real `Graph` holding a small connected graph.
 * @returns The graph.
 */
async function loadedGraph(): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    await graph.setLayout("circular");
    await graph.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }, { id: "n4" }, { id: "n5" }]);
    await graph.addEdges([
        { src: "n1", dst: "n2" },
        { src: "n2", dst: "n3" },
        { src: "n3", dst: "n4" },
        { src: "n4", dst: "n5" },
        { src: "n5", dst: "n1" },
        { src: "n1", dst: "n3" },
    ]);
    await operationQueueOf(graph).waitForCompletion();
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

/**
 * Let the layout run for a while, then come to rest.
 * @param graph - The graph.
 */
async function settle(graph: Graph): Promise<void> {
    await operationQueueOf(graph).waitForCompletion();
    for (let frame = 0; frame < 30; frame++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    await graph.waitForSettled();
}

/**
 * The largest |z| of any node.
 * @param session - The session.
 * @returns It.
 */
function maxDepth(session: GraphSession): number {
    const coords = laneOf(session).view(session.snapshot().nodeCount);
    let depth = 0;
    for (let i = 2; i < coords.length; i += 3) {
        depth = Math.max(depth, Math.abs(coords[i]));
    }

    return depth;
}

describe("a flat force layout", () => {
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "reads force-2d as force drawn by arf, flat in the 3D view",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();

            await session.layout.set("force-2d");
            await settle(graph);

            assert.strictEqual(session.layout.id, "force");
            assert.strictEqual(session.layout.engine, "arf");
            assert.strictEqual(session.layout.dimension, "3d");
            assert.strictEqual(session.layout.arrangedDimension, "2d");
            assert.notInclude(
                session.catalog.layouts().map((layout) => String(layout.id)),
                "force-2d",
            );
        },
        TEST_TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "draws flat in the 2D view even when dim: 3 was asked for",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();

            await session.layout.set("force", { options: { dim: 3, seed: 1 } });
            await settle(graph);
            assert.strictEqual(session.layout.arrangedDimension, "3d");
            assert.isAbove(maxDepth(session), 1e-6, "dim: 3 in the 3D view is deep");

            await session.layout.setDimension("2d");
            await settle(graph);
            assert.strictEqual(session.layout.arrangedDimension, "2d");
            assert.isBelow(maxDepth(session), 1e-6, "the 2D view wins over dim: 3");
        },
        TEST_TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "draws force flat in the 3D view with dim: 2",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();

            await session.layout.set("force", { options: { dim: 2, seed: 1 } });
            await settle(graph);
            assert.strictEqual(session.layout.dimension, "3d");
            assert.strictEqual(session.layout.arrangedDimension, "2d");
            assert.isBelow(maxDepth(session), 1e-6);
        },
        TEST_TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "draws the d3 engine flat with dim: 2",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();

            await session.layout.set("force", { engine: "d3", options: { dim: 2 } });
            await settle(graph);
            assert.strictEqual(session.layout.arrangedDimension, "2d");
            assert.isBelow(maxDepth(session), 1e-6);
        },
        TEST_TIMEOUT_MS,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "warns once about an option name the engine does not declare",
        async () => {
            const graph = await loadedGraph();
            const session = graph.getSession();
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

            await session.layout.set("force", { options: { dimensions: 2 } });
            await operationQueueOf(graph).waitForCompletion();

            const about = warn.mock.calls.filter((call) => String(call[0]).includes('"dimensions"'));
            assert.strictEqual(about.length, 1);
        },
        TEST_TIMEOUT_MS,
    );
});
