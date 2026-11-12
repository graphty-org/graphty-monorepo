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
 * @param maxIter - Iterations before it rests; by default more than any test waits for.
 */
export async function startLayout(graph: Graph, maxIter = 1_000_000): Promise<void> {
    await submitLayout(graph, maxIter);
    await landed(graph);
}

/**
 * Starts a layout that will not come to rest during the test, and waits for the accelerator to take
 * its first batch, without waiting for one to land.
 * @param graph - The graph.
 * @param maxIter - Iterations before it rests; by default more than any test waits for.
 */
export async function submitLayout(graph: Graph, maxIter = 1_000_000): Promise<void> {
    // Boxes and no arrowheads, not the default icosphere and arrows: on SwiftShader with two cores the
    // icosphere's 960 vertices a node cost about 70 ms of a 90 ms frame and the arrows another 15, and
    // the device queue runs some 300 frames behind the page, so every landing waited out 300 of those
    // frames. A frame is about 20 ms this way. Nothing here is about the shape or the arrows.
    await graph.getSession().styles.add({
        name: "box nodes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shape": "box" },
    });
    await graph.getSession().styles.add({
        name: "no arrows",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.arrowHead": "none" },
    });
    await graph.addNodes(NODES);
    await graph.addEdges(EDGES);
    await graph.setLayout("forceatlas2", { maxIter });
    while (!layoutOf(graph).isAccelerated || layoutOf(graph).iterationsDone === 0) {
        await nextFrame();
    }
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
 * Waits for the layout to copy a landing into the `rowPosition` texture, after this call: the ring is
 * attached a batch after a load, so this is the real moment the copy starts, which a fixed number of
 * landings only stands in for.
 * @param graph - The graph.
 */
export async function copied(graph: Graph): Promise<void> {
    const table = graph.getRowTable();
    assert.isNotNull(table);
    const before = table.copies;
    while (table.copies <= before) {
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

/**
 * Opens a graph on the given path with a running layout.
 * @param path - The render path.
 * @param maxIter - Iterations before the layout rests; by default more than any test waits for.
 * @returns The graph.
 */
export async function running(path: "objects" | "batched", maxIter?: number): Promise<Graph> {
    adapterSays("test-hardware");
    const graph = await open();
    graph.setRenderPath(path);
    await startLayout(graph, maxIter);
    assert.strictEqual(graph.rendererStatus?.layoutDevice, "shared");
    return graph;
}

/**
 * The worst relative difference between the `rowPosition` texture and the CPU copy, read with no frame
 * between them. The frame's publish reaches the CPU copy at the next frame's repack, so that repack is
 * run here.
 * @param graph - The graph.
 * @returns The worst difference over every lane, and over the w lanes alone.
 */
export async function textureDiff(graph: Graph): Promise<{ worst: number; wWorst: number }> {
    const table = graph.getRowTable();
    assert.isNotNull(table);
    graph.engine.stopRenderLoop();
    table.flush();
    const cpu = table.rowPosition.slice(0, 4 * table.rows);
    const gpu = (await table.positionTexture.readPixels()) as Float32Array;
    let worst = 0;
    let wWorst = 0;
    for (let i = 0; i < cpu.length; i++) {
        const d = Math.abs((gpu[i] ?? Number.NaN) - (cpu[i] ?? 0)) / Math.max(1, Math.abs(cpu[i] ?? 0));
        worst = Math.max(worst, d);
        wWorst = i % 4 === 3 ? Math.max(wWorst, d) : wWorst;
    }

    return { worst, wWorst };
}
