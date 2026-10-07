/**
 * In 2D every edge must start and end on its nodes.
 *
 * A 2D edge is a flat quad laid in the XY plane, drawn as a slot in a batch: its length and
 * angle come from its endpoints' coordinates. A node carrying a Z the camera cannot see makes that length the 3D distance while
 * the angle is the 2D one, so the line overshoots its nodes and ends in empty space. The graph
 * below is the one the "Camera Controls 2D" and "Selection 2D Mode" stories draw: the view mode
 * set in script, the default layout (no `layout` assigned), pre-steps and a seed.
 *
 * A pinned node is the other way to carry a Z into 2D. Clicking a node in 3D selects it and, with
 * `pinOnDrag` on by default, pins it where it stands -- Z included -- and the 2D switch used to
 * hand the new 2D engine that 3D position unchanged. That is the graphty.app report: load Karate
 * Club, select a node, switch to 2D, and the selected node's edges run past it into empty space.
 */
import { afterEach, assert, describe, test } from "vitest";

import { operationQueueOf } from "../../src/Graph";
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
    await operationQueueOf(element.graph).waitForCompletion();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await operationQueueOf(element.graph).waitForCompletion();

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
        // A 2D line is a slot in a shared batch (issue #444), so its drawn extent is read off the
        // edge, not off a mesh of its own.
        const line = edge.drawnLine;
        if (line === null) {
            assert.fail(`${what}: edge ${edge.id} should be a solid 2D line`);
        }

        assert.isAtMost(
            line.length,
            centreGap + 0.5,
            `${what}: edge ${edge.id} is drawn ${line.length.toFixed(2)} long between nodes ` +
                `${centreGap.toFixed(2)} apart, so it runs past its nodes`,
        );
        assert.isAtMost(
            Math.abs(line.centre.x - (src.x + dst.x) / 2) + Math.abs(line.centre.y - (src.y + dst.y) / 2),
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

    test("a node pinned in 3D, then the switch to 2D", async () => {
        const element = await mount2D((el) => {
            el.layoutConfig = { seed: 42 };
        });

        // Where a pin in 3D leaves a node: somewhere off the plane. Placed through the session
        // so the pin holds a Z the 2D engine cannot draw, whatever the 3D layout settled on.
        await element.graph.getSession().positions.set([{ id: "d", x: 1, y: 1, z: 20 }]);
        element.pin("d");
        await element.setViewMode("2d");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await operationQueueOf(element.graph).waitForCompletion();

        assertEdgesEndOnNodes(element, "pinned in 3D");
    });

    test("a position with a Z placed while the view is 2D", async () => {
        const element = await mount2D((el) => {
            el.viewMode = "2d";
            el.layoutConfig = { seed: 42 };
        });

        // A script, an import or a restore can carry a Z into a 2D graph; the engine draws on
        // the plane whatever the coordinates it is handed say.
        const { history } = element.graph.getSession();
        const steps = history.steps.length;
        await element.graph.getSession().positions.set([{ id: "d", x: 1, y: 1, z: 20 }]);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await operationQueueOf(element.graph).waitForCompletion();

        assertEdgesEndOnNodes(element, "a Z placed in 2D");
        const d = element.graph.getNode("d");
        assert.closeTo(d?.mesh.position.x ?? Number.NaN, 1, 0.01, "the X it was given is kept");
        assert.closeTo(d?.mesh.position.y ?? Number.NaN, 1, 0.01, "the Y it was given is kept");
        assert.strictEqual(history.steps.length, steps + 1, "the placement is one step, and only one");

        // Putting the node on the plane is not a step of its own, so undo and redo still work.
        const session = element.graph.getSession();
        await session.undo();
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(session.canRedo, "undoing the placement leaves it to redo");
        await session.redo();
        await new Promise((resolve) => setTimeout(resolve, 300));
        await operationQueueOf(element.graph).waitForCompletion();
        assertEdgesEndOnNodes(element, "redone in 2D");
    });

    test("the default layout, with only the view mode set", async () => {
        const element = await mount2D((el) => {
            el.viewMode = "2d";
        });

        assertEdgesEndOnNodes(element, "view mode only");
    });
});
