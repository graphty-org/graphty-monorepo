/**
 * @file A real mouse press held down, and its release, for the gestures `userEvent` cannot make
 * (it only clicks: a press and a release together). Sent through the Chrome DevTools Protocol, so
 * the browser makes the events and hit testing, pointer capture and the listeners run as they do
 * for a person.
 */

import { cdp } from "vitest/browser";

/** A protocol command and its parameters; the session's own type is too narrow to name them. */
type Send = (method: string, params?: Record<string, unknown>) => Promise<unknown>;

/**
 * The middle of an element in the top page's viewport, where the protocol's input lands. The test
 * page runs in an iframe of the vitest page, possibly scaled to fit.
 * @param element - The element.
 * @returns Its centre in the top page's CSS pixels.
 */
function middleOf(element: Element): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const frame = window.frameElement;
    if (frame === null) {
        return { x, y };
    }

    const box = frame.getBoundingClientRect();
    const scale = box.width / window.innerWidth;
    return { x: box.left + (frame.clientLeft + x) * scale, y: box.top + (frame.clientTop + y) * scale };
}

/**
 * One mouse event at an element's middle.
 * @param type - mouseMoved, mousePressed or mouseReleased.
 * @param element - The element.
 */
async function mouse(type: "mouseMoved" | "mousePressed" | "mouseReleased", element: Element): Promise<void> {
    const session = cdp() as unknown as { send: Send };
    const pressed = type === "mousePressed";
    await session.send("Input.dispatchMouseEvent", {
        type,
        ...middleOf(element),
        button: type === "mouseMoved" ? "none" : "left",
        buttons: pressed ? 1 : 0,
        clickCount: type === "mouseMoved" ? 0 : 1,
    });
}

/**
 * Move the mouse to an element's middle and press the left button there, holding it.
 * @param element - The element.
 */
export async function pressAndHold(element: Element): Promise<void> {
    await mouse("mouseMoved", element);
    await mouse("mousePressed", element);
}

/**
 * Release the left button over an element's middle, as after `pressAndHold`.
 * @param element - The element.
 */
export async function releaseOver(element: Element): Promise<void> {
    await mouse("mouseReleased", element);
}

/**
 * One touch event at an element's middle. No touch emulation: once on, Chromium reports
 * `(hover: none)` for the rest of the run, and the touch arrives as a touch pointer without it.
 * @param type - touchStart or touchEnd.
 * @param element - The element.
 */
async function touch(type: "touchStart" | "touchEnd", element: Element): Promise<void> {
    const session = cdp() as unknown as { send: Send };
    await session.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchStart" ? [middleOf(element)] : [],
    });
}

/**
 * Put a finger down on an element's middle and keep it there, still.
 * @param element - The element.
 */
export async function touchAndHold(element: Element): Promise<void> {
    await touch("touchStart", element);
}

/**
 * Lift the finger `touchAndHold` put down.
 * @param element - The element it was put down on.
 */
export async function liftTouch(element: Element): Promise<void> {
    await touch("touchEnd", element);
}
