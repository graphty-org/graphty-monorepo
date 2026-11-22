/**
 * @file In a headset, input moves things in the reader's own frame: once the scene has been turned,
 * the right stick still pans along the reader's right, and a grab follows the hand wherever the
 * reader's head is turned, and its depth is amplified along the reader's depth, not the scene's Z.
 *
 * Runs in a real immersive session on an emulated Meta Quest 3 (IWER), whose thumbsticks, hands and
 * headset pose the tests set.
 */
import { Quaternion, Vector3 } from "@babylonjs/core";
import { afterEach, assert, test, vi } from "vitest";

import { createXRInputDriver, type XRInputDriver } from "../helpers/xr-input-driver";

let driver: XRInputDriver;

afterEach(async () => {
    await driver.dispose();
});

/** @returns the reader's right, in the scene: the headset camera's +X axis */
function readerRight(): Vector3 {
    const camera = driver.graph.scene.activeCamera;
    assert.exists(camera, "no active camera");
    return camera.getDirection(Vector3.Right()).normalize();
}

/** @returns the pivot's yaw, in radians */
function yaw(): number {
    return (driver.pivot.pivot.rotationQuaternion ?? Quaternion.Identity()).toEulerAngles().y;
}

/**
 * Push the right stick right for a few frames, then let go.
 * @returns how far the pivot moved
 */
async function panRight(): Promise<Vector3> {
    const before = driver.pivot.pivot.position.clone();
    driver.setStick("right", 0.8, 0);
    for (let i = 0; i < 5; i++) {
        await driver.frame();
    }
    driver.setStick("right", 0, 0);
    await driver.frame();
    return driver.pivot.pivot.position.subtract(before);
}

/** Turn the scene a quarter turn or more with the left stick. */
async function turnScene(): Promise<void> {
    driver.setStick("left", 1, 0);
    await vi.waitFor(() => {
        assert.isAbove(Math.abs(yaw()), Math.PI / 2, "the left stick does not turn the scene");
    });
    driver.setStick("left", 0, 0);
    await driver.frame();
}

test("the right stick pans along the reader's right before and after the left stick turns the scene", async () => {
    driver = await createXRInputDriver("controller");

    const straight = await panRight();
    assert.isAbove(straight.length(), 0.01, "the right stick did not pan");
    assert.closeTo(
        Vector3.Dot(straight.normalize(), readerRight()),
        1,
        1e-3,
        "the pan is not along the reader's right",
    );

    await turnScene();

    const turned = await panRight();
    assert.isAbove(turned.length(), 0.01, "the right stick did not pan");
    assert.closeTo(
        Vector3.Dot(turned.normalize(), readerRight()),
        1,
        1e-3,
        `after the turn, the pan ${turned.toString()} is not along the reader's right ${readerRight().toString()}`,
    );
});

test("with the reader's head turned, a grab follows the hand, not the head", async () => {
    driver = await createXRInputDriver("hand");
    // The reader looks a quarter turn to the left; the hands stay where they are.
    driver.iwer.device.quaternion.set(0, Math.SQRT1_2, 0, Math.SQRT1_2);

    const at = new Vector3(0.2, 1, -0.3);
    const hand = async (offset: Vector3, pinchDistance = 0.01): Promise<void> => {
        driver.setHand("right", at.add(offset), pinchDistance);
        await driver.frame();
    };
    await hand(Vector3.Zero(), 0.1);
    const node = await driver.putNodeOnRay("right", "h", 3);

    // Pinch, move past the drag threshold (where the drag begins), then move 10 cm up.
    await hand(Vector3.Zero());
    await hand(new Vector3(0.1, 0, 0));
    assert.isTrue(driver.handler.isDragging(), "the pinch did not take the node");
    const start = node.drawnPosition.clone();
    await hand(new Vector3(0.1, 0.1, 0));
    const moved = node.drawnPosition.subtract(start);
    await hand(new Vector3(0.1, 0.1, 0), 0.1);

    assert.isBelow(Vector3.Distance(moved, new Vector3(0, 0.1, 0)), 1e-3, `the node moved ${moved.toString()}`);
});

test("after the scene is turned, a sideways drag moves the node sideways, unamplified", async () => {
    driver = await createXRInputDriver("controller");
    await turnScene();

    const controller = driver.iwer.device.controllers.right;
    assert.exists(controller, "no right controller");
    const at = new Vector3(0.2, 1, -0.3);
    const hold = async (offset: Vector3, trigger: number): Promise<void> => {
        // The scene's z runs opposite to WebXR's.
        controller.position.set(at.x + offset.x, at.y + offset.y, -(at.z + offset.z));
        controller.updateButtonValue("trigger", trigger);
        await driver.frame();
    };
    await hold(Vector3.Zero(), 0);
    const node = await driver.putNodeOnRay("right", "r", 3);

    // Press, move past the drag threshold (where the drag begins), then move 10 cm to the right.
    await hold(Vector3.Zero(), 1);
    await hold(new Vector3(0.1, 0, 0), 1);
    assert.isTrue(driver.handler.isDragging(), "the trigger did not take the node");
    const start = node.drawnPosition.clone();
    await hold(new Vector3(0.2, 0, 0), 1);
    const moved = node.drawnPosition.subtract(start);
    await hold(new Vector3(0.2, 0, 0), 0);

    const expected = readerRight().scale(0.1);
    assert.isBelow(
        Vector3.Distance(moved, expected),
        1e-3,
        `the node moved ${moved.toString()}, not ${expected.toString()} along the reader's right`,
    );
});
