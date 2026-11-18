/**
 * @file The minimap `<graphty-element minimap>` draws (issue #293), driven by real input: the
 * attribute shows and hides `::part(minimap)`, a click on it centres the view, a drag scrubs, the
 * arrow keys step the view, and above the point limit it draws a density heatmap.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { click, moveHeld, press, release } from "../helpers/real-input";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

const NODES = [
    { id: "a", position: { x: 0, y: 0, z: 0 } },
    { id: "b", position: { x: 100, y: 0, z: 0 } },
    { id: "c", position: { x: 0, y: 100, z: 0 } },
    { id: "d", position: { x: 60, y: 40, z: 0 } },
    { id: "e", position: { x: 30, y: 70, z: 0 } },
];

/**
 * A 400 by 400 2D element with the minimap on, holding nodes under the fixed layout.
 * @param nodes - The nodes.
 * @returns The element.
 */
async function mounted(
    nodes: { id: string; position: { x: number; y: number; z: number } }[] = NODES,
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "400px";
    element.setAttribute("minimap", "");
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(nodes);
    await element.graph.setLayout("fixed", { dim: 2 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * The minimap canvas, or null while it is hidden.
 * @param element - The element.
 * @returns The part.
 */
function part(element: Graphty): HTMLCanvasElement | null {
    return element.shadowRoot?.querySelector<HTMLCanvasElement>('[part="minimap"]') ?? null;
}

/**
 * Where a node's overview point is on the square minimap, inside its border.
 * @param element - The element.
 * @param canvas - The minimap.
 * @param index - The node's index in {@link NODES}.
 * @returns The point, in CSS pixels from the minimap's top-left corner.
 */
function onMinimap(element: Graphty, canvas: HTMLCanvasElement, index: number): { x: number; y: number } {
    const { points } = element.getOverview();
    return {
        x: canvas.clientLeft + points[2 * index] * canvas.clientWidth,
        y: canvas.clientTop + points[2 * index + 1] * canvas.clientHeight,
    };
}

/**
 * How many pixels of the minimap canvas are drawn on.
 * @param canvas - The minimap.
 * @returns The count.
 */
function inked(canvas: HTMLCanvasElement): number {
    const ctx = canvas.getContext("2d");
    const data = ctx?.getImageData(0, 0, canvas.width, canvas.height).data ?? new Uint8ClampedArray(0);
    let count = 0;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
            count++;
        }
    }

    return count;
}

/**
 * Asserts a node is drawn at the canvas centre.
 * @param element - The element.
 * @param id - The node.
 */
async function assertCentred(element: Graphty, id: string): Promise<void> {
    await element.waitForStableFrame();
    const at = element.nodeScreenPosition(id);
    assert.closeTo(at?.x ?? 0, 200, 1.5, `${id} x`);
    assert.closeTo(at?.y ?? 0, 200, 1.5, `${id} y`);
}

describe("the minimap (#293)", () => {
    it("is off by default, and the attribute shows and hides ::part(minimap)", async () => {
        const element = document.createElement("graphty-element");
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        assert.isFalse(element.minimap);
        assert.isNull(part(element));

        element.minimap = true;
        await element.updateComplete;
        assert.isTrue(element.hasAttribute("minimap"));
        assert.isAbove(part(element)?.offsetWidth ?? 0, 0);
        assert.strictEqual(part(element)?.getAttribute("aria-label"), "minimap");
        element.minimapLabel = "Carte";
        assert.strictEqual(part(element)?.getAttribute("aria-label"), "Carte");

        element.removeAttribute("minimap");
        await element.updateComplete;
        assert.isFalse(element.minimap);
        assert.isNull(part(element));
    });

    it("draws the nodes, and a click on it centres the view there", async () => {
        const element = await mounted();
        const canvas = part(element);
        assert.isNotNull(canvas);
        if (!canvas) {
            return;
        }

        assert.isAbove(inked(canvas), 0);
        await click(canvas, onMinimap(element, canvas, 3));
        await assertCentred(element, "d");
    });

    it("scrubs the view with a drag", async () => {
        const element = await mounted();
        const canvas = part(element);
        if (!canvas) {
            assert.fail("no minimap");
        }

        const from = onMinimap(element, canvas, 3);
        const to = onMinimap(element, canvas, 4);
        await press(canvas, from);
        await assertCentred(element, "d");
        await moveHeld(canvas, to);
        await assertCentred(element, "e");
        await release(canvas, to);
        await assertCentred(element, "e");
    });

    it("steps the view with the arrow keys", async () => {
        const element = await mounted();
        const canvas = part(element);
        if (!canvas) {
            assert.fail("no minimap");
        }

        canvas.focus();
        const before = element.getOverview().viewport;
        await userEvent.keyboard("{ArrowRight}");
        await element.waitForStableFrame();
        const after = element.getOverview().viewport;
        assert.closeTo(after.x - before.x, before.width / 4, 1e-3);
        assert.closeTo(after.y, before.y, 1e-3);
    });

    it("draws a density heatmap above 5,000 nodes", async () => {
        const nodes = Array.from({ length: 5001 }, (_, i) => ({
            id: `n${String(i)}`,
            position: { x: (i % 71) * 10, y: Math.floor(i / 71) * 10, z: 0 },
        }));
        const element = await mounted(nodes);
        assert.strictEqual(element.getOverview().kind, "density");
        const canvas = part(element);
        assert.isAbove(canvas ? inked(canvas) : 0, 0);
    });
});
