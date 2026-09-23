/**
 * The view mode a graph OPENS in, as opposed to one it switches to.
 *
 * Every existing view-mode test drives a transition: build a 3D graph, then ask for 2D. The
 * thing a consumer actually writes first is neither of those -- it is
 *
 *     <graphty-element view-mode="2d" layout="circular"></graphty-element>
 *
 * or the same two assignments in script, before any data has loaded. That asks for a graph whose
 * OPENING state is 2D, and nothing in the element used to read it: the scene was built with the
 * perspective orbit camera unconditionally, and the only route to the orthographic one was a
 * transition away from 3D. When the transition was cancelled, or when it was never queued at all
 * because the element was still being constructed, the element went on reporting `viewMode ===
 * "2d"` from its own property while the graph drew in perspective, gave the layout engine three
 * dimensions to spread the nodes through, and left `scene.metadata.twoD` unset so every edge mesh
 * was built as a 3D tube.
 *
 * Three readings have to agree before a picture is right, and each of them has its own consumer:
 * the active camera's projection (`Camera.ORTHOGRAPHIC_CAMERA === 1`, which is what
 * `stories/assertions.ts` checks and what `Graph.cameraViewContext` reports), `scene.metadata.twoD`
 * (which `EdgeMesh.is2DMode` requires ON TOP of the camera test), and `config.graph.viewMode`
 * (which `LayoutManager` reads to decide whether the layout gets a Z axis).
 */
import "../../src/graphty-element";

import { Camera } from "@babylonjs/core";
import { afterEach, assert, describe, test } from "vitest";

import { Graph } from "../../src/Graph";

/** How long the element needs to connect, run its first update and finish `Graph.init()`. */
const ELEMENT_READY_MS = 400;

const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
const EDGES = [
    { source: "a", target: "b" },
    { source: "b", target: "c" },
    { source: "c", target: "d" },
];

const hosts: HTMLDivElement[] = [];
const graphs: Graph[] = [];

/**
 * A 400x300 div attached to the document, torn down after the test.
 * @returns the host element.
 */
function makeHost(): HTMLDivElement {
    const host = document.createElement("div");

    host.style.width = "400px";
    host.style.height = "300px";
    document.body.append(host);
    hosts.push(host);

    return host;
}

/**
 * Wait for everything the element has queued to finish, twice over, so that work queued by
 * work counts too.
 * @param graph - The graph to drain.
 */
async function settle(graph: Graph): Promise<void> {
    await graph.operationQueue.waitForCompletion();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await graph.operationQueue.waitForCompletion();
}

/**
 * Assert that every reading of the view mode says 2D: the projection the camera uses, the scene
 * metadata the edge meshes read, and the configuration the layout reads.
 * @param graph - The graph to inspect.
 * @param what - What is being asserted, for the failure message.
 */
function assertDrawnIn2D(graph: Graph, what: string): void {
    assert.strictEqual(
        graph.scene.activeCamera?.mode,
        Camera.ORTHOGRAPHIC_CAMERA,
        `${what}: the active camera should be orthographic`,
    );
    assert.strictEqual(graph.getViewMode(), "2d", `${what}: the graph should report 2d`);
    assert.isTrue(graph.is2D(), `${what}: the deprecated is2D() should agree`);
    assert.strictEqual(graph.scene.metadata?.twoD, true, `${what}: scene.metadata.twoD should be true`);
    assert.strictEqual(graph.scene.metadata?.viewMode, "2d", `${what}: scene.metadata.viewMode should be 2d`);
}

afterEach(() => {
    for (const graph of graphs.splice(0)) {
        graph.dispose();
    }

    for (const host of hosts.splice(0)) {
        host.remove();
    }
});

