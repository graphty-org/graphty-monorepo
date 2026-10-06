/**
 * @file Tearing many nodes and edges down at once takes exactly their meshes out of the scene, and
 * does it without searching the whole scene once per mesh (issue #543).
 *
 * Babylon's `mesh.dispose()` finds the mesh in `scene.meshes` and in its parent's children with
 * `indexOf` and removes it with `splice`, so disposing N meshes one at a time out of a scene of N
 * costs N x N. At the element's render ceiling (50,000 nodes) that made a clear, a replacing
 * import or undoing a load take about 20 s. The data manager now drops every mesh it is about to
 * dispose from both lists in one pass first, so each dispose searches only what is left.
 *
 * The scaling half is checked structurally, not with a stopwatch: `scene.removeMesh` is watched,
 * and the length of the list it has to search is recorded each time it removes one of the
 * graph's meshes.
 */

import { type AbstractActionManager, AbstractMesh, type Scene, type TransformNode } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";

const NODES = 300;
const EDGES = NODES / 2;

let graph: Graph;
let container: HTMLElement;

/**
 * The transform node every node and edge mesh hangs from.
 * @param scene - The scene.
 * @returns graph-root
 */
function graphRoot(scene: Scene): TransformNode {
    const root = scene.getTransformNodeByName("graph-root");
    assert.isNotNull(root, "the scene has a graph-root");
    return root;
}

/**
 * Whether a mesh is a shared batch that draws many edges' lines or arrowheads as thin instances,
 * rather than one element's own mesh.
 * @param mesh - The mesh.
 * @returns True for a batch.
 */
function isBatch(mesh: unknown): mesh is AbstractMesh {
    return mesh instanceof AbstractMesh && mesh.hasThinInstances;
}

/**
 * Every mesh the graph's nodes and edges own right now that a test can reach: each element's own
 * mesh and the meshes parented to it (a node's label plane). A line or an arrowhead drawn as a
 * slot in a shared batch owns no mesh; the batches are in {@link batchMeshes}.
 * @returns The meshes.
 */
function elementMeshes(): Set<AbstractMesh> {
    const meshes = new Set<AbstractMesh>();
    const add = (mesh: AbstractMesh | null | undefined): void => {
        if (mesh && !mesh.isDisposed()) {
            meshes.add(mesh);
            for (const child of mesh.getChildMeshes(false)) {
                meshes.add(child);
            }
        }
    };
    const data = graph.getDataManager();
    for (const node of data.nodes.values()) {
        add(node.mesh);
    }

    for (const edge of data.edges.values()) {
        if ("getScene" in edge.mesh && !isBatch(edge.mesh)) {
            add(edge.mesh);
        }
    }

    return meshes;
}

/**
 * The shared meshes the graph's edges are drawn by right now: line batches and arrowhead batches.
 * @returns The batch meshes.
 */
function batchMeshes(): Set<AbstractMesh> {
    const batches = new Set<AbstractMesh>();
    for (const edge of graph.getDataManager().edges.values()) {
        for (const mesh of [edge.mesh, edge.arrowCap?.batchMesh, edge.arrowTailCap?.batchMesh]) {
            if (isBatch(mesh) && !mesh.isDisposed()) {
                batches.add(mesh);
            }
        }
    }

    return batches;
}

/**
 * Watch what `scene.removeMesh` has to search while the graph's meshes go.
 * @param scene - The scene.
 * @returns The longest `scene.meshes` and graph-root child list seen while a mesh of the graph
 *     was removed, and a function that stops watching.
 */
function watchRemovals(scene: Scene): { longest: { meshes: number; children: number }; stop: () => void } {
    const root = graphRoot(scene);
    const longest = { meshes: 0, children: 0 };
    const original = scene.removeMesh.bind(scene);
    scene.removeMesh = (mesh: AbstractMesh, recursive?: boolean): number => {
        longest.meshes = Math.max(longest.meshes, scene.meshes.length);
        if (mesh.parent === root) {
            longest.children = Math.max(longest.children, root.getChildren().length);
        }

        return original(mesh, recursive);
    };
    return {
        longest,
        stop: () => {
            scene.removeMesh = original;
        },
    };
}

/**
 * The scene's action manager list, read through a plain shape because lint sees only the
 * deprecation `IAssetContainer` puts on it.
 * @param scene - The scene.
 * @returns The list.
 */
function actionManagers(scene: Scene): AbstractActionManager[] {
    return (scene as { actionManagers: AbstractActionManager[] }).actionManagers;
}

