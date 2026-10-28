/**
 * The Shaders gallery's pictures on the REAL graphty-element, opened by a real click on the "+":
 * the Halftone tile, read back at the size the gallery draws it, shows its dot screen as dots a
 * reader can tell apart, not as a flat tone (issue #3320). The picture is drawn at its size in CSS
 * pixels and softened by READER_BLUR, about the finest detail a reader makes out at that size, so
 * a screen too fine to read washes out to its average tone; then the dark dots along rows of it
 * are counted, each at least DOT_CONTRAST levels darker than the paper around it.
 */

import { afterEach, assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { within } from "../../../test/test-utils";
import { addNodeLayer, mountElement, openGallery, removeElement, renderPanel } from "./shaderHarness";

afterEach(removeElement);

/** How much darker than the paper beside it a dot must be to count, in 0-255 luminance levels. */
const DOT_CONTRAST = 40;

/** The finest detail a reader makes out on the tile, as a CSS blur radius. */
const READER_BLUR = "blur(1px)";

/** The fewest dots a row across the Halftone tile must show. */
const MIN_DOTS = 4;

/**
 * The dark dots along one row of luminance: each a dip at least DOT_CONTRAST below the light on
 * both sides of it.
 * @param row - luminance, 0 to 255, left to right.
 * @returns how many dots.
 */
function dotsAlong(row: readonly number[]): number {
    let dots = 0;
    let falling = false;
    let extreme = row[0] ?? 0;
    for (const value of row) {
        if (!falling && value <= extreme - DOT_CONTRAST) {
            falling = true;
            extreme = value;
        } else if (falling && value >= extreme + DOT_CONTRAST) {
            dots += 1;
            falling = false;
            extreme = value;
        } else if (falling ? value < extreme : value > extreme) {
            extreme = value;
        }
    }
    return dots;
}

/**
 * The picture as a reader makes it out on the tile: drawn at its displayed size in CSS pixels,
 * cropped as `object-fit: cover` crops it, softened by READER_BLUR.
 * @param img - the tile's picture.
 * @returns the pixels.
 */
function asShown(img: HTMLImageElement): ImageData {
    const box = img.getBoundingClientRect();
    const width = Math.round(box.width);
    const height = Math.round(box.height);
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const sw = width / scale;
    const sh = height / scale;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("no 2D canvas");
    }
    context.filter = READER_BLUR;
    context.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, width, height);
    return context.getImageData(0, 0, width, height);
}

describe("the Shaders gallery's pictures", () => {
    beforeAll(async () => {
        await page.viewport(1024, 768);
    });

    it("the Halftone tile shows its dots at the size the gallery draws it", async () => {
        const mounted = await mountElement();
        const layer = await addNodeLayer(mounted.session);
        renderPanel(mounted, [layer]);
        const gallery = await openGallery("node");
        const tile = await within(gallery).findByRole("button", { name: "Halftone" });
        const img = tile.querySelector("img");
        assert.isNotNull(img, "the tile has a picture");
        await img.decode();

        const pixels = asShown(img);
        const counts = [0.3, 0.4, 0.5, 0.6, 0.7].map((at) => {
            const y = Math.floor(pixels.height * at);
            const row: number[] = [];
            for (let x = 0; x < pixels.width; x++) {
                const i = (y * pixels.width + x) * 4;
                row.push(0.299 * pixels.data[i] + 0.587 * pixels.data[i + 1] + 0.114 * pixels.data[i + 2]);
            }
            return dotsAlong(row);
        });
        assert.isAtLeast(
            Math.max(...counts),
            MIN_DOTS,
            `dots a reader can tell apart along rows of a ${String(pixels.width)} px tile: ${counts.join(", ")}`,
        );
    });
});
