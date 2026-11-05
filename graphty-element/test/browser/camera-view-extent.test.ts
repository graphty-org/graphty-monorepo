/**
 * @file The `extent` option of the camera views (issue #2668): `"drawn"` frames each node out to the
 * box it is drawn in, for `zoomToNodes`, `applyCameraView` and `resolveCameraPreset`, and for a third
 * party's view the same way as a built-in one. The default, `"centers"`, keeps measuring centres.
 */

import "../../src/graphty-element";

import { afterAll, afterEach, assert, describe, it } from "vitest";

import { type CameraViewInput, clearRegisteredCamerasForTesting, registerCameraView } from "../../extend";
import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";

const WIDTH = 480;
const HEIGHT = 360;
const NODE_SIZE = 40;

const NODES = [
    { id: "a", position: { x: -100, y: 0, z: 0 } },
    { id: "b", position: { x: 100, y: 0, z: 0 } },
    { id: "far", position: { x: 0, y: 300, z: 0 } },
];

const seen: CameraViewInput[] = [];

registerCameraView({
    descriptor: {
        id: "acme-look",
        plainName: "Look",
        description: "Looks at the middle of the box from straight ahead.",
        modes: ["3d"],
        options: [],
    },
    compute(input) {
        seen.push(input);
        const { center, maxDimension } = input.bounds;
        return {
            type: "arcRotate",
            target: { ...center },
            position: { x: center.x, y: center.y, z: center.z - maxDimension * 2 },
        };
    },
});

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

afterAll(() => {
    clearRegisteredCamerasForTesting();
});

/**
 * A mounted element holding big nodes at fixed places.
 * @param viewMode - The view mode.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d" = "3d"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.styles.add({
        name: "big nodes",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": NODE_SIZE },
    });
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Whether a node's drawn box is inside the view.
 * @param element - The element.
 * @param id - The node.
 * @returns True when the node is whole on screen.
 */
function wholeOnScreen(element: Graphty, id: string): boolean {
    const at = element.graph.nodeScreenPosition(id);
    assert.isDefined(at, `node ${id} is drawn`);
    const { left, top, right, bottom } = at.bounds;
    return left >= -0.5 && top >= -0.5 && right <= WIDTH + 0.5 && bottom <= HEIGHT + 0.5;
}

/**
 * How far the camera stands from what it looks at.
 * @param element - The element.
 * @returns The distance.
 */
function standOff(element: Graphty): number {
    const { position, target } = element.graph.getCameraState();
    assert.ok(position && target);
    return Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
}

describe("camera views take an extent", () => {
    it("hands a registered view the box of node centres by default, and the drawn boxes with extent drawn", async () => {
        const element = await mounted();
        const scope = { nodes: ["a", "b"] };

        seen.length = 0;
        await element.applyCameraView("acme-look", { scope, animate: false });
        await element.applyCameraView("acme-look", { scope, animate: false, extent: "drawn" });

        const [centers, drawn] = seen;
        assert.isDefined(centers);
        assert.isDefined(drawn);
        assert.closeTo(centers.bounds.size.x, 200, 0.01, "centres: the box runs centre to centre");
        assert.isAtLeast(drawn.bounds.size.x, 200 + NODE_SIZE * 0.9, "drawn: the box takes in both nodes whole");
        assert.strictEqual(drawn.bounds.measured, 2);
    });

    it("resolveCameraPreset and fitToGraph stand farther back with extent drawn", async () => {
        const element = await mounted();
        const nodes = ["a", "b"];

        const centers = element.resolveCameraPreset("acme-look", { nodes });
        const drawn = element.resolveCameraPreset("acme-look", { nodes, extent: "drawn" });
        assert.ok(centers.position && drawn.position);
        assert.isBelow(drawn.position.z, centers.position.z - 1, "the drawn box is bigger, so the view backs off");

        await element.applyCameraView("fitToGraph", { scope: { nodes }, animate: false });
        const fitCenters = standOff(element);
        await element.applyCameraView("fitToGraph", { scope: { nodes }, animate: false, extent: "drawn" });
        assert.isAbove(standOff(element), fitCenters, "fitToGraph backs off too");
    });

    // In 2D, where the drawn box is exactly what the screen shows. In 3D the view's own perspective
    // padding decides how much room is left round the box, which is fitToGraph's arithmetic, not this option's.
    it("zoomToNodes on one big node frames it whole with extent drawn, and cuts it off by default", async () => {
        const element = await mounted("2d");

        await element.zoomToNodes("a", { animate: false });
        await element.waitForStableFrame();
        assert.isFalse(
            wholeOnScreen(element, "a"),
            "by default a node is framed by its centre, and a big one is cut off",
        );

        await element.zoomToNodes("a", { animate: false, extent: "drawn" });
        await element.waitForStableFrame();
        assert.isTrue(wholeOnScreen(element, "a"), "drawn: the node is whole on screen");
    });
});
