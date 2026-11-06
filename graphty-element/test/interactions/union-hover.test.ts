/**
 * @file A union rule reading "hovered-or-selected" follows the real pointer: the fade layer the
 * landing page builds from steps (start with all; keep while the reference has nodes; except
 * within 1 hop of it) matches what the built-in inverted neighbors hover layer matches, at rest,
 * pointing at one node and at another. The pointer moves through the DevTools protocol.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { UnionLeaf } from "../../src/catalog/types";
import { operationQueueOf } from "../../src/Graph";
import { hover, nextFrame, type Point } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;
const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
    { id: "c", position: { x: 0, y: 3, z: 0 } },
    { id: "d", position: { x: 0, y: -3, z: 0 } },
];
/** A spot with no node under it. */
const EMPTY: Point = { x: 30, y: HEIGHT - 30 };

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * An element drawing a-b, a-c and c-d flat, laid out where the nodes say.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "a", dst: "c" },
        { src: "c", dst: "d" },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where a node is drawn.
 * @param element - The element.
 * @param id - The node.
 * @returns Its screen point.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    return { x: position.x, y: position.y };
}

const FADE: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            start: "all",
            steps: [
                { op: "keep", rule: { kind: "nonempty", of: "hovered-or-selected" } },
                { op: "except", rule: { kind: "hops", of: "hovered-or-selected", max: 1 } },
            ],
        },
    ],
};

describe("a union step reading the hovered node", () => {
    it("fades what the built-in inverted neighbors layer fades, as the real pointer moves", async () => {
        const element = await mounted();
        const { styles } = element.session;
        const steps = await styles.add({
            name: "Fade, built from steps",
            target: "node",
            selector: { match: "rule", where: FADE },
            set: { "node.opacity": 0.3 },
        });
        const builtIn = await styles.add({
            name: "Fade, built in",
            target: "node",
            selector: { match: "hover", reach: "neighbors", invert: true },
            set: { "node.opacity": 0.3 },
        });
        const matched = async (): Promise<[number, number]> => {
            await nextFrame();
            await styles.settled();
            return [styles.counts(steps.id).matched, styles.counts(builtIn.id).matched];
        };

        await hover(element, EMPTY);
        assert.deepEqual(await matched(), [0, 0], "nothing is faded at rest");

        await hover(element, at(element, "b"));
        assert.strictEqual(element.session.selection.hovered, "b");
        assert.deepEqual(await matched(), [2, 2], "c and d fade: they are not within 1 hop of b");

        await hover(element, at(element, "a"));
        assert.deepEqual(await matched(), [1, 1], "only d fades around a");

        await hover(element, EMPTY);
        assert.deepEqual(await matched(), [0, 0]);
    });
});
