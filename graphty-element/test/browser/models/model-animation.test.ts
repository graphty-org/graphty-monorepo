/**
 * Model nodes playing their file's clips: a playing model draws a new picture as time passes, a
 * held pose is drawn where the clip puts it and stays put, two nodes play two clips of one file, a
 * skinned and a rigid model both animate, an unknown clip and a morph target's clip are reported,
 * and a model keeps the frame loop going only while it plays. Also how a model is fitted to its node
 * (`node.modelFit`) and whether the backs of its faces are drawn (`node.modelDoubleSided`), on an open,
 * non-cubic model: one wide, single-sided triangle.
 */

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { everyFrameAnimationsOn } from "../../../src/managers/everyFrameAnimations";
import { glb } from "../../fixtures/models/fixtures";
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

    it("names an unknown clip and says a morph target's clip holds its rest pose", async () => {
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

        const morph = await mount();
        const { problems } = await drawModel(morph, "gltf-morph-animated", [{ id: "m", x: 0 }], {
            "node.modelAnimation": "grow",
            "node.modelAnimationSpeed": 0,
        });
        assert.deepInclude(problems, { code: "W_MODEL_ANIMATION_PARTIAL", params: { reason: "morph" } });
    });
});

/**
 * One triangle twice as wide as it is tall, leaning back: an open model with no two extents equal.
 * @param doubleSided - Whether its material asks for both faces to be drawn; single-sided unless asked.
 * @returns The model's files.
 */
function wideTriangle(doubleSided = false): Map<string, Uint8Array> {
    const positions = new Float32Array([0, 0, 0, 2, 0, 0, 0, 1, 0.5]);
    const json = {
        asset: { version: "2.0" },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
        materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] }, doubleSided }],
        accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [2, 1, 0.5] }],
        bufferViews: [{ buffer: 0, byteLength: positions.byteLength }],
        buffers: [{ byteLength: positions.byteLength }],
    };
    return new Map([["wide.glb", glb(json, new Uint8Array(positions.buffer))]]);
}

/**
 * Turn the camera half round its target and read the final picture.
 * @param element - The element.
 * @returns The frame.
 */
async function fromBehind(element: Graphty): Promise<Frame> {
    const { graph } = element;
    const state = graph.getCameraState();
    const target = state.target ?? { x: 0, y: 0, z: 0 };
    const position = state.position ?? { x: 0, y: 0, z: -1 };
    await graph.setCameraState({
        position: { x: 2 * target.x - position.x, y: position.y, z: 2 * target.z - position.z },
        target,
    });
    return readFrame(element);
}

describe("model fit and sides", () => {
    it("draws a wide model stretched to its node, and the backs of its faces when asked", async () => {
        const element = await mount();
        await element.setViewMode("3d");
        const { layer, asset } = await drawModel(element, wideTriangle(), [{ id: "a", x: 0 }]);
        const contained = await readFrame(element);
        const stretched = await hold(element, layer, { "node.model": asset, "node.modelFit": "stretch" });
        assert.isAbove(
            pixelsChanged(contained, stretched),
            100,
            "stretch fills the node's box, contain keeps the shape",
        );

        // From one side or the other the single-sided triangle shows its back, which only "true" draws.
        const fileFront = await hold(element, layer, { "node.model": asset, "node.modelDoubleSided": "file" });
        const bothFront = await hold(element, layer, { "node.model": asset, "node.modelDoubleSided": "true" });
        const bothBack = await fromBehind(element);
        const fileBack = await hold(element, layer, { "node.model": asset, "node.modelDoubleSided": "file" });
        const front = pixelsChanged(fileFront, bothFront);
        const back = pixelsChanged(fileBack, bothBack);
        assert.isAbove(
            Math.max(front, back),
            100,
            `two sides draw the back of the face: ${JSON.stringify({ front, back })}`,
        );
    });

    it("draws every up axis, the file's origin as the pivot, and only the fronts when false", async () => {
        const element = await mount();
        await element.setViewMode("3d");
        // both faces drawn, so the triangle shows however it is turned
        const { layer, asset } = await drawModel(element, wideTriangle(true), [{ id: "a", x: 0 }], {
            "node.modelDoubleSided": "true",
        });
        const turned = async (set: Record<string, unknown>): Promise<Frame> =>
            hold(element, layer, { "node.model": asset, "node.modelDoubleSided": "true", ...set });
        const detected = await turned({});
        // glTF is Y up by its specification, so "y" is what "detected" draws: it is measured against "-y"
        const upsideDown = await turned({ "node.modelSourceUp": "-y" });
        for (const up of ["-x", "x", "-y", "y", "-z", "z"]) {
            const against = up === "y" ? upsideDown : detected;
            const changed = pixelsChanged(against, await turned({ "node.modelSourceUp": up }));
            assert.isAbove(changed, 100, `up axis ${up} turns the model (${String(changed)} pixels changed)`);
        }

        const origin = pixelsChanged(detected, await turned({ "node.modelCenter": "origin" }));
        assert.isAbove(origin, 100, `the file's origin as the pivot moves the model (${String(origin)} pixels)`);

        // The file asks for both faces; "false" draws only the front, so from one side or the other its back is gone.
        const fileFront = await hold(element, layer, { "node.model": asset, "node.modelDoubleSided": "file" });
        const frontOnlyFront = await hold(element, layer, { "node.model": asset, "node.modelDoubleSided": "false" });
        const frontOnlyBack = await fromBehind(element);
        const fileBack = await hold(element, layer, { "node.model": asset, "node.modelDoubleSided": "file" });
        const front = pixelsChanged(fileFront, frontOnlyFront);
        const back = pixelsChanged(fileBack, frontOnlyBack);
        assert.isAbove(
            Math.max(front, back),
            100,
            `false hides the back the file draws: ${JSON.stringify({ front, back })}`,
        );
    });
});
