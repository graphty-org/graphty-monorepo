/**
 * @file `linkCameras`: two or more `<graphty-element>` views that pan, zoom and turn together.
 */

import { stateProblem } from "../camera/mode";
import type { CameraState } from "../camera/types";

/** What `linkCameras` needs from a view: the public camera calls and the `overview-changed` event. */
export interface LinkedCameraView {
    /** Where the view's camera stands now. */
    getCameraState(): CameraState;
    /** Move the view's camera, at once. */
    setCameraState(state: CameraState): Promise<void>;
    /** Listen for a drawn frame whose camera or nodes moved. */
    addEventListener(type: "overview-changed", listener: () => void): void;
    /** Stop listening. */
    removeEventListener(type: "overview-changed", listener: () => void): void;
}

/** Relative difference below which two camera numbers count as the same placement. */
const SAME = 1e-6;

/**
 * Whether two camera states place the camera in the same spot, up to rounding: a state read back
 * from a view after it was set differs from what was set in the last digits.
 * @param a - one state, or a field of one
 * @param b - the other
 * @returns true when every number agrees to within {@link SAME}
 */
function sameState(a: unknown, b: unknown): boolean {
    if (typeof a === "number" && typeof b === "number") {
        return Math.abs(a - b) <= SAME * Math.max(1, Math.abs(a), Math.abs(b));
    }

    if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
        const x = a as Record<string, unknown>;
        const y = b as Record<string, unknown>;
        return [...new Set([...Object.keys(x), ...Object.keys(y)])].every((key) => sameState(x[key], y[key]));
    }

    return a === b;
}

/**
 * Link the cameras of several views: when the reader pans, zooms or turns any one of them, every
 * other moves to the same camera state at once. For two graphs drawn side by side to be compared,
 * such as two conditions of one network.
 *
 * The views share world coordinates, so a node at the same position in both graphs shows at the
 * same place on both canvases. A linked view stops framing its own data on load, since the camera
 * is now placed for it. A view drawing in another mode (one in 2D, one in 3D) is skipped: a state
 * only fits the mode it was read in. Linking does not move any view until one of them moves; to start them
 * aligned, copy one state across with `setCameraState(a.getCameraState())`.
 * @param views - the elements to link, two or more
 * @returns a function that unlinks them again; each view keeps where its camera is
 * @since 2.7.0
 * @example
 * ```ts
 * import { linkCameras } from "@graphty/graphty-element";
 * const unlink = linkCameras(document.querySelector("#tumor"), document.querySelector("#normal"));
 * // later, to let them move apart:
 * unlink();
 * ```
 */
export function linkCameras(...views: LinkedCameraView[]): () => void {
    // The last state each view is known to stand at: one it was moved to by the link, or one it
    // moved to on its own and the link passed on. A view reporting it again is not news.
    const known = new Map<LinkedCameraView, CameraState>();
    const listeners = views.map((source) => {
        const listener = (): void => {
            const state = source.getCameraState();
            const last = known.get(source);
            if (last !== undefined && sameState(last, state)) {
                return;
            }

            for (const view of views) {
                if (view === source) {
                    known.set(view, state);
                    continue;
                }
                // A peer drawing in another mode cannot take this state: skipped for this frame.
                const { mode } = view.getCameraState();
                if (mode !== undefined && stateProblem(state, mode) !== null) {
                    continue;
                }
                known.set(view, state);
                view.setCameraState(state).catch(() => {
                    // A peer that refuses the state (immersive, or switching mode) is skipped.
                });
            }
        };
        source.addEventListener("overview-changed", listener);
        return listener;
    });

    return () => {
        views.forEach((view, i) => {
            view.removeEventListener("overview-changed", listeners[i]);
        });
    };
}
