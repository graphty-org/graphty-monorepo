/**
 * @file The cost of the edge presets, measured on the element's own drawing path
 * (design/rendering/shader-styles.md section 8, package P5): one edge wide enough to fill the
 * canvas, every parameter at its maximum, at each quality level, against a flat shader of the same
 * kind drawn the same way.
 *
 * The cost class is judged by the ratio to the flat shader, because the absolute time depends on
 * the GPU the run has (on a plain runner, a software one): light at most 3 times the flat
 * shader's frame, medium at most 8 times. The full-screen frame at every parameter's maximum must
 * also stay under the frame guard's long-frame limit (250 ms).
 *
 * A timing benchmark, so it runs in the browser-bench project and never gates a push. The
 * numbers are written to tmp/edge-presets/cost.json.
 */

import "../../../../src/graphty-element";

import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";
import { commands } from "vitest/browser";

import type { Graphty } from "../../../../index.js";
import { shaderDescriptor } from "../../../../src/catalog/shaderRegistry";
import { drawingOf, type ShaderDrawing, type ShaderParams } from "../../../../src/catalog/shaders";
import { operationQueueOf } from "../../../../src/Graph";
import { LONG_FRAME_MS } from "../../../../src/managers/ShaderGuard";
import { EdgeShaderDrawing } from "../../../../src/meshes/EdgeShaderDrawing";
import { defineShader } from "../../../../src/simple/defineShader";
import { EDGE_PRESETS, presetId } from "../../../../stories/shaders/edgePresets";
import { drawnFrames } from "../../../helpers/drawn-frames";

/** Frames timed per measurement. */
const FRAMES = 20;

/** The most a frame of each class may cost, as a multiple of the flat shader's. */
const CLASS_LIMIT: Readonly<Record<string, number>> = { light: 3, medium: 8, heavy: Infinity };

const QUALITIES = ["low", "medium", "high"] as const;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * One edge across the canvas, wide enough to cover it, drawn with a shader.
 * @param kind - Surface or effect.
 * @param shader - The shader's id.
 * @param params - Its parameters.
 * @returns The element.
 */
async function mountWide(kind: ShaderDrawing, shader: string, params: ShaderParams): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "800px";
    element.style.height = "600px";
    element.renderOnDemand = true;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -10, y: 0, z: 0 } },
        { id: "b", position: { x: 10, y: 0, z: 0 } },
    ]);
    await element.session.data.addEdges([{ source: "a", target: "b" }]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    const set =
        kind === "edge-paint"
            ? { "edge.shaders": [{ shader: shader, params: params }] }
            : { "edge.shaders": [{ shader: shader, params: params }] };
    await element.session.styles.add({
        name: "Wide",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.width": 400, "edge.color": "#3366cc", ...set },
    });
    await operationQueueOf(element.graph).waitForCompletion();
    const scene = element.graph.getScene();
    for (let i = 0; i < 600; i++) {
        const live = [...(EdgeShaderDrawing.peek(scene)?.stats().slots.values() ?? [])].reduce((a, b) => a + b, 0);
        const ready = scene.meshes
            .filter((mesh) => /^edge-(surface|effect)\|/.test(mesh.name))
            .every((mesh) => mesh.material?.getEffect()?.isReady() === true);
        if (live > 0 && ready) {
            break;
        }

        await drawnFrames(scene, 1);
    }

    return element;
}

/**
 * The mean time of one frame, the GPU's work included.
 * @param kind - Surface or effect.
 * @param shader - The shader.
 * @param params - Its parameters.
 * @param quality - The quality level.
 * @returns Milliseconds per frame.
 */
async function frameMs(
    kind: ShaderDrawing,
    shader: string,
    params: ShaderParams,
    quality: (typeof QUALITIES)[number],
): Promise<number> {
    const element = await mountWide(kind, shader, params);
    element.shaderSettings = { quality, guard: false };
    const scene = element.graph.getScene();
    const { engine } = element.graph;
    await drawnFrames(scene, 3);
    await engine.readPixels(0, 0, 1, 1);
    // Drawn back to back, not on animation frames, so the display's refresh does not pace them;
    // the read after them waits for the GPU to finish every one.
    const started = performance.now();
    for (let i = 0; i < FRAMES; i++) {
        scene.render();
    }

    await engine.readPixels(0, 0, 1, 1);
    const ms = (performance.now() - started) / FRAMES;
    element.remove();
    return ms;
}

const report: Record<string, { ms: number; ratio?: number }> = {};

afterAll(async () => {
    await commands.writeFile("tmp/edge-presets/cost.json", JSON.stringify(report, null, 2));
});

describe.each(QUALITIES)("the edge presets' cost at %s quality", (quality) => {
    const flat: Partial<Record<ShaderDrawing, number>> = {};

    beforeAll(async () => {
        if (shaderDescriptor("bench/flat-edge") === undefined) {
            defineShader({
                id: "bench/flat-edge",
                glsl: "vec4 shade(EdgeInput e) { return e.color; }",
            });
            defineShader({
                id: "bench/flat-effect",
                place: "along",
                glsl: "vec4 shade(EdgeInput e) { return vec4(e.color.rgb * 0.5, 0.5); }",
            });
        }

        flat["edge-paint"] = await frameMs("edge-paint", "bench/flat-edge", {}, quality);
        flat["edge-along"] = await frameMs("edge-along", "bench/flat-effect", {}, quality);
        report[`flat@${quality}`] = { ms: Math.max(flat["edge-paint"], flat["edge-along"]) };
    });

    it.each(EDGE_PRESETS.map(({ descriptor }) => [descriptor.id, descriptor] as const))(
        "%s at every parameter's maximum stays within its class and under the long-frame limit",
        async (id, descriptor) => {
            const highest = Object.fromEntries(
                descriptor.params
                    .filter((param) => typeof param.max === "number")
                    .map((param) => [param.name, param.max as number]),
            );
            const ms = await frameMs(drawingOf(descriptor), presetId(id), highest, quality);
            const ratio = ms / (flat[drawingOf(descriptor)] ?? ms);
            report[`${id}@${quality}`] = { ms, ratio };
            assert.isAtMost(ratio, CLASS_LIMIT[descriptor.cost], `${id} costs ${ratio.toFixed(2)}x the flat shader`);
            assert.isAtMost(ms, LONG_FRAME_MS, `${id} takes ${ms.toFixed(1)} ms a frame filling the canvas`);
        },
    );
});
