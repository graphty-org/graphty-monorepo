/**
 * @file The scene-level shaders drawn on a real graph (design/rendering/shader-styles.md, package
 * E6): a background shader is drawn behind every node and never over a label, and drawn again
 * only when it moves or the camera does; the shared bloom is allocated once while a layer names a bloom shader, on screen or not.
 */

import "../../../src/graphty-element";

import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import type { LayerSpec } from "../../../src/catalog/types";
import { operationQueueOf, renderManagerOf } from "../../../src/Graph";
import { BACKGROUND_LAYER } from "../../../src/meshes/BackgroundPass";
import { BLOOM_LAYER } from "../../../src/meshes/BloomPass";
import { defineShader } from "../../../src/simple/defineShader";
import { leads, pixelAt } from "../../helpers/canvas-pixels";
import { drawnFrames } from "../../helpers/drawn-frames";
import type { Point } from "../../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

beforeAll(() => {
    defineShader({
        id: "e6/sky",
        glsl: "vec4 shade(BackgroundInput b) { return vec4(0.0, 0.0, 1.0, 1.0); }",
    });
    defineShader({
        id: "e6/drift",
        motion: { loop: { speedParam: "drift" } },
        params: { drift: { type: "number", default: 0, min: 0, max: 2 } },
        glsl: "vec4 shade(BackgroundInput b) { return vec4(0.0, 0.0, 0.5 + 0.5 * sin(b.time * drift), 1.0); }",
    });
    defineShader({
        id: "e6/lantern",
        bloom: true,
        glsl: "vec4 shade(NodeInput n) { return vec4(1.0, 0.8, 0.3, 1.0); }",
    });
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element with nodes at fixed places in the 2D view.
 * @param nodes - The nodes, with any data.
 * @param layers - Layers added after the data.
 * @param layout - The layout; "fixed" keeps the places given.
 * @returns The element.
 */
async function mounted(
    nodes: readonly { id: string; x: number; y: number; [key: string]: unknown }[],
    layers: readonly LayerSpec[],
    layout: "fixed" | "ngraph" = "fixed",
): Promise<Graphty> {
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
    await element.session.data.addNodes(
        nodes.map(({ id, x, y, ...data }) => ({ id, ...data, position: { x, y, z: 0 } })),
    );
    await element.graph.setLayout(layout, { dim: 2 });
    await element.setViewMode("2d");
    for (const layer of layers) {
        await element.session.styles.add(layer);
    }

    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.waitForStableFrame();
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
 * Where a world point is on the element.
 * @param element - The element.
 * @param x - World x.
 * @param y - World y.
 * @returns CSS pixels from the element's top-left corner.
 */
function screen(element: Graphty, x: number, y: number): Point {
    return element.worldToScreen({ x, y, z: 0 });
}

describe("a background shader", () => {
    it("draws behind every node and under a label", async () => {
        const element = await mounted(
            [
                { id: "plain", x: -4, y: 0 },
                { id: "labelled", x: 4, y: 0 },
            ],
            [
                {
                    name: "Red",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.color": "#FF0000", "node.size": 2 },
                },
                {
                    name: "Label",
                    target: "node",
                    selector: { match: "ids", nodes: ["labelled"] },
                    set: {
                        "node.label": "W",
                        "node.labelStyle": { sizePx: 24, background: "#00FF00", color: "#00FF00", location: "center" },
                    },
                },
            ],
        );
        const renderManager = renderManagerOf(element.graph);
        element.background = { backgroundType: "color", color: "#000000", shader: { id: "e6/sky" } };
        await until(
            element,
            "the background shader draws",
            () => renderManager.shaderPasses().background?.shown === true,
        );

        const scene = element.graph.getScene();
        assert.strictEqual(scene.layers[0]?.name, BACKGROUND_LAYER, "it is the first background layer");
        assert.isTrue(scene.layers[0]?.isBackground, "drawn before anything the scene draws");
        const empty = await pixelAt(element, { x: 6, y: 6 });
        assert.isTrue(leads(empty, 2), `the empty canvas is the shader's blue, not ${empty.join(",")}`);
        assert.isTrue(leads(await pixelAt(element, screen(element, -4, 0)), 0), "a node is drawn over it");
        const label = screen(element, 4, 0);
        const around: number[][] = [];
        for (let dx = -3; dx <= 3; dx += 3) {
            for (let dy = -3; dy <= 3; dy += 3) {
                around.push(await pixelAt(element, { x: label.x + dx, y: label.y + dy }));
            }
        }

        assert.isTrue(
            around.some((pixel) => leads(pixel, 1)),
            "the label's green panel is drawn over it",
        );
        assert.isFalse(
            around.some((pixel) => leads(pixel, 2)),
            "and the shader draws nowhere on the labelled node",
        );

        element.background = { backgroundType: "color", color: "#00FF00" };
        await until(
            element,
            "a color background takes the shader away",
            () => renderManager.shaderPasses().background === null,
        );
        assert.isTrue(leads(await pixelAt(element, { x: 6, y: 6 }), 1), "the color shows");
    });

    it("is on the canvas once the stable frame resolves (issue #3536)", async () => {
        const element = await mounted([{ id: "a", x: 4, y: 0 }], []);
        element.background = { backgroundType: "color", color: "#000000", shader: { id: "e6/sky" } };
        await element.graph.waitForStableFrame();
        // Read the frame on screen now, with no frame drawn after the wait: the layer that shows
        // the shader compiles after the shader does, and the picture is not final until it drew.
        const { engine } = element.graph;
        const read = (await engine.readPixels(6, engine.getRenderHeight() - 7, 1, 1)) as unknown as Uint8Array;
        const pixel = [read[0], read[1], read[2], read[3]];
        assert.isTrue(leads(pixel, 2), `the stable frame shows the shader's blue, not ${pixel.join(",")}`);
    });

    it("is drawn again only when it moves or the camera does", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }], []);
        element.background = { backgroundType: "color", shader: { id: "e6/drift", params: { drift: 0 } } };
        const renderManager = renderManagerOf(element.graph);
        const scene = element.graph.getScene();
        await until(element, "the background draws", () => (renderManager.shaderPasses().background?.draws ?? 0) > 0);
        await drawnFrames(scene, 2);
        const pass = renderManager.shaderPasses().background;
        assert.isNotNull(pass);
        const still = pass?.draws ?? 0;

        // Frames forced by something else: a still background on a still camera is not drawn again.
        await element.session.styles.add({
            name: "Grow",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 3 },
        });
        await element.graph.waitForStableFrame();
        await drawnFrames(scene, 4);
        assert.strictEqual(pass?.draws, still, "no draw while nothing it reads changed");

        await element.graph.setCameraState({ zoom: 2 });
        await element.graph.waitForStableFrame();
        await drawnFrames(scene, 2);
        assert.isAbove(pass?.draws ?? 0, still, "a camera move draws it again");
    });
});

