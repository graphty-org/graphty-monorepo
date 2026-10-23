/**
 * @file The Selected and Hovered starting rows on a real canvas, driven by the real pointer.
 *
 * With the project setting `startingRows` on, the selection look is no longer drawn by the
 * selection settings: the Selected row draws it, as a node halo written through a style layer.
 * A click must then draw exactly one halo (never the settings' halo beside the row's), a write to
 * the row must repaint it, and deselecting must leave nothing behind. The pointer resting on a
 * node is what the Hovered row reads.
 */

import "../../src/graphty-element";

import type { AbstractMesh } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { click, hover, nextFrame, type Point } from "../helpers/real-input";

// Inside the test frame's 414-pixel-wide viewport, so every point the pointer goes to is on it.
const WIDTH = 400;
const HEIGHT = 300;

/** Two nodes at fixed places, a on the left half of the canvas and b on the right. */
const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
];

/** A spot with no node under it. */
const EMPTY: Point = { x: 30, y: HEIGHT - 30 };

/** A halo color nothing else on the canvas is drawn in. */
const PROBE = "#00FF00";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Let the styles repaint and a few frames draw.
 * @param element - The element.
 */
async function settle(element: Graphty): Promise<void> {
    await element.session.styles.settled();
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    await element.graph.scene.whenReadyAsync();
    for (let frame = 0; frame < 5; frame++) {
        element.graph.scene.render();
        await nextFrame();
    }
}

/**
 * A mounted element holding two nodes at fixed places, with the starting rows on, drawn.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges([{ src: "a", dst: "b" }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await element.session.config.set({ startingRows: true });
    await settle(element);
    return element;
}

/**
 * Where a node is drawn, from the element's public API.
 * @param element - The element.
 * @param id - The node.
 * @returns Its centre in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    assert.isTrue(position.visible, `node ${id} is on screen`);
    return { x: position.x, y: position.y };
}

/**
 * The halos drawn now.
 * @param element - The element.
 * @returns The enabled, visible halo instances.
 */
function drawnHalos(element: Graphty): AbstractMesh[] {
    return element.graph.scene.meshes.filter(
        (mesh) => mesh.name.startsWith("graphty-selection-halo") && mesh.isVisible && mesh.isEnabled(),
    );
}

/**
 * Count the probe-green pixels on each half of the canvas.
 * @param element - The element.
 * @returns How many on the left half and on the right half.
 */
async function greenPixels(element: Graphty): Promise<{ left: number; right: number }> {
    const { engine } = element.graph;
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
    const counts = { left: 0, right: 0 };
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            if (pixels[index + 1] > 180 && pixels[index] < 90 && pixels[index + 2] < 90) {
                counts[x < width / 2 ? "left" : "right"]++;
            }
        }
    }

    return counts;
}

/**
 * A starting row's id.
 * @param element - The element.
 * @param name - The row's name.
 * @returns The id.
 */
function rowId(element: Graphty, name: string): string {
    const row = element.session.styles.tree().find((each) => each.name === name);
    assert.isDefined(row, `the ${name} row`);
    return row.id;
}

/**
 * The layer a row paints nodes with.
 * @param element - The element.
 * @param name - The row's name.
 * @returns The node part's id.
 */
function nodePart(element: Graphty, name: string): string {
    const layer = element.session.styles.list().find((each) => each.name === name && each.target === "node");
    assert.isDefined(layer, `the ${name} row paints nodes`);
    return layer.id;
}

describe("the Selected and Hovered rows", () => {
    it("a real click draws exactly one halo, a write to Selected repaints it, and deselecting clears it", async () => {
        const element = await mounted();
        const { session } = element;
        await session.styles.writeRow(rowId(element, "Selected"), {
            set: { "node.haloColor": PROBE, "node.haloOpacity": 1 },
        });
        await settle(element);
        const before = await greenPixels(element);
        assert.strictEqual(before.left + before.right, 0, "nothing is selected, so no halo is drawn");

        await click(element, at(element, "a"));
        await settle(element);

        assert.deepStrictEqual([...session.selection.nodes], ["a"]);
        assert.lengthOf(drawnHalos(element), 1, "one halo: the Selected row's, and none from the selection settings");
        const green = await greenPixels(element);
        assert.isAbove(green.left, 0, "the halo is drawn around the clicked node");
        assert.strictEqual(green.right, 0, "and nowhere else");

        await session.styles.writeRow(rowId(element, "Selected"), { set: { "node.haloColor": "#FF0000" } });
        await settle(element);
        const after = await greenPixels(element);
        assert.strictEqual(after.left + after.right, 0, "the new color repainted the halo already on screen");
        assert.lengthOf(drawnHalos(element), 1);

        // The halo's off value, node.halo false: still selected, and no halo drawn.
        await session.styles.writeRow(rowId(element, "Selected"), { set: { "node.halo": false } });
        await settle(element);
        assert.lengthOf(drawnHalos(element), 0, "a halo written off draws nothing");

        await click(element, EMPTY);
        await settle(element);
        assert.deepStrictEqual([...session.selection.nodes], []);
        assert.lengthOf(drawnHalos(element), 0, "deselecting leaves no halo");
        assert.strictEqual(
            session.styles.counts(nodePart(element, "Selected")).matched,
            0,
            "and Selected matches nothing",
        );
    });

    it("a real hover makes Hovered match that node", async () => {
        const element = await mounted();
        const { session } = element;
        const hovered = nodePart(element, "Hovered");

        await hover(element, at(element, "b"));
        await settle(element);
        assert.strictEqual(session.selection.hovered, "b");
        assert.strictEqual(session.styles.counts(hovered).matched, 1);

        await hover(element, EMPTY);
        await settle(element);
        assert.isNull(session.selection.hovered);
        assert.strictEqual(session.styles.counts(hovered).matched, 0);
    });
});
