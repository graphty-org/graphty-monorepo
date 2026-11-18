/**
 * Model nodes playing their file's clips: a playing model draws a new picture as time passes, a
 * held pose is drawn where the clip puts it and stays put, two nodes play two clips of one file, a
 * skinned, a rigid and a morph-target model all animate, an unknown clip is reported,
 * and a model keeps the frame loop going only while it plays.
 */

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { everyFrameAnimationsOn } from "../../../src/managers/everyFrameAnimations";
import { drawModel, filesOf, type Frame, mount, nextModelEvent, pixelsChanged, readFrame } from "./helpers";

/**
 * The values of a model layer that plays or holds a clip.
 * @param asset - The model.
 * @param clip - The clip.
 * @param speed - Its speed; 0 holds the pose at `offset`.
 * @param offset - Seconds into the clip.
 * @returns The layer's values.
 */
function playing(asset: string, clip: string, speed: number, offset: number): Record<string, unknown> {
    return {
        "node.model": asset,
        "node.modelAnimation": clip,
        "node.modelAnimationSpeed": speed,
        "node.modelAnimationOffset": offset,
    };
}

/**
 * Set a layer's values and read the final picture.
 * @param element - The element.
 * @param layer - The layer.
 * @param set - Its values.
 * @returns The frame.
 */
