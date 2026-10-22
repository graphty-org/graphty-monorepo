/**
 * @file The keys the canvas answers, as facts: which key does what to the camera, in which view.
 *
 * The camera's input controllers read this table, so a key listed here is a key that works, and
 * an application that lists the canvas keys (a shortcuts dialog) reads the same table rather
 * than keeping its own copy. Nothing here reaches Babylon.js or the DOM.
 */

/** What a canvas key does to the camera. */
export type CanvasKeyAction =
    | "zoom-in"
    | "zoom-out"
    | "pan-up"
    | "pan-down"
    | "pan-left"
    | "pan-right"
    | "turn-up"
    | "turn-down"
    | "turn-left"
    | "turn-right"
    | "roll-left"
    | "roll-right";

/** The camera a key works in: the 3D orbit camera or the 2D camera. */
export type CanvasKeyView = "2d" | "3d";

/** One thing a key does on the focused canvas. */
export interface CanvasKeyDescriptor {
    /** What it does. */
    readonly action: CanvasKeyAction;
    /** The default name to show for it, such as "Zoom in". An application may replace it by action. */
    readonly plainName: string;
    /** Which camera it works in. */
    readonly view: CanvasKeyView;
    /** The keys, as `KeyboardEvent.key` spells them, letters lower case. */
    readonly keys: readonly string[];
}

/**
 * Every key the canvas answers while it has focus, per camera. A key held repeats its action every
 * frame; a key tapped acts once. A key pressed with Control, Alt or Meta, or with Shift (except
 * "+" and "_", which Shift types), is left to the page as a shortcut.
 */
export const CANVAS_KEY_DESCRIPTORS: readonly CanvasKeyDescriptor[] = Object.freeze(
    (
        [
            ["zoom-in", "Zoom in", "3d", ["w", "=", "+"]],
            ["zoom-out", "Zoom out", "3d", ["s", "-", "_"]],
            ["turn-left", "Turn left", "3d", ["arrowleft"]],
            ["turn-right", "Turn right", "3d", ["arrowright"]],
            ["turn-up", "Turn up", "3d", ["arrowup"]],
            ["turn-down", "Turn down", "3d", ["arrowdown"]],
            ["roll-left", "Roll left", "3d", ["a"]],
            ["roll-right", "Roll right", "3d", ["d"]],
            ["zoom-in", "Zoom in", "2d", ["=", "+"]],
            ["zoom-out", "Zoom out", "2d", ["-", "_"]],
            ["pan-up", "Pan up", "2d", ["w", "arrowup"]],
            ["pan-down", "Pan down", "2d", ["s", "arrowdown"]],
            ["pan-left", "Pan left", "2d", ["a", "arrowleft"]],
            ["pan-right", "Pan right", "2d", ["d", "arrowright"]],
            ["roll-left", "Roll left", "2d", ["q"]],
            ["roll-right", "Roll right", "2d", ["e"]],
        ] as const
    ).map(([action, plainName, view, keys]) =>
        Object.freeze({ action, plainName, view, keys: Object.freeze([...keys]) }),
    ),
);

/**
 * What a key press does to one camera, or null when the canvas leaves the key alone.
 * @param view - The camera.
 * @param event - The key event: its key and modifiers.
 * @param event.key - `KeyboardEvent.key`.
 * @param event.ctrlKey - Whether Control is held.
 * @param event.altKey - Whether Alt is held.
 * @param event.metaKey - Whether Meta is held.
 * @param event.shiftKey - Whether Shift is held.
 * @returns The action, or null.
 */
export function canvasKeyAction(
    view: CanvasKeyView,
    event: Pick<KeyboardEvent, "key" | "ctrlKey" | "altKey" | "metaKey" | "shiftKey">,
): CanvasKeyAction | null {
    const key = event.key.toLowerCase();
    // Shift is how "+" and "_" are typed; with any other key it makes a page shortcut (Shift+A).
    if (event.ctrlKey || event.altKey || event.metaKey || (event.shiftKey && key !== "+" && key !== "_")) {
        return null;
    }

    return CANVAS_KEY_DESCRIPTORS.find((entry) => entry.view === view && entry.keys.includes(key))?.action ?? null;
}
