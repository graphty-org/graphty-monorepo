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

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Start screen",
    component: Workspace,
    parameters: { layout: "fullscreen" },
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
        await click(canvasElement, parameters, "What is collected");
    },
};

/** Answered Share usage data: the answer line, and the chip says so (`#/start-screen/answered`). */
export const Answered: Story = {
    play: async ({ canvasElement, parameters }) => {
        await click(canvasElement, parameters, "Share usage data");
    },
};

/** Answered No thanks (`#/start-screen/declined`). */
export const Declined: Story = {
    play: async ({ canvasElement, parameters }) => {
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
    },
};

/** Open network data: the sources on the way, and Open from a link. */
export const NetworkData: Story = {
    beforeEach: () => {
        answerUsageData("declined");
    },
    play: async ({ canvasElement, parameters }) => {
        await click(canvasElement, parameters, "Open network data");
        await waitFor(
            () => expect(canvasElement.ownerDocument.querySelector('[role="dialog"]')).not.toBeNull(),
            storyWaitOptions(1000),
        );
    },
};

/** A file dragged over the window (`#/start-screen/drop-target`). */
export const DropTarget: Story = {
    play: async ({ canvasElement, parameters }) => {
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
