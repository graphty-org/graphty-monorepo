import eruda from "eruda";
import { afterEach, describe, expect, it } from "vitest";

import { pinErudaTopRight } from "./eruda";

/**
 * Pretends the window is `width` x `height` and fires the `resize` a real resize would.
 * @param width - The width to report, or undefined to report the real one again.
 * @param height - The height to report, or undefined to report the real one again.
 */
function resizeTo(width?: number, height?: number): void {
    if (width === undefined || height === undefined) {
        Reflect.deleteProperty(window, "innerWidth");
        Reflect.deleteProperty(window, "innerHeight");
    } else {
        Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
        Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
    }

    window.dispatchEvent(new Event("resize"));
}

describe("pinErudaTopRight", () => {
    afterEach(() => {
        resizeTo();
        eruda.destroy();
    });

    it("puts the entry button in the top-right corner", () => {
        eruda.init();
        pinErudaTopRight(eruda);

        expect(eruda.position()).toEqual({ x: window.innerWidth - 60, y: 20 });
    });

    // A full-page screenshot resizes the page to 1 x 1 for an instant. Eruda forgets a place that
    // does not fit the window and falls back to bottom-right; the button must come back anyway.
    it("keeps the button top-right after the window was briefly too small for it", () => {
        eruda.init();
        pinErudaTopRight(eruda);

        resizeTo(1, 1);
        resizeTo();

        expect(eruda.position()).toEqual({ x: window.innerWidth - 60, y: 20 });
    });
});
