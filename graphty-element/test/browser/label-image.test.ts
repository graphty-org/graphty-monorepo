/**
 * @file A picture drawn in a label beside or behind its words (`image`, yEd's label icon, #7792): its canvas grows
 * evenly to hold it, so the words stay where they were, and the picture is painted where its offsets put it once it
 * has loaded.
 *
 * Read from the label's texture canvas, in its own pixels, so nothing about the camera, the scene or the GPU is in the
 * measurement.
 */

import { Engine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { drawablePicture } from "../../src/meshes/pictureSize";
import { labelInternals, RichTextLabel, type RichTextLabelOptions } from "../../src/meshes/RichTextLabel";

let engine: Engine;
let scene: Scene;
const labels: RichTextLabel[] = [];

beforeEach(() => {
    engine = new Engine(document.createElement("canvas"), true);
    scene = new Scene(engine);
});

afterEach(() => {
    for (const label of labels.splice(0)) {
        label.dispose();
    }

    engine.dispose();
});

/**
 * A solid red picture, as a data URL.
 * @returns The URL.
 */
function redPicture(): string {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext("2d");
    assert.isNotNull(ctx);
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 4, 4);
    return canvas.toDataURL("image/png");
}

/**
 * Settles once the scene's picture at this URL has loaded (or failed).
 * @param src - The picture's URL.
 * @returns When it has.
 */
function loaded(src: string): Promise<void> {
    return new Promise((resolve) => {
        if (drawablePicture(scene, src, resolve) !== null) {
            resolve();
        }
    });
}

/**
 * Build a label.
 * @param options - The label.
 * @returns It.
 */
function make(options: RichTextLabelOptions): RichTextLabel {
    const label = new RichTextLabel(scene, options);
    labels.push(label);
    return label;
}

/**
 * The color of the label's canvas at a point in its layout units.
 * @param label - The label.
 * @param x - Across, in layout units.
 * @param y - Down, in layout units.
 * @returns Its red, green, blue and alpha.
 */
function pixelAt(label: RichTextLabel, x: number, y: number): [number, number, number, number] {
    const texture = (
        label.labelMesh?.material as unknown as { diffuseTexture: { getContext(): CanvasRenderingContext2D } }
    ).diffuseTexture;
    const ctx = texture.getContext();
    const actual = labelInternals.drawn(label).actualDimensions;
    const px = Math.floor((x * ctx.canvas.width) / actual.width);
    const py = Math.floor((y * ctx.canvas.height) / actual.height);
    const d = ctx.getImageData(px, py, 1, 1).data;
    return [d[0], d[1], d[2], d[3]];
}

describe("a label's picture", () => {
    it("grows the canvas evenly to hold a picture beside the words, keeping the words in the middle", async () => {
        const src = redPicture();
        await loaded(src);
        const plain = labelInternals.drawn(make({ text: "Hi", glyphs: false })).actualDimensions;
        const label = make({ text: "Hi", image: src, imageWidth: 20, imageHeight: 20, imageOffsetX: -80 });
        const inner = labelInternals.drawn(label);

        assert.isAbove(inner.imageRoom.x, 0);
        assert.strictEqual(inner.imageRoom.y, 0);
        assert.closeTo(inner.actualDimensions.width, plain.width + 2 * inner.imageRoom.x, 1e-6);
        // the words' box is still the canvas's middle
        const area = inner.contentArea;
        assert.closeTo(area.x + area.width / 2, inner.actualDimensions.width / 2, 1e-6);
        const box = inner.imageBox;
        assert.isNotNull(box);
        assert.closeTo(box.x + box.width / 2, inner.actualDimensions.width / 2 - 80, 1e-6);
        assert.isAtLeast(box.x, 0);
        const [r, g, b, a] = pixelAt(label, box.x + box.width / 2, box.y + box.height / 2);
        assert.deepEqual([r > 200, g < 50, b < 50, a > 200], [true, true, true, true]);
    });

    it("is painted once a picture still loading lands", async () => {
        const src = `${redPicture()}#later`;
        const label = make({ text: "Hi", image: src, imageWidth: 20, imageHeight: 20 });
        assert.isNull(labelInternals.drawn(label).imageBox);
        await loaded(src);
        const box = labelInternals.drawn(label).imageBox;
        assert.isNotNull(box);
        // drawn behind the words, which leave its corner clear
        const [r, , , a] = pixelAt(label, box.x + 1, box.y + 1);
        assert.deepEqual([r > 200, a > 200], [true, true]);
    });

    it("draws the label on its own canvas, not from the glyph atlas", async () => {
        const src = redPicture();
        await loaded(src);
        assert.strictEqual(make({ text: "Hi", glyphs: true }).drawnBy, "glyphs");
        assert.strictEqual(make({ text: "Hi", glyphs: true, image: src }).drawnBy, "canvas");
    });
});
