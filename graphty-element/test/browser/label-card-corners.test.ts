/**
 * @file A rounded label border is as heavy at its corners as along its straight edges (#3158).
 *
 * THE DEFECT. A card label -- a white panel, a light gray border and a large corner radius --
 * showed its corners as dark ticks while its straight edges stayed light. Two mechanisms could
 * make that, and they are told apart here by measuring the same ring twice:
 *
 * - CURVE SHAPE. The corners were quadratic curves rather than circular arcs; a quadratic's
 *   midpoint sits closer to the corner than an arc's, which thickens the ring along the diagonal
 *   by about 6%. That shows up on the label's own canvas.
 * - TEXTURE FILTERING. The canvas is uploaded to the GPU with straight (not premultiplied) alpha.
 *   Filtering and mipmapping then average a partly covered border pixel with the transparent
 *   black around the panel, which darkens it. Straight edges lie on whole texels and have no
 *   partly covered pixels; curves do. That shows up only on screen.
 *
 * WHAT IS MEASURED. The border's ink along a ray across the ring: at the middle of the top edge,
 * and at 45 degrees through the top-left corner. Ink is how far a pixel, composited over white,
 * is from white, as a fraction of how far the border color is; summed along the ray it is the
 * ring's thickness in pixels as an eye would weigh it. A dark fringe adds more ink than its
 * width. The corner and the edge must agree within 15%.
 *
 * WHAT IT FOUND (corner ink / edge ink, card at 92 px type, radius 80, border 6, ~5x minified):
 *
 * | drawing                              | label canvas | on screen |
 * | ------------------------------------ | ------------ | --------- |
 * | quadratic corners, straight upload   | 1.16         | 1.88      |
 * | arc corners, straight upload         | 1.01         | 1.82      |
 * | arc corners, premultiplied upload    | 1.01         | 1.12      |
 *
 * So the curve shape was a small part and texture filtering the main one; both are fixed.
 */

