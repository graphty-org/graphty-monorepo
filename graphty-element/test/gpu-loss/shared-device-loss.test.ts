/**
 * @file The layout's accelerator and the renderer on one WebGPU device: a shared device lost in the middle
 * of a layout (destroyed, or the GPU process crashed), one that does not come back, and whose errors are
 * whose. A software adapter never shares, so on SwiftShader the adapter is made to say it is hardware; the
 * "gpu-loss" project with `GRAPHTY_BROWSER_GPU` set runs the same drills on a card. The other shared-device
 * files hold the rest, so a pull request's planner can give each a test bin of its own.
 */

import { assert, describe, it, vi } from "vitest";
import { commands } from "vitest/browser";

import { Graph } from "../../src/Graph";
import type { RecoveringWebGPUEngine } from "../../src/managers/RecoveringWebGPUEngine";
import {
    adapterSays,
    countDevices,
    countUncaptured,
    deviceOf,
    errorsOf,
    landed,
    nextFrame,
    open,
    startLayout,
    unmount,
} from "./shared-device";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Crashes this browser's GPU process. */
        crashGpuProcess: () => Promise<void>;
    }
}

const DRILLS: Record<string, (device: GPUDevice) => Promise<void>> = {
    destroy: async (device) => {
        device.destroy();
        await Promise.resolve();
    },
    crash: async () => {
        await commands.crashGpuProcess();
    },
};

describe("a shared device lost in the middle of a layout", () => {
    for (const [drill, loseDevice] of Object.entries(DRILLS)) {
        it(`brings the layout back on the engine's new device after a ${drill}`, async () => {
            adapterSays("test-hardware");
            const devices = countDevices();
            const graph = await open();
            await startLayout(graph);
            const uncaptured = countUncaptured();
            const before = graph.acceleration.accelerator;
            const old = await deviceOf(graph);

            await loseDevice(old);
            while (graph.acceleration.accelerator === before || graph.acceleration.accelerator === null) {
                await nextFrame();
            }
            await landed(graph);

            assert.notStrictEqual(await deviceOf(graph), old);
            // The engine's first and the engine's second: the accelerator asked for neither.
            assert.strictEqual(devices(), 2);
            assert.strictEqual(uncaptured(), 0);
            assert.isTrue(graph.rendererStatus?.drawing);
        });
    }
});

describe("a shared device that does not come back", () => {
    /**
     * Opens a graph on a shared device and loses the device for good.
     * @param policy - The acceleration policy.
     * @returns The graph, once it has said it stopped drawing.
     */
    async function openAndLoseForGood(policy: "auto" | "required"): Promise<Graph> {
        adapterSays("test-hardware");
        const graph = await open(policy);
        vi.spyOn(GPU.prototype, "requestAdapter").mockResolvedValue(null);
        const gone = new Promise<void>((resolve) => {
            graph.on("error", () => {
                resolve();
            });
        });
        (await deviceOf(graph)).destroy();
        await gone;
        return graph;
    }

    it("leaves a later search for the accelerator to end on the CPU", async () => {
        const graph = await openAndLoseForGood("auto");

        graph.acceleration.setPolicy("off");
        graph.acceleration.setPolicy("auto");
        await graph.acceleration.ready();

        assert.isNull(graph.acceleration.accelerator);
        assert.strictEqual(graph.acceleration.status.state, "unavailable");
    });

    it("refuses a later search under the required policy", async () => {
        const graph = await openAndLoseForGood("required");

        graph.acceleration.setPolicy("off");
        graph.acceleration.setPolicy("required");
        const answer = await graph.acceleration.ready().then(
            () => "ready",
            () => "refused",
        );

        assert.strictEqual(answer, "refused");
    });

    it("tells whoever waits for the device when the graph is disposed during the loss", async () => {
        adapterSays("test-hardware");
        const graph = await open();
        const engine = graph.engine as RecoveringWebGPUEngine;
        const lost = new Promise<void>((resolve) => {
            engine.onContextLostObservable.addOnce(() => {
                resolve();
            });
        });
        (await deviceOf(graph)).destroy();
        await lost;

        const waiting = engine.drawingDevice();
        unmount();

        const answers = await Promise.allSettled([waiting, engine.drawingDevice()]);
        assert.deepEqual(
            answers.map(({ status }) => status),
            ["rejected", "rejected"],
        );
    });
});

describe("errors on a shared device", () => {
    it("fails no layout batch when the renderer's error reaches the device", async () => {
        adapterSays("test-hardware");
        const graph = await open();
        await startLayout(graph);
        const errors = errorsOf(graph);

        (await deviceOf(graph)).createBuffer({ label: "a renderer's mistake", size: 16, usage: 0 });
        await landed(graph);
        await landed(graph);

        assert.deepEqual(errors, []);
    });

    it("stops the layout and reports when its own batch is bad, and draws on", async () => {
        adapterSays("test-hardware");
        const graph = await open();
        await startLayout(graph);
        const errors = errorsOf(graph);
        // The layout's next batch is swapped for one that uses a destroyed buffer, which the queue
        // refuses. The renderer's own submits go through.
        const device = await deviceOf(graph);
        const gone = device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
        const scratch = device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST });
        const encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(gone, 0, scratch, 0, 16);
        const broken = encoder.finish();
        gone.destroy();
        const { submit } = GPUQueue.prototype;
        vi.spyOn(GPUQueue.prototype, "submit").mockImplementation(function (this: GPUQueue, buffers) {
            const list = [...buffers];
            submit.call(this, list.some((buffer) => buffer.label.startsWith("batch/")) ? [broken] : list);
        });

        while (errors.length === 0) {
            await nextFrame();
        }

        assert.match(errors[0].message, /delivered to batch/);
        assert.isTrue(graph.rendererStatus?.drawing);
    });
});
