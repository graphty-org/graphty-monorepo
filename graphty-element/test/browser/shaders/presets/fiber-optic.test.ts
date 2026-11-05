/**
 * @file The fiber optic edge surface draws the same pixels for the same resolved style, however
 * that style was reached: on first apply, after a base line property changes and changes back,
 * and after the layers are saved and loaded into a fresh element.
 */

import "../../../../src/graphty-element";

import type { ShaderMaterial } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../../index.js";
import type { LayerSpec } from "../../../../src/catalog/types";
import { operationQueueOf } from "../../../../src/Graph";
import { EdgeShaderDrawing } from "../../../../src/meshes/EdgeShaderDrawing";
import { presetId } from "../../../../stories/shaders/edgePresets";
import { drawnFrames } from "../../../helpers/drawn-frames";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const LINE: LayerSpec = {
    name: "Lines",
    target: "edge",
    selector: { match: "everything" },
    set: { "edge.width": 6, "edge.color": "#3366cc" },
};

const FIBER: LayerSpec = {
    name: "Fiber",
    target: "edge",
    selector: { match: "everything" },
    set: { "edge.shaders": [{ shader: presetId("fiber-optic") }] },
};

/**
 * A mounted element with one horizontal edge, drawn in 2D.
 * @param layers - The layers, added after the data.
 * @returns The element.
 */
async function mounted(layers: readonly LayerSpec[]): Promise<Graphty> {
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
    element.shaderSettings = { quality: "high", motion: "off" };
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -6, y: 0, z: 0 } },
        { id: "b", position: { x: 6, y: 0, z: 0 } },
    ]);
    await element.session.data.addEdges([{ source: "a", target: "b" }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    for (const layer of layers) {
        await element.session.styles.add(layer);
    }

    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/**
 * Whether the edge is drawn by a compiled fiber surface.
 * @param element - The element.
 * @returns True once it is.
 */
function fiberDrawn(element: Graphty): boolean {
    const [edge] = [...element.graph.getDataManager().edges.values()];
    const live = [...(EdgeShaderDrawing.peek(element.graph.getScene())?.stats().slots.values() ?? [])].some(
        (count) => count > 0,
    );
    const mesh = element.graph.getScene().meshes.find((each) => each.name === edge.drawnLine?.name);
    return (
        live &&
        (edge.drawnLine?.name ?? "").startsWith("edge-surface|") &&
        (mesh?.material as ShaderMaterial | null)?.getEffect()?.isReady() === true
    );
}

/**
 * Wait until the fiber draws, counting frames; fail after a bound.
 * @param element - The element.
 * @param what - What is awaited.
 */
async function untilFiber(element: Graphty, what: string): Promise<void> {
    for (let i = 0; i < 600 && !fiberDrawn(element); i++) {
        await drawnFrames(element.graph.getScene(), 1);
    }

    const [edge] = [...element.graph.getDataManager().edges.values()];
    assert.isTrue(fiberDrawn(element), `${what}: the line is ${String(edge.drawnLine?.name)}`);
}

/**
 * A column of canvas pixels across the edge's middle, after the next frames.
 * @param element - The element.
 * @returns RGBA, bottom to top.
 */
async function column(element: Graphty): Promise<Uint8Array> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 3);
    const top = element.worldToScreen({ x: -2, y: 1, z: 0 });
    const bottom = element.worldToScreen({ x: -2, y: -1, z: 0 });
    const scale = engine.getRenderWidth() / WIDTH;
    const height = Math.round((bottom.y - top.y) * scale);
    return (await engine.readPixels(
        Math.round(top.x * scale),
        engine.getRenderHeight() - Math.round(bottom.y * scale),
        1,
        height,
    )) as unknown as Uint8Array;
}

/**
 * How many pixels of a column differ from its first (the background).
 * @param pixels - RGBA.
 * @returns The count.
 */
function drawn(pixels: Uint8Array): number {
    let count = 0;
    for (let at = 0; at < pixels.length; at += 4) {
        const d = [0, 1, 2].reduce((sum, k) => sum + Math.abs(pixels[at + k] - pixels[k]), 0);
        count += d > 30 ? 1 : 0;
    }

    return count;
}

