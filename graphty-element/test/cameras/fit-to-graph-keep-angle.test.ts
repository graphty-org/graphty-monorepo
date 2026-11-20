import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { assert, describe, it } from "vitest";

import { measureBounds } from "../../src/camera/bounds";
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

/** The reader's turn after orbiting: off the diagonal and rolled. */
const TURN = { x: 0.3, y: -1.1, z: 0.25 };
const TURN_Q = Quaternion.RotationYawPitchRoll(TURN.y, TURN.x, TURN.z);

/** One of the turned pivot's axes in world space (the camera sits on its -z axis). */
function pivotAxis(x: number, y: number, z: number): Vec3 {
    const v = new Vector3(x, y, z).applyRotationQuaternion(TURN_Q);
    return { x: v.x, y: v.y, z: v.z };
}

/** Where the reader left the camera after orbiting: turned, rolled and panned, as getCameraState reports it. */
const ORBITED_TARGET = { x: 5, y: 1, z: -2 };
const BACK = pivotAxis(0, 0, -1);
const ORBITED: CameraState = {
    position: {
        x: ORBITED_TARGET.x + BACK.x * 43.5,
        y: ORBITED_TARGET.y + BACK.y * 43.5,
        z: ORBITED_TARGET.z + BACK.z * 43.5,
    },
    target: ORBITED_TARGET,
    pivotRotation: TURN,
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

function length(v: Vec3): number {
    return Math.hypot(v.x, v.y, v.z);
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
    it("frames the whole box from the angle the camera is at now, filling the canvas per axis and centered", () => {
        const right = pivotAxis(1, 0, 0);
        const up = pivotAxis(0, 1, 0);
        const dot = (p: Vec3, q: Vec3): number => p.x * q.x + p.y * q.y + p.z * q.z;
        for (const aspect of [16 / 9, 0.5]) {
            const state = resolveCameraView("fitToGraph", context({ keepAngle: true }, aspect));
            const before = anglesOf(ORBITED);
            const after = anglesOf(state);

            assert.closeTo(after.alpha, before.alpha, 1e-9);
            assert.closeTo(after.beta, before.beta, 1e-9);
            assert.deepEqual(state.pivotRotation, ORBITED.pivotRotation, "the roll the reader gave is kept");

            // Every corner, projected onto the rolled screen, inside the frame padded 5 percent; the
            // limiting axis touches the padded frame, and each axis's extent is centered.
            assert.exists(state.position);
            const { position } = state;
            const forward = unit(sub(state.target ?? BOUNDS.center, position));
            const tanY = Math.tan(FOV / 2);
            const tanX = tanY * aspect;
            const extent = { left: 0, right: 0, down: 0, top: 0 };
            for (const x of [BOUNDS.min.x, BOUNDS.max.x]) {
                for (const y of [BOUNDS.min.y, BOUNDS.max.y]) {
                    for (const z of [BOUNDS.min.z, BOUNDS.max.z]) {
                        const v = sub({ x, y, z }, position);
                        const depth = dot(v, forward);
                        assert.isAbove(depth, 0);
                        const sx = dot(v, right) / (depth * tanX);
                        const sy = dot(v, up) / (depth * tanY);
                        extent.left = Math.min(extent.left, sx);
                        extent.right = Math.max(extent.right, sx);
                        extent.down = Math.min(extent.down, sy);
                        extent.top = Math.max(extent.top, sy);
                    }
                }
            }
            const fill = Math.max(extent.right, extent.top) * 1.05;
            assert.closeTo(fill, 1, 1e-6, `aspect ${String(aspect)}: the limiting axis fills the padded frame`);
            assert.closeTo(extent.right, -extent.left, 1e-6, "centered across");
            assert.closeTo(extent.top, -extent.down, 1e-6, "centered up and down");
            assert.closeTo(length(sub(position, state.target ?? BOUNDS.center)), state.cameraDistance ?? 0, 1e-9);
        }
    });

    // The old distance, the longest side over the field of view times 0.65, stood too close for a
    // box that is not a cube and cut a framed node off (#5349). Now every corner sits inside both
    // fields of view, padded 10 percent, and the tightest one touches the padded frame.
    it("without the option, frames every corner from the fixed diagonal", () => {
        for (const aspect of [16 / 9, 1, 0.5]) {
            const state = resolveCameraView("fitToGraph", context(undefined, aspect));
            assert.deepEqual(resolveCameraView("fitToGraph", context({ keepAngle: false }, aspect)), state);
            assert.isUndefined(state.pivotRotation, "the diagonal drops the reader's turn");
            assert.exists(state.position);
            assert.deepEqual(state.target, BOUNDS.center);

            const toViewer = unit(sub(state.position, BOUNDS.center));
            for (const axis of [toViewer.x, toViewer.y, toViewer.z]) {
                assert.closeTo(axis, 1 / Math.sqrt(3), 1e-9, "on the diagonal");
            }

            // Screen axes of a camera with no roll looking back along toViewer.
            const level = Math.hypot(toViewer.x, toViewer.z);
            const right = { x: toViewer.z / level, y: 0, z: -toViewer.x / level };
            const up = {
                x: toViewer.y * right.z,
                y: toViewer.z * right.x - toViewer.x * right.z,
                z: -toViewer.y * right.x,
            };
            const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
            const tanY = Math.tan(FOV / 2);
            const tanX = tanY * aspect;
            const distance = length(sub(state.position, BOUNDS.center));

            let tightest = 0;
            for (const x of [BOUNDS.min.x, BOUNDS.max.x]) {
                for (const y of [BOUNDS.min.y, BOUNDS.max.y]) {
                    for (const z of [BOUNDS.min.z, BOUNDS.max.z]) {
                        const corner = sub({ x, y, z }, BOUNDS.center);
                        const depth = distance - dot(corner, toViewer);
                        const across = Math.abs(dot(corner, right)) / (depth * tanX);
                        const upDown = Math.abs(dot(corner, up)) / (depth * tanY);
                        tightest = Math.max(tightest, across * 1.1, upDown * 1.1);
                    }
                }
            }
            assert.closeTo(tightest, 1, 1e-9, `aspect ${String(aspect)}: the tightest corner touches the padded frame`);
        }
    });

    it("centers a lone point on screen: the picture of its stand-in box is not what is framed", () => {
        const point = { x: 7, y: -3, z: 11 };
        const state = resolveCameraView("fitToGraph", {
            ...context({ keepAngle: true }),
            bounds: measureBounds([point]),
        });
        assert.deepEqual(state.target, point, "the camera looks straight at the point");
        assert.exists(state.position);
        const toViewer = unit(sub(state.position, point));
        assert.closeTo(toViewer.x, BACK.x, 1e-9, "the angle is kept");
        assert.closeTo(toViewer.y, BACK.y, 1e-9, "the angle is kept");
        assert.closeTo(toViewer.z, BACK.z, 1e-9, "the angle is kept");
    });
});
