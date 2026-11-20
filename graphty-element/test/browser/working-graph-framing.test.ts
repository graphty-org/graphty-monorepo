/**
 * @file Framing over the working graph (design/working-graph/design.md section 5, owner decision
 * A). With the session's `workingGraph` option on, Fit and the standard camera views frame what the
 * filter shows when they are given no nodes; with the option off they frame only what is drawn
 * too, since a hidden node never stretches the box.
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

/**
 * What a view frames once the filter is cleared and every node is drawn.
 * @param element - The element.
 * @param view - The camera view.
 * @returns The camera state.
 */
async function unfilteredFit(element: Graphty, view: string): Promise<unknown> {
    await element.session.visibility.set(null);
    await element.graph.waitForSettled();
    await element.waitForStableFrame();
    return element.graph.resolveCameraPreset(view);
}

describe("framing over the working graph", () => {
    for (const view of ["fitToGraph", "topView", "isometric"]) {
        it(`frames what is shown for ${view} with the option on`, async () => {
            const element = await filtered(true);
            const { graph } = element;

            // The whole graph is framed by what is drawn (`framing.extent` unset); name it for the subset.
            const fit = graph.resolveCameraPreset(view);
            assert.deepStrictEqual(fit, graph.resolveCameraPreset(view, { nodes: SHOWN, extent: "drawn" }));
            assert.notDeepEqual(fit, await unfilteredFit(element, view), "the hidden node would stretch the box");
        });
    }

    it("Frame selection frames only the selected nodes that are shown, with the option on", async () => {
        const { graph, session } = await filtered(true);
        // "far" is hidden by the time window alone, so it stays selected (owner decision B).
        await session.data.updateNodes([
            { id: "a", values: { seen: 1 } },
            { id: "b", values: { seen: 1 } },
            { id: "far", values: { seen: 5 } },
        ]);
        await session.visibility.set(null);
        await session.visibility.setWindow({ attribute: "data.seen", from: 0, to: 2 });
        await graph.waitForSettled();
        await session.selection.apply({ nodes: ["a", "far"] }, "replace");
        assert.sameMembers([...session.selection.nodes], ["a", "far"]);

        await graph.applyCameraView("fitToGraph", { scope: "selection" });
        const mixed = graph.getCameraState();
        await session.selection.apply({ nodes: ["a"] }, "replace");
        await graph.applyCameraView("fitToGraph", { scope: "selection" });
        assert.deepStrictEqual(mixed, graph.getCameraState(), "the hidden selected node is not framed");
    });

    it("frames only what is drawn with the option off too: a hidden node never stretches the box", async () => {
        const element = await filtered(false);
        const { graph } = element;

        const fit = graph.resolveCameraPreset("fitToGraph");
        assert.deepStrictEqual(fit, graph.resolveCameraPreset("fitToGraph", { nodes: SHOWN, extent: "drawn" }));
        assert.notDeepEqual(fit, await unfilteredFit(element, "fitToGraph"), "the hidden node would stretch the box");
    });
});
