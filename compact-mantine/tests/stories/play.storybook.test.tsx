import { composeStories, type Meta, setProjectAnnotations, type StoryFn } from "@storybook/react";
import { afterEach, describe, expect, it } from "vitest";

import preview from "../../.storybook/preview";
import { AXE_EXCEPTIONS, axeFindings, OFF_BY_DESIGN } from "../a11y/axe";

/**
 * Every story renders without throwing and its play function passes: the test
 * `@storybook/addon-vitest`'s storybookTest plugin generates per story (compose, run). That plugin
 * needs Storybook 9 and this package is on Storybook 8, so the same two calls are made here over
 * every story file Storybook indexes (.storybook/main.ts). A story tagged `!test` is skipped, as
 * the plugin skips it.
 *
 * Each story then gets one axe-core pass (../a11y/axe.ts) at Storybook's default globals, the
 * render the Accessibility panel checks: the same rules as tests/a11y/stories-axe.browser.test.tsx,
 * less the rules OFF_BY_DESIGN lists for the story's component and the known violations
 * AXE_EXCEPTIONS lists for the story, each with its tracking issue.
 */
setProjectAnnotations(preview);

const MODULES = import.meta.glob<Record<string, StoryFn> & { default: Meta }>(
    "../../stories/**/*.stories.@(js|jsx|ts|tsx)",
    {
        eager: true,
    },
);

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
