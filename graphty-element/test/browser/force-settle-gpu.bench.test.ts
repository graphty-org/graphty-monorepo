/**
 * @file How long the default force layout takes to settle on a 20,000-node graph with an accelerator attached
 * (issue #9373): which engine draws it, whether it runs on the device, how many iterations it runs before it reports
 * rest, how many frames that took, and the wall time.
 *
 * Numbers go to the console as `[force-settle-gpu]` lines; nothing about speed is asserted. It runs only with
 * `GRAPHTY_BROWSER_GPU` set, because on the software renderer CI draws with it takes many minutes:
 *
 *     GRAPHTY_BROWSER_GPU=nvidia npx vitest run --project=browser-bench test/browser/force-settle-gpu.bench.test.ts
 */
import "../../src/graphty-element";
import "../../webgpu";

import { lfrGraph } from "@graphty/graph-samples/generators";
import { afterEach, assert, describe, it } from "vitest";

import { Graph, renderManagerOf } from "../../src/Graph";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { nextFrame } from "../helpers/real-input";

const GPU = ((import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "") !== "";

/** The issue's graph: Generate a graph > LFR benchmark, 20,000 nodes, communities of 400 to 1,500, mixing 0.03. */
const NODES = 20_000;

const mounted: { graph: Graph; container: HTMLElement }[] = [];

afterEach(() => {
    for (const { graph, container } of mounted.splice(0)) {
        graph.dispose();
        container.remove();
    }
});

describe.skipIf(!GPU)("the default force layout on 20,000 nodes with an accelerator", () => {
    it("settles on the device", async () => {
        const container = document.createElement("div");
        container.style.width = "1280px";
        container.style.height = "720px";
        document.body.appendChild(container);
        const graph = new Graph(container);
        mounted.push({ graph, container });
        graph.setRenderer("webgpu");
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

        const { ticks } = renderManagerOf(graph);
        const start = performance.now();
        const drawnFrom = ticks.drawn;
        await graph.setLayout("ngraph", { seed: 1 });
        const engine = graph.getLayoutManager().layoutEngine;
        assert.instanceOf(engine, SimulationLayoutEngine, "the default force layout is a simulation on the device");
        assert.isTrue(engine.isAccelerated, "the force layout runs on the accelerator");
        while (!engine.isSettled) {
            await nextFrame();
        }

        const seconds = (performance.now() - start) / 1000;
        const frames = ticks.drawn - drawnFrom;
        console.log(
            `[force-settle-gpu] engine=${engine.type} accelerated=${String(engine.isAccelerated)} ` +
                `iterations=${engine.iterationsDone} frames=${frames} seconds=${seconds.toFixed(1)} ` +
                `fps=${(frames / seconds).toFixed(1)}`,
        );
    });
});
