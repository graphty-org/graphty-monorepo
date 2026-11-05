import type { Graphty as GraphtyElement } from "@graphty/graphty-element";

import { defineRegistration } from "../commands/registry";
import type { WorkspaceStore } from "../state/store";

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

/** The Assistant's one command: Mod+I goes to the composer, and in the composer closes. */
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
                const { page, place, assistantFrom, composerCalls } = workspace.get();
                const open = page === "panels" && place === "assistant";
                const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                const inside = (selector: string): boolean => open && (active?.closest(selector) ?? null) !== null;
                if (inside(COMPOSER)) {
                    closeAssistant(workspace);
                    return;
                }
                const from = open ? (assistantFrom ?? HOME) : { page, place, focus: null };
                workspace.set({
                    page: "panels",
                    place: "assistant",
                    assistantFrom: { ...from, focus: inside(".ws-left") ? from.focus : active },
                    composerCalls: composerCalls + 1,
                });
            },
        },
    ],
});
