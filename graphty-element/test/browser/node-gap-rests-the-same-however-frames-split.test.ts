/**
 * @file A seeded layout with `nodeGap` rests in the same places however the frames split the style repaint.
 *
 * A layout that keeps nodes apart by their drawn size (`nodeGap`) reads each node's size, and a node has
 * its size only once the style repaint has reached it. The frame loop applies that repaint within a time
 * budget, so on a slow frame part of it waits for the next one -- and the layout used to step in between,
 * taking the sizes in at whichever step the clock let them arrive. Where the nodes rested then depended on
 * how fast the frames were: the Layout2D NodeGap story drew a second load 99816 pixels away from the first
 * on WebGPU. The minimum-work test mode (`src/managers/minimumWork.ts`, one paint batch a frame) splits
 * the repaint as far as it goes; both loads must put every node at the same place bit for bit.
 *
 * The pre-steps are the same question asked earlier. On the object rows a node's size arrives as its mesh
 * is built, over several frames; on the batch every row has its size at once. A layout built while the
 * object rows were still being built spent its pre-steps with the sizes it had, and the same story drew
 * a different graph on each path (99816 pixels on WebGPU).
 */
import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { setMinimumWorkPerFrame } from "../../src/managers/minimumWork";
import type { RenderPath } from "../../src/meshes/NodeBatch";

const COUNT = 120;
const NODES = Array.from({ length: COUNT }, (_unused, index) => ({ id: `n${String(index)}` }));
const EDGES = NODES.slice(1).map((node, index) => ({ src: NODES[Math.floor(index / 3)].id, dst: node.id }));

let container: HTMLElement | undefined;
let graph: Graph | undefined;

afterEach(() => {
    graph?.dispose();
    container?.remove();
    graph = undefined;
    setMinimumWorkPerFrame(false);
});

/**
 * Loads the graph under a seeded spring layout with `nodeGap` and reads where every node rested.
 * @param minimum - Whether every frame applies one paint batch.
 * @returns Each node's x and y, by id.
 */
async function rested(minimum: boolean): Promise<Record<string, [number, number]>> {
    graph?.dispose();
    container?.remove();
    setMinimumWorkPerFrame(minimum);
    container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "320px";
    document.body.appendChild(container);
    const g = new Graph(container);
    graph = g;
    await g.init();
    await g.setLayout("spring", { seed: 12, dim: 2, nodeGap: 2 });
    await g.addNodes(NODES);
    await g.addEdges(EDGES);
    // A size the repaint gives the nodes while the layout is already running.
    await g.getSession().styles.add({
        name: "large nodes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 12 },
    });
    await g.waitForStableFrame();
    return Object.fromEntries(
        [...g.getDataManager().nodes].map(([key, node]) => [
            String(key),
            [node.drawnPosition.x, node.drawnPosition.y] as [number, number],
        ]),
    );
}

/**
 * Loads the graph with its size and pre-steps set first, as a story does, and reads where every node rested.
 * @param path - The render path.
 * @param drawnFirst - Whether the nodes are drawn at their size before the layout is built.
 * @param minDelta - The move below which a round counts as settled; 0 for none.
 * @returns Each node's x and y, by id.
 */
async function restedOn(
    path: RenderPath,
    drawnFirst: boolean,
    minDelta = 0,
): Promise<Record<string, [number, number]>> {
    graph?.dispose();
    container?.remove();
    container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "320px";
    document.body.appendChild(container);
    const g = new Graph(container);
    graph = g;
    await g.init();
    g.setRenderPath(path);
    await g.getSession().config.set({ layoutBehavior: { preSteps: 50, minDelta } });
    await g.getSession().styles.add({
        name: "large nodes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 12 },
    });
    // A start the spring layout reads either way: a static layout does not move while the frames draw.
    await g.setLayout("circular", { dim: 2 });
    await g.addNodes(NODES);
    await g.addEdges(EDGES);
    if (drawnFirst) {
        await g.waitForStableFrame();
    }

    // Otherwise built over nodes whose sizes are still on their way.
    await g.setLayout("spring", { seed: 12, dim: 2, nodeGap: 2 });
    await g.waitForStableFrame();
    return Object.fromEntries(
        [...g.getDataManager().nodes].map(([key, node]) => [
            String(key),
            [node.drawnPosition.x, node.drawnPosition.y] as [number, number],
        ]),
    );
}

describe("a seeded nodeGap layout", () => {
    it.for(["objects", "batched"] as const)(
        "rests at the same places built before or after the nodes are drawn, on %s",
        async (path) => {
            const before = await restedOn(path, false);
            const after = await restedOn(path, true);
            assert.lengthOf(Object.keys(before), COUNT);
            assert.deepStrictEqual(before, after);
        },
    );

    // A round stepped while the pre-steps wait for the sizes moves nothing, and with minDelta that
    // read as settled: the layout stopped where the circular layout had put the nodes.
    it("rests at the same places built before or after the nodes are drawn, with minDelta set", async () => {
        const before = await restedOn("objects", false, 0.01);
        const after = await restedOn("objects", true, 0.01);
        assert.deepStrictEqual(before, after);
    });

    it("rests at the same places on the object rows and on the batch", async () => {
        const objects = await restedOn("objects", false);
        const batched = await restedOn("batched", false);
        assert.deepStrictEqual(batched, objects);
    });

    it("rests at the same places at full speed and with one paint batch a frame", async () => {
        const full = await rested(false);
        const minimum = await rested(true);
        assert.lengthOf(Object.keys(full), COUNT);
        assert.deepStrictEqual(minimum, full);
    });
});
