/**
 * @file A switch between 2D and 3D on the objects path keeps every node's own mesh and draws it
 * from the new dimension's source, rather than disposing it and building another (issue #10226):
 * at 10,000 nodes building and disposing an instance per node was most of the switch. Counted,
 * never timed: no node mesh is built or disposed by the switch, and every node ends drawn exactly
 * as a graph opened in that dimension draws it -- the same source, the same box, the same border.
 *
 * Run (from graphty-element):
 *   ../tools/with-browser.sh ../tools/low-priority.sh npx vitest run --project=browser \
 *     test/browser/view-switch-keeps-node-meshes.test.ts
 * The file sets its render path itself.
 */
import "../../src/graphty-element";

import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const IDS = Array.from({ length: 12 }, (_, i) => `n${String(i)}`);

const cleanups: (() => void)[] = [];
afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * An element on the objects path showing bordered nodes in a row, at rest.
 * @param view - The view it opens in.
 * @returns The element.
 */
async function mounted(view: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderPath = "objects";
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(view);
    await element.session.styles.add({
        name: "Bordered",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#2040ff", "node.borderWidth": 2, "node.borderColor": "#ff8000" },
    });
    await element.session.data.addNodes(IDS.map((id, i) => ({ id, position: { x: i * 3 - 15, y: i % 3, z: i } })));
    await element.session.data.addEdges(IDS.slice(1).map((id, i) => ({ source: IDS[i], target: id })));
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Each node's own mesh, by node id, read from the scene (reading `Node.mesh` would keep it).
 * @param element - The element.
 * @returns The meshes.
 */
function nodeMeshes(element: Graphty): Map<string, InstancedMesh> {
    const meshes = new Map<string, InstancedMesh>();
    for (const mesh of element.graph.getScene().meshes) {
        const id = (mesh.metadata as { nodeId?: unknown } | null)?.nodeId;
        if (mesh instanceof InstancedMesh && typeof id === "string" && mesh.name.startsWith("node-style-")) {
            meshes.set(id, mesh);
        }
    }

    return meshes;
}

/**
 * What a node mesh draws: its source, its box in the world and the sources of what hangs from it.
 * @param mesh - The mesh.
 * @returns A comparable summary.
 */
function drawing(mesh: InstancedMesh): string {
    mesh.computeWorldMatrix(true);
    const { minimumWorld, maximumWorld } = mesh.getBoundingInfo().boundingBox;
    const round = (n: number): string => n.toFixed(3);
    const children = mesh
        .getChildMeshes(true)
        .filter((child) => child instanceof InstancedMesh)
        .map((child) => child.sourceMesh.name)
        .sort();
    return JSON.stringify({
        name: mesh.name,
        source: mesh.sourceMesh.name,
        min: minimumWorld.asArray().map(round),
        max: maximumWorld.asArray().map(round),
        children,
        visible: mesh.isVisible,
        enabled: mesh.isEnabled(),
        pickable: mesh.isPickable,
    });
}

describe("a switch between 2D and 3D on the objects path", () => {
    it.each([
        ["3d", "2d"],
        ["2d", "3d"],
    ] as const)("keeps every node mesh from %s to %s, drawn as a graph opened in it", async (from, to) => {
        const element = await mounted(from);
        const scene = element.graph.getScene();
        const before = nodeMeshes(element);
        assert.strictEqual(before.size, IDS.length, "every node has its own mesh");

        let built = 0;
        let disposed = 0;
        const counts = (mesh: unknown): boolean =>
            mesh instanceof InstancedMesh && mesh.name.startsWith("node-style-") && before.has(nodeIdOf(mesh));
        const added = scene.onNewMeshAddedObservable.add((mesh) => {
            if (mesh instanceof InstancedMesh && mesh.name.startsWith("node-style-")) {
                built++;
            }
        });
        const removed = scene.onMeshRemovedObservable.add((mesh) => {
            if (counts(mesh)) {
                disposed++;
            }
        });
        try {
            await element.setViewMode(to);
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
        } finally {
            scene.onNewMeshAddedObservable.remove(added);
            scene.onMeshRemovedObservable.remove(removed);
        }

        assert.strictEqual(built, 0, "node meshes built by the switch");
        assert.strictEqual(disposed, 0, "node meshes disposed by the switch");
        const after = nodeMeshes(element);
        for (const id of IDS) {
            const mesh = after.get(id);
            assert.strictEqual(mesh, before.get(id), `node ${id} keeps its mesh`);
            assert.isTrue(mesh?.sourceMesh.instances.includes(mesh), `node ${id} is one of its source's instances`);
            assert.isFalse(mesh?.sourceMesh.isDisposed(), `node ${id}'s source is live`);
        }

        // Positions are the layout's, so they match the fresh graph only once both are at rest.
        const fresh = await mounted(to);
        const opened = nodeMeshes(fresh);
        for (const id of IDS) {
            const mesh = after.get(id);
            const other = opened.get(id);
            assert.isDefined(mesh);
            assert.isDefined(other);
            assert.strictEqual(drawing(mesh), drawing(other), `node ${id} is drawn as a graph opened in ${to}`);
        }
    });
});

/**
 * The node id a node mesh carries.
 * @param mesh - The mesh.
 * @returns The id, or "".
 */
function nodeIdOf(mesh: InstancedMesh): string {
    const id = (mesh.metadata as { nodeId?: unknown } | null)?.nodeId;
    return typeof id === "string" ? id : "";
}