describe("tearing many elements down at once", () => {
    let baselineMeshes = 0;
    let baselineChildren = 0;
    let baselineManagers = 0;
    let baselineObservers = 0;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();
        graph.engine.stopRenderLoop();
        await graph.setLayout("random");
        const scene = graph.getScene();
        baselineMeshes = scene.meshes.length;
        baselineChildren = graphRoot(scene).getChildren().length;
        baselineManagers = actionManagers(scene).length;
        baselineObservers = scene.onPrePointerObservable.observers.length;
        const session = graph.getSession();
        // Labels, so a node owns a child mesh as well as its own.
        await session.styles.add({
            name: "Node words",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "HELLO" },
        });
        await session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({
                    nodes: Array.from({ length: NODES }, (_, at) => ({ id: `v${String(at)}` })),
                    edges: Array.from({ length: EDGES }, (_, at) => ({
                        src: `v${String(2 * at)}`,
                        dst: `v${String(2 * at + 1)}`,
                    })),
                }),
            },
        });
        await operationQueueOf(graph).waitForCompletion();
        // One frame by hand, since the render loop is stopped: the update pass is what paints the
        // style onto the nodes, and so what builds their labels. Painting rebuilds each node's
        // mesh, and Babylon takes the replaced drag handlers' pointer observers out on a timer of
        // its own, so let that timer run before anything is counted.
        graph.update();
        await new Promise<void>((done) => {
            setTimeout(done, 0);
        });
        assert.strictEqual(session.snapshot().nodeCount, NODES);
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    it("a clear empties the scene without searching it once per mesh", async () => {
        const scene = graph.getScene();
        const owned = elementMeshes();
        assert.isAtLeast(owned.size, NODES * 2, "every node drew a mesh and a label");
        const batches = batchMeshes();
        assert.isNotEmpty(batches, "the edges are drawn by shared batches");
        const watch = watchRemovals(scene);
        try {
            await graph.getSession().data.clear();
            await operationQueueOf(graph).waitForCompletion();
        } finally {
            watch.stop();
        }

        for (const mesh of owned) {
            assert.isTrue(mesh.isDisposed(), `${mesh.name} was disposed`);
        }

        // A batch goes with the last edge it draws.
        for (const mesh of batches) {
            assert.isTrue(mesh.isDisposed(), `${mesh.name} was disposed`);
        }

        assert.strictEqual(scene.meshes.length, baselineMeshes, "nothing was left in the scene");
        assert.strictEqual(graphRoot(scene).getChildren().length, baselineChildren, "nothing was left on graph-root");
        // Each node's action manager and its two pointer observers went too, at once: Babylon removes
        // an observer from a timer of its own, so one still listed here would be one left for it.
        assert.strictEqual(actionManagers(scene).length, baselineManagers, "every action manager left the scene");
        assert.strictEqual(
            scene.onPrePointerObservable.observers.length,
            baselineObservers,
            "every pointer observer left the scene",
        );
        // Before the bulk path, the first dispose searched every mesh the graph had drawn.
        assert.isBelow(watch.longest.meshes, baselineMeshes + 20, "each dispose searched only what was left");
        assert.isBelow(watch.longest.children, baselineChildren + 20, "each dispose searched only what was left");
    });

    it("removing some nodes takes exactly their meshes out, and no others", async () => {
        const scene = graph.getScene();
        const data = graph.getDataManager();
        const before = elementMeshes();
        const batches = batchMeshes();
        assert.isNotEmpty(batches, "the edges are drawn by shared batches");
        const removedIds = Array.from({ length: 40 }, (_, at) => `v${String(5 * at)}`);
        const meshCountBefore = scene.meshes.length;
        const rootBefore = new Set(graphRoot(scene).getChildren());
        const watch = watchRemovals(scene);
        try {
            await graph.getSession().data.removeNodes(removedIds);
            await operationQueueOf(graph).waitForCompletion();
        } finally {
            watch.stop();
        }

        const after = elementMeshes();
        const gone = [...before].filter((mesh) => !after.has(mesh));
        // Each removed node took its mesh and its label with it; v0, v10, ... also took an edge.
        assert.isAtLeast(gone.length, removedIds.length * 2);
        const inScene = new Set(scene.meshes);
        const onRoot = new Set(graphRoot(scene).getChildren());
        for (const mesh of gone) {
            assert.isTrue(mesh.isDisposed(), `${mesh.name} was disposed`);
            assert.isFalse(inScene.has(mesh), `${mesh.name} left the scene`);
            assert.isFalse(onRoot.has(mesh), `${mesh.name} left graph-root`);
        }

        for (const mesh of after) {
            assert.isFalse(mesh.isDisposed(), `${mesh.name} is still drawn`);
            assert.isTrue(inScene.has(mesh), `${mesh.name} is still in the scene`);
        }

        // A batch still draws the edges that stay, so it stays drawn: dropping it from the scene
        // with the edges that went would stop every other edge in it being drawn.
        for (const mesh of batches) {
            assert.isFalse(mesh.isDisposed(), `${mesh.name} is still drawn`);
            assert.isTrue(inScene.has(mesh), `${mesh.name} is still in the scene`);
            assert.isTrue(onRoot.has(mesh), `${mesh.name} is still on graph-root`);
        }

        for (const node of data.nodes.values()) {
            assert.isTrue(onRoot.has(node.mesh), `${node.id} is still on graph-root`);
            assert.strictEqual(node.mesh.parent, graphRoot(scene));
        }

        assert.strictEqual(scene.meshes.length, meshCountBefore - gone.length, "no other mesh left the scene");
        const goneFromRoot = gone.filter((mesh) => rootBefore.has(mesh)).length;
        assert.strictEqual(onRoot.size, rootBefore.size - goneFromRoot, "no other mesh left graph-root");
        // Every doomed mesh was dropped from the list before the first one was disposed.
        assert.isAtMost(watch.longest.meshes, meshCountBefore - gone.length, "each dispose searched only what stays");
    });
});
