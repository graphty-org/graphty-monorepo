import { composeStories, type Meta, setProjectAnnotations, type StoryFn } from "@storybook/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { commands, userEvent } from "vitest/browser";

import preview from "../../.storybook/preview";
import { AXE_EXCEPTIONS, axeFindings, OFF_BY_DESIGN } from "../a11y/axe";

/**
 * Every story renders without throwing and its play function passes: the test
 * `@storybook/addon-vitest`'s storybookTest plugin generates per story (compose, run). Until this
 * package's stories switch to that plugin, the same two calls are made here over every story file
 * Storybook indexes (.storybook/main.ts). A story tagged `!test` is skipped, as the plugin skips it.
 *
 * Each story then gets one axe-core pass (../a11y/axe.ts) at Storybook's default globals, the
 * render the Accessibility panel checks: the same rules as tests/a11y/stories-axe.browser.test.tsx,
 * less the rules OFF_BY_DESIGN lists for the story's component and the known violations
 * AXE_EXCEPTIONS lists for the story, each with its tracking issue.
 */
// Real input for the play functions (stories/helpers/real-input.ts): Playwright drives the browser,
// so a scrub or a key press is a trusted event with pointer capture and hit testing, as a reader's is.
setProjectAnnotations([preview, { parameters: { realInput: { userEvent, commands } } }]);

const MODULES = import.meta.glob<Record<string, StoryFn> & { default: Meta }>(
    "../../stories/**/*.stories.@(js|jsx|ts|tsx)",
    {
        eager: true,
    },
);

// Every story starts as a freshly loaded page does, which is how Storybook and the screenshot
// capture show it. All the stories share one page here, and a play function's real gesture leaves
// two things behind: the pointer wherever the gesture ended, and Chromium's record that the last
// input was the mouse, after which a programmatic focus() no longer matches :focus-visible (no
// focus ring, no focus tooltip). Park the pointer and press Shift, which moves nothing.
beforeEach(async () => {
    await commands.mouseAway();
    await userEvent.keyboard("{Shift}");
});

afterEach(() => {
    document.body.innerHTML = "";
});

describe.each(Object.entries(MODULES))("%s", (_file, module) => {
    const stories = Object.entries(composeStories(module)).filter(([, Story]) => Story.tags.includes("test"));

    it.each(stories)("%s", async (_name, Story) => {
        const canvasElement = document.createElement("div");
        document.body.appendChild(canvasElement);
        await Story.run({ canvasElement });

        const off = [...(OFF_BY_DESIGN[module.default.title ?? ""] ?? []), ...(AXE_EXCEPTIONS[Story.id]?.rules ?? [])];
        expect(await axeFindings("figma", off)).toEqual([]);
    });
});
