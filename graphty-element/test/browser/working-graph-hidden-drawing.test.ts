/**
 * @file Nothing outside the view is drawn while the working graph is on
 * (design/working-graph/design.md section 3). The owner's first bug: with `showContext` on, a filter
 * laid the five shown nodes out afresh while the fifteen hidden ones stayed drawn as faint points at
 * their old places -- two layouts on one canvas. With the option on, no faint point is drawn and
 * `visibility.notDrawn` says why; with it off, the faint points are drawn as before.
 *
 * Counted on the scene: the enabled instances of the one context-point mesh.
 */

import "../../src/graphty-element";

import type { AbstractMesh } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

/** Twenty nodes on a path. */
const IDS = Array.from({ length: 20 }, (_, index) => `n${String(index)}`);

/** What the filter shows. */
const FIVE = IDS.slice(0, 5);

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element holding the path laid out in a circle, with `showContext` on and only five
 * nodes shown, settled.
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
    await element.session.data.addNodes(IDS.map((id) => ({ id })));
    await element.session.data.addEdges(IDS.slice(1).map((id, index) => ({ source: IDS[index], target: id })));
    await element.graph.setLayout("circular", { dim: 2 });
    await operationQueueOf(element.graph).waitForCompletion();
    element.session.visibility.showContext = true;
    await element.session.visibility.set({ kind: "member", of: { nodes: FIVE } });
    await element.graph.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

/**
 * How many faint context points the scene draws now.
 * @param element - The element.
 * @returns The count.
 */
function faintPoints(element: Graphty): number {
    return element.graph
        .getScene()
        .meshes.filter(
            (mesh: AbstractMesh) =>
                mesh.getClassName() === "InstancedMesh" &&
                mesh.name.startsWith("graphty-context-point") &&
                mesh.isEnabled(),
        ).length;
}

describe("hidden nodes under the working graph", () => {
    it("draws the hidden nodes as faint points with the option off, as before", async () => {
        const element = await filtered(false);
        assert.strictEqual(faintPoints(element), IDS.length - FIVE.length);
        assert.deepStrictEqual(element.session.visibility.notDrawn, []);
    });

    it("draws no faint point at an old place under the fresh layout with the option on", async () => {
        const element = await filtered(true);
        assert.strictEqual(faintPoints(element), 0, "no hidden node is drawn");
        assert.deepStrictEqual(
            element.session.visibility.notDrawn.map((fact) => [fact.code, fact.params.asked]),
            [["W_HIDDEN_NOT_DRAWN", "showContext"]],
        );
    });

    it("stops drawing them when the option turns on, and draws them again when it turns off", async () => {
        const element = await filtered(false);
        assert.strictEqual(faintPoints(element), IDS.length - FIVE.length);

        element.session.workingGraph = true;
        await element.graph.waitForSettled();
        await element.waitForStableFrame();
        assert.strictEqual(faintPoints(element), 0);

        element.session.workingGraph = false;
        await element.graph.waitForSettled();
        await element.waitForStableFrame();
        assert.strictEqual(faintPoints(element), IDS.length - FIVE.length);
    });
});
