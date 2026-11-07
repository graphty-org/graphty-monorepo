/**
 * @file What the shared-device test files share: a graph opened on WebGPU with its layout's
 * accelerator, the adapter made to say what it is, and the readers of devices, batches and errors.
 * Importing it registers an afterEach that disposes every graph a test opened.
 */

import "../../src/graphty-element";
import "../../webgpu";

import { Logger } from "@babylonjs/core";
import { afterEach, assert, vi } from "vitest";

import { Graph } from "../../src/Graph";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import type { RecoveringWebGPUEngine } from "../../src/managers/RecoveringWebGPUEngine";

const NODES = Array.from({ length: 200 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = NODES.map((_, i) => ({ src: `n${String(i)}`, dst: `n${String((i * 7 + 1) % 200)}` }));

export const mounted: { graph: Graph; container: HTMLElement }[] = [];

/** Disposes every graph the test built. */
export function unmount(): void {
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
export function adapterSays(architecture: string): void {
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
export function countDevices(): () => number {
    const requested = vi.spyOn(GPUAdapter.prototype, "requestDevice");
    return () => requested.mock.calls.length;
}

/**
 * Opens a graph on WebGPU with its accelerator ready for a graph of any size.
 * @param policy - The acceleration policy.
 * @returns The graph.
 */
export async function open(policy: "auto" | "required" = "auto"): Promise<Graph> {
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
export function layoutOf(graph: Graph): SimulationLayoutEngine {
    const engine = graph.getLayoutManager().layoutEngine;
    assert.instanceOf(engine, SimulationLayoutEngine);
    return engine;
}

/**
 * Waits for a frame, the only thing a layout's batches move on.
 * @returns After the next frame.
 */
export async function nextFrame(): Promise<void> {
    await new Promise((resolve) => {
        requestAnimationFrame(resolve);
    });
}

/**
 * Starts a layout that will not come to rest during the test, and waits for its batches to land.
 * @param graph - The graph.
 */
export async function startLayout(graph: Graph): Promise<void> {
    await graph.addNodes(NODES);
    await graph.addEdges(EDGES);
    await graph.setLayout("forceatlas2", { maxIter: 1_000_000 });
    await landed(graph);
}

/**
 * Waits for a batch to land on the accelerator, after this call.
 * @param graph - The graph.
 */
export async function landed(graph: Graph): Promise<void> {
    const before = layoutOf(graph).landedBatchesPublished;
    while (!layoutOf(graph).isAccelerated || layoutOf(graph).landedBatchesPublished <= before) {
        await nextFrame();
    }
}

/**
 * Counts Babylon's reports of an uncaptured device error from now on.
 * @returns The number so far.
 */
export function countUncaptured(): () => number {
    const warn = vi.spyOn(Logger, "Warn");
    return () => warn.mock.calls.filter(([message]) => String(message).includes("uncaptured error")).length;
}

/**
 * The device the graph draws on.
 * @param graph - The graph.
 * @returns The device.
 */
export function deviceOf(graph: Graph): Promise<GPUDevice> {
    return (graph.engine as RecoveringWebGPUEngine).drawingDevice();
}

/**
 * Collects the layout's errors from now on.
 * @param graph - The graph.
 * @returns The errors so far.
 */
export function errorsOf(graph: Graph): Error[] {
    const errors: Error[] = [];
    graph.on("error", (event) => {
        errors.push(event.error);
    });
    return errors;
}
