/**
 * @file The render loop on WebGPU keeps one frame in flight under renderPath "batched".
 *
 * Without that, the loop queues a frame every tick however long the GPU takes to draw one, and a
 * backlog of many frames builds on the device queue. Everything that reads from the GPU waits
 * behind it: a buffer map, the node under the pointer, the GPU layout's position readback (so the
 * layout stops moving). On SwiftShader the default scene's frames already run hundreds behind the
 * page. Under renderPath "batched" the loop skips a tick while the last frame's
 * `queue.onSubmittedWorkDone()` is unresolved, the WebGPU twin of the WebGL frame fence; under
 * "objects" it draws as it always has.
 *
 * Runs only when `GRAPHTY_BROWSER_GPU` names a flag set (see `vitest.config.ts`). Every assertion
 * is a count of frames drawn, never a time.
 */

import "../../src/graphty-element";
import "../../webgpu";

import type { WebGPUEngine } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import type { RenderManager } from "../../src/managers/RenderManager";
import { hover, nextFrame } from "../helpers/real-input";

/** Which Chromium flag set the run asked for; empty when it asked for none. */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

/**
 * A ring of nodes, each joined to one further on.
 * @param count - How many nodes.
 * @returns The nodes and edges.
 */
function ring(count: number): { nodes: { id: string }[]; edges: { src: string; dst: string }[] } {
    const nodes = Array.from({ length: count }, (_, i) => ({ id: `n${String(i)}` }));
    const edges = nodes.map((_, i) => ({ src: `n${String(i)}`, dst: `n${String((i * 7 + 1) % count)}` }));
    return { nodes, edges };
}

/**
 * Enough default (icosphere) nodes that, on SwiftShader, a frame costs the GPU far longer than a
 * tick: unpaced, the device queue then runs many frames behind the page.
 */
const HEAVY = 4000;

const mounted: { graph: Graph; container: HTMLElement }[] = [];

afterEach(() => {
    for (const { graph, container } of mounted.splice(0)) {
        graph.dispose();
        container.remove();
    }
});

/**
 * Opens a graph on WebGPU, drawing every tick, with nodes laid out where they stand.
 * @param path - The render path.
 * @param accelerate - Whether to attach the GPU layout on the renderer's device.
 * @param nodes - How many nodes.
 * @returns The graph.
 */
async function open(path: "batched" | "objects", accelerate = false, nodes = 300): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    mounted.push({ graph, container });
    graph.setRenderer("webgpu");
    if (accelerate) {
        graph.acceleration.setPolicy("required");
        graph.acceleration.setMinNodes(0);
    }

    const initialized = graph.init();
    if (accelerate) {
        void graph.acceleration.start();
    }

    await initialized;
    assert.strictEqual(graph.rendererStatus?.active, "webgpu", graph.rendererStatus?.reason ?? "");
    if (accelerate) {
        await graph.acceleration.ready();
    }

    graph.setRenderPath(path);
    // Drawing every tick, so a still graph keeps the GPU as busy as it can.
    await graph.setRenderSettings({ onDemand: false });
    const data = ring(nodes);
    await graph.addNodes(data.nodes);
    await graph.addEdges(data.edges);
    return graph;
}

/**
 * The graph's render manager.
 * @param graph - The graph.
 * @returns Its render manager.
 */
function renderManagerOf(graph: Graph): RenderManager {
    return (graph as unknown as { renderManager: RenderManager }).renderManager;
}

/**
 * Waits until the loop has drawn this many more frames.
 * @param graph - The graph.
 * @param count - How many.
 */
async function drawn(graph: Graph, count: number): Promise<void> {
    const { ticks } = renderManagerOf(graph);
    const until = ticks.drawn + count;
    while (ticks.drawn < until) {
        await nextFrame();
    }
}

/**
 * Makes the device's `onSubmittedWorkDone` answer only when told to, as a GPU that is still busy.
 * @param graph - The graph.
 * @returns What lets every held answer through, and the real call back.
 */
function holdWorkDone(graph: Graph): () => void {
    const { queue } = (graph.engine as WebGPUEngine)._device;
    const real = queue.onSubmittedWorkDone.bind(queue);
    const held: (() => void)[] = [];
    queue.onSubmittedWorkDone = (): Promise<undefined> =>
        new Promise((resolve) => {
            held.push(() => {
                resolve(undefined);
            });
        });
    return () => {
        queue.onSubmittedWorkDone = real;
        for (const release of held.splice(0)) {
            release();
        }
    };
}

