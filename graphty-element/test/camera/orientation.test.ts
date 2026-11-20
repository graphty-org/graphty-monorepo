/**
 * @file The orbit pivot's orientation for a pose: the camera, on the pivot's -z axis, ends up at the
 * pose's position, and straight above or below the target the yaw is always pi.
 */

import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { assert, describe, it } from "vitest";

import { orientationFromPose, orientationOf } from "../../src/camera/orientation";

/**
 * Where a turned pivot puts the camera, as a unit direction from the target.
 * @param q - The pivot orientation.
 * @returns The direction.
 */
function cameraSide(q: Quaternion): Vector3 {
    return new Vector3(0, 0, -1).rotateByQuaternionToRef(q, new Vector3());
}

/**
 * Whether two quaternions are the same rotation, to 1e-6.
 * @param a - One.
 * @param b - The other.
 * @returns True when they match (either sign).
 */
function sameRotation(a: Quaternion, b: Quaternion): boolean {
    return Math.abs(Math.abs(Quaternion.Dot(a, b)) - 1) < 1e-6;
}

describe("orientationFromPose", () => {
    it("turns the pivot so the camera stands at the position", () => {
        const position = { x: 3, y: 4, z: -12 };
        const target = { x: 1, y: 1, z: 1 };
        const q = orientationFromPose(position, target);
        assert.isDefined(q);
        const expected = new Vector3(2, 3, -13).normalize();
        const got = cameraSide(q);
        assert.isBelow(got.subtract(expected).length(), 1e-6);
    });

    it("gives yaw pi straight above and below, whatever the sign of a zero", () => {
        for (const zero of [0, -0]) {
            for (const [dy, pitch] of [
                [10, Math.PI / 2],
                [-10, -Math.PI / 2],
            ]) {
                const q = orientationFromPose({ x: zero, y: dy, z: zero }, { x: 0, y: 0, z: 0 });
                assert.isTrue(
                    sameRotation(q as Quaternion, Quaternion.RotationYawPitchRoll(Math.PI, pitch, 0)),
                    `dy ${dy}, zero ${Object.is(zero, -0) ? "-0" : "+0"}`,
                );
                assert.isBelow(
                    cameraSide(q as Quaternion)
                        .subtract(new Vector3(0, Math.sign(dy), 0))
                        .length(),
                    1e-6,
                );
            }
        }
    });

    it("has no orientation for a position on the target", () => {
        assert.isUndefined(orientationFromPose({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 }));
    });

    it("takes a state's pivotRotation as is", () => {
        const q = orientationOf({
            pivotRotation: { x: 0.3, y: 1.2, z: 0.1 },
            position: { x: 0, y: 0, z: 9 },
            target: { x: 0, y: 0, z: 0 },
        });
        assert.isTrue(sameRotation(q as Quaternion, Quaternion.RotationYawPitchRoll(1.2, 0.3, 0.1)));
    });
});
