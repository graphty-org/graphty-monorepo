/**
 * @file A node restyle that moves no edge end -- a new color -- places no edge, and one that does -- a new size --
 * places each edge on the new outline. Both draw what the same layer draws when it is there from the start, on both
 * render paths (issue #10018).
 *
 * WHAT WENT WRONG. The frame that finished a node repaint walked every edge, whatever the repaint changed, and on the
 * "objects" path the frame after it walked every edge again. A color change moves no edge end, so both walks placed
 * nothing: at 10,000 nodes and 100,000 edges they were about 40 ms of a 300 ms restyle. Counted, never timed: a walk
 * visits every edge, so a restyle that walks is at least the edge count.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { assertSameFrame, readCanvas } from "../helpers/whole-canvas";

afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
});

const N = 24;
const NODES = Array.from({ length: N }, (_, id) => ({
    id,
    position: { x: (id % 6) * 1.6 - 4, y: Math.floor(id / 6) * 1.6 - 2.4, z: 0 },
}));
const EDGES = [
    ...NODES.map(({ id }) => ({ src: id, dst: (id + 1) % N })),
    ...NODES.filter(({ id }) => id % 3 === 0).map(({ id }) => ({ src: id, dst: (id + 7) % N })),
];

/** One style layer on every node. */
type NodeLayer = Readonly<Record<string, string | number>>;

/**
 * Add a layer that sets the given node properties on every node.
 * @param element - The element.
 * @param set - The properties.
 */
async function addLayer(element: Graphty, set: NodeLayer): Promise<void> {
    await element.session.styles.add({ name: "restyle", target: "node", selector: { match: "everything" }, set });
}

/**
 * Mount a 2D element with the graph on fixed positions.
 * @param path - The render path.
 * @param first - A layer to add before the data, so no repaint of a drawn graph applies it.
 * @returns The element, its picture final.
 */
async function loaded(path: RenderPath, first?: NodeLayer): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.viewMode = "2d";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    if (first !== undefined) {
        await addLayer(element, first);
    }

    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 2 });
    await element.session.data.addEdges(EDGES);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * The picture framed on the graph as it is drawn now: a graph styled at load is framed on its styled nodes, and a
 * restyle does not move the camera.
 * @param element - The element.
 * @returns The picture.
 */
async function framed(element: Graphty): Promise<Awaited<ReturnType<typeof readCanvas>>> {
    element.zoomToFit();
    await element.waitForStableFrame();
    return readCanvas(element.graph);
}

/**
 * Restyle every node of a drawn graph, counting the edges placed until the stable frame.
 * @param path - The render path.
 * @param set - The node properties.
 * @returns How many times an edge was placed, and the picture.
 */
async function restyled(
    path: RenderPath,
    set: NodeLayer,
): Promise<{ placed: number; frame: Awaited<ReturnType<typeof readCanvas>> }> {
    const element = await loaded(path);
    const update = vi.spyOn(Edge.prototype, "update");
    await addLayer(element, set);
    await element.waitForStableFrame();
    const placed = update.mock.calls.length;
    update.mockRestore();
    const frame = await framed(element);
    element.remove();
    return { placed, frame };
}

describe.each<RenderPath>(["objects", "batched"])("a node restyle on the %s path", (path) => {
    it("that changes only the color places no edge and draws what the layer draws from the start", async () => {
        const color = { "node.color": "#e15759" };
        const { placed, frame } = await restyled(path, color);
        const reference = await loaded(path, color);
        assertSameFrame(await framed(reference), frame, "the recolored graph differs from one colored at load");
        // a walk visits every edge
        assert.isBelow(placed, EDGES.length, `edges placed by a color restyle: ${String(placed)}`);
    });

    it("that changes the size draws each edge on the new outline", async () => {
        const size = { "node.size": 2 };
        const { frame } = await restyled(path, size);
        const reference = await loaded(path, size);
        assertSameFrame(await framed(reference), frame, "the resized graph differs from one sized at load");
    });
});
