/**
 * @file Real input for browser tests: the mouse, the wheel, touch and the device pixel ratio,
 * sent through the Chrome DevTools Protocol, so every event is made by the browser's own input
 * pipeline -- hit testing, pointer capture, `touch-action`, focus and the canvas's listeners all
 * run as they do for a person. A test that calls `scene.onPointerObservable.notifyObservers` or
 * writes a controller's private state skips every one of those, and so passes when they break.
 *
 * Points are CSS pixels from the target element's top-left corner, the pixels
 * `nodeScreenPosition` and `worldToScreen` return. The test page runs in an iframe of the vitest
 * page, possibly scaled to fit, so each point is mapped into the top page's coordinates first.
 * The keyboard needs no protocol: `userEvent.keyboard` already presses real keys, and `holdKey` and
 * `releaseKey` only name the hold and the release.
 */

import { cdp, userEvent } from "vitest/browser";

/** A point in CSS pixels from an element's top-left corner. */
export interface Point {
    readonly x: number;
    readonly y: number;
}

/** A protocol command and its parameters; the session's own type is too narrow to name them. */
type Send = (method: string, params?: Record<string, unknown>) => Promise<unknown>;

/**
 * The page's DevTools session.
 * @returns A function sending one protocol command.
 */
function send(): Send {
    const session = cdp() as unknown as { send: Send };
    return (method, params) => session.send(method, params);
}

/**
 * Map a point on an element to the top page's viewport, where the protocol's input lands.
 * @param element - The element the point is on.
 * @param point - The point, in CSS pixels from the element's top-left corner.
 * @returns The same point in the top page's CSS pixels.
 */
export function toPage(element: Element, point: Point): Point {
    const rect = element.getBoundingClientRect();
    const frame = window.frameElement;
    if (frame === null) {
        return { x: rect.left + point.x, y: rect.top + point.y };
    }

    // The test frame may be scaled down to fit the runner's page: its box in the parent over its
    // own layout width is that scale.
    const box = frame.getBoundingClientRect();
    const scale = box.width / window.innerWidth;
    return {
        x: box.left + frame.clientLeft * scale + (rect.left + point.x) * scale,
        y: box.top + frame.clientTop * scale + (rect.top + point.y) * scale,
    };
}

/** Whether the event's button is held down: 1 when it is. */
type Buttons = 0 | 1;

/** A mouse button, as the protocol names it. */
export type Button = "left" | "middle" | "right";

/** Each button's bit in the protocol's `buttons` field. */
const BUTTON_BITS: Record<Button, number> = { left: 1, right: 2, middle: 4 };

/** Modifier keys held with the mouse, as the protocol encodes them. */
export interface Modifiers {
    readonly alt?: boolean;
    readonly ctrl?: boolean;
    readonly meta?: boolean;
    readonly shift?: boolean;
}

/**
 * The protocol's modifier bit field.
 * @param modifiers - The keys held.
 * @returns Alt=1, Ctrl=2, Meta=4, Shift=8.
 */
function modifierBits(modifiers: Modifiers = {}): number {
    return (
        (modifiers.alt === true ? 1 : 0) |
        (modifiers.ctrl === true ? 2 : 0) |
        (modifiers.meta === true ? 4 : 0) |
        (modifiers.shift === true ? 8 : 0)
    );
}

/**
 * One mouse event.
 * @param type - mouseMoved, mousePressed or mouseReleased.
 * @param element - The element the point is on.
 * @param point - Where, on the element.
 * @param buttons - The buttons held during the event.
 * @param modifiers - The modifier keys held.
 * @param timestamp - When the event happened, in seconds since the epoch; the browser stamps it
 *     with the time it arrives when this is left out.
 * @param button - Which button.
 */
async function mouseEvent(
    type: "mouseMoved" | "mousePressed" | "mouseReleased",
    element: Element,
    point: Point,
    buttons: Buttons,
    modifiers?: Modifiers,
    timestamp?: number,
    button: Button = "left",
    clickCount = 1,
): Promise<void> {
    const at = toPage(element, point);
    await send()("Input.dispatchMouseEvent", {
        type,
        x: at.x,
        y: at.y,
        button: type === "mouseMoved" && buttons === 0 ? "none" : button,
        buttons: buttons === 0 ? 0 : BUTTON_BITS[button],
        clickCount: type === "mouseMoved" ? 0 : clickCount,
        modifiers: modifierBits(modifiers),
        ...(timestamp === undefined ? {} : { timestamp }),
    });
}

/**
 * Move the mouse, no button held.
 * @param element - The element the point is on.
 * @param point - Where to.
 */
export async function hover(element: Element, point: Point): Promise<void> {
    await mouseEvent("mouseMoved", element, point, 0);
}

/**
 * Press and release a button, the left by default, at one point.
 * @param element - The element the point is on.
 * @param point - Where.
 * @param modifiers - Modifier keys held.
 * @param button - Which button.
 */
