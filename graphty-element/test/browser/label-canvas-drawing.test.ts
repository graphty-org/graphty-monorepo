/**
 * @file What a label draws on its own canvas: where padding puts the words (#3157), and the
 * panel's drop shadow.
 *
 * Read from the label's texture canvas, in its own pixels, so nothing about the camera, the scene
 * or the GPU is in the measurement.
 */

import { Engine, Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { RichTextLabel, type RichTextLabelOptions } from "../../src/meshes/RichTextLabel";

/** A label's canvas, and how many of its pixels make one unit of the label's own layout. */
interface Drawn {
    image: ImageData;
    /** Canvas pixels per layout unit, across. */
    sx: number;
    /** Canvas pixels per layout unit, down. */
    sy: number;
}

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
 * Build a label and read its canvas.
 * @param options - The label.
 * @returns Its pixels and scale.
 */
function draw(options: RichTextLabelOptions): Drawn {
    const label = new RichTextLabel(scene, options);
    labels.push(label);
    const texture = (
        label.labelMesh?.material as unknown as { diffuseTexture: { getContext(): CanvasRenderingContext2D } }
    ).diffuseTexture;
    const ctx = texture.getContext();
    const { width, height } = ctx.canvas;
    const actual = (label as unknown as { actualDimensions: { width: number; height: number } }).actualDimensions;

    return { image: ctx.getImageData(0, 0, width, height), sx: width / actual.width, sy: height / actual.height };
}

/**
 * Whether a pixel is the words' ink: near black and mostly opaque.
 * @param image - The pixels.
 * @param x - Column.
 * @param y - Row.
 * @returns Whether it is ink.
 */
function isInk(image: ImageData, x: number, y: number): boolean {
    const i = (y * image.width + x) * 4;
    const { data } = image;

    return data[i + 3] > 128 && data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100;
}

/**
 * The first column and row holding any of the words' ink.
 * @param image - The pixels.
 * @returns Column and row, in canvas pixels.
 */
function firstInk(image: ImageData): { x: number; y: number } {
    let x = Infinity;
    let y = Infinity;
    for (let row = 0; row < image.height; row++) {
        for (let col = 0; col < image.width; col++) {
            if (isInk(image, col, row)) {
                x = Math.min(x, col);
                y = Math.min(y, row);
            }
        }
    }

    return { x, y };
}

/**
 * The alpha of one pixel.
 * @param image - The pixels.
 * @param x - Column.
 * @param y - Row.
 * @returns Alpha, 0-255.
 */
function alphaAt(image: ImageData, x: number, y: number): number {
    return image.data[(Math.round(y) * image.width + Math.round(x)) * 4 + 3];
}

/** A left-aligned label on a white panel with a red border, so the border is never ink. */
const PANEL: RichTextLabelOptions = {
    text: "HELLO",
    fontSize: 48,
    textColor: "#000000",
    textAlign: "left",
    backgroundColor: "#ffffff",
    borderWidth: 4,
    borderColor: "#ff0000",
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 5,
    marginRight: 5,
};

describe("padding (#3157)", () => {
    it("moves left-aligned words in from the border by the padding, as well as the margin", () => {
        const padding = 12;
        const without = draw({ ...PANEL, backgroundPadding: 0 });
        const withPadding = draw({ ...PANEL, backgroundPadding: padding });

        // Measured against the same label without padding, so the letters' own side bearing
        // (which no option sets) cancels out. Before the fix the words did not move at all.
        const a = firstInk(without.image);
        const b = firstInk(withPadding.image);
        assert.approximately(b.x / withPadding.sx - a.x / without.sx, padding, 1.5, "left edge of the words");
        assert.approximately(b.y / withPadding.sy - a.y / without.sy, padding, 1.5, "top edge of the words");

        // And the first ink column sits at border + padding + margin, plus that bearing.
        const bearing = a.x / without.sx - (4 + 5);
        assert.approximately(b.x / withPadding.sx, 4 + padding + 5 + bearing, 1.5);
    });

    it("leaves centered words centered", () => {
        const without = draw({ ...PANEL, textAlign: "center", backgroundPadding: 0 });
        const withPadding = draw({ ...PANEL, textAlign: "center", backgroundPadding: 12 });

        const middle = (d: Drawn): number => {
            const first = firstInk(d.image).x;
            let last = 0;
            for (let col = 0; col < d.image.width; col++) {
                for (let row = 0; row < d.image.height; row++) {
                    if (isInk(d.image, col, row)) {
                        last = col;
                    }
                }
            }

            return (first + last) / 2 / d.image.width;
        };

        assert.approximately(middle(withPadding), middle(without), 0.01);
    });
});

describe("panel shadow", () => {
    const CARD: RichTextLabelOptions = {
        text: "Shadow",
        fontSize: 48,
        backgroundColor: "#ffffff",
        cornerRadius: 12,
        marginTop: 10,
        marginBottom: 10,
        marginLeft: 10,
        marginRight: 10,
    };
    const SHADOW = {
        panelShadowBlur: 6,
        panelShadowOffsetX: 8,
        panelShadowOffsetY: 8,
        panelShadowColor: "rgba(0, 0, 0, 0.6)",
    };

    it("draws below and to the right of the panel, without being cut off", () => {
        const { image, sx, sy } = draw({ ...CARD, ...SHADOW, panelShadow: true });
        // The panel sits inside a margin of blur + largest offset on every side.
        const m = 6 + 8;
        const right = image.width - m * sx;
        const bottom = image.height - m * sy;

        // Just past the panel's bottom-right, in the shadow: ink.
        assert.isAbove(alphaAt(image, right + 4 * sx, bottom + 4 * sy), 40, "shadow below-right of the panel");
        // Just past the panel's top-left, against the shadow's offset: nothing.
        assert.isBelow(alphaAt(image, m * sx - 3 * sx, m * sy - 3 * sy), 8, "nothing above-left of the panel");
        // The shadow fades out before the canvas ends, so it is not clipped.
        for (let x = 0; x < image.width; x++) {
            assert.isBelow(alphaAt(image, x, image.height - 1), 8, `bottom row, column ${String(x)}`);
        }

        for (let y = 0; y < image.height; y++) {
            assert.isBelow(alphaAt(image, image.width - 1, y), 8, `right column, row ${String(y)}`);
        }
    });

    it("draws the same pixels as a label without the option when it is off", () => {
        const plain = draw(CARD);
        const off = draw({ ...CARD, ...SHADOW, panelShadow: false });

        assert.strictEqual(off.image.width, plain.image.width);
        assert.strictEqual(off.image.height, plain.image.height);
        assert.deepEqual(Array.from(off.image.data), Array.from(plain.image.data));
    });

    it("keeps the letters the same size on screen", () => {
        const plain = new RichTextLabel(scene, CARD);
        const shadowed = new RichTextLabel(scene, { ...CARD, ...SHADOW, panelShadow: true });
        labels.push(plain, shadowed);
        const height = (l: RichTextLabel): number => {
            const bounds = l.textBounds;
            l.labelMesh?.refreshBoundingInfo();
            const plane = (l.labelMesh?.getBoundingInfo().boundingBox.extendSize.y ?? 0) * 2;

            return (bounds.bottom - bounds.top) * plane;
        };

        assert.approximately(height(shadowed), height(plain), 1e-6);
    });
});

describe("a label's glyphs (#3472)", () => {
    // Chromium hints a font's glyphs, or not, by the device pixel ratio in force when the page
    // first loaded that font at that size, and keeps it for the page's life, so the same label
    // drew one pixel taller or shorter depending on what the page drew earlier. A page loads a
    // font only once, so the check is that the label asks for unhinted glyphs, which Chromium
    // draws the same at every ratio.
    it("are drawn and measured unhinted", () => {
        const label = new RichTextLabel(scene, { text: "Adj", fontSize: 53.4127, textColor: "black" });
        labels.push(label);
        const ctx = (
            label.labelMesh?.material as unknown as { diffuseTexture: { getContext(): CanvasRenderingContext2D } }
        ).diffuseTexture.getContext();

        assert.strictEqual(ctx.textRendering, "geometricPrecision");
    });
});
