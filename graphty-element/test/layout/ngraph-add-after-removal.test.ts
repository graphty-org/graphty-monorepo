/**
 * The default force layout settles a node added after most of a large graph was removed in the
 * steps an add on a graph opened small takes (issue #9421).
 *
 * A removal leaves the surviving nodes where the larger drawing had them, far from the origin, and
 * a new node used to start in a box round the origin: its spring then pulled it, and the survivor,
 * across the old drawing's width. After removing all but one airport of OpenFlights (3,214 nodes)
 * each add took a few hundred steps, seconds of frames, against a handful on a one-node graph.
 *
 * Counted in steps to settle, never timed. The engine is driven directly, with the bare shapes a
 * layout engine uses (see engine-removal.test.ts).
 */
import { assert, describe, it } from "vitest";

import { layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import type { Node } from "../../src/Node";
import { assertScalesLinearly } from "../helpers/cost";
import { fakeEdge, fakeNode } from "../helpers/layout-fakes";

/** How many nodes are added back, one at a time, each with an edge to the survivor. */
const ADDS = 4;

/**
 * Step the simulation until it says it is at rest.
 * @param simulation - The engine.
 * @returns The steps it took.
 */
function settle(simulation: NGraphEngine): number {
    let steps = 0;
    while (!simulation.isSettled || steps === 0) {
        simulation.step();
        steps++;
    }

    return steps;
}

/**
 * Lay out a tree of `size` nodes, remove all but its last node, and add nodes back one at a time.
 * @param size - The node count before the removal.
 * @param dim - 2 or 3 dimensions.
 * @returns The steps the adds took to settle, together.
 */
function stepsAfterRemoval(size: number, dim: 2 | 3): number {
    const simulation = new NGraphEngine({ seed: 1, dim });
    const nodes = Array.from({ length: size }, (_, at) => fakeNode(`n${String(at)}`, { index: at }));
    const edges = nodes.slice(1).map((node, at) => fakeEdge(node, nodes[Math.floor(at / 3)]));
    layoutEngineInternals.addNodes(simulation, nodes);
    layoutEngineInternals.addEdges(simulation, edges);
    settle(simulation);

    // The last node of the tree, a leaf at the drawing's edge, is the one left.
    const survivor = nodes[size - 1];
    for (const removed of edges) {
        simulation.removeEdge(removed);
    }
    for (const removed of nodes.slice(0, -1)) {
        simulation.removeNode(removed);
    }
    settle(simulation);

    let steps = 0;
    for (let at = 0; at < ADDS; at++) {
        const added: Node = fakeNode(`x${String(at)}`, { index: size + at });
        simulation.addNode(added);
        simulation.addEdge(fakeEdge(survivor, added));
        steps += settle(simulation);
    }

    return steps;
}

describe("the ngraph layout after a large removal", () => {
    for (const dim of [2, 3] as const) {
        it(`settles each add in ${String(dim)}D in the steps it takes whatever was removed before`, async () => {
            // Measured 2026-11-23, steps for the four adds after removing all but one of 1, 100 and 1,600 nodes:
            // before the fix 32, 50, 276 in 2D and 23, 95, 334 in 3D; with it 32, 36, 42 and 23, 35, 36.
            const { large } = await assertScalesLinearly((size) => stepsAfterRemoval(size, dim), {
                sizes: [100, 1600],
                growth: "constant",
                maxRatio: 2,
                counter: "steps to settle the adds",
            });
            // On a one-node graph the same adds take a few steps each.
            assert.isAtMost(large, 2 * stepsAfterRemoval(1, dim) + 10 * ADDS, "as on a graph opened that small");
        });
    }
});
