/**
 * @file What it costs to draw a whole graph, and that a clear gives all of it back (issues #235
 * and #441).
 *
 * Nothing used to fail when a change made every edge cost another draw call, another mesh or
 * another material, or when loading and clearing a graph left materials behind. Arrowheads were
 * one mesh and one ShaderMaterial per edge for ten months (issue #25) and no test noticed.
 *
 * This file pins COUNTS, never time, so a busy runner cannot fail it:
 *
 * - Two fixed graphs, drawn in the default style under a fixed layout, must not exceed the draw
 *   calls, active meshes, scene meshes, materials and textures recorded in
 *   render-budget.baseline.json by more than BUDGET_MARGIN. Frame time is printed for anyone
 *   reading the log, and never asserted.
 * - Load, clear, load, clear must return the scene to exactly the meshes, materials and textures
 *   it started with.
 * - Draw calls and materials must not grow with the number of edges.
 *
 * When a change lowers a count on purpose (instanced edges, issue #419, will), or raises one and
 * the cost is accepted, rewrite the baseline and commit it:
 *
 *     GRAPHTY_UPDATE_RENDER_BUDGET=1 npx vitest run --project=browser test/browser/render-budget.test.ts
 */
import { commands } from "@vitest/browser/context";
import { afterEach, assert, describe, it } from "vitest";

import { type Graph, operationQueueOf } from "../../src/Graph";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";
import baseline from "./render-budget.baseline.json";

/**
 * How far over its baseline a count may go. The counts are deterministic, so this is not noise
 * allowance: it lets a small, deliberate addition (one more helper mesh) through without a
 * baseline rewrite, while anything that scales with the graph -- a mesh, material or draw call
 * per node or per edge -- overshoots it many times over.
 */
const BUDGET_MARGIN = 0.1;

/** Set by the rewrite command above. */
const UPDATING = (import.meta.env as Record<string, string | undefined>).GRAPHTY_UPDATE_RENDER_BUDGET === "1";

/** The fixed graphs the budget covers, as [nodes, edges]. */
const GRAPHS = [
    [1000, 2000],
    [10000, 20000],
] as const;

/** A load this size takes about 20 s locally; the limit is only there so a hang ends. */
const LARGE_LOAD_TIMEOUT_MS = 300000;

/** What the budget counts. */
interface Counts {
    drawCalls: number;
    activeMeshes: number;
    sceneMeshes: number;
    materials: number;
    textures: number;
}

/**
 * A graph with nodes on a square grid and edges picked by a fixed formula, so every run
 * builds the same graph and a fixed layout has positions to keep.
 * @param nodeCount - How many nodes.
 * @param edgeCount - How many edges.
 * @returns The records.
 */
function graphOf(
    nodeCount: number,
    edgeCount: number,
): { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } {
    const side = Math.ceil(Math.sqrt(nodeCount));
    const nodes = Array.from({ length: nodeCount }, (_unused, i) => ({
        id: `n${String(i)}`,
        position: { x: (i % side) * 10, y: Math.floor(i / side) * 10, z: 0 },
    }));
    const edges = Array.from({ length: edgeCount }, (_unused, i) => ({
        id: `e${String(i)}`,
        source: `n${String(i % nodeCount)}`,
        target: `n${String((i * 7 + 1) % nodeCount)}`,
    }));

    return { nodes, edges };
}

/**
 * Load a graph and wait until it is drawn.
 * @param graph - The graph to load into.
 * @param nodeCount - How many nodes.
 * @param edgeCount - How many edges.
 */
async function load(graph: Graph, nodeCount: number, edgeCount: number): Promise<void> {
    graph.setData(graphOf(nodeCount, edgeCount));
    await operationQueueOf(graph).waitForCompletion();
    await graph.waitForStableFrame({ timeoutMs: LARGE_LOAD_TIMEOUT_MS });
    assert.strictEqual(graph.getDataManager().edges.size, edgeCount, "every edge loaded");
}

/**
 * Render one frame and read what it cost.
 * @param graph - The graph to measure.
 * @returns The counts, and the frame time for the log.
 */
function measure(graph: Graph): Counts & { frameMs: number } {
    const { scene } = graph;
    scene.render();
    const snapshot = graph.getStatsManager().getSnapshot().scene;
    assert.isDefined(snapshot, "the element's stats have scene instrumentation");

    return {
        drawCalls: snapshot.drawCalls.current,
        activeMeshes: scene.getActiveMeshes().length,
        sceneMeshes: scene.meshes.length,
        materials: scene.materials.length,
        textures: scene.textures.length,
        frameMs: snapshot.frameTime.current,
    };
}

