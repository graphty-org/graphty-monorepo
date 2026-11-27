import type { Observable } from "@babylonjs/core/Misc/observable.js";
import type { Scene } from "@babylonjs/core/scene.js";

/**
 * Whether a pointer event's screen point, when it has one, is a real point on the screen.
 * @param init - A pointer event's init.
 * @returns False when `screenX` or `screenY` is NaN or infinite.
 */
function onScreen(init: PointerEventInit | undefined): boolean {
    return Number.isFinite(init?.screenX ?? 0) && Number.isFinite(init?.screenY ?? 0);
}

/**
 * The same init without its screen point.
 * @param init - A pointer event's init.
 * @returns The init, without `screenX` and `screenY` when either is not a finite number.
 */
function withoutOffScreenPoint(init: PointerEventInit | undefined): PointerEventInit | undefined {
    if (init === undefined || onScreen(init)) {
        return init;
    }

    const { screenX: _x, screenY: _y, ...rest } = init;
    return rest;
}

/**
 * Keep an XR session drawing through two faults that otherwise stop its frame loop for good.
 *
 * - A controller exactly in the plane of the eyes projects to a screen point at infinity.
 *   Babylon's `WebXRControllerPointerSelection` rejects only NaN and +Infinity, so -Infinity
 *   reaches `new PointerEvent`, which throws. Such a frame has no pointer on the screen: its
 *   pointer move is skipped, and a press or release keeps its pick but drops the screen point, so
 *   none is ever lost.
 * - Babylon runs the session's frame observers, then draws and asks for the next frame, all
 *   unguarded: one observer that throws ends the session's drawing. Here a throw ends only that
 *   frame's observers, is handed to `report`, and the frame is still drawn.
 * @param scene - The graph's scene.
 * @param frames - The session's `onXRFrameObservable`.
 * @param report - Told of each error a frame observer threw.
 * @returns Put the scene and the observable back as they were.
 */
export function guardXRFrame(scene: Scene, frames: Observable<XRFrame>, report: (error: unknown) => void): () => void {
    const notify = frames.notifyObservers.bind(frames);
    const move = scene.simulatePointerMove.bind(scene);
    const down = scene.simulatePointerDown.bind(scene);
    const up = scene.simulatePointerUp.bind(scene);

    frames.notifyObservers = (...args) => {
        try {
            return notify(...args);
        } catch (error) {
            report(error);
            return false;
        }
    };
    scene.simulatePointerMove = (pick, init) => (onScreen(init) ? move(pick, init) : scene);
    scene.simulatePointerDown = (pick, init) => down(pick, withoutOffScreenPoint(init));
    scene.simulatePointerUp = (pick, init, doubleTap) => up(pick, withoutOffScreenPoint(init), doubleTap);

    return () => {
        frames.notifyObservers = notify;
        scene.simulatePointerMove = move;
        scene.simulatePointerDown = down;
        scene.simulatePointerUp = up;
    };
}
