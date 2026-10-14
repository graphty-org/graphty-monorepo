/**
 * @file A seeded layout settles in the same place however the consumer splits and times its node
 * and edge writes (issue #650).
 *
 * The element's default layout is built before any data arrives, and an incremental engine such
 * as ngraph places newcomers from wherever the graph has got to. A consumer that set `nodeData`
 * after one fetch and `edgeData` after another let frames run between, and those frames spent the
 * pre-steps -- and stepped -- over the nodes alone, so the same data and seed settled elsewhere.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";
import { drawnFrames } from "../helpers/drawn-frames";

/** The graph of the Data/Basic story. */
const NODES = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
const EDGES = [
    { src: 0, dst: 1 },
    { src: 0, dst: 2 },
    { src: 2, dst: 3 },
    { src: 3, dst: 0 },
    { src: 3, dst: 4 },
    { src: 3, dst: 5 },
];

const mounted: Graphty[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * Mount a seeded ngraph element sized like a story's, with no data yet.
 * @param preSteps - The layout's pre-steps.
 * @returns The element.
 */
function mount(preSteps: number): Graphty {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    element.layoutBehavior = { layout: { preSteps } };
    element.layoutConfig = { seed: 42 };
    element.layout = "ngraph";
    document.body.appendChild(element);
    mounted.push(element);
    return element;
}

/**
 * Wait until the element holds the nodes just written, then let it update a few times over them.
 * @param element - The element.
 * @param updates - How many drawn frames, each a layout step, to let run.
 */
async function stepOverNodes(element: Graphty, updates: number): Promise<void> {
    while (element.graph.getDataManager().nodes.size === 0) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    await drawnFrames(element.graph.getScene(), updates);
}

/**
 * Where each node came to rest, to four decimals.
 * @param element - The settled element.
 * @returns Node id to coordinates.
 */
function positions(element: Graphty): Record<string, number[]> {
    const engine = element.graph.getLayoutManager().layoutEngine;
    assert.isDefined(engine);
    const out: Record<string, number[]> = {};
    for (const node of element.graph.getDataManager().nodes.values()) {
        const { x, y, z } = engine.getNodePosition(node);
        out[String(node.id)] = [x, y, z ?? 0].map((v) => Number(v.toFixed(4)));
    }

    return out;
}

/**
 * Load the graph in one turn and let it settle.
 * @param preSteps - The layout's pre-steps.
 * @returns Where it settled.
 */
async function sameTurn(preSteps: number): Promise<Record<string, number[]>> {
    const element = mount(preSteps);
    element.nodeData = NODES;
    element.edgeData = EDGES;
    await element.waitForStableFrame();
    return positions(element);
}

describe("a seeded layout whose nodes and edges arrive in separate turns", () => {
    for (const preSteps of [0, 8000]) {
        test(`settles where one turn settles, with frames between (preSteps ${preSteps})`, async () => {
            const expected = await sameTurn(preSteps);

            const element = mount(preSteps);
            element.nodeData = NODES;
            await stepOverNodes(element, 5);
            assert.isAbove(element.graph.getDataManager().nodes.size, 0, "the nodes were drawn before the edges");
            element.edgeData = EDGES;
            await element.waitForStableFrame();

            assert.deepEqual(positions(element), expected);
        });

        test(`settles where one turn settles, after the nodes alone came to rest (preSteps ${preSteps})`, async () => {
            const expected = await sameTurn(preSteps);

            const element = mount(preSteps);
            element.nodeData = NODES;
            await element.waitForStableFrame();
            await element.graph.addEdges(EDGES.slice(0, 3));
            // Three updates over the first edges alone, as frames between two fetches would run.
            await drawnFrames(element.graph.getScene(), 3);
            await element.graph.addEdges(EDGES.slice(3));
            await element.waitForStableFrame();

            assert.deepEqual(positions(element), expected);
        });
    }

    test("starts over once for a run of queued adds, not once per add", async () => {
        const expected = await sameTurn(8000);
        const element = mount(8000);
        element.nodeData = NODES;
        await element.waitForStableFrame();

        let builds = 0;
        element.graph.getEventManager().addListener("layout-initialized", () => {
            builds++;
        });
        const adds = EDGES.map(async (edge) => element.graph.addEdges([edge]));
        await Promise.all(adds);
        await element.waitForStableFrame();

        assert.strictEqual(builds, 1);
        assert.deepEqual(positions(element), expected);
    });
});
