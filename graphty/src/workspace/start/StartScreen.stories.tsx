import type { Meta, StoryObj } from "@storybook/react";

import { answerUsageData, forgetUsageAnswer } from "../privacy/usageData";
import { SINGLE_KEY_SHORTCUTS } from "../settings/preferences";
import { Workspace } from "../Workspace";

/**
 * Clicks the control with this accessible name or text.
 * @param canvasElement - the story's root.
 * @param name - the control's aria-label, or its text.
 */
function click(canvasElement: HTMLElement, name: string): void {
    const root = canvasElement.ownerDocument;
    const control =
        root.querySelector<HTMLElement>(`[aria-label="${name}"]`) ??
        [...root.querySelectorAll<HTMLElement>("button, summary")].find((el) => el.textContent?.trim() === name);
    if (control === undefined || control === null) {
        throw new Error(`no control named "${name}"`);
    }
    control.click();
}

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Start screen",
    component: Workspace,
    parameters: { layout: "fullscreen" },
    // Every story starts from a first launch: the usage data card unanswered, single-key
    // shortcuts on. The answer is the reader's and lives in this browser, so it is reset here.
    beforeEach: () => {
        forgetUsageAnswer();
        localStorage.removeItem(SINGLE_KEY_SHORTCUTS.key);
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** First launch: the usage data card at the foot, unanswered (the mock's `#/start-screen/first-run`). */
export const FirstRun: Story = {};

/** What is collected, open (`#/start-screen/disclosure`). */
export const Disclosure: Story = {
    play: ({ canvasElement }) => {
        click(canvasElement, "What is collected");
    },
};

/** Answered Share usage data: the answer line, and the chip says so (`#/start-screen/answered`). */
export const Answered: Story = {
    play: ({ canvasElement }) => {
        click(canvasElement, "Share usage data");
    },
};

/** Answered No thanks (`#/start-screen/declined`). */
export const Declined: Story = {
    play: ({ canvasElement }) => {
        click(canvasElement, "No thanks");
    },
};

/** A later launch: the card was answered before, so the foot is empty (`#/start-screen/returning`). */
export const Returning: Story = {
    beforeEach: () => {
        answerUsageData("declined");
    },
};

/** A file dragged over the window (`#/start-screen/drop-target`). */
export const DropTarget: Story = {
    play: ({ canvasElement }) => {
        const root = canvasElement.querySelector(".ws-start");
        root?.dispatchEvent(new DragEvent("dragover", { bubbles: true, dataTransfer: new DataTransfer() }));
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
