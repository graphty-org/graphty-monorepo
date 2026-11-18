/**
 * The skinned and animated sample files readers bring (Fox, CesiumMan, BrainStem) draw on nodes
 * and in pictures, and play: a skinned file with no normals or indices builds (Fox.glb, issue
 * #8607), an unnamed clip is listed by the
 * name that plays it (issue #8609), a playing skinned model is framed and boxed at its own size, and
 * a model whose clip travels (aerobatic_plane.glb's flight paths) is framed at its own size, not
 * the size of its path, while one whose clip moves in place (Parrot.glb's wings) is framed whole
 * over every frame.
 */

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { glb, gltfPair, TRIANGLE_BIN, triangleGltf, unpackGlb, utf8 } from "../../fixtures/models/fixtures";
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

/**
 * How many pixels on a thumbnail's outermost ring are drawn: a model cut by the picture's edge.
 * @param url - The PNG data URL.
 * @returns The count.
 */
async function edgePixels(url: string): Promise<number> {
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
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const ring = x === 0 || y === 0 || x === canvas.width - 1 || y === canvas.height - 1;
            if (ring && data[(y * canvas.width + x) * 4 + 3] > 0) {
                drawn++;
            }
        }
    }

    return drawn;
}

/**
 * One triangle, alone or with a one-second-out-and-back clip on its node.
 * @param clip - The clip: the property it moves and its value at the turn, or none.
 * @param clip.path - "translation" or "scale".
 * @param clip.turn - The value at one second; the clip starts and ends at the rest value.
 * @returns The file set.
 */
function triangle(clip?: { path: "translation" | "scale"; turn: [number, number, number] }): Map<string, Uint8Array> {
    if (clip === undefined) {
        return gltfPair();
    }

    const rest = clip.path === "scale" ? [1, 1, 1] : [0, 0, 0];
    const times = new Float32Array([0, 1, 2]);
    const places = new Float32Array([...rest, ...clip.turn, ...rest]);
    const bin = new Uint8Array(36 + 12 + 36);
    bin.set(TRIANGLE_BIN, 0);
    bin.set(new Uint8Array(times.buffer), 36);
    bin.set(new Uint8Array(places.buffer), 48);
    const json = triangleGltf({
        accessors: [
            { bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] },
            { bufferView: 1, componentType: 5126, count: 3, type: "SCALAR", min: [0], max: [2] },
            { bufferView: 2, componentType: 5126, count: 3, type: "VEC3" },
        ],
        bufferViews: [
            { buffer: 0, byteLength: 36 },
            { buffer: 0, byteOffset: 36, byteLength: 12 },
            { buffer: 0, byteOffset: 48, byteLength: 36 },
        ],
        buffers: [{ uri: "tri.bin", byteLength: bin.length }],
        animations: [
            {
                name: "Fly",
                samplers: [{ input: 1, output: 2 }],
                channels: [{ sampler: 0, target: { node: 0, path: clip.path } }],
            },
        ],
    });
    return new Map([
        ["tri.gltf", utf8(JSON.stringify(json))],
        ["tri.bin", bin],
    ]);
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

    it("frames a model whose clip travels at its own size, not the size of its path", async () => {
        const element = await mount();
        const still = await element.session.assets.add({ files: triangle() });
        const travels = await element.session.assets.add({
            files: triangle({ path: "translation", turn: [100, 0, 0] }),
        });
        assert.deepEqual(
            element.session.assets.inspect(travels.id).animations.map((clip) => clip.name),
            ["Fly"],
        );
        const alone = await coverage(await element.modelThumbnail(still.id, { size: 96 }));
        // Held at the clip's start, where the triangle stands as the still one does.
        const flying = await coverage(
            await element.modelThumbnail(travels.id, {
                size: 96,
                style: { "node.modelAnimation": "Fly", "node.modelAnimationOffset": 0, "node.modelAnimationSpeed": 0 },
            }),
        );
        // Framed by the whole path, the triangle was a hundredth of the picture across.
        assert.isAbove(flying, alone * 0.6, `the travelling triangle covers ${String(flying)} of ${String(alone)}`);
    });

    it("frames a model whose clip grows it in place whole at its largest frame, not its first", async () => {
        const element = await mount();
        const grows = await element.session.assets.add({ files: triangle({ path: "scale", turn: [4, 4, 1] }) });
        // Held at one second, where the triangle is four times the size it starts at.
        const largest = await element.modelThumbnail(grows.id, {
            size: 96,
            style: { "node.modelAnimation": "Fly", "node.modelAnimationOffset": 1, "node.modelAnimationSpeed": 0 },
        });
        assert.isAbove(await coverage(largest), 0);
        // Framed by the first frame, the grown triangle ran off the picture on every side it reaches.
        assert.equal(await edgePixels(largest), 0, "the grown triangle is cut by the thumbnail's edge");
    });

    it("boxes a node drawing a playing Fox at the model's fitted size, not the file's units (#8607)", async () => {
        const element = await mount();
        await drawModel(element, await fox(), [{ id: "a", x: 0 }], { "node.modelAnimation": "Walk" });
        const node = element.graph.scene.getMeshByName("node-model-a");
        assert.isNotNull(node);
        node.computeWorldMatrix(true);
        const { minimumWorld, maximumWorld } = node.getBoundingInfo().boundingBox;
        const extent = maximumWorld.subtract(minimumWorld);
        // A size-1 built-in shape spans 1.5; the playing fox reaches a little past its still box.
        assert.isBelow(Math.max(extent.x, extent.y, extent.z), 3, JSON.stringify(extent.asArray()));
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
