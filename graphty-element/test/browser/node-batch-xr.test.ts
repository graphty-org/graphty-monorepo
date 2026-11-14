/**
 * @file Each eye draws the same whole frame on both render paths, laser included.
 *
 * A batched row has no mesh. Babylon's laser picks the scene, so the element moves an invisible
 * stand-in onto the row each controller's ray finds, and the laser lands on it as on the row's mesh.
 */

import "../../src/graphty-element";

import type { AbstractMesh, WebXRInputSource } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { installIWER, type IWERHandle } from "../interactions/helpers/iwer-setup";

let iwer: IWERHandle;
let element: Graphty;

beforeEach(() => {
    iwer = installIWER();
});

afterEach(() => {
    element.remove();
    iwer.uninstall();
});

/**
 * Read the canvas as a frame finishes.
 * @returns Its pixels, left eye then right eye across each line.
 */
async function wholeFrame(): Promise<Uint8ClampedArray> {
    const scene = element.graph.getScene();
    const canvas = scene.getEngine().getRenderingCanvas();
    assert.isNotNull(canvas);
    await drawnFrames(scene, 4);
    return new Promise((resolve) => {
        scene.onAfterRenderObservable.addOnce(() => {
            const copy = new OffscreenCanvas(canvas.width, canvas.height);
            const context = copy.getContext("2d", { willReadFrequently: true });
            assert.isNotNull(context);
            context.drawImage(canvas, 0, 0);
            resolve(context.getImageData(0, 0, canvas.width, canvas.height).data);
        });
    });
}

/**
 * Count the bytes of each eye that differ by more than a level.
 * @param first - One frame.
 * @param second - The other frame.
 * @returns The count in each eye.
 */
function differing(first: Uint8ClampedArray, second: Uint8ClampedArray): { left: number; right: number } {
    const line = element.graph.getScene().getEngine().getRenderingCanvas()?.width ?? 0;
    const counts = { left: 0, right: 0 };
    for (let i = 0; i < first.length; i++) {
        if (Math.abs((first[i] ?? 0) - (second[i] ?? 0)) > 1) {
            counts[(i >> 2) % line < line / 2 ? "left" : "right"]++;
        }
    }

    return counts;
}

/** Where a laser landed. */
interface Landed {
    controller: WebXRInputSource;
    mesh: AbstractMesh;
    node: LandedNode;
}

/** The node a laser landed on, as its mesh's metadata names it. */
interface LandedNode {
    id: unknown;
    drawnPickMesh: AbstractMesh | null;
    drawnPosition: { x: number };
}

/**
 * Wait for a laser to land on a node. Babylon casts from one controller, whichever attached first.
 * @returns The controller, the mesh it landed on and its node.
 */
async function laserOnANode(): Promise<Landed> {
    const helper = element.graph.getXRSessionManager()?.getXRHelper();
    return vi.waitFor(() => {
        const landed = helper?.input.controllers
            .map((controller) => ({
                controller,
                mesh: helper.pointerSelection.getMeshUnderPointer(controller.uniqueId),
            }))
            .find(({ mesh }) => mesh !== null && mesh !== undefined);
        assert.exists(landed?.mesh, "no laser landed");
        const { controller, mesh } = landed as { controller: WebXRInputSource; mesh: AbstractMesh };
        assert.match(mesh.name, /^node-style/, "a laser landed on something else");
        const { graphNode } = (mesh.metadata ?? {}) as { graphNode?: LandedNode };
        assert.exists(graphNode, "the laser landed on no node");
        return { controller, mesh, node: graphNode };
    });
}

/**
 * Open the element in VR with 24 nodes in front of the headset and each controller pointing straight ahead.
 */
async function rowsInFrontOfTheHeadset(): Promise<void> {
    element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    element.xr = { enabled: true, ui: { enabled: true, showAvailabilityWarning: false } };
    document.body.append(element);
    await element.updateComplete;
    // In front of the headset, which stands at eye height and looks along +z in Babylon's space.
    await element.session.data.addNodes(
        Array.from({ length: 24 }, (_, id) => ({
            id,
            position: { x: (id % 6) - 2.5, y: Math.floor(id / 6) + 0.1, z: 4 },
        })),
    );
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.setViewMode("vr");
    await drawnFrames(element.graph.getScene(), 10);
    assert.equal(element.graph.getScene().activeCamera?.rigCameras.length, 2, "two eyes are drawing");
    // Each controller points straight ahead, down a row.
    iwer.device.controllers.left?.position.set(-0.5, 1.1, 0);
    iwer.device.controllers.right?.position.set(0.5, 1.1, 0);
}

describe("node batches in XR", () => {
    it("draw each eye's whole frame as the object rows do, laser on a row", async () => {
        await rowsInFrontOfTheHeadset();
        const { graph } = element;
        const onObjects = (await laserOnANode()).node.id;
        const objects = await wholeFrame();
        graph.setRenderPath("batched");
        const batched = await wholeFrame();

        const onRows = await laserOnANode();
        assert.equal(onRows.node.id, onObjects, "the laser stays on the same row");
        assert.isNull(onRows.node.drawnPickMesh, "the row has no mesh");
        assert.equal(graph.rowCounts.batchedNodes, 24);
        assert.deepEqual(differing(objects, batched), { left: 0, right: 0 });

        // Without the rows the frame changes in each eye, so the comparison above held rows.
        await element.session.data.clear();
        await operationQueueOf(graph).waitForCompletion();
        const ink = differing(batched, await wholeFrame());
        assert.isAbove(ink.left, 10000, "the left eye drew no rows");
        assert.isAbove(ink.right, 10000, "the right eye drew no rows");
    });

    it("select and drag a row with no mesh by the trigger", async () => {
        await rowsInFrontOfTheHeadset();
        const { graph } = element;
        const scene = graph.getScene();
        graph.setRenderPath("batched");
        await drawnFrames(scene, 4);
        const { controller, node } = await laserOnANode();
        assert.isNull(node.drawnPickMesh, "the row has no mesh");
        const hand = iwer.device.controllers[controller.inputSource.handedness as "left" | "right"];
        assert.exists(hand);

        // A tap: press and release where it points.
        hand.updateButtonValue("trigger", 1);
        await drawnFrames(scene, 4);
        hand.updateButtonValue("trigger", 0);
        await drawnFrames(scene, 4);
        assert.equal(graph.getSelectedNode()?.id, node.id, "the tap selected the row");

        // A drag: press, move the controller to the right, release.
        const before = node.drawnPosition.x;
        hand.updateButtonValue("trigger", 1);
        await drawnFrames(scene, 4);
        for (let step = 0; step < 10; step++) {
            hand.position.x += 0.05;
            await drawnFrames(scene, 2);
        }
        hand.updateButtonValue("trigger", 0);
        await drawnFrames(scene, 4);
        assert.isAbove(node.drawnPosition.x, before + 0.1, "the row followed the controller");
        assert.isNull(node.drawnPickMesh, "the row still has no mesh");
        assert.equal(graph.rowCounts.batchedNodes, 24);
    });
});
