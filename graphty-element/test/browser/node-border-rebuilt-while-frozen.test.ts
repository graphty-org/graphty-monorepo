/**
 * @file A solid's border ring rebuilt round a new outline while the list of what is drawn is frozen (a quiet frame)
 * draws its new submesh, never the old one: the old one's counts overrun the new, shorter buffers, which WebKit refuses
 * ("glDrawElementsInstanced: Insufficient buffer size", seen switching the join preview's looks).
 */

import "../../src/graphty-element";

import type { TargetCamera } from "@babylonjs/core/Cameras/targetCamera.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { SubMesh } from "@babylonjs/core/Meshes/subMesh.js";
import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Two boxes with a dashed border in a 3D view, settled.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "320px";
    element.style.height = "320px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode("3d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.styles.add({
        name: "probe",
        target: "node",
        selector: { match: "everything" },
        set: {
            "node.shape": "box",
            "node.size": 4,
            "node.borderColor": "#0000ff",
            "node.borderStyle": "dashed",
            "node.borderWidth": 0.3,
        },
    });
    await element.session.data.addNodes([
        { id: "a", position: { x: -4, y: 0, z: 0 } },
        { id: "b", position: { x: 4, y: 0, z: 0 } },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

describe("a solid's border rebuilt while the drawn list is frozen", () => {
    it("draws the ring's new submesh", async () => {
        const element = await mounted();
        const { scene } = element.graph;
        const ring = scene.meshes.find((mesh) => mesh.name === "node-border") as Mesh | undefined;
        assert.isDefined(ring, "the border ring is drawn");
        if (ring === undefined) {
            return;
        }
        // A quiet frame freezes the list of what is drawn.
        const frozen = (): boolean => (scene as unknown as { _activeMeshesFrozen: boolean })._activeMeshesFrozen;
        await vi.waitFor(() => {
            assert.isTrue(frozen(), "the settled scene's drawn list is frozen");
        });
        let stale = 0;
        const render = ring.render.bind(ring);
        ring.render = (subMesh: SubMesh, ...rest) => {
            stale += ring.subMeshes.includes(subMesh) ? 0 : 1;
            return render(subMesh, ...rest);
        };
        const before = ring.subMeshes[0];
        // The box's outline seen from another side has another shape, so the ring is rebuilt on the next draw.
        const camera = scene.activeCamera as TargetCamera;
        camera.position.set(20, 14, -10);
        camera.setTarget(camera.position.scale(0));
        scene.render();
        assert.notStrictEqual(ring.subMeshes[0], before, "the ring was rebuilt");
        assert.strictEqual(stale, 0, "no draw used a submesh the ring no longer has");
    });
});
