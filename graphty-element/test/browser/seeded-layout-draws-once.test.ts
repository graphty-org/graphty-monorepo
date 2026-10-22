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
 * - Edges that arrived after a simulation layout had stepped over the nodes alone were laid out
 *   from wherever those steps had left the nodes, so the picture depended on how many frames the
 *   machine drew between the two writes (the Layout/GPU Spring story under a busy capture).
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

/** More layout steps than a five-node Spring needs to settle. */
const STEP_CAP = 1000;

/**
 * Lays the path out with a seeded Spring, stepping it by hand, and reads where every node ended.
 * @param split - Write the edges after the layout has stepped over the nodes alone.
 * @returns Every node's position, in node order.
 */
async function springArrangement(split: boolean): Promise<number[]> {
    // The layout is set before the data arrives, as an element's attributes set it, so every node
    // starts unplaced and the seed alone places it.
    const { graph } = await createE2EGraph({ enableAi: false });
    cleanups.push(() => {
        graph.dispose();
        cleanupE2EGraph();
    });
    graph.engine.stopRenderLoop();
    graph.setLayoutBehavior({ layout: { preSteps: 0 } });
    await graph.setLayout("spring", { seed: 42 });
    const manager = graph.getLayoutManager();

    await graph.addNodes(NODES);
    if (split) {
        graph.getDataManager().getSnapshot();
        for (let i = 0; i < 5; i += 1) {
            manager.step();
        }
    }

    await graph.addEdges(EDGES);
    graph.getDataManager().getSnapshot();

    const engine = manager.layoutEngine;
    assert.instanceOf(engine, SimulationLayoutEngine);
    for (let i = 0; i < STEP_CAP && !engine.isSettled; i += 1) {
        manager.step();
    }

    assert.isTrue(engine.isSettled, "the layout settled");
    const nodes = [...graph.getDataManager().nodes.values()];
    return nodes.flatMap((node) => manager.getNodePosition(node) ?? []);
}

/** How long the element may take to connect and finish `Graph.init()`: the test's own budget. */
const INIT_BUDGET_MS = 10_000;

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

        await vi.waitFor(
            () => {
                assert.isTrue(element.graph.initialized, "the element finished initialising");
            },
            { timeout: INIT_BUDGET_MS },
        );
        await operationQueueOf(element.graph).waitForCompletion();

        assert.instanceOf(element.graph.getLayoutManager().layoutEngine, SimulationLayoutEngine);
        assert.notInclude(
            built,
            DEFAULT_LAYOUT.engine,
            `the default layout should never be built (built: ${built.join(", ")})`,
        );
    });

    test("edges written after the nodes were stepped draw what one write draws", async () => {
        const together = await springArrangement(false);
        const split = await springArrangement(true);

        assert.lengthOf(split, together.length);
        for (const [i, value] of split.entries()) {
            assert.closeTo(value, together[i], 1e-3, `coordinate ${String(i)}`);
        }
    });
});
