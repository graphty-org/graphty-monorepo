/**
 * @file Hidden edges skipping the join shader in a VR session: each eye draws the edges a time
 * window shows and none of the ones it hides. test/browser/edge-skip-hidden.test.ts draws the
 * same on the canvas.
 */

import "../../src/graphty-element";

import { ShaderMaterial } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { isEdgeLineBatchMesh } from "../../src/meshes/EdgeLineBatch";
import { drawnFrames } from "../helpers/drawn-frames";
import { styleEveryEdge, styleEveryNode } from "../helpers/testSetup";
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
 * How many line-colored pixels each eye shows as a frame finishes.
 * @returns The count in each eye.
 */
async function lineInk(): Promise<{ left: number; right: number }> {
    const scene = element.graph.getScene();
    const canvas = scene.getEngine().getRenderingCanvas();
    assert.isNotNull(canvas);
    await drawnFrames(scene, 4);
    const data = await new Promise<Uint8ClampedArray>((resolve) => {
        scene.onAfterRenderObservable.addOnce(() => {
            const copy = new OffscreenCanvas(canvas.width, canvas.height);
            const context = copy.getContext("2d", { willReadFrequently: true });
            assert.isNotNull(context);
            context.drawImage(canvas, 0, 0);
            resolve(context.getImageData(0, 0, canvas.width, canvas.height).data);
        });
    });
    const ink = { left: 0, right: 0 };
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 1] > 150 && data[i] < 100 && data[i + 2] < 100) {
            ink[(i >> 2) % canvas.width < canvas.width / 2 ? "left" : "right"]++;
        }
    }

    return ink;
}

describe("hidden edges in XR", () => {
    it("each eye draws the shown edges and none of the hidden ones", async () => {
        element = document.createElement("graphty-element");
        element.style.width = "400px";
        element.style.height = "300px";
        element.style.display = "block";
        element.features = ["timeline"];
        element.xr = { enabled: true, ui: { enabled: true, showAvailabilityWarning: false } };
        document.body.append(element);
        await element.updateComplete;
        // In front of the headset, which stands at eye height and looks along +z in Babylon's space.
        const rows = [0.6, 1.1, 1.6];
        await element.session.data.addNodes(
            rows.flatMap((y, row) => [
                { id: `src${String(row)}`, position: { x: -1.5, y, z: 4 } },
                { id: `dst${String(row)}`, position: { x: 1.5, y, z: 4 } },
            ]),
        );
        await element.session.data.addEdges(
            rows.map((_, row) => ({ src: `src${String(row)}`, dst: `dst${String(row)}`, t: row })),
        );
        await element.graph.setLayout("fixed", { dim: 3 });
        await styleEveryNode(element.graph, { "node.color": "#808080", "node.size": 0.1 });
        await styleEveryEdge(element.graph, { "edge.color": "#00ff00", "edge.width": 4 });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.setViewMode("vr");
        const { graph } = element;
        await drawnFrames(graph.getScene(), 10);
        assert.equal(graph.getScene().activeCamera?.rigCameras.length, 2, "two eyes are drawing");

        const { time } = element.session;
        await time.setField({ edges: { start: "t" } });
        await time.ready;
        await time.window({ from: 0, to: 3, step: 1, nodes: "ends" });
        await operationQueueOf(graph).waitForCompletion();
        const all = await lineInk();
        const lines = graph.getScene().meshes.filter((mesh) => isEdgeLineBatchMesh(mesh));
        assert.isAbove(lines.length, 0, "the edges are drawn as batches");
        for (const mesh of lines) {
            assert.instanceOf(mesh.material, ShaderMaterial);
            assert.include(mesh.material.options.defines, "#define EDGE_SKIP_HIDDEN");
        }

        await time.window({ from: 0, to: 1, step: 1, nodes: "ends" });
        await operationQueueOf(graph).waitForCompletion();
        const one = await lineInk();

        await time.window({ from: 10, to: 11, step: 1, nodes: "ends" });
        await operationQueueOf(graph).waitForCompletion();
        const none = await lineInk();

        for (const eye of ["left", "right"] as const) {
            assert.isAbove(all[eye], 0, `the ${eye} eye draws the shown edges`);
            assert.isAbove(one[eye], 0, `the ${eye} eye draws the one edge left`);
            assert.isBelow(one[eye], all[eye], `the ${eye} eye draws fewer edges with two hidden`);
            assert.strictEqual(none[eye], 0, `the ${eye} eye draws no hidden edge`);
        }
    });
});