/**
 * What the scene is holding.
 * @param graph - The graph whose scene to read.
 * @returns Meshes, materials and textures.
 */
function held(graph: Graph): Pick<Counts, "sceneMeshes" | "materials" | "textures"> {
    const { scene } = graph;

    return { sceneMeshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length };
}

let graph: Graph | undefined;

afterEach(() => {
    if (graph) {
        cleanupTestGraph(graph);
        graph = undefined;
    }
});

describe("the cost of drawing a whole graph", () => {
    const recorded: Record<string, Counts> = {};

    for (const [nodeCount, edgeCount] of GRAPHS) {
        const name = `${String(nodeCount)} nodes, ${String(edgeCount)} edges`;

        it(`stays within its baseline for ${name}`, async () => {
            graph = await createTestGraph();
            await graph.setLayout("fixed");
            await load(graph, nodeCount, edgeCount);

            const { frameMs, ...counts } = measure(graph);
            // Printed for trend reading only. A frame's time depends on the machine and on what else
            // it is doing, so it is never a pass/fail condition.
            console.log(`render budget, ${name}: ${JSON.stringify(counts)}, frame ${frameMs.toFixed(1)} ms`);

            if (UPDATING) {
                recorded[name] = counts;

                return;
            }

            const budget = (baseline as Record<string, Counts | undefined>)[name];
            assert.isDefined(budget, `render-budget.baseline.json has no entry for "${name}"; rewrite it`);

            for (const key of Object.keys(counts) as (keyof Counts)[]) {
                const limit = Math.floor(budget[key] * (1 + BUDGET_MARGIN));
                assert.isAtMost(
                    counts[key],
                    limit,
                    `${name}: ${key} is ${String(counts[key])}, over its baseline of ${String(budget[key])} ` +
                        `plus ${String(BUDGET_MARGIN * 100)}%. If the cost is intended, rewrite the baseline ` +
                        "(see the top of this file).",
                );
            }
        }, LARGE_LOAD_TIMEOUT_MS);
    }

    it.runIf(UPDATING)("writes the baseline", async () => {
        // Relative to the directory vitest runs in, so run the rewrite command from graphty-element/.
        await commands.writeFile("test/browser/render-budget.baseline.json", `${JSON.stringify(recorded, null, 4)}\n`);
    });
});

describe("a load and a clear", () => {
    it("return the scene to exactly the meshes, materials and textures it started with", async () => {
        graph = await createTestGraph();
        await graph.setLayout("fixed");
        // Babylon makes the scene's default material the first time anything asks for it and keeps
        // it for the life of the scene. It is the scene's, not the dataset's, so take it first.
        void graph.scene.defaultMaterial;
        const start = held(graph);

        for (const pass of [1, 2]) {
            await load(graph, 200, 400);
            assert.isAbove(held(graph).sceneMeshes, start.sceneMeshes, "loading must add meshes");

            graph.clearData();
            await operationQueueOf(graph).waitForCompletion();

            assert.deepEqual(held(graph), start, `clear ${String(pass)} left the scene holding something`);
        }
    });
});

describe("the number of edges", () => {
    /**
     * Load a graph of 200 nodes and the given edges into a fresh graph, and read its costs.
     * @param edgeCount - How many edges.
     * @returns The counts.
     */
    async function costOf(edgeCount: number): Promise<Counts> {
        graph = await createTestGraph();
        await graph.setLayout("fixed");
        await load(graph, 200, edgeCount);
        const { frameMs: _frameMs, ...counts } = measure(graph);
        cleanupTestGraph(graph);
        graph = undefined;

        return counts;
    }

    it("does not change the draw calls or the materials", async () => {
        const fewer = await costOf(200);
        const more = await costOf(400);

        // One default style draws every edge, so twice the edges is the same calls and materials. A
        // renderer that gives each edge or arrowhead its own mesh and material fails both.
        assert.strictEqual(more.drawCalls, fewer.drawCalls, "draw calls grew with the edges");
        assert.strictEqual(more.materials, fewer.materials, "materials grew with the edges");
    });

    // Known failure, kept as a tripwire. Every edge's line and arrowhead is still an InstancedMesh,
    // and Babylon lists each one in scene.meshes, so the list grows by two per edge. Issue #419 draws
    // edges as instances of one mesh per style; when that lands this starts passing, `it.fails`
    // reports it, and the fix is to change `it.fails` to `it`.
    it.fails("does not change the number of scene meshes", async () => {
        const fewer = await costOf(200);
        const more = await costOf(400);

        assert.strictEqual(more.sceneMeshes, fewer.sceneMeshes, "scene meshes grew with the edges");
    });
});
