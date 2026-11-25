/**
 * Which selection editors are mounted now, per store and workspace key, so the open workspace is
 * cleared only on a real close: an editor that unmounts while another under the same key has
 * mounted in its place (a development hot swap remounting it, issue #9982) leaves it open. Kept
 * apart from SelectionEditor.tsx, which a hot swap of that file runs again with a fresh module.
 */

import type { WorkspaceStore } from "../state/store";

const live = new WeakMap<WorkspaceStore, Map<string, number>>();

/**
 * Counts an editor in while it is mounted.
 * @param store - the workspace store.
 * @param owner - the editor's workspace key.
 * @param onClose - runs on a real close, before the store's open workspace is cleared.
 * @returns counts it out: the store's open workspace is cleared a microtask later when it names
 * this key and no editor under the key has mounted by then (StrictMode's rerun or a remount).
 */
export function holdOpenWorkspace(store: WorkspaceStore, owner: string, onClose: () => void): () => void {
    const counts = live.get(store) ?? new Map<string, number>();
    live.set(store, counts);
    counts.set(owner, (counts.get(owner) ?? 0) + 1);
    return () => {
        counts.set(owner, (counts.get(owner) ?? 1) - 1);
        queueMicrotask(() => {
            if ((counts.get(owner) ?? 0) > 0) {
                return;
            }
            onClose();
            if (store.get().selectionWorkspace?.owner === owner) {
                store.set({ selectionWorkspace: null });
            }
        });
    };
}
