/**
 * @file `xr.input.zAxisAmplification` multiplies only depth (Z) movement of a dragged node, and an
 * XR drag ignores a pointer jump that is a controller losing and reacquiring tracking: a move faster
 * than 10 m/s since the previous update (never judged over less than one 120 Hz frame), or further
 * than 2 m however long it took, measured before amplification.
 *
 * The drag is driven through `node.dragHandler`, the entry an XR controller feeds world positions
 * into. XR mode is the element's own signal for an immersive session: the WebXR helper it stores
 * on the scene, in the IN_XR state, which here stands in for a headset.
 *
 * The headset drag runs in a real immersive session on an emulated Quest 3 (IWER): a tracked hand
 * pinches while its ray points at the node, and moves (`createXRInputDriver`).
 */
import { Ray, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

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
    return timedDrag(offsets.map((offset) => ({ offset, afterMs: 0 })));
}

/**
 * Drag the node as {@link drag} does, with the clock moved on by each update's `afterMs` before it.
 * @param updates - Pointer offsets from the drag start, and the time since the previous update.
 * @returns The node's movement.
 */
function timedDrag(updates: { offset: Vector3; afterMs: number }[]): Vector3 {
    const handler = node.dragHandler;
    assert.isDefined(handler);
    let now = 1000;
    const clock = vi.spyOn(performance, "now").mockImplementation(() => now);
    try {
        const start = node.drawnPosition.clone();
        handler.onDragStart(start);
        for (const { offset, afterMs } of updates) {
            now += afterMs;
            handler.onDragUpdate(start.add(offset));
        }
        const moved = node.drawnPosition.subtract(start);
        handler.onDragEnd();
        return moved;
    } finally {
        clock.mockRestore();
    }
}

/**
 * A move split into equal steps, as a hand makes it over several frames.
 * @param total - The whole move.
 * @param count - How many steps.
 * @param from - Where the move starts.
 * @returns The offset after each step.
 */
function steps(total: Vector3, count: number, from = Vector3.Zero()): Vector3[] {
    return Array.from({ length: count }, (_, i) => from.add(total.scale((i + 1) / count)));
}

/**
 * Assert two vectors are equal to within rounding.
 * @param actual - The vector measured.
 * @param expected - The vector expected.
 * @param message - What is being checked.
 * @param within - How near is near enough.
 */
function assertNear(actual: Vector3, expected: Vector3, message: string, within = 1e-6): void {
    assert.isBelow(Vector3.Distance(actual, expected), within, `${message}: got ${actual.toString()}`);
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
        assertNear(
            drag(...steps(new Vector3(0.1, 0.2, 0.3), 10)),
            new Vector3(0.1, 0.2, 3),
            "X and Y follow the hand, Z is 10x",
        );
    });
});

describe("the XR tracking-glitch guard", () => {
    /** One frame of a 90 Hz headset, in ms. */
    const FRAME_MS = 1000 / 90;

    beforeEach(() => {
        graph.scene.metadata.xrHelper = { baseExperience: { state: IN_XR } };
    });

    test("a move faster than a hand within one frame leaves the node where it is, and the drag carries on after it", () => {
        // 5 cm a frame is 4.5 m/s, a quick hand; 50 cm in one frame is 45 m/s, a tracking snap.
        const before = steps(new Vector3(0.25, 0, 0), 5);
        const snapped = new Vector3(0.75, 0, 0);
        const after = steps(new Vector3(0.1, 0, 0), 2, snapped);
        const moved = timedDrag([...before, snapped, ...after].map((offset) => ({ offset, afterMs: FRAME_MS })));
        assertNear(moved, new Vector3(0.35, 0, 0), "the 50 cm snap is ignored; the 5 cm moves either side count");
    });

    test("a fast, continuous, amplified drag is never blocked", () => {
        // 8 cm a 90 Hz frame is 7.2 m/s; 40 frames carry the hand 3.2 m, the node 32 m deep.
        const moved = timedDrag(steps(new Vector3(0, 0, 3.2), 40).map((offset) => ({ offset, afterMs: FRAME_MS })));
        assertNear(moved, new Vector3(0, 0, 32), "every frame of the drag moves the node");
    });

    test("the limit follows the time since the previous update, not a count of frames", () => {
        // 40 cm in one 90 Hz frame (36 m/s) is a snap; the same 40 cm over 100 ms (4 m/s) is a hand.
        const fast = timedDrag([{ offset: new Vector3(0.4, 0, 0), afterMs: FRAME_MS }]);
        assertNear(fast, Vector3.Zero(), "40 cm in 11 ms is ignored");
        const slow = timedDrag([{ offset: new Vector3(0.4, 0, 0), afterMs: 100 }]);
        assertNear(slow, new Vector3(0.4, 0, 0), "40 cm in 100 ms is followed");
    });

    test("however long since the previous update, a jump past an arm's reach is ignored", () => {
        const moved = timedDrag([{ offset: new Vector3(3, 0, 0), afterMs: 5000 }]);
        assertNear(moved, Vector3.Zero(), "3 m after 5 s is not a hand");
    });

    test("on the desktop, a large pointer move is followed", () => {
        graph.scene.metadata.xrHelper = undefined;
        assertNear(drag(new Vector3(50, 0, 0)), new Vector3(50, 0, 0), "the node follows the pointer");
    });
});

