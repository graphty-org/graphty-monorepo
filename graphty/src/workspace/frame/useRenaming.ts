import { useCallback } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";

/**
 * Whether a row's name is being edited in place, kept in the workspace's renameDraft so a reload
 * reopens the field on what the reader typed.
 * @param on - what names the row (`source:<key>`, `chat:<id>`).
 * @param name - the name now, which the field starts on.
 * @returns whether the field is open, and what opens it.
 */
export function useRenaming(on: string, name: string): readonly [boolean, () => void] {
    const { store } = useWorkspace();
    const renaming = useWorkspaceState((state) => state.renameDraft?.on === on);
    const start = useCallback(() => {
        store.set({ renameDraft: { on, text: name } });
    }, [store, on, name]);
    return [renaming, start];
}
