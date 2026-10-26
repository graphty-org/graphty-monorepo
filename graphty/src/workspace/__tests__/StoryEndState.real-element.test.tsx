/**
 * A story's picture is taken the moment its play function ends, and the screenshot step renders
 * the story again in the same page for each mode: so when the play ends the page must already be
 * the picture, the same however soon it is shot and however many times the story was rendered
 * before. Each story here once drew two different pictures (issues #3521, #3553).
 *
 * Each test runs the story as the story tests do (compose, render, play) and reads the page at
 * once, with no wait: what it reads is what a capture that shoots immediately would draw.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { composeStories } from "@storybook/react";
import React from "react";
import { afterEach, assert, describe, it } from "vitest";

import { AllProviders } from "../../test/test-providers";
import * as graphPlaceStories from "../graph-place/GraphPlace.stories";
import * as stylePanelStories from "../style/StylePanel.stories";

/** The app's providers, as the Storybook preview's decorator gives them. */
const annotations = {
    decorators: [
        (Story: React.ComponentType): React.JSX.Element => (
            <AllProviders>
                <Story />
            </AllProviders>
        ),
    ],
};

const { FindNoMatch } = composeStories(graphPlaceStories, annotations);
const { FootballConference } = composeStories(stylePanelStories, annotations);

/**
 * Runs a story's render and play in a fresh root.
 * @param story - the composed story.
 * @param story.run - runs its loaders, render and play.
 * @returns the story's root.
 */
async function runStory(story: {
    run: (context: { canvasElement: HTMLElement }) => Promise<void>;
}): Promise<HTMLElement> {
    const canvasElement = document.createElement("div");
    document.body.append(canvasElement);
    await story.run({ canvasElement });
    return canvasElement;
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("a story is its picture when its play ends", () => {
    it("FindNoMatch shows its example rule (#3553)", async () => {
        const root = await runStory(FindNoMatch);
        assert.isNotNull(root.querySelector(".ws-find-example"), root.querySelector(".ws-find")?.textContent ?? "");
    });

    it("FootballConference draws the new layer's Which nodes cards open, rendered once or again (#3521)", async () => {
        // The screenshot step renders a story again in the page its test ran in, once per mode.
        const root = await runStory(FootballConference);
        for (const render of ["first", "second"]) {
            if (render === "second") {
                await FootballConference.run({ canvasElement: root });
            }
            const picker = document.querySelector('[data-testid="which-picker"][data-side="node"]');
            assert.isNotNull(
                picker?.querySelector(".ws-which-open"),
                `${render} render: ${picker?.textContent ?? "no picker"}`,
            );
        }
    });
});
