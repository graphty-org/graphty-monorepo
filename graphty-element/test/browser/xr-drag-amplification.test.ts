/**
 * @file `xr.input.zAxisAmplification` multiplies only depth (Z) movement of a dragged node, and an
 * XR drag ignores a pointer jump that is a controller losing and reacquiring tracking.
 *
 * The drag is driven through `node.dragHandler`, the entry an XR controller feeds world positions
 * into. XR mode is the element's own signal for an immersive session: the WebXR helper it stores
 * on the scene, in the IN_XR state, which here stands in for a headset.
 *
 * The headset drag runs in a real immersive session on an emulated Quest 3 (IWER): a tracked hand
 * pinches while its ray points at the node, and moves (`createXRInputDriver`).
 */
import { Ray, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test } from "vitest";

import { type Graph, operationQueueOf } from "../../src/Graph";
import type { Node } from "../../src/Node";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";
import { createXRInputDriver } from "../interactions/helpers/xr-input-driver";

/** Babylon's WebXRState.IN_XR. */
const IN_XR = 2;

let graph: Graph;
let node: Node;

beforeEach(async () => {
    graph = await createTestGraph();
    graph.getDataManager().addNode({ id: "n", label: "n" });
    const added = graph.getDataManager().getNode("n");
    assert.isDefined(added);
    node = added;
});

afterEach(() => {
    cleanupTestGraph(graph);
});

/**
 * Drag the node from where it is drawn by each offset in turn, and return where it ends up
 * relative to where it started.
 * @param offsets - Pointer offsets from the drag start, one per update.
 * @returns The node's movement.
 */
function drag(...offsets: Vector3[]): Vector3 {
    const handler = node.dragHandler;
    assert.isDefined(handler);
    const start = node.drawnPosition.clone();
    handler.onDragStart(start);
    for (const offset of offsets) {
        handler.onDragUpdate(start.add(offset));
    }
    const moved = node.drawnPosition.subtract(start);
    handler.onDragEnd();
    return moved;
}

/**
 * Assert two vectors are equal to within rounding.
 * @param actual - The vector measured.
 * @param expected - The vector expected.
 * @param message - What is being checked.
 */
function assertNear(actual: Vector3, expected: Vector3, message: string): void {
    assert.isBelow(Vector3.Distance(actual, expected), 1e-6, `${message}: got ${actual.toString()}`);
}

describe("xr.input.zAxisAmplification", () => {
    test("on the desktop, with enableZAmplificationInDesktop, multiplies only Z", () => {
        graph.setXRConfig({ input: { zAxisAmplification: 4, enableZAmplificationInDesktop: true } });
        assertNear(drag(new Vector3(1, 2, 3)), new Vector3(1, 2, 12), "X and Y follow the pointer, Z is 4x");
    });

    test("on the desktop, without enableZAmplificationInDesktop, nothing is amplified", () => {
        graph.setXRConfig({ input: { zAxisAmplification: 4 } });
        assertNear(drag(new Vector3(1, 2, 3)), new Vector3(1, 2, 3), "the node follows the pointer");
    });

    test("in XR, the default amplifies only Z, 10x", () => {
        graph.scene.metadata.xrHelper = { baseExperience: { state: IN_XR } };
        assertNear(drag(new Vector3(0.1, 0.2, 0.3)), new Vector3(0.1, 0.2, 3), "X and Y follow the hand, Z is 10x");
    });
});

