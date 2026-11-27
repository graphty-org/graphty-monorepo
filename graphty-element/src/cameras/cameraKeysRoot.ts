/**
 * @file The camera keys heard on a root around the canvas (`cameraKeysRoot`), so they keep
 * working after a click moves focus to a control beside it (issue #10377).
 */

/** Where the camera keys are also listened for: a document, an element, a shadow root, the window. */
export type CameraKeysRoot = Pick<EventTarget, "addEventListener" | "removeEventListener">;

/** Roles of controls that take letter or arrow keys for themselves. */
const KEY_ROLES: ReadonlySet<string> = new Set([
    "combobox",
    "grid",
    "listbox",
    "menu",
    "menubar",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "radiogroup",
    "searchbox",
    "slider",
    "spinbutton",
    "tab",
    "tablist",
    "textbox",
    "tree",
    "treegrid",
    "treeitem",
]);

/** Input types that take no letter or arrow keys, so a camera key pressed on one moves the camera. */
const KEYLESS_INPUTS: ReadonlySet<string> = new Set(["button", "checkbox", "reset", "submit"]);

/**
 * Whether a node on a key press's path takes the camera keys for itself: a text field, a list, a
 * menu, a slider, a tab list, a tree, a grid, editable text, or anything inside a modal dialog.
 * @param node - One node of the press's composed path.
 * @returns True when it does.
 */
function takesKeys(node: EventTarget): boolean {
    const element = node as Partial<HTMLElement> & { type?: unknown };
    // The window, the document and a shadow root take no keys.
    if (typeof element.getAttribute !== "function") {
        return false;
    }
    const tag = element.tagName;
    if (element.isContentEditable === true || tag === "TEXTAREA" || tag === "SELECT") {
        return true;
    }
    if (tag === "INPUT" && !KEYLESS_INPUTS.has(String(element.type))) {
        return true;
    }
    const role = element.getAttribute("role");
    return (role !== null && KEY_ROLES.has(role)) || element.getAttribute("aria-modal") === "true";
}

/**
 * Listen for the camera keys on `root` as well as on the canvas. A press is left alone when it
 * was already handled (`defaultPrevented`), is made while an input method composes, reached the
 * canvas (the canvas answered it already), or was made in a control that takes the keys itself.
 * Every key release is passed on, so a key held never stays held.
 * @param root - Where to listen.
 * @param canvas - The canvas, which answers its own presses.
 * @param down - The controller's key press handler.
 * @param up - The controller's key release handler.
 * @param release - Lets go of every key held, when focus moves or leaves the window.
 * @returns A function that stops listening.
 */
export function listenForCameraKeys(
    root: CameraKeysRoot,
    canvas: HTMLCanvasElement,
    down: (event: KeyboardEvent) => void,
    up: (event: KeyboardEvent) => void,
    release: () => void,
): () => void {
    const onDown = (pressed: Event): void => {
        const event = pressed as KeyboardEvent;
        const path = event.composedPath();
        if (
            event.defaultPrevented ||
            event.isComposing ||
            path.includes(canvas) ||
            path.some((node) => takesKeys(node))
        ) {
            return;
        }
        down(event);
    };
    const onUp = (released: Event): void => {
        up(released as KeyboardEvent);
    };
    root.addEventListener("keydown", onDown);
    root.addEventListener("keyup", onUp);
    // A key released after focus moved on, or left the window, never sends its keyup here.
    root.addEventListener("focusout", release);
    return () => {
        root.removeEventListener("keydown", onDown);
        root.removeEventListener("keyup", onUp);
        root.removeEventListener("focusout", release);
    };
}
