/**
 * pinOnDrag Behavior Tests
 *
 * Tests verify node pinning behavior during drag operations.
 */

import { assert } from "chai";
import { afterEach, beforeEach, describe, test, vi } from "vitest";

import { Graph } from "../../../src/Graph";
import type { Node } from "../../../src/Node";
import { configureGraph } from "../../helpers/testSetup";

const TEST_NODES = [{ id: "node1" }, { id: "node2" }, { id: "node3" }];
const TEST_EDGES = [
    { src: "node1", dst: "node2" },
    { src: "node2", dst: "node3" },
];

/**
 * Put a node where a drag would put it.
 *
 * `mesh.position` is where the node was last DRAWN, not where it is. Coordinates live in the
 * element's shared position array, and a frame redraws every mesh from that array, so a test that
 * writes only the mesh has placed nothing -- the next frame paints over it with the coordinate the
 * layout published. That is why `NodeDragHandler.onDragUpdate` writes the pointer's coordinate
 * through the layout engine as well as moving the mesh; this makes the same two writes in the same
 * order, so what follows measures the pin rather than whether a frame happened to run.
 * @param graph - The graph the node belongs to.
 * @param node - The node to move.
 * @param at - Where to put it, in scene units.
 */
function placeNode(graph: Graph, node: Node, at: { x: number; y: number; z: number }): void {
    graph.getLayoutManager().layoutEngine?.setNodePosition(node, at);
    node.mesh.position.set(at.x, at.y, at.z);
}

/**
 * Run the layout, then redraw, the way a frame does.
 *
 * THE ENGINE IS STEPPED, NOT THE MANAGER. `LayoutManager.step()` steps only while the layout is
 * running, and the element stops a settled layout and never restarts ngraph -- so a test that
 * asked the manager would spend its iterations on a simulation that never moved, and would be
 * measuring the frame loop's pacing instead of the pin. Stepping the engine puts real force on the
 * pinned node, which is the only thing that can pull it off its pin. `update()` is the call the
 * frame loop makes to bring a mesh into line with the published coordinate, and is what would
 * carry a lost pin onto the screen.
 * @param graph - The graph to step.
 * @param steps - How many simulation steps to run.
 */
function runLayout(graph: Graph, steps: number): void {
    const { layoutEngine } = graph.getLayoutManager();

    for (let i = 0; i < steps; i++) {
        layoutEngine?.step();
    }

    for (const node of graph.getNodes()) {
        node.update();
    }
}

describe("pinOnDrag Behavior", () => {
    let graph: Graph;
    let container: HTMLDivElement;

    describe("pinOnDrag=true", () => {
        beforeEach(async () => {
            container = document.createElement("div");
            container.style.width = "800px";
            container.style.height = "600px";
            document.body.appendChild(container);

            graph = new Graph(container);
            await graph.init();
            await configureGraph(graph, { viewMode: "3d", layout: "ngraph", layoutOptions: { dim: 3 }, pinOnDrag: true });
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await graph.operationQueue.waitForCompletion();
            await new Promise((resolve) => setTimeout(resolve, 200));
        });

        afterEach(() => {
            vi.restoreAllMocks();
            graph.dispose();
            document.body.removeChild(container);
        });

        test("pinOnDrag=true pins node after drag", async () => {
            const node1 = graph.getNode("node1");
            assert.isDefined(node1, "Node 1 should exist");
            assert.isNotNull(node1);

            const dropped = {
                x: node1.mesh.position.x + 5,
                y: node1.mesh.position.y + 3,
                z: node1.mesh.position.z + 1,
            };

            placeNode(graph, node1, dropped);
            node1.pin();

            await new Promise((resolve) => setTimeout(resolve, 100));

            runLayout(graph, 10);

            await new Promise((resolve) => setTimeout(resolve, 50));

            assert.closeTo(node1.mesh.position.x, dropped.x, 0.5, "Pinned node X should stay");
            assert.closeTo(node1.mesh.position.y, dropped.y, 0.5, "Pinned node Y should stay");
            assert.closeTo(node1.mesh.position.z, dropped.z, 0.5, "Pinned node Z should stay");
        });

        test("pinned node stays at position during layout", () => {
            const node1 = graph.getNode("node1");
            assert.isDefined(node1, "Node 1 should exist");
            assert.isNotNull(node1);

            const pinnedPos = { x: 10, y: 10, z: 10 };
            placeNode(graph, node1, pinnedPos);
            node1.pin();

            runLayout(graph, 50);

            assert.closeTo(node1.mesh.position.x, pinnedPos.x, 0.5, "X should remain stable");
            assert.closeTo(node1.mesh.position.y, pinnedPos.y, 0.5, "Y should remain stable");
            assert.closeTo(node1.mesh.position.z, pinnedPos.z, 0.5, "Z should remain stable");
        });
    });

    describe("pinOnDrag=false", () => {
        beforeEach(async () => {
            container = document.createElement("div");
            container.style.width = "800px";
            container.style.height = "600px";
            document.body.appendChild(container);

            graph = new Graph(container);
            await graph.init();
            await configureGraph(graph, { viewMode: "3d", layout: "ngraph", layoutOptions: { dim: 3 }, pinOnDrag: false });
            await graph.addNodes(TEST_NODES);
            await graph.addEdges(TEST_EDGES);
            await graph.operationQueue.waitForCompletion();
            await new Promise((resolve) => setTimeout(resolve, 200));
        });

        afterEach(() => {
            vi.restoreAllMocks();
            graph.dispose();
            document.body.removeChild(container);
        });

        test("explicit pin() works even with pinOnDrag=false", async () => {
            const node1 = graph.getNode("node1");
            assert.isDefined(node1, "Node 1 should exist");
            assert.isNotNull(node1);

            const pinnedPos = { x: 15, y: 15, z: 15 };
            placeNode(graph, node1, pinnedPos);
            node1.pin();

            runLayout(graph, 30);

            await new Promise((resolve) => setTimeout(resolve, 100));

            assert.closeTo(node1.mesh.position.x, pinnedPos.x, 0.5, "X should stay in place");
            assert.closeTo(node1.mesh.position.y, pinnedPos.y, 0.5, "Y should stay in place");
            assert.closeTo(node1.mesh.position.z, pinnedPos.z, 0.5, "Z should stay in place");
        });

        test("unpin() releases node to layout", async () => {
            const node1 = graph.getNode("node1");
            assert.isDefined(node1, "Node 1 should exist");
            assert.isNotNull(node1);

            const pinnedPos = { x: 25, y: 25, z: 25 };
            placeNode(graph, node1, pinnedPos);
            node1.pin();

            node1.unpin();

            runLayout(graph, 30);

            await new Promise((resolve) => setTimeout(resolve, 100));

            assert.isDefined(node1.mesh.position, "Node should have valid position");
            assert.isTrue(isFinite(node1.mesh.position.x), "X should be finite");
            assert.isTrue(isFinite(node1.mesh.position.y), "Y should be finite");
            assert.isTrue(isFinite(node1.mesh.position.z), "Z should be finite");
        });
    });
});
