/**
 * @file When a reader's camera gesture ends, for `camera:gesture-end`. The input defines the end;
 * only the wheel, which has no event of its own that ends a turn, is ended by a pause.
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
}

/**
 * How long the wheel must rest before a run of wheel events ends: longer than the gaps between
 * the notches of one turn of the wheel, and than the delay a busy browser adds to delivering
 * each of them.
 */
export const WHEEL_PAUSE_MS = 500;

/**
 * A run of wheel events. It ends at the first frame at least {@link WHEEL_PAUSE_MS} after its
 * last wheel event, so a burst is one gesture however the browser spreads it over frames, and
 * the count is the same at any frame rate. A browser hands the page a burst of wheel events one
 * or two to a frame, waiting each time for the page to take the last, and a busy one can let a
 * frame or more pass between two of them (issue #10339).
 */
export class WheelRun {
    #lastWheelAt: number | null = null;

    /**
     * A wheel event arrived.
     * @param now - When, in `performance.now()` milliseconds.
     */
    wheel(now = performance.now()): void {
        this.#lastWheelAt = now;
    }

    /**
     * One frame passed.
     * @param now - When, in `performance.now()` milliseconds.
     * @returns True when the run ended at this frame.
     */
    frame(now = performance.now()): boolean {
        if (this.#lastWheelAt === null || now - this.#lastWheelAt < WHEEL_PAUSE_MS) {
            return false;
        }

        this.#lastWheelAt = null;
        return true;
    }

    /** Forget the run: the input was switched off. */
    reset(): void {
        this.#lastWheelAt = null;
    }
}
