/**
 * @file A node a batch draws answers for its size in the doubles it measured, as the `"objects"` path's node
 * does, at every moment: also right after it joins a batch, which gives up its mesh. The row table keeps a 32-bit
 * copy of the size, and an edge trimmed from that copy ends a last bit away from where the objects path ends it,
 * which can move an antialiased pixel (#6287).
 */

import "../../src/graphty-element";

import type { AbstractMesh } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import type { Node } from "../../src/Node";

afterEach(() => {
    document.body.replaceChildren();
});

/** Two boxes whose half size, 0.55, has no exact 32-bit float. */
async function loaded(path: RenderPath): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.styles.add({
        name: "boxes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 1.1, "node.shape": "box" },
    } as never);
    await element.session.data.addNodes([
        { id: "a", position: { x: 0, y: 0, z: 0 } },
        { id: "b", position: { x: 5, y: 2, z: 0 } },
    ]);
    await element.session.data.addEdges([{ src: "a", dst: "b" }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * The node with this id.
 * @param element - The element.
 * @param id - The id.
 * @returns The node.
 */
function nodeOf(element: Graphty, id: string): Node {
    const node = element.graph.getDataManager().nodes.get(id);
    assert.isDefined(node);
    return node;
}

describe("a batched node's measure", () => {
    it("is the objects path's, in doubles, right after the node joins its batch", async () => {
        const objects = nodeOf(await loaded("objects"), "a");
        const want = { ...objects.drawnHalfExtents };
        assert.notEqual(want.x, Math.fround(want.x), "the size has an exact 32-bit float, so it proves nothing");
        document.body.replaceChildren();

        const node = nodeOf(await loaded("batched"), "a");
        const internals = node as unknown as { batchSource: AbstractMesh | null };
        const source = internals.batchSource;
        assert.isNotNull(source, "the batch does not draw the node");
        assert.deepEqual({ ...node.drawnHalfExtents }, want);

        // out of its batch and back in, as a restyle or a batch rebuild does: the batch takes its mesh again
        node.drawInBatch(null);
        node.drawInBatch(source);
        assert.deepEqual({ ...node.drawnHalfExtents }, want);
    });
});
