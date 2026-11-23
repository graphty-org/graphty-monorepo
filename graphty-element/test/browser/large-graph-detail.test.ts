/**
 * @file `Limits.fullDetailTriangleBudget` (issues #302, #9548): a graph whose nodes at full detail
 * fit the budget draws them at the detail the layers give them; one node past it draws every node
 * no layer gives a detail at low detail, the nodes painted before the crossing included; back
 * under it, full again. At 10,000 and 10,001 nodes the default styles draw within the budget.
 */
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { Node } from "../../src/Node";
import { DEFAULT_LIMITS, FULL_DETAIL_NODE_TRIANGLES } from "../../src/session/limits";

describe("a large graph's node detail", () => {
    let container: HTMLElement;
    let graph: Graph;
    const budget = DEFAULT_LIMITS.fullDetailTriangleBudget;
    const atBudget = Math.floor(budget / FULL_DETAIL_NODE_TRIANGLES);

    beforeAll(async () => {
        container = document.createElement("div");
        container.style.width = "640px";
        container.style.height = "480px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        await graph.setLayout("random");
        await graph.addNodes(Array.from({ length: atBudget }, (_, i) => ({ id: `n${String(i)}` })));
        await settle();
    });

    afterAll(() => {
        graph.dispose();
        container.remove();
    });

    async function settle(): Promise<void> {
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
    }

    function node(id: string): Node {
        const found = graph.getDataManager().nodes.get(id);
        if (!found) {
            assert.fail(`no node ${id}`);
        }

        return found;
    }

    /**
     * How many triangles every node's mesh is drawn with: what the nodes' detail costs the GPU.
     * @returns The count.
     */
    function nodeTriangles(): number {
        let triangles = 0;
        for (const each of graph.getDataManager().nodes.values()) {
            triangles += each.drawnSourceMesh.getTotalIndices() / 3;
        }

        return triangles;
    }

    let full = 0;

    it("draws nodes as the layers say at the budget", () => {
        full = node("n0").drawnSourceMesh.getTotalVertices();
        assert.isAbove(full, 0);
        assert.strictEqual(node("n0").drawnSourceMesh.getTotalIndices() / 3, FULL_DETAIL_NODE_TRIANGLES);
    });

    it("draws a node painted before the crossing low once the graph passes it, and full once it is back", async () => {
        await graph.addNodes([{ id: "past" }]);
        await settle();
        assert.isBelow(node("n0").drawnSourceMesh.getTotalVertices(), full, "drawn as a low-detail icosphere");

        await graph.removeNodes(["past"]);
        await settle();
        assert.strictEqual(node("n0").drawnSourceMesh.getTotalVertices(), full);
    });

    it("keeps 10,000 and 10,001 default nodes within the budget", async () => {
        const from = graph.getDataManager().nodes.size;
        await graph.addNodes(Array.from({ length: 10_000 - from }, (_, i) => ({ id: `m${String(i)}` })));
        await settle();
        assert.strictEqual(graph.getDataManager().nodes.size, 10_000);
        assert.isAtMost(nodeTriangles(), budget);

        await graph.addNodes([{ id: "last" }]);
        await settle();
        assert.isAtMost(nodeTriangles(), budget);
    });
});
