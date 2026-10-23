/**
 * @file Choosing the planar layout for a graph that is not planar is refused, on a real `Graph`.
 *
 * The planar layout cannot draw a graph with more than 3n - 6 distinct edges. A reader who asks
 * for it must be told: `layout.set` rejects, and the layout that was drawing keeps drawing.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

const TEST_TIMEOUT_MS = 30_000;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

describe("the planar layout on a graph that is not planar", () => {
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "layout.set rejects and the previous layout stays",
        async () => {
            const container = document.createElement("div");
            container.style.width = "400px";
            container.style.height = "300px";
            document.body.appendChild(container);
            const graph = new Graph(container);
            cleanups.push(() => {
                graph.dispose();
                container.remove();
            });
            await graph.init();
            await graph.setLayout("circular");

            // K6: 15 edges, more than 3 * 6 - 6 = 12, so it is not planar.
            const ids = ["a", "b", "c", "d", "e", "f"];
            await graph.addNodes(ids.map((id) => ({ id })));
            const edges: { src: string; dst: string }[] = [];
            ids.forEach((src, i) => {
                for (const dst of ids.slice(i + 1)) {
                    edges.push({ src, dst });
                }
            });
            await graph.addEdges(edges);
            await operationQueueOf(graph).waitForCompletion();

            const session = graph.getSession();
            let refused: unknown = null;
            try {
                await session.layout.set("planar");
            } catch (error) {
                refused = error;
            }

            assert.isNotNull(refused, "choosing planar for a non-planar graph is refused");
            assert.strictEqual(graph.getLayoutManager().layoutType, "circular", "the previous layout keeps drawing");
            assert.strictEqual(session.layout.id, "circular");
        },
        TEST_TIMEOUT_MS,
    );
});
