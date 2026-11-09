/**
 * @file The WebGPU device taken away from a graph with no layout running, the two ways that
 * happens: the page destroys it, or the browser's GPU process crashes. The graph comes back on a
 * new device with its picture, with no uncaptured error, and without a reader touching it, even
 * when the loop was resting.
 *
 * Runs in the "gpu-loss" project, on the full Chromium build: the headless shell dies with its
 * GPU process. The picture is read from the page as a reader sees it, never by asking the element
 * to draw: a frame asked for would wake the resting loop this file proves wakes by itself.
 */

import "../../src/graphty-element";

import { Logger, type WebGPUEngine } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";
import { commands } from "vitest/browser";

import { GraphtyError } from "../../src/errors";
import { Graph, operationQueueOf } from "../../src/Graph";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Crashes this browser's GPU process. */
        crashGpuProcess: () => Promise<void>;
        /** The graph's canvas as the page shows it, as base64 PNG. */
        canvasPicture: () => Promise<string>;
    }
}

const NODES = Array.from({ length: 12 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = NODES.map((_, i) => ({ src: `n${String(i)}`, dst: `n${String((i + 1) % 12)}` }));

const mounted: { graph: Graph; container: HTMLElement }[] = [];

/** Disposes every graph the test built. */
function unmount(): void {
    for (const { graph, container } of mounted.splice(0)) {
        graph.dispose();
        container.remove();
    }
}

afterEach(() => {
    vi.restoreAllMocks();
    unmount();
});

/**
 * The device an engine is drawing on.
 * @param graph - The graph.
 * @returns The device.
 */
function deviceOf(graph: Graph): GPUDevice {
    return (graph.engine as unknown as { _device: GPUDevice })._device;
}

/**
 * Builds a ring on WebGPU and waits for its picture.
 * @param onDemand - Whether the loop rests once the picture is final.
 * @param antialias - Whether the engine multisamples.
 * @returns The graph.
 */
async function openRing(onDemand: boolean, antialias = true): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);
    const graph = new Graph(container, false, { antialias });
    mounted.push({ graph, container });
    graph.setRenderer("webgpu");
    await graph.init();
    assert.strictEqual(graph.rendererStatus?.active, "webgpu", graph.rendererStatus?.reason ?? "");
    graph.setLayoutBehavior({ rendering: { onDemand } });
    await graph.addNodes(NODES);
    await graph.addEdges(EDGES);
    await graph.setLayout("circular", { scale: 0.3 });
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame();
    return graph;
}

/**
 * Takes the device away and waits for the engine to have a new one.
 * @param graph - The graph.
 * @param loseDevice - What takes it away.
 * @returns Once the engine says it is back.
 */
async function lose(graph: Graph, loseDevice: (device: GPUDevice) => Promise<void>): Promise<void> {
    const old = deviceOf(graph);
    const engine = graph.engine as WebGPUEngine;
    const restored = new Promise<void>((resolve) => {
        engine.onContextRestoredObservable.addOnce(() => {
            resolve();
        });
    });
    const gone = new Promise<never>((_, reject) => {
        graph.on("error", (event) => {
            reject(event.error);
        });
    });
    await loseDevice(old);
    await Promise.race([restored, gone]);
    assert.notStrictEqual(deviceOf(graph), old, "restored on the device that was lost");
}

/**
 * Waits until the page shows a picture again. A picture that never comes back ends in the
 * run's hang guard.
 * @param want - The base64 PNG to see.
 */
async function waitForPicture(want: string): Promise<void> {
    while ((await commands.canvasPicture()) !== want) {
        // Each read is a round trip to the browser's compositor.
    }
}

/**
 * Counts Babylon's reports of an uncaptured device error from now on.
 * @returns The number so far.
 */
