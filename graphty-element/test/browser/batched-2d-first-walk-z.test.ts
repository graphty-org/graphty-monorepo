/**
 * @file A 2D graph whose fixed layout keeps each node's Z (fixed echoes the stored coordinates) draws its nodes, and
 * so its edges' ends, at that Z on the `"objects"` path. Under `renderPath: "batched"` the first walk puts each built
 * node there before the row table has turned 2D; the table then held none of them and its turn flattened them, so
 * the arrowheads and lines ran full length where the objects path draws them foreshortened. The picture is the
 * objects path's.
 *
 * The nodes are built before the layout, so the first walk puts built nodes. A row with no `Node` is drawn flat in
 * 2D by the row table, where the objects path draws it at its Z: that gap is issue #10039.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

afterEach(() => {
    document.body.replaceChildren();
});

const N = 24;
const NODES = Array.from({ length: N }, (_, id) => ({
    id,
    position: { x: (id % 6) * 1.3 - 3.2, y: Math.floor(id / 6) * 1.3 - 2, z: (id % 3) * 0.7 - 0.7 },
}));
const EDGES = [
    ...NODES.map(({ id }) => ({ src: id, dst: (id + 1) % N })),
    ...NODES.filter(({ id }) => id % 4 === 0).map(({ id }) => ({ src: id, dst: (id + 7) % N })),
];

/**
 * Mount a 2D element with the graph on fixed positions that carry a Z, in the directed default look.
 * @param path - The render path.
 * @returns The element, its picture final.
 */
async function loaded(path: RenderPath): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.viewMode = "2d";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    // Walking the array builds every `Node` (see the file comment).
    assert.lengthOf([...element.graph.getNodes()], N);
    await element.graph.setLayout("fixed", { dim: 2 });
    await element.session.data.addEdges(EDGES);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

describe("a 2D fixed layout whose nodes keep a Z", () => {
    it("draws the objects path's picture on the batched path", async () => {
        const objects = await loaded("objects");
        const want = await readCanvas(objects.graph);
        objects.remove();
        const batched = await loaded("batched");
        assert.equal(pixelsOverBar(want, await readCanvas(batched.graph)), 0);
    });
});
