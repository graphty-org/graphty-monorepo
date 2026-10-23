/**
 * @file A label sized for the screen (`sizeMode: "screen"`) and kept in view (`keepInView`),
 * under a real wheel zoom and a real click (test/helpers/real-input.ts). Every reading is where
 * the label's plane is drawn: its bounding box's corners projected through the camera.
 */

import "../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { LabelStyle } from "../../src/catalog/label-style";
import { operationQueueOf } from "../../src/Graph";
import { screenFitFrames } from "../../src/meshes/labelScreenFit";
import type { RichTextLabel } from "../../src/meshes/RichTextLabel";
import { measureLine } from "../../src/meshes/RichTextParser";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, pinch, wheel } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;
const SIZE_PX = 14;

/** Two nodes on a line, so each one's spot on screen is known before any input. */
const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

async function mounted(viewMode: "2d" | "3d"): Promise<Graphty> {
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
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

async function applied(element: Graphty): Promise<void> {
    await drawnFrames(element.graph.getScene(), 1);
    await element.waitForStableFrame();
}

async function labelled(
    element: Graphty,
    text: string,
    style: LabelStyle,
    selector: Record<string, unknown> = { match: "everything" },
): Promise<void> {
    await element.session.styles.add({
        name: "screen fit",
        target: "node",
        selector,
        set: { "node.label": text, "node.labelStyle": style },
    } as Parameters<Graphty["session"]["styles"]["add"]>[0]);
    await element.session.styles.settled();
    await applied(element);
}

/**
 * Zoom the view in or out the way a reader does: the wheel in 2D, two fingers in 3D (the 3D
 * view does not zoom on the wheel).
 * @param element - The element.
 * @param viewMode - The view it is in.
 * @param direction - In or out.
 */
async function zoom(element: Graphty, viewMode: "2d" | "3d", direction: "in" | "out"): Promise<void> {
    const centre = { x: WIDTH / 2, y: HEIGHT / 2 };
    if (viewMode === "2d") {
        await wheel(element, centre, direction === "in" ? -400 : 800);
    } else if (direction === "in") {
        await pinch(element, centre, 60, 180);
    } else {
        await pinch(element, centre, 180, 40);
    }

    await applied(element);
}

function labelOf(element: Graphty, id: string): RichTextLabel {
    const label = element.graph.getDataManager().nodes.get(id)?.label;
    assert.isDefined(label, `node ${id} has a label`);
    return label;
}

interface Rect {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

/**
 * Where a label's plane is drawn, in CSS pixels from the element's top-left corner.
 * @param element - The element.
 * @param id - The node.
 * @returns The rectangle its projected corners span.
 */
function drawnRect(element: Graphty, id: string): Rect {
    const mesh = labelOf(element, id).labelMesh;
    assert.isNotNull(mesh);
    const camera = element.graph.getScene().activeCamera;
    assert.isNotNull(camera);
    mesh.computeWorldMatrix(true);
    const viewProjection = camera.getViewMatrix().multiply(camera.getProjectionMatrix());
    const rect = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    for (const corner of mesh.getBoundingInfo().boundingBox.vectorsWorld) {
        const ndc = Vector3.TransformCoordinates(corner, viewProjection);
        const x = ((ndc.x + 1) / 2) * WIDTH;
        const y = ((1 - ndc.y) / 2) * HEIGHT;
        rect.left = Math.min(rect.left, x);
        rect.right = Math.max(rect.right, x);
        rect.top = Math.min(rect.top, y);
        rect.bottom = Math.max(rect.bottom, y);
    }

    return rect;
}

/**
 * How tall the label's letters are drawn on screen, in CSS pixels: the words' height on screen
 * over the words' height on the label's own canvas, times the font size they were drawn at.
 * @param element - The element.
 * @param id - The node.
 * @param fontSize - The font size the label's canvas was drawn at.
 * @returns The letters' height.
 */
function letterHeight(element: Graphty, id: string, fontSize: number): number {
    const label = labelOf(element, id);
    const rect = drawnRect(element, id);
    const bounds = label.textBounds;
    const wordsOnScreen = (bounds.bottom - bounds.top) * (rect.bottom - rect.top);
    const ctx = document.createElement("canvas").getContext("2d");
    assert.isNotNull(ctx);
    const { lineBox } = measureLine(ctx, [...label.textRuns[0]], {
        lineHeight: 1.2,
        textOutline: false,
        textOutlineWidth: 0,
    });
    return (wordsOnScreen / lineBox) * fontSize;
}

describe("sizeMode screen", () => {
    for (const viewMode of ["2d", "3d"] as const) {
        it(`keeps the letters ${String(SIZE_PX)} CSS px tall through a zoom in and out in ${viewMode}`, async () => {
            const element = await mounted(viewMode);
            await labelled(element, "Screen", { sizeMode: "screen", sizePx: SIZE_PX });
            const scale = (): number => labelOf(element, "a").labelMesh?.scaling.y ?? NaN;

            const heights = [letterHeight(element, "a", SIZE_PX)];
            const scales = [scale()];
            for (const direction of ["in", "out"] as const) {
                await zoom(element, viewMode, direction);
                heights.push(letterHeight(element, "a", SIZE_PX));
                scales.push(scale());
            }

            for (const height of heights) {
                assert.approximately(height, SIZE_PX, 1, `letters drawn ${heights.join(", ")} px tall`);
            }

            // The zoom really happened: the label had to be resized for each view.
            assert.isAbove(Math.abs(scales[1] - scales[0]) / scales[0], 0.05, `scales ${scales.join(", ")}`);
            assert.isAbove(Math.abs(scales[2] - scales[1]) / scales[1], 0.05, `scales ${scales.join(", ")}`);
        });
    }

    for (const viewMode of ["2d", "3d"] as const) {
        it(`leaves a world-size label to grow with the zoom, with no per-frame work (${viewMode})`, async () => {
            const element = await mounted(viewMode);
            await labelled(element, "World", { sizePx: SIZE_PX });
            const before = drawnRect(element, "a");

            await zoom(element, viewMode, "in");
            const after = drawnRect(element, "a");

            assert.isAbove(after.bottom - after.top, (before.bottom - before.top) * 1.05, "zooming in made it larger");
            assert.strictEqual(labelOf(element, "a").labelMesh?.scaling.y, 1);
            assert.strictEqual(
                screenFitFrames.callbacksOf(element.graph.getScene()).size,
                0,
                "no label joined the fit",
            );
        });
    }
});

describe("keepInView", () => {
    /** Selects node b, the one near the right edge, with a real click on it. */
    async function selectB(element: Graphty): Promise<void> {
        const at = element.nodeScreenPosition("b");
        assert.isDefined(at);
        await click(element, { x: at.x, y: at.y });
        await applied(element);
    }

    const SELECTED = { match: "member", of: "selection" };

    async function selectedLabel(viewMode: "2d" | "3d", text: string, keepInView: boolean): Promise<Graphty> {
        const element = await mounted(viewMode);
        await labelled(
            element,
            text,
            { sizeMode: "screen", sizePx: SIZE_PX, location: "right", keepInView, background: "#ffffff" },
            SELECTED,
        );
        await selectB(element);
        return element;
    }

    for (const viewMode of ["2d", "3d"] as const) {
        it(`off, a label beside a node near the right edge runs off the canvas (${viewMode})`, async () => {
            const element = await selectedLabel(viewMode, "Princess Fluffington", false);
            const rect = drawnRect(element, "b");
            const node = element.nodeScreenPosition("b");
            assert.isDefined(node);
            assert.isAbove(rect.left, node.x, "it sits to the right of its node");
            assert.isAbove(rect.right, WIDTH, "and past the canvas edge");
        });

        it(`on, it moves to the left of its node and is wholly drawn (${viewMode})`, async () => {
            const element = await selectedLabel(viewMode, "Princess Fluffington", true);
            const rect = drawnRect(element, "b");
            const node = element.nodeScreenPosition("b");
            assert.isDefined(node);
            assert.isBelow(rect.right, node.x, "it sits to the left of its node");
            assert.isAtLeast(rect.left, -0.5);
            assert.isAtMost(rect.right, WIDTH + 0.5);
            assert.isAtLeast(rect.top, -0.5);
            assert.isAtMost(rect.bottom, HEIGHT + 0.5);
        });
    }

    it("on, a label too wide for either side is moved inside", async () => {
        const words = "Professor Pawsington of the Royal Society of Cats";
        const element = await selectedLabel("2d", words, true);
        const rect = drawnRect(element, "b");
        assert.isBelow(rect.right - rect.left, WIDTH, "it fits the canvas at all");
        assert.isAtLeast(rect.left, -0.5);
        assert.isAtMost(rect.right, WIDTH + 0.5);
    });
});
