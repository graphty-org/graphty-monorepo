/**
 * @file The lit-surface presets drawn by a real element (design/rendering/shader-styles.md
 * section 8, package P1): each compiles and draws on the impostor batch (a sphere) and the mesh
 * path (a box) over the color beneath it; every parameter at each end of its range draws without
 * a NaN; motion is honored (a still preset asks for no frame, liquid metal moves and rests at speed
 * 0); and liquid metal, the one that moves, never flashes more than three times a second at its
 * fastest, filling the canvas.
 *
 * Each case leaves a PNG under tmp/lit-surfaces/ for a person to look at.
 */

import { afterEach, assert, describe, it } from "vitest";
import { commands } from "vitest/browser";

import { registerShader, shaderDescriptor } from "../../../../src/catalog/shaderRegistry";
import type { ShaderDescriptor, ShaderParams } from "../../../../src/catalog/shaders";
import { everyFrameAnimationsOn } from "../../../../src/managers/everyFrameAnimations";
import { FLASH_GRID, FlashCounter } from "../../../../src/managers/ShaderGuard";
import { shadersControllerOf } from "../../../../src/session/shaders";
import type { LazyShaderHost } from "../../../../src/shaders/chunk";
import { LIT_SURFACE_PRESETS, presetId } from "../../../../stories/shaders/litSurfacePresets";
import { drawnFrames } from "../../../helpers/drawn-frames";
import { canvasPixels, compileErrors, type LitScene, mountLitScene, nanProbe, pngOf, WIDTH } from "./lit-surface-scene";

/** Which Chromium flag set the run asked for; empty when it asked for none (no WebGPU). */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

const scenes: LitScene[] = [];

afterEach(() => {
    for (const scene of scenes.splice(0)) {
        scene.dispose();
    }
});

/**
 * Mount a scene and remember to dispose of it.
 * @param shader - The shader the layer names.
 * @param options - As {@link mountLitScene}.
 * @returns The scene.
 */
async function mounted(shader: string, options?: Parameters<typeof mountLitScene>[1]): Promise<LitScene> {
    const scene = await mountLitScene(shader, options);
    scenes.push(scene);
    return scene;
}

/**
 * The probing twin of a preset, registered once: the same descriptor, its body wrapped by
 * {@link nanProbe}.
 * @param descriptor - The preset's descriptor.
 * @param body - Its body.
 * @returns The twin's id.
 */
function probeOf(descriptor: ShaderDescriptor, body: string): string {
    const id = `nan-probe/${descriptor.id}`;
    if (shaderDescriptor(id) === undefined) {
        const { origin: _origin, ...facts } = descriptor;
        registerShader({ descriptor: { ...facts, id }, glsl: nanProbe(body) });
    }

    return id;
}

/**
 * The parameter sets that put every parameter at each end of its range: each one alone at its
 * minimum and at its maximum, then all at their minimums and all at their maximums.
 * @param descriptor - The preset.
 * @returns The sets, with a name each.
 */
function rangeEnds(descriptor: ShaderDescriptor): [string, ShaderParams][] {
    const ranged = descriptor.params.filter((param) => typeof param.min === "number" && typeof param.max === "number");
    const end = (which: "min" | "max"): ShaderParams =>
        Object.fromEntries(ranged.map((param) => [param.name, param[which] as number]));
    return [
        ...ranged.flatMap((param): [string, ShaderParams][] => [
            [`${param.name}-min`, { [param.name]: param.min as number }],
            [`${param.name}-max`, { [param.name]: param.max as number }],
        ]),
        ["all-min", end("min")],
        ["all-max", end("max")],
    ];
}

/**
 * How many pixels of a canvas are the probe's magenta.
 * @param rgba - The pixels.
 * @returns The count.
 */
function magentaPixels(rgba: Uint8Array): number {
    let count = 0;
    for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i] >= 250 && rgba[i + 1] <= 5 && rgba[i + 2] >= 250) {
            count++;
        }
    }

    return count;
}

const cases = LIT_SURFACE_PRESETS.map((preset) => [preset.descriptor.id, preset] as const);

