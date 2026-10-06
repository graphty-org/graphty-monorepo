// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";

import { answerUsageData, forgetUsageAnswer } from "../privacy/usageData";
import { createWorkspaceStore } from "../state/store";
import { Workspace } from "../Workspace";
import { DISCARD_DIALOG, SAVE_AS_DIALOG } from "./actions";
import { clearRecent, rememberRecent } from "./recent";

/**
 * Fixed times, so the list reads the same in every capture: 2026-10-01 and 2026-09-28, 09:30 in
 * the capturing browser's own time zone, which is the zone the list formats in.
 */
const DAY = 24 * 60 * 60 * 1000;
const RECENT_AT = new Date(2026, 9, 1, 9, 30).getTime();

/** Eight nodes on a ring with two chords, laid out on a flat circle, which places them the same way every time. */
const NODES = Array.from({ length: 8 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = [
    ...NODES.map((node, i) => ({ source: node.id, target: NODES[(i + 1) % NODES.length].id })),
    { source: "n0", target: "n4" },
    { source: "n2", target: "n6" },
];

/**
 * Loads the ring into the story's element and waits for a stable frame.
 * @param canvasElement - the story's root.
 */
async function loadRing(canvasElement: HTMLElement): Promise<void> {
    await customElements.whenDefined("graphty-element");
    const element = canvasElement.ownerDocument.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("circular", { options: { scale: 0.2 } });
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.waitForStableFrame();
}

/**
 * A story with the ring open as a project and one of this package's dialogs on top.
 * @param dialog - the dialog.
 * @returns the story.
 */
function dialogStory(dialog: string): Story {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 } });
    return {
        args: { store },
        play: async ({ canvasElement }) => {
            store.set({ dialog: null });
            await loadRing(canvasElement);
            store.set({ dialog });
        },
    };
}

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Project",
    component: Workspace,
    parameters: { layout: "fullscreen" },
    // The usage data card answered, so the start screen's foot is empty; Recent projects emptied
    // before and after, because it lives in this browser and the start screen's stories expect none.
    beforeEach: async () => {
        answerUsageData("declined");
        await clearRecent();
        return async () => {
            forgetUsageAnswer();
            await clearRecent();
        };
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** A returning reader: Recent projects lists two saved projects, newest first (`#/start-screen/returning`). */
export const RecentProjects: Story = {
    beforeEach: async () => {
        await rememberRecent({ id: "karate", name: "Karate club, by faction", nodes: 34, at: RECENT_AT - 3 * DAY });
        await rememberRecent({ id: "les-mis", name: "Les Miserables, my copy", nodes: 77, at: RECENT_AT });
    },
};

/**
 * A remembered file the browser can no longer read: the row says so and offers Locate...
 * (`#/start-screen/recent-missing`). The file is made in the origin private file system and
 * deleted, so its handle no longer reads.
 */
export const RecentMissing: Story = {
    beforeEach: async () => {
        const root = await navigator.storage.getDirectory();
        const handle = await root.getFileHandle("moved.graphty.json", { create: true });
        await root.removeEntry("moved.graphty.json");
        await rememberRecent({ id: "moved", name: "Les Miserables, my copy", nodes: 77, at: RECENT_AT, handle });
    },
    play: async ({ canvasElement }) => {
        const row = await new Promise<HTMLElement>((resolve) => {
            const find = (): void => {
                const found = [...canvasElement.querySelectorAll<HTMLElement>(".ws-recent-open")].find((button) =>
                    button.textContent?.startsWith("Les Miserables, my copy"),
                );
                if (found === undefined) {
                    requestAnimationFrame(find);
                } else {
                    resolve(found);
                }
            };
            find();
        });
        row.click();
        await new Promise<void>((resolve) => {
            const wait = (): void => {
                if (row.textContent?.includes("can no longer be read") === true) {
                    resolve();
                } else {
                    requestAnimationFrame(wait);
                }
            };
            wait();
        });
    },
};

/** Save as..., the name selected (`#/project-menu/save-as`). */
export const SaveAs: Story = dialogStory(SAVE_AS_DIALOG);

/** Close project or opening another over unsaved changes: the question before they are lost. */
export const DiscardChanges: Story = dialogStory(DISCARD_DIALOG);
