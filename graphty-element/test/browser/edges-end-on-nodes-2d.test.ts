/**
 * In 2D every edge must start and end on its nodes.
 *
 * A 2D edge is a flat quad laid in the XY plane: its length and angle come from its endpoints'
 * coordinates. A node carrying a Z the camera cannot see makes that length the 3D distance while
 * the angle is the 2D one, so the line overshoots its nodes and ends in empty space. The graph
 * below is the one the "Camera Controls 2D" and "Selection 2D Mode" stories draw: the view mode
 * set in script, the default layout (no `layout` assigned), pre-steps and a seed.
 */
import { AbstractMesh } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import { Graphty } from "../../src/graphty-element";

const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }];
const EDGES = [
    { source: "a", target: "b" },
    { source: "a", target: "c" },
    { source: "b", target: "d" },
    { source: "c", target: "d" },
    { source: "d", target: "e" },
];

const hosts: HTMLElement[] = [];

afterEach(() => {
    for (const host of hosts.splice(0)) {
        host.remove();
    }
});

/**
 * Mount a 2D graph the way the stories do.
 * @param configure - The story's own setup, run before the element is attached.
 * @returns The element, once its queue has drained.
 */
async function mount2D(configure: (element: Graphty) => void): Promise<Graphty> {
    const host = document.createElement("div");

    host.style.width = "600px";
    host.style.height = "400px";
    document.body.append(host);
    hosts.push(host);

    const element = new Graphty();

    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";
    element.nodeData = NODES;
    element.edgeData = EDGES;
    configure(element);
    host.append(element);

    await new Promise((resolve) => setTimeout(resolve, 400));
    await element.graph.operationQueue.waitForCompletion();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await element.graph.operationQueue.waitForCompletion();

    return element;
}

/**
 * Every node sits on the plane the orthographic camera draws, and every edge's drawn quad lies
 * between its two nodes' centres rather than past them.
 * @param element - The element to inspect.
 * @param what - The setup, for the failure message.
 */
function assertEdgesEndOnNodes(element: Graphty, what: string): void {
    const { graph } = element;
    const nodes = [...graph.getNodes()];
    const edges = [...graph.getDataManager().edges.values()];

    assert.strictEqual(nodes.length, NODES.length, `${what}: every node should be loaded`);
    assert.strictEqual(edges.length, EDGES.length, `${what}: every edge should be loaded`);

    for (const node of nodes) {
        assert.closeTo(node.mesh.position.z, 0, 0.01, `${what}: node ${String(node.id)} should lie in the 2D plane`);
    }

    for (const edge of edges) {
        const src = edge.srcNode.mesh.position;
        const dst = edge.dstNode.mesh.position;
        const centreGap = Math.hypot(dst.x - src.x, dst.y - src.y);
        if (!(edge.mesh instanceof AbstractMesh)) {
            assert.fail(`${what}: edge ${edge.id} should be a solid 2D line`);
        }

        const { minimumWorld: min, maximumWorld: max } = edge.mesh.getBoundingInfo().boundingBox;
        const drawnLength = Math.hypot(max.x - min.x, max.y - min.y);

        assert.isAtMost(
            drawnLength,
            centreGap + 0.5,
            `${what}: edge ${edge.id} is drawn ${drawnLength.toFixed(2)} long between nodes ` +
                `${centreGap.toFixed(2)} apart, so it runs past its nodes`,
        );
        assert.isAtMost(
            Math.abs((min.x + max.x) / 2 - (src.x + dst.x) / 2) + Math.abs((min.y + max.y) / 2 - (src.y + dst.y) / 2),
            0.5,
            `${what}: edge ${edge.id} should be centred between its nodes`,
        );
    }
}

describe("2D edges end on their nodes", () => {
    test("the default layout, with the view mode, pre-steps and a seed set in script", async () => {
        const element = await mount2D((el) => {
            el.viewMode = "2d";
            el.layoutBehavior = { layout: { preSteps: 2000 } };
            el.layoutConfig = { seed: 42 };
        });

        assertEdgesEndOnNodes(element, "default layout");
    });

    test("the default layout, with only the view mode set", async () => {
        const element = await mount2D((el) => {
            el.viewMode = "2d";
        });

        assertEdgesEndOnNodes(element, "view mode only");
    });
});
