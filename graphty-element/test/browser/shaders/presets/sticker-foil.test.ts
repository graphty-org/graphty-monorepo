/**
 * @file The Sticker's foil on the real canvas (issue #3320): every foil kind draws something a
 * sticker without foil does not, the Foil strength changes a sticker left at its defaults, and
 * holographic foil changes hue as the view moves while a sticker without foil keeps its color.
 */

import "../../../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../../index.js";
import type { ShaderParams } from "../../../../src/catalog/shaders";
import { operationQueueOf } from "../../../../src/Graph";
import { NodeShaderDrawing } from "../../../../src/meshes/NodeShaderDrawing";
import { drawnFrames } from "../../../helpers/drawn-frames";

const WIDTH = 300;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element in 2D drawing one sticker node at the origin.
 * @param params - The sticker's parameters.
 * @returns The element, its first sticker frame drawn.
 */
async function sticker(params: ShaderParams): Promise<Graphty> {
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
    await element.session.data.addNodes([{ id: "a", position: { x: 0, y: 0, z: 0 } }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await element.session.styles.add({
        name: "Color",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#3366cc" },
    });
    await element.session.styles.add({
        name: "Sticker",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shaders": [{ shader: "icon-sticker", params }] },
    });
    await element.graph.setCameraState({ zoom: 3, pan: { x: 0, y: 0 } });
    await operationQueueOf(element.graph).waitForCompletion();
    const scene = element.graph.getScene();
    // Counted work: frames until the sticker's batch holds the node.
    for (let i = 0; i < 600; i++) {
        const drawing = NodeShaderDrawing.peek(scene);
        if (drawing !== undefined && [...drawing.stats().slots.values()].includes(1)) {
            break;
        }

        await drawnFrames(scene, 1);
    }

    await drawnFrames(scene, 2);
    return element;
}

/**
 * The canvas pixels of a square around the node, in device pixels, read from the drawn frame.
 * @param element - The element.
 * @returns RGBA rows.
 */
async function nodePixels(element: Graphty): Promise<Uint8Array> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 1);
    const node = element.graph.getNode("a");
    assert.isDefined(node, "the graph holds the node");
    const at = element.worldToScreen(node.mesh.getAbsolutePosition());
    const scale = engine.getRenderWidth() / WIDTH;
    const half = 20;
    const x = Math.round(at.x * scale) - half;
    const y = Math.round(engine.getRenderHeight() - at.y * scale) - half;
    return (await engine.readPixels(x, y, half * 2, half * 2)) as unknown as Uint8Array;
}

/**
 * How many pixels of two reads differ by more than a little.
 * @param a - One read.
 * @param b - The other.
 * @returns The count.
 */
function differs(a: Uint8Array, b: Uint8Array): number {
    let count = 0;
    for (let at = 0; at < a.length; at += 4) {
        count +=
            Math.abs(a[at] - b[at]) + Math.abs(a[at + 1] - b[at + 1]) + Math.abs(a[at + 2] - b[at + 2]) > 24 ? 1 : 0;
    }

    return count;
}

/**
 * The hue of a pixel, in degrees.
 * @param pixels - The read.
 * @param at - The pixel's first byte.
 * @returns The hue angle.
 */
function hueAt(pixels: Uint8Array, at: number): number {
    const [r, g, b] = [pixels[at], pixels[at + 1], pixels[at + 2]];
    return (Math.atan2((Math.sqrt(3) / 2) * (g - b), r - (g + b) / 2) * 180) / Math.PI;
}

/**
 * How far the hue of the same place on the node moved between two reads, on average over the
 * read's pixels. Per pixel, because a rainbow's mean hue stays put however its bands move.
 * @param a - One read.
 * @param b - The other, of the same square around the node.
 * @returns Degrees, 0 to 180.
 */
function hueShift(a: Uint8Array, b: Uint8Array): number {
    let sum = 0;
    for (let at = 0; at < a.length; at += 4) {
        const d = Math.abs(hueAt(a, at) - hueAt(b, at)) % 360;
        sum += d > 180 ? 360 - d : d;
    }

    return sum / (a.length / 4);
}

describe("the Sticker's foil on the canvas", () => {
    it("the Foil strength changes a sticker left at its defaults", async () => {
        const off = await nodePixels(await sticker({ foil: 0 }));
        const full = await nodePixels(await sticker({ foil: 1 }));
        assert.isAbove(differs(off, full), 100, "moving Foil strength changes the drawn sticker");
    });

    it("each foil kind draws apart from no foil", async () => {
        const none = await nodePixels(await sticker({ finish: "none" }));
        for (const finish of ["shiny", "holographic"]) {
            const drawn = await nodePixels(await sticker({ finish, foil: 1 }));
            assert.isAbove(differs(none, drawn), 100, `${finish} foil draws on the sticker`);
        }
    });

    it("holographic foil shifts hue as the view moves; no foil keeps its color", async () => {
        const gaps: Record<string, number> = {};
        for (const finish of ["none", "holographic"]) {
            const element = await sticker({ finish, foil: 1 });
            const centered = await nodePixels(element);
            // A grating changes hue across its lines, not along them: move the view both ways.
            let gap = 0;
            for (const pan of [
                { x: 1.2, y: 0 },
                { x: 0, y: 1.2 },
            ]) {
                await element.graph.setCameraState({ pan });
                await operationQueueOf(element.graph).waitForCompletion();
                gap = Math.max(gap, hueShift(centered, await nodePixels(element)));
            }

            gaps[finish] = gap;
        }

        console.log("hue shift with the view, in degrees", JSON.stringify(gaps));
        assert.isBelow(gaps.none, 3, "a sticker without foil keeps its hue");
        assert.isAbove(gaps.holographic, 10, "holographic foil changes hue with the view");
    });
});
