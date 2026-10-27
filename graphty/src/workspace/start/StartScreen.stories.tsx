import type { Meta, StoryObj } from "@storybook/react";
import { expect, waitFor } from "storybook/test";

import { realInput } from "../../stories/real-input";
import { storyWaitOptions } from "../../stories/wait";
import { answerUsageData, forgetUsageAnswer } from "../privacy/usageData";
import { clearRecent, rememberRecent } from "../project/recent";
import { SINGLE_KEY_SHORTCUTS } from "../settings/preferences";
import { Workspace } from "../Workspace";

/**
 * Clicks the control with this accessible name or text.
 * @param canvasElement - the story's root.
 * @param parameters - the story's parameters, which carry real input when the story runs as a test.
 * @param name - the control's aria-label, or its text.
 */
async function click(canvasElement: HTMLElement, parameters: Record<string, unknown>, name: string): Promise<void> {
    const root = canvasElement.ownerDocument;
    const control =
        root.querySelector<HTMLElement>(`[aria-label="${name}"]`) ??
        [...root.querySelectorAll<HTMLElement>("button, summary")].find((el) => el.textContent?.trim() === name);
    if (control === undefined || control === null) {
        throw new Error(`no control named "${name}"`);
    }
    const real = realInput(parameters);
    if (real) {
        await real.userEvent.click(control);
    } else {
        // In Storybook's own UI a page script cannot make trusted input, so the click is replayed.
        control.click();
    }
}

/**
 * Waits until the start page's graph is drawn as it stays: its sample loaded, Louvain's
 * communities colored and named in the caption, and a stable frame of that. The graph loads after
 * the page has rendered, so a picture taken before then shows the page without it.
 * @param canvasElement - the story's root.
 */
async function heroDrawn(canvasElement: HTMLElement): Promise<void> {
    const started = performance.now();
    await waitFor(() => {
        expect(canvasElement.querySelector(".ws-land-said")?.textContent).toContain("Colored by community");
    }, storyWaitOptions(30_000));
    const captionMs = Math.round(performance.now() - started);
    const element = canvasElement.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the start page drew no <graphty-element>");
    }
    // Diagnosis for #3766 (cause not yet seen): the element's own deadline ends before the test's (30 s,
    // graphty/vitest.config.ts), so a frame that never settles fails with the element's account of what is
    // still owed and how long the caption took, not a bare test timeout. A bare timeout now means the caption
    // (the sample load and Louvain) never appeared.
    try {
        await element.waitForStableFrame({ timeoutMs: Math.max(1_000, 25_000 - captionMs) });
    } catch (error) {
        throw new Error(
            `hero caption shown after ${String(captionMs)} ms, then: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
}

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Start screen",
    component: Workspace,
    parameters: { layout: "fullscreen" },
    // A story with a play of its own waits for the graph first, as this one does.
    play: async ({ canvasElement }) => {
        await heroDrawn(canvasElement);
    },
    // Every story starts from a first launch: the usage data card unanswered, single-key
    // shortcuts on. The answer is the reader's and lives in this browser, so it is reset here.
    beforeEach: async () => {
        forgetUsageAnswer();
        localStorage.removeItem(SINGLE_KEY_SHORTCUTS.key);
        await clearRecent();
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** First launch: the usage data card at the foot, unanswered (the mock's `#/start-screen/first-run`). */
export const FirstRun: Story = {};

/** What is collected, open (`#/start-screen/disclosure`). */
export const Disclosure: Story = {
    play: async ({ canvasElement, parameters }) => {
        await heroDrawn(canvasElement);
        await click(canvasElement, parameters, "What is collected");
    },
};

/** Answered Share usage data: the answer line, and the chip says so (`#/start-screen/answered`). */
export const Answered: Story = {
    play: async ({ canvasElement, parameters }) => {
        await heroDrawn(canvasElement);
        await click(canvasElement, parameters, "Share usage data");
    },
};

/** Answered No thanks (`#/start-screen/declined`). */
export const Declined: Story = {
    play: async ({ canvasElement, parameters }) => {
        await heroDrawn(canvasElement);
        await click(canvasElement, parameters, "No thanks");
    },
};

/** A later launch: the card was answered before, so the foot is empty (`#/start-screen/returning`). */
export const Returning: Story = {
    beforeEach: () => {
        answerUsageData("declined");
    },
};

/** A returning reader: Resume, the next three recent projects, Open a file and New project. */
export const ReturningReader: Story = {
    beforeEach: async () => {
        answerUsageData("declined");
        const day = 86_400_000;
        const now = Date.UTC(2026, 9, 17, 12);
        await rememberRecent({ id: "football", name: "College football communities", nodes: 115, at: now - day / 12 });
        await rememberRecent({ id: "key", name: "Key players, ranked", nodes: 77, at: now - day });
        await rememberRecent({ id: "karate", name: "Karate club split", nodes: 34, at: now - 8 * day });
        await rememberRecent({ id: "florentine", name: "Florentine marriages", nodes: 15, at: now - 15 * day });
        // The page words save times from today ("2 hours ago", "Yesterday"), so the story's today is fixed.
        const realNow = Date.now;
        Date.now = () => now;
        return () => {
            Date.now = realNow;
        };
    },
};

/** Open network data: the sources on the way, and Open from a link. */
export const NetworkData: Story = {
    beforeEach: () => {
        answerUsageData("declined");
    },
    play: async ({ canvasElement, parameters }) => {
        await heroDrawn(canvasElement);
        await click(canvasElement, parameters, "Open network data");
        await waitFor(
            () => expect(canvasElement.ownerDocument.querySelector('[role="dialog"]')).not.toBeNull(),
            storyWaitOptions(1000),
        );

        // The dialog focuses its close button on open, which draws a focus ring only when the click
        // that opened it was not a pointer's (a replayed click in Storybook's own UI). A reader who
        // clicked sees no ring, so the story ends the same either way: with nothing focused.
        const focused = canvasElement.ownerDocument.activeElement;
        if (focused instanceof HTMLElement) {
            focused.blur();
        }
    },
};

/** A file dragged over the window (`#/start-screen/drop-target`). */
export const DropTarget: Story = {
    play: async ({ canvasElement, parameters }) => {
        await heroDrawn(canvasElement);
        const root = canvasElement.querySelector(".ws-land");
        if (root === null) {
            throw new Error("no start screen");
        }
        const real = realInput(parameters);
        if (real) {
            await real.dragFileOver(root);
            await waitFor(
                () => expect(canvasElement.querySelector(".ws-start-drop")).not.toBeNull(),
                storyWaitOptions(1000),
            );
        } else {
            // In Storybook's own UI a page script cannot make a trusted drag, so it is replayed.
            root.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer: new DataTransfer() }));
        }
    },
};

/** Settings > General (`#/settings/general`). */
export const SettingsGeneral: Story = { args: { initialState: { dialog: "settings" } } };

/** Settings > Privacy, usage data off (`#/settings/privacy`). */
export const SettingsPrivacy: Story = { args: { initialState: { dialog: "settings:privacy" } } };

/** Settings > Privacy, usage data on (`#/settings/privacy-on`). */
export const SettingsPrivacyOn: Story = {
    args: { initialState: { dialog: "settings:privacy" } },
    beforeEach: () => {
        answerUsageData("share");
    },
};

/** Settings > Accessibility and input (`#/settings/accessibility`). */
export const SettingsAccessibility: Story = { args: { initialState: { dialog: "settings:accessibility" } } };
