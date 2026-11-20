/**
 * @file The orbit pivot's orientation for a camera state: one rule for a cut and a flight alike.
 *
 * The orbit camera sits on the pivot's -z axis, so a pivot turned by (yaw, pitch) puts the camera
 * at target + distance * (-sin(yaw) cos(pitch), sin(pitch), -cos(yaw) cos(pitch)). Straight above
 * or below the target the yaw is undefined; it is then always pi, never whatever the sign of a
 * zero coordinate gives atan2.
 */

import { Quaternion } from "@babylonjs/core/Maths/math.vector.js";

interface Point {
    x: number;
    y: number;
    z: number;
}

/** How small the horizontal part of the line of sight is, against its length, to count as a pole. */
const POLE = 1e-9;

/**
 * The pivot orientation that looks from `position` at `target`, with no roll.
 * @param position - Where the camera stands.
 * @param target - What it looks at.
 * @returns The orientation, or undefined when the two points are the same.
 */
export function orientationFromPose(position: Point, target: Point): Quaternion | undefined {
    const dx = position.x - target.x;
    const dy = position.y - target.y;
    const dz = position.z - target.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance === 0 || !Number.isFinite(distance)) {
        return undefined;
    }

    if (Math.hypot(dx, dz) < POLE * distance) {
        return Quaternion.RotationYawPitchRoll(Math.PI, dy > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
    }

    return Quaternion.RotationYawPitchRoll(Math.atan2(dx, dz) + Math.PI, Math.asin(dy / distance), 0);
}

/**
 * The pivot orientation a camera state asks for: its `pivotRotation` as is, else the one from its
 * position and target.
 * @param state - The state.
 * @param state.pivotRotation - Pitch (x), yaw (y) and roll (z), in radians.
 * @param state.position - Where the camera stands.
 * @param state.target - What it looks at.
 * @returns The orientation, or undefined when the state names none.
 */
export function orientationOf(state: {
    pivotRotation?: Point;
    position?: Point;
    target?: Point;
}): Quaternion | undefined {
    if (state.pivotRotation) {
        return Quaternion.RotationYawPitchRoll(state.pivotRotation.y, state.pivotRotation.x, state.pivotRotation.z);
    }

    return state.position && state.target ? orientationFromPose(state.position, state.target) : undefined;
}
