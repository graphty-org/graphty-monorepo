/**
 * A node a sprite shader draws in place of its mesh keeps a sphere of its radius as its pick
 * proxy, so an edge stops at that sphere. A sprite that becomes drawable after the edges were
 * placed repaints its nodes in bulk; their edges must be placed again, on both render paths.
 */
import { afterEach, assert, describe, test } from "vitest";

import { Graph, operationQueueOf } from "../../../src/Graph";
import type { EdgeLineBatch } from "../../../src/meshes/EdgeLineBatch";
import { renderPathDefault } from "../../../src/meshes/NodeBatch";
import { asData, edgeBetween, styleEveryNode } from "../../helpers/testSetup";

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    renderPathDefault.value = "objects";
    graph = undefined;
    container = undefined;
});

/** The line an edge draws. */
interface EdgeLines {
    lineBatch: EdgeLineBatch | null;
    lineSlots: number[];
}

/**
 * Where the A-B edge's line starts, A at the origin and B 8 along x, every node 2.4 across.
 * @param renderPath - The render path.
 * @returns The x of the line's start, before and after A and B are drawn as stickers.
 */
async function lineStarts(renderPath: "objects" | "batched"): Promise<{ plain: number; sticker: number }> {
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.append(container);
    renderPathDefault.value = renderPath;
    graph = new Graph(container);
    await graph.init();
    assert.strictEqual(graph.renderPath, renderPath);
    await graph.setLayout("fixed", { dim: 3 });
    await graph.addNode(asData({ id: "A", position: { x: 0, y: 0, z: 0 } }));
    await graph.addNode(asData({ id: "B", position: { x: 8, y: 0, z: 0 } }));
    await graph.addEdge(asData({ id: "A:B", source: "A", target: "B" }), { source: "source", target: "target" });
    await styleEveryNode(graph, { "node.size": 2.4 }, "size");
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    const start = (): number => {
        const edge = edgeBetween(graph as Graph, "A", "B");
        const { lineBatch, lineSlots } = edge as unknown as EdgeLines;
        assert(lineBatch, "the edge draws its line from a batch");
        return lineBatch.endsOf(lineSlots[0])[0].x;
    };
    const plain = start();

    await styleEveryNode(graph, { "node.shaders": [{ shader: "icon-sticker" }] }, "stickers");
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    return { plain, sticker: start() };
}

describe("an edge at a node a sprite draws", () => {
    for (const path of ["objects", "batched"] as const) {
        test(`stops at the sprite's pick sphere once the sprite is drawn (${path})`, async () => {
            const { plain, sticker } = await lineStarts(path);
            // an icosphere of 2.4 reaches 1.8 along x; the sprite's pick proxy is a sphere of 1.2
            assert.closeTo(plain, 1.8, 1e-3);
            assert.closeTo(sticker, 1.2, 1e-3);
        });
    }
});
