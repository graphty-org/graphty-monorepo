/**
 * Shared input utility functions for camera controllers.
 * Used by both 3D (OrbitInputController) and XR (XRInputHandler).
 */

/**
 * Apply deadzone to thumbstick/joystick input to prevent drift.
 * Remaps values from [threshold, 1] to [0, 1] for smooth start.
 * Also applies quadratic curve for smooth acceleration.
 * @param value - Raw input value (-1 to 1)
 * @param threshold - Deadzone threshold (default 0.15)
 * @returns Adjusted value with deadzone and curve applied
 */
export function applyDeadzone(value: number, threshold = 0.15): number {
    if (Math.abs(value) < threshold) {
        return 0;
    }

    const sign = Math.sign(value);
    const magnitude = (Math.abs(value) - threshold) / (1 - threshold);

    // Apply quadratic curve for smooth acceleration
    return sign * Math.pow(magnitude, 2);
}

/** Thumbstick deflection, per axis, that XR input ignores. */
export const XR_THUMBSTICK_DEADZONE = 0.15;
/** Radians of yaw per frame at full left-stick X deflection. */
const XR_YAW_SPEED = 0.04;
/** Radians of pitch per frame at full left-stick Y deflection. */
const XR_PITCH_SPEED = 0.03;
/** Pan distance per frame at full right-stick X deflection. */
const XR_PAN_SPEED = 0.08;
/** Zoom factor change per frame at full right-stick Y deflection. */
const XR_ZOOM_SPEED = 0.02;
/** Thumb-to-index distance, in metres, below which an open hand starts pinching. */
const XR_PINCH_START_DISTANCE = 0.04;
/** Thumb-to-index distance, in metres, above which a pinching hand lets go. Looser than the start, so a pinch does not flicker. */
const XR_PINCH_RELEASE_DISTANCE = 0.06;

/** Movement smaller than this is treated as none. */
const EPSILON = 0.0001;

/**
 * Whether a tracked hand is pinching, with hysteresis: a hand that is already pinching lets go at
 * a looser distance than an open hand needs to start.
 * @param distance - Thumb tip to index tip, in metres
 * @param wasPinching - Whether the hand was pinching last frame
 * @returns Whether the hand is pinching now
 */
export function isPinching(distance: number, wasPinching: boolean): boolean {
    return distance < (wasPinching ? XR_PINCH_RELEASE_DISTANCE : XR_PINCH_START_DISTANCE);
}

/**
 * How firmly a tracked hand is pinching: 1 with the finger tips touching, falling to 0 at the
 * pinch start distance.
 * @param distance - Thumb tip to index tip, in metres
 * @returns Pinch strength in [0, 1]
 */
export function pinchStrength(distance: number): number {
    return Math.max(0, 1 - distance / XR_PINCH_START_DISTANCE);
}

/** What one frame of thumbstick input does to the XR pivot. Zero (or a zoom of 1) means leave it alone. */
interface ThumbstickDeltas {
    /** Radians, for `PivotController.rotate`. */
    yaw: number;
    /** Radians, for `PivotController.rotate`. */
    pitch: number;
    /** Factor, for `PivotController.zoom`. */
    zoom: number;
    /** Distance, for `PivotController.panViewRelative`. */
    pan: number;
}

/**
 * Map one frame of thumbstick input to pivot movement. Left stick X yaws and Y pitches (forward
 * moves the graph up, as mouse and touch do); right stick Y zooms (forward zooms in) and X pans.
 * @param left - Left stick axes, each in [-1, 1]
 * @param left.x - Left stick X
 * @param left.y - Left stick Y
 * @param right - Right stick axes, each in [-1, 1]
 * @param right.x - Right stick X
 * @param right.y - Right stick Y
 * @returns The movement to apply this frame
 */
export function thumbstickDeltas(left: { x: number; y: number }, right: { x: number; y: number }): ThumbstickDeltas {
    const leftX = applyDeadzone(left.x, XR_THUMBSTICK_DEADZONE);
    const leftY = applyDeadzone(left.y, XR_THUMBSTICK_DEADZONE);
    const rightX = applyDeadzone(right.x, XR_THUMBSTICK_DEADZONE);
    const rightY = applyDeadzone(right.y, XR_THUMBSTICK_DEADZONE);
    const yaw = leftX * XR_YAW_SPEED;
    const pitch = leftY * XR_PITCH_SPEED;
    const rotates = Math.abs(yaw) > EPSILON || Math.abs(pitch) > EPSILON;

    return {
        yaw: rotates ? yaw : 0,
        pitch: rotates ? pitch : 0,
        zoom: Math.abs(rightY) > EPSILON ? 1 + rightY * XR_ZOOM_SPEED : 1,
        pan: Math.abs(rightX) > EPSILON ? rightX * XR_PAN_SPEED : 0,
    };
}
