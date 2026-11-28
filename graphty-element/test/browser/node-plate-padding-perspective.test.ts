/**
 * @file A solid node's underlay and overlay reach their padding past its outline under 3D perspective, measured in
 * the plane through the node's middle, from near and far (issue #10505: the plates' padding was added at the plate's
 * own depth, so a near camera saw the overlay's padding too wide and the underlay's too narrow, by the ratio of the
 * node's middle depth to the plate's).
 */

import "../../src/graphty-element";

import { type AbstractMesh, type InstancedMesh, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { NODE_EXTENT_PER_SIZE } from "../../src/meshes/NodeMesh";

const SIZE = 320;
const PADDING = 0.3;
const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** The node's meshes, read to measure them. */
type Meshes = { mesh: AbstractMesh } & Record<"underlay" | "overlay", AbstractMesh | null>;

/**
 * One sphere node with an underlay and an overlay padded `PADDING`, in a 3D element of its own.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(SIZE)}px`;
    element.style.height = `${String(SIZE)}px`;
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
        selector: { match: "ids", nodes: ["n"] },
        set: {
            "node.shape": "sphere",
            "node.size": 4,
            "node.underlayOpacity": 1,
            "node.underlayColor": "#00ff00",
            "node.underlayPadding": PADDING,
            "node.overlayOpacity": 0.5,
            "node.overlayColor": "#0000ff",
            "node.overlayPadding": PADDING,
        },
    });
    await element.session.data.addNodes([{ id: "n", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    return element;
}

/**
 * How far a mesh's vertices reach from the node's middle, each seen through the camera onto the plane through the
 * node's middle facing the camera.
 * @param element - The element.
 * @param mesh - The mesh.
 * @returns The farthest reach, in world units.
 */
function reachInMiddlePlane(element: Graphty, mesh: AbstractMesh): number {
    const camera = element.graph.scene.activeCamera;
    assert.exists(camera);
    const view = camera.getViewMatrix();
    mesh.computeWorldMatrix(true);
    const source = (mesh as InstancedMesh).sourceMesh ?? mesh;
    const positions = source.getVerticesData("position") ?? [];
    const world = mesh.getWorldMatrix();
    const middle = Vector3.TransformCoordinates(Vector3.Zero(), view);
    let reach = 0;
    for (let i = 0; i < positions.length; i += 3) {
        const p = Vector3.TransformCoordinates(new Vector3(positions[i], positions[i + 1], positions[i + 2]), world);
        const v = Vector3.TransformCoordinates(p, view);
        const k = middle.z / v.z;
        reach = Math.max(reach, Math.hypot(v.x * k - middle.x, v.y * k - middle.y));
    }
    return reach;
}

describe("a solid's plates keep their padding under perspective (#10505)", () => {
    it("reaches a sphere's underlay and overlay their padding past it, near and far", async () => {
        const element = await mounted();
        const node = element.graph.getDataManager().nodes.get("n") as unknown as Meshes;
        for (const distance of [9, 40]) {
            await element.setCameraTarget({ x: 0, y: 0, z: 0 });
            await element.setCameraPosition({ x: 0, y: 0, z: -distance });
            await element.waitForStableFrame();
            element.graph.scene.render();
            const fill = reachInMiddlePlane(element, node.mesh);
            const expected = PADDING * NODE_EXTENT_PER_SIZE * node.mesh.absoluteScaling.x;
            for (const kind of ["underlay", "overlay"] as const) {
                const plate = node[kind];
                assert.exists(plate, `${kind} drawn`);
                const padding = reachInMiddlePlane(element, plate) - fill;
                // a hundredth of a unit, and 2% of the padding: the outline's own tessellation
                assert.approximately(
                    padding,
                    expected,
                    0.01 + 0.02 * expected,
                    `${kind} from ${String(distance)} away reads ${padding.toFixed(3)}, not ${expected.toFixed(3)}`,
                );
            }
        }
    });
});
