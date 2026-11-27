/**
 * A right-button drag on the 3D canvas pans the camera for as long as the button is held, however
 * fast the moves come and wherever the pointer goes (issue #10200). On Linux, Chrome fires
 * `contextmenu` at the right press, so the canvas's context menu opens, and takes focus, under a
 * drag that is just starting: the canvas must keep the pointer through that, and a drag that pans
 * must leave no menu behind (a right-click still opens it, at the release).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { cdp, page } from "vitest/browser";

import { emptyPoint } from "../../../test/empty-point";
import { openSampleFromStart } from "../../../test/open";
import { cleanup, screen } from "../../../test/test-utils";

/** The project's element. */
type Element = HTMLElementTagNameMap["graphty-element"];

/** A protocol command and its parameters. */
type Send = (method: string, params?: Record<string, unknown>) => Promise<unknown>;

/**
 * Where the camera looks from, as one comparable string.
 * @param element - the element.
 * @returns its position, rounded.
 */
function cameraAt(element: Element): string {
    const { position } = element.getCameraState();
    return JSON.stringify([position?.x, position?.y, position?.z].map((v) => (v ?? 0).toFixed(4)));
}

/**
 * Settles once two frames have been drawn after this call, so a move's pan is on the camera.
 * @returns settles after them.
 */
function frames(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

afterEach(() => {
    cleanup();
});

describe("a right-button drag on the 3D canvas", () => {
    it("keeps panning to the end of a fast drag that leaves the canvas", async () => {
        await page.viewport(1440, 900);
        const { session } = await openSampleFromStart("Les Miserables");
        assert.strictEqual(session.layout.dimension, "3d");
        const element = document.querySelector<Element>("graphty-element:not([data-start-page])");
        if (element === null) {
            throw new Error("no project element");
        }
        await element.waitForSettled();
        await element.waitForStableFrame();

        // The press lands on empty canvas near its left edge; the drag runs left, off the canvas.
        const start = await emptyPoint(element);
        const rect = element.getBoundingClientRect();
        const frame = globalThis.frameElement;
        const box = frame?.getBoundingClientRect();
        const scale = box === undefined ? 1 : box.width / window.innerWidth;
        const top = (x: number, y: number): { x: number; y: number } => ({
            x: (box?.left ?? 0) + ((frame?.clientLeft ?? 0) + rect.left + x) * scale,
            y: (box?.top ?? 0) + ((frame?.clientTop ?? 0) + rect.top + y) * scale,
        });
        const at = (i: number): { x: number; y: number } => top(start.x - 6 * (i + 1), start.y + (i % 3));
        const protocol = cdp() as unknown as { send: Send };
        const mouse = (params: Record<string, unknown>): Promise<unknown> =>
            protocol.send("Input.dispatchMouseEvent", params);
        const held = { button: "right", buttons: 2, force: 0.5 } as const;

        await mouse({ type: "mouseMoved", ...top(start.x, start.y) });
        await mouse({ type: "mousePressed", ...top(start.x, start.y), button: "right", buttons: 2, clickCount: 1 });
        // A burst: every move sent before the page has handled the first, as a fast mouse sends them.
        const moves: Promise<unknown>[] = [];
        for (let i = 0; i < 29; i++) {
            moves.push(mouse({ type: "mouseMoved", ...at(i), ...held }));
        }
        await Promise.all(moves);
        await frames();
        const before = cameraAt(element);
        // The drag's last move, off the canvas with the button still held, still pans the camera.
        await mouse({ type: "mouseMoved", ...at(29), ...held });
        await frames();
        const after = cameraAt(element);
        await mouse({ type: "mouseReleased", ...at(29), button: "right", buttons: 0, clickCount: 1 });
        await frames();
        assert.notStrictEqual(after, before, "the drag's last move panned the camera");
        // A right-drag that panned is not a right-click: no menu is left open behind it.
        assert.isNull(document.querySelector("[role=menu]"), "no context menu after a right-drag");

        // The release outside the canvas ended the drag: hovering back over it pans nothing.
        const released = cameraAt(element);
        for (let i = 28; i >= 0; i -= 4) {
            await mouse({ type: "mouseMoved", ...at(i), button: "none", buttons: 0 });
            await frames();
        }
        assert.strictEqual(cameraAt(element), released, "hovering after the release pans nothing");

        // A right-click where the drag began still opens the menu.
        await mouse({ type: "mouseMoved", ...top(start.x, start.y), button: "none", buttons: 0 });
        await mouse({ type: "mousePressed", ...top(start.x, start.y), button: "right", buttons: 2, clickCount: 1 });
        await mouse({ type: "mouseReleased", ...top(start.x, start.y), button: "right", buttons: 0, clickCount: 1 });
        assert.isNotNull(await screen.findByRole("menu"), "a right-click opens the canvas menu");
    });
});
