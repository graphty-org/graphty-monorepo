/**
 * @file The cost of drawing nodes whose mesh a consumer read, on both render paths.
 *
 * Under `"batched"`, reading `node.mesh` keeps a node of a look no batch draws (these ringed circles)
 * on its look's shared source, in its place in the draw order (test/browser/held-node-draw-order.test.ts).
 * This times what that costs a frame: for each size, 2D ringed circles of two looks are loaded,
 * every node's mesh is read, and `scene.render` is timed over a run of frames, on `"objects"` and on
 * `"batched"`. Plain circles a batch draws are timed in held-node-draw-order-plain.bench.test.ts. Numbers go to the console as `[held-node-draw-order]` lines; nothing about
 * speed is asserted, only how many nodes draw by their own mesh. Without a GPU (`GRAPHTY_BROWSER_GPU`
 * unset, as in CI) the 10,000-node cases are skipped and a few frames are timed (test/helpers/held-node-bench.ts).
 *
 * npx vitest run --project=browser-bench test/browser/held-node-draw-order.bench.test.ts
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import { ADAPTER, frameTimes, mounted, SOFTWARE_NODES, unmount } from "../helpers/held-node-bench";

afterEach(unmount);

describe("drawing nodes whose mesh a consumer read", () => {
    for (const size of [100, 2_000, 10_000]) {
        for (const path of ["objects", "batched"] as const) {
            it.skipIf(ADAPTER === "" && size > SOFTWARE_NODES)(`${String(size)} nodes on ${path}`, async () => {
                const created = await mounted(size, path);
                for (const [parity, ring] of [
                    [0, "#000000"],
                    [1, "#2563eb"],
                ] as const) {
                    await created.session.styles.add({
                        name: `ring ${ring}`,
                        target: "node",
                        selector: {
                            match: "ids",
                            nodes: Array.from({ length: size }, (_, id) => id).filter((id) => id % 2 === parity),
                        },
                        set: { "node.shape": "ellipse", "node.borderColor": ring, "node.borderWidth": 0.15 },
                    } as never);
                }

                await operationQueueOf(created.graph).waitForCompletion();
                await created.waitForStableFrame();
                const { graph } = created;
                const readStart = performance.now();
                for (let id = 0; id < size; id++) {
                    assert.isFalse(graph.getNode(id)?.mesh.isDisposed());
                }

                const readMs = performance.now() - readStart;
                await created.waitForStableFrame();
                assert.equal(graph.rowCounts.objectNodes, size, "every read node draws by its own mesh");

                console.log(
                    `[held-node-draw-order] nodes=${String(size)} path=${path} readMeshes=${readMs.toFixed(0)}ms ` +
                        `render median/p95=${frameTimes(graph)}`,
                );
            });
        }
    }
});