describe("a graph that opens in 2D", () => {
    test("the element, with a layout set beside the view mode", async () => {
        const host = makeHost();
        const element = document.createElement("graphty-element");

        element.style.width = "100%";
        element.style.height = "100%";
        element.style.display = "block";

        element.viewMode = "2d";
        host.append(element);
        element.nodeData = NODES;
        element.edgeData = EDGES;
        element.layout = "circular";

        await new Promise((resolve) => setTimeout(resolve, ELEMENT_READY_MS));
        await settle(element.graph);

        assertDrawnIn2D(element.graph, "viewMode then layout");
    });

    test("the element, from markup alone", async () => {
        const host = makeHost();
        const element = document.createElement("graphty-element");

        element.style.width = "100%";
        element.style.height = "100%";
        element.style.display = "block";
        element.setAttribute("view-mode", "2d");
        element.setAttribute("layout", "circular");
        host.append(element);

        await new Promise((resolve) => setTimeout(resolve, ELEMENT_READY_MS));
        element.nodeData = NODES;
        element.edgeData = EDGES;
        await settle(element.graph);

        assertDrawnIn2D(element.graph, "view-mode attribute");
    });

    test("the layout is given two dimensions, not three", async () => {
        const host = makeHost();
        const element = document.createElement("graphty-element");

        element.style.width = "100%";
        element.style.height = "100%";
        element.style.display = "block";

        element.viewMode = "2d";
        host.append(element);
        element.nodeData = NODES;
        element.edgeData = EDGES;
        element.layout = "spring";

        await new Promise((resolve) => setTimeout(resolve, ELEMENT_READY_MS));
        await settle(element.graph);

        const nodes = [...element.graph.getNodes()];

        assert.isAbove(nodes.length, 0, "the graph should have nodes");
        for (const node of nodes) {
            assert.closeTo(node.mesh.position.z, 0, 0.01, `node ${String(node.id)} should be flat`);
        }
    });

    test("a bare Graph, asked for 2D before init()", async () => {
        const host = makeHost();
        const graph = new Graph(host);

        graphs.push(graph);
        graph.styles.config.graph.viewMode = "2d";
        await graph.init();
        await settle(graph);

        assertDrawnIn2D(graph, "config before init");
    });

    test("a bare Graph, asked through the deprecated twoD flag before init()", async () => {
        const host = makeHost();
        const graph = new Graph(host);

        graphs.push(graph);
        graph.styles.config.graph.twoD = true;
        await graph.init();
        await settle(graph);

        assertDrawnIn2D(graph, "deprecated twoD before init");
    });

    test("switching 2D -> 3D -> 2D still works from an opening 2D", async () => {
        const host = makeHost();
        const graph = new Graph(host);

        graphs.push(graph);
        graph.styles.config.graph.viewMode = "2d";
        await graph.init();
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.setLayout("circular");
        await settle(graph);

        assertDrawnIn2D(graph, "opening state");

        await graph.setViewMode("3d");
        await settle(graph);

        assert.strictEqual(graph.getViewMode(), "3d");
        assert.strictEqual(graph.scene.activeCamera?.mode, Camera.PERSPECTIVE_CAMERA, "should be perspective in 3D");
        assert.strictEqual(graph.scene.metadata?.twoD, false);

        await graph.setViewMode("2d");
        await settle(graph);

        assertDrawnIn2D(graph, "back to 2D");
        for (const node of graph.getNodes()) {
            assert.closeTo(node.mesh.position.z, 0, 0.01, `node ${String(node.id)} should be flat again`);
        }
    });

    test("a redundant setViewMode('2d') on a graph that already opened in 2D changes nothing", async () => {
        const host = makeHost();
        const graph = new Graph(host);

        graphs.push(graph);
        graph.styles.config.graph.viewMode = "2d";
        await graph.init();
        await graph.addNodes(NODES);
        await graph.setLayout("circular");
        await settle(graph);

        const before = [...graph.getNodes()].map((node) => node.mesh.uniqueId);

        await graph.setViewMode("2d");
        await settle(graph);

        assertDrawnIn2D(graph, "after a redundant switch");
        assert.deepStrictEqual(
            [...graph.getNodes()].map((node) => node.mesh.uniqueId),
            before,
            "no mesh should have been rebuilt",
        );
    });

    test("a VR attempt that cannot succeed leaves the scene recorded as 3D", async () => {
        const host = makeHost();
        const graph = new Graph(host);

        graphs.push(graph);
        await graph.init();
        await graph.setViewMode("vr");
        await settle(graph);

        // There is no WebXR here, so the switch falls back. What matters beyond the fallback is
        // that the SCENE records the fallback too: leaving an immersive session is decided by
        // what the scene says it is showing, so a scene still labelled "vr" would make the next
        // ordinary switch to 3D try to exit a session that was never entered.
        assert.strictEqual(graph.getViewMode(), "3d");
        assert.strictEqual(graph.scene.metadata?.viewMode, "3d");
        assert.strictEqual(graph.scene.activeCamera?.mode, Camera.PERSPECTIVE_CAMERA);

        await graph.setViewMode("2d");
        await settle(graph);

        assertDrawnIn2D(graph, "after a failed VR attempt");
    });

    test("an opening 3D graph is unaffected", async () => {
        const host = makeHost();
        const graph = new Graph(host);

        graphs.push(graph);
        await graph.init();
        await graph.addNodes(NODES);
        await graph.setLayout("circular");
        await settle(graph);

        assert.strictEqual(graph.getViewMode(), "3d");
        assert.strictEqual(graph.scene.activeCamera?.mode, Camera.PERSPECTIVE_CAMERA);
        assert.notStrictEqual(graph.scene.metadata?.twoD, true);
    });
});
