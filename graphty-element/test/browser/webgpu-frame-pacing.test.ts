/**
 * @file The render loop on WebGPU keeps at most three frames in flight, on either render path.
 *
 * Without that, the loop queues a frame every tick however long the GPU takes to draw one, and a
 * backlog of many frames builds on the device queue. Everything that reads from the GPU waits
 * behind it: a buffer map, the node under the pointer, the GPU layout's position readback (so the
 * layout stops moving). SwiftShader draws a test scene far faster than a real card draws a million
 * rows, so the tests that need a backlog add a fixed compute pass to every frame drawn
 * ({@link loadEveryFrame}): unpaced, the device queue then runs many frames behind the page. On
 * both render paths the loop skips a tick while three frames' `queue.onSubmittedWorkDone()` are
 * unresolved, the WebGPU twin of the WebGL frame fences. Unpaced, the "objects" path fell seconds
 * behind a real card (issue #9520).
 *
 * Runs only when `GRAPHTY_BROWSER_GPU` names a flag set (see `vitest.config.ts`); CI runs it with
 * `swiftshader-unthrottled`, the frame rate unlimited as on the benchmark's real card, because with
 * the limit on Chromium holds the page's frames to the GPU's pace and no queue of frames builds.
 * Every assertion is a count of frames drawn, never a time.
 */

import "../../src/graphty-element";
import "../../webgpu";

import type { WebGPUEngine } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import { Graph, renderManagerOf } from "../../src/Graph";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import type { Node } from "../../src/Node";
import type { HoverDrawn } from "../../src/session/types";
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
 * Nodes in the GPU layout case: enough that, unpaced, the layout's batches wait behind the queue and
 * hover never answers. At 300 an unpaced loop still passed that case; at 4000 each SwiftShader frame
 * cost about 250 ms, and the file took six minutes of its CI shard (issue #10453).
 */
const LAYOUT_NODES = 1000;

/** Frames drawn within which a real pointer's hover must answer. */
const HOVER_FRAMES = 8;

/** Frames drawn within which two GPU layout batches must land: a readback waits for at most three. */
const LAYOUT_FRAMES = 20;

/** Loop count of the compute pass {@link loadEveryFrame} adds: on SwiftShader, many ticks of work. */
const LOAD_ITERATIONS = 20_000;

/**
 * Adds a fixed compute pass to every frame the graph draws, submitted with the frame, so each
 * frame costs the GPU much longer than a loop tick, as a million-row scene does on a real card.
 * @param graph - The graph.
 */
function loadEveryFrame(graph: Graph): void {
    const device = (graph.engine as WebGPUEngine)._device;
    const layout = device.createBindGroupLayout({
        entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }],
    });
    const pipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
        compute: {
            module: device.createShaderModule({
                code: `@group(0) @binding(0) var<storage, read_write> out: array<f32>;
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id: vec3u) {
    var x = f32(id.x);
    for (var i = 0u; i < ${String(LOAD_ITERATIONS)}u; i++) { x = fract(x * 1.0001 + 0.5); }
    out[id.x] = x;
}`,
            }),
            entryPoint: "main",
        },
    });
    const buffer = device.createBuffer({ size: 4 * 64 * 64, usage: GPUBufferUsage.STORAGE });
    const bindGroup = device.createBindGroup({
        layout,
        entries: [{ binding: 0, resource: { buffer } }],
    });
    graph.scene.onAfterRenderObservable.add(() => {
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(64);
        pass.end();
        device.queue.submit([encoder.finish()]);
    });
}

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

/**
 * Makes the device's `onSubmittedWorkDone` answer two frames late: each answer comes when the
 * frame after next asks, as Chromium's answer can come a refresh after the frame, with the GPU
 * keeping up all the while.
 * @param graph - The graph.
 * @returns What puts the real call back.
 */
function answerTwoFramesLate(graph: Graph): () => void {
    const { queue } = (graph.engine as WebGPUEngine)._device;
    const real = queue.onSubmittedWorkDone.bind(queue);
    const pending: (() => void)[] = [];
    queue.onSubmittedWorkDone = (): Promise<undefined> =>
        new Promise((resolve) => {
            pending.push(() => {
                resolve(undefined);
            });
            if (pending.length > 2) {
                pending.shift()?.();
            }
        });
    return () => {
        queue.onSubmittedWorkDone = real;
        for (const release of pending.splice(0)) {
            release();
        }
    };
}

/** Both render paths, which share one pacing gate. */
const PATHS = ["batched", "objects"] as const;

