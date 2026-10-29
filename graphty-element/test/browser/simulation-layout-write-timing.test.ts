/**
 * @file A seeded simulation layout (ForceAtlas2, spring) settles in the same place however the
 * consumer splits and times its node and edge writes (issue #3379).
 *
 * A simulation layout reloads at every freeze by adopting the arrangement the element holds, so
 * frames that stepped it over the nodes alone, before their edges arrived, started the settle from
 * a different place: the same data and seed drew a different picture, and how different depended
 * on how many frames ran in between -- the consumer's timing and the machine's speed.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";
import { SimulationLayoutEngine } from "../../src/layout/SimulationLayoutEngine";
import { createFakeAccelerator } from "../../src/testing/fakeAccelerator";
import { drawnFrames } from "../helpers/drawn-frames";

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
 * Mount a seeded simulation layout with no data yet, on the CPU so the run is the same everywhere.
 * @param layout - The simulation layout.
 * @param preSteps - The layout's pre-steps.
 * @returns The element.
 */
function mount(layout: string, preSteps: number): Graphty {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    element.layoutBehavior = { layout: { preSteps } };
    element.layoutConfig = { seed: 42 };
    element.layout = layout;
    document.body.appendChild(element);
    mounted.push(element);
    return element;
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
 * Load the nodes, let `frames` drawn frames step the layout over them alone, then load the edges.
 * @param layout - The simulation layout.
 * @param preSteps - The layout's pre-steps.
 * @param frames - How many frames run between the two writes; 0 writes both in one turn.
 * @returns Where it settled.
 */
async function load(layout: string, preSteps: number, frames: number): Promise<Record<string, number[]>> {
    const element = mount(layout, preSteps);
    element.nodeData = NODES;
    if (frames > 0) {
        while (element.graph.getDataManager().nodes.size === 0) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        }

        await drawnFrames(element.graph.getScene(), frames);
    }

    element.edgeData = EDGES;
    await element.waitForStableFrame();
    assert.strictEqual(element.graph.getDataManager().edges.size, EDGES.length);
    return positions(element);
}

describe("a seeded simulation layout whose nodes and edges arrive in separate turns", () => {
    for (const layout of ["forceatlas2", "spring"]) {
        for (const preSteps of [0, 200]) {
            test(`${layout} settles where one turn settles, with frames between (preSteps ${preSteps})`, async () => {
                const expected = await load(layout, preSteps, 0);
                assert.deepEqual(await load(layout, preSteps, 5), expected, "5 frames over the nodes alone");
                assert.deepEqual(await load(layout, preSteps, 12), expected, "12 frames over the nodes alone");
            });
        }
    }
});

describe("an accelerated seeded simulation layout", () => {
    // A GPU batch lands after the frame that submitted it has published, and the frame loop stops
    // a layout once it reads settled, so the batch that settled it was never drawn: the picture
    // lagged the simulation's final state by one batch.
    for (const preSteps of [0, 600]) {
        test(`draws the arrangement its simulation settled on (preSteps ${preSteps})`, async () => {
            const element = mount("forceatlas2", preSteps);
            const fake = createFakeAccelerator({ computes: "layout" });
            element.session.setAccelerator(fake);
            element.nodeData = NODES;
            element.edgeData = EDGES;
            await element.waitForStableFrame();

            const engine = element.graph.getLayoutManager().layoutEngine;
            assert.instanceOf(engine, SimulationLayoutEngine);
            assert.isTrue(engine.isAccelerated, "the fake ran the layout");
            assert.isTrue(engine.isSettled);
            assert.isAbove(fake.calls.resolved, 0);

            const drawn = positions(element);
            engine.publishPositions();
            assert.deepEqual(drawn, positions(element), "publishing the settled simulation moves nothing");
        });
    }
});
