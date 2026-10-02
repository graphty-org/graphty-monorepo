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
 * Let a few frames run.
 * @param count - How many.
 */
async function frames(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }
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
            await frames(5);
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
            await frames(3);
            await element.graph.addEdges(EDGES.slice(3));
            await element.waitForStableFrame();

            assert.deepEqual(positions(element), expected);
        });
    }
});
