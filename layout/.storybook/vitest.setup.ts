/**
 * @file The `storybook` vitest project's setup (vitest.storybook.config.ts): every story renders
 * with the project's own decorators and parameters (preview.ts), as in the built Storybook.
 */

import { setProjectAnnotations } from "@storybook/html-vite";
import { vi } from "vitest";

import * as projectAnnotations from "./preview.js";

// Real input for every play function's `userEvent` (vitest.real-user-event.mjs at the root): Playwright drives
// the browser, as a reader's mouse and keyboard do. Storybook's own UI and a capture keep its replay.
vi.mock("@storybook/test", async (importOriginal) => {
    const { withRealUserEvent } = await import("../../vitest.real-user-event.mjs");
    return withRealUserEvent(await importOriginal(), (await import("vitest/browser")).userEvent);
});

setProjectAnnotations([projectAnnotations]);
