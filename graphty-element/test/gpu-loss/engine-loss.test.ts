/**
 * @file The WebGPU device taken away from a graph with no layout running, the two ways that
 * happens: the page destroys it, or the browser's GPU process crashes. The graph comes back on a
 * new device with its picture, with no uncaptured error, and without a reader touching it, even
 * when the loop was resting.
 *
 * Runs in the "gpu-loss" project, on the full Chromium build: the headless shell dies with its
 * GPU process. The picture is read in the frame that drew it (a page screenshot of a WebGPU canvas
 * reads blank here), and only once the loop has drawn again by itself: a frame asked for earlier
 * would wake the resting loop this file proves wakes by itself.
 */

import "../../src/graphty-element";

import type { WebGPUEngine } from "@babylonjs/core";
import { afterEach, assert, describe, it, onTestFailed, vi } from "vitest";
import { commands } from "vitest/browser";

import { GraphtyError } from "../../src/errors";
import { Graph, operationQueueOf, renderManagerOf } from "../../src/Graph";
import type { RenderManager } from "../../src/managers/RenderManager";
import { captureNextFrame, type DrawnFrame, inkedPixels } from "../helpers/frame-recorder";
import { countUncaptured, deviceNowOf, mounted, unmount } from "./device-helpers";

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

afterEach(() => {
    vi.restoreAllMocks();
    unmount();
});

/**
 * Builds a ring on WebGPU and waits for its picture.
 * @param onDemand - Whether the loop rests once the picture is final.
 * @param antialias - Whether the engine multisamples.
 * @param path - The render path.
 * @returns The graph.
 */
async function openRing(onDemand: boolean, antialias = true, path: "objects" | "batched" = "objects"): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);
    const graph = new Graph(container, { antialias });
    mounted.push({ graph, container });
    graph.setRenderer("webgpu");
    graph.setRenderPath(path);
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
 * What the loop's ticks have done: frames drawn, ticks rested and ticks skipped for the GPU.
 * @param graph - The graph.
 * @returns The counts, copied.
 */
function ticksOf(graph: Graph): RenderManager["ticks"] {
    return { ...renderManagerOf(graph).ticks };
}

/** The browser's own requests, taken before any test spies on them. */
const REAL = {
    requestAdapter: GPU.prototype.requestAdapter as unknown as (...args: unknown[]) => Promise<unknown>,
    requestDevice: GPUAdapter.prototype.requestDevice as unknown as (...args: unknown[]) => Promise<unknown>,
};

/**
 * Counts the calls of a browser request and how many the browser has answered, keeping the real one.
 * @param proto - The prototype holding the method.
 * @param name - The method.
 * @returns The counts so far.
 */
function countAnswers(proto: object, name: keyof typeof REAL): { asked: number; answered: number } {
    const counts = { asked: 0, answered: 0 };
    const real = REAL[name];
    vi.spyOn(proto as Record<string, (...args: unknown[]) => Promise<unknown>>, name).mockImplementation(
        async function (this: unknown, ...args: unknown[]) {
            counts.asked++;
            try {
                return await real.apply(this, args);
            } finally {
                counts.answered++;
            }
        },
    );
    return counts;
}

/**
 * Takes the device away and waits for the engine to have a new one. A test that fails, or that the
 * run's hang guard stops, while it waits here says how far the restore got (issue #6422): whether
 * the loss and the restore were heard, and how many adapter and device requests the browser has
 * answered.
 * @param graph - The graph.
 * @param loseDevice - What takes it away.
 * @returns Once the engine says it is back.
 */
