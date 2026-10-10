// The hand pose layer (design section 5.1): framework code that computes the poses more than one
// technique depends on -- fist (the hands' squeeze), palm up, palm toward the face, pinch -- with
// begin and end thresholds and a 150 ms minimum hold, whether or not the gestures technique is on.

import { Vector3, WebXRHandJoint, type WebXRHandTracking } from "@babylonjs/core";

import type { Hand } from "../core/arbiter";

/** The poses the layer reports. */
export type PoseName = "fist" | "palmUp" | "palmFace" | "pinch";

/** One hand's poses this frame. */
export interface HandPoses {
    tracked: boolean;
    fist: boolean;
    palmUp: boolean;
    palmFace: boolean;
    pinch: boolean;
    /** Index tip to thumb tip, meters (Infinity when untracked). */
    pinchDistance: number;
}

/** Thresholds: [begin, end]. A pose turns on past begin and off only past end. */
const FIST_M: [number, number] = [0.05, 0.065];
const PALM_DOT: [number, number] = [0.75, 0.55];
const PINCH_M: [number, number] = [0.018, 0.03];
const MIN_HOLD_MS = 150;
const FINGERS: [WebXRHandJoint, WebXRHandJoint][] = [
    [WebXRHandJoint.INDEX_FINGER_TIP, WebXRHandJoint.INDEX_FINGER_METACARPAL],
    [WebXRHandJoint.MIDDLE_FINGER_TIP, WebXRHandJoint.MIDDLE_FINGER_METACARPAL],
    [WebXRHandJoint.RING_FINGER_TIP, WebXRHandJoint.RING_FINGER_METACARPAL],
    [WebXRHandJoint.PINKY_FINGER_TIP, WebXRHandJoint.PINKY_FINGER_METACARPAL],
];

/** The pose layer. */
export interface PoseLayer {
    readonly hands: Record<Hand, HandPoses>;
    /** Update from this frame's joints; calls `onChange` for every pose that turned on or off. */
    update(now: number, head: Vector3, onChange: (hand: Hand, pose: PoseName, on: boolean) => void): void;
}

/**
 * Create the pose layer.
 * @param tracking - the hand tracking feature, read each frame (null when the session has none)
 * @returns the layer
 */
export function createPoseLayer(tracking: () => WebXRHandTracking | null): PoseLayer {
    const blank = (): HandPoses => ({
        tracked: false,
        fist: false,
        palmUp: false,
        palmFace: false,
        pinch: false,
        pinchDistance: Infinity,
    });
    const hands: Record<Hand, HandPoses> = { left: blank(), right: blank() };
    // When each candidate pose first held its begin threshold (for the minimum hold).
    const since = new Map<string, number>();
    const w = new Vector3();
    const a = new Vector3();
    const b = new Vector3();
    const n = new Vector3();
    const tmp = new Vector3();

    const step = (
        hand: Hand,
        pose: PoseName,
        wantOn: boolean,
        wantOff: boolean,
        now: number,
        onChange: (h: Hand, p: PoseName, on: boolean) => void,
    ): void => {
        const key = `${hand}.${pose}`;
        const cur = hands[hand][pose];
        if (!cur && wantOn) {
            const t0 = since.get(key) ?? now;
            since.set(key, t0);
            if (now - t0 >= MIN_HOLD_MS) {
                hands[hand][pose] = true;
                onChange(hand, pose, true);
            }
        } else if (cur && wantOff) {
            hands[hand][pose] = false;
            since.delete(key);
            onChange(hand, pose, false);
        } else if (!wantOn) {
            since.delete(key);
        }
    };

    return {
        hands,
        update(now, head, onChange) {
            const t = tracking();
            for (const hand of ["left", "right"] as const) {
                const h = t?.getHandByHandedness(hand);
                const p = hands[hand];
                if (!h) {
                    if (p.tracked) {
                        for (const pose of ["fist", "palmUp", "palmFace", "pinch"] as const) {
                            step(hand, pose, false, true, now, onChange);
                        }
                    }
                    p.tracked = false;
                    p.pinchDistance = Infinity;
                    continue;
                }
                p.tracked = true;
                const j = (joint: WebXRHandJoint, out: Vector3): Vector3 =>
                    out.copyFrom(h.getJointMesh(joint).getAbsolutePosition());
                j(WebXRHandJoint.WRIST, w);
                // Fist: the four fingertips curled back near their metacarpals.
                let curl = 0;
                for (const [tip, base] of FINGERS) {
                    j(tip, a);
                    j(base, b);
                    curl += Vector3.Distance(a, b) / 4;
                }
                j(WebXRHandJoint.INDEX_FINGER_TIP, a);
                j(WebXRHandJoint.THUMB_TIP, b);
                p.pinchDistance = Vector3.Distance(a, b);
                // Palm normal from the wrist and two metacarpals; mirrored for the left hand.
                j(WebXRHandJoint.INDEX_FINGER_METACARPAL, a);
                j(WebXRHandJoint.PINKY_FINGER_METACARPAL, b);
                a.subtractInPlace(w);
                b.subtractInPlace(w);
                Vector3.CrossToRef(hand === "right" ? b : a, hand === "right" ? a : b, n);
                n.normalize();
                const up = n.y;
                head.subtractToRef(w, tmp).normalize();
                const face = Vector3.Dot(n, tmp);

                step(hand, "pinch", p.pinchDistance < PINCH_M[0], p.pinchDistance > PINCH_M[1], now, onChange);
                step(hand, "fist", curl < FIST_M[0] && !p.pinch, curl > FIST_M[1], now, onChange);
                step(hand, "palmUp", up > PALM_DOT[0], up < PALM_DOT[1], now, onChange);
                step(hand, "palmFace", face > PALM_DOT[0], face < PALM_DOT[1], now, onChange);
            }
        },
    };
}