import { Camera, Color4, Engine, FreeCamera, Mesh, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { RichTextLabel } from "../../src/meshes/RichTextLabel";

/** The card look: a white panel with a light gray border and a large radius. */
const CARD = {
    text: "Child 2\nTwo connections\nCommunity 2 of 2",
    fontSize: 92,
    textAlign: "left",
    backgroundColor: "#ffffff",
    borderWidth: 6,
    borderColor: "#c5cad6",
    cornerRadius: 80,
    marginTop: 44,
    marginBottom: 44,
    marginLeft: 56,
    marginRight: 56,
    billboardMode: Mesh.BILLBOARDMODE_NONE,
} as const;

/** The border color's distance from white, in luma. */
const BORDER_INK = 255 - luma(0xc5, 0xca, 0xd6);

/** How tall the label is drawn on screen, in pixels: the texture is minified about five times. */
const SCREEN_HEIGHT = 140;

/**
 * Perceived brightness of a color.
 * @param r - Red, 0-255.
 * @param g - Green, 0-255.
 * @param b - Blue, 0-255.
 * @returns Luma, 0-255.
 */
function luma(r: number, g: number, b: number): number {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** An RGBA image with its top row first. */
interface Image {
    width: number;
    height: number;
    data: Uint8ClampedArray | Uint8Array;
}

/**
 * The border's ink along a straight ray: the ring's thickness as an eye weighs it.
 * @param image - The pixels.
 * @param from - Where the ray starts, outside the panel.
 * @param to - Where it ends, inside the panel.
 * @returns The summed ink, in pixels of border.
 */
function inkAlong(image: Image, from: [number, number], to: [number, number]): number {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const step = 0.125;
    let ink = 0;
    for (let s = 0; s < length; s += step) {
        const x = Math.floor(from[0] + ((to[0] - from[0]) * s) / length);
        const y = Math.floor(from[1] + ((to[1] - from[1]) * s) / length);
        if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
            continue;
        }

        const i = (y * image.width + x) * 4;
        const a = image.data[i + 3] / 255;
        const over = (c: number): number => c * a + 255 * (1 - a);
        ink +=
            ((255 - luma(over(image.data[i]), over(image.data[i + 1]), over(image.data[i + 2]))) / BORDER_INK) * step;
    }

    return ink;
}

/**
 * The ring's ink at mid top edge and through the top-left corner at 45 degrees.
 * @param image - The pixels.
 * @param box - The panel's outer rectangle in those pixels.
 * @param box.x - Left.
 * @param box.y - Top.
 * @param box.width - Width.
 * @param radius - The outer corner radius in those pixels.
 * @param border - The border width in those pixels.
 * @returns The ink at each place.
 */
function ringInk(
    image: Image,
    box: { x: number; y: number; width: number },
    radius: number,
    border: number,
): { edge: number; corner: number } {
    const reach = border + 3;
    const midX = box.x + box.width / 2;
    const edge = inkAlong(image, [midX, box.y - 3], [midX, box.y + reach]);

    const d = Math.SQRT1_2;
    const cx = box.x + radius;
    const cy = box.y + radius;
    const corner = inkAlong(
        image,
        [cx - (radius + 3) * d, cy - (radius + 3) * d],
        [cx - (radius - reach) * d, cy - (radius - reach) * d],
    );

    return { edge, corner };
}

/** The panel's dimensions on its own canvas, which the label does not publish. */
interface Internals {
    actualDimensions: { width: number; height: number };
}

describe("a rounded label border (#3158)", () => {
    let engine: Engine | undefined;
    let canvas: HTMLCanvasElement | undefined;

    afterEach(() => {
        engine?.dispose();
        canvas?.remove();
    });

    it("is as heavy at its corners as along its edges on the label's own canvas", () => {
        engine = new Engine(document.createElement("canvas"), true);
        const scene = new Scene(engine);
        const label = new RichTextLabel(scene, CARD);
        const texture = (
            label.labelMesh?.material as unknown as { diffuseTexture: { getContext(): CanvasRenderingContext2D } }
        ).diffuseTexture;
        const ctx = texture.getContext();
        const { width, height } = ctx.canvas;
        const image = ctx.getImageData(0, 0, width, height);
        const actual = (label as unknown as Internals).actualDimensions;
        const scale = height / actual.height;
        const sx = width / actual.width;

        const ink = ringInk(
            image,
            { x: 0, y: 0, width },
            CARD.cornerRadius * Math.min(scale, sx),
            CARD.borderWidth * scale,
        );

        assert.approximately(ink.corner / ink.edge, 1, 0.15, `canvas: corner ${ink.corner} vs edge ${ink.edge}`);
        label.dispose();
    });

    it("is as heavy at its corners as along its edges once it is on screen", async () => {
        canvas = document.createElement("canvas");
        canvas.width = 480;
        canvas.height = 320;
        canvas.style.width = "480px";
        canvas.style.height = "320px";
        document.body.append(canvas);
        engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
        engine.setHardwareScalingLevel(1);
        const scene = new Scene(engine);
        scene.clearColor = new Color4(1, 1, 1, 1);

        const label = new RichTextLabel(scene, CARD);
        label.startAnimation();
        const mesh = label.labelMesh;
        assert.exists(mesh);
        mesh?.refreshBoundingInfo();
        const extent = mesh?.getBoundingInfo().boundingBox.extendSize ?? Vector3.Zero();

        // An orthographic camera on which the plane is exactly SCREEN_HEIGHT pixels tall.
        const camera = new FreeCamera("camera", new Vector3(0, 0, -10), scene);
        camera.setTarget(Vector3.Zero());
        camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
        const pxPerUnit = SCREEN_HEIGHT / (extent.y * 2);
        camera.orthoLeft = -canvas.width / 2 / pxPerUnit;
        camera.orthoRight = canvas.width / 2 / pxPerUnit;
        camera.orthoTop = canvas.height / 2 / pxPerUnit;
        camera.orthoBottom = -canvas.height / 2 / pxPerUnit;

        await scene.whenReadyAsync();
        for (let i = 0; i < 3; i++) {
            scene.render();
        }

        const pixels = (await engine.readPixels(0, 0, canvas.width, canvas.height)) as Uint8Array;
        // readPixels returns the bottom row first.
        const flipped = new Uint8Array(pixels.length);
        const row = canvas.width * 4;
        for (let y = 0; y < canvas.height; y++) {
            flipped.set(pixels.subarray(y * row, (y + 1) * row), (canvas.height - 1 - y) * row);
        }

        const actual = (label as unknown as Internals).actualDimensions;
        const screenWidth = extent.x * 2 * pxPerUnit;
        const box = {
            x: canvas.width / 2 - screenWidth / 2,
            y: canvas.height / 2 - SCREEN_HEIGHT / 2,
            width: screenWidth,
        };
        const scale = SCREEN_HEIGHT / actual.height;

        const ink = ringInk(
            { width: canvas.width, height: canvas.height, data: flipped },
            box,
            CARD.cornerRadius * scale,
            CARD.borderWidth * scale,
        );

        assert.approximately(ink.corner / ink.edge, 1, 0.15, `screen: corner ${ink.corner} vs edge ${ink.edge}`);
        label.dispose();
    });
});
