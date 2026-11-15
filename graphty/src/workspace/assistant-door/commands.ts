import type { Graphty as GraphtyElement } from "@graphty/graphty-element";

import { defineRegistration } from "../commands/registry";
import type { WorkspaceStore } from "../state/store";
import { readAssistantChoice } from "./provider";

/** The composer's mark, on the region a later field sits in. */
const COMPOSER = "[data-assistant-composer]";

/** Where the Assistant closes to when nothing says where it opened from (a reload). */
const HOME = { page: "panels", place: "graph", focus: null } as const;

/**
 * Whether the element has the assistant experiment on. This folder is the Assistant's door, always
 * loaded; the panel itself is the separate chunk under `../assistant`.
 * @param element - the element, or null before it has come up.
 * @returns true or false as the element reports, or null while there is no element to ask.
 */
export function assistantOn(element: GraphtyElement | null): boolean | null {
    return element === null ? null : element.enabledFeatures.enabled.includes("assistant");
}

/**
 * Closes the Assistant: back to the place or page the reader came from, and focus to where it was,
 * or to the rail button when that control is gone.
 * @param store - the workspace store.
 */
export function closeAssistant(store: WorkspaceStore): void {
    const { assistantFrom } = store.get();
    const { page, place, focus } = assistantFrom ?? HOME;
    store.set({ page, place, assistantFrom: null });
    // After the frame the panel left in, and ahead of the focus guard's own rescue.
    requestAnimationFrame(() => {
        focus?.focus();
        if (focus === null || document.activeElement !== focus) {
            document.querySelector<HTMLElement>("[data-assistant-door]")?.focus();
        }
    });
}

/**
 * Whether the Assistant is the open place.
 * @param store - the workspace store.
 * @returns true when it is.
 */
export function assistantShown(store: WorkspaceStore): boolean {
    const { page, place } = store.get();
    return page === "panels" && place === "assistant";
}

/**
 * Sends the reader to the composer, opening the panel if needed and noting where they came from.
 * @param store - the workspace store.
 */
export function goToComposer(store: WorkspaceStore): void {
    const { page, place, assistantFrom, composerCalls } = store.get();
    const open = assistantShown(store);
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const from = open ? (assistantFrom ?? HOME) : { page, place, focus: null };
    const inPanel = open && active?.closest(".ws-left") !== null && active !== null;
    store.set({
        page: "panels",
        place: "assistant",
        assistantFrom: { ...from, focus: inPanel ? from.focus : active },
        composerCalls: composerCalls + 1,
    });
}

/**
 * The Assistant's commands: Mod+I goes to the composer, and in the composer closes; Shift+Mod+Space
 * presses Talk from anywhere; AI provider...
 */
export const registration = defineRegistration({
    owner: "assistant-door",
    commands: [
        {
            id: "place.assistant",
            label: "Assistant",
            group: "Go to",
            keys: ["Mod+I"],
            shown: ({ element }) => assistantOn(element) === true,
            experiment: true,
            run: ({ workspace }) => {
                if (assistantShown(workspace) && document.activeElement?.closest(COMPOSER)) {
                    closeAssistant(workspace);
                } else {
                    goToComposer(workspace);
                }
            },
        },
        {
            id: "assistant.talk",
            label: "Talk",
            group: "Go to",
            keys: ["Shift+Mod+Space"],
            shown: ({ element }) => assistantOn(element) === true,
            experiment: true,
            run: ({ workspace }) => {
                if (!assistantShown(workspace)) {
                    goToComposer(workspace);
                }
                // With no provider there is no Talk to take the press.
                workspace.set({ assistantTalkPress: readAssistantChoice() !== null });
            },
        },
        {
            id: "settings.assistant",
            label: "AI provider...",
            group: "Settings and help",
            shown: ({ element }) => assistantOn(element) === true,
            experiment: true,
            run: ({ workspace }) => {
                workspace.set({ dialog: "settings:assistant" });
            },
        },
    ],
});

/** Settings' AI provider section, as its section list names it. */
export const AI_PROVIDER_SECTION = { id: "assistant", name: "AI provider" } as const;
