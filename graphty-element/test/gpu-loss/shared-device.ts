/**
 * @file What the shared-device test files share: a graph opened on WebGPU with its layout's
 * accelerator, the adapter made to say what it is, and the readers of devices, batches and errors.
 * Importing it registers an afterEach that disposes every graph a test opened.
 */

import "../../src/graphty-element";
import "../../webgpu";

import { afterEach, assert, vi } from "vitest";

import { Graph } from "../../src/Graph";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { mounted, unmount } from "./device-helpers";

export { countUncaptured, deviceOf, mounted, unmount } from "./device-helpers";

/** Nodes in the graph a layout runs on, unless a test asks for more. */
const NODE_COUNT = 200;

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
 * @param renderer - The renderer; WebGL draws on no device the accelerator can share.
 * @returns The graph.
 */
export async function open(
    policy: "auto" | "required" = "auto",
    renderer: "webgpu" | "webgl" = "webgpu",
): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    mounted.push({ graph, container });
    graph.setRenderer(renderer);
    graph.acceleration.setPolicy(policy);
    graph.acceleration.setMinNodes(0);
    const initialized = graph.init();
    void graph.acceleration.start();
    await initialized;
    assert.strictEqual(graph.rendererStatus?.active, renderer, graph.rendererStatus?.reason ?? "");
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
 * @param nodeCount - Nodes in the graph.
 */
export async function startLayout(graph: Graph, maxIter = 1_000_000, nodeCount = NODE_COUNT): Promise<void> {
    await submitLayout(graph, maxIter, undefined, nodeCount);
    await landed(graph);
}

/**
 * Starts a layout that will not come to rest during the test, and waits for the accelerator to take
 * its first batch, without waiting for one to land.
 * @param graph - The graph.
 * @param maxIter - Iterations before it rests; by default more than any test waits for.
 * @param seed - The layout's seed, for a test that compares two runs; unseeded by default.
 * @param nodeCount - Nodes in the graph, each with one edge.
 */
export async function submitLayout(
    graph: Graph,
    maxIter = 1_000_000,
    seed?: number,
    nodeCount = NODE_COUNT,
): Promise<void> {
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
    const nodes = Array.from({ length: nodeCount }, (_, i) => ({ id: `n${String(i)}` }));
    await graph.addNodes(nodes);
    await graph.addEdges(nodes.map((_, i) => ({ src: `n${String(i)}`, dst: `n${String((i * 7 + 1) % nodeCount)}` })));
    // Rest comes from `maxIter` alone: at the default settle threshold a run whose batches ramp up converges within a few
    // landings, and a test still waiting for one would wait forever.
    const options = { maxIter, settleThreshold: 1e-12 };
    await graph.setLayout("forceatlas2", seed === undefined ? options : { ...options, seed });
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

/** Batches a layout keeps in flight, plus one: a row told to its ring is sent again over that many landings at most. */
const TOLD_LANDINGS = 5;
/** Landings {@link toldRowsLanded} waits through before it gives up and lets the test's assertions say why. */
const TOLD_GIVE_UP = 40;

/**
 * Waits until the rows a test's own setup told the layout's ring (a style's first paints, measured a frame or two
 * apart) have stopped being sent again: no row was told over the landings of every batch that could have been in
 * flight. Under load more batches are in flight and a paint lands later, so a fixed count of landings is not
 * enough. A row told every frame never goes quiet: the wait then ends after {@link TOLD_GIVE_UP} landings.
 * @param graph - The graph.
 */
export async function toldRowsLanded(graph: Graph): Promise<void> {
    const table = graph.getRowTable();
    assert.isNotNull(table);
    let quiet = 0;
    for (let i = 0; i < TOLD_GIVE_UP && quiet < TOLD_LANDINGS; i++) {
        const told = table.rowsTold;
        await landed(graph);
        quiet = table.rowsTold === told ? quiet + 1 : 0;
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
 * @param renderer - The renderer: WebGPU shares the layout's device, WebGL does not.
 * @param nodeCount - Nodes in the graph.
 * @returns The graph.
 */
export async function running(
    path: "objects" | "batched",
    maxIter?: number,
    renderer: "webgpu" | "webgl" = "webgpu",
    nodeCount = NODE_COUNT,
): Promise<Graph> {
    adapterSays("test-hardware");
    const graph = await open("auto", renderer);
    graph.setRenderPath(path);
    await startLayout(graph, maxIter, nodeCount);
    assert.strictEqual(graph.rendererStatus?.layoutDevice, renderer === "webgpu" ? "shared" : "separate");
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
