/**
 * @file The shader guide's two examples run on a real element, and a card and a shape on two
 * layers: whichever layer is higher is drawn (design/rendering/shader-studio/decisions.md sections
 * 1.1 and 3.3). The guide shows the examples verbatim (test/simple/shaders-guide.test.ts), so this
 * runs exactly the code a reader copies.
 */

import "../../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import type { Graphty as PublishedGraphty } from "@graphty/graphty-element";
import { afterAll, afterEach, assert, describe, it } from "vitest";

import { flow } from "../../../docs/examples/shaders/flow";
import { heat } from "../../../docs/examples/shaders/heat";
import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import type { LayerSpec } from "../../../src/catalog/types";
import { operationQueueOf } from "../../../src/Graph";
import { EdgeShaderDrawing } from "../../../src/meshes/EdgeShaderDrawing";
import { NodeShaderDrawing } from "../../../src/meshes/NodeShaderDrawing";
import { defineShader } from "../../../src/simple/defineShader";
import { drawnFrames } from "../../helpers/drawn-frames";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

/**
 * A mounted element drawing in 2D: one node at the origin, or two joined by an edge.
 * @param withEdge - Whether to draw two nodes and an edge.
 * @returns The element.
 */
async function mounted(withEdge = false): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderOnDemand = true;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    const nodes = withEdge
        ? [
              { id: "a", position: { x: -6, y: 0, z: 0 } },
              { id: "b", position: { x: 6, y: 0, z: 0 } },
          ]
        : [{ id: "a", position: { x: 0, y: 0, z: 0 } }];
    await element.session.data.addNodes(nodes);
    if (withEdge) {
        await element.session.data.addEdges([{ source: "a", target: "b" }]);
    }

    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/**
 * Wait until a condition holds, counting drawn frames; fail after a bound.
 * @param element - The element.
 * @param what - What is awaited, for the failure.
 * @param holds - The condition.
 */
async function until(element: Graphty, what: string, holds: () => boolean): Promise<void> {
    const scene = element.graph.getScene();
    for (let i = 0; i < 600 && !holds(); i++) {
        await drawnFrames(scene, 1);
    }

    assert.isTrue(holds(), what);
}

/**
 * The live slots of the node shader batches whose name starts with a role.
 * @param element - The element.
 * @param role - `impostor` or `replace`.
 * @returns How many nodes those batches draw.
 */
function nodeSlots(element: Graphty, role: "impostor" | "replace"): number {
    const slots = NodeShaderDrawing.peek(element.graph.getScene())?.stats().slots ?? new Map<string, number>();
    return [...slots].filter(([key]) => key.startsWith(`${role}|`)).reduce((sum, [, count]) => sum + count, 0);
}

/**
 * Read one pixel of the canvas at a point in CSS pixels, after the next frames.
 * @param element - The element.
 * @param x - CSS pixels from the left.
 * @param y - CSS pixels from the top.
 * @returns r, g, b, a.
 */
async function pixelAt(element: Graphty, x: number, y: number): Promise<number[]> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 2);
    const scale = engine.getRenderWidth() / WIDTH;
    const read = (await engine.readPixels(
        Math.round(x * scale),
        Math.round(engine.getRenderHeight() - y * scale),
        1,
        1,
    )) as unknown as Uint8Array;
    return [read[0], read[1], read[2], read[3]];
}

describe("the shader guide's examples", () => {
    it("draws the heat look with the layer's hot color", async () => {
        const element = await mounted();
        await heat(element as unknown as PublishedGraphty);
        await operationQueueOf(element.graph).waitForCompletion();
        await until(element, "the node is drawn by the heat look", () => nodeSlots(element, "impostor") === 1);

        const node = element.graph.getNode("a");
        assert.isDefined(node);
        const world = node.mesh.getAbsolutePosition();
        const radius = node.roundRadius ?? node.size / 2;
        // Halfway up the node, where the look is three quarters hot: red, with little green, so
        // the layer's #ff0000 replaced the default #ff5500.
        const up = element.worldToScreen(world.add(new Vector3(0, radius * 0.5, 0)));
        const [r, g] = await pixelAt(element, up.x, up.y);
        assert.isAbove(r, 60, `red leads, read ${String(r)},${String(g)}`);
        assert.isBelow(g, r / 3, `the hot color is the layer's, read ${String(r)},${String(g)}`);
    });

    it("draws the flow look on the edge's line", async () => {
        const element = await mounted(true);
        await flow(element as unknown as PublishedGraphty);
        await operationQueueOf(element.graph).waitForCompletion();
        await until(element, "the edge is drawn by the flow look", () =>
            [...(EdgeShaderDrawing.peek(element.graph.getScene())?.stats().slots.values() ?? [])].some(
                (count) => count > 0,
            ),
        );
    });
});

describe("a card and a shape on two layers", () => {
    const card: LayerSpec = {
        name: "Card",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shaders": [{ shader: "guide/card" }] },
    };
    const box: LayerSpec = {
        name: "Box",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shape": "box" },
    };

    it("draws whichever the higher layer sets, and names a lower shape covered", async () => {
        defineShader({
            id: "guide/card",
            place: "replace",
            glsl: "vec4 shade(NodeInput n) { return vec4(0.0, 1.0, 0.0, 1.0); }",
        });

        const shapeOnTop = await mounted();
        await shapeOnTop.session.styles.add(card);
        await operationQueueOf(shapeOnTop.graph).waitForCompletion();
        await until(shapeOnTop, "the card alone is drawn", () => nodeSlots(shapeOnTop, "replace") === 1);
        await shapeOnTop.session.styles.add(box);
        await operationQueueOf(shapeOnTop.graph).waitForCompletion();
        await until(
            shapeOnTop,
            "the box on the higher layer is drawn, not the card",
            () => nodeSlots(shapeOnTop, "replace") === 0,
        );
        const shape = shapeOnTop.session.styles.explain({ node: "a" }).channels.find((c) => c.channel === "node.shape");
        assert.isUndefined(shape?.coveredBy, "a shape above the card is not covered");

        const cardOnTop = await mounted();
        const lower = await cardOnTop.session.styles.add(box);
        const higher = await cardOnTop.session.styles.add(card);
        await operationQueueOf(cardOnTop.graph).waitForCompletion();
        await until(cardOnTop, "the card on the higher layer is drawn", () => nodeSlots(cardOnTop, "replace") === 1);
        const covered = cardOnTop.session.styles
            .explain({ node: "a" })
            .channels.find((c) => c.channel === "node.shape");
        assert.strictEqual(covered?.layerId, lower.id);
        assert.strictEqual(covered?.coveredBy, higher.id, "the lower layer's Shape is covered by the card");
    });
});
