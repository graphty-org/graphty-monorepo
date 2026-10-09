import { composeStories, type Meta, setProjectAnnotations, type StoryFn } from "@storybook/react";
import { afterEach, describe, it } from "vitest";

import preview from "../../.storybook/preview";

/**
 * Every story renders without throwing and its play function passes: the test
 * `@storybook/addon-vitest`'s storybookTest plugin generates per story (compose, run). That plugin
 * needs Storybook 9 and this package is on Storybook 8, so the same two calls are made here over
 * every story file Storybook indexes (.storybook/main.ts). A story tagged `!test` is skipped, as
 * the plugin skips it.
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
    });
});