describe.skipIf(ADAPTER === "")(`WebGPU frame pacing (${ADAPTER})`, () => {
    it("draws no frame while the last one is unfinished under batched, and resumes once it is", async () => {
        const graph = await open("batched");
        await drawn(graph, 3);
        const { ticks } = renderManagerOf(graph);
        const release = holdWorkDone(graph);
        // The next frame drawn is the one whose work is held (the frame in flight before it finishes).
        await drawn(graph, 1);
        const held = ticks.drawn;
        const behind = ticks.gpuBehind;
        // Ten of the loop's own ticks, each a chance to draw.
        while (ticks.gpuBehind < behind + 10) {
            await nextFrame();
        }

        assert.strictEqual(ticks.drawn, held, "no frame is drawn while the last frame's work is unfinished");
        release();
        await drawn(graph, 2);
    });

    it("draws unpaced under objects, as before", async () => {
        const graph = await open("objects");
        await drawn(graph, 3);
        const { ticks } = renderManagerOf(graph);
        const release = holdWorkDone(graph);
        const behind = ticks.gpuBehind;
        await drawn(graph, 10);
        assert.strictEqual(ticks.gpuBehind, behind, "the objects path never waits on WebGPU work");
        release();
    });

    it("answers a 256-byte map within 2 frames once a still scene has had time to fill the queue", async () => {
        const graph = await open("batched", false, HEAVY);
        // Unpaced, these frames sit on the device queue and a map waits for all of them.
        await drawn(graph, 60);
        const buffer = (graph.engine as WebGPUEngine)._device.createBuffer({
            size: 256,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
        const { ticks } = renderManagerOf(graph);
        const before = ticks.drawn;
        await buffer.mapAsync(GPUMapMode.READ);
        const during = ticks.drawn - before;
        buffer.destroy();
        assert.isAtMost(during, 2, "the map waited for at most the frame in flight and the next");
    });

    it("hovers a node with a real pointer on the still scene", async () => {
        const graph = await open("batched", false, HEAVY);
        await graph.setLayout("circular");
        await graph.waitForStableFrame();
        await drawn(graph, 30);
        await hoverAndAnswer(graph);
    });

    it("moves the GPU layout and hovers a node while it runs", async () => {
        const graph = await open("batched", true, HEAVY);
        await graph.setLayout("forceatlas2", { maxIter: 1_000_000 });
        const engine = graph.getLayoutManager().layoutEngine;
        assert.instanceOf(engine, SimulationLayoutEngine);
        while (!engine.isAccelerated || engine.landedBatchesPublished === 0) {
            await nextFrame();
        }

        const sample = (): number[] => {
            const point = { x: 0, y: 0, z: 0 };
            return [0, 1, 2].flatMap((index) => {
                graph.getDataManager().positions.read(index, point);
                return [point.x, point.y];
            });
        };
        const first = sample();
        const landed = engine.landedBatchesPublished;
        while (engine.landedBatchesPublished < landed + 2) {
            await nextFrame();
        }

        assert.notDeepEqual(sample(), first, "the layout's positions moved between two samples");
        await hoverAndAnswer(graph);
        assert.isFalse(engine.isSettled, "the layout was still running when hover answered");
    });
});

/**
 * Points a real mouse at node n0, following it while a layout moves it, and waits for the graph to
 * name it hovered, within a bounded number of frames drawn.
 * @param graph - The graph.
 */
async function hoverAndAnswer(graph: Graph): Promise<void> {
    const { container } = mounted.find((entry) => entry.graph === graph) ?? {};
    assert.isDefined(container);
    const node = graph.getNode("n0");
    assert.isDefined(node);
    const scaling = graph.scene.getEngine().getHardwareScalingLevel();
    const { ticks } = renderManagerOf(graph);
    const before = ticks.drawn;
    const { selection } = graph.getSession();
    while (selection.hovered !== "n0") {
        const screen = graph.worldToScreen(node.drawnWorldPosition);
        await hover(container, { x: screen.x * scaling, y: screen.y * scaling });
        await nextFrame();
    }

    assert.isAtMost(ticks.drawn - before, 8, "hover answered within a few frames drawn");
}
