/**
 * Where XRInputHandler reads each hand from: a controller's trigger first, then hand tracking.
 *
 * Drives the real handler through its public `update()` with faked inputs (a controller's grip
 * and trigger, and three hand joints), and reads the two-hand zoom it hands the pivot: the zoom
 * is computed from the two hand positions of the frame before and of this frame, so it shows which
 * source each hand came from and when the gesture state was reset.
 */
import { NullEngine, Scene, TransformNode, Vector3, type WebXRDefaultExperience } from "@babylonjs/core";
import { assert } from "chai";
import { afterEach, beforeEach, describe, test, vi } from "vitest";

import { twoHandGestureDelta } from "../../src/cameras/InputUtils";
import { PivotController } from "../../src/cameras/PivotController";
import { XRInputHandler } from "../../src/cameras/XRInputHandler";

type Handedness = "left" | "right";

interface Trigger {
    pressed?: boolean;
    value?: number;
}

interface FakeController {
    grip: TransformNode | undefined;
    trigger: Trigger | null;
    throws: boolean;
}

interface Joint {
    position: Vector3;
}

/** Thumb-to-index distances, in metres, for a hand that is clearly pinching or clearly open. */
const PINCHED = 0.02;
const OPEN = 0.08;

describe("XRInputHandler hand state", () => {
    let engine: NullEngine;
    let scene: Scene;
    let pivot: PivotController;
    let handler: XRInputHandler;
    let zooms: number[];
    let controllers: Partial<Record<Handedness, FakeController>>;
    let hands: Partial<Record<Handedness, Record<string, Joint>>>;
    let handTracking: boolean;

    beforeEach(() => {
        engine = new NullEngine();
        scene = new Scene(engine);
        pivot = new PivotController(scene);
        zooms = [];
        controllers = {};
        hands = {};
        handTracking = false;
        vi.spyOn(pivot, "zoom").mockImplementation((factor: number) => {
            zooms.push(factor);
        });
        vi.spyOn(pivot, "rotateAroundAxis").mockImplementation(() => undefined);
    });

    afterEach(() => {
        handler.disable();
        vi.restoreAllMocks();
        scene.dispose();
        engine.dispose();
    });

    /** Build and enable the handler over the controllers and hands set up so far. */
    function start(): void {
        const feature = {
            getHandByHandedness: (handedness: Handedness) => {
                const joints = hands[handedness];
                return joints ? { getJointMesh: (name: string) => joints[name] ?? null } : null;
            },
        };
        const sources = (Object.keys(controllers) as Handedness[]).map((handedness) => {
            const fake = controllers[handedness] as FakeController;
            return {
                uniqueId: `${handedness}-controller`,
                inputSource: { handedness, profiles: ["oculus-touch"] },
                get grip() {
                    return fake.grip;
                },
                motionController: {
                    getComponent: (id: string) => {
                        if (id !== "xr-standard-trigger") {
                            return null;
                        }
                        if (fake.throws) {
                            throw new Error("disposed");
                        }
                        return fake.trigger;
                    },
                },
            };
        });
        const xr = {
            baseExperience: {
                sessionManager: { scene },
                featuresManager: {
                    getEnabledFeature: (name: string) => (name === "xr-hand-tracking" && handTracking ? feature : null),
                },
            },
            input: {
                controllers: sources,
                onControllerAddedObservable: { add: () => undefined },
                onControllerRemovedObservable: { add: () => undefined },
            },
        } as unknown as WebXRDefaultExperience;
        handler = new XRInputHandler(pivot, xr);
        handler.enable();
    }

    /**
     * Add a controller whose grip sits at `x` on the X axis.
     * @param handedness - which hand
     * @param x - grip X, in metres
     * @param trigger - the trigger component, or null for none
     * @returns the fake, to change between frames
     */
    function controller(handedness: Handedness, x: number, trigger: Trigger | null): FakeController {
        const grip = new TransformNode(`${handedness}-grip`, scene);
        grip.position = new Vector3(x, 1, 0);
        const fake: FakeController = { grip, trigger, throws: false };
        controllers[handedness] = fake;
        return fake;
    }

    /**
     * Place a tracked hand with its wrist at `x` on the X axis.
     * @param handedness - which hand
     * @param x - wrist X, in metres
     * @param pinchDistance - thumb tip to index tip, in metres
     */
    function hand(handedness: Handedness, x: number, pinchDistance: number): void {
        const wrist = new Vector3(x, 1, 0);
        const thumbTip = wrist.add(new Vector3(0, 0, -0.1));
        hands[handedness] = {
            wrist: { position: wrist },
            "thumb-tip": { position: thumbTip },
            "index-finger-tip": { position: thumbTip.add(new Vector3(pinchDistance, 0, 0)) },
        };
    }

    /**
     * Move a controller's grip along X.
     * @param fake - the controller
     * @param x - grip X, in metres
     */
    function moveGrip(fake: FakeController, x: number): void {
        (fake.grip as TransformNode).position = new Vector3(x, 1, 0);
    }

    /**
     * The zoom two hands at these X positions give after the pair before.
     * @param before - left and right X the frame before
     * @param after - left and right X this frame
     * @returns the zoom factor
     */
    function expectedZoom(before: [number, number], after: [number, number]): number {
        const d0 = Math.abs(before[1] - before[0]);
        const d1 = Math.abs(after[1] - after[0]);
        return twoHandGestureDelta(d0, new Vector3(1, 0, 0), d1, new Vector3(1, 0, 0)).zoom;
    }

    test("both triggers pressed zoom by the grips' spread", () => {
        const left = controller("left", 0, { pressed: true, value: 1 });
        const right = controller("right", 1, { pressed: true, value: 1 });
        start();
        handler.update();
        assert.deepEqual(zooms, [], "the first frame only records where the hands are");
        moveGrip(left, -0.5);
        moveGrip(right, 1.5);
        handler.update();
        assert.equal(zooms.length, 1);
        assert.closeTo(zooms[0], expectedZoom([0, 1], [-0.5, 1.5]), 1e-9);
    });

    test("a trigger value over 0.5 pinches without pressed", () => {
        const left = controller("left", 0, { value: 0.6 });
        controller("right", 1, { value: 0.51 });
        start();
        handler.update();
        moveGrip(left, -1);
        handler.update();
        assert.equal(zooms.length, 1);
        assert.closeTo(zooms[0], expectedZoom([0, 1], [-1, 1]), 1e-9);
    });

    test("a trigger value of exactly 0.5 does not pinch", () => {
        const left = controller("left", 0, { value: 0.5 });
        controller("right", 1, { pressed: true });
        start();
        handler.update();
        moveGrip(left, -1);
        handler.update();
        assert.deepEqual(zooms, []);
    });

    test("releasing a trigger resets the gesture", () => {
        const left = controller("left", 0, { pressed: true });
        const right = controller("right", 1, { pressed: true });
        start();
        handler.update();
        moveGrip(right, 2);
        handler.update();
        assert.equal(zooms.length, 1);
        left.trigger = { pressed: false, value: 0 };
        handler.update();
        assert.equal(zooms.length, 1, "one hand open: no gesture");
        left.trigger = { pressed: true };
        moveGrip(right, 4);
        handler.update();
        assert.equal(zooms.length, 1, "the gesture starts afresh after the release");
        moveGrip(right, 8);
        handler.update();
        assert.equal(zooms.length, 2);
        assert.closeTo(zooms[1], expectedZoom([0, 4], [0, 8]), 1e-9);
    });

    test("a hand pinching beside an open trigger restarts the gesture every frame", () => {
        // Pins today's behavior: the controller and the tracked hand share one pinch flag, so the
        // open trigger reads the hand's pinch as its own release and resets the gesture each frame.
        controller("left", 0, { pressed: false, value: 0 });
        controller("right", 1, { pressed: false, value: 0 });
        hand("left", 0, PINCHED);
        hand("right", 2, PINCHED);
        handTracking = true;
        start();
        handler.update();
        hand("right", 3, PINCHED);
        handler.update();
        hand("right", 4, PINCHED);
        handler.update();
        assert.deepEqual(zooms, []);
    });

    test("a controller's trigger wins over a pinching hand", () => {
        const left = controller("left", 0, { pressed: true });
        controller("right", 1, { pressed: true });
        hand("left", 10, PINCHED);
        hand("right", 20, PINCHED);
        handTracking = true;
        start();
        handler.update();
        moveGrip(left, -1);
        handler.update();
        assert.closeTo(zooms[0], expectedZoom([0, 1], [-1, 1]), 1e-9);
    });

    test("a controller with no grip, no trigger, a non-finite grip or a throwing trigger falls back to the hand", () => {
        const noGrip = controller("left", 0, { pressed: true });
        noGrip.grip = undefined;
        const right = controller("right", 1, { pressed: true });
        hand("left", 0, PINCHED);
        hand("right", 2, PINCHED);
        handTracking = true;
        start();
        handler.update();
        hand("left", -1, PINCHED);
        handler.update();
        // Right is the controller (x = 1), left the hand.
        assert.closeTo(zooms[0], expectedZoom([0, 1], [-1, 1]), 1e-9);

        right.trigger = null;
        handler.update();
        // Right now comes from its hand (x = 2): the spread jumps from 2 to 3.
        assert.closeTo(zooms[1], expectedZoom([-1, 1], [-1, 2]), 1e-9);

        right.trigger = { pressed: true };
        moveGrip(right, Number.NaN);
        hand("right", 4, PINCHED);
        handler.update();
        assert.closeTo(zooms[2], expectedZoom([-1, 2], [-1, 4]), 1e-9);

        moveGrip(right, 1);
        right.throws = true;
        hand("right", 5, PINCHED);
        handler.update();
        assert.closeTo(zooms[3], expectedZoom([-1, 4], [-1, 5]), 1e-9);
    });

    test("an open hand, a non-finite wrist or a missing joint is no hand", () => {
        hand("left", 0, PINCHED);
        hand("right", 1, PINCHED);
        handTracking = true;
        start();
        handler.update();
        hand("right", 2, OPEN);
        handler.update();
        assert.deepEqual(zooms, [], "an open hand does not pinch");

        hand("right", 2, PINCHED);
        handler.update();
        hand("right", 3, PINCHED);
        handler.update();
        assert.equal(zooms.length, 1, "the gesture restarts after the hand opened");
        assert.closeTo(zooms[0], expectedZoom([0, 2], [0, 3]), 1e-9);

        hand("right", Number.NaN, PINCHED);
        handler.update();
        hand("right", 4, PINCHED);
        handler.update();
        assert.equal(zooms.length, 2, "a non-finite wrist reads as no hand, and leaves the gesture state alone");
        assert.closeTo(zooms[1], expectedZoom([0, 3], [0, 4]), 1e-9);

        delete (hands.right as Record<string, Joint>)["index-finger-tip"];
        handler.update();
        assert.equal(zooms.length, 2, "a hand missing a joint is no hand");
    });
});
