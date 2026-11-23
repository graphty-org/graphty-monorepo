import type { GraphSession } from "@graphty/graphty-element/session";

import type { Notice, WorkspaceStore } from "../state/store";

/**
 * Shows a notice with an Undo action that takes back one step, and takes the notice away once that
 * step is no longer the one Undo would take back.
 * @param session - the element's session.
 * @param store - the chrome store, for the notice.
 * @param message - the notice's words.
 * @param isNext - whether the step is still the one the next undo takes back.
 */
export function showUndoNotice(
    session: GraphSession,
    store: WorkspaceStore,
    message: string,
    isNext: () => boolean,
): void {
    const notice: Notice = {
        message,
        action: {
            label: "Undo",
            run: () => {
                if (isNext()) {
                    void session.undo();
                }
            },
        },
    };
    const off = session.on("history:changed", () => {
        if (!isNext()) {
            off();
            store.set((state) => (state.notice === notice ? { notice: null } : {}));
        }
    });
    store.set({ notice });
}
