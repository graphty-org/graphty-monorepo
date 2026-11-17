/**
 * @file `modelPreview`: one model drawn live in a canvas filling an element of the caller's --
 * drawn with the node's style values, turned by a real drag, playing its clip, redrawn by
 * `update`, refused with the model's own code, and its canvas gone after `dispose`.
 */

import { assert, describe, it } from "vitest";
import { server } from "vitest/browser";

import { isGraphtyError } from "../../../src/errors";
import { sphereGlb } from "../../fixtures/models/fixtures";
import { drag, nextFrame } from "../../helpers/real-input";

/** The drag helper sends real input through CDP, which only Chromium has (WebKit runs the rest). */
const noCdp = server.browser !== "chromium";
import { cleanups, countIn, drawModel, filesOf, type Frame, mount, pixelsChanged, readFrame } from "./helpers";

/**
 * A box on the page, 160 CSS pixels square, for a preview to fill.
 * @returns The box.
 */
function previewBox(): HTMLDivElement {
    const box = document.createElement("div");
    box.style.width = "160px";
    box.style.height = "160px";
    document.body.appendChild(box);
    cleanups.push(() => {
        box.remove();
    });
    return box;
}

/**
 * The preview's picture as it is now, after one more frame.
 * @param canvas - The preview's canvas.
 * @returns The frame.
 */
