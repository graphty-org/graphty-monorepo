/**
 * A real finger, sent through the Chrome DevTools Protocol: the browser makes every event from
 * it -- the touch events, the pointer events with their implicit capture, touch-action and the
 * pointercancel a scroll sends, and the click after a tap -- as a touch screen does. No touch
 * emulation is turned on: once on, Chromium answers `(hover: none)` for the rest of the run.
 */
import { type Offset, send, toPage } from "./mouse";

/** Where the finger is, in the test frame's viewport, and whether it is on the screen. */
let finger: Offset = { x: 0, y: 0 };
let down = false;

/**
 * One touch event with the finger at a point, or with no finger for an end or a cancel.
 * @param type - touchStart, touchMove, touchEnd or touchCancel
 * @param at - where the finger is, in the test frame's CSS pixels
 */
async function touch(type: "touchStart" | "touchMove" | "touchEnd" | "touchCancel", at?: Offset): Promise<void> {
    if (at !== undefined) {
        finger = at;
    }
    down = type === "touchStart" || type === "touchMove";
    await send("Input.dispatchTouchEvent", { type, touchPoints: at === undefined ? [] : [toPage(at)] });
}

/**
 * Put a finger down on an element.
 * @param element - what the finger lands on
 * @param at - where on the element; its center when left out
 */
export async function touchStart(element: Element, at?: Offset): Promise<void> {
    const rect = element.getBoundingClientRect();
    await touch("touchStart", {
        x: rect.left + (at?.x ?? rect.width / 2),
        y: rect.top + (at?.y ?? rect.height / 2),
    });
}

/**
 * Slide the finger to a point of the test frame's viewport, in one move.
 * @param at - where, in the test frame's CSS pixels
 */
export async function touchMoveTo(at: Offset): Promise<void> {
    await touch("touchMove", at);
}

/**
 * Slide the finger by an offset from where it is, in one move.
 * @param dx - how far along x
 * @param dy - how far along y
 */
export async function touchMoveBy(dx: number, dy = 0): Promise<void> {
    await touch("touchMove", { x: finger.x + dx, y: finger.y + dy });
}

/** Lift the finger, if it is down. */
export async function touchEnd(): Promise<void> {
    if (down) {
        await touch("touchEnd");
    }
}

/** Cancel the touch, if a finger is down, as the system does when it takes the gesture over. */
export async function touchCancel(): Promise<void> {
    if (down) {
        await touch("touchCancel");
    }
}

/**
 * A tap: a finger down on an element and up again with no move between.
 * @param element - what the finger lands on
 */
export async function tap(element: Element): Promise<void> {
    await touchStart(element);
    await touchEnd();
}
