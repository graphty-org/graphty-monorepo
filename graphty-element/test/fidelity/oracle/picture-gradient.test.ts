/**
 * A gradient a program paints as a picture (Cytoscape desktop's gradient custom graphics, PNGs in its SVG export) read
 * back from its pixels, and a picture of anything else read as no gradient.
 */
import { assert, describe, it } from "vitest";

import { pictureGradient, type Pixels } from "./picture-gradient";

/**
 * A square picture painted by a function of each pixel's middle, from the picture's middle, in -1..1.
 * @param size - its side in pixels
 * @param paint - the RGB at a place, or null for a transparent pixel
 * @returns the picture
 */
function picture(size: number, paint: (x: number, y: number) => readonly number[] | null): Pixels {
    const data = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const rgb = paint(((x + 0.5) / size) * 2 - 1, ((y + 0.5) / size) * 2 - 1);
            if (rgb !== null) {
                data.set([...rgb, 255], 4 * (y * size + x));
            }
        }
    }
    return { width: size, height: size, data };
}

const mix = (a: readonly number[], b: readonly number[], t: number): number[] =>
    a.map((v, k) => v + (b[k] - v) * Math.min(1, Math.max(0, t)));
const WHITE = [255, 255, 255];
const BLUE = [31, 119, 180];
const inDisc = (x: number, y: number): boolean => Math.hypot(x, y) <= 1;
/** Whether a color read back is within 3 of one painted, in each channel. */
const near = (hex: string | undefined, rgb: readonly number[]): boolean =>
    hex !== undefined && rgb.every((v, k) => Math.abs(Number.parseInt(hex.slice(1 + 2 * k, 3 + 2 * k), 16) - v) <= 3);

describe("a gradient read off a picture's pixels", () => {
    it("reads a linear ramp across a round node, its ends carried to the box's corners", () => {
        // white at the bottom left, blue at the top right: Cytoscape's 45 degrees
        const g = pictureGradient(picture(60, (x, y) => (inDisc(x, y) ? mix(WHITE, BLUE, (x - y + 2) / 4) : null)));
        assert.isNotNull(g);
        assert.strictEqual(g?.kind, "linear");
        assert.strictEqual(g?.angle, 135);
        const stops = g?.stops ?? [];
        assert.strictEqual(stops[0].offset, 0);
        assert.strictEqual(stops.at(-1)?.offset, 1);
        // run along 135 degrees (down and to the left): blue first, white last
        assert.isTrue(near(stops[0].color, BLUE), stops[0].color);
        assert.isTrue(near(stops.at(-1)?.color, WHITE), stops.at(-1)?.color);
    });

    it("reads a radial ramp out from the middle", () => {
        const g = pictureGradient(picture(60, (x, y) => mix(WHITE, BLUE, Math.hypot(x, y) / 0.7)));
        assert.strictEqual(g?.kind, "radial");
        assert.isTrue(near(g?.stops[0].color, WHITE), g?.stops[0].color);
    });

    it("reads a flat picture, or one of no ramp, as no gradient", () => {
        assert.isNull(pictureGradient(picture(40, () => BLUE)));
        // a checkerboard: no direction or distance orders its colors
        assert.isNull(
            pictureGradient(picture(40, (x, y) => ((Math.floor(x * 5) + Math.floor(y * 5)) % 2 === 0 ? WHITE : BLUE))),
        );
    });
});
