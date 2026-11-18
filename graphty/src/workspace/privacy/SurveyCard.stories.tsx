import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor } from "storybook/test";

import {
    count,
    readSurveyState,
    resetAnalyticsForTests,
    setPostHogClientForTests,
    SURVEYS_KEY,
} from "../../lib/analytics";
import { realInput } from "../../stories/real-input";
import { EXPORT_EASE_SURVEY, USE_CASE_SURVEY } from "./__tests__/surveyFixtures";
import { SurveyCard } from "./SurveyCard";

/**
 * Clicks a control with real input under the test runner, else replays the click (Storybook's own UI).
 * @param parameters - the story's parameters, which carry real input when the story runs as a test.
 * @param control - what to click.
 */
async function click(parameters: Record<string, unknown>, control: Element): Promise<void> {
    const real = realInput(parameters);
    if (real) {
        await real.userEvent.click(control);
    } else {
        (control as HTMLElement).click();
    }
}

/**
 * Waits for the survey card to show and returns it.
 * @param canvasElement - the story's root.
 * @returns the card.
 */
async function surveyCard(canvasElement: HTMLElement): Promise<HTMLElement> {
    let card: HTMLElement | null = null;
    await waitFor(() => {
        card = canvasElement.ownerDocument.querySelector<HTMLElement>('aside[aria-label="Survey"]');
        expect(card).not.toBeNull();
    });
    return card as unknown as HTMLElement;
}

/**
 * A measure's first result: the moment the use case is asked. Fired after the card has mounted
 * and subscribed, so the picture does not depend on story order.
 */
function measured(): void {
    count("algorithm_run", { algorithm: "pagerank", outcome: "succeeded" });
}

const meta: Meta<typeof SurveyCard> = {
    title: "Workspace/Privacy/Survey card",
    component: SurveyCard,
    parameters: { layout: "fullscreen" },
    // Each story starts with no survey seen and PostHog on through a stand-in that offers both
    // surveys; the stand-in is taken away afterwards, so no other story inherits it.
    beforeEach: () => {
        localStorage.removeItem(SURVEYS_KEY);
        resetAnalyticsForTests();
        const undo = setPostHogClientForTests({
            getActiveMatchingSurveys: (callback) => {
                callback([USE_CASE_SURVEY, EXPORT_EASE_SURVEY]);
            },
        });
        return () => {
            undo();
            localStorage.removeItem(SURVEYS_KEY);
        };
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** "What are you trying to do?", asked at a measure's first result. */
export const UseCase: Story = {
    play: async ({ canvasElement }) => {
        measured();
        await surveyCard(canvasElement);
    },
};

/** The Other choice picked: its text box, with the warning that what is typed is sent. */
export const OtherChoice: Story = {
    play: async ({ canvasElement, parameters }) => {
        measured();
        const card = await surveyCard(canvasElement);
        const other = [...card.querySelectorAll("label")].find((label) => label.textContent === "Other");
        if (other === undefined) {
            throw new Error("no Other choice");
        }
        await click(parameters, other);
        await waitFor(() => {
            expect(card.textContent).toContain("Do not paste data from your graph. What you type here is sent.");
        });
    },
};

/** Answered by a click and Send: the card goes and the choice id is kept. */
export const Answered: Story = {
    play: async ({ canvasElement, parameters }) => {
        measured();
        const card = await surveyCard(canvasElement);
        const choice = [...card.querySelectorAll("label")].find(
            (label) => label.textContent === "Teach or learn about graphs",
        );
        if (choice === undefined) {
            throw new Error("no such choice");
        }
        await click(parameters, choice);
        const send = [...card.querySelectorAll("button")].find((button) => button.textContent === "Send");
        if (send === undefined) {
            throw new Error("no Send button");
        }
        await click(parameters, send);
        await waitFor(() => {
            expect(canvasElement.ownerDocument.querySelector('aside[aria-label="Survey"]')).toBeNull();
        });
        expect(readSurveyState().use_case).toBe("teach-or-learn-about-graphs");
    },
};

/** Dismissed: the card goes and the survey is never asked again. */
export const Dismissed: Story = {
    play: async ({ canvasElement, parameters }) => {
        measured();
        const card = await surveyCard(canvasElement);
        const close = card.querySelector('[aria-label="Dismiss survey"]');
        if (close === null) {
            throw new Error("no dismiss button");
        }
        await click(parameters, close);
        await waitFor(() => {
            expect(canvasElement.ownerDocument.querySelector('aside[aria-label="Survey"]')).toBeNull();
        });
        expect(readSurveyState().seen).toEqual([USE_CASE_SURVEY.id]);
    },
};

/** "How easy was it to get this export?", asked at the first export. */
export const ExportEase: Story = {
    play: async ({ canvasElement }) => {
        count("export_done", { kind: "graph", format: "json", destination: "download" });
        const card = await surveyCard(canvasElement);
        expect(card.textContent).toContain("How easy was it to get this export?");
    },
};
