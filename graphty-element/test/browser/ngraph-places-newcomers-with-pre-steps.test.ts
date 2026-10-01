/**
 * @file A seeded ngraph layout settles where it settled before the undo work, whichever of the
 * layout and the data the element hears about first.
 *
 * A layout built over an empty graph owes its pre-steps to the first frame that has a node. The
 * graph hook places newcomers in the pass that adds them, and placing them steps ngraph ten times;
 * when those steps ran before the owed pre-steps they ran over part of the graph -- the nodes
 * without their edges -- and the pre-steps then started from a different arrangement. Every
 * Storybook story that sets `nodeData`, `edgeData` and a seeded ngraph layout moved (the owner
 * rejected them against the pictures captured at f606a837). While pre-steps are owed, placing
 * newcomers takes no steps: the pre-steps settle the whole graph on the first frame.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";

/** The graph and settings of the Data/Basic story. */
const NODES = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
const EDGES = [
    { src: 0, dst: 1 },
    { src: 0, dst: 2 },
    { src: 2, dst: 3 },
    { src: 3, dst: 0 },
    { src: 3, dst: 4 },
    { src: 3, dst: 5 },
];

/** Where the Data/Basic story's nodes came to rest at f606a837, the approved picture. */
const APPROVED: Record<string, [number, number, number]> = {
    0: [-0.3573, -1.2384, 4.0709],
    1: [4.4114, 7.9174, 2.0887],
    2: [2.2056, -7.4633, -4.5556],
    3: [-5.6724, -1.1264, -5.151],
    4: [5.1682, 0.3711, -4.425],
    5: [-5.092, -10.2599, 0.2687],
};

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

/**
 * Mount an element sized like a story's.
 * @returns The element, not yet given data or a layout.
 */
function mount(): Graphty {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    element.layoutBehavior = { layout: { preSteps: 8000 } };
    mounted = element;
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

describe("a seeded ngraph layout over data that arrives after it is chosen", () => {
    test("settles where the approved Data/Basic picture has it", async () => {
        // The order the stories' render function uses: data, then the layout, in one turn.
        const element = mount();
        element.nodeData = NODES;
        element.edgeData = EDGES;
        element.layoutConfig = { seed: 42 };
        element.layout = "ngraph";
        document.body.appendChild(element);
        await element.waitForStableFrame();

        assert.deepEqual(positions(element), APPROVED);
    });

    test("settles where a layout chosen over the data already loaded settles", async () => {
        const element = mount();
        element.nodeData = NODES;
        element.edgeData = EDGES;
        document.body.appendChild(element);
        await element.waitForStableFrame();

        // Built over every node and edge, the layout spends its pre-steps there and then.
        await element.graph.setLayout("ngraph", { seed: 42 });
        await element.waitForStableFrame();

        assert.deepEqual(positions(element), APPROVED);
    });
});
