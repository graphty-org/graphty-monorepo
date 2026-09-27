/**
 * Drives the element's real XRInputHandler without a WebXR runtime.
 *
 * The handler reads thumbsticks from controllers' motion controllers and hands from Babylon's
 * hand tracking feature. This fakes only those two data sources -- stick axes and three hand
 * joints -- so every frame of gesture maths, pinch hysteresis and gesture state runs in the
 * handler itself.
 */
import { Observable, type Scene, Vector3, type WebXRDefaultExperience, type WebXRInputSource } from "@babylonjs/core";

import { PivotController } from "../../../src/cameras/PivotController";
import { XRInputHandler } from "../../../src/cameras/XRInputHandler";

type Handedness = "left" | "right";

/** A real XRInputHandler, its pivot, and the inputs it reads. */
export interface XRInputDriver {
    handler: XRInputHandler;
    pivot: PivotController;
    /**
     * Set a thumbstick. The first call for a hand connects a controller for it.
     * @param handedness - which controller
     * @param x - stick X in [-1, 1]
     * @param y - stick Y in [-1, 1]
     */
    setStick: (handedness: Handedness, x: number, y: number) => void;
    /**
     * Place a tracked hand: its wrist, and its thumb and index tips `pinchDistance` apart.
     * @param handedness - which hand
     * @param wrist - wrist position, in metres
     * @param pinchDistance - thumb tip to index tip, in metres
     */
    setHand: (handedness: Handedness, wrist: Vector3, pinchDistance: number) => void;
    /** Run one frame: the handler polls its sticks and processes input. */
    frame: () => void;
    /** Disable the handler. */
    dispose: () => void;
}

/**
 * Build a real XRInputHandler on `scene`, with a fresh PivotController, and enable it.
 * @param scene - the scene the pivot and the handler live in
 * @returns the driver
 */
export function createXRInputDriver(scene: Scene): XRInputDriver {
    const pivot = new PivotController(scene);
    const onControllerAddedObservable = new Observable<WebXRInputSource>();
    const hands: Partial<Record<Handedness, Record<string, { position: Vector3 }>>> = {};
    const sticks: Partial<Record<Handedness, { x: number; y: number }>> = {};
    const handTracking = {
        getHandByHandedness: (handedness: Handedness) => {
            const joints = hands[handedness];

            return joints ? { getJointMesh: (joint: string) => joints[joint] ?? null } : null;
        },
    };
    const xr = {
        baseExperience: {
            sessionManager: { scene },
            featuresManager: {
                getEnabledFeature: (name: string) => (name === "xr-hand-tracking" ? handTracking : null),
            },
        },
        input: {
            controllers: [],
            onControllerAddedObservable,
            onControllerRemovedObservable: new Observable<WebXRInputSource>(),
        },
    } as unknown as WebXRDefaultExperience;
    const handler = new XRInputHandler(pivot, xr);

    handler.enable();

    return {
        handler,
        pivot,
        setStick: (handedness, x, y) => {
            const existing = sticks[handedness];

            if (existing) {
                existing.x = x;
                existing.y = y;
                return;
            }

            const axes = { x, y };
            const thumbstick = { axes, onAxisValueChangedObservable: new Observable<{ x: number; y: number }>() };

            sticks[handedness] = axes;
            onControllerAddedObservable.notifyObservers({
                uniqueId: `${handedness}-controller`,
                inputSource: { handedness, profiles: ["oculus-touch"] },
                motionController: {
                    getComponent: (id: string) => (id === "xr-standard-thumbstick" ? thumbstick : null),
                },
            } as unknown as WebXRInputSource);
        },
        setHand: (handedness, wrist, pinchDistance) => {
            const thumbTip = wrist.add(new Vector3(0, 0, -0.1));

            hands[handedness] = {
                wrist: { position: wrist.clone() },
                "thumb-tip": { position: thumbTip },
                "index-finger-tip": { position: thumbTip.add(new Vector3(pinchDistance, 0, 0)) },
            };
        },
        frame: () => {
            scene.onBeforeRenderObservable.notifyObservers(scene);
            handler.update();
        },
        dispose: () => {
            handler.disable();
        },
    };
}
