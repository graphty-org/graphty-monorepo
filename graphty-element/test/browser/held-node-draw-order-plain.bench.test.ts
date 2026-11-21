/**
 * @file The cost of reading the meshes of plain nodes a batch draws, under `"batched"`.
 *
 * Reading `node.mesh` takes only that node off its batch, which is cut there so every row keeps its
 * objects-path place in the draw order (test/browser/held-node-draw-order.test.ts). For each size, 2D
 * circles of one look, opaque or translucent, are loaded on `"batched"`, some meshes are read (none,
 * one in the middle, or the first and the last), and the frame that takes the rows off the batch is
 * timed (`hold`), then `scene.render` over a run of frames. The 50,000-node load is the slow part of a
 * test, so that size is timed only for the translucent look. Numbers go to the console as
 * `[held-node-draw-order]` lines; nothing about speed is asserted, only how many nodes draw by their own mesh.
 *
 * npx vitest run --project=browser-bench test/browser/held-node-draw-order-plain.bench.test.ts
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import { frameTimes, mounted, unmount } from "../helpers/held-node-bench";

afterEach(unmount);

describe("drawing plain nodes a batch draws when some of their meshes are read", () => {
    for (const size of [2_000, 10_000, 50_000]) {
        for (const opacity of size > 10_000 ? [0.6] : [1, 0.6]) {
            for (const [label, reads] of [
                ["none", []],
                ["the middle one", [Math.floor(size / 2)]],
                ["the first and the last", [0, size - 1]],
            ] as [string, number[]][]) {
                it(`${String(size)} nodes, opacity ${String(opacity)}, ${label} read`, async () => {
                    const created = await mounted(size, "batched");
                    await created.session.styles.add({
                        name: "plain",
                        target: "node",
                        selector: { match: "everything" },
                        set: { "node.shape": "ellipse", "node.size": 1.2, "node.opacity": opacity },
                    } as never);
                    await operationQueueOf(created.graph).waitForCompletion();
                    await created.waitForStableFrame();
                    const { graph } = created;
                    const start = performance.now();
                    for (const id of reads) {
                        assert.isFalse(graph.getNode(id)?.mesh.isDisposed());
                    }

                    // the frame that takes the rows off the batch
                    graph.getScene().render();
                    const holdMs = performance.now() - start;
                    await created.waitForStableFrame();
                    console.log(
                        `[held-node-draw-order] plain nodes=${String(size)} opacity=${String(opacity)} read=${label} hold=${holdMs.toFixed(0)}ms ` +
                            `objectNodes=${String(graph.rowCounts.objectNodes)} render median/p95=${frameTimes(graph)}`,
                    );
                    assert.equal(graph.rowCounts.objectNodes, reads.length);
                });
            }
        }
    }
});
