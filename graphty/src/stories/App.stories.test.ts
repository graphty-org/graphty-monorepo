import { describe, expect, it } from "vitest";

import appStorySource from "./App.stories.tsx?raw";

/**
 * Storybook does not run `src/main.tsx`, so the App story has to define `<graphty-element>`
 * itself. When it does not, the tag stays an unknown element: no canvas is drawn and the
 * canvas region shows the page behind it -- black in the dark theme -- instead of the
 * element's whitesmoke background.
 *
 * Read from the story's source rather than by importing the story: importing it evaluates the
 * whole application -- Mantine, the element and Babylon.js, thousands of modules -- which took
 * 4-7 s on its own and passed the 15 s test budget in a loaded pre-push run. What this test
 * guards is one import line, and that is what it reads.
 */
describe("App story", () => {
    it("imports @graphty/graphty-element, which defines the tag the story renders", () => {
        expect(appStorySource).toMatch(/^import "@graphty\/graphty-element";$/m);
    });
});
