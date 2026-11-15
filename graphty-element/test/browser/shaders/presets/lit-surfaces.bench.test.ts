/**
 * @file The cost of the lit-surface presets, measured on the element's own drawing path
 * (design/rendering/shader-styles.md section 8, package P1): one sphere filling the canvas, every
 * parameter at its maximum, at each quality level, against a flat shader drawn the same way.
 *
 * The cost class is judged by the ratio to the flat shader, because the absolute time depends on
 * the GPU the run has (on a plain runner, a software one): light at most 3 times the flat
 * shader's frame, medium at most 8 times. The full-screen frame at every parameter's maximum must
 * also stay under the frame guard's long-frame limit (250 ms), the point past which the element
 * would turn a pasted shader off, on whatever GPU runs this.
 *
 * A timing benchmark, so it runs in the browser-bench project and never gates a push. The
 * numbers are written to tmp/lit-surfaces/cost.json.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { commands } from "vitest/browser";

import { shaderDescriptor } from "../../../../src/catalog/shaderRegistry";
import type { ShaderParams } from "../../../../src/catalog/shaders";
import { LONG_FRAME_MS } from "../../../../src/managers/ShaderGuard";
import { defineShader } from "../../../../src/simple/defineShader";
import { LIT_SURFACE_PRESETS, presetId } from "../../../../stories/shaders/litSurfacePresets";
import { drawnFrames } from "../../../helpers/drawn-frames";
import { mountLitScene } from "./lit-surface-scene";

/** Frames timed per measurement. */
const FRAMES = 20;

/** The most a frame of each class may cost, as a multiple of the flat shader's. */
const CLASS_LIMIT: Readonly<Record<string, number>> = { light: 3, medium: 8, heavy: Infinity };

const QUALITIES = ["low", "medium", "high"] as const;

/**
 * The mean time of one full-screen frame, the GPU's work included.
 * @param shader - The shader.
 * @param params - Its parameters.
 * @param quality - The quality level.
 * @returns Milliseconds per frame.
 */
async function frameMs(shader: string, params: ShaderParams, quality: (typeof QUALITIES)[number]): Promise<number> {
    const { element, dispose } = await mountLitScene(shader, { params, size: 60, only: true });
    try {
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
        return (performance.now() - started) / FRAMES;
    } finally {
        dispose();
    }
}

const report: Record<string, { ms: number; ratio?: number }> = {};

afterAll(async () => {
    await commands.writeFile("tmp/lit-surfaces/cost.json", JSON.stringify(report, null, 2));
});

describe.each(QUALITIES)("the lit-surface presets' cost at %s quality", (quality) => {
    let flat = 0;

    beforeAll(async () => {
        if (shaderDescriptor("bench/flat") === undefined) {
            defineShader({
                id: "bench/flat",
                glsl: "vec4 shade(NodeInput n) { return vec4(n.color.rgb, 1.0); }",
            });
        }

        flat = await frameMs("bench/flat", {}, quality);
        report[`flat@${quality}`] = { ms: flat };
    });

    it.each(LIT_SURFACE_PRESETS.map(({ descriptor }) => [descriptor.id, descriptor] as const))(
        "%s at every parameter's maximum stays within its class and under the long-frame limit",
        async (id, descriptor) => {
            const highest = Object.fromEntries(
                descriptor.params
                    .filter((param) => typeof param.max === "number")
                    .map((param) => [param.name, param.max as number]),
            );
            const ms = await frameMs(presetId(id), highest, quality);
            const ratio = ms / flat;
            report[`${id}@${quality}`] = { ms, ratio };
            assert.isAtMost(ratio, CLASS_LIMIT[descriptor.cost], `${id} costs ${ratio.toFixed(2)}x the flat shader`);
            assert.isAtMost(ms, LONG_FRAME_MS, `${id} takes ${ms.toFixed(1)} ms a frame filling the canvas`);
        },
    );
});
