/**
 * @file Label sampling builds one node label per screen cell, not one per labelled node.
 *
 * With `layoutBehavior.labels.sampleCell` set, the element divides the canvas into square cells of
 * that many CSS pixels and, once the view has settled, builds the label of one node per cell: the
 * selected node first, then the node with more edges. Every other label is not built at all, and
 * `nodeLabelCounts.hiddenBySampling` counts them. Unset, the default, every label is built and the
 * counts are what they always were.
 *
 * What is counted is the work: how many labels exist at all after each frame, read off the nodes.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { nextFrame, wheel } from "../helpers/real-input";

const WIDTH = 640;
const HEIGHT = 480;
const CELL = 100;
/** The most cells a 640 by 480 canvas holds at 100 CSS pixels: 7 across, 5 down. */
const CELLS = Math.ceil(WIDTH / CELL) * Math.ceil(HEIGHT / CELL);
const SIDE = 21;
const COUNT = SIDE * SIDE;

/** A square of nodes 0.2 apart, centered on the origin, with `hub` in the middle. */
function square(): { id: string; position: { x: number; y: number; z: number } }[] {
    const nodes = [];
    for (let i = 0; i < SIDE; i++) {
        for (let j = 0; j < SIDE; j++) {
            const id = i === 10 && j === 10 ? "hub" : `n${String(i)}_${String(j)}`;
            nodes.push({ id, position: { x: (i - 10) * 0.2, y: (j - 10) * 0.2, z: 0 } });
        }
    }

    return nodes;
}

/** The hub has more edges than any other node, so it wins its cell. */
const EDGES = [9, 11].flatMap((i) => [9, 10, 11].map((j) => ({ src: "hub", dst: `n${String(i)}_${String(j)}` })));
const VIEW = { position: { x: 0, y: 0, z: -11 }, target: { x: 0, y: 0, z: 0 } };

describe("label sampling builds labels bounded by the cell count", () => {
    let container: HTMLElement | undefined;
    let graph: Graph | undefined;
    let most = 0;

    afterEach(() => {
        graph?.dispose();
        container?.remove();
        most = 0;
    });

    function built(g: Graph): string[] {
        return square()
            .map(({ id }) => id)
            .filter((id) => g.getNode(id)?.label !== undefined);
    }

    async function frames(g: Graph, count = 8): Promise<void> {
        for (let at = 0; at < count; at++) {
            g.scene.render();
            await nextFrame();
            most = Math.max(most, built(g).length);
        }
    }

    async function draw(sampleCell?: number): Promise<Graph> {
        container = document.createElement("div");
        container.style.width = `${String(WIDTH)}px`;
        container.style.height = `${String(HEIGHT)}px`;
        document.body.appendChild(container);
        const g = new Graph(container);
        graph = g;
        await g.init();
        g.setLayoutBehavior({ labels: sampleCell === undefined ? {} : { sampleCell } });
        await g.addNodes(square());
        await g.addEdges(EDGES);
        await g.setLayout("fixed", { dim: 3 });
        await operationQueueOf(g).waitForCompletion();
        await g.setCameraState(VIEW);
        await g.getSession().styles.add({
            name: "labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "LABEL" },
        });
        await operationQueueOf(g).waitForCompletion();
        await frames(g, 12);
        await g.waitForStableFrame();

        return g;
    }

    it("off, the default, builds every label and leaves the counts as they were", async () => {
        const g = await draw();

        assert.strictEqual(built(g).length, COUNT);
        assert.deepEqual(g.nodeLabelCounts, { labeled: COUNT, nodeHidden: 0, hiddenByOverlap: 0 });
        assert.notProperty(g.nodeLabelCounts, "hiddenBySampling");
    });

    it("on, builds at most one label per cell, never more, and counts the rest", async () => {
        const g = await draw(CELL);
        const drawn = built(g);

        assert.isAbove(drawn.length, 0, "some labels are built");
        assert.isAtMost(most, CELLS, "never more labels than cells, on any frame");
        assert.include(drawn, "hub", "the node with the most edges wins its cell");
        assert.deepEqual(g.nodeLabelCounts, {
            labeled: COUNT,
            nodeHidden: 0,
            hiddenByOverlap: 0,
            hiddenBySampling: COUNT - drawn.length,
        });
    });

    it("samples again when the reader zooms, still within the cell count", async () => {
        const g = await draw(CELL);
        const before = new Set(built(g));
        const canvas = g.scene.getEngine().getRenderingCanvas();
        assert.isOk(canvas);
        for (let turn = 0; turn < 6; turn++) {
            await wheel(canvas, { x: WIDTH / 2, y: HEIGHT / 2 }, -100);
            await frames(g, 2);
        }

        await frames(g);
        await g.waitForStableFrame();
        const after = built(g);

        assert.isAtMost(most, CELLS);
        assert.isTrue(
            after.some((id) => !before.has(id)),
            "zoomed in, other nodes win the smaller cells",
        );
        assert.strictEqual(g.nodeLabelCounts.hiddenBySampling, COUNT - after.length);
    });

    it("turned off, builds every label again and drops the count", async () => {
        const g = await draw(CELL);
        g.setLayoutBehavior({ labels: { sampleCell: undefined } });
        await frames(g);
        await g.waitForStableFrame();

        assert.strictEqual(built(g).length, COUNT);
        assert.deepEqual(g.nodeLabelCounts, { labeled: COUNT, nodeHidden: 0, hiddenByOverlap: 0 });
    });
});
