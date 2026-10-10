// "Ours" two-hand scale and turn (design section 9.10): the graph's pose is a function of the two
// hands now and the snapshot taken when both hands took hold, nothing else. It never reads the
// graph's current transform, so the scale it applies cannot feed back into its own measurement
// (design section 10.2, rule 5). Scale is the ratio of hand distances, clamped to 0.2x to 5x; the
// turn is the change in direction of the line between the hands (graphty-element's
// twoHandGestureDelta, so full 3D, but no twist about that line); both are applied about the
// hands' midpoint. Pure: Babylon's math only, no scene, so the Node unit test can run it.

import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";

import { twoHandGestureDelta } from "./two-hand-gesture-delta";

/** The scale range of design section 9.10. */
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 5;

/** A graph root's pose, uniform scale. */
export interface Pose {
    position: Vector3;
    rotation: Quaternion;
    scale: number;
}

/** The hands and the graph pose when both hands took hold. */
export interface TwoHandStart {
    left: Vector3;
    right: Vector3;
    pose: Pose;
}

/**
 * Snapshot the start of a two-hand hold (copies, so later changes to the inputs do not leak in).
 * @param left - left hand position, reference space
 * @param right - right hand position, reference space
 * @param pose - the graph root's pose now
 * @returns the snapshot
 */
export function startTwoHand(left: Vector3, right: Vector3, pose: Pose): TwoHandStart {
    return {
        left: left.clone(),
        right: right.clone(),
        pose: { position: pose.position.clone(), rotation: pose.rotation.clone(), scale: pose.scale },
    };
}

const d0v = new Vector3();
const d1v = new Vector3();
const mid0 = new Vector3();
const mid1 = new Vector3();
const offset = new Vector3();
const turn = new Quaternion();

/**
 * The graph pose for the hands now. Allocates nothing.
 * @param s - the snapshot from startTwoHand
 * @param left - left hand position now
 * @param right - right hand position now
 * @param out - receives the pose
 * @param min - smallest scale
 * @param max - largest scale
 * @returns out
 */
export function twoHandPose(
    s: TwoHandStart,
    left: Vector3,
    right: Vector3,
    out: Pose,
    min = MIN_SCALE,
    max = MAX_SCALE,
): Pose {
    s.right.subtractToRef(s.left, d0v);
    right.subtractToRef(left, d1v);
    const d0 = d0v.length();
    const d1 = d1v.length();
    // Hands closer than 1 mm have no direction: hold scale and turn.
    const ok = d0 > 1e-3 && d1 > 1e-3;
    out.scale = ok ? Math.min(max, Math.max(min, (s.pose.scale * d1) / d0)) : s.pose.scale;
    const k = out.scale / s.pose.scale;
    turn.copyFromFloats(0, 0, 0, 1);
    if (ok) {
        const { axis, angle } = twoHandGestureDelta(d0, d0v.scaleInPlace(1 / d0), d1, d1v.scaleInPlace(1 / d1));
        if (axis) {
            // twoHandGestureDelta negates the angle for a camera pivot; the graph itself turns with +angle.
            Quaternion.RotationAxisToRef(axis, -angle, turn);
        }
    }
    s.left.addToRef(s.right, mid0).scaleInPlace(0.5);
    left.addToRef(right, mid1).scaleInPlace(0.5);
    // The graph point under the start midpoint stays under the midpoint now.
    s.pose.position.subtractToRef(mid0, offset).scaleInPlace(k);
    offset.rotateByQuaternionToRef(turn, offset);
    mid1.addToRef(offset, out.position);
    turn.multiplyToRef(s.pose.rotation, out.rotation);
    return out;
}
