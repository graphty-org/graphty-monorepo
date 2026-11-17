/**
 * The skinned and animated sample files readers bring (Fox, CesiumMan, BrainStem) draw on nodes
 * and in pictures, and play: a skinned file with no normals or indices builds (Fox.glb, issue
 * #8607), an unnamed clip is listed by the
 * name that plays it (issue #8609), and a playing skinned model is framed at its own size.
 */

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { glb, unpackGlb } from "../../fixtures/models/fixtures";
import foxUrl from "../../fixtures/models/Fox.glb?url";
import { drawModel, filesOf, type Frame, mount, pixelsChanged, readFrame } from "./helpers";

/**
 * Fox.glb's bytes (see test/fixtures/models/Fox.LICENSE.md).
 * @returns The file set.
 */
async function fox(): Promise<Map<string, Uint8Array>> {
    return new Map([["Fox.glb", new Uint8Array(await (await fetch(foxUrl)).arrayBuffer())]]);
}

/**
 * The next frame the element draws by itself.
 * @param element - The element.
 * @returns Once it has drawn.
 */
function nextFrame(element: Graphty): Promise<void> {
    return new Promise((resolve) => {
        element.graph.scene.onAfterRenderObservable.addOnce(() => {
            resolve();
        });
    });
}

/**
 * How many pixels of a thumbnail are drawn (not transparent).
 * @param url - The PNG data URL.
 * @returns The count.
 */
async function coverage(url: string): Promise<number> {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let drawn = 0;
    for (let at = 3; at < data.length; at += 4) {
        if (data[at] > 0) {
            drawn++;
        }
    }

    return drawn;
}

describe("skinned sample files", () => {
    it("draws Fox.glb, skinned with no normals and no indices, on a node and in a thumbnail", async () => {
        const element = await mount();
        const { asset } = await drawModel(element, await fox(), [{ id: "a", x: 0 }]);
        assert.isAbove(await coverage(await element.modelThumbnail(asset, { size: 64 })), 200);
        const { asset: playing } = await drawModel(element, await fox(), [{ id: "b", x: 1 }], {
            "node.modelAnimation": "Walk",
        });
        assert.isAbove(await coverage(await element.modelThumbnail(playing, { size: 64 })), 200);
    });

    it("frames a playing skinned model at the size it is still, not by its bones' reach", async () => {
        const element = await mount();
        const record = await element.session.assets.add({ files: await fox() });
        const still = await coverage(await element.modelThumbnail(record.id, { size: 96 }));
        for (const clip of ["Survey", "Walk", "Run"]) {
            const posed = await coverage(
                await element.modelThumbnail(record.id, {
                    size: 96,
                    style: { "node.modelAnimation": clip, "node.modelAnimationOffset": 0 },
                }),
            );
            assert.isAbove(posed, still * 0.6, `${clip} is drawn about as large as the still fox`);
        }
    });

    it("lists an unnamed clip by the name that plays it, and plays it on a node", async () => {
        const { json, bin } = unpackGlb((await filesOf("gltf-skinned-animated")).get("cube.glb") as Uint8Array);
        for (const clip of json.animations as Record<string, unknown>[]) {
            delete clip.name;
        }
        const files = new Map([["cube.glb", glb(json, bin)]]);
        const element = await mount();
        const record = await element.session.assets.add({ files });
        const names = element.session.assets.inspect(record.id).animations.map((clip) => clip.name);
        assert.deepEqual(names, ["animation0", "animation1"]);

        const { layer, asset } = await drawModel(element, files, [{ id: "a", x: 0 }]);
        const still = await readFrame(element);
        await element.session.styles.update(layer, {
            set: { "node.model": asset, "node.modelAnimation": names[0] },
        });
        let moved: Frame = still;
        while (pixelsChanged(still, moved) <= 100) {
            await nextFrame(element);
            moved = await readFrame(element, false);
        }
        assert.isAbove(pixelsChanged(still, moved), 100, "the unnamed clip plays");
    });
});
