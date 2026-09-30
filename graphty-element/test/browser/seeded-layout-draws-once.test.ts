/**
 * A seeded layout draws the same graph every time it is loaded.
 *
 * Two element defects made the Layout/2D Spring and Layout/3D Spring stories draw one of two
 * pictures, depending on whether a render frame landed at a particular moment. Each case here
 * pins one of them without depending on frame timing.
 *
 * - A layout its own pre-steps settled was reheated when it was started, because starting it
 *   went through the same `running` setter a reader's "play" goes through.
 * - `viewMode = "2d"` assigned before the element was attached built the default layout at
 *   once, so it moved the data before the layout the consumer asked for replaced it.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test, vi } from "vitest";

import { operationQueueOf } from "../../src/Graph";
import { LayoutEngine } from "../../src/layout/LayoutEngine";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { DEFAULT_LAYOUT } from "../../src/session/commands/layout";
import { cleanupE2EGraph, createE2EGraph } from "../helpers/e2e-graph-setup";

const NODES = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "d" },
    { src: "d", dst: "e" },
];

const cleanups: (() => void)[] = [];

afterEach(() => {
    vi.restoreAllMocks();
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

describe("a seeded layout draws the same graph every load", () => {
    test("a layout its pre-steps settled is started, not reheated", async () => {
        const { graph } = await createE2EGraph({ nodes: NODES, edges: EDGES, enableAi: false });
        cleanups.push(() => {
            graph.dispose();
            cleanupE2EGraph();
        });
        graph.engine.stopRenderLoop();

        // What the frame loop does to a settled layout. With it stopped, the build that follows
        // is a false-to-true on `running`, which is the case that used to reheat.
        graph.setLayoutBehavior({ layout: { preSteps: 100 } });
        await operationQueueOf(graph).waitForCompletion();
        graph.getLayoutManager().running = false;
        const reheat = vi.spyOn(SimulationLayoutEngine.prototype, "reheat");

        await graph.setLayout("spring", { seed: 42, iterations: 5 });

        assert.strictEqual(reheat.mock.calls.length, 0, "a layout that was just built should not be reheated");
        const engine = graph.getLayoutManager().layoutEngine;
        assert.instanceOf(engine, SimulationLayoutEngine);
        assert.isTrue(engine.isSettled, "the pre-steps should have spent the whole budget");
    });

    test("an opening 2D view does not build the default layout the consumer replaced", async () => {
        const built: string[] = [];
        const get = LayoutEngine.get.bind(LayoutEngine);
        vi.spyOn(LayoutEngine, "get").mockImplementation((type: string, opts?: object) => {
            built.push(type);
            return get(type, opts);
        });

        const host = document.createElement("div");
        host.style.width = "400px";
        host.style.height = "300px";
        document.body.append(host);
        const element = document.createElement("graphty-element");
        element.style.display = "block";
        element.style.width = "100%";
        element.style.height = "100%";
        cleanups.push(() => {
            element.graph.dispose();
            host.remove();
        });

        element.viewMode = "2d";
        host.append(element);
        element.nodeData = NODES.map((n) => ({ ...n }));
        element.edgeData = EDGES.map((e) => ({ source: e.src, target: e.dst }));
        element.layout = "spring";
        element.layoutConfig = { seed: 42 };

        await new Promise((resolve) => setTimeout(resolve, 400));
        await operationQueueOf(element.graph).waitForCompletion();

        assert.instanceOf(element.graph.getLayoutManager().layoutEngine, SimulationLayoutEngine);
        assert.notInclude(
            built,
            DEFAULT_LAYOUT.engine,
            `the default layout should never be built (built: ${built.join(", ")})`,
        );
    });
});
