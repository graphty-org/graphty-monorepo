/**
 * The real mouse, sent through the Chrome DevTools Protocol: the browser makes every event, with
 * pointer capture, hit testing and the click that follows a release. Points are mapped into the
 * top page by hand, because the test page is an iframe that may be scaled to fit; Playwright's
 * own `position` offsets drifted a few pixels on a drag, which a test of where a drag lands
 * cannot afford.
 */
import { cdp } from "vitest/browser";

/** A point in CSS pixels, from an element's top-left corner or the test frame's viewport. */
interface Offset {
    x: number;
    y: number;
}

/** A protocol command and its parameters; the session's own type is too narrow to name them. */
type Send = (method: string, params?: Record<string, unknown>) => Promise<unknown>;

/** Where the pointer is, in the test frame's viewport, and whether the button is held. */
let pointer: Offset = { x: 0, y: 0 };
let held = false;

/**
 * One mouse event at a point of the test frame's viewport.
 * @param type - mouseMoved, mousePressed or mouseReleased
 * @param at - where, in the test frame's CSS pixels
 */
async function mouse(type: "mouseMoved" | "mousePressed" | "mouseReleased", at: Offset): Promise<void> {
    const frame = window.frameElement;
    let { x } = at;
    let { y } = at;
    if (frame !== null) {
        const box = frame.getBoundingClientRect();
        const scale = box.width / window.innerWidth;
        x = box.left + frame.clientLeft * scale + at.x * scale;
        y = box.top + frame.clientTop * scale + at.y * scale;
    }
    held = type === "mousePressed" || (held && type !== "mouseReleased");
    pointer = at;
    const session = cdp() as unknown as { send: Send };
    await session.send("Input.dispatchMouseEvent", {
        type,
        x,
        y,
        button: type === "mouseMoved" && !held ? "none" : "left",
        buttons: held ? 1 : 0,
        clickCount: type === "mouseMoved" ? 0 : 1,
    });
}

/**
 * Move to a point on an element and press the left button there.
 * @param element - what the press lands on
 * @param at - where on the element; its center when left out
 */
export async function press(element: Element, at?: Offset): Promise<void> {
    const rect = element.getBoundingClientRect();
    const point = {
        x: rect.left + (at?.x ?? rect.width / 2),
        y: rect.top + (at?.y ?? rect.height / 2),
    };
    await mouse("mouseMoved", point);
    await mouse("mousePressed", point);
}

/**
 * Move the pointer by an offset from where it is, in one move.
 * @param dx - how far along x
 * @param dy - how far along y
 */
export async function moveBy(dx: number, dy = 0): Promise<void> {
    await mouse("mouseMoved", { x: pointer.x + dx, y: pointer.y + dy });
}

/** Release the left button where the pointer is, if it is held. */
export async function release(): Promise<void> {
    if (held) {
        await mouse("mouseReleased", pointer);
    }
}

/**
 * Press on an element, move the pointer by an offset in steps and release there.
 * @param element - what the press lands on
 * @param from - where on the element the press lands
 * @param by - how far the pointer moves before the release
 * @param steps - how many moves the pointer makes on the way
 */
export async function drag(element: Element, from: Offset, by: Offset, steps = 4): Promise<void> {
    await press(element, from);
    for (let i = 0; i < steps; i++) {
        await moveBy(by.x / steps, by.y / steps);
    }
    await release();
}