async function lose(graph: Graph, loseDevice: (device: GPUDevice) => Promise<void>): Promise<void> {
    const old = deviceNowOf(graph);
    const engine = graph.engine as WebGPUEngine;
    const adapters = countAnswers(GPU.prototype, "requestAdapter");
    const devices = countAnswers(GPUAdapter.prototype, "requestDevice");
    const heard = { lost: false, restored: false };
    onTestFailed(() => {
        console.error(
            `while the device was lost: ${JSON.stringify({ heard, adapters, devices, ticks: ticksOf(graph) })}`,
        );
    });
    engine.onContextLostObservable.addOnce(() => {
        heard.lost = true;
    });
    const restored = new Promise<void>((resolve) => {
        engine.onContextRestoredObservable.addOnce(() => {
            heard.restored = true;
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
    assert.notStrictEqual(deviceNowOf(graph), old, "restored on the device that was lost");
}

/**
 * The graph's finished picture, read in the frame that drew it: a page screenshot of a WebGPU canvas on this
 * project's Chromium is blank whatever the graph draws, so a blank picture once compared equal to a full one.
 * Reading asks for one frame, so it is only taken before a loss and after the loop has woken by itself.
 * @param graph - The graph.
 * @returns The frame.
 */
async function pictureOf(graph: Graph): Promise<DrawnFrame> {
    await graph.waitForStableFrame();
    const frame = await captureNextFrame(graph);
    assert.isAbove(inkedPixels(frame), 100, "the picture shows the graph");
    return frame;
}

/**
 * Waits until the loop draws again by itself after a loss -- nothing here asks for a frame until it has, since a
 * resting loop that never wakes is the defect (issue #6422) -- then reads its finished picture and compares it with
 * the one from before. A loop that never draws again ends in the run's hang guard.
 * @param graph - The graph drawing it.
 * @param want - The picture to see.
 * @param drawnBefore - The loop's drawn frames when `want` was read.
 */
async function waitForPicture(graph: Graph, want: DrawnFrame, drawnBefore: number): Promise<void> {
    while (ticksOf(graph).drawn === drawnBefore) {
        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });
    }

    const now = await pictureOf(graph);
    let differ = 0;
    for (let i = 0; i < want.pixels.length; i += 4) {
        if (
            now.pixels[i] !== want.pixels[i] ||
            now.pixels[i + 1] !== want.pixels[i + 1] ||
            now.pixels[i + 2] !== want.pixels[i + 2]
        ) {
            differ++;
        }
    }

    assert.strictEqual(
        differ,
        0,
        `pixels that differ from the picture before the loss (of ${String(want.pixels.length / 4)})`,
    );
}

/**
 * Destroys the graph's device when no restore can succeed, and checks the graph says it stopped
 * drawing rather than waiting forever (issue #6422).
 * @param graph - The graph.
 * @returns The error the graph reported.
 */
async function destroyUntilGone(graph: Graph): Promise<GraphtyError> {
    const refused = new Promise<Error>((resolve) => {
        graph.on("error", (event) => {
            resolve(event.error);
        });
    });

    deviceNowOf(graph).destroy();
    const error = await refused;

    assert.instanceOf(error, GraphtyError);
    assert.strictEqual(error.code, "E_DEVICE_LOST");
    assert.isFalse(graph.rendererStatus?.drawing);
    return error;
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
                const before = await pictureOf(graph);
                const drawnBefore = ticksOf(graph).drawn;
                const uncaptured = countUncaptured();
                const told = vi.fn();
                graph.canvas.addEventListener("webglcontextrestored", told);

                await lose(graph, loseDevice);
                await waitForPicture(graph, before, drawnBefore);

                assert.strictEqual(uncaptured(), 0);
                assert.isTrue(graph.rendererStatus?.drawing);
                // What wakes a resting loop and has the batches upload again. Shaders compiling on
                // the new device also keep the loop drawing, so the picture alone does not show it.
                assert.strictEqual(told.mock.calls.length, 1);
                assert.strictEqual(graph.engine.getCreationOptions().antialias, antialias);
            });
        }
    }

    it("draws the same picture after a destroy on the batched path, resting", async () => {
        const graph = await openRing(true, true, "batched");
        const before = await pictureOf(graph);
        const drawnBefore = ticksOf(graph).drawn;

        await lose(graph, DRILLS.destroy);
        await waitForPicture(graph, before, drawnBefore);

        assert.isTrue(graph.rendererStatus?.drawing);
    });

    it("comes back from a second loss on the device it came back on", async () => {
        const graph = await openRing(true);
        const before = await pictureOf(graph);
        const drawnBefore = ticksOf(graph).drawn;
        const uncaptured = countUncaptured();

        await lose(graph, DRILLS.destroy);
        await waitForPicture(graph, before, drawnBefore);
        const drawnAgain = ticksOf(graph).drawn;
        await lose(graph, DRILLS.destroy);
        await waitForPicture(graph, before, drawnAgain);

        assert.strictEqual(uncaptured(), 0);
    });

    it("draws what was added while the device was away", async () => {
        const healthy = await openRing(true);
        await healthy.addNodes([{ id: "late" }]);
        await operationQueueOf(healthy).waitForCompletion();
        const want = await pictureOf(healthy);
        unmount();

        const graph = await openRing(true);
        const drawnBefore = ticksOf(graph).drawn;
        const uncaptured = countUncaptured();
        const engine = graph.engine as WebGPUEngine;
        const added = new Promise<void>((resolve, reject) => {
            engine.onContextLostObservable.addOnce(() => {
                graph.addNodes([{ id: "late" }]).then(resolve, reject);
            });
        });

        await lose(graph, DRILLS.destroy);
        await added;
        await waitForPicture(graph, want, drawnBefore);

        assert.strictEqual(uncaptured(), 0);
    });

    it("takes no offense at a shader the crash left unanswered", async () => {
        const graph = await openRing(true);
        vi.spyOn(GPUShaderModule.prototype, "getCompilationInfo").mockRejectedValue(
            new DOMException("Instance dropped error in getCompilationInfo", "OperationError"),
        );

        deviceNowOf(graph).createShaderModule({
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

        deviceNowOf(graph).destroy();
        await lost;
        unmount();
        await Promise.all(opened.mock.results.map(async ({ value }) => await (value as Promise<unknown>)));

        assert.strictEqual(restored.mock.calls.length, 0);
    });

    // Chromium destroys every map-readable buffer still alive when the page's frame goes away, and one from a
    // crashed GPU process's device took the renderer down (issue #9850).
    it("leaves no map-readable buffer alive after a crash, a picture read and a dispose", async () => {
        const alive = new Set<GPUBuffer>();
        const { createBuffer } = GPUDevice.prototype;
        vi.spyOn(GPUDevice.prototype, "createBuffer").mockImplementation(function (
            this: GPUDevice,
            descriptor: GPUBufferDescriptor,
        ) {
            const buffer = createBuffer.call(this, descriptor);
            if ((descriptor.usage & (GPUBufferUsage.MAP_READ | GPUBufferUsage.MAP_WRITE)) !== 0) {
                alive.add(buffer);
            }

            return buffer;
        });
        const { destroy } = GPUBuffer.prototype;
        vi.spyOn(GPUBuffer.prototype, "destroy").mockImplementation(function (this: GPUBuffer) {
            alive.delete(this);
            destroy.call(this);
        });

        const graph = await openRing(true);
        const before = await pictureOf(graph);
        const drawnBefore = ticksOf(graph).drawn;
        await lose(graph, DRILLS.crash);
        await waitForPicture(graph, before, drawnBefore);
        assert.isAbove(alive.size, 0, "the engine reads through map-readable buffers");
        unmount();

        assert.strictEqual(alive.size, 0);
    });

    it("says the graph stopped drawing when no new device can be had", async () => {
        const graph = await openRing(false);
        vi.spyOn(GPU.prototype, "requestAdapter").mockResolvedValue(null);

        await destroyUntilGone(graph);
    });

    it("says the graph stopped drawing when rebuilding on the new device throws", async () => {
        const graph = await openRing(true);
        const broken = new Error("rebuild failed");
        // Told only once the engine rebuilt on the new device: Babylon's own restore, on the lost
        // device, is skipped while the engine waits.
        (graph.engine as WebGPUEngine).onContextRestoredObservable.addOnce(() => {
            throw broken;
        });

        const error = await destroyUntilGone(graph);

        assert.strictEqual(error.cause, broken);
    });
});