async function shot(canvas: HTMLCanvasElement): Promise<Frame> {
    await nextFrame();
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
 * How many pixels of a frame are drawn (not transparent).
 * @param frame - The frame.
 * @returns The count.
 */
function drawn(frame: Frame): number {
    let count = 0;
    for (let at = 3; at < frame.pixels.length; at += 4) {
        count += frame.pixels[at] > 0 ? 1 : 0;
    }
    return count;
}

/**
 * Wait, frame by frame, until the preview's picture moves away from a frame.
 * @param canvas - The preview's canvas.
 * @param from - The frame it starts from.
 * @returns The frame that moved.
 */
async function untilMoved(canvas: HTMLCanvasElement, from: Frame): Promise<Frame> {
    for (;;) {
        const now = await shot(canvas);
        if (pixelsChanged(from, now) > 50) {
            return now;
        }
    }
}

/**
 * Wait, frame by frame, until the camera comes to rest after a drag (it glides on a little).
 * @param canvas - The preview's canvas.
 * @returns The frame it rests on.
 */
async function settled(canvas: HTMLCanvasElement): Promise<Frame> {
    let before = await shot(canvas);
    for (;;) {
        const now = await shot(canvas);
        if (pixelsChanged(before, now) === 0) {
            return now;
        }
        before = now;
    }
}

describe("modelPreview", () => {
    it.skipIf(noCdp)(
        "draws a model in the caller's canvas, redraws it with new values, and turns with a drag",
        async () => {
            const element = await mount();
            const files = await filesOf("gltf-animated");
            const cube = await element.session.assets.add({ files });
            assert.equal(cube.state, "accepted", JSON.stringify(cube.problems));
            const box = previewBox();
            const preview = await element.modelPreview(cube.id, box, { style: { "node.modelTint": "replace" } });
            const { canvas } = preview;
            assert.strictEqual(canvas.parentElement, box, "the preview's canvas fills the box");
            assert.strictEqual(canvas.getBoundingClientRect().width, 160);
            cleanups.push(() => {
                preview.dispose();
            });
            const first = await shot(canvas);
            assert.isAbove(drawn(first), 200, "the model is drawn");

            await preview.update({ "node.modelTint": "replace", "node.color": "#ff0000" });
            const red = await shot(canvas);
            assert.isAbove(pixelsChanged(first, red), 200, "the new color is drawn");

            const turned = untilMoved(canvas, red);
            await drag(canvas, { x: 40, y: 80 }, { x: 120, y: 80 });
            await turned;
            // At once, while the camera still glides on from the drag.
            preview.resetView();
            assert.strictEqual(pixelsChanged(red, await shot(canvas)), 0, "resetView goes back to the first view");
            assert.strictEqual(pixelsChanged(red, await shot(canvas)), 0, "and stays there");

            await drag(canvas, { x: 40, y: 80 }, { x: 120, y: 80 });
            const after = await settled(canvas);
            assert.isAbove(pixelsChanged(red, after), 50, "turned again");
            await preview.update({ "node.modelTint": "replace", "node.color": "#ff0000" });
            assert.strictEqual(pixelsChanged(after, await shot(canvas)), 0, "an update keeps the reader's view");
        },
    );

    it("plays the clip node.modelAnimation names, and holds a pose at Speed 0", async () => {
        const element = await mount();
        const cube = await element.session.assets.add({ files: await filesOf("gltf-animated") });
        const preview = await element.modelPreview(cube.id, previewBox(), {
            style: { "node.modelAnimation": "spin", "node.modelAnimationSpeed": 0 },
        });
        const { canvas } = preview;
        cleanups.push(() => {
            preview.dispose();
        });
        const held = await shot(canvas);
        assert.strictEqual(pixelsChanged(held, await shot(canvas)), 0, "a held pose stays put");
        await preview.update({
            "node.modelAnimation": "spin",
            "node.modelAnimationSpeed": 0,
            "node.modelAnimationOffset": 0.5,
        });
        assert.isAbove(pixelsChanged(held, await shot(canvas)), 100, "Start picks the pose");
        await preview.update({ "node.modelAnimation": "spin" });
        await untilMoved(canvas, await shot(canvas));
    });

    it("stops drawing once the picture is still, and draws again when it is turned", async () => {
        const element = await mount();
        const cube = await element.session.assets.add({ files: await filesOf("gltf-animated") });
        const preview = await element.modelPreview(cube.id, previewBox());
        const { canvas } = preview;
        cleanups.push(() => {
            preview.dispose();
        });
        const gl = canvas.getContext("webgl2");
        assert.isNotNull(gl);
        let draws = 0;
        for (const name of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"] as const) {
            const draw = gl[name].bind(gl) as (...args: unknown[]) => void;
            Object.defineProperty(gl, name, {
                value: (...args: unknown[]) => {
                    draws++;
                    draw(...args);
                },
            });
        }
        // A frame goes by with nothing drawn once the model and its pictures are ready: a preview
        // that drew every frame never got here.
        for (let before = -1; before !== draws;) {
            before = draws;
            await nextFrame();
        }
        assert.isAbove(draws, 0, "the model was drawn before it went still");
        if (!noCdp) {
            const still = draws;
            await drag(canvas, { x: 40, y: 80 }, { x: 120, y: 80 });
            while (draws === still) {
                await nextFrame();
            }
        }
    });

    it("refuses what modelThumbnail refuses, with the same code, and leaves no canvas", async () => {
        const element = await mount();
        const box = previewBox();
        const error: unknown = await element.modelPreview("asset:nothing", box).catch((e: unknown) => e);
        assert.isTrue(isGraphtyError(error) && error.code === "E_MODEL_UNKNOWN_ASSET");
        assert.strictEqual(box.childElementCount, 0);
    });

    it("removes its canvas on dispose, and a new preview draws in the same box", async () => {
        const element = await mount();
        const ball = await element.session.assets.add({ files: new Map([["ball.glb", sphereGlb(8, 4)]]) });
        const box = previewBox();
        const preview = await element.modelPreview(ball.id, box);
        preview.dispose();
        preview.dispose();
        assert.strictEqual(box.childElementCount, 0);
        await preview.update({ "node.color": "#00ff00" });
        const again = await element.modelPreview(ball.id, box);
        cleanups.push(() => {
            again.dispose();
        });
        assert.isAbove(drawn(await shot(again.canvas)), 100, "drawn again");
    });
    it("leaves the graph drawing its own models while a preview is open, and after it closes", async () => {
        const element = await mount();
        const files = await filesOf("obj-alone");
        const cube = await element.session.assets.add({ files });
        const preview = await element.modelPreview(cube.id, previewBox());
        const red = (r: number, g: number, b: number): boolean => r > 120 && g < 60 && b < 60;
        const { layer, asset } = await drawModel(element, files, [{ id: "a", x: 0 }], { "node.color": "#ff0000" });
        const open = countIn(await readFrame(element), red);
        assert.isAbove(open.left + open.right, 500, "the graph draws the model while the preview is open");
        preview.dispose();
        await element.session.styles.update(layer, {
            set: { "node.model": asset, "node.color": "#ff0000", "node.modelTurn": 0.1 },
        });
        const closed = countIn(await readFrame(element), red);
        assert.isAbove(closed.left + closed.right, 500, "and after it closes");
    });
    it.skipIf(noCdp)("goes back to the first view after a right-button drag", async () => {
        const element = await mount();
        const ball = await element.session.assets.add({ files: new Map([["ball.glb", sphereGlb(8, 4)]]) });
        const preview = await element.modelPreview(ball.id, previewBox(), { style: { "node.modelTurn": 30 } });
        cleanups.push(() => {
            preview.dispose();
        });
        const first = await shot(preview.canvas);
        await drag(preview.canvas, { x: 40, y: 80 }, { x: 120, y: 120 }, 8, undefined, undefined, "right");
        await settled(preview.canvas);
        preview.resetView();
        assert.strictEqual(pixelsChanged(first, await shot(preview.canvas)), 0, "centered as at first");
    });

    it("draws preview after preview without using up the browser's drawing contexts", async () => {
        const element = await mount();
        const ball = await element.session.assets.add({ files: new Map([["ball.glb", sphereGlb(8, 4)]]) });
        const box = previewBox();
        const canvases = new Set<HTMLCanvasElement>();
        for (let round = 0; round < 20; round++) {
            const preview = await element.modelPreview(ball.id, box);
            canvases.add(preview.canvas);
            preview.dispose();
        }
        assert.isAtMost(canvases.size, 2, "a closed preview's canvas is used again");
        const graphCanvas = element.graph.engine.getRenderingCanvas();
        const gl = graphCanvas?.getContext("webgl2") ?? graphCanvas?.getContext("webgl");
        assert.isFalse(gl?.isContextLost() ?? true, "the graph keeps its own context");
        const again = await element.modelPreview(ball.id, box);
        cleanups.push(() => {
            again.dispose();
        });
        assert.isAbove(drawn(await shot(again.canvas)), 100, "and the next preview draws");
    });
    it("draws the picture node.texture names on the model", async () => {
        const element = await mount();
        const ball = await element.session.assets.add({ files: new Map([["ball.glb", sphereGlb(8, 4)]]) });
        const paint = new OffscreenCanvas(8, 8);
        const context = paint.getContext("2d");
        assert.isNotNull(context);
        context.fillStyle = "#00ff00";
        context.fillRect(0, 0, 8, 8);
        const png = new Uint8Array(await (await paint.convertToBlob({ type: "image/png" })).arrayBuffer());
        const picture = await element.session.assets.add({ files: new Map([["green.png", png]]) });
        assert.strictEqual(picture.kind, "image");
        const preview = await element.modelPreview(ball.id, previewBox());
        cleanups.push(() => {
            preview.dispose();
        });
        const green = (frame: Frame): number => {
            let count = 0;
            for (let at = 0; at < frame.pixels.length; at += 4) {
                const [r, g, b] = [frame.pixels[at], frame.pixels[at + 1], frame.pixels[at + 2]];
                count += g > 100 && r < 60 && b < 60 ? 1 : 0;
            }
            return count;
        };
        assert.strictEqual(green(await shot(preview.canvas)), 0, "its own color first");
        await preview.update({ "node.texture": picture.id });
        assert.isAbove(green(await shot(preview.canvas)), 200, "then the picture");
    });
});
