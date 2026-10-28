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
 * A point of an element (its middle unless told) in the top page's viewport, where the protocol's
 * input lands. The test page runs in an iframe of the vitest page, possibly scaled to fit.
 * @param element - The element.
 * @param at - The point, in CSS pixels from the element's top left corner; its middle when unset.
 * @returns The point in the top page's CSS pixels.
 */
function middleOf(element: Element, at?: { readonly x: number; readonly y: number }): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    const x = rect.left + (at?.x ?? rect.width / 2);
    const y = rect.top + (at?.y ?? rect.height / 2);
    const frame = window.frameElement;
    if (frame === null) {
        return { x, y };
    }

    const box = frame.getBoundingClientRect();
    const scale = box.width / window.innerWidth;
    return { x: box.left + (frame.clientLeft + x) * scale, y: box.top + (frame.clientTop + y) * scale };
}

/**
 * A point of the test frame in the top page's viewport, where the protocol's input lands.
 * @param x - The x in the frame's CSS pixels.
 * @param y - The y in the frame's CSS pixels.
 * @returns The point in the top page's CSS pixels.
 */
function inTopPage(x: number, y: number): { x: number; y: number } {
    const frame = window.frameElement;
    if (frame === null) {
        return { x, y };
    }

    const box = frame.getBoundingClientRect();
    const scale = box.width / window.innerWidth;
    return { x: box.left + (frame.clientLeft + x) * scale, y: box.top + (frame.clientTop + y) * scale };
}

/**
 * Presses the mouse on the middle of an element, moves it in steps to a point and lets go there,
 * as a reader drags a row by its handle.
 * @param element - Where the press lands.
 * @param to - Where it is let go, in the test frame's CSS pixels.
 * @param to.x - Its x.
 * @param to.y - Its y.
 */
export async function dragTo(element: Element, to: { x: number; y: number }): Promise<void> {
    const session = cdp() as unknown as { send: Send };
    const from = middleOf(element);
    const end = inTopPage(to.x, to.y);
    const steps = 10;
    await session.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...from });
    await session.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        ...from,
        button: "left",
        buttons: 1,
        clickCount: 1,
    });
    for (let step = 1; step <= steps; step++) {
        await session.send("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x: from.x + ((end.x - from.x) * step) / steps,
            y: from.y + ((end.y - from.y) * step) / steps,
            button: "left",
            buttons: 1,
        });
    }
    await session.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        ...end,
        button: "left",
        buttons: 0,
        clickCount: 1,
    });
}

/**
 * Turns the mouse wheel over the middle of an element, as the reader's wheel does.
 * @param element - What the pointer is over.
 * @param deltaY - How far, in CSS pixels; negative scrolls up.
 */
export async function wheelOver(element: Element, deltaY: number): Promise<void> {
    const session = cdp() as unknown as { send: Send };
    await session.send("Input.dispatchMouseEvent", { type: "mouseWheel", ...middleOf(element), deltaX: 0, deltaY });
}

/**
 * Swipes a finger down from the middle of an element, as on a touch screen: a finger moving down
 * scrolls the page up.
 * @param element - Where the finger goes down.
 * @param distance - How far the finger moves down, in CSS pixels.
 */
export async function swipeOver(element: Element, distance: number): Promise<void> {
    const session = cdp() as unknown as { send: Send };
    const { x, y } = middleOf(element);
    const steps = 10;
    await session.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= steps; step++) {
        await session.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x, y: y + (distance * step) / steps }],
        });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.send("Emulation.setTouchEmulationEnabled", { enabled: false });
}

/**
 * Presses the mouse on the middle of an element, moves it sideways in steps and releases it, as the
 * reader drags a thumb or a handle.
 * @param element - Where the press lands.
 * @param dx - How far to move, in CSS pixels of the test page; negative moves left.
 * @param at - Where on the element the press lands, from its top left corner; its middle when unset.
 */
export async function dragAcross(element: Element, dx: number, at?: { x: number; y: number }): Promise<void> {
    const session = cdp() as unknown as { send: Send };
    const { x, y } = middleOf(element, at);
    const frame = window.frameElement;
    const scale = frame === null ? 1 : frame.getBoundingClientRect().width / window.innerWidth;
    const steps = 10;
    await session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await session.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    for (let step = 1; step <= steps; step++) {
        await session.send("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x: x + (dx * scale * step) / steps,
            y,
            button: "left",
            buttons: 1,
        });
    }
    await session.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: x + dx * scale,
        y,
        button: "left",
        buttons: 0,
        clickCount: 1,
    });
}

/**
 * Puts a finger down on the middle of an element and keeps it there, still, until `released`
 * settles, then lifts it: a touch hold that lasts as long as the test's condition takes, never a
 * fixed time.
 * @param element - Where the finger goes down.
 * @param released - Resolves when the finger may lift (the menu the hold opens is showing).
 */
export async function touchHold(element: Element, released: () => Promise<unknown>): Promise<void> {
    const session = cdp() as unknown as { send: Send };
    const { x, y } = middleOf(element);
    await session.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    try {
        await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await released();
    } finally {
        await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await session.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    }
}

/**
 * Taps the middle of an element with a finger, as on a touch screen.
 * @param element - What the finger taps.
 */
export async function tap(element: Element): Promise<void> {
    const session = cdp() as unknown as { send: Send };
    const { x, y } = middleOf(element);
    await session.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.send("Emulation.setTouchEmulationEnabled", { enabled: false });
}
