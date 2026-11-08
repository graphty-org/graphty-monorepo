/**
 * @file Framing over the working graph (design/working-graph/design.md section 5, owner decision
 * A). With the session's `workingGraph` option on, Fit and the standard camera views frame what the
 * filter shows when they are given no nodes; with the option off, they frame the whole graph as
 * before.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

/** Two nodes close together, which the filter shows, and one far off, which it hides. */
const NODES = [
    { id: "a", position: { x: -10, y: 0, z: 0 } },
    { id: "b", position: { x: 10, y: 0, z: 0 } },
    { id: "far", position: { x: 0, y: 300, z: 0 } },
];

/** What the filter shows. */
const SHOWN = ["a", "b"];

/** Every node. */
const ALL = NODES.map((node) => node.id);

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element holding the three nodes at fixed places, with only the near two shown.
 * @param working - Whether the session reads the working graph.
 * @returns The element.
 */
async function filtered(working: boolean): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "480px";
    element.style.height = "360px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    element.session.workingGraph = working;
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.visibility.set({ kind: "member", of: { nodes: SHOWN } });
    await element.graph.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

describe("framing over the working graph", () => {
    for (const view of ["fitToGraph", "topView", "isometric"]) {
        it(`frames what is shown for ${view} with the option on`, async () => {
            const { graph } = await filtered(true);

            const fit = graph.resolveCameraPreset(view);
            assert.deepStrictEqual(fit, graph.resolveCameraPreset(view, { nodes: SHOWN }));
            assert.notDeepEqual(fit, graph.resolveCameraPreset(view, { nodes: ALL }));
        });
    }

    it("frames the whole graph with the option off, as before", async () => {
        const { graph } = await filtered(false);

        const fit = graph.resolveCameraPreset("fitToGraph");
        assert.deepStrictEqual(fit, graph.resolveCameraPreset("fitToGraph", { nodes: ALL }));
        assert.notDeepEqual(fit, graph.resolveCameraPreset("fitToGraph", { nodes: SHOWN }));
    });
});
