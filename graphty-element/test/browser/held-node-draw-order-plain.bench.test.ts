/**
 * @file The cost of reading the meshes of plain nodes a batch draws, under `"batched"`.
 *
 * Reading `node.mesh` keeps that node's own mesh, and its look's batch draws the row from that mesh
 * in its own slot, so every row keeps its objects-path place in the draw order
 * (test/browser/held-node-draw-order.test.ts). For each size, 2D circles of one look, opaque or
 * translucent, are loaded, some meshes are read (none, one in the middle, the first and the last,
 * every 20th, or every other one), and the frame after the reads is timed (`hold`), then
 * `scene.render` over a run of frames. The scattered reads are timed on `"objects"` too, the cost
 * the batched path is measured against. The 50,000-node load is the slow part of a test, so that
 * size is timed only for the translucent look and the few reads. Numbers go to the console as
 * `[held-node-draw-order]` lines; nothing about speed is asserted, only how many nodes draw by their
 * own mesh and how many meshes the scene holds.
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
            const cases: [string, number[], ("objects" | "batched")[]][] = [
                ["none", [], ["batched"]],
                ["the middle one", [Math.floor(size / 2)], ["batched"]],
                ["the first and the last", [0, size - 1], ["batched"]],
            ];
            if (size <= 10_000) {
                const every = (step: number): number[] =>
                    Array.from({ length: Math.floor(size / step) }, (_, at) => at * step + 1);
                cases.push(
                    ["every 20th", every(20), ["objects", "batched"]],
                    ["every other", every(2), ["objects", "batched"]],
                );
            }

            for (const [label, reads, paths] of cases) {
                for (const path of paths) {
                    it(`${String(size)} nodes, opacity ${String(opacity)}, ${label} read, on ${path}`, async () => {
                        const created = await mounted(size, path);
                        await created.session.styles.add({
                            name: "plain",
                            target: "node",
                            selector: { match: "everything" },
                            set: { "node.shape": "ellipse", "node.size": 1.2, "node.opacity": opacity },
                        } as never);
                        await operationQueueOf(created.graph).waitForCompletion();
                        await created.waitForStableFrame();
                        const { graph } = created;
                        const meshesBefore = graph.getScene().meshes.length;
                        const start = performance.now();
                        for (const id of reads) {
                            assert.isFalse(graph.getNode(id)?.mesh.isDisposed());
                        }

                        // the frame after the reads
                        graph.getScene().render();
                        const holdMs = performance.now() - start;
                        await created.waitForStableFrame();
                        const meshes = graph.getScene().meshes.length;
                        console.log(
                            `[held-node-draw-order] plain path=${path} nodes=${String(size)} opacity=${String(opacity)} read=${label} ` +
                                `hold=${holdMs.toFixed(0)}ms objectNodes=${String(graph.rowCounts.objectNodes)} ` +
                                `meshes=${String(meshes)} render median/p95=${frameTimes(graph)}`,
                        );
                        if (path === "batched") {
                            assert.equal(graph.rowCounts.objectNodes, reads.length);
                            // one instance each, and no mesh more
                            assert.equal(meshes - meshesBefore, reads.length);
                        }
                    });
                }
            }
        }
    }
});
