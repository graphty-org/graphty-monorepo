/**
 * @file `Limits.largeGraphThreshold` (issue #302): a graph at the threshold draws its nodes at the
 * detail the layers give them; one node past it draws every node no layer gives a detail at low
 * detail, the nodes painted before the crossing included; back at the threshold, full again.
 */
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { Node } from "../../src/Node";
import { DEFAULT_LIMITS } from "../../src/session/limits";

describe("a large graph's node detail", () => {
    let container: HTMLElement;
    let graph: Graph;
    const threshold = DEFAULT_LIMITS.largeGraphThreshold;

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setLayout("random");
        await graph.addNodes(Array.from({ length: threshold }, (_, i) => ({ id: `n${String(i)}` })));
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    function firstNode(): Node {
        const found = graph.getDataManager().nodes.get("n0");
        if (!found) {
            assert.fail("no node n0");
        }

        return found;
    }

    /**
     * How many vertices the node's mesh is drawn with: what its detail costs the GPU.
     * @returns The count.
     */
    function vertices(): number {
        return firstNode().drawnSourceMesh.getTotalVertices();
    }

    let full = 0;

    it("draws nodes as the layers say at the threshold", () => {
        assert.strictEqual(graph.getDataManager().nodes.size, threshold);
        full = vertices();
        assert.isAbove(full, 0);
    });

    it("draws a node painted before the crossing low once the graph passes it, and full once it is back", async () => {
        await graph.addNodes([{ id: "past" }]);
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        assert.isBelow(vertices(), full, "the default sphere is drawn as a low-detail icosphere");

        await graph.removeNodes(["past"]);
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        assert.strictEqual(vertices(), full);
    });
});
