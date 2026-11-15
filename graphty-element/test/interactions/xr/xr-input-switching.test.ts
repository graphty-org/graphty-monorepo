/**
 * @file A headset's inputs come and go during a session: the reader puts the controllers down and
 * uses their hands, picks the controllers up again, or a hand loses tracking. Each input works once
 * it is live, and a drag whose hand disappears ends where the hand left the node.
 *
 * Runs in a real immersive session on an emulated Meta Quest 3 (IWER): switching the headset's
 * primary input, or disconnecting a hand, removes and adds WebXR input sources as a real runtime
 * does, and Babylon delivers them to the element.
 */
import { Quaternion, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, test, vi } from "vitest";

import { createXRInputDriver, type XRInputDriver } from "../helpers/xr-input-driver";

/** Thumb-to-index distances, in metres, for a hand that is clearly pinching or clearly open. */
const PINCHED = 0.01;
const OPEN = 0.1;

let driver: XRInputDriver;

afterEach(async () => {
    await driver.dispose();
});

/**
 * Make the headset's controllers or its hands the live input, and wait until the session tracks
 * that pair and nothing else.
 * @param input - which input goes live
 */
async function goLive(input: "controller" | "hand"): Promise<void> {
    driver.iwer.device.primaryInputMode = input;
    await vi.waitFor(() => {
        const sources = driver.element.getXRSessionManager()?.getXRHelper()?.input.controllers ?? [];
        const hands = sources.filter((source) => Boolean(source.inputSource.hand));
        assert.lengthOf(sources, 2, `the session does not track exactly two inputs`);
        assert.lengthOf(hands, input === "hand" ? 2 : 0, `the ${input}s are not the live input`);
    });
}

/** @returns the pivot's yaw, in radians */
function yaw(): number {
    return (driver.pivot.pivot.rotationQuaternion ?? Quaternion.Identity()).toEulerAngles().y;
}

/** Push the left stick right until the scene turns, then let go. */
async function stickTurns(): Promise<void> {
    const before = yaw();
    driver.setStick("left", 0.8, 0);
    await vi.waitFor(() => {
        assert.isAbove(yaw(), before + 0.01, "the left stick does not turn the scene");
    });
    driver.setStick("left", 0, 0);
    await driver.frame();
}

/** Pinch both hands and spread them apart: the scene zooms. Then open them. */
async function handsZoom(): Promise<void> {
    driver.setHand("left", new Vector3(-0.1, 1, -0.5), PINCHED);
    driver.setHand("right", new Vector3(0.1, 1, -0.5), PINCHED);
    await driver.frame();
    const before = driver.pivot.pivot.scaling.x;
    driver.setHand("left", new Vector3(-0.3, 1, -0.5), PINCHED);
    driver.setHand("right", new Vector3(0.3, 1, -0.5), PINCHED);
    await driver.frame();
    assert.notEqual(driver.pivot.pivot.scaling.x, before, "spreading two pinched hands does not zoom");
    driver.setHand("left", new Vector3(-0.3, 1, -0.5), OPEN);
    driver.setHand("right", new Vector3(0.3, 1, -0.5), OPEN);
    await driver.frame();
}

describe("switching between controllers and hands", () => {
    test("hands, then controllers, then hands and controllers again: each works once it is live", async () => {
        driver = await createXRInputDriver("hand");
        await handsZoom();

        await goLive("controller");
        await stickTurns();

        await goLive("hand");
        await handsZoom();

        await goLive("controller");
        await stickTurns();
    });
});

describe("a hand that loses tracking in the middle of a drag", () => {
    test("drops the node where the hand left it, and a new drag works once the hand is back", async () => {
        driver = await createXRInputDriver("hand");
        const at = new Vector3(0.2, 1, -0.3);
        const hand = async (offset: Vector3, pinchDistance = PINCHED): Promise<void> => {
            driver.setHand("right", at.add(offset), pinchDistance);
            await driver.frame();
        };
        await hand(Vector3.Zero(), OPEN);
        const node = await driver.putNodeOnRay("right", "h", 3);

        // Pinch, move past the drag threshold (where the drag begins), then carry the node 10 cm.
        await hand(Vector3.Zero());
        await hand(new Vector3(0.1, 0, 0));
        assert.isTrue(driver.handler.isDragging(), "the pinch did not take the node");
        const start = node.drawnPosition.clone();
        await hand(new Vector3(0.2, 0, 0));
        const carried = node.drawnPosition.clone();
        assert.closeTo(Vector3.Distance(carried, start), 0.1, 1e-3, "the node did not follow the hand");

        const { right } = driver.iwer.device.hands;
        assert.exists(right, "no right hand");
        right.connected = false;
        await vi.waitFor(() => {
            assert.isFalse(driver.handler.isDragging(), "the drag outlived its hand");
        });
        await driver.frame();
        assert.isBelow(Vector3.Distance(node.drawnPosition, carried), 1e-6, "the node moved after its hand was lost");

        // The hand comes back open where it was, and drags the node again.
        driver.setHand("right", at.add(new Vector3(0.2, 0, 0)), OPEN);
        right.connected = true;
        await goLive("hand");
        await hand(new Vector3(0.2, 0, 0), OPEN);
        await hand(new Vector3(0.2, 0, 0));
        await hand(new Vector3(0.3, 0, 0));
        assert.isTrue(driver.handler.isDragging(), "the returned hand's pinch did not take the node");
        const restart = node.drawnPosition.clone();
        await hand(new Vector3(0.4, 0, 0));
        assert.closeTo(Vector3.Distance(node.drawnPosition, restart), 0.1, 1e-3, "the returned hand does not drag");
        await hand(new Vector3(0.4, 0, 0), OPEN);
    });
});
