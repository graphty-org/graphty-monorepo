/**
 * @file What a consumer gets when it reaches into the element's Babylon.js scene.
 *
 * `element.graph.scene` is public, and a third party uses it the way any Babylon.js scene is used,
 * here with a `GlowLayer` of its own. Each case is what a consumer sees on the default path at
 * commit 57c0ee700e, the build before the row renderer.
 *
 * The file runs in "browser" on the objects path and in "forced-batched" on the batched path, with
 * the same assertions: the guide promises a consumer the same graph on both.
 *
 * The fixture keeps batched rows lazy: nodes only, no edges, added after the first frame, and on
 * batched every case first asserts that a batch draws every node, so the case cannot quietly test
 * object rows.
 */

import { GlowLayer } from "@babylonjs/core/Layers/glowLayer.js";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { renderPathDefault } from "../../src/meshes/NodeBatch";
import { pixelAt, pixelsAt } from "../helpers/canvas-pixels";
import { drawnFrames } from "../helpers/drawn-frames";
import { mountElement, unmountElements } from "../helpers/mount-element";
import { nodePoint, type Point } from "../helpers/real-input";

afterEach(unmountElements);

const PATH = renderPathDefault.value;
const COLUMNS = 5;
const NODES = Array.from({ length: COLUMNS * COLUMNS }, (_, i) => ({
    id: `n${String(i)}`,
    position: { x: (i % COLUMNS) * 3, y: Math.floor(i / COLUMNS) * 3, z: 0 },
}));
/** The middle node: away from the canvas edge on every side. */
const MIDDLE = "n12";

/**
 * A 25-node grid on a fixed layout, drawing every frame, settled.
 * @param dimension - The layout's dimension; a 2D view draws nodes unlit.
 * @returns The element.
 */
async function grid(dimension: "2d" | "3d" = "2d"): Promise<Graphty> {
    const element = await mountElement();
    element.renderOnDemand = false;
    await element.session.layout.setDimension(dimension);
    await element.session.layout.set("fixed");
    await element.session.data.addNodes(NODES);
    await element.waitForStableFrame();
    assertBatched(element);
    return element;
}

/**
 * On batched, a batch still draws every node: nothing in the case set-up built them as objects.
 * @param element - The element.
 */
function assertBatched(element: Graphty): void {
    if (PATH === "batched") {
        assert.equal(element.rowCounts.batchedNodes, NODES.length, `rows ${JSON.stringify(element.rowCounts)}`);
    }
}

/**
 * How bright a pixel is, its largest channel.
 * @param element - The element.
 * @param at - CSS pixels.
 * @returns 0 to 255.
 */
async function brightness(element: Graphty, at: Point): Promise<number> {
    const [r, g, b] = await pixelAt(element, at);
    return Math.max(r, g, b);
}

/**
 * The midpoint between two nodes on screen, where the grid has empty background.
 * @param element - The element.
 * @param a - One node.
 * @param b - The other.
 * @returns CSS pixels.
 */
function between(element: Graphty, a: string, b: string): Point {
    const p = nodePoint(element, a);
    const q = nodePoint(element, b);
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
}

describe(`a consumer's view of the scene (${PATH})`, () => {
    it("a consumer GlowLayer glows the nodes in place and leaves the background dark", async () => {
        const element = await grid();
        const { scene } = element.graph;
        scene.clearColor.set(0, 0, 0, 1);
        await drawnFrames(scene, 2);
        // Every gap between two neighbours in a row, and the canvas corners: background on the objects path.
        const gaps: Point[] = [
            { x: 4, y: 4 },
            { x: 396, y: 4 },
            { x: 4, y: 296 },
            { x: 396, y: 296 },
        ];
        for (let i = 0; i < NODES.length; i++) {
            if (i % COLUMNS !== COLUMNS - 1) {
                gaps.push(between(element, `n${String(i)}`, `n${String(i + 1)}`));
            }
        }

        const before = await pixelsAt(element, gaps);
        const glow = new GlowLayer("consumer-glow", scene);
        try {
            await drawnFrames(scene, 4);
            assertBatched(element);
            const after = await pixelsAt(element, gaps);
            const lit = gaps.filter(
                (_, i) => Math.max(...after[i].slice(0, 3)) > Math.max(...before[i].slice(0, 3)) + 80,
            );
            assert.deepEqual(lit, [], "background points the glow lit with no node there");
            assert.isAbove(await brightness(element, nodePoint(element, MIDDLE)), 40, "the node is still drawn");
        } finally {
            glow.dispose();
        }
    });
});
