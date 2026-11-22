/**
 * @file Where a frame of a moving 20,000-node graph spends its time (issue #9420): the default force layout runs on
 * the accelerator over the issue's LFR graph, and after it has run a while the next frames are timed (`frame`, with
 * profiling off), then timed again with profiling on (`profiled-frame`), split into the
 * node walk (`nodeUpdate`), the edge walk (`edgeUpdate`), `Edge.update` and `Node.update`, on each render path.
 *
 * Numbers go to the console as `[moving-frame-cost]` lines; nothing about speed is asserted. It runs only with
 * `GRAPHTY_BROWSER_GPU` set, because the layout needs the accelerator:
 *
 *     GRAPHTY_BROWSER_GPU=nvidia npx vitest run --project=browser-bench test/browser/moving-frame-cost.bench.test.ts
 */
import "../../src/graphty-element";
import "../../webgpu";

import { lfrGraph } from "@graphty/graph-samples/generators";
import { afterEach, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { nextFrame } from "../helpers/real-input";

const GPU = ((import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "") !== "";

const NODES = 20_000;
/** Frames the layout runs before the timed ones, so its batches have ramped up. */
const WARM_FRAMES = 15;
const TIMED_FRAMES = 20;

const mounted: { graph: Graph; container: HTMLElement }[] = [];

afterEach(() => {
    for (const { graph, container } of mounted.splice(0)) {
        graph.dispose();
        container.remove();
    }
});

async function measure(path: RenderPath): Promise<void> {
    const container = document.createElement("div");
    container.style.width = "1280px";
    container.style.height = "720px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    mounted.push({ graph, container });
    graph.setRenderer("webgpu");
    graph.setRenderPath(path);
    const initialized = graph.init();
    void graph.acceleration.start();
    await initialized;
    await graph.acceleration.ready();

    const sample = lfrGraph({
        n: NODES,
        minDegree: 5,
        maxDegree: 50,
        degreeExponent: 2,
        communityExponent: 1,
        minCommunity: 400,
        maxCommunity: 1500,
        mixing: 0.03,
        seed: 1,
    });
    await graph.addNodes(Array.from({ length: NODES }, (_, id) => ({ id })));
    await graph.addEdges(Array.from(sample.src, (src, i) => ({ src, dst: sample.dst[i] })));
    await graph.setLayout("random", { seed: 1 });
    await graph.waitForStableFrame();

    await graph.setLayout("ngraph", { seed: 1 });
    for (let i = 0; i < WARM_FRAMES; i++) {
        await nextFrame();
    }

    // the frame as a consumer gets it, with profiling off: profiling times every edge, which costs a frame too
    const plainStart = performance.now();
    for (let i = 0; i < TIMED_FRAMES; i++) {
        await nextFrame();
    }
    const plainMs = (performance.now() - plainStart) / TIMED_FRAMES;

    const stats = graph.getStatsManager();
    stats.enableProfiling();
    stats.resetMeasurements();
    stats.nodeUpdate.fetchNewFrame();
    const nodeBefore = stats.nodeUpdate.total;
    const edgeBefore = stats.edgeUpdate.total;
    const start = performance.now();
    for (let i = 0; i < TIMED_FRAMES; i++) {
        await nextFrame();
    }
    const frameMs = (performance.now() - start) / TIMED_FRAMES;
    const cpu = new Map(stats.getSnapshot().cpu.map((m) => [m.label, m]));
    const per = (label: string): string => {
        const m = cpu.get(label);
        return m === undefined
            ? "-"
            : `${(m.total / TIMED_FRAMES).toFixed(1)}ms/${String(Math.round(m.count / TIMED_FRAMES))}`;
    };
    console.log(
        `[moving-frame-cost] path=${path} frame=${plainMs.toFixed(1)}ms profiled-frame=${frameMs.toFixed(1)}ms ` +
            `nodeUpdate=${((stats.nodeUpdate.total - nodeBefore) / TIMED_FRAMES).toFixed(1)}ms ` +
            `edgeUpdate=${((stats.edgeUpdate.total - edgeBefore) / TIMED_FRAMES).toFixed(1)}ms ` +
            `Node.update=${per("Node.update")} Edge.update=${per("Edge.update")} ` +
            `Graph.update=${per("Graph.update")} Graph.updateManager=${per("Graph.updateManager")}`,
    );
    stats.disableProfiling();
}

describe.skipIf(!GPU)("a frame of a moving 20,000-node graph", () => {
    it("on the objects path", async () => {
        await measure("objects");
    });

    it("on the batched path", async () => {
        await measure("batched");
    });
});