/**
 * The largest per-channel difference between two captures.
 * @param a - One.
 * @param b - The other.
 * @returns The difference.
 */
function maxDiff(a: Uint8Array, b: Uint8Array): number {
    assert.strictEqual(a.length, b.length);
    let most = 0;
    for (let i = 0; i < a.length; i++) {
        if (i % 4 !== 3) {
            most = Math.max(most, Math.abs(a[i] - b[i]));
        }
    }

    return most;
}

/**
 * The darkest pixel of a column, as the smallest channel sum.
 * @param pixels - RGBA.
 * @returns The sum.
 */
function darkest(pixels: Uint8Array): number {
    let least = 765;
    for (let at = 0; at < pixels.length; at += 4) {
        least = Math.min(least, pixels[at] + pixels[at + 1] + pixels[at + 2]);
    }

    return least;
}

describe("the fiber optic surface", () => {
    it("draws the same pixels for the same style on first apply and after a line change", async () => {
        const element = await mounted([LINE, FIBER]);
        await untilFiber(element, "the fiber draws on first apply");
        const first = await column(element);
        assert.isAbove(drawn(first), 2, "the fiber draws the edge on first apply");

        const [line] = element.session.styles.list().filter((layer) => layer.name === "Lines");
        for (const set of [
            { "edge.width": 6, "edge.color": "#cc3333" },
            { "edge.width": 6, "edge.color": "#3366cc", "edge.opacity": 0.6 },
            { "edge.width": 9, "edge.color": "#3366cc" },
        ]) {
            await element.session.styles.update(line.id, { set });
            await operationQueueOf(element.graph).waitForCompletion();
            await untilFiber(element, `the fiber draws after ${JSON.stringify(set)}`);
            assert.isAbove(drawn(await column(element)), 2, `the edge is still drawn after ${JSON.stringify(set)}`);
        }

        await element.session.styles.update(line.id, { set: LINE.set });
        await operationQueueOf(element.graph).waitForCompletion();
        await untilFiber(element, "the fiber draws after the line changes back");
        assert.isAtMost(maxDiff(first, await column(element)), 8, "the same style draws the same pixels");
    });

    it("draws the same pixels after its layers are saved and loaded again", async () => {
        const saved = await mounted([LINE, FIBER]);
        await untilFiber(saved, "the fiber draws");
        const before = await column(saved);
        const layers = JSON.parse(
            JSON.stringify(
                saved.session.styles
                    .list()
                    .filter(({ name }) => name === LINE.name || name === FIBER.name)
                    .map(({ name, target, selector, set }) => ({ name, target, selector, set })),
            ),
        ) as LayerSpec[];
        saved.remove();

        // Loaded into a fresh element, and loaded again over the same one (the undo of a removal).
        const loaded = await mounted(layers);
        await untilFiber(loaded, "the fiber draws after a load");
        assert.isAtMost(maxDiff(before, await column(loaded)), 8, "the loaded fiber draws the same pixels");
        for (const layer of loaded.session.styles
            .list()
            .filter(({ name }) => name === LINE.name || name === FIBER.name)) {
            await loaded.session.styles.remove(layer.id);
        }

        await operationQueueOf(loaded.graph).waitForCompletion();
        await drawnFrames(loaded.graph.getScene(), 3);
        for (const layer of layers) {
            await loaded.session.styles.add(layer);
        }

        await operationQueueOf(loaded.graph).waitForCompletion();
        await untilFiber(loaded, "the fiber draws after its layers come back");
        assert.isAtMost(maxDiff(before, await column(loaded)), 8, "the restored fiber draws the same pixels");
    });

    it("never draws near black on the light canvas", async () => {
        const element = await mounted([LINE, FIBER]);
        await untilFiber(element, "the fiber draws");
        assert.isAbove(darkest(await column(element)), 150, "no near-black pixel on a light canvas");
    });
});
