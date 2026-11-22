import eruda from "eruda";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";

import { pinErudaTopRight } from "./eruda";

/** The test frame's size before any test resized it. */
const START = { width: window.innerWidth, height: window.innerHeight };

/**
 * Resizes the test frame for real and waits for the `resize` the browser fires for it.
 * @param width - The width, or undefined for the size the frame started at.
 * @param height - The height, or undefined for the size the frame started at.
 */
async function resizeTo(width = START.width, height = START.height): Promise<void> {
    if (window.innerWidth === width && window.innerHeight === height) {
        return;
    }

    const resized = new Promise((resolve) => {
        window.addEventListener("resize", resolve, { once: true });
    });
    await page.viewport(width, height);
    await resized;
}

describe("pinErudaTopRight", () => {
    afterEach(async () => {
        await resizeTo();
        eruda.destroy();
    });

    it("puts the entry button in the top-right corner", () => {
        eruda.init();
        pinErudaTopRight(eruda);

        expect(eruda.position()).toEqual({ x: window.innerWidth - 50, y: 0 });
    });

    // A full-page screenshot resizes the page to 1 x 1 for an instant. Eruda forgets a place that
    // does not fit the window and falls back to bottom-right; the button must come back anyway.
    it("keeps the button top-right after the window was briefly too small for it", async () => {
        eruda.init();
        pinErudaTopRight(eruda);

        await resizeTo(1, 1);
        await resizeTo();

        expect(eruda.position()).toEqual({ x: window.innerWidth - 50, y: 0 });
    });

    // iPad Safari fires `orientationchange` when the reader switches apps, and eruda then puts the button
    // back at its default, bottom-right, unconditionally. Moving it there the way that reset does, it must
    // come back to the top right.
    it("brings the button back top-right after eruda resets it to its corner", async () => {
        eruda.init();
        pinErudaTopRight(eruda);
        const root = document.getElementById("eruda")?.shadowRoot;
        const entry = root?.querySelector<HTMLElement>(".eruda-entry-btn");
        if (root === null || root === undefined || entry === null || entry === undefined) {
            throw new Error("eruda drew no entry button");
        }
        // The reset moves it to the corner, and the pin moves it back: two style changes.
        const movedTwice = new Promise<void>((resolve) => {
            let moves = 0;
            const watch = new MutationObserver(() => {
                moves += 1;
                if (moves === 2) {
                    watch.disconnect();
                    resolve();
                }
            });
            watch.observe(root, { attributes: true, attributeFilter: ["style"], subtree: true });
        });

        const corner = entry.offsetWidth + 10;
        eruda.position({ x: window.innerWidth - corner, y: window.innerHeight - corner });
        await movedTwice;

        expect(eruda.position()).toEqual({ x: window.innerWidth - 50, y: 0 });
    });
});
