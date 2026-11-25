/**
 * @file A 2D fixed layout over nodes whose data carries a Z draws one picture on both render paths, whichever comes
 * first, the nodes or the layout. The batched row table draws every 2D row at Z = 0, and fixed used to publish the
 * data's Z again on a later run (here the first edges, which re-place every node), so the objects path drew those
 * nodes at their Z, their edges foreshortened (issue #10039). Fixed now publishes Z = 0 under a 2D view. No `Node`
 * is built on purpose: a row drawn with none must match as well.
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
 * @param layoutFirst - Whether the layout is set before the nodes are added.
 * @returns The element, its picture final.
 */
async function loaded(path: RenderPath, layoutFirst: boolean): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.viewMode = "2d";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    if (layoutFirst) {
        await element.graph.setLayout("fixed", { dim: 2 });
    }

    await element.session.data.addNodes(NODES);
    if (!layoutFirst) {
        await element.graph.setLayout("fixed", { dim: 2 });
    }

    await element.session.data.addEdges(EDGES);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

describe("a 2D fixed layout whose nodes keep a Z", () => {
    it.each([
        ["nodes first", false],
        ["layout first", true],
    ])("draws the objects path's picture on the batched path, %s", async (_, layoutFirst) => {
        const objects = await loaded("objects", layoutFirst);
        const want = await readCanvas(objects.graph);
        objects.remove();
        const batched = await loaded("batched", layoutFirst);
        assert.equal(pixelsOverBar(want, await readCanvas(batched.graph)), 0);
    });
});
