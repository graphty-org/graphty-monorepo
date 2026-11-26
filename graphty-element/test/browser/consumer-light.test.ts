/**
 * @file A light a consumer adds to the element's scene after the graph has drawn lights its nodes.
 *
 * `element.graph.scene` is public, and a third party adds its own Babylon.js light to it the way it
 * would to any scene. On the default path at commit 57c0ee700e a red point light added after load
 * turns a lit 3D node red; the batched path must do the same. The file runs in "browser" on the
 * objects path and in "forced-batched" on the batched path with the same assertions.
 */

import { PointLight } from "@babylonjs/core/Lights/pointLight.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { afterEach, assert, describe, it } from "vitest";

import { renderPathDefault } from "../../src/meshes/NodeBatch";
import { pixelAt } from "../helpers/canvas-pixels";
import { drawnFrames } from "../helpers/drawn-frames";
import { mountElement, unmountElements } from "../helpers/mount-element";
import { nodePoint } from "../helpers/real-input";

afterEach(unmountElements);

const PATH = renderPathDefault.value;
const COLUMNS = 5;
const NODES = Array.from({ length: COLUMNS * COLUMNS }, (_, i) => ({
    id: `n${String(i)}`,
    position: { x: (i % COLUMNS) * 3, y: Math.floor(i / COLUMNS) * 3, z: 0 },
}));

describe(`a consumer light (${PATH})`, () => {
    it("a light added after load changes a lit node's color in 3D, and its removal changes it back", async () => {
        const element = await mountElement();
        element.renderOnDemand = false;
        await element.session.layout.setDimension("3d");
        await element.session.layout.set("fixed");
        await element.session.data.addNodes(NODES);
        await element.waitForStableFrame();
        if (PATH === "batched") {
            // Nodes only, added after the first frame: a batch draws every one of them.
            assert.equal(element.rowCounts.batchedNodes, NODES.length, JSON.stringify(element.rowCounts));
        }

        const { scene } = element.graph;
        const at = nodePoint(element, "n12");
        const before = await pixelAt(element, at);
        const light = new PointLight("consumer-red", new Vector3(6, 6, -20), scene);
        light.diffuse = new Color3(1, 0, 0);
        light.intensity = 3;
        await drawnFrames(scene, 4);
        const lit = await pixelAt(element, at);
        assert.isAbove(lit[0], before[0] + 20, `red under a red light: ${String(before)} -> ${String(lit)}`);

        light.dispose();
        await drawnFrames(scene, 4);
        const after = await pixelAt(element, at);
        assert.deepEqual(after, before, "the node's color once the light is gone");
    });
});