describe("the lit-surface presets on a real element", () => {
    it.each(cases)("%s draws on the impostor batch and the mesh path with no compile error", async (id) => {
        const { element } = await mounted(presetId(id));
        assert.deepEqual(compileErrors(element), []);
        const pixels = await canvasPixels(element);
        await commands.writeFile(`tmp/lit-surfaces/${id}.png`, await pngOf(pixels), "base64");

        // Both nodes are drawn in something other than the page's background.
        const { width, height, rgba } = pixels;
        const at = (x: number, y: number): number[] => [...rgba.subarray((y * width + x) * 4, (y * width + x) * 4 + 3)];
        const background = at(2, 2);
        const centerOf = (node: string): number[] => {
            const mesh = element.graph.getNode(node)?.mesh;
            assert.isDefined(mesh, `the graph holds ${node}`);
            const point = element.worldToScreen(mesh.getAbsolutePosition());
            const scale = width / WIDTH;
            return at(Math.round(point.x * scale), Math.round(height - 1 - point.y * scale));
        };
        const sphere = centerOf("sphere");
        const box = centerOf("box");
        assert.notDeepEqual(sphere, background, "the sphere is drawn");
        assert.notDeepEqual(box, background, "the box is drawn");
    });

    it.each(cases)("%s fills a close view of one sphere with no compile error", async (id) => {
        const { element } = await mounted(presetId(id), { size: 5, only: true });
        assert.deepEqual(compileErrors(element), []);
        const pixels = await canvasPixels(element);
        await commands.writeFile(`tmp/lit-surfaces/${id}-close.png`, await pngOf(pixels), "base64");
        const { width, height, rgba } = pixels;
        const center = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
        assert.notDeepEqual([...rgba.subarray(center, center + 3)], [...rgba.subarray(0, 3)], "the sphere is drawn");
    });

    // Only where the run has a WebGPU adapter (GRAPHTY_BROWSER_GPU); each preset declares
    // webgpu "translate", so it must compile there through the element's own translation.
    it.skipIf(ADAPTER === "").each(cases)("%s compiles and draws on the WebGPU renderer", async (id) => {
        const { element } = await mounted(presetId(id), { size: 5, only: true, renderer: "webgpu" });
        assert.strictEqual(element.rendererStatus?.active, "webgpu", "the graph draws with WebGPU");
        assert.deepEqual(compileErrors(element), []);
        const pixels = await canvasPixels(element);
        await commands.writeFile(`tmp/lit-surfaces/${id}-webgpu.png`, await pngOf(pixels), "base64");
        const { width, height, rgba } = pixels;
        const center = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
        assert.notDeepEqual([...rgba.subarray(center, center + 3)], [...rgba.subarray(0, 3)], "the sphere is drawn");
    });

    it.each(cases)("%s draws every parameter at each end of its range without a NaN", async (id, preset) => {
        const probe = probeOf(preset.descriptor, preset.body);
        const { element, layer } = await mounted(probe);
        assert.deepEqual(compileErrors(element), []);
        for (const [name, params] of rangeEnds(preset.descriptor)) {
            await element.session.styles.update(layer, {
                set: { "node.shaders": [{ shader: probe, params: params }] },
            });
            await element.session.styles.settled();
            const { rgba } = await canvasPixels(element);
            assert.strictEqual(magentaPixels(rgba), 0, `${id} at ${name} draws a NaN or an infinity`);
        }
    });

    it.each(cases)("%s honors its motion", async (id, preset) => {
        const { element, layer } = await mounted(presetId(id));
        const scene = element.graph.getScene();
        await drawnFrames(scene, 3);
        const speed = preset.descriptor.motion.loop?.speedParam;
        if (speed === undefined) {
            assert.strictEqual(everyFrameAnimationsOn(scene), 0, "a still preset asks for no frame");
            return;
        }

        assert.isAbove(everyFrameAnimationsOn(scene), 0, "a moving preset keeps the frames coming");
        const shader = presetId(id);
        await element.session.styles.update(layer, {
            set: { "node.shaders": [{ shader: shader, params: { [speed]: 0 } }] },
        });
        await element.session.styles.settled();
        await drawnFrames(scene, 3);
        assert.strictEqual(everyFrameAnimationsOn(scene), 0, "at speed 0 it rests");
    });

    it("liquid metal at its fastest, filling the canvas, flashes at most three times a second", async () => {
        const preset = LIT_SURFACE_PRESETS.find((candidate) => candidate.descriptor.id === "liquid-metal");
        assert.isDefined(preset);
        const shader = presetId("liquid-metal");
        const fastest = Object.fromEntries(
            preset.descriptor.params.map((param) => [param.name, param.max as number]),
        ) as ShaderParams;
        const { element } = await mounted(shader, { params: fastest, size: 60, only: true });
        const host = shadersControllerOf(element.session)?.host as LazyShaderHost | null | undefined;
        const uniforms = host?.loaded?.uniforms;
        assert.isDefined(uniforms, "the shader runtime is loaded");

        // The scene's time, stepped at 60 frames a second for four seconds, written after the
        // runtime's own per-frame write so every frame draws the time this test chose.
        const scene = element.graph.getScene();
        let time = 0;
        const observer = scene.onBeforeRenderObservable.add(() => {
            uniforms.write(time);
        });
        try {
            const counter = new FlashCounter();
            let flashing = 0;
            for (let frame = 0; frame < 240; frame++) {
                time = frame / 60;
                const { width, height, rgba } = await canvasPixels(element);
                if (counter.add(downsample(rgba, width, height), time * 1000)) {
                    flashing++;
                }
            }

            assert.strictEqual(flashing, 0, "no area of the canvas flashed more than three times a second");
        } finally {
            scene.onBeforeRenderObservable.remove(observer);
        }
    });
});

/**
 * The canvas averaged down to the flashing check's grid.
 * @param rgba - The canvas pixels.
 * @param width - Its width.
 * @param height - Its height.
 * @returns The grid of FLASH_GRID x FLASH_GRID RGBA pixels.
 */
function downsample(rgba: Uint8Array, width: number, height: number): Uint8Array {
    const out = new Uint8Array(FLASH_GRID * FLASH_GRID * 4);
    for (let gy = 0; gy < FLASH_GRID; gy++) {
        for (let gx = 0; gx < FLASH_GRID; gx++) {
            const sums = [0, 0, 0, 0];
            let count = 0;
            for (
                let y = Math.floor((gy * height) / FLASH_GRID);
                y < Math.floor(((gy + 1) * height) / FLASH_GRID);
                y++
            ) {
                for (
                    let x = Math.floor((gx * width) / FLASH_GRID);
                    x < Math.floor(((gx + 1) * width) / FLASH_GRID);
                    x++
                ) {
                    const at = (y * width + x) * 4;
                    for (let c = 0; c < 4; c++) {
                        sums[c] += rgba[at + c];
                    }

                    count++;
                }
            }

            for (let c = 0; c < 4; c++) {
                out[(gy * FLASH_GRID + gx) * 4 + c] = Math.round(sums[c] / Math.max(count, 1));
            }
        }
    }

    return out;
}
