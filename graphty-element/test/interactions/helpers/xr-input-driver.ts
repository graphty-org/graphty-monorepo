/**
 * Drives the element's XR input in a real immersive session on an emulated Meta Quest 3 (IWER).
 *
 * The driver mounts a graphty-element, enters VR through it, and moves the emulated headset's
 * thumbsticks and hands. Babylon's WebXR pipeline delivers them -- motion controllers, the hand
 * tracking feature, joint meshes -- to the element's own XRInputHandler, which moves the pivot the
 * reader is parented to.
 */
import "../../../src/graphty-element";

import type { Vector3 } from "@babylonjs/core";
import { pinchHandPose } from "iwer/lib/device/configs/hand/pinch.js";
import { relaxedHandPose } from "iwer/lib/device/configs/hand/relaxed.js";
import { XRHandJoint } from "iwer/lib/input/XRHand.js";
import { assert, vi } from "vitest";

import type { Graphty } from "../../../index.js";
import type { PivotController } from "../../../src/cameras/PivotController";
import type { XRInputHandler } from "../../../src/cameras/XRInputHandler";
import type { XRPivotCameraController } from "../../../src/cameras/XRPivotCameraController";
import type { XRInputConfig } from "../../../src/config/XRConfig";
import { type Graph, operationQueueOf } from "../../../src/Graph";
import { installIWER, type IWERHandle } from "./iwer-setup";

type Handedness = "left" | "right";

/** A graphty-element in a real VR session, and the emulated headset's inputs. */
export interface XRInputDriver {
    element: Graphty;
    graph: Graph;
    iwer: IWERHandle;
    /** The element's XR input handler, which Babylon feeds. */
    handler: XRInputHandler;
    /** The pivot the reader is parented to, which the input moves. */
    pivot: PivotController;
    /**
     * Set a controller's thumbstick axes, as the gamepad reports them.
     * @param handedness - which controller
     * @param x - stick X in [-1, 1]
     * @param y - stick Y in [-1, 1]
     */
    setStick: (handedness: Handedness, x: number, y: number) => void;
    /**
     * Hold a tracked hand at `at`, its thumb and index tips `pinchDistance` apart. `at` is the
     * hand's origin in the scene's coordinates (the wrist joint sits a few centimetres from it).
     * @param handedness - which hand
     * @param at - where the hand is, in metres
     * @param pinchDistance - thumb tip to index tip, in metres
     */
    setHand: (handedness: Handedness, at: Vector3, pinchDistance: number) => void;
    /** Let the session render frames, so Babylon delivers the inputs set and the handler reads them. */
    frame: () => Promise<void>;
    /** Leave VR, remove the element and put the browser's WebXR back. */
    dispose: () => Promise<void>;
}

/**
 * The emulated hand's pinch value whose thumb-to-index distance is `distance`. IWER moves each
 * joint linearly from the relaxed pose to the pinch pose, so the distance is |a + t * b|.
 * @param distance - thumb tip to index tip, in metres
 * @returns the pinch value, in [0, 1]
 */
function pinchValueFor(distance: number): number {
    const tip = (pose: typeof relaxedHandPose, joint: XRHandJoint): number[] => {
        const m = pose.jointTransforms[joint].offsetMatrix;
        return [m[12], m[13], m[14]];
    };
    const gap = (pose: typeof relaxedHandPose): number[] => {
        const thumb = tip(pose, XRHandJoint.ThumbTip);
        const index = tip(pose, XRHandJoint.IndexFingerTip);
        return thumb.map((value, i) => value - index[i]);
    };
    const a = gap(relaxedHandPose);
    const b = gap(pinchHandPose).map((value, i) => value - a[i]);
    const dot = (u: number[], v: number[]): number => u.reduce((sum, value, i) => sum + value * v[i], 0);
    // |a + t b|^2 = d^2, the root nearer the relaxed pose's side.
    const qa = dot(b, b);
    const qb = 2 * dot(a, b);
    const qc = dot(a, a) - distance * distance;
    const t = (-qb - Math.sqrt(Math.max(0, qb * qb - 4 * qa * qc))) / (2 * qa);
    return Math.min(1, Math.max(0, t));
}

/**
 * Install IWER, mount a graphty-element with XR on, enter VR through it, and wait until the
 * emulated controllers (or hands) are tracked.
 * @param input - Which of the headset's inputs is live: its controllers or tracked hands.
 * @param options - More of the element's `xr.input` settings, set before VR starts.
 * @returns the driver
 */
export async function createXRInputDriver(
    input: "controller" | "hand",
    options: Partial<Omit<XRInputConfig, "handTracking">> = {},
): Promise<XRInputDriver> {
    const iwer = installIWER();
    iwer.device.primaryInputMode = input;
    const element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:400px;height:300px";
    element.xr = { enabled: true, ui: { enabled: true }, input: { ...options, handTracking: input === "hand" } };
    document.body.append(element);
    await vi.waitFor(() => {
        assert.isNotNull(element.shadowRoot?.querySelector('[data-xr-mode="immersive-vr"]') ?? null, "no VR button");
    });
    const { graph } = element;
    await operationQueueOf(graph).waitForCompletion();
    await element.setViewMode("vr");

    const controller = (): XRPivotCameraController => {
        const found = graph.scene.metadata?.xrCameraController as XRPivotCameraController | null | undefined;
        assert.exists(found, "no XR camera controller");
        return found;
    };
    const frames = async (count: number): Promise<void> => {
        const session = iwer.sessions.at(-1);
        assert.exists(session, "no XR session");
        const target = session.frames + count;
        await vi.waitFor(() => {
            assert.isAtLeast(session.frames, target, "the session stopped rendering");
        });
    };

    await vi.waitFor(() => {
        const helper = element.getXRSessionManager()?.getXRHelper();
        assert.exists(helper, "no XR session");
        const sources = helper.input.controllers.filter((source) =>
            input === "hand" ? source.inputSource.hand !== undefined : source.motionController !== undefined,
        );
        assert.lengthOf(sources, 2, `the emulated ${input}s are not tracked`);
        assert.isTrue(controller().getInputHandler().isEnabled(), "the XR input handler is not enabled");
    });
    // The handler binds a controller's thumbstick once its motion controller is ready.
    await frames(2);

    return {
        element,
        graph,
        iwer,
        handler: controller().getInputHandler(),
        pivot: controller().getPivotController(),
        setStick: (handedness, x, y) => {
            const stick = iwer.device.controllers[handedness];
            assert.exists(stick, `no ${handedness} controller`);
            stick.updateAxes("thumbstick", x, y);
        },
        setHand: (handedness, at, pinchDistance) => {
            const hand = iwer.device.hands[handedness];
            assert.exists(hand, `no ${handedness} hand`);
            // The scene's z runs opposite to WebXR's.
            hand.position.set(at.x, at.y, -at.z);
            // Immediately, so the pinch lands in the same frame as the move (a pending value lags it).
            hand.setPinchValueImmediate(pinchValueFor(pinchDistance));
        },
        // One frame applies the inputs set (IWER takes pending values at a frame's start); the
        // second is one the handler has read them in.
        frame: () => frames(2),
        dispose: async () => {
            await element.setViewMode("3d");
            element.remove();
            iwer.uninstall();
        },
    };
}
