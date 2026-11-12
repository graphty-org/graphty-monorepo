/**
 * @file Rectangle and lasso selection (design/rendering/row-renderer.md 4.4 and section 9): the
 * `{ region: { polygon } }` selection target, and the opt-in Shift-drag gesture that uses it.
 *
 * A real Shift-drag over a grid of known nodes selects exactly the nodes inside, on both render
 * paths; a hidden node is not selected and a node drawn under another is; past the selection's cap
 * `truncated` says so; and with the gesture off a Shift-drag selects nothing.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { regionWork } from "../../src/render/PickService";
import { createGraphSession } from "../../src/session";
import { drag, moveHeld, nextFrame, press, release } from "../helpers/real-input";

const SIDE = 5;
const SPACING = 4;
const SHIFT = { shift: true } as const;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A 2D grid of nodes `n<column>_<row>`, and `twin` drawn exactly on `n2_2`.
 * @param path - The render path.
 * @param region - The gesture's shape, or undefined to leave the option unset.
 * @param side - How many nodes a side.
 * @returns The element.
 */
async function grid(path: "batched" | "objects", region?: "rectangle" | "lasso", side = SIDE): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "500px";
    element.style.height = "400px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    element.graph.setRenderPath(path);
    if (region !== undefined) {
        element.layoutBehavior = { selection: { region } };
    }

    const nodes: { id: string; position: { x: number; y: number; z: number } }[] = [];
    for (let column = 0; column < side; column++) {
        for (let row = 0; row < side; row++) {
            const position = { x: (column - (side - 1) / 2) * SPACING, y: (row - (side - 1) / 2) * SPACING, z: 0 };
            nodes.push({ id: `n${String(column)}_${String(row)}`, position });
        }
    }
    if (side === SIDE) {
        nodes.push({ id: "twin", position: { x: 0, y: 0, z: 0 } });
    }

    await element.session.data.addNodes(nodes);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where a node is drawn on the canvas.
 * @param element - The element.
 * @param id - The node.
 * @returns Its center, in CSS pixels.
 */
function at(element: Graphty, id: string): { x: number; y: number } {
    const place = element.graph.nodeScreenPosition(id);
    assert.isDefined(place, id);
    return { x: place.x, y: place.y };
}

/**
 * The point halfway between two nodes' centers.
 * @param element - The element.
 * @param a - One node.
 * @param b - The other.
 * @returns The point.
 */
function between(element: Graphty, a: string, b: string): { x: number; y: number } {
    const p = at(element, a);
    const q = at(element, b);
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
}

/** The middle three by three of the grid, and the twin drawn on its center. */
const MIDDLE = ["n1_1", "n1_2", "n1_3", "n2_1", "n2_2", "n2_3", "n3_1", "n3_2", "n3_3", "twin"];

/**
 * The selected node ids, sorted.
 * @param element - The element.
 * @returns The ids.
 */
function selected(element: Graphty): string[] {
    return element.session.selection.nodes.map(String).sort();
}

/**
 * The error code a synchronous call throws.
 * @param call - The call.
 * @returns The code, or undefined when it did not throw.
 */
function codeOf(call: () => unknown): unknown {
    try {
        call();
    } catch (error) {
        return (error as { code?: unknown }).code;
    }

    return undefined;
}

describe("rectangle and lasso selection", () => {
    for (const path of ["batched", "objects"] as const) {
        it(`a Shift-drag rectangle selects the nodes inside it on the "${path}" path`, async () => {
            const element = await grid(path, "rectangle");
            const before = { ...regionWork };
            await drag(
                element,
                between(element, "n0_0", "n1_1"),
                between(element, "n3_3", "n4_4"),
                8,
                undefined,
                SHIFT,
            );

            assert.deepEqual(selected(element), MIDDLE);
            if (path === "batched") {
                assert.strictEqual(regionWork.rows - before.rows, SIDE * SIDE + 1, "one typed walk over the rows");
                assert.strictEqual(regionWork.nodes, before.nodes, "no node read one at a time");
            } else {
                assert.strictEqual(regionWork.nodes - before.nodes, SIDE * SIDE + 1);
            }
        });
    }

    it("a Shift-drag adds to the selection, and a press on a node does not start a region", async () => {
        const element = await grid("batched", "rectangle");
        await element.session.selection.apply({ nodes: ["n0_0"] });
        await drag(element, between(element, "n0_4", "n1_3"), between(element, "n1_3", "n2_2"), 8, undefined, SHIFT);
        assert.deepEqual(selected(element), ["n0_0", "n1_3"]);

        await drag(element, at(element, "n4_4"), between(element, "n2_2", "n3_3"), 8, undefined, SHIFT);
        assert.deepEqual(selected(element), ["n0_0", "n1_3"], "a drag from a node moves the node");
    });

    it("a Shift-drag lasso selects what its path winds around", async () => {
        const element = await grid("batched", "lasso");
        const center = at(element, "n2_2");
        const reach = (at(element, "n3_2").x - center.x) * 0.6;
        await press(element, { x: center.x, y: center.y - reach }, SHIFT);
        for (const point of [
            { x: center.x + reach, y: center.y },
            { x: center.x, y: center.y + reach },
            { x: center.x - reach, y: center.y },
        ]) {
            await moveHeld(element, point, SHIFT);
            await nextFrame();
        }
        await release(element, { x: center.x, y: center.y - reach * 0.9 }, SHIFT);

        assert.deepEqual(selected(element), ["n2_2", "twin"]);
    });

    it("with the gesture off, a Shift-drag selects nothing", async () => {
        const element = await grid("batched");
        await drag(element, between(element, "n0_0", "n1_1"), between(element, "n3_3", "n4_4"), 8, undefined, SHIFT);
        assert.deepEqual(selected(element), []);
    });

    it("the region target skips a hidden node, keeps one drawn under another, and refuses a bad polygon", async () => {
        const element = await grid("batched");
        await element.session.styles.add({
            name: "No n2_1",
            target: "node",
            selector: { match: "ids", nodes: ["n2_1"] },
            set: { "node.visible": false },
        });
        await element.waitForStableFrame();
        const a = between(element, "n0_0", "n1_1");
        const b = between(element, "n3_3", "n4_4");
        const polygon = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }];

        const delta = await element.session.selection.apply({ region: { polygon } });
        assert.deepEqual(
            selected(element),
            MIDDLE.filter((id) => id !== "n2_1"),
        );
        assert.isFalse(delta.truncated);
        assert.strictEqual(delta.edges, 0, "a region names no edges");

        assert.strictEqual(
            codeOf(() => element.session.selection.apply({ region: { polygon: [a, b] } })),
            "E_OPTION_RANGE",
        );
    });

    it("a session that draws nothing refuses a region", () => {
        const session = createGraphSession();
        const polygon = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 0, y: 10 },
        ];
        assert.strictEqual(
            codeOf(() => session.selection.apply({ region: { polygon } })),
            "E_UNSUPPORTED",
        );
    });

    it("past the selection's cap a region is truncated", async () => {
        const element = await grid("batched", undefined, 71);
        const polygon = [
            { x: -1, y: -1 },
            { x: 600, y: -1 },
            { x: 600, y: 500 },
            { x: -1, y: 500 },
        ];
        element.graph.zoomToFit();
        await element.waitForStableFrame();
        const delta = await element.session.selection.apply({ region: { polygon } });
        assert.isTrue(delta.truncated);
        assert.strictEqual(delta.nodes, 5000);
    });
});
