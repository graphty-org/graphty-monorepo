/**
 * @file The shader quality levels and the frame guard in a real element and its real render loop
 * (design/rendering/shader-styles.md section 5, package E4): GPU-bound slow frames step quality
 * down, CPU-bound ones change nothing, one very long frame turns pasted shaders off, `guard: false`
 * changes nothing, reduced motion draws shaders still, a flashing pasted shader is frozen, the
 * effect square follows the level's cap, and a heavy surface draws its cheap program when its
 * nodes are small.
 *
 * A slow GPU is simulated at the one place the loop learns about the GPU: the WebGL 2 fence after
 * each frame. `fenceSync` and `getSyncParameter` are wrapped so a fence reads unsignalled until a
 * set time after it was made, which is exactly what a GPU that takes that long to finish a frame
 * looks like to the loop. Slow CPU work is a busy wait inside the frame.
 */

import "../../../src/graphty-element";

import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting, registerShader } from "../../../src/catalog/shaderRegistry";
import type { LayerSpec } from "../../../src/catalog/types";
import { operationQueueOf } from "../../../src/Graph";
import { everyFrameAnimationsOn } from "../../../src/managers/everyFrameAnimations";
import type { RenderManager } from "../../../src/managers/RenderManager";
import { NodeShaderDrawing } from "../../../src/meshes/NodeShaderDrawing";
import { type RenderQualityChange, shadersControllerOf } from "../../../src/session/shaders";
import type { LazyShaderHost } from "../../../src/shaders/chunk";
import { defineShader } from "../../../src/simple/defineShader";
import { sha256Hex } from "../../../src/utils/sha256";
import { drawnFrames } from "../../helpers/drawn-frames";

const WIDTH = 400;
const HEIGHT = 300;

/** A pasted sprite that does not move, declared heavy. */
const PASTED = `/* graphty-shader 1
{ "id": "user/plate", "name": "Plate", "place": "replace", "cost": "heavy" }
*/
vec4 shade(NodeInput n) {
    return vec4(n.color.rgb, 1.0);
}
`;

/**
 * A pasted sprite that flashes between black and white.
 * @param hz - Flashes a second.
 * @returns Its text.
 */
function strobe(hz: number): string {
    return `/* graphty-shader 1
{ "id": "user/strobe-${String(hz)}", "name": "Strobe", "place": "replace", "motion": "loop" }
*/
vec4 shade(NodeInput n) {
    float on = step(0.5, fract(n.time * ${hz.toFixed(1)}));
    return vec4(vec3(on), 1.0);
}
`;
}

const cleanups: (() => void)[] = [];