/**
 * Drag a node in a real VR session on an emulated Quest 3 (IWER): hold the right hand up, put a
 * node where its ray points, pinch, move the hand 10 cm (past the drag threshold, where the drag
 * begins), then move it by each offset in turn from there, and let go. Returns where the node ends
 * up relative to where the drag began. Each offset is one update; a step of 5 cm or less is within
 * a hand's reach in a single frame at any frame rate, so the guard never takes it for a glitch.
 * @param zAxisAmplification - `xr.input.zAxisAmplification`, or the default.
 * @param offsets - Hand offsets from where the drag began, in meters, one per frame.
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

/**
 * How near a headset drag's result can be expected to come, at a given amplification. The headset
 * reports hand poses in 32-bit floats, and the hand is held about 1 m up, where one float32 step is
 * 2^-23 m (1.2e-7 m); composing the pose (reference space, wrist, joints) rounds a few times, so the
 * hand is known to about 4 steps, and amplification multiplies that error along with the move.
 * @param amplification - `xr.input.zAxisAmplification` in effect.
 * @returns The tolerance, in meters.
 */
function headsetWithin(amplification: number): number {
    return 4 * 2 ** -23 * amplification;
}

describe("a headset drag", () => {
    test("by default, X and Y follow the hand and Z is 10x", async () => {
        assertNear(
            await headsetDrag(undefined, ...steps(new Vector3(0.1, 0.2, 0.3), 10)),
            new Vector3(0.1, 0.2, 3),
            "only depth is amplified",
            headsetWithin(10),
        );
    });

    test("multiplies only Z by xr.input.zAxisAmplification", async () => {
        assertNear(
            await headsetDrag(4, ...steps(new Vector3(0.1, 0.2, 0.3), 10)),
            new Vector3(0.1, 0.2, 1.2),
            "Z is 4x, X and Y 1x",
            headsetWithin(4),
        );
    });

    test("ignores a one-frame tracking jump, and the drag carries on smoothly after it", async () => {
        // 5 cm steps, then the hand reported 50 m away for one frame (past any bound, however
        // slowly the page renders), then 5 cm steps from there.
        const snapped = new Vector3(50.1, 0, 0);
        const moved = await headsetDrag(
            undefined,
            ...steps(new Vector3(0.1, 0, 0), 2),
            snapped,
            ...steps(new Vector3(0.1, 0, 0), 2, snapped),
        );
        // The headset reports poses in 32-bit floats, a few millionths of a meter apart at 50 m.
        assertNear(moved, new Vector3(0.2, 0, 0), "the jump is ignored; the moves either side of it count", 1e-5);
    });

    test("a fast, continuous, amplified drag is not blocked", async () => {
        // 5 cm of depth an update, 1.5 m in all: the node goes 15 m deep at the default 10x.
        assertNear(
            await headsetDrag(undefined, ...steps(new Vector3(0, 0, 1.5), 30)),
            new Vector3(0, 0, 15),
            "every update of the drag moves the node",
            headsetWithin(10),
        );
    });
});
