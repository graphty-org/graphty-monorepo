/**
 * @file Switching between the 2D and 3D views leaves no input state of the view before behind: after
 * any run of switches, a real drag across empty canvas (test/helpers/real-input.ts) does what the
 * view now shown does -- pans the 2D drawing with the pointer, turns the 3D camera. And a node's Z,
 * flattened by the 2D view, comes back with undo. Read through the element's public API.
 */

import { assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { drag, nextFrame } from "../../helpers/real-input";
import { applied, at, EMPTY, mounted } from "../helpers/mounted-element";

type ViewMode = "2d" | "3d";

/**
 * Switch the view through modes, the last one shown and at rest.
 * @param element - The element.
 * @param modes - The modes, in order.
 * @param settle - Whether to let each switch come to rest before the next; otherwise one frame.
 */
async function switchThrough(element: Graphty, modes: readonly ViewMode[], settle: boolean): Promise<void> {
    for (const mode of modes) {
        await element.setViewMode(mode);
        if (settle) {
            await element.waitForStableFrame();
        } else {
            await nextFrame();
        }
    }

    await element.waitForStableFrame();
}

/**
 * Assert a drag across empty canvas pans the 2D drawing with the pointer.
 * @param element - The element, in 2D.
 */
async function assertDragPans(element: Graphty): Promise<void> {
    const start = at(element, "a");

    await drag(element, EMPTY, { x: EMPTY.x + 60, y: EMPTY.y - 30 });
    await applied(element);

    const end = at(element, "a");
    assert.closeTo(end.x - start.x, 60, 2, "the drawing moved right with the pointer");
    assert.closeTo(end.y - start.y, -30, 2, "the drawing moved up with the pointer");
}

/**
 * Assert a drag across empty canvas turns the 3D camera about the vertical.
 * @param element - The element, in 3D.
 */
async function assertDragTurns(element: Graphty): Promise<void> {
    await element.setCameraState({ pivotRotation: { x: 0, y: 0, z: 0 } });
    await applied(element);

    await drag(element, EMPTY, { x: EMPTY.x + 100, y: EMPTY.y });
    await applied(element);

    const rotation = element.getCameraState().pivotRotation;
    assert.isDefined(rotation, "the 3D camera reports its turn");
    assert.isAbove(Math.abs(rotation.y), 0.05, "the drag turned the camera");
}

describe.each([
    ["3D -> 2D", "3d", ["2d"], true],
    ["2D -> 3D", "2d", ["3d"], true],
    ["3D -> 2D -> 3D -> 2D", "3d", ["2d", "3d", "2d"], true],
    ["six switches a frame apart, ending in 2D", "3d", ["2d", "3d", "2d", "3d", "3d", "2d"], false],
    ["six switches a frame apart, ending in 3D", "3d", ["2d", "3d", "2d", "3d", "2d", "3d"], false],
] as const)("after %s", (_name, start, modes, settle) => {
    it("a drag across empty canvas does what the view shown does", async () => {
        const element = await mounted(start);

        await switchThrough(element, modes, settle);

        const shown = modes[modes.length - 1];
        assert.strictEqual(element.getViewMode(), shown);
        if (shown === "2d") {
            await assertDragPans(element);
        } else {
            await assertDragTurns(element);
        }
    });
});

describe("a node off the plane", () => {
    it("is flattened in 2D, stays flat back in 3D, and undoing the 2D switch gives its Z back", async () => {
        // The Z a 2D switch flattens is kept in history only, as it is for a pinned node: a switch
        // back to 3D lays the graph out again, and under `fixed` that keeps the flattened row.
        // Undo is what returns the arrangement the reader had before the switch.
        const element = await mounted("3d");
        const z = (): number => {
            const out = { x: 0, y: 0, z: 0 };
            element.session.positions.read(element.session.snapshot().ids.requireIndex("a"), out);
            return out.z;
        };
        // Node a's data puts it on the plane; the reader lifts it off
        await element.session.positions.set([{ id: "a", x: -4, y: 0, z: 5 }]);
        await element.waitForStableFrame();
        assert.closeTo(z(), 5, 0.01, "node a starts off the plane");

        await switchThrough(element, ["2d"], true);
        assert.closeTo(z(), 0, 0.01, "flattened in 2D");

        await switchThrough(element, ["3d"], true);
        assert.closeTo(z(), 0, 0.01, "a switch back to 3D does not invent a Z");

        await element.session.undo();
        await element.waitForStableFrame();
        assert.strictEqual(element.getViewMode(), "2d", "the first undo returns to 2D");
        assert.closeTo(z(), 0, 0.01, "still on the plane in 2D");

        await element.session.undo();
        await element.waitForStableFrame();
        assert.strictEqual(element.getViewMode(), "3d", "the second undo returns to 3D");
        assert.closeTo(z(), 5, 0.01, "with the Z the node had before the 2D switch");
    });
});
