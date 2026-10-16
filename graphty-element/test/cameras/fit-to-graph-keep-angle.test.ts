import { assert, describe, it } from "vitest";

import { resolveCameraView } from "../../src/camera/resolve";
import type { CameraState, GraphBounds, Vec3 } from "../../src/camera/types";

/** A box that is not a cube and not at the origin, so a wrong axis or a lost center shows. */
const BOUNDS: GraphBounds = {
    min: { x: -4, y: -8, z: -12 },
    max: { x: 6, y: 12, z: 18 },
    center: { x: 1, y: 2, z: 3 },
    size: { x: 10, y: 20, z: 30 },
    maxDimension: 30,
    measured: 77,
};

const FOV = 0.8;

/** Where the reader left the camera after orbiting: off the diagonal, rolled, panned. */
const ORBITED: CameraState = {
    position: { x: 41, y: -18, z: 13 },
    target: { x: 5, y: 1, z: -2 },
    pivotRotation: { x: 0.3, y: -1.1, z: 0.25 },
    cameraDistance: 43.5,
};

function context(options?: Record<string, unknown>, aspect = 16 / 9) {
    return {
        bounds: BOUNDS,
        mode: "3d" as const,
        aspect,
        viewport: { width: Math.round(900 * aspect), height: 900 },
        fov: FOV,
        current: ORBITED,
        ...(options === undefined ? {} : { options }),
    };
}

function sub(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function unit(v: Vec3): Vec3 {
    const length = Math.hypot(v.x, v.y, v.z);
    return { x: v.x / length, y: v.y / length, z: v.z / length };
}

/** Orbit angles in the ArcRotate convention, read from a viewer position and a target. */
function anglesOf(state: CameraState): { alpha: number; beta: number } {
    assert.exists(state.position);
    assert.exists(state.target);
    const d = unit(sub(state.position, state.target));
    return { alpha: Math.atan2(d.z, d.x), beta: Math.acos(d.y) };
}

describe("fitToGraph keepAngle", () => {
    it("frames the whole box from the angle the camera is at now", () => {
        for (const aspect of [16 / 9, 0.5]) {
            const state = resolveCameraView("fitToGraph", context({ keepAngle: true }, aspect));
            const before = anglesOf(ORBITED);
            const after = anglesOf(state);

            assert.closeTo(after.alpha, before.alpha, 1e-12);
            assert.closeTo(after.beta, before.beta, 1e-12);
            assert.deepEqual(state.target, BOUNDS.center);
            assert.deepEqual(state.pivotRotation, ORBITED.pivotRotation, "the roll the reader gave is kept");

            // Every corner of the box, and so every node, sits inside the narrower field of view.
            assert.exists(state.position);
            const { position } = state;
            const forward = unit(sub(BOUNDS.center, position));
            const halfFov = Math.min(FOV / 2, Math.atan(Math.tan(FOV / 2) * aspect));
            for (const x of [BOUNDS.min.x, BOUNDS.max.x]) {
                for (const y of [BOUNDS.min.y, BOUNDS.max.y]) {
                    for (const z of [BOUNDS.min.z, BOUNDS.max.z]) {
                        const v = sub({ x, y, z }, position);
                        const depth = v.x * forward.x + v.y * forward.y + v.z * forward.z;
                        const off = Math.hypot(
                            v.x - depth * forward.x,
                            v.y - depth * forward.y,
                            v.z - depth * forward.z,
                        );
                        assert.isAbove(depth, 0);
                        assert.isBelow(Math.atan(off / depth), halfFov, `corner ${x},${y},${z} at aspect ${aspect}`);
                    }
                }
            }
            assert.closeTo(Math.hypot(...Object.values(sub(position, BOUNDS.center))), state.cameraDistance ?? 0, 1e-9);
        }
    });

    it("without the option, moves to the fixed diagonal exactly as before", () => {
        const expected: CameraState = {
            type: "arcRotate",
            position: { x: 30.27353006497706, y: 31.27353006497706, z: 32.27353006497706 },
            target: BOUNDS.center,
        };

        assert.deepEqual(resolveCameraView("fitToGraph", context()), expected);
        assert.deepEqual(resolveCameraView("fitToGraph", context({ keepAngle: false })), expected);
    });
});
