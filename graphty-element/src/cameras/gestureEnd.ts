/**
 * @file When a reader's camera gesture ends, for `camera:gesture-end`. The end is defined by the
 * input and the frames it moves, never by a timer.
 */

/**
 * What a reader's camera gesture did, as `camera:gesture-end` reports it: `"orbit"` turned the
 * view, `"pan"` moved it sideways, `"zoom"` moved it nearer or farther.
 *
 * OPEN UNION: kinds may be added in a minor release; handle one you do not know.
 * @since 3.40.0
 */
export type CameraGestureKind = "orbit" | "pan" | "zoom";

/**
 * Every {@link CameraGestureKind} this version reports, for a caller that lists the kinds or
 * checks a value against them.
 * @since 3.40.0
 */
export const CAMERA_GESTURE_KINDS: readonly CameraGestureKind[] = Object.freeze(["orbit", "pan", "zoom"]);

/** What an input handler is handed to report a gesture's end. */
export interface GestureEndHooks {
    /** Told once when a reader's camera gesture ends. */
    onGestureEnd?: ((kind: CameraGestureKind) => void) | null;
    /** Asks the render loop for one more frame, for a run waiting on the frame that ends it. */
    requestFrame?: (() => void) | null;
}

/**
 * A run of wheel events. Every wheel event before the next frame belongs to the run, and so does
 * one in the frame after it; the run ends at the first frame that saw no wheel event since the
 * frame before. Wheel events dispatched in one task are therefore always one gesture, because no
 * frame runs between them.
 */
export class WheelRun {
    #state: "idle" | "moving" | "settling" = "idle";

    /** A wheel event arrived. */
    wheel(): void {
        this.#state = "moving";
    }

    /**
     * One frame passed.
     * @param requestFrame - Asks for the frame that can end the run, when the loop would rest.
     * @returns True when the run ended at this frame.
     */
    frame(requestFrame?: (() => void) | null): boolean {
        if (this.#state === "moving") {
            this.#state = "settling";
            requestFrame?.();
            return false;
        }

        if (this.#state === "settling") {
            this.#state = "idle";
            return true;
        }

        return false;
    }

    /** Forget the run: the input was switched off. */
    reset(): void {
        this.#state = "idle";
    }
}
