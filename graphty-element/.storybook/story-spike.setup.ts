/**
 * @file SPIKE (issue #3389): loaded only when STORY_SPIKE_OUT is set (vitest.config.ts). Shoots each
 * story at the end of its test as visual-review's capture would, for `visual-review parity`.
 */

import { afterEach, beforeEach, vi } from "vitest";
import { commands } from "vitest/browser";

import { installStorySpike } from "../../visual-review/capture/story-spike-setup.mjs";

installStorySpike({
    afterEach,
    beforeEach,
    vi,
    commands,
    waitFor: { selector: "graphty-element", method: "waitForStableFrame" },
    mode: null,
    served: `${import.meta.env.MODE}, NODE_ENV ${process.env.NODE_ENV}`,
});
