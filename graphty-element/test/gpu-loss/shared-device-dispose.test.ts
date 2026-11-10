/**
 * @file The layout's accelerator and the renderer on one WebGPU device: disposing a graph on a shared
 * device: the accelerator goes before the engine and leaves nothing resident. A software adapter never
 * shares, so on SwiftShader the adapter is made to say it is hardware; the "gpu-loss" project with
 * `GRAPHTY_BROWSER_GPU` set runs the same drills on a card. The other shared-device files hold the rest, so
 * a pull request's planner can give each a test bin of its own.
 */

import { EngineStore } from "@babylonjs/core";
import { assert, describe, it, vi } from "vitest";

import { adapterSays, deviceOf, nextFrame, open, submitLayout, unmount } from "./shared-device";

describe("disposing a graph on a shared device", () => {
    it("lets the accelerator go before the engine, ten times over, leaving nothing resident", async () => {
        adapterSays("test-hardware");
        const live = new Set<GPUBuffer>();
        const create = GPUDevice.prototype.createBuffer;
        vi.spyOn(GPUDevice.prototype, "createBuffer").mockImplementation(function (this: GPUDevice, descriptor) {
            const buffer = create.call(this, descriptor);
            if (!buffer.label.startsWith("Babylon")) {
                live.add(buffer);
            }
            return buffer;
        });
        const release = GPUBuffer.prototype.destroy;
        vi.spyOn(GPUBuffer.prototype, "destroy").mockImplementation(function (this: GPUBuffer) {
            live.delete(this);
            release.call(this);
        });
        const engines = EngineStore.Instances.length;

        for (let cycle = 0; cycle < 10; cycle++) {
            const graph = await open();
            // disposed with its first batch in flight, which must keep what it reads until it settles
            await submitLayout(graph);
            const device = await deviceOf(graph);
            let controllerGone = false;
            const dispose = graph.engine.dispose.bind(graph.engine);
            vi.spyOn(graph.engine, "dispose").mockImplementation(() => {
                controllerGone = graph.acceleration.disposed;
                dispose();
            });

            unmount();

            assert.isTrue(controllerGone, `cycle ${String(cycle)}: the engine went first`);
            assert.strictEqual((await device.lost).reason, "destroyed");
            // A batch in flight keeps what it reads until it settles; a buffer left for good ends
            // in the run's hang guard.
            while (live.size > 0) {
                await nextFrame();
            }
        }

        assert.strictEqual(EngineStore.Instances.length, engines);
    });
});
