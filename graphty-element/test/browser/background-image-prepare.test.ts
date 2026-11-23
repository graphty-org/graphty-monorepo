/**
 * `prepareBackgroundImage` (issue #6818): a picture the browser decodes comes back as a `data:`
 * address no larger than `maxSize`, and one it cannot decode (a HEIC photo in a browser without
 * HEIC support, or bytes that are no picture) comes back as `E_IMAGE_DECODE`, never as nothing.
 */

import { assert, describe, it } from "vitest";

import { prepareBackgroundImage } from "../../src/session/backgroundImage";

/**
 * A PNG of a given size, drawn in one color.
 * @param width - Its width.
 * @param height - Its height.
 * @returns The file.
 */
async function png(width: number, height: number): Promise<File> {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context.fillStyle = "#3366cc";
    context.fillRect(0, 0, width, height);
    return new File([await canvas.convertToBlob({ type: "image/png" })], "sky.png", { type: "image/png" });
}

describe("prepareBackgroundImage", () => {
    it("keeps a picture that fits as a PNG data address at its own size", async () => {
        const prepared = await prepareBackgroundImage(await png(64, 32));
        assert.isTrue(prepared.ok);
        if (prepared.ok) {
            assert.match(prepared.data, /^data:image\/png;base64,/);
            assert.deepEqual([prepared.width, prepared.height, prepared.scaled], [64, 32, false]);
        }
    });

    it("scales a picture wider than maxSize down to it, keeping its shape", async () => {
        const prepared = await prepareBackgroundImage(await png(400, 100), { maxSize: 200 });
        assert.isTrue(prepared.ok);
        if (prepared.ok) {
            assert.deepEqual([prepared.width, prepared.height, prepared.scaled], [200, 50, true]);
        }
    });

    it("reports a picture the browser cannot decode as E_IMAGE_DECODE with its format and name", async () => {
        const heic = new File([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 104, 101, 105, 99])], "IMG_0001.HEIC", {
            type: "image/heic",
        });
        const prepared = await prepareBackgroundImage(heic);
        assert.deepEqual(prepared, {
            ok: false,
            problem: { code: "E_IMAGE_DECODE", params: { format: "image/heic", fileName: "IMG_0001.HEIC" } },
        });
    });
});
