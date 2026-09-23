/**
 * WebXR emulation setup using IWER (Immersive Web Emulation Runtime)
 *
 * `installIWER` makes the page's `navigator.xr` an emulated Meta Quest 3, so immersive-vr and
 * immersive-ar sessions really start, render and end in headless Chromium. The mock factories
 * below are plain data for the gesture tests, which drive the gesture code without a runtime.
 */

import { metaQuest3, XRDevice } from "iwer";

import type { MockController, MockHand, Vector3D } from "../types";

/**
 * One immersive session the page asked for, and what happened to it.
 */
export interface RecordedXRSession {
    /** The mode passed to `navigator.xr.requestSession`. */
    mode: XRSessionMode;
    /** The session the runtime returned. */
    session: XRSession;
    /** XR frames the session has delivered to the page so far. */
    frames: number;
    /** Whether the session has fired `end`. */
    ended: boolean;
}

/**
 * An installed IWER runtime.
 */
export interface IWERHandle {
    /** The emulated headset, for moving controllers, hands and the head. */
    device: XRDevice;
    /** Every session requested since install, oldest first. */
    sessions: RecordedXRSession[];
    /** Put the browser's own `navigator.xr` back. */
    uninstall: () => void;
}

/**
 * Install IWER as the page's WebXR runtime, emulating a Meta Quest 3, and record every session the
 * page starts: its mode, whether it ended, and how many XR frames it rendered.
 *
 * Install it BEFORE the graph initializes: the element asks the runtime which modes are supported
 * once, at init, and draws its VR / AR buttons from that answer.
 *
 * IWER cannot be removed completely. It also pins `navigator.userAgent` (non-configurable) and adds
 * `makeXRCompatible` to WebGL2; `uninstall` restores `navigator.xr`, which is what the element reads.
 * @returns the device, the session record and the uninstall function
 */
export function installIWER(): IWERHandle {
    const device = new XRDevice(metaQuest3);

    device.installRuntime();

    const { xr } = navigator;

    if (!xr) {
        throw new Error("IWER installed no navigator.xr");
    }

    const sessions: RecordedXRSession[] = [];
    const requestSession = xr.requestSession.bind(xr);

    xr.requestSession = async (mode: XRSessionMode, init?: XRSessionInit): Promise<XRSession> => {
        const session = await requestSession(mode, init);
        const record: RecordedXRSession = { mode, session, frames: 0, ended: false };
        const requestFrame = session.requestAnimationFrame.bind(session);

        sessions.push(record);
        session.addEventListener("end", () => {
            record.ended = true;
        });
        session.requestAnimationFrame = (callback: XRFrameRequestCallback): number =>
            requestFrame((time, frame) => {
                record.frames++;
                callback(time, frame);
            });

        return session;
    };

    return {
        device,
        sessions,
        uninstall: () => {
            // IWER defined `xr` on the navigator instance, shadowing the browser's own getter.
            Reflect.deleteProperty(navigator, "xr");
        },
    };
}

/**
 * Create a mock hand configuration for testing.
 * Returns a hand in a neutral, relaxed position.
 *
 * @param handedness - "left" or "right"
 * @returns Mock hand configuration
 */
export function createMockHand(handedness: "left" | "right"): MockHand {
    // Standard WebXR hand joint names
    const jointNames = [
        "wrist",
        "thumb-metacarpal",
        "thumb-phalanx-proximal",
        "thumb-phalanx-distal",
        "thumb-tip",
        "index-finger-metacarpal",
        "index-finger-phalanx-proximal",
        "index-finger-phalanx-intermediate",
        "index-finger-phalanx-distal",
        "index-finger-tip",
        "middle-finger-metacarpal",
        "middle-finger-phalanx-proximal",
        "middle-finger-phalanx-intermediate",
        "middle-finger-phalanx-distal",
        "middle-finger-tip",
        "ring-finger-metacarpal",
        "ring-finger-phalanx-proximal",
        "ring-finger-phalanx-intermediate",
        "ring-finger-phalanx-distal",
        "ring-finger-tip",
        "pinky-finger-metacarpal",
        "pinky-finger-phalanx-proximal",
        "pinky-finger-phalanx-intermediate",
        "pinky-finger-phalanx-distal",
        "pinky-finger-tip",
    ];

    const joints = new Map<string, Vector3D>();
    const xOffset = handedness === "left" ? -0.2 : 0.2;

    for (const name of jointNames) {
        // Default position at roughly head height, offset to the side
        joints.set(name, { x: xOffset, y: 1.5, z: -0.3 });
    }

    return {
        handedness,
        joints,
        pinchStrength: 0,
    };
}

/**
 * Create a mock hand in a pinching pose.
 * Thumb and index finger tips are brought close together.
 *
 * @param handedness - "left" or "right"
 * @returns Mock hand in pinching configuration
 */
export function createPinchingHand(handedness: "left" | "right"): MockHand {
    const hand = createMockHand(handedness);
    const xOffset = handedness === "left" ? -0.2 : 0.2;

    // Position thumb and index tip close together (2cm apart = pinching)
    hand.joints.set("thumb-tip", { x: xOffset, y: 1.5, z: -0.3 });
    hand.joints.set("index-finger-tip", { x: xOffset + 0.02, y: 1.5, z: -0.3 });
    hand.pinchStrength = 0.9;

    return hand;
}

/**
 * Create a mock controller configuration for testing.
 * Returns a controller in a neutral position pointing forward.
 *
 * @param handedness - "left" or "right"
 * @returns Mock controller configuration
 */
export function createMockController(handedness: "left" | "right"): MockController {
    const xOffset = handedness === "left" ? -0.3 : 0.3;

    return {
        handedness,
        position: { x: xOffset, y: 1.0, z: -0.3 },
        rotation: { x: 0, y: 0, z: 0 },
        thumbstick: { x: 0, y: 0 },
        trigger: { value: 0, pressed: false },
        grip: { value: 0, pressed: false },
    };
}
