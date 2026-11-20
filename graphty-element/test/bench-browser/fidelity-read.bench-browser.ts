/**
 * @file What reading a drawing back for the fidelity comparison (`readDrawn`) costs on each render
 * path, at small, medium and large plain graphs, and the frame after it. A reader that touched
 * `node.mesh` held every batched node off its batch (#9180): the read then built a mesh per node and
 * the next frame drew them all as objects. The numbers go to the console as `bench-row` lines; it
 * asserts only that a batched read leaves every node batched.
 */
import "../../src/graphty-element";

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { readDrawn } from "../fidelity/drawn-scene";

const SIZES = [100, 1000, 5000];
const PATHS = ["objects", "batched"] as const;

/**
 * Mount an element holding a square grid of plain nodes, all drawn by a batch on the batched path.
 * @param count - how many nodes
 * @param path - the render path
 * @returns the element
 */
async function grid(count: number, path: (typeof PATHS)[number]): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:800px;height:600px";
    element.viewMode = "2d";
    element.renderPath = path;
    document.body.appendChild(element);
    await element.updateComplete;
    const side = Math.ceil(Math.sqrt(count));
    await element.session.data.addNodes(
        Array.from({ length: count }, (_, id) => ({
            id,
            position: { x: (id % side) * 2, y: Math.floor(id / side) * 2, z: 0 },
        })),
    );
    await element.graph.setLayout("fixed", { dim: 2 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

describe("reading a drawing back for the fidelity comparison", () => {
    for (const count of SIZES) {
        for (const path of PATHS) {
            it(`${String(count)} nodes, ${path}`, async () => {
                const element = await grid(count, path);
                const batched = element.rowCounts.batchedNodes;
                let start = performance.now();
                readDrawn(element.graph);
                const readMs = performance.now() - start;
                start = performance.now();
                await element.waitForStableFrame();
                const settleMs = performance.now() - start;
                start = performance.now();
                readDrawn(element.graph);
                const againMs = performance.now() - start;
                const after = element.rowCounts.batchedNodes;
                const name = `fidelity readDrawn, ${String(count)} nodes, ${path}`;
                console.log(
                    `bench-row ${JSON.stringify({ date: new Date().toISOString(), runner: "browser", agent: navigator.userAgent, name, readMs, settleMs, againMs, batchedBefore: batched, batchedAfter: after })}`,
                );
                element.remove();
                assert.strictEqual(after, batched, "reading the drawing took no node off its batch");
            });
        }
    }
});
