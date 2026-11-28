/**
 * @file The `storybook` vitest project's setup: every story renders with the project's own
 * decorators and parameters (preview.tsx), and its play function runs as the test, with real
 * input (src/stories/real-input.ts).
 */

import { setProjectAnnotations } from "@storybook/react-vite";
import { onTestFinished, vi } from "vitest";
import { server, userEvent } from "vitest/browser";

import type { RealInput } from "../src/stories/real-input";
import { cdpSend, topPagePoint } from "../src/test/real-pointer";
import * as projectAnnotations from "./preview";

// Real input for every play function's `userEvent` (vitest.real-user-event.mjs at the root): Playwright drives
// the browser, as a reader's mouse and keyboard do. Storybook's own UI and a capture keep its replay.
vi.mock("storybook/test", async (importOriginal) => {
    const { withRealUserEvent } = await import("../../vitest.real-user-event.mjs");
    return withRealUserEvent(await importOriginal(), (await import("vitest/browser")).userEvent);
});

const realInput: RealInput = {
    userEvent,
    async dragFileOver(element) {
        const send = cdpSend();
        // Any file on disk: the drag is never dropped, so it is never read.
        const data = { items: [], files: [`${server.config.root}/package.json`], dragOperationsMask: 1 };
        const at = topPagePoint(element);
        onTestFinished(async () => {
            await send("Input.dispatchDragEvent", { type: "dragCancel", ...at, data });
        });
        // As a hand does: the drag enters the window, then moves over it.
        await send("Input.dispatchDragEvent", { type: "dragEnter", ...at, data });
        await send("Input.dispatchDragEvent", { type: "dragOver", ...at, data });
    },
    async wheel(element, deltaY) {
        const send = cdpSend();
        await send("Input.dispatchMouseEvent", { type: "mouseWheel", ...topPagePoint(element), deltaX: 0, deltaY });
    },
};

// Draw on demand: a graph that never set `renderOnDemand` stops drawing once its picture is still,
// instead of redrawing every frame in software (SwiftShader) for the whole test. Not the
// consumer's default; a test that needs continuous frames sets `renderOnDemand = false`.
(globalThis as { __GRAPHTY_TEST_RENDER_ON_DEMAND__?: boolean }).__GRAPHTY_TEST_RENDER_ON_DEMAND__ = true;

setProjectAnnotations([projectAnnotations, { parameters: { realInput } }]);