export async function click(
    element: Element,
    point: Point,
    modifiers?: Modifiers,
    button: Button = "left",
): Promise<void> {
    await mouseEvent("mouseMoved", element, point, 0, modifiers);
    // Press and release sent together, not one awaited after the other: the element counts a
    // press held over 300 ms as no click (Graph.ts CLICK_MAX_DURATION_MS), and on a loaded machine
    // the round trip between two awaited sends alone can take that long. The protocol delivers
    // them in order.
    await Promise.all([
        mouseEvent("mousePressed", element, point, 1, modifiers, undefined, button),
        mouseEvent("mouseReleased", element, point, 0, modifiers, undefined, button),
    ]);
}

/**
 * Press and release the right button at one point, as a context-menu click does.
 * @param element - The element the point is on.
 * @param point - Where.
 */
export async function rightClick(element: Element, point: Point): Promise<void> {
    await click(element, point, undefined, "right");
}

/**
 * Two clicks of the left button at one point, as a double-click: the second press carries a click
 * count of two. All four events are sent together, because the scene counts two presses as a
 * double-click only when they arrive within its double-click delay (300 ms), and on a loaded machine
 * the round trip between two awaited sends alone can take that long. The protocol delivers them in
 * order.
 * @param element - The element the point is on.
 * @param point - Where.
 */
export async function doubleClick(element: Element, point: Point): Promise<void> {
    await mouseEvent("mouseMoved", element, point, 0);
    await Promise.all([
        mouseEvent("mousePressed", element, point, 1, undefined, undefined, "left", 1),
        mouseEvent("mouseReleased", element, point, 0, undefined, undefined, "left", 1),
        mouseEvent("mousePressed", element, point, 1, undefined, undefined, "left", 2),
        mouseEvent("mouseReleased", element, point, 0, undefined, undefined, "left", 2),
    ]);
}

/**
 * Press and release the left button at one point, the two events stamped `heldMs` apart, so the
 * element sees a button held that long however quickly the page gets to them. Both stamps are in
 * the past when they are sent.
 * @param element - The element the point is on.
 * @param point - Where.
 * @param heldMs - How long the button was down, by the events' own stamps.
 * @param beforeRelease - Run after the press is handled and before the release is sent.
 */
export async function pressFor(
    element: Element,
    point: Point,
    heldMs: number,
    beforeRelease?: () => void,
): Promise<void> {
    const releasedAt = (performance.timeOrigin + performance.now()) / 1000;
    await mouseEvent("mouseMoved", element, point, 0);
    await mouseEvent("mousePressed", element, point, 1, undefined, releasedAt - heldMs / 1000);
    beforeRelease?.();
    await mouseEvent("mouseReleased", element, point, 0, undefined, releasedAt);
}

/**
 * Move the mouse to a point and press the left button there, holding it.
 * @param element - The element the point is on.
 * @param point - Where.
 */
export async function press(element: Element, point: Point): Promise<void> {
    await mouseEvent("mouseMoved", element, point, 0);
    await mouseEvent("mousePressed", element, point, 1);
}

/**
 * Move the mouse in one step with the left button held, as after `press`.
 * @param element - The element the point is on.
 * @param point - Where to.
 */
export async function moveHeld(element: Element, point: Point): Promise<void> {
    await mouseEvent("mouseMoved", element, point, 1);
}

/**
 * Release the left button at a point, as after `press`.
 * @param element - The element the point is on.
 * @param point - Where.
 */
export async function release(element: Element, point: Point): Promise<void> {
    await mouseEvent("mouseReleased", element, point, 0);
}

/**
 * Press the left button at one point, move to another in steps, and release there.
 * @param element - The element the points are on.
 * @param from - Where the press is.
 * @param to - Where the release is.
 * @param steps - How many moves between them.
 * @param held - Run at `to` with the button still down, before the release.
 * @param modifiers - Modifier keys held throughout.
 */
export async function drag(
    element: Element,
    from: Point,
    to: Point,
    steps = 8,
    held?: () => Promise<void>,
    modifiers?: Modifiers,
): Promise<void> {
    await mouseEvent("mouseMoved", element, from, 0, modifiers);
    await mouseEvent("mousePressed", element, from, 1, modifiers);
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        await mouseEvent(
            "mouseMoved",
            element,
            { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
            1,
            modifiers,
        );
        // One frame between moves, as a hand gives: the element reads the pointer once a frame.
        await nextFrame();
    }

    await held?.();
    await mouseEvent("mouseReleased", element, to, 0, modifiers);
}

/**
 * Turn the mouse wheel over a point.
 * @param element - The element the point is on.
 * @param point - Where the pointer is.
 * @param deltaY - How far; positive scrolls down (away from the reader).
 * @param deltaX - How far sideways; positive scrolls right.
 */
