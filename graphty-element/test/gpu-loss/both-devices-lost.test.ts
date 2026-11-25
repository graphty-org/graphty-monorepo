/**
 * @file Both WebGPU devices lost -- the accelerator's own and the one the graph draws on -- under the `"required"`
 * policy, with the layout at rest so nothing plans work (issue #9987). The accelerator's device goes first, while the
 * GPU will not give it a new one, so the reattach that follows the loss fails. Then the renderer's device goes and
 * comes back: the GPU is back, and the element tries the reattach again by itself, saying so through its status --
 * `recovering` while a try runs, and a status change when recovery ends. Before the fix nothing tried again once
 * the first reattach failed, and the state stayed `"error"` for good.
 *
 * On SwiftShader the adapter is software, so the renderer and the accelerator each open a device of their own.
 *
 * Runs in the full run's graphty-element-gpu-loss shard. By hand: npx vitest run --project=gpu-loss
 * test/gpu-loss/both-devices-lost.test.ts
 */

import { assert, describe, it, vi } from "vitest";

import { deviceOf, layoutOf, nextFrame, open, startLayout } from "./shared-device";

/** The label webgpu-graph-algorithms gives every device it opens; the renderer's has another. */
const ACCELERATOR_LABEL = "webgpu-graph-algorithms";

describe("both devices lost under the required policy", () => {
    it("tries the reattach again once the renderer's device is back, and says when recovery ends", async () => {
        const { requestDevice: real } = GPUAdapter.prototype;
        const requestDevice = vi.spyOn(GPUAdapter.prototype, "requestDevice");
        const graph = await open("required");
        await startLayout(graph, 150);
        assert.strictEqual(graph.rendererStatus?.layoutDevice, "separate");
        // At rest, nothing plans work, so nothing but the controller itself can try the reattach again.
        while (!layoutOf(graph).isSettled) {
            await nextFrame();
        }

        const statuses: { state: string; recovering: boolean }[] = [];
        graph.acceleration.onChange((status) => {
            statuses.push({ state: status.state, recovering: status.recovering === true });
        });
        const drawing = await deviceOf(graph);
        const opened = await Promise.all(requestDevice.mock.results.map(async (r) => (await r.value) as GPUDevice));
        const own = opened.find((device) => device.label === ACCELERATOR_LABEL);
        assert.isDefined(own, "the accelerator runs on a device of its own");

        // The GPU refuses the accelerator a device until the renderer has opened its new one.
        let gpuBack = false;
        let refused = 0;
        requestDevice.mockImplementation(async function (this: GPUAdapter, descriptor?: GPUDeviceDescriptor) {
            if (descriptor?.label === ACCELERATOR_LABEL && !gpuBack) {
                refused += 1;
                throw new Error("the GPU is not back yet");
            }

            gpuBack = true;
            return real.call(this, descriptor);
        });
        let restored = false;
        graph.on("render-restored", () => {
            restored = true;
        });

        own.destroy();
        while (refused === 0 || graph.acceleration.status.state !== "error" || graph.acceleration.status.recovering) {
            await nextFrame();
        }

        assert.isNull(graph.acceleration.accelerator, "the first reattach failed");
        drawing.destroy();
        while (graph.acceleration.accelerator === null) {
            const { state, recovering, reason } = graph.acceleration.status;
            // The renderer is back and nothing is trying: where the defect left it, for good.
            if (restored && state === "error" && recovering !== true) {
                assert.fail(`the element stopped trying to reattach: ${reason ?? "no reason"}`);
            }

            assert.notStrictEqual(state, "unavailable", "the accelerator comes back");
            await nextFrame();
        }

        while (graph.acceleration.status.recovering === true) {
            await nextFrame();
        }

        assert.include(["idle", "active"], graph.acceleration.status.state);
        assert.isTrue(
            statuses.some((s) => s.state === "error" && s.recovering),
            "a reattach was published as recovering",
        );
        assert.isFalse(statuses.at(-1)?.recovering, "the last change said recovery ended");
    });
});
