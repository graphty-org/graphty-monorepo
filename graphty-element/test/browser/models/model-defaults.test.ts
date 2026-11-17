/**
 * A model's own settings (`session.assets.setDefaults`) on the canvas and in its pictures: a node
 * drawing a model whose settings name a clip plays it with no layer naming one (issue #8609), a
 * layer's value wins over the model's, a picture the model is drawn without lets its part take
 * the node's color (issue #8613), and a held pose in a preview stays put (issue #8610).
 */

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { everyFrameAnimationsOn } from "../../../src/managers/everyFrameAnimations";
import { colorShare, drawnShare } from "../../helpers/pictureFacts";
import { drawModel, filesOf, type Frame, mount, pixelsChanged, readFrame } from "./helpers";

/**
 * The next frame a canvas's scene draws.
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
 * Read a preview's canvas.
 * @param canvas - The preview's canvas.
 * @returns Its pixels.
 */
function shot(canvas: HTMLCanvasElement): Frame {
    const copy = document.createElement("canvas");
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(canvas, 0, 0);
    const pixels = new Uint8Array(context.getImageData(0, 0, copy.width, copy.height).data.buffer);
    return { pixels, width: copy.width, height: copy.height };
}

/**
 * Two frames of the page, so a preview has drawn what it was last given.
 * @returns Once they went by.
 */
