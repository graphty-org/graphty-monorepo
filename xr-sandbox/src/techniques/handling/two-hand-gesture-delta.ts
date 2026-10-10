// COPIED from graphty-element: `twoHandGestureDelta` and the two constants it uses, from
// graphty-element/src/cameras/InputUtils.ts (commit e77cbdc32), unchanged. graphty-element does not
// export it; https://github.com/graphty-org/graphty-monorepo/issues/1946 asks for the export. When it
// lands, delete this file and import it from graphty-element.
//
// The handling technique uses only its rotation half (axis and angle). Its zoom half is a per-frame
// factor clamped to 0.9 to 1.1 and inverted for a camera pivot; moving the graph instead of the
// camera needs the absolute ratio of hand distances since the press began, which two-hand.ts
// computes itself (issue 1946 asks for that too).

import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";

/** Zoom factor change per metre the two pinching hands move apart or together. */
const XR_GESTURE_ZOOM_SENSITIVITY = 2;

/** Movement smaller than this is treated as none. */
const EPSILON = 0.0001;

/** What one frame of a two-hand gesture does to the XR pivot. */
interface TwoHandGestureDelta {
    /** Factor, for `PivotController.zoom`, clamped to [0.9, 1.1]. Hands moving apart zoom out. */
    zoom: number;
    /** Unit axis for `PivotController.rotateAroundAxis`, or null when the hands did not turn. */
    axis: Vector3 | null;
    /** Radians, for `PivotController.rotateAroundAxis`. */
    angle: number;
}

/**
 * Map the change in the line between two pinching hands, from one frame to the next, to pivot
 * movement: the change in its length zooms, and the change in its direction rotates.
 * @param previousDistance - Distance between the hands last frame
 * @param previousDirection - Unit vector from left hand to right hand last frame
 * @param distance - Distance between the hands this frame
 * @param direction - Unit vector from left hand to right hand this frame
 * @returns The movement to apply this frame
 */
export function twoHandGestureDelta(
    previousDistance: number,
    previousDirection: Vector3,
    distance: number,
    direction: Vector3,
): TwoHandGestureDelta {
    const zoomFactor = 1 + (distance - previousDistance) * XR_GESTURE_ZOOM_SENSITIVITY;
    // Inverted: hands apart (a positive change) zooms out, which scales the graph down.
    const zoom = 2 - Math.max(0.9, Math.min(1.1, zoomFactor));
    const axis = Vector3.Cross(previousDirection, direction);
    const axisLength = axis.length();

    if (axisLength <= EPSILON) {
        return { zoom, axis: null, angle: 0 };
    }

    const angle = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(previousDirection, direction))));

    // Negated for world-mode rotation: the graph turns with the hands.
    return { zoom, axis: axis.scaleInPlace(1 / axisLength), angle: -angle };
}
