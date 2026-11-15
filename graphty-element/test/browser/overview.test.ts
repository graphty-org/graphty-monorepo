/**
 * @file The overview a consumer draws a minimap from (issue #293): its points match the nodes, its
 * viewport follows the camera, `centerOnOverview` centres the view on a frame point in 2D and 3D,
 * and `overview-changed` fires when the camera or the layout moves.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

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
];

/**
 * A 400 by 400 element holding {@link NODES} under the fixed layout.
 * @param mode - The view mode.
 * @returns The element.
 */
async function mounted(mode: "2d" | "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "400px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(mode);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: mode === "2d" ? 2 : 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Resolves on the next `overview-changed`.
 * @param element - The element.
 * @returns The wait.
 */
function nextChange(element: Graphty): Promise<void> {
    return new Promise((resolve) => {
        element.addEventListener("overview-changed", () => resolve(), { once: true });
    });
}

/**
 * The overview point of a node, by its index in {@link NODES}.
 * @param element - The element.
 * @param index - The node's index.
 * @returns The frame point.
 */
function pointOf(element: Graphty, index: number): { x: number; y: number } {
    const { points } = element.getOverview();
    return { x: points[2 * index], y: points[2 * index + 1] };
}

describe("the overview (#293)", () => {
    it("lays every node flat in a unit frame, y down, in 2D", async () => {
        const element = await mounted("2d");
        const overview = element.getOverview();
        assert.strictEqual(overview.kind, "points");
        const expected = [0, 1, 1, 1, 0, 0, 0.6, 0.6];
        for (let i = 0; i < expected.length; i++) {
            assert.closeTo(overview.points[i], expected[i], 1e-4, `coordinate ${String(i)}`);
        }

        // The frame keeps the screen's order: a node right of another on screen is right of it here.
        const b = element.nodeScreenPosition("b");
        const c = element.nodeScreenPosition("c");
        assert.isAbove(b?.x ?? 0, c?.x ?? 0);
        assert.isAbove(b?.y ?? 0, c?.y ?? 0);
    });

    it("moves the viewport with a 2D pan, by the pan over the frame size", async () => {
        const element = await mounted("2d");
        const before = element.getOverview().viewport;
        const pan = element.getCameraState().pan ?? { x: 0, y: 0 };
        const changed = nextChange(element);
        await element.setCameraState({ pan: { x: pan.x + 50, y: pan.y - 20 } });
        await changed;
        const after = element.getOverview().viewport;
        assert.closeTo(after.x - before.x, 0.5, 1e-3);
        assert.closeTo(after.y - before.y, 0.2, 1e-3);
        assert.closeTo(after.width, before.width, 1e-6);
    });

    for (const mode of ["2d", "3d"] as const) {
        it(`centres the view on an overview point in ${mode}`, async () => {
            const element = await mounted(mode);
            const target = pointOf(element, 3);
            await element.centerOnOverview(target);
            await element.waitForStableFrame();
            const at = element.nodeScreenPosition("d");
            assert.closeTo(at?.x ?? 0, 200, 1.5);
            assert.closeTo(at?.y ?? 0, 200, 1.5);

            // The viewport is now centred on that node's point.
            const { viewport } = element.getOverview();
            const moved = pointOf(element, 3);
            assert.closeTo(viewport.x + viewport.width / 2, moved.x, 1e-3);
            assert.closeTo(viewport.y + viewport.height / 2, moved.y, 1e-3);
        });
    }

    it("fires overview-changed when the layout moves a node", async () => {
        const element = await mounted("2d");
        const changed = nextChange(element);
        await element.session.positions.set([{ id: "d", x: 200, y: 40, z: 0 }]);
        await changed;
        // d is now the right edge of a 200 wide frame.
        assert.closeTo(pointOf(element, 3).x, 1, 1e-4);
    });

    it("returns a density grid above the point limit", async () => {
        const element = await mounted("2d");
        const overview = element.getOverview({ maxPoints: 2, gridSize: 4 });
        assert.strictEqual(overview.kind, "density");
        assert.strictEqual(
            overview.density?.counts.reduce((sum, n) => sum + n, 0),
            NODES.length,
        );
    });
});