beforeAll(() => {
    defineShader({
        id: "e4/spin",
        place: "replace",
        motion: "loop",
        glsl: "vec4 shade(NodeInput n) { return vec4(vec3(fract(n.time)), 1.0); }",
    });
    defineShader({
        id: "e4/ring",
        place: "around",
        reach: 4,
        glsl: `vec4 shade(NodeInput n) {
            float d = length(n.uv);
            return d > 2.5 && d < 3.5 ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(0.0);
        }`,
    });
    // Enough work per pixel that SwiftShader takes well over 50 ms a frame on a canvas this size.
    defineShader({
        id: "e4/slow",
        place: "replace",
        motion: "loop",
        glsl: `vec4 shade(NodeInput n) {
            float v = n.time;
            for (int i = 0; i < 64; i++) {
                for (int j = 0; j < 16; j++) {
                    v = fract(sin(v + 1.7) * 43.5);
                }
            }
            return vec4(vec3(v), 1.0);
        }`,
    });
    registerShader({
        descriptor: { id: "e4/heavy", plainName: "Heavy", params: [] },
        glsl: "vec4 shade(NodeInput n) { return vec4(n.normal * 0.5 + 0.5, 1.0); }",
        lowDetail: "vec4 shade(NodeInput n) { return vec4(n.color.rgb, 1.0); }",
    });
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element drawing in 2D, nodes at fixed places, one layer over every node.
 * @param nodes - The nodes.
 * @param set - What the layer sets.
 * @param options - Options.
 * @param options.onDemand - Whether it draws on demand (default true).
 * @param options.before - Called on the element before it is attached.
 * @returns The element.
 */
async function mounted(
    nodes: readonly { id: string; x: number; y: number }[],
    set: LayerSpec["set"],
    options: { onDemand?: boolean; before?: (element: Graphty) => void } = {},
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderOnDemand = options.onDemand ?? true;
    options.before?.(element);
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    element.shaderSettings = { quality: "high", ...element.shaderSettings };
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(nodes.map(({ id, x, y }) => ({ id, position: { x, y, z: 0 } })));
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await element.session.styles.add({ name: "Shaded", target: "node", selector: { match: "everything" }, set });
    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/**
 * The id of the layer {@link mounted} added.
 * @param element - The element.
 * @returns The id.
 */
function shadedLayer(element: Graphty): string {
    const layer = element.session.styles.list().find((each) => each.name === "Shaded");
    assert.isDefined(layer);
    return layer.id;
}

/**
 * Wait until a condition holds, counting drawn frames; fail after a bound.
 * @param element - The element.
 * @param what - What is awaited, for the failure.
 * @param holds - The condition.
 */
async function until(element: Graphty, what: string, holds: () => boolean): Promise<void> {
    const scene = element.graph.getScene();
    for (let i = 0; i < 900 && !holds(); i++) {
        await drawnFrames(scene, 1);
    }

    assert.isTrue(holds(), what);
}

/**
 * The element's render manager.
 * @param element - The element.
 * @returns It.
 */
function renderManagerOf(element: Graphty): RenderManager {
    return (element.graph as unknown as { renderManager: RenderManager }).renderManager;
}

/**
 * The element's shader host, its runtime loaded.
 * @param element - The element.
 * @returns The host.
 */
function hostOf(element: Graphty): LazyShaderHost {
    const host = shadersControllerOf(element.session)?.host as LazyShaderHost | null | undefined;
    assert.ok(host);
    return host;
}

/**
 * Make every fence the element's GL context makes read unsignalled for a while after it was made,
 * as a GPU that takes that long per frame does.
 * @param element - The element.
 * @param gpuMs - How long each frame keeps the GPU busy; a function so a test can change it.
 * @returns Puts the context's own functions back.
 */
function slowGpu(element: Graphty, gpuMs: () => number): () => void {
    const gl = (element.graph.engine as unknown as { _gl: WebGL2RenderingContext })._gl;
    const { fenceSync, getSyncParameter } = gl;
    const made = new WeakMap<WebGLSync, number>();
    gl.fenceSync = (condition, flags) => {
        const fence = fenceSync.call(gl, condition, flags);
        if (fence !== null) {
            made.set(fence, performance.now() + gpuMs());
        }

        return fence;
    };
    gl.getSyncParameter = (sync, pname) => {
        const ready = made.get(sync);
        if (pname === gl.SYNC_STATUS && ready !== undefined) {
            return performance.now() < ready ? gl.UNSIGNALED : gl.SIGNALED;
        }

        return getSyncParameter.call(gl, sync, pname) as unknown;
    };
    const restore = (): void => {
        gl.fenceSync = fenceSync;
        gl.getSyncParameter = getSyncParameter;
    };
    cleanups.unshift(restore);
    return restore;
}

/**
 * Collect the element's render-quality events.
 * @param element - The element.
 * @returns The details, as they arrive.
 */
function qualityEvents(element: Graphty): RenderQualityChange[] {
    const seen: RenderQualityChange[] = [];
    element.addEventListener("graphty-render-quality", (event) => {
        seen.push((event as CustomEvent<RenderQualityChange>).detail);
    });
    return seen;
}

describe("the frame guard", () => {
    it("steps quality down on GPU-bound 80 ms frames and fires graphty-render-quality", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }], { "node.shaders": [{ shader: "e4/spin" }] });
        const scene = element.graph.getScene();
        await until(element, "the loop sprite holds its frame claim", () => everyFrameAnimationsOn(scene) > 0);
        const seen = qualityEvents(element);
        slowGpu(element, () => 80);

        await until(element, "the guard stepped down", () => seen.length > 0);
        assert.strictEqual(seen[0].code, "guard.slow-gpu");
        assert.strictEqual(seen[0].from.level, "high");
        assert.strictEqual(seen[0].to.level, "medium");
        assert.strictEqual(element.renderQuality.level, "medium");
        assert.strictEqual(element.renderQuality.code, "guard.slow-gpu");
        assert.strictEqual(hostOf(element).loaded?.uniforms.effectCap, 256, "the effect cap follows the level");
    });

    it("steps quality down when a heavy shader really keeps the GPU behind, with no fence simulated", async () => {
        // Three sprites drawn over one another: each frame shades the canvas about three times
        // over, with almost none of it on the CPU. How long that takes is the machine's: over the
        // slow-frame line (50 ms) the guard steps the quality down, over the long-frame line
        // (250 ms, a slower software rasterizer) it steps heavy shaders off. Either is the GPU
        // really being behind; which one depends on the runner, not on the guard.
        const element = await mounted(
            [
                { id: "a", x: 0, y: 0 },
                { id: "b", x: 0.1, y: 0 },
                { id: "c", x: 0, y: 0.1 },
            ],
            { "node.shaders": [{ shader: "e4/slow" }], "node.size": 40 },
        );
        const scene = element.graph.getScene();
        await until(element, "the heavy sprite holds its frame claim", () => everyFrameAnimationsOn(scene) > 0);
        const seen = qualityEvents(element);
        const starts: number[] = [];
        const timing = scene.onBeforeRenderObservable.add(() => starts.push(performance.now()));
        cleanups.unshift(() => {
            scene.onBeforeRenderObservable.remove(timing);
        });
        await until(element, "the guard stepped down", () => seen.length > 0 || starts.length > 40);
        const gaps = starts.slice(1).map((at, i) => Math.round(at - starts[i]));
        assert.isAbove(seen.length, 0, `frame intervals ${gaps.join(" ")}`);
        assert.oneOf(seen[0].code, ["guard.slow-gpu", "guard.long-frame"]);
        if (seen[0].code === "guard.slow-gpu") {
            assert.strictEqual(element.renderQuality.level, "medium");
        } else {
            assert.strictEqual(element.renderQuality.heavy, "off");
        }
    });

    it("changes nothing for CPU-bound slow frames", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }], { "node.shaders": [{ shader: "e4/spin" }] });
        const scene = element.graph.getScene();
        await until(element, "the loop sprite holds its frame claim", () => everyFrameAnimationsOn(scene) > 0);
        const seen = qualityEvents(element);
        // The GPU keeps up; each frame's update keeps the CPU 80 ms, as a 10,000-node layout's
        // step does.
        slowGpu(element, () => 0);
        const busy = scene.onBeforeRenderObservable.add(() => {
            const end = performance.now() + 80;
            while (performance.now() < end) {
                // the layout's step
            }
        });
        cleanups.unshift(() => {
            scene.onBeforeRenderObservable.remove(busy);
        });

        const { ticks } = renderManagerOf(element);
        const from = ticks.drawn;
        await until(element, "40 slow frames were drawn", () => ticks.drawn - from >= 40);
        assert.lengthOf(seen, 0);
        assert.deepEqual({ ...element.renderQuality }, { level: "high", motion: "on", heavy: "on" });
    });

    it("turns heavy shaders off at once after one 300 ms frame with one on screen", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }], { "node.color": "#3366cc" }, { onDemand: false });
        const layer = shadedLayer(element);
        const added = await element.session.shaders.add(PASTED, { apply: { layer } });
        assert.isTrue(added.ok);
        const drawing = (): NodeShaderDrawing | undefined => NodeShaderDrawing.peek(element.graph.getScene());
        await until(element, "the heavy sprite draws", () => drawing()?.guardedDrawn().heavy === true);
        const seen = qualityEvents(element);

        let gpuMs = 300;
        slowGpu(element, () => {
            const ms = gpuMs;
            gpuMs = 0;
            return ms;
        });

        await until(element, "heavy shaders turned off", () => element.renderQuality.heavy === "off");
        assert.deepEqual(
            seen.map((change) => change.code),
            ["guard.long-frame"],
        );
        assert.strictEqual(element.renderQuality.level, "high", "nothing else stepped down");
        assert.deepEqual(element.session.shaders.status("user/plate"), {
            state: "off",
            problem: { code: "shader.guard-off", params: { level: "high" } },
        });
        await until(
            element,
            "the node draws as the layers beneath paint it",
            () => drawing()?.guardedDrawn().heavy === false,
        );
    });

    it("changes nothing with guard: false", async () => {
        const element = await mounted(
            [{ id: "a", x: 0, y: 0 }],
            { "node.shaders": [{ shader: "e4/spin" }] },
            {
                before: (made) => {
                    made.shaderSettings = { quality: "high", guard: false };
                },
            },
        );
        const scene = element.graph.getScene();
        await until(element, "the loop sprite holds its frame claim", () => everyFrameAnimationsOn(scene) > 0);
        const seen = qualityEvents(element);
        slowGpu(element, () => 80);
        const { ticks } = renderManagerOf(element);
        const from = ticks.drawn;
        await until(element, "40 GPU-bound frames were drawn", () => ticks.drawn - from >= 40);
        assert.lengthOf(seen, 0);
        assert.deepEqual({ ...element.renderQuality }, { level: "high", motion: "on", heavy: "on" });
    });
});