function previewFrame(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

/**
 * Three cubes in a row: one painted by cube.png, one by other.png (both green), and one blue by
 * its base color alone, with no picture.
 * @returns The files.
 */
async function threeCubes(): Promise<Map<string, Uint8Array>> {
    const files = await filesOf("gltf-textured");
    const gltf = JSON.parse(new TextDecoder().decode(files.get("cube.gltf"))) as Record<string, unknown[]>;
    const [mesh] = gltf.meshes as { primitives: Record<string, unknown>[] }[];
    const primitive = (material: number): unknown => ({ primitives: [{ ...mesh.primitives[0], material }] });
    gltf.images = [{ uri: "cube.png" }, { uri: "other.png" }];
    gltf.textures = [{ source: 0 }, { source: 1 }];
    gltf.meshes = [primitive(0), primitive(1), primitive(2)];
    gltf.nodes = [
        { mesh: 0, translation: [-1.5, 0, 0] },
        { mesh: 1, translation: [0, 0, 0] },
        { mesh: 2, translation: [1.5, 0, 0] },
    ];
    gltf.scenes = [{ nodes: [0, 1, 2] }];
    const textured = (index: number): unknown => ({
        pbrMetallicRoughness: { baseColorTexture: { index }, metallicFactor: 0, roughnessFactor: 1 },
    });
    gltf.materials = [
        textured(0),
        textured(1),
        { pbrMetallicRoughness: { baseColorFactor: [0, 0, 1, 1], metallicFactor: 0, roughnessFactor: 1 } },
    ];
    files.set("cube.gltf", new TextEncoder().encode(JSON.stringify(gltf)));
    files.set("other.png", files.get("cube.png") as Uint8Array);
    return files;
}

describe("a model's own settings", () => {
    it("play the clip they name on a node whose layer names none", async () => {
        const element = await mount();
        const record = await element.session.assets.add({ files: await filesOf("gltf-skinned-animated") });
        await element.session.assets.setDefaults(record.id, { style: { "node.modelAnimation": "turn" } });
        const { asset } = await drawModel(element, "gltf-skinned-animated", [{ id: "a", x: 0 }]);
        assert.strictEqual(asset, record.id);
        assert.isAbove(everyFrameAnimationsOn(element.graph.scene), 0, "the model's clip plays");
        const from = await readFrame(element, false);
        let moved = from;
        while (pixelsChanged(from, moved) <= 100) {
            await nextFrame(element);
            moved = await readFrame(element, false);
        }

        // Taking the setting out again stills the node: the change of settings draws it again.
        await element.session.assets.setDefaults(record.id, { style: { "node.modelAnimation": undefined } });
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        assert.strictEqual(everyFrameAnimationsOn(element.graph.scene), 0, "and stops once taken out");
    });

    it("turn a node's model, and a layer's own turn wins", async () => {
        const element = await mount();
        const { layer, asset } = await drawModel(element, "gltf-skinned-z-up", [{ id: "a", x: 0 }]);
        const plain = await readFrame(element);
        await element.session.assets.setDefaults(asset, { style: { "node.modelSourceUp": "z" } });
        await operationQueueOf(element.graph).waitForCompletion();
        const turned = await readFrame(element);
        assert.isAbove(pixelsChanged(plain, turned), 200, "the model's own up axis is drawn");

        await element.session.styles.update(layer, { set: { "node.model": asset, "node.modelSourceUp": "y" } });
        await operationQueueOf(element.graph).waitForCompletion();
        const layered = await readFrame(element);
        assert.isBelow(pixelsChanged(plain, layered), 50, "the layer's own value wins");
    });

    it("draw a part whose picture is hidden in the node's color, in a thumbnail and on the canvas", async () => {
        const element = await mount();
        const record = await element.session.assets.add({ files: await filesOf("gltf-textured") });
        const { pictures } = element.session.assets.inspect(record.id);
        assert.deepEqual(pictures, [{ name: "cube.png", materials: ["cube"] }]);
        const red = { "node.color": "#ff0000" };
        const own = await element.modelThumbnail(record.id, { size: 64, style: red });
        assert.isAtLeast(await colorShare(own, "green"), 0.05, "its green picture is drawn");

        const asked = await element.modelThumbnail(record.id, { size: 64, style: red, hiddenTextures: ["cube.png"] });
        assert.isBelow(await colorShare(asked, "green"), 0.01, "the picture is gone");
        assert.isAtLeast(await colorShare(asked, "red"), 0.05, "and the part takes the node's color");

        await element.session.assets.setDefaults(record.id, { hiddenTextures: ["cube.png"] });
        const kept = await element.modelThumbnail(record.id, { size: 64, style: red });
        assert.isAtLeast(await colorShare(kept, "red"), 0.05, "the model's own list hides it too");
        assert.isAtLeast(await drawnShare(kept), 0.03);
    });

    for (const [variant, picture, materials] of [
        ["babylon-textured", "cube.png", ["cube"]],
        ["babylon-absolute-textures", "assets.example.com/textures/cube.png", ["cube"]],
        ["ply-uv-png", "cube.png", [""]],
    ] as const) {
        it(`list ${variant}'s picture and draw its part without it in the node's color (#8613)`, async () => {
            const element = await mount();
            const record = await element.session.assets.add({ files: await filesOf(variant) });
            const { pictures } = element.session.assets.inspect(record.id);
            assert.deepEqual(pictures, [{ name: picture, materials: [...materials] }]);
            const red = { "node.color": "#ff0000" };
            const own = await element.modelThumbnail(record.id, { size: 64, style: red });
            assert.isAtLeast(await colorShare(own, "green"), 0.05, "its green picture is drawn");
            const hidden = await element.modelThumbnail(record.id, { size: 64, style: red, hiddenTextures: [picture] });
            assert.isBelow(await colorShare(hidden, "green"), 0.01, "the picture is gone");
            assert.isAtLeast(await colorShare(hidden, "red"), 0.05, "and the part takes the node's color");
        });
    }

    it("draw the whole model in the node's color once every picture is gone, and only a picture's part for one (#8613, #8614)", async () => {
        const element = await mount();
        const files = await threeCubes();
        const record = await element.session.assets.add({ files });
        const red = { "node.color": "#ff0000" };
        const thumb = (hiddenTextures: string[]): Promise<string> =>
            element.modelThumbnail(record.id, { size: 96, style: red, hiddenTextures });

        const some = await thumb(["cube.png"]);
        assert.isAtLeast(await colorShare(some, "red"), 0.02, "the cube that lost its picture takes the node's color");
        assert.isAtLeast(await colorShare(some, "green"), 0.02, "the other picture is still drawn");
        assert.isAtLeast(await colorShare(some, "blue"), 0.02, "and the blue cube keeps its own color");

        const none = await thumb(["cube.png", "other.png"]);
        assert.isAtLeast(await colorShare(none, "red"), 0.06, "every cube takes the node's color");
        assert.isBelow(await colorShare(none, "green"), 0.005, "no picture is left");
        assert.isBelow(await colorShare(none, "blue"), 0.005, "the blue cube too: the model has no look left");

        const without = new Map([...files].filter(([name]) => !name.endsWith(".png")));
        const bare = await element.session.assets.add({ files: without }, { skipped: ["cube.png", "other.png"] });
        const added = await element.modelThumbnail(bare.id, { size: 96, style: red });
        assert.isAtLeast(await colorShare(added, "red"), 0.06, "added without its pictures, every cube takes it");
        assert.isBelow(await colorShare(added, "blue"), 0.005);
    });

    it("hold a pose in a preview: the clip at Speed 0 stays at its Start", async () => {
        const element = await mount();
        const record = await element.session.assets.add({ files: await filesOf("gltf-animated") });
        const box = document.createElement("div");
        box.style.cssText = "width:160px;height:160px";
        document.body.appendChild(box);
        const preview = await element.modelPreview(record.id, box, {
            style: { "node.modelAnimation": "spin", "node.modelAnimationSpeed": 0, "node.modelAnimationOffset": 0 },
        });
        try {
            await previewFrame();
            const start = shot(preview.canvas);
            await preview.update({
                "node.modelAnimation": "spin",
                "node.modelAnimationSpeed": 0,
                "node.modelAnimationOffset": 0.5,
            });
            await previewFrame();
            const half = shot(preview.canvas);
            assert.isAbove(pixelsChanged(start, half), 100, "half way through the clip the cube is turned");
            for (let frame = 0; frame < 5; frame++) {
                await previewFrame();
            }
            assert.strictEqual(pixelsChanged(half, shot(preview.canvas)), 0, "and the pose holds");
        } finally {
            preview.dispose();
            box.remove();
        }
    });
});
