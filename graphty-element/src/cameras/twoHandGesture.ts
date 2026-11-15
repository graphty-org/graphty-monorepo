import type { Vec3 } from "../camera/types";

/** Zoom factor change per metre the two pinching hands move apart or together. */
const XR_GESTURE_ZOOM_SENSITIVITY = 2;

/** Movement smaller than this is treated as none. */
const EPSILON = 0.0001;

/** What one frame of a two-hand gesture does to the camera pivot. */
export interface TwoHandGestureDelta {
    /** Per-frame camera zoom factor, clamped to [0.9, 1.1]. Hands moving apart zoom out (below 1). */
    readonly zoom: number;
    /** Unit axis to rotate about, or null when the hands did not turn. */
    readonly axis: Vec3 | null;
    /**
     * Radians about `axis`, negated for a camera pivot: rotating the camera by it makes the graph
     * turn with the hands. To turn the graph itself, rotate it by `-angle`.
     */
    readonly angle: number;
}

/**
 * Map the change in the line between two pinching hands, from one frame to the next, to camera
 * pivot movement: the change in its length zooms, and the change in its direction rotates. This
 * is the gesture graphty-element's own XR controls use. A consumer that moves the graph rather
 * than the camera wants the absolute scale since the gesture began instead of the per-frame zoom:
 * that is `distance / startDistance`.
 * @param previousDistance - Distance between the hands last frame, in metres
 * @param previousDirection - Unit vector from left hand to right hand last frame
 * @param distance - Distance between the hands this frame, in metres
 * @param direction - Unit vector from left hand to right hand this frame
 * @returns The movement to apply this frame
 */
export function twoHandGestureDelta(
    previousDistance: number,
    previousDirection: Vec3,
    distance: number,
    direction: Vec3,
): TwoHandGestureDelta {
    const zoomFactor = 1 + (distance - previousDistance) * XR_GESTURE_ZOOM_SENSITIVITY;
    // Inverted: hands apart (a positive change) zooms out, which scales the graph down.
    const zoom = 2 - Math.max(0.9, Math.min(1.1, zoomFactor));
    const a = previousDirection;
    const b = direction;
    const x = a.y * b.z - a.z * b.y;
    const y = a.z * b.x - a.x * b.z;
    const z = a.x * b.y - a.y * b.x;
    const axisLength = Math.hypot(x, y, z);

    if (axisLength <= EPSILON) {
        return { zoom, axis: null, angle: 0 };
    }

    const dot = a.x * b.x + a.y * b.y + a.z * b.z;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    // Negated for world-mode rotation: the graph turns with the hands.
    return { zoom, axis: { x: x / axisLength, y: y / axisLength, z: z / axisLength }, angle: -angle };
}