export async function wheel(element: Element, point: Point, deltaY: number, deltaX = 0): Promise<void> {
    const at = toPage(element, point);
    await send()("Input.dispatchMouseEvent", { type: "mouseWheel", x: at.x, y: at.y, deltaX, deltaY });
}

/**
 * One finger pressed at a point, moved to another in steps, and lifted.
 * @param element - The element the points are on.
 * @param from - Where the finger lands.
 * @param to - Where it lifts.
 * @param steps - How many moves between.
 */
export async function touchDrag(element: Element, from: Point, to: Point, steps = 8): Promise<void> {
    const finger = (point: Point): Record<string, number>[] => {
        const at = toPage(element, point);
        return [{ x: at.x, y: at.y, id: 0, radiusX: 1, radiusY: 1, force: 1 }];
    };

    await send()("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: finger(from) });
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        await send()("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: finger({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }),
        });
        await nextFrame();
    }

    await send()("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/**
 * A two-finger pinch, both fingers on a horizontal line through `center`.
 * @param element - The element the fingers are on.
 * @param center - The midpoint between the fingers.
 * @param fromGap - The distance between the fingers when they land.
 * @param toGap - The distance when they lift; larger spreads (zoom in), smaller pinches.
 * @param steps - How many moves between.
 */
export async function pinch(element: Element, center: Point, fromGap: number, toGap: number, steps = 8): Promise<void> {
    const fingers = (gap: number): Record<string, number>[] =>
        [-1, 1].map((side, id) => {
            const at = toPage(element, { x: center.x + (side * gap) / 2, y: center.y });
            return { x: at.x, y: at.y, id, radiusX: 1, radiusY: 1, force: 1 };
        });

    await send()("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: fingers(fromGap) });
    for (let i = 1; i <= steps; i++) {
        await send()("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: fingers(fromGap + ((toGap - fromGap) * i) / steps),
        });
        await nextFrame();
    }

    await send()("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/**
 * A two-finger turn: both fingers `gap` apart through `center`, turned together about it.
 * @param element - The element the fingers are on.
 * @param center - The midpoint between the fingers, which stays put.
 * @param gap - The distance between the fingers, which stays the same.
 * @param degrees - How far the fingers turn, clockwise on screen.
 * @param steps - How many moves between.
 */
export async function twist(element: Element, center: Point, gap: number, degrees: number, steps = 8): Promise<void> {
    const fingers = (turn: number): Record<string, number>[] =>
        [-1, 1].map((side, id) => {
            const angle = (turn * Math.PI) / 180;
            const at = toPage(element, {
                x: center.x + (side * gap * Math.cos(angle)) / 2,
                y: center.y + (side * gap * Math.sin(angle)) / 2,
            });
            return { x: at.x, y: at.y, id, radiusX: 1, radiusY: 1, force: 1 };
        });

    await send()("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: fingers(0) });
    for (let i = 1; i <= steps; i++) {
        await send()("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: fingers((degrees * i) / steps) });
        await nextFrame();
    }

    await send()("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/** Keys `holdKey` pressed and nothing has released yet. */
const heldKeys = new Set<string>();

/**
 * Press a key and hold it, on whatever has focus: a real key press, through `userEvent`.
 * @param key - The key, as `KeyboardEvent.key` names it ("w", "ArrowLeft", "+").
 */
export async function holdKey(key: string): Promise<void> {
    await userEvent.keyboard(`{${key}>}`);
    heldKeys.add(key);
}

/**
 * Release a key `holdKey` pressed.
 * @param key - The key.
 */
export async function releaseKey(key: string): Promise<void> {
    await userEvent.keyboard(`{/${key}}`);
    heldKeys.delete(key);
}

/**
 * Release every key still held, so a key a test left down does not carry into the next test.
 * Call it from `afterEach`.
 */
export async function releaseHeldKeys(): Promise<void> {
    for (const key of [...heldKeys]) {
        await releaseKey(key);
    }
}

/**
 * Run with the page at another device pixel ratio, as on a high-DPI screen, and put it back.
 * @param ratio - The device pixel ratio, such as 2.
 * @param body - What to run at that ratio.
 * @returns What `body` returns.
 */
export async function withDevicePixelRatio<T>(ratio: number, body: () => Promise<T>): Promise<T> {
    const protocol = send();
    // A width and height of 0 keep the page's own size: only the ratio changes.
    await protocol("Emulation.setDeviceMetricsOverride", {
        width: 0,
        height: 0,
        deviceScaleFactor: ratio,
        mobile: false,
    });
    try {
        return await body();
    } finally {
        await protocol("Emulation.clearDeviceMetricsOverride");
    }
}

/**
 * Wait one animation frame.
 * @returns When the next frame starts.
 */
export function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            resolve();
        });
    });
}
