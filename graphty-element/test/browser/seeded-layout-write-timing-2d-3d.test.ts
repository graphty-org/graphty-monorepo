/**
 * @file A consumer that seeds the default layout gets the same drawing however the data arrives,
 * in 2D and in 3D (issue #801).
 *
 * graphty-element imposes no seed of its own: the default force layout is unseeded. A consumer
 * that wants one file to draw the same way on every load passes a seed, and two loads of the same
 * data -- one in a single write, one split across frames -- then settle in the same place.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";

const NODES = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => ({ id }));
const EDGES = [
    { src: "a", dst: "b" },
    { src: "a", dst: "c" },
    { src: "c", dst: "d" },
    { src: "d", dst: "a" },
    { src: "d", dst: "e" },
    { src: "e", dst: "f" },
    { src: "f", dst: "g" },
    { src: "g", dst: "h" },
];

const mounted: Graphty[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * Mount an element with no layout chosen and no data yet.
 * @param dimension - Draw in 2D or 3D.
 * @param seed - The seed the consumer passes.
 * @returns The element.
 */
function mount(dimension: "2d" | "3d", seed: number): Graphty {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    element.viewMode = dimension;
    element.layoutConfig = { seed };

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
 * @param element - The element.
 * @returns Where it settled.
 */
async function loadAtOnce(element: Graphty): Promise<Record<string, number[]>> {
    element.nodeData = NODES;
    element.edgeData = EDGES;
    await element.waitForStableFrame();
    return positions(element);
}

/**
 * Load the nodes, let frames run over them alone, then load the edges and let it settle.
 * @param element - The element.
 * @returns Where it settled.
 */
async function loadInTwoTurns(element: Graphty): Promise<Record<string, number[]>> {
    element.nodeData = NODES;
    await frames(5);
    element.edgeData = EDGES;
    await element.waitForStableFrame();
    return positions(element);
}

describe("a seed the consumer passes to the default layout", () => {
    for (const dimension of ["2d", "3d"] as const) {
        test(`gives the same drawing whether the data arrives in one write or across frames (${dimension})`, async () => {
            const first = await loadAtOnce(mount(dimension, 7));
            const second = await loadInTwoTurns(mount(dimension, 7));

            assert.strictEqual(mounted[0].graph.getLayoutManager().layoutEngine?.type, "ngraph");
            assert.deepEqual(second, first);
        });

        test(`decides the drawing: another seed draws it elsewhere (${dimension})`, async () => {
            const seven = await loadAtOnce(mount(dimension, 7));
            const eight = await loadAtOnce(mount(dimension, 8));

            assert.notDeepEqual(eight, seven);
        });
    }
});
