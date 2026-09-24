/**
 * The per-instance colour the style engine's mesh key depends on.
 *
 * WHY THIS TEST EXISTS. `StyleInterner` deliberately leaves colour out of a source mesh's key, so
 * a continuous colour encoding over fifty thousand nodes needs ONE source mesh. That is only true
 * if the renderer can actually paint two instances of one source mesh in two colours -- and the
 * mechanism it uses, Babylon's instanced `color` buffer, is a shader define on a material the
 * mesh cache builds and FREEZES. A frozen material has stopped re-evaluating its defines, so
 * registering the buffer behind the freeze compiles nothing and every node draws in the source
 * material's own colour, silently and only on screen.
 *
 * So this reads pixels. There is no unit-testable proxy for "the shader recompiled".
 */

import {
    ArcRotateCamera,
    Color4,
    Engine,
    HemisphericLight,
    type InstancedMesh,
    Scene,
    Vector3,
} from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { MeshCache } from "../../src/meshes/MeshCache";
import { NodeMesh } from "../../src/meshes/NodeMesh";

/** How wide the offscreen canvas is. Small: this reads a handful of pixels, not a picture. */
const WIDTH = 200;

/** How tall the offscreen canvas is. */
const HEIGHT = 100;

/** How many frames to render before reading. Babylon compiles a shader asynchronously. */
const FRAMES = 60;

/** How long to wait between frames so the shader compilation the first frame started can land. */
const FRAME_MS = 10;

/** The channel value above which a sampled pixel counts as carrying that colour. */
const STRONG = 100;

/** The channel value below which a sampled pixel counts as NOT carrying that colour. */
const WEAK = 60;

describe("node instance colour", () => {
    let canvas: HTMLCanvasElement;
    let engine: Engine;
    let scene: Scene;
    let cache: MeshCache;

    beforeEach(() => {
        canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        document.body.appendChild(canvas);

        engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
        scene = new Scene(engine);
        scene.clearColor = new Color4(0, 0, 0, 1);
        const camera = new ArcRotateCamera("probe", -Math.PI / 2, Math.PI / 2, 12, Vector3.Zero(), scene);
        camera.attachControl(canvas, false);
        new HemisphericLight("probe-light", new Vector3(0, 1, 0), scene);
        cache = new MeshCache();
    });

    afterEach(() => {
        cache.clear();
        scene.dispose();
        engine.dispose();
        canvas.remove();
    });

    /**
     * Draw one node of the neutral style the session painter produces.
     * @param at - Where along x to put it.
     * @param color - The colour to write into the instance.
     * @returns The instance.
     */
    function placeNode(at: number, color: Color4): InstancedMesh {
        const mesh = NodeMesh.create(
            cache,
            { styleId: "s1", is2D: false, size: 3 },
            // Exactly what StylePainter builds: a neutral material, so what shows is the
            // instance's own colour.
            { shape: { type: "box", size: 3 }, texture: { color: "#FFFFFF" } },
            scene,
        ) as InstancedMesh;

        // The cache parks its source mesh far below the scene and an instance is born where its
        // source stands, so a position is not optional here -- in the element the layout writes
        // one every frame.
        mesh.position.set(at, 0, 0);

        const source = mesh.sourceMesh;

        if (source.instancedBuffers?.color === undefined) {
            source.material?.unfreeze();
            source.registerInstancedBuffer("color", 4);
            source.instancedBuffers.color = new Color4(1, 1, 1, 1);
        }

        mesh.instancedBuffers.color = color;

        return mesh;
    }

    /**
     * Render until the shaders are compiled, then read the frame.
     * @returns The pixels, four bytes per pixel, bottom row first.
     */
    async function readFrame(): Promise<Uint8Array> {
        for (let frame = 0; frame < FRAMES; frame++) {
            scene.render();
            await new Promise<void>((done) => {
                setTimeout(done, FRAME_MS);
            });
        }

        const pixels = await engine.readPixels(0, 0, WIDTH, HEIGHT);

        return pixels as unknown as Uint8Array;
    }

    /**
     * The brightest pixel in one half of the frame, which is the node drawn there.
     * @param pixels - The frame.
     * @param half - Which half to look in.
     * @returns The three channels of the brightest pixel.
     */
    function brightest(pixels: Uint8Array, half: "left" | "right"): { r: number; g: number; b: number } {
        const from = half === "left" ? 0 : WIDTH / 2;
        const to = half === "left" ? WIDTH / 2 : WIDTH;
        let best = { r: 0, g: 0, b: 0 };

        for (let y = 0; y < HEIGHT; y++) {
            for (let x = from; x < to; x++) {
                const at = (y * WIDTH + x) * 4;
                const pixel = { r: pixels[at], g: pixels[at + 1], b: pixels[at + 2] };

                if (pixel.r + pixel.g + pixel.b > best.r + best.g + best.b) {
                    best = pixel;
                }
            }
        }

        return best;
    }

    test("two nodes of ONE source mesh are drawn in two colours", async () => {
        placeNode(-3.5, new Color4(1, 0, 0, 1));
        placeNode(3.5, new Color4(0, 0, 1, 1));

        assert.strictEqual(cache.size(), 1, "colour must not mint a second source mesh");

        const pixels = await readFrame();
        const left = brightest(pixels, "left");
        const right = brightest(pixels, "right");

        assert.isAbove(left.r, STRONG, `the left node should be red, read ${JSON.stringify(left)}`);
        assert.isBelow(left.b, WEAK, `the left node should carry no blue, read ${JSON.stringify(left)}`);
        assert.isAbove(right.b, STRONG, `the right node should be blue, read ${JSON.stringify(right)}`);
        assert.isBelow(right.r, WEAK, `the right node should carry no red, read ${JSON.stringify(right)}`);
    });
});