describe("motion", () => {
    it("reports a moving shader still, and claims no frames, when the platform asks for reduced motion", async () => {
        const real = window.matchMedia;
        window.matchMedia = (query: string): MediaQueryList =>
            ({
                matches: query.includes("prefers-reduced-motion"),
                media: query,
                addEventListener: () => undefined,
                removeEventListener: () => undefined,
            }) as unknown as MediaQueryList;
        cleanups.push(() => {
            window.matchMedia = real;
        });

        const element = await mounted([{ id: "a", x: 0, y: 0 }], { "node.shaders": [{ shader: "e4/spin" }] });
        const drawing = (): NodeShaderDrawing | undefined => NodeShaderDrawing.peek(element.graph.getScene());
        await until(element, "the sprite draws", () => [...(drawing()?.stats().slots.values() ?? [])].includes(1));
        assert.deepEqual(element.session.shaders.status("e4/spin"), {
            state: "still",
            problem: { code: "shader.still", params: { reason: "system" } },
        });
        assert.strictEqual(element.renderQuality.motion, "still");
        assert.strictEqual(everyFrameAnimationsOn(element.graph.getScene()), 0, "a still loop asks for no frame");
    });

    // 10, 15 and 20 Hz: sampled 10 times a second, as the check once was, each aliased to a
    // steady or slow canvas and was never frozen.
    for (const hz of [6, 10, 15, 20]) {
        it(`freezes a pasted shader that flashes ${String(hz)} times a second, with shader.flashing`, async () => {
            const element = await mounted([{ id: "a", x: 0, y: 0 }], { "node.size": 6 });
            const layer = shadedLayer(element);
            const text = strobe(hz);
            const id = `user/strobe-${String(hz)}`;
            const added = await element.session.shaders.add(text, { apply: { layer } });
            assert.isTrue(added.ok);

            await until(element, "the strobe was frozen", () => element.session.shaders.status(id).state === "still");
            assert.deepEqual(element.session.shaders.status(id), {
                state: "still",
                problem: { code: "shader.flashing", params: { id } },
            });
            assert.isAtLeast(hostOf(element).loaded?.uniforms.frozenTime(sha256Hex(text)) ?? -1, 0);
        });
    }
});

