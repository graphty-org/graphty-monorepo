/**
 * @file When a reader's camera gesture ends, for `camera:gesture-end`. The end is defined by the
 * input and the frames it moves, never by a timer.
 */

/** What a camera gesture did: turned the view, moved it sideways, or moved it nearer or farther. */
export type CameraGestureKind = "orbit" | "pan" | "zoom";

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