describe("the shared bloom", () => {
    it("is allocated once while a layer names a bloom shader, on screen or not", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }], []);
        const renderManager = renderManagerOf(element.graph);
        const scene = element.graph.getScene();
        const blooms = (): number => scene.effectLayers.filter((layer) => layer.name === BLOOM_LAYER).length;
        assert.isNull(renderManager.shaderPasses().bloom, "no bloom before a layer names one");

        // A lantern layer that matches no node: nothing glows on screen, the pass is allocated.
        const first = await element.session.styles.add({
            name: "Lanterns",
            target: "node",
            selector: { match: "ids", nodes: ["missing"] },
            set: { "node.shaders": [{ shader: "e6/lantern" }] },
        });
        await until(element, "the bloom is allocated", () => renderManager.shaderPasses().bloom !== null);
        const pass = renderManager.shaderPasses().bloom;
        assert.strictEqual(blooms(), 1);

        const second = await element.session.styles.add({
            name: "More lanterns",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: "e6/lantern" }] },
        });
        await element.graph.waitForStableFrame();
        await drawnFrames(scene, 2);
        assert.strictEqual(renderManager.shaderPasses().bloom, pass, "the same pass");
        assert.strictEqual(blooms(), 1, "one glow layer");

        await element.session.styles.remove(second.id);
        await element.session.styles.remove(first.id);
        await until(element, "the bloom is released", () => renderManager.shaderPasses().bloom === null);
        assert.strictEqual(blooms(), 0);
    });
});
