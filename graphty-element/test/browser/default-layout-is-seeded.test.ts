/**
 * @file One file draws the same way each time it is loaded (issue #801).
 *
 * The default layout and the layout an import recommends are seeded, so two loads of the same
 * data settle in the same place however the writes are split and timed, and a seed the consumer
 * passes still decides the picture.
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
 * @param seed - A seed the consumer passes, if any.
 * @returns The element.
 */
function mount(dimension: "2d" | "3d", seed?: number): Graphty {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    element.viewMode = dimension;
    if (seed !== undefined) {
        element.layoutConfig = { seed };
    }

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

/**
 * Import the graph as one JSON file, asking for the recommended layout, and let it settle.
 * @param element - The element.
 * @returns Where it settled.
 */
async function importRecommended(element: Graphty): Promise<Record<string, number[]>> {
    const data = JSON.stringify({
        nodes: NODES,
        edges: EDGES.map(({ src, dst }) => ({ source: src, target: dst })),
    });
    await element.session.data.import({ type: "json", config: { data } }, { layout: "recommended" });
    await element.waitForStableFrame();
    return positions(element);
}

describe("the default layout is seeded", () => {
    for (const dimension of ["2d", "3d"] as const) {
        test(`two loads of the same data settle in the same place, however they are timed (${dimension})`, async () => {
            const first = await loadAtOnce(mount(dimension));
            const second = await loadInTwoTurns(mount(dimension));

            assert.deepEqual(second, first);
        });

        test(`two imports asking for the recommended layout settle in the same place (${dimension})`, async () => {
            const first = await importRecommended(mount(dimension));
            const second = await importRecommended(mount(dimension));

            assert.strictEqual(mounted[0].graph.getLayoutManager().layoutEngine?.type, "ngraph");
            assert.deepEqual(second, first);
        });

        test(`a seed the consumer passes still decides the picture (${dimension})`, async () => {
            const unseeded = await loadAtOnce(mount(dimension));
            const seven = await loadAtOnce(mount(dimension, 7));
            const sevenAgain = await loadInTwoTurns(mount(dimension, 7));

            assert.notDeepEqual(seven, unseeded, "the consumer's seed replaced the default one");
            assert.deepEqual(sevenAgain, seven, "and gives the same picture each time");
        });
    }
});
