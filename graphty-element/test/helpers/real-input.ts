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
 * The keyboard needs nothing here: `userEvent.keyboard` already presses real keys.
 */

import { cdp } from "vitest/browser";

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

/** Which mouse buttons a move holds down: 1 for the left. */
type Buttons = 0 | 1;

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
 */
async function mouseEvent(
    type: "mouseMoved" | "mousePressed" | "mouseReleased",
    element: Element,
    point: Point,
    buttons: Buttons,
    modifiers?: Modifiers,
): Promise<void> {
    const at = toPage(element, point);
    await send()("Input.dispatchMouseEvent", {
        type,
        x: at.x,
        y: at.y,
        button: type === "mouseMoved" && buttons === 0 ? "none" : "left",
        buttons,
        clickCount: type === "mouseMoved" ? 0 : 1,
        modifiers: modifierBits(modifiers),
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
 * Press and release the left button at one point.
 * @param element - The element the point is on.
 * @param point - Where.
 * @param modifiers - Modifier keys held.
 */
export async function click(element: Element, point: Point, modifiers?: Modifiers): Promise<void> {
    await mouseEvent("mouseMoved", element, point, 0, modifiers);
    await mouseEvent("mousePressed", element, point, 1, modifiers);
    await mouseEvent("mouseReleased", element, point, 0, modifiers);
}

/**
 * Press the left button at one point, move to another in steps, and release there.
 * @param element - The element the points are on.
 * @param from - Where the press is.
 * @param to - Where the release is.
 * @param steps - How many moves between them.
 */
export async function drag(element: Element, from: Point, to: Point, steps = 8): Promise<void> {
    await mouseEvent("mouseMoved", element, from, 0);
    await mouseEvent("mousePressed", element, from, 1);
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        await mouseEvent(
            "mouseMoved",
            element,
            { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
            1,
        );
        // One frame between moves, as a hand gives: the element reads the pointer once a frame.
        await nextFrame();
    }

    await mouseEvent("mouseReleased", element, to, 0);
}

/**
 * Turn the mouse wheel over a point.
 * @param element - The element the point is on.
 * @param point - Where the pointer is.
 * @param deltaY - How far; positive scrolls down (away from the reader).
 */
export async function wheel(element: Element, point: Point, deltaY: number): Promise<void> {
    const at = toPage(element, point);
    await send()("Input.dispatchMouseEvent", { type: "mouseWheel", x: at.x, y: at.y, deltaX: 0, deltaY });
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
