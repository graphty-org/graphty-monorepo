/**
 * @file The `storybook` vitest project's setup: every story renders with the project's own
 * decorators and parameters (preview.tsx), and its play function runs as the test, with real
 * input (src/stories/real-input.ts).
 */

import { setProjectAnnotations } from "@storybook/react-vite";
import { onTestFinished } from "vitest";
import { cdp, server, userEvent } from "vitest/browser";

import type { RealInput } from "../src/stories/real-input";
import * as projectAnnotations from "./preview";

/** A protocol command and its parameters; the session's own type is too narrow to name them. */
type Send = (method: string, params?: Record<string, unknown>) => Promise<unknown>;

/**
 * The middle of an element's visible part, in the top page's viewport, where the protocol's input lands. The test
 * page runs in an iframe of the vitest page, possibly scaled to fit.
 * @param element - the element
 * @returns the point in the top page's CSS pixels
 */
function middleOnPage(element: Element): { x: number; y: number } {
    // The middle of the part on screen: the middle of an element taller than the window (a whole
    // page) is below the fold, where no input lands.
    const rect = element.getBoundingClientRect();
    const top = Math.max(rect.top, 0);
    const left = Math.max(rect.left, 0);
    const x = (left + Math.min(rect.right, window.innerWidth)) / 2;
    const y = (top + Math.min(rect.bottom, window.innerHeight)) / 2;
    const frame = window.frameElement;
    if (frame === null) {
        return { x, y };
    }
    const box = frame.getBoundingClientRect();
    const scale = box.width / window.innerWidth;
    return { x: box.left + frame.clientLeft * scale + x * scale, y: box.top + frame.clientTop * scale + y * scale };
}

const realInput: RealInput = {
    userEvent,
    async dragFileOver(element) {
        const send = (cdp() as unknown as { send: Send }).send.bind(cdp());
        // Any file on disk: the drag is never dropped, so it is never read.
        const data = { items: [], files: [`${server.config.root}/package.json`], dragOperationsMask: 1 };
        const at = middleOnPage(element);
        onTestFinished(async () => {
            await send("Input.dispatchDragEvent", { type: "dragCancel", ...at, data });
        });
        // As a hand does: the drag enters the window, then moves over it.
        await send("Input.dispatchDragEvent", { type: "dragEnter", ...at, data });
        await send("Input.dispatchDragEvent", { type: "dragOver", ...at, data });
    },
};

// Draw on demand: a graph that never set `renderOnDemand` stops drawing once its picture is still,
// instead of redrawing every frame in software (SwiftShader) for the whole test. Not the
// consumer's default; a test that needs continuous frames sets `renderOnDemand = false`.
(globalThis as { __GRAPHTY_TEST_RENDER_ON_DEMAND__?: boolean }).__GRAPHTY_TEST_RENDER_ON_DEMAND__ = true;

setProjectAnnotations([projectAnnotations, { parameters: { realInput } }]);