describe("the XR tracking-glitch guard", () => {
    test("in XR, a pointer jump larger than 5 units leaves the node where it is, and movement carries on after it", () => {
        graph.scene.metadata.xrHelper = { baseExperience: { state: IN_XR } };
        const moved = drag(new Vector3(1, 0, 0), new Vector3(51, 0, 0), new Vector3(52, 0, 0));
        assertNear(
            moved,
            new Vector3(2, 0, 0),
            "the 50-unit jump is ignored; the 1-unit moves either side of it count",
        );
    });

    test("in XR, steady movement adds up past 5 units", () => {
        graph.scene.metadata.xrHelper = { baseExperience: { state: IN_XR } };
        const steps = Array.from({ length: 10 }, (_, i) => new Vector3(i + 1, 0, 0));
        assertNear(drag(...steps), new Vector3(10, 0, 0), "ten 1-unit steps move the node 10 units");
    });

    test("on the desktop, a large pointer move is followed", () => {
        assertNear(drag(new Vector3(50, 0, 0)), new Vector3(50, 0, 0), "the node follows the pointer");
    });
});

/**
 * Drag a node in a real VR session on an emulated Quest 3 (IWER): hold the right hand up, put a
 * node where its ray points, pinch, move the hand 10 cm (past the drag threshold, where the drag
 * begins), then move it by each offset in turn from there, and let go. Returns where the node ends
 * up relative to where the drag began.
 * @param zAxisAmplification - `xr.input.zAxisAmplification`, or the default.
 * @param offsets - Hand offsets from where the drag began, in metres, one per frame.
 * @returns The node's movement.
 */
async function headsetDrag(zAxisAmplification: number | undefined, ...offsets: Vector3[]): Promise<Vector3> {
    // Set before VR starts, as a page would.
    const driver = await createXRInputDriver("hand", zAxisAmplification === undefined ? {} : { zAxisAmplification });
    try {
        const at = new Vector3(0.2, 1, -0.3);
        const hand = async (offset: Vector3, pinchDistance = 0.01): Promise<void> => {
            driver.setHand("right", at.add(offset), pinchDistance);
            await driver.frame();
        };
        await hand(Vector3.Zero(), 0.1);
        const source = driver.element
            .getXRSessionManager()
            ?.getXRHelper()
            ?.input.controllers.find((controller) => controller.inputSource.handedness === "right");
        assert.exists(source, "the right hand is not tracked");
        const ray = new Ray(Vector3.Zero(), Vector3.Forward());
        source.getWorldPointerRayToRef(ray);
        const on = ray.origin.add(ray.direction.scale(3));
        await driver.element.session.data.addNodes([{ id: "h", position: { x: on.x, y: on.y, z: on.z } }]);
        await driver.graph.setLayout("fixed", { dim: 3 });
        await operationQueueOf(driver.graph).waitForCompletion();
        await driver.frame();
        const dragged = driver.graph.getDataManager().getNode("h");
        assert.isDefined(dragged);

        await hand(Vector3.Zero());
        const began = new Vector3(0.1, 0, 0);
        await hand(began);
        assert.isTrue(driver.handler.isDragging(), "the pinch did not take the node");
        const start = dragged.drawnPosition.clone();
        for (const offset of offsets) {
            await hand(began.add(offset));
        }

        const moved = dragged.drawnPosition.subtract(start);
        await hand(began, 0.1);
        return moved;
    } finally {
        await driver.dispose();
    }
}

describe("a headset drag", () => {
    test("by default, X and Y follow the hand and Z is 10x", async () => {
        assertNear(
            await headsetDrag(undefined, new Vector3(0.1, 0.2, 0.3)),
            new Vector3(0.1, 0.2, 3),
            "only depth is amplified",
        );
    });

    test("multiplies only Z by xr.input.zAxisAmplification", async () => {
        assertNear(await headsetDrag(4, new Vector3(0.1, 0.2, 0.3)), new Vector3(0.1, 0.2, 1.2), "Z is 4x, X and Y 1x");
    });

    test("ignores a hand jump larger than 5 units, and movement carries on after it", async () => {
        const moved = await headsetDrag(undefined, new Vector3(1, 0, 0), new Vector3(51, 0, 0), new Vector3(52, 0, 0));
        assertNear(
            moved,
            new Vector3(2, 0, 0),
            "the 50-unit jump is ignored; the 1-unit moves either side of it count",
        );
    });
});
