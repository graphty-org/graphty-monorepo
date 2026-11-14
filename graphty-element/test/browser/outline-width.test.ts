/**
 * @file Outline width: `node.outlineWidth` per style layer, and `layoutBehavior.node.outlineWidth`,
 * the width of every outline whose layer sets none, which widens such rings whether they are drawn
 * already or are made later.
 */

import "../../src/graphty-element";

import { Mesh, VertexBuffer } from "@babylonjs/core";
import { afterAll, afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { clearRegisteredShadersForTesting } from "../../src/catalog/shaderRegistry";
import { operationQueueOf } from "../../src/Graph";
import { NodeBillboardBatch } from "../../src/meshes/NodeBillboardBatch";
import { defineShader } from "../../src/simple/defineShader";
import { drawnFrames } from "../helpers/drawn-frames";

afterAll(() => {
    clearRegisteredShadersForTesting();
});

/**
 * A graph of one outlined node.
 * @returns The element.
 */
async function outlined(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "300px";
    element.style.height = "200px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.session.styles.add({
        name: "Outlined",
        target: "node",
        selector: { match: "everything" },
        set: { "node.outline": "#ff0000" },
    });
    await element.session.styles.settled();
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();

    return element;
}

/**
 * How far the outline ring reaches, as the scene holds its geometry: the largest radius of the
 * ring source mesh's vertices. The outline is a ring mesh around the node (e8546ecf5f), and its
 * width is the band between the ring's inner and outer radius.
 * @param element - The element.
 * @param color - The ring's color, which starts its source mesh's name.
 * @returns The ring's inner and outer radius.
 */
function ring(element: Graphty, color = "#ff0000"): [number, number] {
    const source = element.graph.scene.meshes.find(
        (mesh): mesh is Mesh =>
            mesh instanceof Mesh && mesh.name.toLowerCase().startsWith(`graphty-node-outline-${color}`),
    );
    assert.isDefined(source, "an outlined node drew an outline ring");
    const positions = source?.getVerticesData(VertexBuffer.PositionKind) ?? [];
    const radii: number[] = [];
    for (let at = 0; at < positions.length; at += 3) {
        radii.push(Math.hypot(positions[at], positions[at + 1]));
    }

    return [Math.min(...radii), Math.max(...radii)];
}

/**
 * The ring width the shader batch last wrote for a ringed slot: graphtyDeco1.y, a multiple of
 * the ring's own band, or undefined before any. Watches every slot write while the test runs.
 * @returns A reader of the width, and the watch's end.
 */
function watchBatchRing(): { width: () => number | undefined; stop: () => void } {
    let width: number | undefined;
    const { write } = NodeBillboardBatch.prototype;
    const spy = vi.spyOn(NodeBillboardBatch.prototype, "write").mockImplementation(function (
        this: NodeBillboardBatch,
        index,
        values,
        speed,
    ) {
        if (values.deco1[0] !== 0) {
            width = values.deco1[1];
        }

        write.call(this, index, values, speed);
    });
    return {
        width: () => width,
        stop: () => {
            spy.mockRestore();
        },
    };
}

/**
 * Wait until the shader batch has written this ring width, a drawn frame at a time.
 * @param element - The element.
 * @param width - Reads the width last written.
 * @param want - The width.
 */
async function batchDraws(element: Graphty, width: () => number | undefined, want: number): Promise<void> {
    const scene = element.graph.getScene();
    while (width() !== want) {
        await drawnFrames(scene, 1);
    }
}

describe("the graph's outline width", () => {
    let element: Graphty | undefined;

    afterEach(() => {
        element?.remove();
        element = undefined;
    });

    it("widens every outline when it is set, and returns to the renderer's own when cleared", async () => {
        element = await outlined();
        const [inner, outer] = ring(element);

        element.layoutBehavior = { node: { outlineWidth: 2 } };
        const [wideInner, wideOuter] = ring(element);
        assert.closeTo(wideInner, inner, 1e-6, "the ring still starts at the node");
        assert.closeTo(wideOuter - wideInner, (outer - inner) * 2, 1e-6, "the band is twice as wide");

        element.layoutBehavior = { node: { outlineWidth: undefined } };
        const [backInner, backOuter] = ring(element);
        assert.closeTo(backInner, inner, 1e-6);
        assert.closeTo(backOuter, outer, 1e-6, "and back to the renderer's own width");
    });

    it("draws each layer's outline at the width the layer sets, and the graph's width only where none is set", async () => {
        element = await outlined();
        const [inner, outer] = ring(element);
        await element.session.data.addNodes([{ id: "b", position: { x: 2, y: 0, z: 0 } }]);
        await element.session.styles.add({
            name: "Wide blue",
            target: "node",
            selector: { match: "ids", nodes: ["b"] },
            set: { "node.outline": "#0000ff", "node.outlineWidth": 3 },
        });
        await element.session.styles.settled();
        await operationQueueOf(element.graph).waitForCompletion();

        // A style edit resolves once its pass has run; the meshes take its paint on the next update.
        await element.waitForStableFrame();
        const [blueInner, blueOuter] = ring(element, "#0000ff");
        assert.closeTo(blueInner, inner, 1e-6, "the wide ring still starts at the node");
        assert.closeTo(blueOuter - blueInner, (outer - inner) * 3, 1e-6, "the layer's width: three times as wide");
        const [redInner, redOuter] = ring(element);
        assert.closeTo(redOuter - redInner, outer - inner, 1e-6, "the other layer's ring keeps its width");

        element.layoutBehavior = { node: { outlineWidth: 2 } };
        const [, redWide] = ring(element);
        assert.closeTo(redWide - inner, (outer - inner) * 2, 1e-6, "the graph's width reaches a ring with none");
        const [, blueStill] = ring(element, "#0000ff");
        assert.closeTo(blueStill, blueOuter, 1e-6, "and not one whose layer sets its own");
    });

    it("widens a ring the shader batch draws when it is set after the node was painted", async () => {
        defineShader({ id: "outline-width/flat", glsl: "vec4 shade(NodeInput n) { return vec4(n.color.rgb, 1.0); }" });
        const ring = watchBatchRing();
        try {
            element = await outlined();
            await element.session.styles.add({
                name: "Flat",
                target: "node",
                selector: { match: "everything" },
                set: { "node.shaders": [{ shader: "outline-width/flat" }] },
            });
            await element.session.styles.settled();
            await operationQueueOf(element.graph).waitForCompletion();
            // The node's ring is drawn by the shader batch, at the renderer's own width.
            await batchDraws(element, ring.width, 1);

            element.layoutBehavior = { node: { outlineWidth: 3 } };
            await batchDraws(element, ring.width, 3);

            element.layoutBehavior = { node: { outlineWidth: undefined } };
            await batchDraws(element, ring.width, 1);
        } finally {
            ring.stop();
        }
    });
});
