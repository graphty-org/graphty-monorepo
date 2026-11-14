/**
 * @file Under `"batched"`, the frame's walks over the nodes visit the object rows only.
 *
 * A batched row is drawn from the row table, which the layout's coordinate lane fills in one
 * typed pass, so `Node.update` has nothing to do for it on a frame. Counted work: which nodes
 * `Node.update` is called for while a force layout runs, and what a batched row still answers
 * when read (its place, the framing it takes part in). Stage 12 of design/rendering/row-renderer.md.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { Node } from "../../src/Node";
import { nextFrame } from "../helpers/real-input";
import { readCanvas as readFrame } from "../helpers/whole-canvas";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const NODES = Array.from({ length: 40 }, (_, id) => ({ id }));
const EDGES = NODES.slice(1).map(({ id }) => ({ source: Math.floor((id - 1) / 3), target: id }));
/** The nodes given a border, which keeps their look on the object path. */
const RINGED = [0, 1, 2];

/**
 * Mount an element, load a tree on a fixed layout and paint three nodes with a border.
 * @param path - The render path.
 * @returns The element.
 */
async function mounted(path: "objects" | "batched"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    const { graph } = element;
    await operationQueueOf(graph).waitForCompletion();
    await element.session.data.addNodes(
        NODES.map(({ id }) => ({ id, position: { x: (id % 8) - 4, y: Math.floor(id / 8) - 2, z: 0 } })),
    );
    await element.session.data.addEdges(EDGES);
    await graph.setLayout("fixed", { dim: 3 });
    await element.session.styles.add({
        name: "ringed",
        target: "node",
        selector: { match: "ids", nodes: RINGED },
        set: { "node.borderColor": "#000000", "node.borderWidth": 0.1, "node.shape": "box" },
    } as never);
    await operationQueueOf(graph).waitForCompletion();
    await element.waitForStableFrame();
    graph.setRenderPath(path);
    await readFrame(graph);
    return element;
}

/**
 * Run a seeded force layout to rest, noting every node `Node.update` is called for.
 * @param element - The element.
 * @returns The ids visited, and how many visits found the node drawn by a batch.
 */
async function walked(element: Graphty): Promise<{ visited: Set<unknown>; batchedVisits: number }> {
    const visited = new Set<unknown>();
    let batchedVisits = 0;
    const { update } = Node.prototype;
    const spy = vi.spyOn(Node.prototype, "update").mockImplementation(function (this: Node) {
        visited.add(this.id);
        batchedVisits += this.drawnInBatch ? 1 : 0;
        update.call(this);
    });
    cleanups.push(() => spy.mockRestore());
    await element.graph.setLayout("ngraph", { dim: 3, seed: 7 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    spy.mockRestore();
    return { visited, batchedVisits };
}

describe("the object roster", () => {
    it("walks the object rows only while a layout runs under batched", async () => {
        const element = await mounted("batched");
        const { graph } = element;
        const counts = graph.rowCounts;
        assert.isAbove(counts.batchedNodes, 0, "some rows are batched");
        assert.isAbove(counts.objectNodes, 0, "some rows are objects");

        const { visited, batchedVisits } = await walked(element);
        const objects = NODES.filter(({ id }) => graph.getNode(id)?.drawnInBatch === false).map(({ id }) => id);
        assert.equal(graph.rowCounts.objectNodes, objects.length);
        assert.equal(batchedVisits, 0, "Node.update never visits a batched row");
        assert.sameMembers([...visited], objects, "Node.update visits exactly the object rows");

        // A batched row read after the walk left it answers where it is drawn.
        const engine = graph.getLayoutManager().layoutEngine;
        assert.isDefined(engine);
        for (const { id } of NODES) {
            const node = graph.getNode(id);
            assert.isDefined(node);
            const at = engine.getNodePosition(node);
            const drawn = node.getPosition();
            assert.closeTo(drawn.x, at.x, 1e-4, `node ${id} x`);
            assert.closeTo(drawn.y, at.y, 1e-4, `node ${id} y`);
            assert.closeTo(drawn.z, at.z ?? 0, 1e-4, `node ${id} z`);
        }
    });

    it("frames the batched rows where they are drawn", async () => {
        const element = await mounted("batched");
        const { graph } = element;
        await walked(element);
        graph.zoomToFit();
        await element.waitForStableFrame();
        const batched = graph.getCameraState();

        graph.setRenderPath("objects");
        await readFrame(graph);
        graph.zoomToFit();
        await element.waitForStableFrame();
        const objects = graph.getCameraState();
        for (const axis of ["x", "y", "z"] as const) {
            assert.closeTo(batched.position?.[axis] ?? 0, objects.position?.[axis] ?? 0, 1e-3, `camera ${axis}`);
            assert.closeTo(batched.target?.[axis] ?? 0, objects.target?.[axis] ?? 0, 1e-3, `target ${axis}`);
        }
    });

    it("brings a held row back to the layout while the layout runs", async () => {
        const element = await mounted("batched");
        const { graph } = element;
        const layout = graph.getLayoutManager();
        const node = graph.getNode(20);
        assert.isDefined(node);
        assert.isTrue(node.drawnInBatch, "the row is batched");
        await graph.setLayout("ngraph", { dim: 3, seed: 7 });
        await operationQueueOf(graph).waitForCompletion();
        // A drag writes the mesh before the layout (NodeBehavior.onDragUpdate), which holds the row
        // off its layout place until something places it again; a drop leaves it so.
        node.setMeshPosition(50, 50, 50);
        const rows = graph.getRowTable();
        assert.isTrue(rows?.isHeld(node.index), "the row is held");
        // Two frames on which a step published, the walk visiting only the roster.
        const published = layout.steppedPublishes;
        while (layout.steppedPublishes < published + 2) {
            await nextFrame();
        }

        assert.isTrue(layout.running, "the layout still runs");
        assert.isFalse(rows?.isHeld(node.index), "the row went back to the layout");
        const at = layout.layoutEngine?.getNodePosition(node);
        assert.isDefined(at);
        const drawn = node.drawnPosition;
        assert.closeTo(drawn.x, at.x, 1e-4, "x");
        assert.closeTo(drawn.y, at.y, 1e-4, "y");
        assert.closeTo(drawn.z, at.z ?? 0, 1e-4, "z");
    });

    it("walks every node under objects, as before", async () => {
        const element = await mounted("objects");
        const { visited } = await walked(element);
        assert.equal(element.graph.rowCounts.batchedNodes, 0);
        assert.sameMembers(
            [...visited],
            NODES.map(({ id }) => id),
        );
    });
});