function countUncaptured(): () => number {
    const warn = vi.spyOn(Logger, "Warn");
    return () => warn.mock.calls.filter(([message]) => String(message).includes("uncaptured error")).length;
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

describe("a lost WebGPU device", () => {
    for (const [drill, loseDevice] of Object.entries(DRILLS)) {
        for (const [onDemand, antialias] of [
            [false, true],
            [true, true],
            [true, false],
        ]) {
            const how = `${onDemand ? "resting" : "drawing every tick"}${antialias ? "" : ", antialias off"}`;
            it(`draws the same picture after a ${drill}, ${how}`, async () => {
                const graph = await openRing(onDemand, antialias);
                const before = await commands.canvasPicture();
                const uncaptured = countUncaptured();
                const told = vi.fn();
                graph.canvas.addEventListener("webglcontextrestored", told);

                await lose(graph, loseDevice);
                await waitForPicture(before);

                assert.strictEqual(uncaptured(), 0);
                assert.isTrue(graph.rendererStatus?.drawing);
                // What wakes a resting loop and has the batches upload again. Shaders compiling on
                // the new device also keep the loop drawing, so the picture alone does not show it.
                assert.strictEqual(told.mock.calls.length, 1);
                assert.strictEqual(graph.engine.getCreationOptions().antialias, antialias);
            });
        }
    }

    it("comes back from a second loss on the device it came back on", async () => {
        const graph = await openRing(true);
        const before = await commands.canvasPicture();
        const uncaptured = countUncaptured();

        await lose(graph, DRILLS.destroy);
        await waitForPicture(before);
        await lose(graph, DRILLS.destroy);
        await waitForPicture(before);

        assert.strictEqual(uncaptured(), 0);
    });

    it("draws what was added while the device was away", async () => {
        const healthy = await openRing(true);
        await healthy.addNodes([{ id: "late" }]);
        await operationQueueOf(healthy).waitForCompletion();
        await healthy.waitForStableFrame();
        const want = await commands.canvasPicture();
        unmount();

        const graph = await openRing(true);
        const uncaptured = countUncaptured();
        const engine = graph.engine as WebGPUEngine;
        const added = new Promise<void>((resolve, reject) => {
            engine.onContextLostObservable.addOnce(() => {
                graph.addNodes([{ id: "late" }]).then(resolve, reject);
            });
        });

        await lose(graph, DRILLS.destroy);
        await added;
        await waitForPicture(want);

        assert.strictEqual(uncaptured(), 0);
    });

    it("takes no offense at a shader the crash left unanswered", async () => {
        const graph = await openRing(true);
        vi.spyOn(GPUShaderModule.prototype, "getCompilationInfo").mockRejectedValue(
            new DOMException("Instance dropped error in getCompilationInfo", "OperationError"),
        );

        deviceOf(graph).createShaderModule({
            code: "@vertex fn main() -> @builtin(position) vec4f { return vec4f(); }",
        });
        // A task later, for an unhandled rejection to reach test/setup.ts, which fails the test.
        await commands.canvasPicture();

        assert.isTrue(graph.rendererStatus?.drawing);
    });

    it("leaves a graph disposed during the loss disposed", async () => {
        const graph = await openRing(false);
        const engine = graph.engine as WebGPUEngine;
        const restored = vi.fn();
        engine.onContextRestoredObservable.add(restored);
        const opened = vi.spyOn(GPU.prototype, "requestAdapter");
        const lost = new Promise<void>((resolve) => {
            engine.onContextLostObservable.addOnce(() => {
                resolve();
            });
        });

        deviceOf(graph).destroy();
        await lost;
        unmount();
        await Promise.all(opened.mock.results.map(async ({ value }) => await (value as Promise<unknown>)));

        assert.strictEqual(restored.mock.calls.length, 0);
    });

    it("says the graph stopped drawing when no new device can be had", async () => {
        const graph = await openRing(false);
        vi.spyOn(GPU.prototype, "requestAdapter").mockResolvedValue(null);
        const refused = new Promise<Error>((resolve) => {
            graph.on("error", (event) => {
                resolve(event.error);
            });
        });

        deviceOf(graph).destroy();
        const error = await refused;

        assert.instanceOf(error, GraphtyError);
        assert.strictEqual(error.code, "E_DEVICE_LOST");
        assert.isFalse(graph.rendererStatus?.drawing);
    });
});
