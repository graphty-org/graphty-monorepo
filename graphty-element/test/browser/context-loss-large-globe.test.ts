/**
 * @file A large location-map globe drawn again after its WebGL context is lost while the page is
 * hidden and given back once it is shown (issue #8216: an iPad Safari tab came back from the
 * background with its globe but no node or edge). The graph is the size of the owner's (about
 * 1,900 nodes and 2,700 edges), so the batches and row tables a large graph draws with are the ones
 * rebuilt.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { contextOf } from "../helpers/webgl-context";

const NODES = 1900;
const EDGES = 2700;
const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A seeded random number from 0 to 1.
 * @param seed - The seed.
 * @returns The next number.
 */
function random(seed: { value: number }): number {
    seed.value = (seed.value * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed.value / 2_147_483_648;
}

/**
 * The canvas's pixels.
 * @param canvas - The element's canvas.
 * @returns RGBA values.
 */
function picture(canvas: HTMLCanvasElement): Uint8ClampedArray {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d");
    if (context === null) {
        throw new Error("no 2D context");
    }
    context.drawImage(canvas, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

/**
 * The share of pixels whose color moved by more than 40 on some channel.
 * @param a - One picture.
 * @param b - The other, the same size.
 * @returns From 0 to 1.
 */
function changedShare(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
    let changed = 0;
    for (let i = 0; i < a.length; i += 4) {
        if (Math.abs(a[i] - b[i]) > 40 || Math.abs(a[i + 1] - b[i + 1]) > 40 || Math.abs(a[i + 2] - b[i + 2]) > 40) {
            changed++;
        }
    }
    return changed / (a.length / 4);
}

/**
 * Tell the page it is hidden or shown, as Safari does when the tab goes to the background.
 * @param hidden - Whether it is hidden.
 */
function setHidden(hidden: boolean): void {
    Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => (hidden ? "hidden" : "visible"),
    });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event("visibilitychange"));
}

/** Wait for the browser to lay the page out at its new size. */
async function nextAnimationFrame(): Promise<void> {
    await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            resolve();
        });
    });
}

describe("a large globe whose context is lost in the background", () => {
    it.for([
        ["objects", "shown first"],
        ["batched", "shown first"],
        ["batched", "restored while hidden"],
        ["batched", "resized while hidden"],
    ] as const)("draws its nodes and edges again (%s, %s)", async ([renderPath, order]) => {
        const element: Graphty = document.createElement("graphty-element");
        element.renderPath = renderPath;
        element.style.display = "block";
        element.style.width = "600px";
        element.style.height = "400px";
        document.body.appendChild(element);
        cleanups.push(() => {
            setHidden(false);
            element.remove();
        });
        await element.updateComplete;
        await operationQueueOf(element.graph).waitForCompletion();
        const seed = { value: 8216 };
        const nodes = Array.from({ length: NODES }, (_, i) => ({
            id: `n${i}`,
            latitude: random(seed) * 140 - 70,
            longitude: random(seed) * 360 - 180,
        }));
        const edges = Array.from({ length: EDGES }, () => ({
            src: `n${Math.floor(random(seed) * NODES)}`,
            dst: `n${Math.floor(random(seed) * NODES)}`,
        }));
        await element.session.data.addNodes(nodes);
        await element.session.data.addEdges(edges);
        await element.graph.setLayout("location-map", { latitude: "latitude", longitude: "longitude" });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        const scene = element.graph.getScene();
        const canvas = scene.getEngine().getRenderingCanvas();
        assert.isNotNull(canvas);
        await drawnFrames(scene, 2);
        const before = picture(canvas);

        const lost = new Promise<void>((resolve) => {
            element.addEventListener(
                "render-lost",
                () => {
                    resolve();
                },
                { once: true },
            );
        });
        setHidden(true);
        const extension = contextOf(element.graph).getExtension("WEBGL_lose_context");
        assert.isNotNull(extension);
        extension.loseContext();
        await lost;
        if (order === "resized while hidden") {
            element.style.width = "400px";
            element.style.height = "600px";
            await nextAnimationFrame();
            element.style.width = "600px";
            element.style.height = "400px";
        }
        if (order === "restored while hidden") {
            await element.restartRenderer();
            setHidden(false);
        } else {
            setHidden(false);
            await element.restartRenderer();
        }
        await element.waitForStableFrame();
        await drawnFrames(scene, 2);

        const share = changedShare(picture(canvas), before);
        assert.isBelow(share, 0.01, `the globe is drawn as it was (${(share * 100).toFixed(2)}% of pixels changed)`);
    });
});
