import { composeStories, type Meta, setProjectAnnotations, type StoryFn } from "@storybook/react-vite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { commands, userEvent } from "vitest/browser";

import { recordStory, watchConsole } from "../../../tools/storybook-story-checks.mjs";
import preview from "../../.storybook/preview";
import { AXE_EXCEPTIONS, axeFindings, OFF_BY_DESIGN } from "../a11y/axe";

/**
 * Every story renders without throwing and its play function passes: the test
 * `@storybook/addon-vitest`'s storybookTest plugin generates per story (compose, run). The same two
 * calls are made here over every story file Storybook indexes (.storybook/main.ts), so the run can
 * add real input and an axe pass per story. A story tagged `!test` is skipped, as the plugin skips
 * it; a story hidden from readers (`!dev`) still runs.
 *
 * Each story then gets one axe-core pass (../a11y/axe.ts) at Storybook's default globals, the
 * render the Accessibility panel checks: the same rules as tests/a11y/stories-axe.browser.test.tsx,
 * less the rules OFF_BY_DESIGN lists for the story's component and the known violations
 * AXE_EXCEPTIONS lists for the story, each with its tracking issue.
 */
// Real input for the play functions (stories/helpers/real-input.ts): Playwright drives the browser,
// so a scrub or a key press is a trusted event with pointer capture and hit testing, as a reader's is.
setProjectAnnotations([preview, { parameters: { realInput: { userEvent, commands } } }]);

/** Console errors every story prints, which no story causes or can avoid. */
const KNOWN_CONSOLE_ERRORS: string[] = [];

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
        const watcher = watchConsole();
        try {
            await Story.run({ canvasElement });
        } finally {
            // The story's console errors (tools/storybook-story-checks.mjs): an unexpected one fails
            // the story, since none of this package's stories prints one.
            await recordStory(
                {
                    id: Story.id,
                    messages: watcher.stop(),
                    expected: Story.parameters.expectedConsoleErrors,
                    reports: undefined,
                },
                {
                    known: KNOWN_CONSOLE_ERRORS,
                    mode: "fail",
                    writeFile: (path, text) => commands.writeFile(path, text),
                },
            );
        }

        const off = [...(OFF_BY_DESIGN[module.default.title ?? ""] ?? []), ...(AXE_EXCEPTIONS[Story.id]?.rules ?? [])];
        expect(await axeFindings("figma", off)).toEqual([]);
    });
});