describe.skipIf(ADAPTER === "")(`WebGPU frame pacing (${ADAPTER})`, () => {
    it.each(PATHS)(
        "draws three frames while the first is unfinished under %s, none past three, and resumes",
        async (path) => {
            const graph = await open(path);
            await drawn(graph, 3);
            const { ticks } = renderManagerOf(graph);
            const release = holdWorkDone(graph);
            const held = ticks.drawn;
            // Twelve of the loop's own ticks, each a chance to draw: unpaced, each draws a frame.
            // The frame drawn before the hold may still wait on its real answer, so the last held frame
            // can come late; a cap of ticks ends a loop that never draws it.
            const start = ticks.drawn + ticks.gpuBehind;
            const passed = (): number => ticks.drawn + ticks.gpuBehind - start;
            while ((passed() < 12 || ticks.drawn - held < 3) && passed() < 200) {
                await nextFrame();
            }

            assert.strictEqual(
                ticks.drawn - held,
                3,
                "three frames are drawn before their unfinished work holds the loop",
            );
            release();
            await drawn(graph, 2);
        },
    );

    // A skipped tick draws nothing, so Chromium sends the next one only at its next refresh: with
    // one frame allowed in flight, every batched WebGPU frame waited a whole refresh, about 18 ms,
    // for an answer that came a refresh late (issue #9491). Answers two frames late cost no tick.
    it.each(PATHS)("skips no tick under %s while each frame's answer comes two frames late", async (path) => {
        const graph = await open(path);
        await drawn(graph, 3);
        const { ticks } = renderManagerOf(graph);
        const restore = answerTwoFramesLate(graph);
        // Three frames drawn under the late answers: by then the frame drawn before them, which
        // waits on the real GPU, has been answered, and every answer from here on is a late one.
        // Bounded by ticks, so a loop that waits on every late answer fails rather than hanging.
        const warmFrom = ticks.drawn;
        const warmBehind = ticks.gpuBehind;
        while (ticks.drawn < warmFrom + 3 && ticks.gpuBehind < warmBehind + 200) {
            await nextFrame();
        }

        const drawnFrom = ticks.drawn;
        const behindFrom = ticks.gpuBehind;
        while (ticks.drawn < drawnFrom + 20 && ticks.gpuBehind < behindFrom + 20) {
            await nextFrame();
        }

        restore();
        assert.strictEqual(ticks.gpuBehind - behindFrom, 0, "no tick waited on a GPU that was not behind");
        assert.isAtLeast(ticks.drawn - drawnFrom, 20, "the loop drew a frame every tick");
    });

    it.each(PATHS)("lets an on-demand loop go idle on a still graph under %s", async (path) => {
        const graph = await open(path);
        await drawn(graph, 3);
        // Placed at once: waiting for the default force layout to settle the ring cost about 5 s
        // of the case, and the loop under test rests or not whatever made the graph still.
        await graph.setLayout("circular");
        await graph.setRenderSettings({ onDemand: true });
        await graph.waitForStableFrame();
        const { ticks } = renderManagerOf(graph);
        // Settled, the loop rests: ten resting ticks within 20 frames drawn, or it never rests. A
        // fence observer added per frame read as a new frame waiter and kept it drawing every tick.
        const drawnFrom = ticks.drawn;
        const restedFrom = ticks.rested;
        while (ticks.rested < restedFrom + 10 && ticks.drawn < drawnFrom + 20) {
            await nextFrame();
        }

        assert.isAtLeast(ticks.rested, restedFrom + 10, "a still on-demand graph stops drawing");
    });

    it("answers a 256-byte map within 4 frames once a still scene has had time to fill the queue", async () => {
        // The default 300 nodes: the added compute pass, not the scene, is what fills the queue
        // (unpaced, the map waited for 269 frames drawn at 300 nodes and 256 at 4000).
        const graph = await open("batched");
        loadEveryFrame(graph);
        // Unpaced, these frames sit on the device queue and a map waits for all of them (27 frames
        // drawn on SwiftShader with the frame rate unlimited, where Chromium does not hold the
        // page's frames to the GPU's pace).
        await drawn(graph, 60);
        const device = (graph.engine as WebGPUEngine)._device;
        const source = device.createBuffer({ size: 256, usage: GPUBufferUsage.COPY_SRC });
        const buffer = device.createBuffer({ size: 256, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
        const { ticks } = renderManagerOf(graph);
        const before = ticks.drawn;
        // A readback as the element makes one: a copy queued behind whatever is on the queue, then a map.
        const encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(source, 0, buffer, 0, 256);
        device.queue.submit([encoder.finish()]);
        await buffer.mapAsync(GPUMapMode.READ);
        const during = ticks.drawn - before;
        buffer.destroy();
        source.destroy();
        assert.isAtMost(during, 4, "the map waited for at most the three frames in flight and the next");
    });

    it("hovers a node with a real pointer on the still scene under batched", async () => {
        // The default 300 nodes: unpaced, the hover's GPU pick waits behind the queue and never answers.
        const graph = await open("batched");
        await graph.setLayout("circular");
        await graph.waitForStableFrame();
        loadEveryFrame(graph);
        await drawn(graph, 30);
        await hoverAndAnswer(graph);
    });

    // Under "objects" the pick is a ray walk on the page, no GPU readback, so hover answers however
    // far behind the queue runs, and an unpaced loop passed a hover-only case at every size (issue
    // #10458). What pacing holds there is the queue itself: count the frames it has not finished.
    it("keeps at most three frames on the queue and reads nothing back while hovering under objects", async () => {
        const graph = await open("objects");
        await graph.setLayout("circular");
        await graph.waitForStableFrame();
        loadEveryFrame(graph);
        const engine = graph.engine as WebGPUEngine;
        const { queue } = engine._device;
        // Asked at the end of each frame drawn, after the loop's own fence: unanswered, that frame is
        // still on the queue. A tick the loop skips ends a frame too, with nothing submitted.
        const { ticks } = renderManagerOf(graph);
        let counted = ticks.drawn;
        let queued = 0;
        let deepest = 0;
        const probe = engine.onEndFrameObservable.add(() => {
            if (ticks.drawn === counted) {
                return;
            }

            counted = ticks.drawn;
            queued++;
            deepest = Math.max(deepest, queued);
            const done = (): void => {
                queued--;
            };
            queue.onSubmittedWorkDone().then(done, done);
        });
        // A readback would wait behind every frame queued: the objects path's hover makes none.
        let maps = 0;
        const realMap = GPUBuffer.prototype.mapAsync;
        GPUBuffer.prototype.mapAsync = function (this: GPUBuffer, ...args: Parameters<GPUBuffer["mapAsync"]>) {
            maps++;
            return realMap.apply(this, args);
        };
        try {
            // Unpaced, these frames pile up on the queue (27 behind on SwiftShader in the map case above).
            await drawn(graph, 30);
            await hoverAndAnswer(graph);
        } finally {
            GPUBuffer.prototype.mapAsync = realMap;
            engine.onEndFrameObservable.remove(probe);
        }

        assert.isAtMost(deepest, 3, "no more than three frames were ever unfinished on the queue");
        assert.strictEqual(maps, 0, "hover read nothing back from the GPU");
    });

    it("moves the GPU layout and hovers a node while it runs", async () => {
        const graph = await open("batched", true, LAYOUT_NODES);
        // The layout must still be running when hover answers, so neither its budget nor its settle
        // rule may end it within the test: a batch computes at most 128 iterations and the test
        // draws fewer than a hundred frames, far short of either count. With the default settle
        // window (ten quiet iterations) the 4000-node ring settled within the first 30 frames on
        // an NVIDIA card, which lands a batch every frame, and no third batch ever landed (issue
        // #10012); SwiftShader lands one only every few frames and was still running.
        await graph.setLayout("forceatlas2", { maxIter: 1_000_000, settleWindow: 1_000_000 });
        const engine = graph.getLayoutManager().layoutEngine;
        assert.instanceOf(engine, SimulationLayoutEngine);
        const { ticks } = renderManagerOf(graph);
        const opened = ticks.drawn;
        // Bounded by frames drawn: unpaced, the first batch waits behind the queue and never lands.
        while ((!engine.isAccelerated || engine.landedBatchesPublished === 0) && ticks.drawn - opened < LAYOUT_FRAMES) {
            await nextFrame();
        }

        assert.isTrue(engine.isAccelerated, "the layout runs on the GPU");
        assert.isAbove(engine.landedBatchesPublished, 0, "the first layout batch landed within the frames allowed");

        const sample = (): number[] => {
            const point = { x: 0, y: 0, z: 0 };
            return [0, 1, 2].flatMap((index) => {
                graph.getDataManager().positions.read(index, point);
                return [point.x, point.y];
            });
        };
        loadEveryFrame(graph);
        // Let an unpaced loop fill the queue before sampling.
        await drawn(graph, 30);
        const first = sample();
        const landed = engine.landedBatchesPublished;
        const before = ticks.drawn;
        while (engine.landedBatchesPublished < landed + 2 && ticks.drawn - before < LAYOUT_FRAMES) {
            await nextFrame();
        }

        assert.isAtLeast(
            engine.landedBatchesPublished,
            landed + 2,
            "two layout batches landed within the frames allowed",
        );
        assert.notDeepEqual(sample(), first, "the layout's positions moved between two samples");
        await hoverAndAnswer(graph, true);
        assert.isFalse(engine.isSettled, "the layout was still running when hover answered");
    });
});

/**
 * The node standing furthest on screen from every other node, within the canvas.
 *
 * Hover answers the node drawn in front at the pointer, so a node a nearer one covers is never the
 * answer at its own center: in a 4000-node cloud a dozen nodes stand within 6 px of any one, some
 * nearer the camera, and pointing at a fixed node (n0) hovered the node covering it (issue #6548).
 * The node with the most room around it is covered by none on a still scene. A running layout
 * takes that room away within a landing ({@link hoverAndAnswer}).
 * @param graph - The graph.
 * @param container - The graph's container.
 * @returns The node.
 */
function clearestNode(graph: Graph, container: HTMLElement): Node {
    const { width, height } = container.getBoundingClientRect();
    const margin = 20;
    const nodes = graph.getNodes();
    const screens = nodes.map((node) => graph.worldToScreen(node.drawnWorldPosition));
    let best: Node | undefined;
    let room = -1;
    screens.forEach((a, i) => {
        if (a.x < margin || a.y < margin || a.x > width - margin || a.y > height - margin) {
            return;
        }

        let nearest = Infinity;
        for (const [j, b] of screens.entries()) {
            if (j !== i) {
                nearest = Math.min(nearest, Math.hypot(a.x - b.x, a.y - b.y));
            }
        }

        if (nearest > room) {
            room = nearest;
            best = nodes[i];
        }
    });
    assert.isDefined(best, "a node is drawn inside the canvas");
    return best;
}

/**
 * Points a real mouse at the node with the most room around it ({@link clearestNode}), following
 * it while a layout moves it, waits for the graph to name a node hovered within
 * {@link HOVER_FRAMES} frames drawn, and checks the pointer lies inside that node's disc as the
 * hover answer reports it drawn in the frame it was read from (`selection:hover-changed`'s
 * `drawn`).
 *
 * On a still scene the answer must be that node. While a layout runs it may be another: each
 * landing moves every node a few pixels and reshuffles which ones stand nearest, so the node with
 * the most room when chosen has another within 2 px of it a landing later, and hover rightly names
 * whichever is drawn in front at the pointer (issue #6548). Where the nodes stand when the answer
 * arrives says nothing about that: on WebGPU it arrives a landing or two after the frame it read.
 * Nor is the answer always to the newest move: a read that lands after the next move was
 * dispatched is still heard (#8016), and with three frames in flight that is common, so the
 * pointer checked is the one of the moves made that the drawn disc holds, if any.
 * @param graph - The graph.
 * @param moving - Whether a layout is moving the nodes.
 */
async function hoverAndAnswer(graph: Graph, moving = false): Promise<void> {
    const { container } = mounted.find((entry) => entry.graph === graph) ?? {};
    assert.isDefined(container);
    const node = clearestNode(graph, container);
    const scaling = graph.scene.getEngine().getHardwareScalingLevel();
    const { ticks } = renderManagerOf(graph);
    const before = ticks.drawn;
    const session = graph.getSession();
    const { selection } = session;
    // Where each move the page has dispatched put the pointer: the answer is to one of them.
    const pointers: { x: number; y: number }[] = [];
    let answer: { id: string | number; drawn?: HoverDrawn; pointers: { x: number; y: number }[] } | undefined;
    const stop = session.on("selection:hover-changed", ({ after, drawn }) => {
        if (answer === undefined && after !== null && pointers.length > 0) {
            answer = { id: after, drawn, pointers: [...pointers] };
        }
    });
    // Bounded by frames drawn, so an unpaced loop fails here rather than hanging.
    while (selection.hovered === null && ticks.drawn - before <= HOVER_FRAMES) {
        const screen = graph.worldToScreen(node.drawnWorldPosition);
        // Recorded before the move is dispatched: under "objects" the pick is synchronous, so the
        // answer arrives inside `hover` itself and was dropped as answering no move (issue #9584).
        pointers.push(screen);
        await hover(container, { x: screen.x * scaling, y: screen.y * scaling });
        await nextFrame();
    }

    stop();
    assert.isDefined(answer, "hover answered within a few frames drawn");
    if (!moving) {
        assert.strictEqual(answer.id, node.id, "hover named the node pointed at");
    }

    const { drawn } = answer;
    assert.isDefined(drawn, "the hover answer says where its node was drawn");
    assert.isAtMost(
        Math.min(...answer.pointers.map((pointer) => Math.hypot(drawn.x - pointer.x, drawn.y - pointer.y))),
        drawn.radius,
        `the pointer lies inside the drawn disc of ${String(answer.id)}`,
    );
}
