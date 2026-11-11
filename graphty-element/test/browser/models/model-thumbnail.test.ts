/**
 * @file `modelThumbnail` (design/rendering/node-models.md section 14.3): one node drawn as a model,
 * alone, as a PNG on a transparent background; drawn once per model and style, and refused with
 * the model's own code when it cannot be drawn.
 */

import { assert, describe, it } from "vitest";

import { isGraphtyError } from "../../../src/errors";
import { sphereGlb } from "../../fixtures/models/fixtures";
import policeUrl from "../../fixtures/models/police.glb?url";
import colormapUrl from "../../fixtures/models/Textures/colormap.png?url";
import { mount } from "./helpers";

/**
 * How many pixels of a PNG data URL are not fully transparent.
 * @param url - The picture.
 * @returns The count of drawn pixels.
 */
async function drawnPixels(url: string): Promise<number> {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(img, 0, 0);
    const { data } = context.getImageData(0, 0, img.width, img.height);
    let drawn = 0;
    for (let at = 3; at < data.length; at += 4) {
        drawn += data[at] > 0 ? 1 : 0;
    }
    return drawn;
}

describe("modelThumbnail", () => {
    it("draws an added model as a PNG, keeps the picture, and redraws for other settings", async () => {
        const element = await mount();
        const ball = await element.session.assets.add({ files: new Map([["ball.glb", sphereGlb(8, 4)]]) });
        assert.equal(ball.state, "accepted");

        const first = await element.modelThumbnail(ball.id, { size: 64 });
        assert.match(first, /^data:image\/png;base64,/);
        assert.isAbove(await drawnPixels(first), 0, "the model is drawn");
        assert.strictEqual(await element.modelThumbnail(ball.id, { size: 64 }), first, "kept, not drawn again");

        const tinted = await element.modelThumbnail(ball.id, {
            size: 64,
            style: { "node.color": "#ff0000", "node.modelTint": true },
        });
        assert.notEqual(tinted, first, "the tint is drawn");
    });

    // police.glb's one primitive has no indices, as glTF allows: drawn in vertex order.
    it("draws a textured model from a set (police.glb and its colormap.png)", async () => {
        const element = await mount();
        const bytes = async (url: string): Promise<Uint8Array> =>
            new Uint8Array(await (await fetch(url)).arrayBuffer());
        const police = await element.session.assets.add({
            files: new Map([
                ["police.glb", await bytes(policeUrl)],
                ["Textures/colormap.png", await bytes(colormapUrl)],
            ]),
        });
        assert.equal(police.state, "accepted", JSON.stringify(police.problems));
        const url = await element.modelThumbnail(police.id, { size: 64 });
        assert.isAbove(await drawnPixels(url), 0, "the textured model is drawn");
    });

    it("refuses an unknown ref, and a model waiting for parts with its own code", async () => {
        const element = await mount();
        const unknown = await element.modelThumbnail("asset:nothing").catch((e: unknown) => e);
        assert.isTrue(isGraphtyError(unknown) && unknown.code === "E_MODEL_UNKNOWN_ASSET");

        const police = new Uint8Array(
            await (await fetch(new URL("../../fixtures/models/police.glb", import.meta.url))).arrayBuffer(),
        );
        const waiting = await element.session.assets.add(new File([police], "police.glb"));
        assert.equal(waiting.state, "rejected");
        const error = await element.modelThumbnail(waiting.id).catch((e: unknown) => e);
        assert.isTrue(isGraphtyError(error) && error.code === "E_MODEL_MISSING_FILE");
    });
});
