/**
 * @file `element.labelOf(id)`: a node's label as drawn -- the words after binding and markup, and
 * whether the label is on screen -- in 2D and in 3D.
 *
 * The words are checked against what the label renderer itself paints (its parsed runs) as well
 * as against the expected string, so a read that drifted from the renderer would fail here.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

const WIDTH = 640;
const HEIGHT = 480;

/** Three nodes so close that their labels land on top of each other; the hub has most edges. */
const PILED = [
    { id: "hub", position: { x: 0, y: 0, z: 0 } },
    { id: "left", position: { x: -0.3, y: 0.1, z: 0 } },
    { id: "right", position: { x: 0.3, y: -0.1, z: 0 } },
];
const EDGES = [
    { src: "hub", dst: "left" },
    { src: "hub", dst: "right" },
];

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

/**
 * Mount an element, draw the nodes in the given mode and wait for the finished picture.
 * @param mode - 2D or 3D.
 * @param nodes - The nodes, with fixed positions.
 * @param declutter - Whether overlapping labels are hidden.
 * @returns The element.
 */
async function mount(mode: "2d" | "3d", nodes: Record<string, unknown>[], declutter: boolean): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    mounted = element;
    await element.updateComplete;

    element.layoutBehavior = { labels: { declutter } };
    await element.setViewMode(mode);
    await element.addNodes(nodes);
    await element.addEdges(EDGES);
    element.layoutConfig = { dim: mode === "2d" ? 2 : 3 };
    element.layout = "fixed";
    await element.session.styles.add({
        name: "labels",
        target: "node",
        selector: { match: "has", path: "data.name" },
        encode: { "node.label": { by: "data.name" } },
    });
    await element.waitForStableFrame();

    return element;
}

for (const mode of ["2d", "3d"] as const) {
    describe(`labelOf in ${mode}`, () => {
        it("returns the words drawn, after binding and markup, and that the label is drawn", async () => {
            const element = await mount(
                mode,
                [
                    { id: "v", name: "<bold>Jean</bold> Valjean", position: { x: 0, y: 0, z: 0 } },
                    { id: "m", name: "Monsieur\nMadeleine", position: { x: 40, y: 0, z: 0 } },
                    { id: "plain", position: { x: -40, y: 0, z: 0 } },
                ],
                false,
            );

            assert.deepEqual(element.labelOf("v"), { text: "Jean Valjean", drawn: true });
            assert.deepEqual(element.labelOf("m"), { text: "Monsieur\nMadeleine", drawn: true });

            // The same words the renderer paints, run by run.
            const runs = element.getNode("v")?.label?.textRuns ?? [];
            assert.deepEqual(
                runs[0].map((run) => [run.text, run.style.weight]),
                [
                    ["Jean", "bold"],
                    [" Valjean", "normal"],
                ],
            );
        });

        it("returns undefined for a node with no label and for an unknown id", async () => {
            const element = await mount(mode, [{ id: "plain", position: { x: 0, y: 0, z: 0 } }], false);

            assert.isUndefined(element.labelOf("plain"));
            assert.isUndefined(element.labelOf("nobody"));
        });

        it("reads drawn: false for the labels the overlap rule hid", async () => {
            const element = await mount(
                mode,
                PILED.map((node) => ({ ...node, name: "A LONG LABEL FOR THIS NODE" })),
                true,
            );

            const labels = PILED.map((node) => element.labelOf(node.id));
            assert.deepEqual(
                labels.map((label) => label?.drawn),
                [true, false, false],
                "the hub, with the most edges, keeps its label",
            );
            assert.isTrue(labels.every((label) => label?.text === "A LONG LABEL FOR THIS NODE"));
            assert.strictEqual(element.nodeLabelCounts.hiddenByOverlap, 2);
        });

        it("reads drawn: false for the label of a node a filter hides", async () => {
            const element = await mount(
                mode,
                PILED.map((node) => ({ ...node, name: "A LONG LABEL FOR THIS NODE" })),
                false,
            );

            // The hub has two edges, each leaf one: a degree filter hides the leaves.
            await element.session.visibility.set({ kind: "degree", min: 2 });
            await element.waitForStableFrame();

            assert.deepEqual(
                PILED.map((node) => element.labelOf(node.id)?.drawn),
                [true, false, false],
            );
        });

        it("reads drawn: true again once declutter is off", async () => {
            const element = await mount(
                mode,
                PILED.map((node) => ({ ...node, name: "A LONG LABEL FOR THIS NODE" })),
                true,
            );

            element.layoutBehavior = { labels: { declutter: false } };
            await element.waitForStableFrame();

            assert.deepEqual(
                PILED.map((node) => element.labelOf(node.id)?.drawn),
                [true, true, true],
            );
        });
    });
}
