/**
 * @file The layout's accelerator and the renderer on one WebGPU device: what opens it, what a
 * loss in the middle of a layout does to both, whose errors are whose, and the order things go
 * in. A software adapter never shares, so on SwiftShader the adapter is made to say it is
 * hardware; the "gpu-loss" project with `GRAPHTY_BROWSER_GPU` set runs the same drills on a card.
 */

import "../../src/graphty-element";
import "../../webgpu";

import { EngineStore, Logger } from "@babylonjs/core";
import { afterEach, assert, describe, it, vi } from "vitest";
import { commands } from "vitest/browser";

import { Graph } from "../../src/Graph";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import type { RecoveringWebGPUEngine } from "../../src/managers/RecoveringWebGPUEngine";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Crashes this browser's GPU process. */
        crashGpuProcess: () => Promise<void>;
    }
}

const NODES = Array.from({ length: 200 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = NODES.map((_, i) => ({ src: `n${String(i)}`, dst: `n${String((i * 7 + 1) % 200)}` }));

const mounted: { graph: Graph; container: HTMLElement }[] = [];

/** Disposes every graph the test built. */
function unmount(): void {
    for (const { graph, container } of mounted.splice(0)) {
        graph.dispose();
        container.remove();
    }
}

afterEach(() => {
    unmount();
    vi.restoreAllMocks();
});

/**
 * Makes every adapter report one architecture, which is what decides whether it is shared. Only
 * the adapter: the device goes on saying what it is, so the kernels are the ones it runs anyway.
 * @param architecture - What it reports.
 */
function adapterSays(architecture: string): void {
    const { get } = Object.getOwnPropertyDescriptor(GPUAdapter.prototype, "info") as { get: () => GPUAdapterInfo };
    vi.spyOn(GPUAdapter.prototype, "info", "get").mockImplementation(function (this: GPUAdapter) {
        const { vendor, device, description, subgroupMinSize, subgroupMaxSize } = get.call(this);
        return {
            vendor,
            device,
            description,
            subgroupMinSize,
            subgroupMaxSize,
            architecture,
            isFallbackAdapter: false,
        } as GPUAdapterInfo;
    });
}

/**
 * Counts the devices opened from now on.
 * @returns The number so far.
 */
function countDevices(): () => number {
    const requested = vi.spyOn(GPUAdapter.prototype, "requestDevice");
    return () => requested.mock.calls.length;
}

/**
 * Opens a graph on WebGPU with its accelerator ready for a graph of any size.
 * @param policy - The acceleration policy.
 * @returns The graph.
 */
async function open(policy: "auto" | "required" = "auto"): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    mounted.push({ graph, container });
    graph.setRenderer("webgpu");
    graph.acceleration.setPolicy(policy);
    graph.acceleration.setMinNodes(0);
    const initialized = graph.init();
    void graph.acceleration.start();
    await initialized;
    assert.strictEqual(graph.rendererStatus?.active, "webgpu", graph.rendererStatus?.reason ?? "");
    await graph.acceleration.ready();
    return graph;
}

/**
 * The running accelerated layout.
 * @param graph - The graph.
 * @returns Its engine.
 */
function layoutOf(graph: Graph): SimulationLayoutEngine {
    const engine = graph.getLayoutManager().layoutEngine;
    assert.instanceOf(engine, SimulationLayoutEngine);
    return engine;
}

/**
 * Waits for a frame, the only thing a layout's batches move on.
 * @returns After the next frame.
 */
async function nextFrame(): Promise<void> {
    await new Promise((resolve) => {
        requestAnimationFrame(resolve);
    });
}

/**
 * Starts a layout that will not come to rest during the test, and waits for its batches to land.
 * @param graph - The graph.
 */
async function startLayout(graph: Graph): Promise<void> {
    await graph.addNodes(NODES);
    await graph.addEdges(EDGES);
    await graph.setLayout("forceatlas2", { maxIter: 1_000_000 });
    await landed(graph);
}

/**
 * Waits for a batch to land on the accelerator, after this call.
 * @param graph - The graph.
 */
async function landed(graph: Graph): Promise<void> {
    const before = layoutOf(graph).landedBatchesPublished;
    while (!layoutOf(graph).isAccelerated || layoutOf(graph).landedBatchesPublished <= before) {
        await nextFrame();
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

/**
 * The device the graph draws on.
 * @param graph - The graph.
 * @returns The device.
 */
function deviceOf(graph: Graph): Promise<GPUDevice> {
    return (graph.engine as RecoveringWebGPUEngine).drawingDevice();
}

/**
 * Collects the layout's errors from now on.
 * @param graph - The graph.
 * @returns The errors so far.
 */
function errorsOf(graph: Graph): Error[] {
    const errors: Error[] = [];
    graph.on("error", (event) => {
        errors.push(event.error);
    });
    return errors;
}

describe("the device a graph opens", () => {
    it("is one device on a hardware adapter", async () => {
        adapterSays("test-hardware");
        const devices = countDevices();

        const graph = await open();
        await startLayout(graph);

        assert.isTrue(layoutOf(graph).isAccelerated);
        assert.strictEqual(devices(), 1);
    });

    it("is one device for an element, which looks for its accelerator before it opens a renderer", async () => {
        adapterSays("test-hardware");
        const devices = countDevices();
        const element = document.createElement("graphty-element");
        element.renderer = "webgpu";
        element.graph.acceleration.setMinNodes(0);
        document.body.appendChild(element);
        mounted.push({ graph: element.graph, container: element });

        await element.graph.acceleration.ready();

        assert.isNotNull(element.graph.acceleration.accelerator);
        assert.strictEqual(devices(), 1);
    });

    it("is one device on a browser whose device does not carry its adapter's info", async () => {
        adapterSays("test-hardware");
        vi.spyOn(GPUDevice.prototype, "adapterInfo", "get").mockReturnValue(undefined as unknown as GPUAdapterInfo);
        const devices = countDevices();

        const graph = await open();
        assert.isNotNull(graph.acceleration.accelerator, graph.acceleration.status.reason ?? "");
        await startLayout(graph);

        assert.isTrue(layoutOf(graph).isAccelerated);
        assert.strictEqual(devices(), 1);
    });

    it("draws on WebGPU without sharing on a browser whose adapter has no info", async () => {
        vi.spyOn(GPUAdapter.prototype, "info", "get").mockReturnValue(undefined as unknown as GPUAdapterInfo);

        const graph = await open();

        assert.deepInclude(graph.rendererStatus, { active: "webgpu", reason: null, drawing: true });
        assert.isFalse((graph.engine as RecoveringWebGPUEngine).sharesDevice);
        assert.isNull(graph.acceleration.accelerator);
        assert.isNotNull(graph.acceleration.status.reason);
    });

    it("has every limit of the adapter when it is shared", async () => {
        adapterSays("test-hardware");
        const graph = await open();
        const adapter = await navigator.gpu?.requestAdapter({ powerPreference: "high-performance" });

        assert.strictEqual((await deviceOf(graph)).limits.maxBufferSize, adapter?.limits.maxBufferSize);
    });

    it("is two devices on a software adapter, decided before the run", async () => {
        adapterSays("swiftshader");
        const devices = countDevices();

        const graph = await open("required");
        await startLayout(graph);

        assert.isFalse((graph.engine as RecoveringWebGPUEngine).sharesDevice);
        assert.strictEqual(devices(), 2);
    });

    it("is the renderer's own when acceleration is off", async () => {
        adapterSays("test-hardware");
        const container = document.createElement("div");
        document.body.appendChild(container);
        const graph = new Graph(container);
        mounted.push({ graph, container });
        graph.setRenderer("webgpu");
        graph.acceleration.setPolicy("off");

        await graph.init();

        assert.isFalse((graph.engine as RecoveringWebGPUEngine).sharesDevice);
    });
});

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
            await startLayout(graph);
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
