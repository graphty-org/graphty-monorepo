/**
 * @file The Selected and Hovered starting rows on a real canvas, driven by the real pointer.
 *
 * With the project setting `startingRows` on, the selection look is no longer drawn by the
 * selection settings: the Selected row draws it, as a ring outside the node's border, written through a style
 * layer. A click must then draw the row's ring and no halo from the settings, a write to the row
 * must repaint it, and deselecting must leave nothing behind. The pointer resting on a
 * node is what the Hovered row reads.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import { click, hover, nextFrame, type Point } from "../helpers/real-input";
import { edgeBetween } from "../helpers/testSetup";

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

/** A ring color nothing else on the canvas is drawn in. */
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
 * @returns Its center in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    assert.isTrue(position.visible, `node ${id} is on screen`);
    return { x: position.x, y: position.y };
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
    it("a real click draws the Selected row's ring and no halo, a write repaints it, and deselecting clears it", async () => {
        const element = await mounted();
        const { session } = element;
        await session.styles.writeRow(rowId(element, "Selected"), {
            set: { "node.outerBorderColor": PROBE, "node.outerBorderOpacity": 1 },
        });
        await settle(element);
        const before = await greenPixels(element);
        assert.strictEqual(before.left + before.right, 0, "nothing is selected, so no ring is drawn");

        await click(element, at(element, "a"));
        await settle(element);

        assert.deepStrictEqual([...session.selection.nodes], ["a"]);
        const green = await greenPixels(element);
        assert.isAbove(green.left, 0, "the ring is drawn around the clicked node");
        assert.strictEqual(green.right, 0, "and nowhere else");

        await session.styles.writeRow(rowId(element, "Selected"), { set: { "node.outerBorderColor": "#FF0000" } });
        await settle(element);
        const after = await greenPixels(element);
        assert.strictEqual(after.left + after.right, 0, "the new color repainted the ring already on screen");

        // The ring's off value, a width of 0: still selected, and no ring drawn.
        await session.styles.writeRow(rowId(element, "Selected"), {
            set: { "node.outerBorderColor": PROBE, "node.outerBorderWidth": 0 },
        });
        await settle(element);
        const off = await greenPixels(element);
        assert.strictEqual(off.left + off.right, 0, "a ring written to width 0 draws nothing");

        await click(element, EMPTY);
        await settle(element);
        assert.deepStrictEqual([...session.selection.nodes], []);
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

    it("draws a selected edge's casing in proportion to its own line, on a thin line and a thick one", async () => {
        const element = await mounted();
        const { session } = element;
        await session.data.addNodes([
            { id: "c", position: { x: -4, y: -3, z: 0 } },
            { id: "d", position: { x: 4, y: -3, z: 0 } },
        ]);
        await session.data.addEdges([{ src: "c", dst: "d" }]);
        await settle(element);
        const thin = edgeBetween(element.graph, "a", "b");
        const thick = edgeBetween(element.graph, "c", "d");
        assert(thin && thick, "both edges are drawn");
        for (const [edge, width] of [
            [thin, 2],
            [thick, 24],
        ] as const) {
            await session.styles.add({
                name: `Width ${String(width)}`,
                target: "edge",
                selector: { match: "ids", edges: [edge.id] },
                set: { "edge.width": width },
            });
        }
        await session.selection.apply({ edges: [thin.id, thick.id] });
        await settle(element);

        /** The drawn width of a batch, in the line's units. */
        const widthOf = (batch: EdgeLineBatch | null): number =>
            (batch?.mesh.metadata as { lineWidth?: number } | undefined)?.lineWidth ?? 0;
        for (const edge of [thin, thick]) {
            const drawn = edge as unknown as { lineBatch: EdgeLineBatch | null; outlineBatch: EdgeLineBatch | null };
            const line = widthOf(drawn.lineBatch);
            assert.isAbove(line, 0, "the line is drawn");
            // the selection band was 2.5 times twice the line's width: five lines across, whatever the width
            assert.closeTo(widthOf(drawn.outlineBatch), 5 * line, 1e-6, `the casing of a line ${String(line)} wide`);
        }
    });
});