async function hold(element: Graphty, layer: string, set: Record<string, unknown>): Promise<Frame> {
    await element.session.styles.update(layer, { set });
    await operationQueueOf(element.graph).waitForCompletion();
    return readFrame(element);
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
 * Wait until a playing model's picture moves away from a frame, frame by frame.
 * @param element - The element.
 * @param from - The frame it starts from.
 * @returns How many frames that took.
 */
async function framesUntilMoved(element: Graphty, from: Frame): Promise<number> {
    let frames = 0;
    for (;;) {
        await nextFrame(element);
        frames++;
        if (pixelsChanged(from, await readFrame(element, false)) > 100) {
            return frames;
        }
    }
}

describe("model animation", () => {
    it("draws new pictures while a rigid clip plays, holds a still pose, and rests the frame loop when still", async () => {
        const element = await mount();
        const { graph } = element;
        // The clip turns the cube a quarter turn about Y in a second.
        const { layer, asset } = await drawModel(element, "gltf-animated", [{ id: "a", x: 0 }], {
            "node.modelAnimation": "spin",
            "node.modelAnimationSpeed": 0,
            "node.modelAnimationOffset": 0,
        });
        assert.strictEqual(everyFrameAnimationsOn(graph.scene), 0, "a held pose does not draw every frame");
        const start = await readFrame(element);
        assert.strictEqual(pixelsChanged(start, await readFrame(element)), 0, "a held pose stays put");

        const half = await hold(element, layer, playing(asset, "spin", 0, 0.5));
        assert.isAbove(pixelsChanged(start, half), 200, "half way through the clip the cube is turned");
        assert.strictEqual(pixelsChanged(half, await readFrame(element)), 0, "and stays turned");
        const back = await hold(element, layer, playing(asset, "spin", 0, 0));
        assert.strictEqual(pixelsChanged(start, back), 0, "the same moment draws the same pose");

        const moving = await hold(element, layer, playing(asset, "spin", 1, 0));
        assert.isAbove(everyFrameAnimationsOn(graph.scene), 0, "a playing model draws every frame");
        assert.isAbove(await framesUntilMoved(element, moving), 0, "the picture moves while it plays");

        await hold(element, layer, playing(asset, "spin", 0, 0.5));
        assert.strictEqual(everyFrameAnimationsOn(graph.scene), 0, "and rests once it is still");
        await element.waitForStableFrame();
    });

    it("draws a single-sided animated glTF facing out, as its still template is drawn", async () => {
        const element = await mount();
        // The cube's material is single-sided, so a face wound backwards is culled; its clip starts
        // at the rest pose, so the clip's first moment draws what the still model draws.
        const { layer, asset } = await drawModel(element, "gltf-animated", [{ id: "a", x: 0 }]);
        const still = await readFrame(element);
        const held = await hold(element, layer, playing(asset, "spin", 0, 0));
        assert.isBelow(
            pixelsChanged(still, held),
            50,
            "the camera-facing sides are drawn, not the far ones from inside",
        );
    });

    it("plays a skinned model's clips, one clip a node, each drawn as its own clip", async () => {
        const element = await mount(600, 300);
        const { graph } = element;
        const { asset } = await drawModel(
            element,
            "gltf-skinned-animated",
            [
                { id: "a", x: -1 },
                { id: "b", x: 1 },
            ],
            { "node.modelAnimation": "turn", "node.modelAnimationSpeed": 0, "node.modelAnimationOffset": 0 },
        );
        graph.zoomToFit();
        const rest = await readFrame(element);
        // Node a holds "turn" half way, node b "tip" half way: different poses of one model.
        const turnLayer = await element.session.styles.add({
            name: "turn",
            target: "node",
            selector: { match: "ids", nodes: ["a"] },
            set: playing(asset, "turn", 0, 0.5),
        });
        await element.session.styles.add({
            name: "tip",
            target: "node",
            selector: { match: "ids", nodes: ["b"] },
            set: playing(asset, "tip", 0, 0.5),
        });
        await operationQueueOf(graph).waitForCompletion();
        const posed = await readFrame(element);
        // Each node's own columns: a turned cube reaches past the middle, so not halves.
        const half = (frame: Frame, side: "left" | "right"): Frame => ({
            ...frame,
            pixels: frame.pixels.map((value, at) => {
                const x = (Math.floor(at / 4) % frame.width) / frame.width;
                return (side === "left" ? x < 0.35 : x > 0.65) ? value : 0;
            }),
        });
        assert.isAbove(pixelsChanged(half(rest, "left"), half(posed, "left")), 100, "a turned by its skeleton");
        assert.isAbove(pixelsChanged(half(rest, "right"), half(posed, "right")), 100, "b tipped by its skeleton");

        // The same clip on both nodes draws them alike, so the two clips above drew differently.
        await element.session.styles.update(turnLayer.id, { set: playing(asset, "tip", 0, 0.5) });
        await operationQueueOf(graph).waitForCompletion();
        const alike = await readFrame(element);
        assert.isAbove(pixelsChanged(half(posed, "left"), half(alike, "left")), 100, "turn and tip differ");
        assert.strictEqual(pixelsChanged(half(posed, "right"), half(alike, "right")), 0, "b is unchanged");
    });

    it("lists a file's clips, and plays one named with nothing else set", async () => {
        const element = await mount();
        const record = await element.session.assets.add({ files: await filesOf("gltf-skinned-animated") });
        assert.deepEqual(
            element.session.assets.inspect(record.id).animations.map((clip) => clip.name),
            ["turn", "tip"],
        );
        const { layer, asset } = await drawModel(element, "gltf-skinned-animated", [{ id: "a", x: 0 }]);
        const still = await readFrame(element);
        const moving = await hold(element, layer, { "node.model": asset, "node.modelAnimation": "turn" });
        assert.isAbove(everyFrameAnimationsOn(element.graph.scene), 0, "the clip plays at the file's speed");
        assert.isAbove(await framesUntilMoved(element, moving), 0, "the picture moves while it plays");
        assert.isAbove(pixelsChanged(still, await readFrame(element, false)), 100, "away from the still pose");
    });

    it("draws a thumbnail in the pose its clip reaches at its start time", async () => {
        const element = await mount();
        const record = await element.session.assets.add({ files: await filesOf("gltf-animated") });
        const shot = (offset: number): Promise<string> =>
            element.modelThumbnail(record.id, {
                size: 64,
                style: { "node.modelAnimation": "spin", "node.modelAnimationOffset": offset },
            });
        const [start, half, again] = [await shot(0), await shot(0.5), await shot(0)];
        assert.notEqual(start, half, "half way through the clip the cube is turned");
        assert.strictEqual(start, again, "the same moment gives the same picture");
    });

    it("names an unknown clip", async () => {
        const element = await mount();
        const { layer, asset } = await drawModel(element, "gltf-animated", [{ id: "a", x: 0 }], {
            "node.modelAnimation": "spin",
            "node.modelAnimationSpeed": 0,
        });
        const unknown = nextModelEvent(element, (change) =>
            change.problems.some((fact) => fact.code === "W_MODEL_ANIMATION_UNKNOWN"),
        );
        await element.session.styles.update(layer, { set: playing(asset, "fly", 0, 0) });
        const fact = (await unknown).problems.find((f) => f.code === "W_MODEL_ANIMATION_UNKNOWN");
        assert.deepEqual(fact?.params, { name: "fly", available: ["spin"] });
    });

    it("plays a clip that moves only a morph target's weight, as Parrot.glb's does", async () => {
        const element = await mount();
        // The clip "grow" takes the cube's one morph target from weight 0 to 1: its faces push out.
        const { layer, asset, problems } = await drawModel(element, "gltf-morph-animated", [{ id: "m", x: 0 }], {
            "node.modelAnimation": "grow",
            "node.modelAnimationSpeed": 0,
            "node.modelAnimationOffset": 0,
        });
        assert.notDeepInclude(problems, { code: "W_MODEL_ANIMATION_PARTIAL", params: { reason: "morph" } });
        const start = await readFrame(element);
        const grown = await hold(element, layer, playing(asset, "grow", 0, 1));
        assert.isAbove(pixelsChanged(start, grown), 100, "at the clip's end the morph target has moved the faces");
        assert.strictEqual(pixelsChanged(start, await hold(element, layer, playing(asset, "grow", 0, 0))), 0);

        const moving = await hold(element, layer, playing(asset, "grow", 1, 0));
        assert.isAbove(everyFrameAnimationsOn(element.graph.scene), 0, "a playing morph clip draws every frame");
        assert.isAbove(await framesUntilMoved(element, moving), 0, "the picture moves while it plays");
    });

    it.each([
        ["fbx-animated", "spin"],
        ["fbx-skinned-animated", "turn"],
        ["fbx-morph-animated", "grow"],
        ["usda-animated", "USD Animation 1"],
        ["usdz-skinned-animated", "USD Animation 1"],
        ["bvh", "BVH Animation"],
    ])("plays %s's clip %s: a held moment is its own pose, and the picture moves while it plays", async (id, clip) => {
        const element = await mount();
        const record = await element.session.assets.add({ files: await filesOf(id) });
        assert.deepEqual(
            element.session.assets.inspect(record.id).animations.map((a) => a.name),
            [clip],
            "the clip is listed by the name that plays it",
        );
        const { layer, asset } = await drawModel(element, id, [{ id: "a", x: 0 }], {
            "node.modelAnimation": clip,
            "node.modelAnimationSpeed": 0,
            "node.modelAnimationOffset": 0,
        });
        const start = await readFrame(element);
        const later = await hold(element, layer, playing(asset, clip, 0, 0.9));
        assert.isAbove(pixelsChanged(start, later), 100, "later in the clip the cube is posed differently");
        assert.strictEqual(pixelsChanged(start, await hold(element, layer, playing(asset, clip, 0, 0))), 0);
        const moving = await hold(element, layer, playing(asset, clip, 1, 0));
        assert.isAbove(everyFrameAnimationsOn(element.graph.scene), 0, "a playing model draws every frame");
        assert.isAbove(await framesUntilMoved(element, moving), 0, "the picture moves while it plays");
    });

    it("draws an FBX file's two skinned parts apart when its clip holds its first moment (ArcherRi01.fbx)", async () => {
        const element = await mount();
        const record = await element.session.assets.add({ files: await filesOf("fbx-skinned-two-parts") });
        assert.strictEqual(record.state, "accepted", JSON.stringify(record.problems));
        // Two cubes side by side, each skinned to the one bone with its own bind matrix: drawn
        // still or at the clip's first moment, they stand apart, two runs of drawn columns.
        for (const style of [{}, { "node.modelAnimation": "turn", "node.modelAnimationOffset": 0 }]) {
            const picture = await element.modelThumbnail(record.id, { size: 96, style });
            assert.strictEqual(await drawnColumnRuns(picture), 2, JSON.stringify(style));
        }
    });
});

/**
 * How many runs of columns hold a drawn pixel: one for each part that stands apart from the others.
 * @param url - The thumbnail.
 * @returns The runs.
 */
async function drawnColumnRuns(url: string): Promise<number> {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    [canvas.width, canvas.height] = [image.width, image.height];
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    context.drawImage(image, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
    let runs = 0;
    let inRun = false;
    for (let x = 0; x < width; x++) {
        let drawn = false;
        for (let y = 0; y < height && !drawn; y++) {
            drawn = data[(y * width + x) * 4 + 3] > 0;
        }
        runs += drawn && !inRun ? 1 : 0;
        inRun = drawn;
    }
    return runs;
}
