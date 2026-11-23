/**
 * @file Camera arithmetic that needs no renderer, so the save file codecs and a headless session
 * can read it without loading Babylon.js.
 */

import type { CameraState } from "./types";

/**
 * How many world units the 2D camera shows either side of its center, across, at a zoom of 1.
 *
 * An orthographic `zoom` is relative to this: zoom 2 shows half as much, so it reads half-width
 * over this many units, and a view that wants a half-width of `h` asks for `5 / h`.
 */
export const FLAT_HALF_WIDTH_AT_ZOOM_ONE = 5;

/**
 * Turn an orbit state given as angles into the position the element's cameras are placed from.
 *
 * `alpha`, `beta` and `radius` follow Babylon's ArcRotate convention: the viewer stands at
 * target + radius * (cos(alpha) sin(beta), cos(beta), sin(alpha) sin(beta)). A state that already
 * carries a position or a pivot rotation, or lacks an angle or a distance (`radius`, or
 * `cameraDistance`), is returned unchanged.
 * @param state - The state a caller or a camera view asked for.
 * @returns The same state, with `position` (and `cameraDistance` from `radius`) filled in.
 */
export function orbitAnglesToPosition(state: CameraState): CameraState {
    const { alpha, beta } = state;
    const radius = state.radius ?? state.cameraDistance;
    if (alpha === undefined || beta === undefined || radius === undefined || state.position || state.pivotRotation) {
        return state;
    }

    const target = state.target ?? { x: 0, y: 0, z: 0 };

    return {
        ...state,
        target,
        position: {
            x: target.x + radius * Math.cos(alpha) * Math.sin(beta),
            y: target.y + radius * Math.cos(beta),
            z: target.z + radius * Math.sin(alpha) * Math.sin(beta),
        },
        cameraDistance: state.cameraDistance ?? radius,
    };
}