/**
 * Read one pixel of the canvas, at a point in CSS pixels.
 * @param element - The element.
 * @param x - x.
 * @param y - y.
 * @returns r, g, b, a.
 */
async function pixelAt(element: Graphty, x: number, y: number): Promise<number[]> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 1);
    const scale = 1 / engine.getHardwareScalingLevel();
    const read = (await engine.readPixels(
        Math.round(x * scale),
        Math.round(engine.getRenderHeight() - y * scale),
        1,
        1,
    )) as unknown as Uint8Array;
    return [read[0], read[1], read[2], read[3]];
}

describe("the level's caps and detail", () => {
    it("crops an effect's square to 128 px at low quality and leaves it whole at high", async () => {
        const element = await mounted(
            [
                { id: "a", x: -3, y: 0 },
                { id: "b", x: 3, y: 0 },
            ],
            { "node.shaders": [{ shader: "e4/ring", params: {} }] },
        );
        await element.waitForStableFrame();
        const node = element.graph.getNode("a");
        assert.isDefined(node);
        const at = node.mesh.getAbsolutePosition();
        const center = element.worldToScreen(at);
        const edge = element.worldToScreen({ x: at.x + (node.roundRadius ?? node.size / 2), y: at.y, z: at.z });
        const radius = Math.abs(edge.x - center.x) / element.graph.engine.getHardwareScalingLevel();
        assert.isAbove(2 * 4 * radius, 128, "the square is wider than the low cap");
        assert.isBelow(2 * 4 * radius, 512, "and narrower than the high cap");
        const ringX = center.x + (edge.x - center.x) * 3;

        const isRed = async (): Promise<boolean> => {
            const [r, g] = await pixelAt(element, ringX, center.y);
            return r > 200 && g < 60;
        };
        let red = false;
        for (let i = 0; i < 300 && !red; i++) {
            red = await isRed();
        }

        assert.isTrue(red, "at high quality the ring 3 radii out is drawn");
        element.shaderSettings = { quality: "low" };
        let cropped = false;
        for (let i = 0; i < 300 && !cropped; i++) {
            cropped = !(await isRed());
        }

        assert.isTrue(cropped, "at low quality the square stops short of it");
    });

    it("draws a heavy surface's cheap program when its nodes are small on screen, at rest", async () => {
        const element = await mounted(
            [
                { id: "a", x: -150, y: 0 },
                { id: "b", x: 150, y: 0 },
            ],
            { "node.shaders": [{ shader: "e4/heavy" }] },
        );
        const batch = (): string | undefined =>
            element.graph.getScene().meshes.find((mesh) => mesh.name.startsWith("graphtyNodeimpostor"))?.material?.name;
        await until(element, "the batch draws its cheap program", () => batch()?.endsWith("low") === true);
    });

    it("keeps the full program when its nodes are large on screen", async () => {
        const element = await mounted([{ id: "a", x: 0, y: 0 }], { "node.shaders": [{ shader: "e4/heavy" }] });
        const scene = element.graph.getScene();
        const mesh = (): ReturnType<typeof scene.getMeshByName> =>
            scene.meshes.find((each) => each.name.startsWith("graphtyNodeimpostor")) ?? null;
        await until(element, "the batch draws", () => mesh() !== null);
        await element.waitForStableFrame();
        assert.isFalse(mesh()?.material?.name.endsWith("low"));
    });
});
